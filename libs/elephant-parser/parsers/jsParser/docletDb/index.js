var taffydb = require('taffydb'),
    _ = require('lodash'),
    events = require('events'),
    util = require('util'),
    helpers = require('./helpers'),
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

    // clear all the data in taffyDb
    this.clear();

    this.docletsBuffer = helpers.prune(this.docletsBuffer);
    helpers.indexAll(this.docletsBuffer);
    helpers.augment.augmentAll(this.docletsBuffer);
    helpers.borrow.resolveBorrows(this.docletsBuffer);

    this.doclets.insert(this.docletsBuffer);

    doclets.sort('longname, version, since');

    // this.processedDoclets = {
    //     nav: helpers.getMembers(this.doclets),
    //     docletTree: helpers.generateDocletTree(this.doclets),
    // };

    this.processedDoclets = this.doclets().get();

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
}

DocletDb.prototype.getProcessedDoclets = function getProcessedDoclets() {
    return this.processedDoclets;
}