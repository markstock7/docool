var jsParser = {
    Syntax: require('./syntax')
};

const VISITOR_STOP = false;
const VISITOR_CONTINUE = true;

// check whether node1 is before node2
function isBefore(beforeRange, afterRange) {
    return beforeRange[1] <= afterRange[0];
}

function isWithin(innerRange, outerRange) {
    return innerRange[0] >= outerRange[0] && innerRange[1] <= outerRange[1];
}

var acceptsLeadingComments = (function() {
    var accepts = {};

    // these nodes always accept leading comments
    var commentable = [
        jsParser.Syntax.ArrowFunctionExpression,
        jsParser.Syntax.AssignmentExpression,
        jsParser.Syntax.CallExpression,
        jsParser.Syntax.ClassDeclaration,
        jsParser.Syntax.ExportAllDeclaration,
        jsParser.Syntax.ExportDefaultDeclaration,
        jsParser.Syntax.ExportNamedDeclaration,
        jsParser.Syntax.ExportSpecifier,
        jsParser.Syntax.FunctionDeclaration,
        jsParser.Syntax.FunctionExpression,
        jsParser.Syntax.MemberExpression,
        jsParser.Syntax.MethodDefinition,
        jsParser.Syntax.Property,
        jsParser.Syntax.TryStatement,
        jsParser.Syntax.VariableDeclaration,
        jsParser.Syntax.VariableDeclarator,
        jsParser.Syntax.WithStatement
    ];

    for (var i = 0, l = commentable.length; i < l; i++) {
        accepts[commentable[i]] = [];
    }

    return accepts;
})();

function canAcceptComment(node) {
    var canAccept = false;
    var spec = acceptsLeadingComments[node.type];
    if (spec) {
        if (spec.length === 0) {
            // empty array means we don't care about the parent type
            canAccept = true;
        } else if (node.parent) {
            // we can accept the comment if the spec contains the type of the node's parent
            canAccept = spec.indexOf(node.parent.type) !== -1;
        }
    }
    return canAccept;
}

function atomSorter(a, b) {
    var aRange = a.range;
    var bRange = b.range;
    var result = 0;

    // does a end before b starts?
    if (isBefore(aRange, bRange)) {
        result = -1;
    }
    // does a enclose b?
    else if (isWithin(bRange, aRange)) {
        result = -1;
    }
    // does a start before b?
    else if (aRange[0] < bRange[0]) {
        result = -1;
    }
    // are the ranges non-identical? if so, b must be first
    else if (aRange[0] !== bRange[0] || aRange[1] !== bRange[1]) {
        result = 1;
    }

    return result;
}

var CommentAttacher = module.exports = function CommentAttacher(comments, tokens) {
    this._comments = comments || [];
    this._tokens = tokens || [];

    this._tokenIndex = 0;
    this._previousNode = null;
    this._astRoot = null;

    this._resetPendingComments()._resetCandidates();
}

CommentAttacher.prototype.visit = function(node) {
    var isEligible;

    // bail if we're out of comments
    if (!this._nextComment()) {
        return VISITOR_STOP;
    }

    // 如果跟节点不存在，则设置跟节点
    if (!this._astRoot) {
        this._astRoot = node;
    }

    // 设置当前node在token中的位置
    this._advanceTokenIndex(node);

    // move to the next token, and fast-forward past comments that can no longer be attached
    this._fastForwardComments(node);

    // now we can check whether the current node is in the right position to accept the next comment
    isEligible = this._isEligible(node);

    // attach the pending comments, if any
    this._attachPendingComments(node);

    // okay, now that we've done all that bookkeeping, we can check whether the current node accepts
    // leading comments and add it to the candidate list if needed
    if (isEligible && canAcceptComment(node)) {
        // make sure we don't go past the end of the outermost target node
        if (!this._pendingCommentRange) {
            this._pendingCommentRange = node.range.slice(0);
        }
        this._candidates.push(node);

        // we have a candidate node, so pend the current comment
        this._pendingComments.push(this._comments.splice(0, 1)[0]);
    }

    return VISITOR_CONTINUE;
};

CommentAttacher.prototype._resetPendingComments = function() {
    this._pendingComments = [];
    this._pendingCommentRange = null;

    return this;
};

CommentAttacher.prototype._resetCandidates = function() {
    this._candidates = [];

    return this;
};

CommentAttacher.prototype._nextComment = function() {
    return this._comments[0] || null;
};

CommentAttacher.prototype._nextToken = function() {
    return this._tokens[this._tokenIndex] || null;
};

// find the index of the token whose end position is closest to (but not after) the specified
CommentAttacher.prototype._nextIndexBefore = function(tokens, startIndex, position) {
    var token;

    var newIndex = startIndex;

    for (var i = newIndex, l = tokens.length; i < l; i++) {
        token = tokens[i];

        if (token.range[1] > position) {
            break;
        } else {
            newIndex = i;
        }
    }

    return newIndex;
};

CommentAttacher.prototype._advanceTokenIndex = function(node) {
    var position = node.range[0];

    /**
     * 当前token的index
     */
    this._tokenIndex = this._nextIndexBefore(this._tokens, this._tokenIndex, position);

    return this;
};

/**
 * 获取当前node的comments
 */
CommentAttacher.prototype._fastForwardComments = function(node) {
    var position = node.range[0];

    /**
     * 距离当前token最近的comment
     */
    var commentIndex = this._nextIndexBefore(this._comments, 0, position);

    // all comments before the node (except the last one) are pended
    if (commentIndex > 0) {
        this._pendingComments = this._pendingComments.concat(this._comments.splice(0, commentIndex));
    }
};

CommentAttacher.prototype._attachPendingCommentsAsLeading = function(target) {
    target.leadingComments = (target.leadingComments || []).concat(this._pendingComments);
};

CommentAttacher.prototype._attachPendingCommentsAsTrailing = function(target) {
    target.trailingComments = (target.trailingComments || []).concat(this._pendingComments);
};

CommentAttacher.prototype._attachPendingComments = function(currentNode) {
    var target;

    if (!this._pendingComments.length) {
        return this;
    }

    if (this._candidates.length > 0) {
        // if there are one or more candidate nodes, attach the pending comments before the last
        // candidate node
        target = this._candidates[this._candidates.length - 1];
        this._attachPendingCommentsAsLeading(target);
    } else if (!this._previousNode) {
        // if we don't have a previous node, attach pending comments before the AST root; this should
        // mean that we haven't encountered any other nodes yet, or that the source file contains
        // comments but not code
        target = this._astRoot;
        this._attachPendingCommentsAsLeading(target);
    } else {
        // otherwise, the comments must come after the current node (or the last node of the AST, if
        // we've run out of nodes)
        this._attachPendingCommentsAsTrailing(currentNode || this._previousNode);
    }

    // update the previous node
    this._previousNode = currentNode;

    this._resetPendingComments()
        ._resetCandidates();

    return this;
};

CommentAttacher.prototype._isEligible = function(node) {
    var atom;
    var token;

    var isEligible = false;

    var comment = this._nextComment();
    if (comment) {
        atom = [node, comment];
        token = this._nextToken();
        if (token) {
            atom.push(token);
        }

        atom.sort(atomSorter);

        // a candidate node must immediately follow the comment
        // node必须紧跟comment
        if (atom.indexOf(node) === atom.indexOf(comment) + 1) {
            isEligible = true;
        }
    }

    return isEligible;
};

CommentAttacher.prototype.finish = function() {
    var length = this._comments.length;

    // any leftover comments are pended
    if (length) {
        this._pendingComments = this._pendingComments.concat(this._comments.splice(0, length));
    }

    // attach the pending comments, if any
    this._attachPendingComments();
};