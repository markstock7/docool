var filter = require('gulp-filter'),
  mapStream = require('map-stream'),
  path = require('path'),
  Promise = require('bluebird'),
  debug = require('debug')('🐘'),
  gulp = require('gulp-help')(require('gulp'), {
    hideEmpty: true,
    hideDepsMessage: true
  }),
  runSequence = require('run-sequence'),
  argv = require('minimist')(process.argv.slice(2)),
  through = require('through2'),
  chalk = require('chalk'),
  gutil = require('gulp-util'),
  _ = require('lodash'),
  Parser = require('./libs/elephant-parser'),
  ElephantServer = require('./libs/elephant-server'),
  config = require('./config'),
  template;

template = require(path.resolve(process.cwd(), config.get('server:path'), config.get('server:entry')));

var elephantParser = new Parser(_.pick(config.get(), [
  '__PROJECT_PATH__',
  'plugins'
]));

var elephantServer = new ElephantServer(config.get('server'));

function getFileResouce() {
  var files = [];
  return new Promise(function(resolve, reject) {
    return gulp.src(config.get('gulpSrc'))
      .pipe(through.obj((file, enc, cb) => {
        files.push({
          filename: path.basename(file.path),
          base: file.cwd,
          path: file.path,
          sourceCode: file.contents.toString()
        });
        cb(null);
      }))
      .on('finish', () => {
        console.log('Total parser files: ', files.length);
        resolve(files)
      })
      .on('error', (error) => {
        throw error
      });
  });
}

gulp.task('elephant:watch', () => {
  gulp.watch(config.get('gulpSrc'), ['elephant:parse']);
});

gulp.task('elephant:parse', (done) => {
  getFileResouce()
    .then(elephantParser.parse.bind(elephantParser))
    .then(doclets => {
      template.loadDoclets(doclets);
      done();
    });
});

gulp.task('elephant:server', done => {
  elephantServer.start();
  template.init({
    server: elephantServer.getAppInstance()
  });
  done();
});

gulp.task('start', function(done) {
  console.log('🐘  starting...');
  runSequence(
    'elephant:parse',
    'elephant:server',
    // 'elephant:watch',
    done
  );
});

gulp.start('start');