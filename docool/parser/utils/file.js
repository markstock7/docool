var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var rimraf = require('rimraf');
var log = require('log');

var file = module.exports = {};
file.glob = require('glob');

file.isroot = function(str) {
    if (process.platform === 'win32') {
        return path.normalize(str).slice(1, 3) === ':\\';
    } else {
        return str.charAt(0) === '/';
    }
};

file.abspath = function(str) {
    if (!file.isroot(str)) {
        return path.normalize(path.join(process.cwd(), path.normalize(str)));
    }
    return str;
};

file.exists = function(filepath) {
    return fs.existsSync(filepath);
};

file.cleanpath = function(filepath) {
    var fpath = path.relative(process.cwd(), filepath);
    return unixifyPath(fpath);
};

file.contain = function(base, filepath) {
    return path.resolve(base).indexOf(path.resolve(filepath)) === 0;
};

file.mkdir = function(dirpath, mode) {
    // get from grunt.file
    if (fs.existsSync(dirpath)) return;

    if (!mode) {
        mode = parseInt('0777', 8) & (~process.umask());
    }
    dirpath.split(path.sep).reduce(function(parts, part) {
        parts += part + '/';
        var subpath = path.resolve(parts);
        if (!fs.existsSync(subpath)) {
            fs.mkdirSync(subpath, mode);
        }
        return parts;
    }, '');
};

/**
 * 递归遍历目录
 *
 * @param rootdir {String}
 * @param callback {Function}
 * @param filter {Function} 过滤函数
 */
file.recurse = function recurse(rootdir, callback, subdir, filter) {
    if (_.isFunction(subdir)) {
        filter = subdir;
        subdir = null;
    }
    var abspath = subdir ? path.join(rootdir, subdir) : rootdir;
    fs.readdirSync(abspath).forEach(function(filename) {
        var filepath = path.join(abspath, filename);
        if (!fs.existsSync(filepath)) {
            return;
        }
        if (fs.statSync(filepath).isDirectory()) {
            if (filter && !filter(filepath)) return;
            file.recurse(filepath, callback, filter);
        } else {
            if (filter && !filter(filepath, filename)) return;
            callback(unixifyPath(filepath), filename);
        }
    })
}

file.list = function(src, filter) {
    var files = [];
    file.recurse(src, function(filepath) {
        files.push(filepath);
    }, filter);
    return files;
};

file.read = function(filepath) {
    var content = fs.readFileSync(filepath, {
        encoding: 'utf8'
    });
    if (content.charAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    return content;
};

file.readJSON = function(filepath) {
    try {
        return JSON.parse(file.read(file.abspath(filepath)));
    } catch (e) {
        return null;
    }
};

file.write = function(filepath, content) {
    file.mkdir(path.dirname(filepath));
    return fs.writeFileSync(filepath, content);
};

file.copy = function(src, dest, filter) {
    log.debug('copy', file.cleanpath(src) + ' -> ' + file.cleanpath(dest));

    var fn = option.get('process_copy');

    var copy = function(src, dest) {
        var buf = fs.readFileSync(src);
        file.mkdir(path.dirname(dest));

        if (fn) {
            buf = fn(buf, src);
        }

        fs.writeFileSync(dest, buf);
    };
    if (file.stat(src).isFile()) {
        copy(src, dest);
        return;
    }
    file.recurse(src, function(filepath) {
        var destfile = path.join(dest, path.relative(src, filepath));
        copy(filepath, destfile);
    }, filter);
};

file.rmdir = function(src) {
    if (file.exists(src)) {
        rimraf.sync(src);
    }
};

file.stat = function(filepath) {
    return fs.statSync(filepath);
};

file.require = function(item) {
    if (!_.isString(item)) return item;

    var basename = path.basename(item);
    var bits = basename.split('.');
    var directory = path.dirname(item);
    if (directory.slice(0, 2) === './') {
        directory = path.join(process.cwd(), directory);
    }
    var mo = require(path.join(directory, _.first(bits)));
    bits = bits.slice(1);
    if (!_.isEmpty(bits)) {
        bits.forEach(function(bit) {
            mo = mo[bit];
        });
    }
    return mo;
};


function unixifyPath(filepath) {
    if (process.platform === 'win32') {
        return filepath.replace(/\\/g, '/');
    }
    return filepath;
}
