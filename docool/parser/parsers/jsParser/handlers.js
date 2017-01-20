var escape = require('escape-string-regexp'),
    jsParser = {
        Doclet: require('./jsDoclet'),
        Syntax: require('./syntax'),
        name: require('./name')
    },
    util = require('util'),
    currentModule = null,
    event = require('../../utils/event');

function CurrentModule(doclet) {
    this.doclet = doclet;
    this.longname = doclet.longname;
    this.originalName = doclet.meta.code.name || '';
}

function setCurrentModule(doclet) {
    if (doclet.kind === 'module') {
        currentModule = new CurrentModule(doclet);
    }
}

exports.attachTo = function(parser) {

    // Handle JSDoc "virtual comments" that include one of the following:
    // + A `@name` tag
    // + Another tag that accepts a name, such as `@function`
    event.on('commentFound', function(e) {
        var comments = e.comment.split(/@also\b/g);
        var newDoclet;

        for (var i = 0, l = comments.length; i < l; i++) {
            newDoclet = createDoclet(comments[i], e);

            // console.log('comment dectloc', newDoclet);

            // we're only interested in virtual comments here
            // virtual comments不和任何代码关联
            if (newDoclet === null || !newDoclet.name) {
                continue;
            }

            // add the default scope/memberof for a module (if we're in a module)
            setModuleScopeMemberOf(newDoclet);
            newDoclet.postProcess();

            // if we _still_ don't have a scope, use the default
            setDefaultScope(newDoclet);

            addDoclet(parser, newDoclet);

            e.doclet = newDoclet;
        }
    });

    // Handle named symbols in the code. May or may not have a comment attached.
    event.on('symbolFound', function(e) {
        var comments = e.comment.split(/@also\b/g);

        for (var i = 0, l = comments.length; i < l; i++) {
            newSymbolDoclet(parser, comments[i], e);
        }
    });

    event.on('fileComplete', function(e) {
        currentModule = null;
    });
};

function createDoclet(comment, e) {
    var doclet = null;
    var err;
    try {
        doclet = new jsParser.Doclet(comment, e);
    } catch (error) {
        err = new Error(util.format('cannot create a doclet for the comment "%s": %s',
            comment.replace(/[\r\n]/g, ''), error.message));
        doclet = new jsParser.Doclet('', e);
    }

    return doclet;
}

function createSymbolDoclet(comment, e) {
    var doclet = createDoclet(comment, e);

    if (doclet.name) {
        // try again, without the comment
        e.comment = '@undocumented';
        doclet = createDoclet(e.comment, e);
    }

    return doclet;
}

function newSymbolDoclet(parser, docletSrc, e) {
    var newDoclet = createSymbolDoclet(docletSrc, e);

    // console.log('________________________________________');
    // console.log('symbolDoclet', JSON.stringify(newDoclet));
    // console.log('symbolDoclet-E', JSON.stringify((e)));
    // console.log('________________________________________');

    // if there's an alias, use that as the symbol name
    if (newDoclet.alias) {
        processAlias(parser, newDoclet, e.astnode);
    }

    // otherwise, get the symbol name from the code
    if (e.code && typeof e.code.name !== 'undefined' && e.code.name !== '') {
        newDoclet.addTag('name', e.code.name);
        if (!newDoclet.memberof) {
            addSymbolMemberof(parser, newDoclet, e.astnode);
        }
        newDoclet.postProcess();
    } else {
        return false;
    }

    // set the scope to global unless any of the following are true:
    // a) the doclet is a memberof something
    // b) the doclet represents a module
    // c) we're in a module that exports only this symbol
    if (!newDoclet.memberof && newDoclet.kind !== 'module' &&
        (!currentModule || currentModule.longname !== newDoclet.name)) {
        newDoclet.scope = jsParser.name.SCOPE.NAMES.GLOBAL;
    }

    // handle cases where the doclet kind is auto-detected from the node type
    if (e.code.kind && newDoclet.kind === 'member') {
        newDoclet.kind = e.code.kind;
    }

    addDoclet(parser, newDoclet);
    e.doclet = newDoclet;

    return true;
}

function addDoclet(parser, newDoclet) {
    var e;
    if (newDoclet) {
        setCurrentModule(newDoclet);
        e = {
            doclet: newDoclet
        };
        event.emit('newDoclet', e);

        if (!e.defaultPrevented && !filterByLongname(e.doclet)) {
            parser.addResult(e.doclet);
        }
    }
}

function addSymbolMemberof(parser, doclet, astNode) {
    var basename;
    var memberof;
    var memberofInfo;
    var moduleOriginalName = '';
    var resolveTargetRegExp;
    var scopePunc;
    var unresolved;

    if (!astNode) {
        return;
    }

    // check to see if the doclet name is an unresolved reference to the module object, or to `this`
    // TODO: handle cases where the module object is shadowed in the current scope
    if (currentModule) {
        moduleOriginalName = '|' + currentModule.originalName;
    }

    resolveTargetRegExp = new RegExp('^((?:module.)?exports|this' + moduleOriginalName + ')(\\.|\\[|$)');
    unresolved = resolveTargetRegExp.exec(doclet.name);

    if (unresolved) {
        memberofInfo = findSymbolMemberof(parser, doclet, astNode, unresolved[1], unresolved[2]);
        memberof = memberofInfo.memberof;
        scopePunc = memberofInfo.scopePunc;

        if (memberof) {
            doclet.name = doclet.name ?
                memberof + scopePunc + doclet.name :
                memberof;
        }
    } else {
        memberofInfo = parser.astnodeToMemberof(astNode);
        basename = memberofInfo.basename;
        memberof = memberofInfo.memberof;
    }

    // if we found a memberof name, apply it to the doclet
    if (memberof) {
        doclet.addTag('memberof', memberof);
        if (basename) {
            doclet.name = (doclet.name || '').replace(new RegExp('^' + escape(basename) + '.'), '');
        }
    } else {
        // otherwise, add the defaults for a module (if we're currently in a module)
        setModuleScopeMemberOf(doclet);
    }
}

function findSymbolMemberof(parser, doclet, astNode, nameStartsWith, trailingPunc) {
    var memberof = '';
    var nameAndPunc;
    var scopePunc = '';

    // handle computed properties like foo['bar']
    if (trailingPunc === '[') {
        // we don't know yet whether the symbol is a static or instance member
        trailingPunc = null;
    }

    nameAndPunc = nameStartsWith + (trailingPunc || '');

    // remove stuff that indicates module membership (but don't touch the name `module.exports`,
    // which identifies the module object itself)
    if (doclet.name !== 'module.exports') {
        doclet.name = doclet.name.replace(nameAndPunc, '');
    }

    // like `bar` in:
    //   exports.bar = 1;
    //   module.exports.bar = 1;
    //   module.exports = MyModuleObject; MyModuleObject.bar = 1;
    if (nameStartsWith !== 'this' && currentModule && doclet.name !== 'module.exports') {
        memberof = currentModule.longname;
        scopePunc = jsParser.name.SCOPE.PUNC.STATIC;
    } else if (doclet.name === 'module.exports' && currentModule) {
        // like: module.exports = 1;
        doclet.addTag('name', currentModule.longname);
        doclet.postProcess();
    } else {
        memberof = parser.resolveThis(astNode);

        // like the following at the top level of a module:
        //   this.foo = 1;
        if (nameStartsWith === 'this' && currentModule && !memberof) {
            memberof = currentModule.longname;
            scopePunc = jsParser.name.SCOPE.PUNC.STATIC;
        } else {
            scopePunc = jsParser.name.SCOPE.PUNC.INSTANCE;
        }
    }

    return {
        memberof: memberof,
        scopePunc: scopePunc
    };
}

function processAlias(parser, doclet, astNode) {
    var memberofName;

    if (doclet.alias === '{@thisClass}') {
        memberofName = parser.resolveThis(astNode);

        // "class" refers to the owner of the prototype, not the prototype itself
        if (/^(.+?)(\.prototype|#)$/.test(memberofName)) {
            memberofName = RegExp.$1;
        }
        doclet.alias = memberofName;
    }

    doclet.addTag('name', doclet.alias);
    doclet.postProcess();
}

function setDefaultScope(doclet) {
    // module doclets don't get a default scope
    if (!doclet.scope && doclet.kind !== 'module') {
        doclet.setScope(jsParser.name.SCOPE.NAMES.GLOBAL);
    }
}

function setModuleScopeMemberOf(doclet) {
    // handle module symbols that are _not_ assigned to module.exports
    if (currentModule && currentModule.longname !== doclet.name) {
        if (!doclet.scope) {
            // is this a method definition? if so, get the scope from the node directly
            if (doclet.meta && doclet.meta.code && doclet.meta.code.node &&
                doclet.meta.code.node.type === jsParser.Syntax.MethodDefinition) {
                if (doclet.meta.code.node.static) {
                    doclet.addTag('static');
                } else {
                    doclet.addTag('instance');
                }
            }
            // otherwise, it must be an inner member
            else {
                doclet.addTag('inner');
            }
        }

        // if the doclet isn't a memberof anything yet, and it's not a global, it must be a memberof
        // the current module
        if (!doclet.memberof && doclet.scope !== jsParser.name.SCOPE.NAMES.GLOBAL) {
            doclet.addTag('memberof', currentModule.longname);
        }
    }
}

function filterByLongname(doclet) {
    // you can't document prototypes
    return /#$/.test(doclet.longname);
}