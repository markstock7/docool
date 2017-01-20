var taffydb = require('taffydb'),
    _ = require('lodash'),
    events = require('events'),
    util = require('util'),
    hasOwnProp = Object.prototype.hasOwnProperty;

var DocletDb = exports.DocletDb = function DocletDb(datas) {
    this.docletsBuffer = [];
    this.doclets = taffydb.taffy();
    this.processedDoclets = null;
};

/**
 * 插入一个新的文档
 */
DocletDb.prototype.insert = function insert(doclets) {
    if (!_.isArray(doclets)) {
        doclets = [doclets];
    }

    this.docletsBuffer = this.docletsBuffer.concat(doclets);
    return this;
};

/**
 * 对文档进行整理
 */
DocletDb.prototype.processDoclets = function processDoclets() {
    var doclets = this.doclets;

    this.clear();

    this.doclets.insert(this.docletsBuffer);

    return this;
};

DocletDb.prototype.isEmpty = function isEmpty() {
    return this.doclets().length > 0;
};

DocletDb.prototype.clear = function clear() {
    this.doclets().remove(true);
    this.processedDoclets = null;
};

DocletDb.prototype.clearBuffer = function clearBuffer() {
    this.docletsBuffer = [];
    this.clear();
    return this;
};

DocletDb.prototype.prune = function prune(doclets) {

};

DocletDb.prototype.getProcessedDoclets = function getProcessedDoclets() {
    return this.processedDoclets;
};