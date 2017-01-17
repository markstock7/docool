var Nconf = require('nconf'),
  nconf = new Nconf.Provider(),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  stripJsonComments = require('strip-json-comments'),
  defaultConfig,
  customConfig = {};

defaultConfig = JSON.parse(stripJsonComments(fs.readFileSync(path.resolve(__dirname, './default.json'), 'utf8')));

try {
  customConfig = stripJsonComments(fs.readFileSync(process.cwd() + '/elephant.json', 'utf8'));
  if (customConfig) {
    customConfig = JSON.parse(customConfig);

    customConfig.plugins = _.concat(defaultConfig.plugins, customConfig.plugins || []);
    customConfig.gulpSrc = _.concat(defaultConfig.gulpSrc, customConfig.gulpSrc || []);
  }
  nconf.overrides(customConfig);
} catch (e) {
  throw e;
}

nconf.defaults(defaultConfig);

nconf.argv();

nconf.env({
  separator: ':'
});

/**
 * 当前项目所在的目录
 */
nconf.set('__PROJECT_PATH__', process.cwd());

if (!nconf.get('gulpSrc')) {
  console.error('Can not find gulp-src in elephant.json');
  process.exit(-1);
}

module.exports = nconf;