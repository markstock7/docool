var util = require('util'),
    jsParser = {
        Syntax: require('./Syntax'),
        name: require('./name')
    },

    utils = {
        cast: require('docool/parser/utils/cast'),
    };

// Counter for generating unique node IDs.
var uid = 100000000;

var debugEnabled = true;
/**
 * Check whether an AST node represents a function.
 *
 * @param {(Object|string)} node - The AST node to check, or the `type` property of a node.
 * @return {boolean} Set to `true` if the node is a function or `false` in all other cases.
 */
var isFunction = exports.isFunction = function isFunction(node) {
    var type;

    if (!node) {
        return false;
    }

    type = typeof node === 'string' ? node : node.type;

    return type === jsParser.Syntax.FunctionDeclaration || type === jsParser.Syntax.FunctionExpression ||
        type === jsParser.Syntax.MethodDefinition || type === jsParser.Syntax.ArrowFunctionExpression;
};

/**
 * Check whether an AST node creates a new scope.
 *
 * @param {Object} node - The AST node to check.
 * @return {Boolean} Set to `true` if the node creates a new scope, or `false` in all other cases.
 */
var isScope = exports.isScope = function isScope(node) {
    // TODO: handle blocks with "let" declarations
    return !!node && typeof node === 'object' && (node.type === jsParser.Syntax.CatchClause || isFunction(node));
};

var addNodeProperties = exports.addNodeProperties = function addNodeProperties(node) {
    var newProperties = {};

    if (!node || typeof node !== 'object') {
        return null;
    }

    if (!node.nodeId) {
        newProperties.nodeId = {
            value: 'astnode' + uid++,
            enumerable: debugEnabled
        };
    }

    if (!node.parent && node.parent !== null) {
        newProperties.parent = {
            // `null` means 'no parent', so use `undefined` for now
            value: undefined,
            writable: true
        };
    }

    if (!node.enclosingScope && node.enclosingScope !== null) {
        newProperties.enclosingScope = {
            // `null` means 'no enclosing scope', so use `undefined` for now
            value: undefined,
            writable: true
        };
    }

    if (debugEnabled && typeof node.parentId === 'undefined') {
        newProperties.parentId = {
            enumerable: true,
            get: function() {
                return this.parent ? this.parent.nodeId : null;
            }
        };
    }

    if (debugEnabled && typeof node.enclosingScopeId === 'undefined') {
        newProperties.enclosingScopeId = {
            enumerable: true,
            get: function() {
                return this.enclosingScope ? this.enclosingScope.nodeId : null;
            }
        };
    }

    Object.defineProperties(node, newProperties);

    return node;
};

var nodeToValue = exports.nodeToValue = function nodeToValue(node) {
    var parent,
        str,
        tempObject;

    switch (node.type) {
        case jsParser.Syntax.ArrayExpression:
            tempObject = [];
            node.elements.forEach(function(el, i) {
                // handle sparse arrays. use `null` to represent missing values, consistent with
                // JSON.stringify([,]).
                if (!el) {
                    tempObject[i] = null;
                } else {
                    tempObject[i] = nodeToValue(el);
                }
            });

            str = JSON.stringify(tempObject);
            break;

        case jsParser.Syntax.AssignmentExpression:
        case jsParser.Syntax.AssignmentPattern:
            str = nodeToValue(node.left);
            break;

        case jsParser.Syntax.ClassDeclaration:
            str = nodeToValue(node.id);
            break;

        case jsParser.Syntax.ExportAllDeclaration:
            // falls through

        case jsParser.Syntax.ExportDefaultDeclaration:
            str = 'module.exports';
            break;

        case jsParser.Syntax.ExportNamedDeclaration:
            if (node.declaration) {
                // like `var` in: export var foo = 'bar';
                // we need a single value, so we use the first variable name
                if (node.declaration.declarations) {
                    str = 'exports.' + nodeToValue(node.declaration.declarations[0]);
                } else {
                    str = 'exports.' + nodeToValue(node.declaration);
                }
            }

            // otherwise we'll use the ExportSpecifier nodes
            break;

        case jsParser.Syntax.ExportSpecifier:
            str = 'exports.' + nodeToValue(node.exported);
            break;

        case jsParser.Syntax.ArrowFunctionExpression:
            // falls through

        case jsParser.Syntax.FunctionDeclaration:
            // falls through

        case jsParser.Syntax.FunctionExpression:
            if (node.id && node.id.name) {
                str = node.id.name;
            }
            break;

        case jsParser.Syntax.Identifier:
            str = node.name;
            break;

        case jsParser.Syntax.Literal:
            str = node.value;
            break;

        case jsParser.Syntax.MemberExpression:
            // could be computed (like foo['bar']) or not (like foo.bar)
            str = nodeToValue(node.object);
            if (node.computed) {
                str += util.format('[%s]', node.property.raw);
            } else {
                str += '.' + nodeToValue(node.property);
            }
            break;

        case jsParser.Syntax.MethodDefinition:
            parent = node.parent.parent;
            // for class expressions, we want the name of the variable the class is assigned to
            if (parent.type === jsParser.Syntax.ClassExpression) {
                str = nodeToValue(parent.parent);
            }
            // for the constructor of a module's default export, use a special name
            else if (node.kind === 'constructor' && parent.parent &&
                parent.parent.type === jsParser.Syntax.ExportDefaultDeclaration) {
                str = 'module.exports';
            }
            // if the method is a member of a module's default export, ignore the name, because it's
            // irrelevant
            else if (parent.parent && parent.parent.type === jsParser.Syntax.ExportDefaultDeclaration) {
                str = '';
            }
            // otherwise, use the class's name
            else {
                str = parent.id ? nodeToValue(parent.id) : '';
            }

            if (node.kind !== 'constructor') {
                if (str) {
                    str += node.static ? jsParser.name.SCOPE.PUNC.STATIC : jsParser.name.SCOPE.PUNC.INSTANCE;
                }
                str += nodeToValue(node.key);
            }
            break;

        case jsParser.Syntax.ObjectExpression:
            tempObject = {};
            node.properties.forEach(function(prop) {
                // ExperimentalSpreadProperty have no key
                // like var hello = {...hi};
                if (!prop.key) {
                    return;
                }

                var key = prop.key.name;
                // preserve literal values so that the JSON form shows the correct type
                if (prop.value.type === jsParser.Syntax.Literal) {
                    tempObject[key] = prop.value.value;
                } else {
                    tempObject[key] = nodeToValue(prop);
                }
            });

            str = JSON.stringify(tempObject);
            break;

        case jsParser.Syntax.RestElement:
            str = nodeToValue(node.argument);
            break;

        case jsParser.Syntax.ThisExpression:
            str = 'this';
            break;

        case jsParser.Syntax.UnaryExpression:
            // like -1. in theory, operator can be prefix or postfix. in practice, any value with a
            // valid postfix operator (such as -- or ++) is not a UnaryExpression.
            str = nodeToValue(node.argument);

            if (node.prefix === true) {
            str = utils.cast(node.operator + str);
            } else {
                // this shouldn't happen
                throw new Error(util.format('Found a UnaryExpression with a postfix operator: %j',
                    node));
            }
            break;

        case jsParser.Syntax.VariableDeclarator:
            str = nodeToValue(node.id);
            break;

        case jsParser.Syntax.CallExpression:
            // console.log(JSON.stringify(node));
            str = 'CallExpression';
            break;

        default:
            str = '';
    }

    return str;
};

// backwards compatibility

var getParamNames = exports.getParamNames = function getParamNames(node) {
    var params;

    if (!node || !node.params) {
        return [];
    }

    params = node.params.slice(0);

    return params.map(function(param) {
        return nodeToValue(param);
    });
};

var isAccessor = exports.isAccessor = function isAccessor(node) {
    return !!node && typeof node === 'object' &&
        (node.type === jsParser.Syntax.Property || node.type === jsParser.Syntax.MethodDefinition) &&
        (node.kind === 'get' || node.kind === 'set');
};

var isAssignment = exports.isAssignment = function isAssignment(node) {
    return !!node && typeof node === 'object' && (node.type === jsParser.Syntax.AssignmentExpression ||
        node.type === jsParser.Syntax.VariableDeclarator);
};

/**
 * Retrieve information about the node, including its name and type.
 */
var getInfo = exports.getInfo = function getInfo(node) {
    var info = {};

    switch (node.type) {
        // like the function in: "var foo = () => {}"
        case jsParser.Syntax.ArrowFunctionExpression:
            info.node = node;
            info.name = '';
            info.type = info.node.type;
            info.paramnames = getParamNames(node);
            break;

            // like: "foo = 'bar'" (after declaring foo)
            // like: "MyClass.prototype.myMethod = function() {}" (after declaring MyClass)
        case jsParser.Syntax.AssignmentExpression:
            info.node = node.right;
            info.name = nodeToValue(node.left);
            info.type = info.node.type;
            info.value = nodeToValue(info.node);
            // if the assigned value is a function, we need to capture the parameter names here
            info.paramnames = getParamNames(node.right);
            break;

            // like "bar='baz'" in: function foo(bar='baz') {}
        case jsParser.Syntax.AssignmentPattern:
            info.node = node;
            info.name = nodeToValue(node.left);
            info.type = info.node.type;
            info.value = nodeToValue(info.node);

            break;

            // like:          "class Foo {}"
            // or "class" in: "export default class {}"
        case jsParser.Syntax.ClassDeclaration:
            info.node = node;
            // if this class is the default export, we need to use a special name
            if (node.parent && node.parent.type === jsParser.Syntax.ExportDefaultDeclaration) {
                info.name = 'module.exports';
            } else {
                info.name = node.id ? nodeToValue(node.id) : '';
            }
            info.type = info.node.type;
            info.paramnames = [];

            node.body.body.some(function(definition) {
                if (definition.kind === 'constructor') {
                    info.paramnames = getParamNames(definition.value);
                    return true;
                }
                return false;
            });

            break;

            // like: "export * from 'foo'"
        case jsParser.Syntax.ExportAllDeclaration:
            info.node = node;
            info.name = nodeToValue(info.node);
            info.type = info.node.type;
            break;

            // like: "export default 'foo'"
        case jsParser.Syntax.ExportDefaultDeclaration:
            info.node = node.declaration;
            info.name = nodeToValue(node);
            info.type = info.node.type;

            if (isFunction(info.node)) {
                info.paramnames = getParamNames(info.node);
            }

            break;

            // like: "export var foo;" (has declaration)
            // or:   "export {foo}" (no declaration)
        case jsParser.Syntax.ExportNamedDeclaration:
            info.node = node;
            info.name = nodeToValue(info.node);
            info.type = info.node.declaration ? info.node.declaration.type :
                jsParser.Syntax.ObjectExpression;

            if (info.node.declaration) {
                if (isFunction(info.node.declaration)) {
                    info.paramnames = getParamNames(info.node.declaration);
                }

                // TODO: This duplicates logic for another node type in
                // visitor.makeSymbolFoundEvent(). Is there a way to combine the logic for both
                // node types into a single module?
                if (info.node.declaration.kind === 'const') {
                    info.kind = 'constant';
                }
            }

            break;

            // like "foo as bar" in: "export {foo as bar}"
        case jsParser.Syntax.ExportSpecifier:
            info.node = node;
            info.name = nodeToValue(info.node);
            info.type = info.node.local.type;

            if (isFunction(info.node.local)) {
                info.paramnames = getParamNames(info.node.local);
            }

            break;

            // like: "function foo() {}"
            // or the function in: "export default function() {}"
        case jsParser.Syntax.FunctionDeclaration:
            info.node = node;
            info.name = node.id ? nodeToValue(node.id) : '';
            info.type = info.node.type;
            info.paramnames = getParamNames(node);
            break;

            // like the function in: "var foo = function() {}"
        case jsParser.Syntax.FunctionExpression:
            info.node = node;
            // TODO: should we add a name for, e.g., "var foo = function bar() {}"?
            info.name = '';
            info.type = info.node.type;
            info.paramnames = getParamNames(node);
            break;

            // like the param "bar" in: "function foo(bar) {}"
        case jsParser.Syntax.Identifier:
            info.node = node;
            info.name = nodeToValue(info.node);
            info.type = info.node.type;
            break;

            // like "a.b.c"
        case jsParser.Syntax.MemberExpression:
            info.node = node;
            info.name = nodeToValue(info.node);
            info.type = info.node.type;
            break;

            // like: "foo() {}"
        case jsParser.Syntax.MethodDefinition:
            info.node = node;
            info.name = nodeToValue(info.node);
            info.type = info.node.type;
            info.paramnames = getParamNames(node.value);
            break;

            // like "a: 0" in "var foo = {a: 0}"
        case jsParser.Syntax.Property:
            info.node = node.value;
            info.name = nodeToValue(node.key);
            info.value = nodeToValue(info.node);

            // property names with unsafe characters must be quoted
            if (!/^[$_a-zA-Z0-9]*$/.test(info.name)) {
                info.name = '"' + String(info.name).replace(/"/g, '\\"') + '"';
            }

            if (isAccessor(node)) {
                info.type = nodeToValue(info.node);
                info.paramnames = getParamNames(info.node);
            } else {
                info.type = info.node.type;
            }

            break;

            // like "...bar" in: function foo(...bar) {}
        case jsParser.Syntax.RestElement:
            info.node = node;
            info.name = nodeToValue(info.node.argument);
            info.type = info.node.type;

            break;

            // like: "var i = 0" (has init property)
            // like: "var i" (no init property)
        case jsParser.Syntax.VariableDeclarator:
            info.node = node.init || node.id;
            info.name = node.id.name;

            if (node.init) {
                info.type = info.node.type;
                info.value = nodeToValue(info.node);
            }

            break;

        default:
            info.node = node;
            info.type = info.node.type;
    }

    return info;
};