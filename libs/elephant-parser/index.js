(function() {
    'use strict';

    var path = require('path');
    require = require('requizzle')({
        requirePaths: {
            before: [__dirname],
            after: [path.join(__dirname, 'node_modules')]
        },
        infect: true
    })
})();

(function() {
    var mime = require('mime'),
        util = require('util'),
        events = require('events'),
        path = require('path'),
        Promise = require('bluebird'),
        debug = require('debug')('elephant-parser'),
        _ = require('lodash'),
        fileUtil = require('./utils/file'),
        event = require('./utils/event'),
        jsParser = require('./parsers/jsParser'),
        logger = require('./utils/logger'),
        mdParser = require('./parsers/mdParser');

    function addFileMeta(file) {
        file.ext = mime.extension(mime.lookup(file.path));
        return file;
    }

    function Parser(options) {
        this.options = options;
        this.installPlugins(options.plugins);
    }

    Parser.prototype.processDoclets = function processDoclets(doclets) {
        var docletMap = {};
        doclets.forEach((doclet => {
            var key = (doclet.kind || '') + '|' + (doclet.name || '');
            docletMap[key] = Object.assign(docletMap[key] || {}, doclet);
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
            addFileMeta(file);
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

        if (fileMap.js.length) {
            doclets = doclets.concat(jsParser.parse(fileMap.js));
        }

        if (fileMap.md.length) {
            doclets = doclets.concat(mdParser.parse(fileMap.md));
        }
        doclets = this.processDoclets(doclets);

        return Promise.resolve(doclets);
    };



    Parser.prototype.installPlugins = function installPlugins(plugins) {
        if (_.isArray(plugins)) {
            plugins.forEach(plugin => {
                var pluginPath;
                if (plugin.indexOf('/') > -1) {
                    pluginPath = path.resolve(this.options.__PROJECT_PATH__, plugin);
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
                }
            });
        }
    };

    module.exports = Parser;
})();