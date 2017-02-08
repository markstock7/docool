var _ = require('lodash'),
    cloneDeep = require('lodash').cloneDeep,
    jsParser = {
        Syntax: require('./syntax'),
        AstBuilder: require('./astBuilder'),
        Visitor: require('./visitor'),
        Walker: require('./walker'),
        DocletCache: require('./docletCache'),
        name: require('./name'),
        doclet: require('./jsDoclet'),
        astnode: require('./astnode')
    },
    event = require('../../utils/event'),
    hasOwnProp = Object.prototype.hasOwnProperty;

function pretreat(code) {
    // comment out hashbang at the top of the file, like: #!/usr/bin/env node
    return code
        .replace(/^(\#\![\S \t]+\r?\n)/, '// $1')
        // to support code minifiers that preserve /*! comments, treat /*!* as equivalent to /**
        .replace(/\/\*\!\*/g, '/**')
        // merge adjacent doclets
        .replace(/\*\/\/\*\*+/g, '@also');
}

function definedInScope(doclet, basename) {
    return !!doclet && !!doclet.meta && !!doclet.meta.vars && !!basename &&
        hasOwnProp.call(doclet.meta.vars, basename);
}

function Parser(builderInstance, visitorInstance, walkerInstance) {
    this.reset();

    this.astBuilder = builderInstance || new jsParser.AstBuilder();
    this.visitor = visitorInstance || new jsParser.Visitor();
    this.walker = walkerInstance || new jsParser.Walker();

    this.visitor.setParser(this);

    this._resultBuffer = [];
    // 单个文件的结果缓存
    this._fileResultBuffer = [];

    require('./handlers').attachTo(this);
};

Parser.prototype.reset = function() {

    this._fileResultBuffer = [];

    this._byNodeId = new jsParser.DocletCache();

    this._byLongname = new jsParser.DocletCache();
    this._byLongname.put(jsParser.name.LONGNAMES.GLOBAL, {
        meta: {}
    });
};

Parser.prototype.parse = function(file) {
    this._resultBuffer = [];

    var sourceCode = file.sourceCode;

    event.emit('js::fileParseBegin', {
        file: file
    });

    this.reset();

    if (sourceCode.length) {
        this._parseSourceCode(sourceCode, file);
    }

    event.emit('js::fileParseComplete', {
        doclets: this._fileResultBuffer
    });

    // this._resultBuffer = this._resultBuffer.concat(this._fileResultBuffer);
    // return this._resultBuffer;

    return this._fileResultBuffer;
};

Parser.prototype._parseSourceCode = function(sourceCode, file) {
    var ast;

    sourceCode = pretreat(sourceCode);
    ast = this.astBuilder.build(sourceCode, file);

    if (ast) {
        this._walkAst(ast, this.visitor, file);
    }
};

Parser.prototype._getDocletById = function(id) {
    return this._byNodeId.get(id);
};

Parser.prototype._getDocletByLongname = function(longname) {
    return this._byLongname.get(longname);
};

Parser.prototype._getParentClass = function(node) {
    var doclet,
        nameAtoms,
        scope = node.enclosingScope;

    function isClass(d) {
        return d && d.kind === 'class';
    }

    while (scope) {
        // get the doclet, if any, for the parent scope
        doclet = this._getDocletById(scope.nodeId);

        if (doclet) {
            // is the doclet for a class? if so, we're done
            if (isClass(doclet)) {
                break;
            }

            // is the doclet for an instance member of a class? if so, try to get the doclet for the
            // owning class
            nameAtoms = jsParser.name.shorten(doclet.longname);
            if (nameAtoms.scope === jsParser.name.SCOPE.PUNC.INSTANCE) {
                doclet = this._getDocletByLongname(nameAtoms.memberof);
                if (isClass(doclet)) {
                    break;
                }
            }
        }

        // move up to the next parent scope
        scope = scope.enclosingScope;
    }

    return (isClass(doclet) ? doclet : null);
};

Parser.prototype._walkAst = function(ast, visitor, sourceName) {
    this.walker.recurse(ast, visitor, sourceName);
};

Parser.prototype.getBasename = function(name) {
    if (name !== undefined) {
        return name.replace(/^([$a-z_][$a-z_0-9]*).*?$/i, '$1');
    }
    return undefined;
};

/**
 * Resolve what function a var is limited to.
 */
Parser.prototype.resolveVar = function(node, basename) {
    var doclet,
        result,
        scope = node.enclosingScope;

    // HACK: return an empty string for function declarations so they don't end up in anonymous
    if (node.type === jsParser.Syntax.FunctionDeclaration) {
        result = '';
    } else if (!scope) {
        result = ''; // global
    } else {
        doclet = this._getDocletById(scope.nodeId);
        // 变量是否定义在作用域中
        if (definedInScope(doclet, basename)) {
            result = doclet.longname;
        } else {
            // 查询上一个作用域
            result = this.resolveVar(scope, basename);
        }
    }

    return result;
};

Parser.prototype.resolveThis = function(node) {
    var doclet,
        parentClass,
        result;

    // In general, if there's an enclosing scope, we use the enclosing scope to resolve `this`.
    // For object properties, we use the node's parent (the object) instead.
    if (node.type !== jsParser.Syntax.Property && node.enclosingScope) {
        doclet = this._getDocletById(node.enclosingScope.nodeId);

        if (!doclet) {
            result = jsParser.name.LONGNAMES.ANONYMOUS; // TODO handle global this?
        } else if (doclet.this) {
            result = doclet.this;
        } else if (doclet.kind === 'function' && doclet.memberof) {
            parentClass = this._getParentClass(node)
                // like: function Foo() { this.bar = function(n) { /** blah */ this.name = n; };
                // or:   Foo.prototype.bar = function(n) { /** blah */ this.name = n; };
                // or:   var Foo = exports.Foo = function(n) { /** blah */ this.name = n; };
                // or:   Foo.constructor = function(n) { /** blah */ this.name = n; }
            if (parentClass || /\.constructor$/.test(doclet.longname)) {
                result = doclet.memberof;
            } else {
                // like: function notAClass(n) { /** global this */ this.name = n; }
                result = doclet.longname;
            }
        } else if (doclet.kind === 'member' && jsParser.astnode.isAssignment(node)) {
            // like: var foo = function(n) { /** blah */ this.bar = n; }
            result = doclet.longname;
        } else if (doclet.kind === 'class' || doclet.kind === 'module') {
            // walk up to the closest class we can find
            result = doclet.longname;
        } else if (node.enclosingScope) {
            result = this.resolveThis(node.enclosingScope);
        }
    } else {
        doclet = this._getDocletById(node.parent.nodeId);

        // TODO: is this behavior correct? when do we get here?
        if (!doclet) {
            result = ''; // global?
        } else {
            result = doclet.longname;
        }
    }

    return result;
};

Parser.prototype.resolvePropertyParents = function(node) {
    var currentAncestor = node.parent,
        nextAncestor = currentAncestor.parent,
        doclet,
        doclets = [];

    while (currentAncestor) {
        doclet = this._getDocletById(currentAncestor.nodeId);
        if (doclet) {
            doclets.push(doclet);
        }

        // if the next ancestor is an assignment expression (for example, `exports.FOO` in
        // `var foo = exports.FOO = { x: 1 }`, keep walking upwards
        if (nextAncestor && nextAncestor.type === jsParser.Syntax.AssignmentExpression) {
            nextAncestor = nextAncestor.parent;
            currentAncestor = currentAncestor.parent;
        }
        // otherwise, we're done
        else {
            currentAncestor = null;
        }
    }

    return doclets;
};

Parser.prototype.resolveEnum = function(e) {
    var doclets = this.resolvePropertyParents(e.code.node.parent);

    doclets.forEach(function(doclet) {
        if (doclet && doclet.isEnum) {
            doclet.properties = doclet.properties || [];

            // members of an enum inherit the enum's type
            if (doclet.type && !e.doclet.type) {
                // clone the type to prevent circular refs
                e.doclet.type = cloneDeep(doclet.type);
            }

            delete e.doclet.undocumented;
            e.doclet.defaultvalue = e.doclet.meta.code.value;

            // add the doclet to the parent's properties
            doclet.properties.push(e.doclet);
        }
    });
};

Parser.prototype.addDocletRef = function(e) {
    var fakeDoclet,
        node;

    if (e && e.code && e.code.node) {
        node = e.code.node;
        if (e.doclet) {
            // allow lookup from node ID => doclet
            this._byNodeId.put(node.nodeId, e.doclet);
            this._byLongname.put(e.doclet.longname, e.doclet);
        } else if (
            (node.type === jsParser.Syntax.FunctionDeclaration ||
                node.type === jsParser.Syntax.FunctionExpression ||
                node.type === jsParser.Syntax.ArrowFunctionExpression) && !this._getDocletById(node.nodeId)) {
            // keep references to undocumented anonymous functions, too, as they might have scoped vars
            // 没有doclet的时候新建doclet
            fakeDoclet = {
                longname: jsParser.name.LONGNAMES.ANONYMOUS,
                meta: {
                    code: e.code
                }
            };
            this._byNodeId.put(node.nodeId, fakeDoclet);
            this._byLongname.put(fakeDoclet.longname, fakeDoclet);
        }
    }
};

Parser.prototype.astnodeToMemberof = function(node) {
    var basename,
        doclet,
        scope,
        result = {},
        type = node.type;

    if ((type === jsParser.Syntax.FunctionDeclaration || type === jsParser.Syntax.FunctionExpression ||
            type === jsParser.Syntax.ArrowFunctionExpression || type === jsParser.Syntax.VariableDeclarator) &&
        node.enclosingScope) {
        doclet = this._getDocletById(node.enclosingScope.nodeId);

        if (!doclet) {
            result.memberof = jsParser.name.LONGNAMES.ANONYMOUS + jsParser.name.SCOPE.PUNC.INNER;
        } else {
            result.memberof = doclet.longname + jsParser.name.SCOPE.PUNC.INNER;
        }
    } else {
        // check local references for aliases
        scope = node;
        basename = this.getBasename(jsParser.astnode.nodeToValue(node));

        // walk up the scope chain until we find the scope in which the node is defined
        while (scope.enclosingScope) {
            doclet = this._getDocletById(scope.enclosingScope.nodeId);
            if (doclet && definedInScope(doclet, basename)) {
                result.memberof = doclet.meta.vars[basename];
                result.basename = basename;
                break;
            } else {
                // move up
                scope = scope.enclosingScope;
            }
        }

        // do we know that it's a global?
        doclet = this._getDocletByLongname(jsParser.name.LONGNAMES.GLOBAL);
        if (doclet && definedInScope(doclet, basename)) {
            result.memberof = doclet.meta.vars[basename];
            result.basename = basename;
        } else {
            doclet = this._getDocletById(node.parent.nodeId);

            // set the result if we found a doclet. (if we didn't, the AST node may describe a
            // global symbol.)
            if (doclet) {
                result.memberof = doclet.longname || doclet.name;
            }
        }
    }

    return result;
};

Parser.prototype.addAstNodeVisitor = function(visitor) {
    this.visitor.addAstNodeVisitor(visitor);
};

Parser.prototype.addResult = function(o) {
    this._fileResultBuffer.push(o);
};

Parser.prototype.fireProcessingComplete = function(doclets) {
    event.emit('js::processingComplete', {
        doclets: doclets
    });
};

module.exports = Parser;
