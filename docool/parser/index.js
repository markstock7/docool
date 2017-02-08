/**
 * @module docool/parser
 *
 * @author MarkStock <markstock7@hotmail.com>
 * @license Apache License 2.0
 */
'use strict';

var mime        = require('mime'),
    util        = require('util'),
    path        = require('path'),
    Promise     = require('bluebird'),
    fs          = require('fs-extra-promise'),
    _           = require('lodash'),
    hash        = require('hasha'),
    logger      = require('docool/logger'),
    fileUtil    = require('./utils/file'),
    event       = require('./utils/event'),
    jsParser    = require('./parsers/jsParser'),
    mdParser    = require('./parsers/mdParser');

/**
 * @class
 * @param {Object} options Parser settings
 */
function Parser(options) {
    this.options = options;
    this.installPlugins(options.plugins);
    this._cache = {};
    this._doclets = [];

    event.emit('parserInit');
}

Parser.prototype.processDoclets = function processDoclets(doclets) {
    var docletMap = {};
    doclets.forEach(doclet => {
        if (doclet) {
            var key = (doclet.kind || '') + '|' + (doclet.name || '');
            docletMap[key] = Object.assign(docletMap[key] || {}, doclet);
        }
    });
    doclets = _.values(docletMap);
    return doclets;
};

/**
 * @param  {string[]} files 要解析的文件的路径列表
 * @return {Promise}
 */
Parser.prototype.parseFiles = function parseFiles(files) {
    var doclets;

    if (!_.isArray(files)) files = [files];

    event.emit('filesParseBegin');

    doclets = files.map(this.parseFile.bind(this));

    if (this.options.cache) {
        doclets = _.values(this._cache);
    }

    doclets = _.flatten(doclets);

    event.emit('filesParseComplete');

    logger.info(`Total parse %d files.`, files.length);

    doclets = this.processDoclets(doclets);

    return Promise.resolve(doclets);
};

/**
 * 系统会为每个文件打一个hashId, 当作唯一的标识符
 * @param  {string} file 要解析的文件路径
 * @return {Promise}
 */
Parser.prototype.parseFile = function parseFile(filePath) {
    var file = {
        path: filePath,
        relativePath: filePath.substr(process.cwd().length),
        filename: path.basename(filePath),
        hashId: hash(filePath, { algorithm: 'md5'}),
        ext: mime.extension(mime.lookup(filePath)),
        sourceCode: fs.readFileSync(filePath).toString(),
        cwd: process.cwd()
    }, doclets;

    // 解析单个文件中的doclets
    if (file.ext === 'jsx' || file.ext === 'js') {
        doclets = jsParser.parse(file);
    } else if (file.ext === 'markdown') {
        doclets = mdParser.parse(file);
    }

    if (this.options.cache) {
        this._cache[file.hashId] = doclets;
    }

    return doclets;
};

/**
 * 加载用户自定义的插件
 * @param  {Array} plugins 插件的列表
 */
Parser.prototype.installPlugins = function installPlugins(plugins) {
    var pluginPath;
    if (_.isArray(plugins)) {
        plugins.forEach(plugin => {
            if (plugin.indexOf('/') > -1) {
                pluginPath = path.resolve(this.options.cwd, plugin);
            } else {
                pluginPath = path.resolve(__dirname, './plugins', plugin);
            }
            if (fileUtil.exists(pluginPath)) {
                plugin = require(pluginPath);

                if (plugin.handlers) {
                    Object.keys(plugin.handlers).forEach(eventName => {
                        event.on(eventName, plugin.handlers[eventName]);
                    });
                }
            } else {
                logger.warn(`plugin ${plugin} not exists in path ${pluginPath}`);
            }
        });
    }
};

Parser.prototype.clear = function clear() {
    this._cache = {};
    this._doclets = [];
};

module.exports = Parser;
