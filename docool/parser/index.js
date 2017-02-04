var mime        = require('mime'),
    util        = require('util'),
    path        = require('path'),
    Promise     = require('bluebird'),
    _           = require('lodash'),
    logger      = require('docool/logger'),
    fileUtil    = require('./utils/file'),
    event       = require('./utils/event'),
    jsParser    = require('./parsers/jsParser'),
    mdParser    = require('./parsers/mdParser');

function Parser(options) {
    this.options = options;
    this.installPlugins(options.plugins);
}

Parser.prototype.processDoclets = function processDoclets(doclets) {
    var docletMap = {};
    doclets.forEach((doclet => {
        if (doclet) {
            var key = (doclet.kind || '') + '|' + (doclet.name || '');
            docletMap[key] = Object.assign(docletMap[key] || {}, doclet);
        }
    }));
    doclets = _.values(docletMap);
    return doclets;
};

Parser.prototype.parse = function parse(files) {
    var fileMap = {
            js: [],
            md: []
        },
        doclets = [];

    files.forEach(file => {
        file.ext = mime.extension(mime.lookup(file.path));
        switch (file.ext) {
            case 'jsx':
            case 'js':
                fileMap['js'].push(file);
                break;
            case 'markdown':
                fileMap['md'].push(file);
                break;
        }
    });
    event.emit('filesParseBegin');

    if (fileMap.js.length) {
        doclets = doclets.concat(jsParser.parse(fileMap.js));
    }

    if (fileMap.md.length) {
        doclets = doclets.concat(mdParser.parse(fileMap.md));
    }

    event.emit('filesParseComplete');

    logger.info(`Total parse %d files. \n    - javascript files: %d\n    - markdown files: %d`, files.length, fileMap.js.length, fileMap.md.length);

    doclets = this.processDoclets(doclets);
    return Promise.resolve(doclets);
};



Parser.prototype.installPlugins = function installPlugins(plugins) {
    var pluginPath;
    if (_.isArray(plugins)) {
        plugins.forEach(plugin => {
            if (plugin.indexOf('/') > -1) {
                pluginPath = path.resolve(this.options.PWD, plugin);
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

module.exports = Parser;
