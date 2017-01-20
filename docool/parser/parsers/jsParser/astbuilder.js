var espree = require('espree'),
    jsParser = {
        Walker: require('./walker'),
        CommentAttacher: require('./CommentAttacher')
    },
    utils = {
        logger: require('docool/logger')
    };

const VISITOR_CONTINUE = true;
const VISITOR_STOP = false;
const parserOptions = {
    comment: true,
    ecmaFeatures: {
        experimentalObjectRestSpread: true,
        globalReturn: true,
        impliedStrict: true,
        jsx: true
    },
    ecmaVersion: 7,
    loc: true,
    range: true,
    sourceType: 'module',
    tokens: true
};

function isComment(comment) {
    return comment && (comment.type === 'Block') && (comment.value[0] === '*');
}

/**
 * Add the raw comment string to a block comment node.
 *
 * @private
 * @param {!Object} comment - A comment node with `type` and `value` properties.
 */
function addRawComment(comment) {
    comment.raw = comment.raw || ('/*' + comment.value + '*/');
    return comment;
}

function scrubComments(comments) {
    var comment;
    var scrubbed = [];

    for (var i = 0, l = comments.length; i < l; i++) {
        comment = comments[i];
        if (comment.type === 'Block') {
            scrubbed.push(addRawComment(comment));
        }
    }

    return scrubbed;
}

function parse(source, file) {
    var ast;

    try {
        ast = espree.parse(source, parserOptions);
    } catch (e) {
        utils.logger.error('Unable to parse %s: %s', file.relativePath, e.message);
    }

    return ast;
}

var AstBuilder  = function AstBuilder() {};

AstBuilder.prototype.build = function(source, file) {
    var ast = parse(source, file);

    if (ast) {
        this._postProcess(file, ast);
    }

    return ast;
};

/**
 * @private
 * @param {string} filename - The full path to the source file.
 * @param {Object} ast - An abstract syntax tree that conforms to the Mozilla Parser API.
 */
AstBuilder.prototype._postProcess = function(file, ast) {
    var attachComments = !!ast.comments && !!ast.comments.length,
        commentAttacher,
        scrubbed,
        visitor,
        walker;

    if (!attachComments) return;

    scrubbed = scrubComments(ast.comments.slice(0));
    commentAttacher = new jsParser.CommentAttacher(scrubbed.slice(0), ast.tokens);

    visitor = {
        visit: function(node) {
            return commentAttacher.visit(node);
        }
    };

    walker = new jsParser.Walker();

    walker.recurse(ast, visitor, file);

    commentAttacher.finish();

    // replace the comments with the filtered comments
    ast.comments = scrubbed;

    // we no longer need the tokens
    ast.tokens = [];
};

module.exports = AstBuilder;