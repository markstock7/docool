#!/usr/bin/env babel-node
'use strict';

(function() {
    var path = require('path');
    require = require('requizzle')({
        requirePaths: {
            before: [path.join(__dirname, '..')],
            after: [path.join(__dirname, 'node_modules')]
        },
        infect: true
    })
})();

(function welcome() {
    var logger = require('../docool/logger');

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
        runSequence         = require('run-sequence'),
        through             = require('through2'),
        chalk               = require('chalk'),
        gutil               = require('gulp-util'),
        _                   = require('lodash'),
        gutil               = require('gulp-util'),
        prettyTime          = require('pretty-hrtime'),
        semver              = require('semver'),
        archy               = require('archy'),
        Liftoff             = require('liftoff'),
        tildify             = require('tildify'),
        interpret           = require('interpret'),
        v8flags             = require('v8flags'),
        argv                = require('minimist')(process.argv.slice(2)),
        gulpLoadPlugins     = require('gulp-load-plugins'),
        logger              = require('../docool/logger'),
        Parser              = require('../docool/parser'),
        Server              = require('../docool/server'),
        config              = require('../docool/config'),
        plugins             = gulpLoadPlugins({}),
        cliPackage          = require('../package');
        parser,
        server,
        template,
        cli,
        failed;


    // Set env var for ORIGINAL cwd
    process.env.INIT_CWD = process.cwd();

    cli = new Liftoff({
        name: 'docool',
        processTitle: 'docool',
        moduleName: 'docool',
        configName: 'docool',
        extensions: interpret.jsVariants,
        v8flags: v8flags
    });

    // Exit with 0 or 1
    failed = false;
    process.once('exit', function(code) {
        if (code === 0 && failed) {
            process.exit(1);
        }
    });

    cli.on('require', function(name) {
        gutil.log('Requiring external module', chalk.magenta(name));
    });

    cli.on('requireFail', function(name) {
        gutil.log(chalk.red('Failed to load external module'), chalk.magenta(name));
    });

    cli.on('respawn', function(flags, child) {
        var nodeFlags = chalk.magenta(flags.join(', '));
        var pid = chalk.magenta(child.pid);
        gutil.log('Node flags detected:', nodeFlags);
        gutil.log('Respawned to PID:', pid);
    });

    cli.launch({
        cwd: argv.cwd,
        configPath: argv.gulpfile,
        require: argv.require,
        completion: argv.completion,
    }, handleArguments);


    try {
        template = require(path.resolve(config.get('server:path'), config.get('server:entry')));
    } catch (e) {
        logger.warn('Did not provide template server, using the default template server.')
    }

    parser = new Parser(_.pick(config.get(), [
        'PWD',
        'plugins'
    ]));

    server = new Server(config.get('server'));

    function getFileResouce() {
        var files = [];
        return new Promise(function(resolve, reject) {
            return gulp.src(config.get('gulpSrc'))
                .pipe(through.obj((file, enc, cb) => {
                    files.push({
                        filename: path.basename(file.path),
                        base: file.cwd,
                        path: file.path,
                        relativePath: file.path.substr(file.cwd.length),
                        sourceCode: file.contents ? file.contents.toString() : ''
                    });
                    cb(null);
                }))
                .on('finish', () => {
                    resolve(files)
                })
                .on('error', (error) => {
                    throw error;
                });
        });
    }

    gulp.task('watch', () => {
        if (config.get('hot')) {

            logger.info('Enable hot reload.');

            // Start livereload
            plugins.livereload.listen();

            config.get('gulpSrc').forEach(src => {
                if (!_.startsWith(src, '!')) {
                    gulp.watch(src, ['parse']).on('change', plugins.livereload.changed);
                }
            });
        }
    });

    gulp.task('parse', (done) => {
        getFileResouce()
            .then(parser.parse.bind(parser))
            .then(doclets => {
                template.loadDoclets(doclets);
                done();
            });
    });

    gulp.task('server', done => {
        server.start();
        template.init({
            server: server.getAppInstance()
        });
        done();
    });

    gulp.task('start', function(done) {
        runSequence(
            'parse',
            'server',
            'watch',
            done
        );
    });

    gulp.start('start');
})();
