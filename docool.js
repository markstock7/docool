#!/usr/bin/env babel-node
'use strict';

(function() {
    var path = require('path');
    require = require('requizzle')({
        requirePaths: {
            before: [__dirname],
            after: [path.join(__dirname, 'node_modules')]
        },
        infect: true
    })
})();

(function welcome() {
    var logger = require('./docool/logger');

    logger.verbose('Welcome to use docool.');
    logger.verbose('Your can check it out in https://github.com/markstock7/docool.');
    logger.verbose(`
          .___                         .__
        __| _/____   ____  ____   ____ |  |
       / __ |/  _ \\_/ ___\\/  _ \\ /  _ \\|  |
      / /_/ (  <_> )  \\__(  <_> |  <_> )  |__
      \\____ |\\____/ \\___  >____/ \\____/|____/
             \\/           \\/
    `);
    logger.verbose('OK. Now let\'s start our adventure.');
    console.log('\n');
})();

(function() {
    var path                = require('path'),
        Promise             = require('bluebird'),
        gulp                = require('gulp'),
        watch               = require('gulp-watch'),
        runSequence         = require('run-sequence'),
        through             = require('through2'),
        chalk               = require('chalk'),
        gutil               = require('gulp-util'),
        _                   = require('lodash'),
        globby              = require('globby'),
        gulpLoadPlugins     = require('gulp-load-plugins'),
        logger              = require('./docool/logger'),
        Parser              = require('./docool/parser'),
        Server              = require('./docool/server'),
        config              = require('./docool/config'),
        plugins             = gulpLoadPlugins({}),
        parser,
        server,
        template;

    try {
        template = require(path.resolve(config.get('server:path'), config.get('server:entry')));
    } catch (e) {
        logger.warn('Did not provide template server, using the default template server.')
    }

    parser = new Parser({
        plugins: config.get('plugins') || [],
        cwd: config.get('PWD'),
        // 启用parser自带的cache模式
        cache: true
    });

    server = new Server(config.get('server'));

    function getFileResouce() {
        return globby(config.get('globs'), {
            absolute: true
        });
    }

    function enableWatch() {
        if (config.get('hot')) {
            plugins.livereload.listen();
            config.get('globs').forEach(glob => {
                if (!_.startsWith(glob, '!')) {
                    watch(glob).on('change', function(changedFile) {
                        parseFiles(changedFile);
                        plugins.livereload.changed.apply(null, arguments);
                    });
                }
            });
        }
    }

    function parseFiles(files) {
        return parser.parseFiles(files)
            .then(doclets => {
                template.loadDoclets(doclets);
            });
    }

    function initServer() {
        return new Promise((resolve, reject) => {
            server.start();
            template.init({
                server: server.getAppInstance()
            });
            resolve();
        });
    }

    function boot() {
        return getFileResouce()
            .then(parseFiles)
            .then(initServer)
            .then(enableWatch)
            .catch(e => {
                console.log(e);
            });
    }

    boot();
})();
