var jsParser = {
        astnode: require('./astnode'),
        Syntax: require('./syntax')
    },
    walkers = {};

function getCurrentScope(scopes) {
    return scopes[scopes.length - 1] || null;
}

function moveComments(source, target) {
    if (source.leadingComments) {
        target.leadingComments = source.leadingComments.slice(0);
        source.leadingComments = [];
    }
}

function leafNode(node, parent, state, cb) {}

walkers[jsParser.Syntax.ArrayExpression] = function(node, parent, state, cb) {
    for (var i = 0, l = node.elements.length; i < l; i++) {
        var e = node.elements[i];
        if (e) {
            cb(e, node, state);
        }
    }
};

walkers[jsParser.Syntax.ArrayPattern] = function(node, parent, state, cb) {
    for (var i = 0, l = node.elements.length; i < l; i++) {
        var e = node.elements[i];
        // must be an identifier or an expression
        if (e && e.type !== jsParser.Syntax.Identifier) {
            cb(e, node, state);
        }
    }
};

walkers[jsParser.Syntax.ArrowFunctionExpression] = function(node, parent, state, cb) {
    var i;
    var l;

    if (node.id) {
        cb(node.id, node, state);
    }

    for (i = 0, l = node.params.length; i < l; i++) {
        cb(node.params[i], node, state);
    }

    cb(node.body, node, state);
};

walkers[jsParser.Syntax.AssignmentExpression] = function(node, parent, state, cb) {
    cb(node.left, node, state);
    cb(node.right, node, state);
};

walkers[jsParser.Syntax.AssignmentPattern] = walkers[jsParser.Syntax.AssignmentExpression];

walkers[jsParser.Syntax.BinaryExpression] = function(node, parent, state, cb) {
    cb(node.left, node, state);
    cb(node.right, node, state);
};

walkers[jsParser.Syntax.BreakStatement] = leafNode;

walkers[jsParser.Syntax.CallExpression] = function(node, parent, state, cb) {
    var i;
    var l;
    cb(node.callee, node, state);
    if (node.arguments) {
        for (i = 0, l = node.arguments.length; i < l; i++) {
            cb(node.arguments[i], node, state);
        }
    }
};

walkers[jsParser.Syntax.CatchClause] = leafNode;

walkers[jsParser.Syntax.ClassDeclaration] = function(node, parent, state, cb) {
    if (node.id) {
        cb(node.id, node, state);
    }

    if (node.superClass) {
        cb(node.superClass, node, state);
    }

    if (node.body) {
        cb(node.body, node, state);
    }
};

walkers[jsParser.Syntax.ClassExpression] = walkers[jsParser.Syntax.ClassDeclaration];

walkers[jsParser.Syntax.ComprehensionBlock] = walkers[jsParser.Syntax.AssignmentExpression];

walkers[jsParser.Syntax.ComprehensionExpression] = function(node, parent, state, cb) {
    cb(node.body, node, state);

    if (node.filter) {
        cb(node.filter, node, state);
    }

    for (var i = 0, l = node.blocks.length; i < l; i++) {
        cb(node.blocks[i], node, state);
    }
};

walkers[jsParser.Syntax.ConditionalExpression] = function(node, parent, state, cb) {
    cb(node.test, node, state);
    cb(node.consequent, node, state);
    cb(node.alternate, node, state);
};

walkers[jsParser.Syntax.ContinueStatement] = leafNode;

walkers[jsParser.Syntax.DebuggerStatement] = leafNode;

walkers[jsParser.Syntax.DoWhileStatement] = function(node, parent, state, cb) {
    cb(node.test, node, state);
    cb(node.body, node, state);
};

walkers[jsParser.Syntax.EmptyStatement] = leafNode;

walkers[jsParser.Syntax.ExperimentalRestProperty] = function(node, parent, state, cb) {
    cb(node.argument, node, state);
};

walkers[jsParser.Syntax.ExperimentalSpreadProperty] = walkers[jsParser.Syntax.ExperimentalRestProperty];

walkers[jsParser.Syntax.ExportAllDeclaration] = function(node, parent, state, cb) {
    if (node.source) {
        cb(node.source, node, state);
    }
};

walkers[jsParser.Syntax.ExportDefaultDeclaration] = function(node, parent, state, cb) {
    // if the declaration target is a class, move leading comments to the declaration target
    if (node.declaration && node.declaration.type === jsParser.Syntax.ClassDeclaration) {
        moveComments(node, node.declaration);
    }

    if (node.declaration) {
        cb(node.declaration, node, state);
    }
};

walkers[jsParser.Syntax.ExportNamedDeclaration] = function(node, parent, state, cb) {
    var i;
    var l;

    if (node.declaration) {
        cb(node.declaration, node, state);
    }

    for (i = 0, l = node.specifiers.length; i < l; i++) {
        cb(node.specifiers[i], node, state);
    }

    if (node.source) {
        cb(node.source, node, state);
    }
};

walkers[jsParser.Syntax.ExportSpecifier] = function(node, parent, state, cb) {
    if (node.exported) {
        cb(node.exported, node, state);
    }

    if (node.local) {
        cb(node.local, node, state);
    }
};

walkers[jsParser.Syntax.ExpressionStatement] = function(node, parent, state, cb) {
    cb(node.expression, node, state);
};

walkers[jsParser.Syntax.ForInStatement] = function(node, parent, state, cb) {
    cb(node.left, node, state);
    cb(node.right, node, state);
    cb(node.body, node, state);
};

walkers[jsParser.Syntax.ForOfStatement] = walkers[jsParser.Syntax.ForInStatement];

walkers[jsParser.Syntax.ForStatement] = function(node, parent, state, cb) {
    if (node.init) {
        cb(node.init, node, state);
    }

    if (node.test) {
        cb(node.test, node, state);
    }

    if (node.update) {
        cb(node.update, node, state);
    }

    cb(node.body, node, state);
};

walkers[jsParser.Syntax.FunctionDeclaration] = walkers[jsParser.Syntax.ArrowFunctionExpression];

walkers[jsParser.Syntax.FunctionExpression] = walkers[jsParser.Syntax.ArrowFunctionExpression];

walkers[jsParser.Syntax.Identifier] = leafNode;

walkers[jsParser.Syntax.IfStatement] = function(node, parent, state, cb) {
    cb(node.test, node, state);
    cb(node.consequent, node, state);
    if (node.alternate) {
        cb(node.alternate, node, state);
    }
};

walkers[jsParser.Syntax.ImportDeclaration] = function(node, parent, state, cb) {
    if (node.specifiers) {
        for (var i = 0, l = node.specifiers.length; i < l; i++) {
            cb(node.specifiers[i], node, state);
        }
    }

    if (node.source) {
        cb(node.source, node, state);
    }
};

walkers[jsParser.Syntax.ImportDefaultSpecifier] = function(node, parent, state, cb) {
    if (node.local) {
        cb(node.local, node, state);
    }
};

walkers[jsParser.Syntax.ImportNamespaceSpecifier] = walkers[jsParser.Syntax.ImportDefaultSpecifier];

walkers[jsParser.Syntax.ImportSpecifier] = walkers[jsParser.Syntax.ExportSpecifier];

walkers[jsParser.Syntax.JSXAttribute] = function(node, parent, state, cb) {
    cb(node.name, node, state);

    if (node.value) {
        cb(node.value, node, state);
    }
};

walkers[jsParser.Syntax.JSXClosingElement] = function(node, parent, state, cb) {
    cb(node.name, node, state);
};

walkers[jsParser.Syntax.JSXElement] = function(node, parent, state, cb) {
    cb(node.openingElement, node, state);

    if (node.closingElement) {
        cb(node.closingElement, node, state);
    }

    for (var i = 0, l = node.children.length; i < l; i++) {
        cb(node.children[i], node, state);
    }
};

walkers[jsParser.Syntax.JSXEmptyExpression] = leafNode;

walkers[jsParser.Syntax.JSXExpressionContainer] = function(node, parent, state, cb) {
    cb(node.expression, node, state);
};

walkers[jsParser.Syntax.JSXIdentifier] = leafNode;

walkers[jsParser.Syntax.JSXMemberExpression] = function(node, parent, state, cb) {
    cb(node.object, node, state);

    cb(node.property, node, state);
};

walkers[jsParser.Syntax.JSXNamespacedName] = function(node, parent, state, cb) {
    cb(node.namespace, node, state);

    cb(node.name, node, state);
};

walkers[jsParser.Syntax.JSXOpeningElement] = function(node, parent, state, cb) {
    cb(node.name, node, state);

    for (var i = 0, l = node.attributes.length; i < l; i++) {
        cb(node.attributes[i], node, state);
    }
};

walkers[jsParser.Syntax.JSXSpreadAttribute] = function(node, parent, state, cb) {
    cb(node.argument, node, state);
};

walkers[jsParser.Syntax.JSXText] = leafNode;

walkers[jsParser.Syntax.LabeledStatement] = function(node, parent, state, cb) {
    cb(node.body, node, state);
};

// TODO: add scope info??
walkers[jsParser.Syntax.LetStatement] = function(node, parent, state, cb) {
    for (var i = 0, l = node.head.length; i < l; i++) {
        var head = node.head[i];
        cb(head.id, node, state);
        if (head.init) {
            cb(head.init, node, state);
        }
    }

    cb(node.body, node, state);
};

walkers[jsParser.Syntax.Literal] = leafNode;

walkers[jsParser.Syntax.LogicalExpression] = walkers[jsParser.Syntax.BinaryExpression];

walkers[jsParser.Syntax.MemberExpression] = function(node, parent, state, cb) {
    cb(node.object, node, state);
    if (node.property) {
        cb(node.property, node, state);
    }
};

walkers[jsParser.Syntax.MetaProperty] = leafNode;

walkers[jsParser.Syntax.MethodDefinition] = function(node, parent, state, cb) {
    if (node.key) {
        cb(node.key, node, state);
    }

    if (node.value) {
        cb(node.value, node, state);
    }
};

walkers[jsParser.Syntax.ModuleDeclaration] = function(node, parent, state, cb) {
    if (node.id) {
        cb(node.id, node, state);
    }

    if (node.source) {
        cb(node.source, node, state);
    }

    if (node.body) {
        cb(node.body, node, state);
    }
};

walkers[jsParser.Syntax.NewExpression] = walkers[jsParser.Syntax.CallExpression];

walkers[jsParser.Syntax.ObjectExpression] = function(node, parent, state, cb) {
    for (var i = 0, l = node.properties.length; i < l; i++) {
        cb(node.properties[i], node, state);
    }
};

walkers[jsParser.Syntax.ObjectPattern] = walkers[jsParser.Syntax.ObjectExpression];

walkers[jsParser.Syntax.BlockStatement] = function(node, parent, state, cb) {
    for (var i = 0, l = node.body.length; i < l; i++) {
        cb(node.body[i], node, state);
    }
};
walkers[jsParser.Syntax.Program] = walkers[jsParser.Syntax.BlockStatement];
walkers[jsParser.Syntax.ClassBody] = walkers[jsParser.Syntax.BlockStatement];

walkers[jsParser.Syntax.Property] = function(node, parent, state, cb) {
    // move leading comments from key to property node
    moveComments(node.key, node);

    cb(node.value, node, state);
};

walkers[jsParser.Syntax.RestElement] = function(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

walkers[jsParser.Syntax.ReturnStatement] = function(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

walkers[jsParser.Syntax.SequenceExpression] = function(node, parent, state, cb) {
    for (var i = 0, l = node.expressions.length; i < l; i++) {
        cb(node.expressions[i], node, state);
    }
};

walkers[jsParser.Syntax.SpreadElement] = function(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

walkers[jsParser.Syntax.Super] = leafNode;

walkers[jsParser.Syntax.SwitchCase] = function(node, parent, state, cb) {
    if (node.test) {
        cb(node.test, node, state);
    }

    for (var i = 0, l = node.consequent.length; i < l; i++) {
        cb(node.consequent[i], node, state);
    }
};

walkers[jsParser.Syntax.SwitchStatement] = function(node, parent, state, cb) {
    cb(node.discriminant, node, state);

    for (var i = 0, l = node.cases.length; i < l; i++) {
        cb(node.cases[i], node, state);
    }
};

walkers[jsParser.Syntax.TaggedTemplateExpression] = function(node, parent, state, cb) {
    if (node.tag) {
        cb(node.tag, node, state);
    }
    if (node.quasi) {
        cb(node.quasi, node, state);
    }
};

walkers[jsParser.Syntax.TemplateElement] = leafNode;

walkers[jsParser.Syntax.TemplateLiteral] = function(node, parent, state, cb) {
    var i;
    var l;

    if (node.quasis && node.quasis.length) {
        for (i = 0, l = node.quasis.length; i < l; i++) {
            cb(node.quasis[i], node, state);
        }
    }

    if (node.expressions && node.expressions.length) {
        for (i = 0, l = node.expressions.length; i < l; i++) {
            cb(node.expressions[i], node, state);
        }
    }
};

walkers[jsParser.Syntax.ThisExpression] = leafNode;

walkers[jsParser.Syntax.ThrowStatement] = function(node, parent, state, cb) {
    cb(node.argument, node, state);
};

walkers[jsParser.Syntax.TryStatement] = function(node, parent, state, cb) {
    var i;
    var l;

    cb(node.block, node, state);

    if (node.handler) {
        cb(node.handler.body, node, state);
    }

    if (node.finalizer) {
        cb(node.finalizer, node, state);
    }
};

walkers[jsParser.Syntax.UnaryExpression] = function(node, parent, state, cb) {
    cb(node.argument, node, state);
};

walkers[jsParser.Syntax.UpdateExpression] = walkers[jsParser.Syntax.UnaryExpression];

walkers[jsParser.Syntax.VariableDeclaration] = function(node, parent, state, cb) {
    // move leading comments to first declarator
    moveComments(node, node.declarations[0]);

    for (var i = 0, l = node.declarations.length; i < l; i++) {
        cb(node.declarations[i], node, state);
    }
};

walkers[jsParser.Syntax.VariableDeclarator] = function(node, parent, state, cb) {
    cb(node.id, node, state);

    if (node.init) {
        cb(node.init, node, state);
    }
};

walkers[jsParser.Syntax.WhileStatement] = walkers[jsParser.Syntax.DoWhileStatement];

walkers[jsParser.Syntax.WithStatement] = function(node, parent, state, cb) {
    cb(node.object, node, state);
    cb(node.body, node, state);
};

walkers[jsParser.Syntax.YieldExpression] = function(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

/**
 * Create a walker that can traverse an AST that is consistent with the Mozilla Parser API.
 */
var Walker = module.exports = function(walkerFuncs) {
    this._walkers = walkerFuncs || walkers;
};

Walker.prototype._recurse = function(file, ast) {
    var self = this;
    var state = {
        file: file,
        nodes: [],
        scopes: []
    };

    function cb(node, parent, cbState) {
        var currentScope;

        var isScope = jsParser.astnode.isScope(node);

        jsParser.astnode.addNodeProperties(node);
        node.parent = parent || null;

        currentScope = getCurrentScope(cbState.scopes);
        if (currentScope !== null) {
            node.enclosingScope = currentScope;
        }

        if (isScope) {
            cbState.scopes.push(node);
        }

        cbState.nodes.push(node);
        self._walkers[node.type](node, parent, cbState, cb);

        if (isScope) {
            cbState.scopes.pop();
        }
    }

    cb(ast, null, state);

    return state;
};

Walker.prototype.recurse = function(ast, visitor, file) {
    var shouldContinue;
    var state = this._recurse(file, ast);
    if (visitor) {
        for (var i = 0, l = state.nodes.length; i < l; i++) {
            shouldContinue = visitor.visit.call(visitor, state.nodes[i], file);
            if (!shouldContinue) {
                break;
            }
        }
    }
    return ast;
};

exports.walkers = walkers;