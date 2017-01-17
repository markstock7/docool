var util = require('util'),
    _ = require('lodash'),
    jsParser = {
        astnode: require('./astnode'),
        Syntax: require('./Syntax'),
        name: require('./name')
    },
    event = require('../../utils/event');

var Visitor = module.exports = function Visitor() {
    this._parser = null;

    // Mozilla Parser API node visitors added by plugins
    this._nodeVisitors = [];

    // built-in visitors
    this._visitors = [this.visitNodeComments, this.visitNode];
};

Visitor.prototype.setParser = function(parser) {
    this._parser = parser;
};

Visitor.prototype.visit = function(node, filename) {
    var i;
    var l;

    for (i = 0, l = this._visitors.length; i < l; i++) {
        this._visitors[i].call(this, node, this._parser, filename);
    }

    return true;
};

Visitor.prototype.visitNodeComments = function(node, parser, filename) {

    var commentNodes;
    var commentNode;
    var e;

    var BLOCK_COMMENT = 'Block';

    /**
     * 没有注释的节点直接忽视
     */
    if (!hasJsdocComments(node) && (!node.type || node.type !== BLOCK_COMMENT)) {
        return true;
    }

    // 当前节点为comment节点
    commentNodes = (node.type === BLOCK_COMMENT) ? [node] : [];

    if (node.leadingComments && node.leadingComments.length) {
        commentNodes = commentNodes.concat(node.leadingComments.slice(0));
    }

    if (node.trailingComments && node.trailingComments.length) {
        commentNodes = commentNodes.concat(node.trailingComments.slice(0));
    }

    for (var i = 0, l = commentNodes.length; i < l; i++) {
        commentNode = commentNodes[i];
        if (isValidJsdoc(commentNode.raw)) {
            e = new CommentFound(commentNode, filename);

            // commentFound
            event.emit(e.event, e, parser);

            /**
             * 去除comment的 \/* ... *\/
             */
            if (e.comment !== commentNode.raw) {
                updateCommentNode(commentNode, e.comment);
            }
        }
    }

    return true;
};

Visitor.prototype.visitNode = function(node, parser, filename) {
    var i;
    var l;

    var e = this.makeSymbolFoundEvent(node, parser, filename);

    // console.log('_______________________________________');
    // console.log('.AssignmentExpression', JSON.stringify(e));
    // console.log('_______________________________________');

    // if (this._nodeVisitors && this._nodeVisitors.length) {
    //     for (i = 0, l = this._nodeVisitors.length; i < l; i++) {
    //         this._nodeVisitors[i].visitNode(node, e, parser, filename);
    //         if (e.stopPropagation) {
    //             break;
    //         }
    //     }
    // }

    if (!e.preventDefault && e.comment && isValidJsdoc(e.comment)) {
        event.emit(e.event, e, parser);
    }

    // add the node to the parser's lookup table
    parser.addDocletRef(e);

    for (i = 0, l = e.finishers.length; i < l; i++) {
        e.finishers[i].call(parser, e);
    }

    return true;
};

Visitor.prototype.makeSymbolFoundEvent = function(node, parser, filename) {
    var e;
    var basename;
    var parent;

    var extras = {
        code: jsParser.astnode.getInfo(node)
    };

    switch (node.type) {
        // like: i = 0;
        case jsParser.Syntax.AssignmentExpression:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);
            if (basename !== 'this') {
                e.code.funcscope = parser.resolveVar(node, basename);
            }

            break;

            // like `bar='baz'` in: function foo(bar='baz') {}
        case jsParser.Syntax.AssignmentPattern:
            parent = node.parent;

            if (node.leadingComments && parent && jsParser.astnode.isFunction(parent)) {
                extras.finishers = [makeInlineParamsFinisher(parser)];
                e = new SymbolFound(node, filename, extras);

                trackVars(parser, node, e);
            }

            break;

            // like: class foo {}
        case jsParser.Syntax.ClassDeclaration:
            // like: let MyClass = class {}
        case jsParser.Syntax.ClassExpression:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);

            break;

            // like: export * from 'foo'
        case jsParser.Syntax.ExportAllDeclaration:
            e = new SymbolFound(node, filename, extras);

            break;

            // like: export default 'foo'
        case jsParser.Syntax.ExportDefaultDeclaration:
            // like: export var foo;
            // or:   export {foo}
        case jsParser.Syntax.ExportNamedDeclaration:
            // like `foo as bar` in: export {foo as bar}
        case jsParser.Syntax.ExportSpecifier:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            break;

            // like: export * from 'foo'
        case jsParser.Syntax.ExportAllDeclaration:
            e = new SymbolFound(node, filename, extras);

            break;

            // like: var foo = () => {};
        case jsParser.Syntax.ArrowFunctionExpression:
            // like: function foo() {}
        case jsParser.Syntax.FunctionDeclaration:
            // like: var foo = function() {};
        case jsParser.Syntax.FunctionExpression:
            extras.finishers = [
                // handle cases where at least one parameter has a default value
                makeDefaultParamFinisher(parser),
                // handle rest parameters
                makeRestParamFinisher(parser)
            ];

            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);
            e.code.funcscope = parser.resolveVar(node, basename);

            break;

            // like `bar` in: function foo(/** @type {string} */ bar) {}
            // or `module` in: define("MyModule", function(/** @exports MyModule */ module) {}
            // This is an extremely common type of node; we only care about function parameters with
            // inline comments. No need to fire an event in other cases.
        case jsParser.Syntax.Identifier:
            parent = node.parent;

            // function parameters with inline comments
            if (node.leadingComments && parent && jsParser.astnode.isFunction(parent)) {
                extras.finishers = [makeInlineParamsFinisher(parser)];
                e = new SymbolFound(node, filename, extras);

                trackVars(parser, node, e);
            }

            break;

            // like: foo() {}
            // or:   constructor() {}
        case jsParser.Syntax.MethodDefinition:
            extras.finishers = [
                // handle cases where at least one parameter has a default value
                makeDefaultParamFinisher(parser),
                // handle rest parameters
                makeRestParamFinisher(parser)
            ];
            // for constructors, we attempt to merge the constructor's docs into the class's docs
            if (node.kind === 'constructor') {
                extras.finishers.push(makeConstructorFinisher(parser));
            }

            e = new SymbolFound(node, filename, extras);

            break;

            // like `{}` in: function Foo = Class.create(/** @lends Foo */ {});
        case jsParser.Syntax.ObjectExpression:
            e = new SymbolFound(node, filename, extras);

            break;

            // like `bar: true` in: var foo = { bar: true };
            // like `get bar() {}` in: var foo = { get bar() {} };
        case jsParser.Syntax.Property:
            if (node.kind !== 'get' && node.kind !== 'set') {
                extras.finishers = [parser.resolveEnum];
            }

            e = new SymbolFound(node, filename, extras);

            break;

            // like `...bar` in: function foo(...bar) {}
        case jsParser.Syntax.RestElement:
            parent = node.parent;

            if (node.leadingComments && parent && jsParser.astnode.isFunction(parent)) {
                extras.finishers = [makeInlineParamsFinisher(parser)];
                e = new SymbolFound(node, filename, extras);

                trackVars(parser, node, e);
            }

            break;

            // like: var i = 0;
        case jsParser.Syntax.VariableDeclarator:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);
            // auto-detect constants
            if (node.parent.kind === 'const') {
                e.code.kind = 'constant';
            }

            break;

        default:
            // ignore
    }

    if (!e) {
        e = {
            finishers: []
        };
    }

    return e;
};

function getLeadingComment(node) {
    var comment = null;
    var leadingComments = node.leadingComments;

    if (Array.isArray(leadingComments) && leadingComments.length && leadingComments[0].raw) {
        comment = leadingComments[0].raw;
    }

    return comment;
}

function isValidJsdoc(commentSrc) {
    return commentSrc && commentSrc.indexOf('/***') !== 0;
}

function hasJsdocComments(node) {
    return (node && node.leadingComments && node.leadingComments.length) ||
        (node && node.trailingComments && node.trailingComments.length);
}

function removeCommentDelimiters(comment) {
    return comment.substring(2, comment.length - 2);
}

function updateCommentNode(commentNode, comment) {
    commentNode.raw = comment;
    commentNode.value = removeCommentDelimiters(comment);
}

function CommentFound(commentNode, filename) {
    this.comment = commentNode.raw;
    this.lineno = commentNode.loc.start.line;
    this.filename = filename;
    this.range = commentNode.range;

    Object.defineProperty(this, 'event', {
        value: 'commentFound'
    });
}

function SymbolFound(node, filename, extras) {
    extras = extras || {};
    _.defaults(this, {
        id: extras.id || node.nodeId,
        comment: extras.comment || getLeadingComment(node) || '@undocumented',
        lineno: extras.lineno || node.loc.start.line,
        range: extras.range || node.range,
        filename: extras.filename || filename,
        astnode: extras.astnode || node,
        code: extras.code,
        event: extras.event || 'symbolFound',
        finishers: extras.finishers || []
    }, extras);
}

function trackVars(parser, node, e) {
    var doclet;
    var enclosingScopeId = node.enclosingScope ? node.enclosingScope.nodeId : null;

    if (enclosingScopeId) {
        doclet = parser._getDocletById(enclosingScopeId);
    } else {
        // 没有作用域，则使用全局作用域
        doclet = parser._getDocletByLongname(jsParser.name.LONGNAMES.GLOBAL);
    }

    if (doclet) {
        doclet.meta.vars = doclet.meta.vars || {};
        doclet.meta.vars[e.code.name] = null;
        e.finishers.push(makeVarsFinisher(doclet));
    }
}

function makeVarsFinisher(scopeDoclet) {
    return function(e) {
        // no need to evaluate all things related to scopeDoclet again, just use it
        if (scopeDoclet && e.doclet && (e.doclet.alias || e.doclet.memberof)) {
            scopeDoclet.meta.vars[e.code.name] = e.doclet.longname;
        }
    };
}

/**
 * For function parameters that have inline documentation, create a function that will merge the
 * inline documentation into the function's doclet. If the parameter is already documented in the
 * function's doclet, the inline documentation will be ignored.
 */
function makeInlineParamsFinisher(parser) {
    return function(e) {
        var documentedParams;
        var knownParams;
        var param;
        var parentDoclet;

        var i = 0;

        parentDoclet = getParentDocletFromEvent(parser, e);
        if (!parentDoclet) {
            return;
        }

        // we only want to use the doclet if it's param-specific (but not, for example, if it's
        // a param tagged with `@exports` in an AMD module)
        if (e.doclet.kind !== 'param') {
            return;
        }

        parentDoclet.params = parentDoclet.params || [];
        documentedParams = parentDoclet.params;
        knownParams = parentDoclet.meta.code.paramnames || [];

        while (true) {
            param = documentedParams[i];

            // is the param already documented? if so, we don't need to use the doclet
            if (param && param.name === e.doclet.name) {
                e.doclet.undocumented = true;
                break;
            }

            // if we ran out of documented params, or we're at the parameter's actual position,
            // splice in the param at the current index
            if (!param || i === knownParams.indexOf(e.doclet.name)) {
                documentedParams.splice(i, 0, {
                    type: e.doclet.type || {},
                    description: '',
                    name: e.doclet.name
                });

                // the doclet is no longer needed
                e.doclet.undocumented = true;

                break;
            }

            i++;
        }
    };
}

/**
 * For functions that may include a rest parameter, create a function that will automatically update
 * the rest parameter's documentation to indicate that the parameter is repeatable. If the parameter
 * is not documented, the function's doclet will remain unchanged.
 */
function makeRestParamFinisher(parser) {
    return function(e) {
        var doclet = e.doclet;
        var documentedParams;
        var restNode;

        if (!doclet) {
            return;
        }

        documentedParams = doclet.params = doclet.params || [];
        restNode = findRestParam(e.code.node.params || e.code.node.value.params);

        if (restNode) {
            for (var i = documentedParams.length - 1; i >= 0; i--) {
                if (documentedParams[i].name === restNode.argument.name) {
                    documentedParams[i].variable = true;
                    break;
                }
            }
        }
    };
}

/**
 * For functions that may have at least one parameter with default values, create a function that
 * will automatically add the parameters' default values to the function's documentation. If any
 * default value is already documented, the function's doclet will remain unchanged.
 *
 * This function is only intended to handle default parameters whose node type is `jsParser.Syntax.Literal`
 * (string, numeric, and boolean literals). This is because more complex default values may include,
 * for example, references to internal variables, which it may not make sense to include in
 * documentation.
 */
function makeDefaultParamFinisher(parser) {
    return function(e) {
        var defaultValues;
        var doclet = e.doclet;
        var documentedParams;
        var paramName;
        var params;

        if (!doclet) {
            return;
        }

        documentedParams = doclet.params = doclet.params || [];
        params = e.code.node.params || e.code.node.value.params;
        defaultValues = findDefaultParams(params);

        for (var i = 0, j = 0, l = params.length; i < l; i++) {
            // bail out if we ran out of documented params
            if (!documentedParams[j]) {
                break;
            }

            // if the current parameter doesn't appear to be documented, move to the next one
            paramName = params[i].type === jsParser.Syntax.AssignmentPattern ?
                params[i].left.name :
                params[i].name;
            if (paramName !== documentedParams[j].name) {
                continue;
            }

            // add the default value iff a) a literal default value is defined in the code,
            // b) no default value is documented, and c) the default value is not an empty string
            if (defaultValues[i] &&
                defaultValues[i].right &&
                defaultValues[i].right.type === jsParser.Syntax.Literal &&
                typeof documentedParams[j].defaultvalue === 'undefined' &&
                defaultValues[i].right.value !== '') {
                documentedParams[j].defaultvalue =
                    jsParser.astnode.nodeToValue(defaultValues[i].right);
            }

            // move to the next documented param
            j++;
        }
    };
}

/**
 * For method definitions that are constructors, create a function that will merge portions of the
 * constructor's doclet into the class's doclet, provided that a doclet exists for the class.
 * Merging the constructor's documentation allows ES 2015 classes to be documented in a natural way,
 * with separate JSDoc comments for the class and its constructor.
 */
function makeConstructorFinisher(parser) {
    return function(e) {
        var doclet = e.doclet;
        var parentDoclet = parser._getDocletById(e.code.node.parent.parent.nodeId);

        if (!doclet || !parentDoclet || parentDoclet.undocumented) {
            return;
        }

        if (!parentDoclet.description && doclet.description) {
            parentDoclet.description = doclet.description;
        }
        if (!parentDoclet.params && doclet.params) {
            parentDoclet.params = doclet.params.slice(0);
        }

        doclet.undocumented = true;
    };
}

/**
 * Given an array of nodes that represent function parameters, find the node for the rest parameter,
 * if any.
 */
function findRestParam(params) {
    var restParam = null;

    params.some(function(param) {
        if (param.type === jsParser.Syntax.RestElement) {
            restParam = param;
            return true;
        }
        return false;
    });

    return restParam;
}

function getParentDocletFromEvent(parser, e) {
    if (e.doclet && e.doclet.meta && e.doclet.meta.code && e.doclet.meta.code.node &&
        e.doclet.meta.code.node.parent) {
        return parser._getDocletById(e.doclet.meta.code.node.parent.nodeId);
    }

    return null;
}

/**
 * Given an array of nodes that represent function parameters, find the nodes for the default
 * parameters, if any.
 */
function findDefaultParams(params) {
    var defaultParams = [];

    params.forEach(function(param) {
        if (param.type === jsParser.Syntax.AssignmentPattern) {
            defaultParams.push(param);
        } else {
            defaultParams.push(null);
        }
    });

    return defaultParams;
}