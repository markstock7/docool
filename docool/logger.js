var debug = require('debug'),
    format = require('util').format,
    emoji = require('node-emoji'),
    chalk = require('chalk');

function logWrapper(emojiSymbol, log, color, cb) {
    var ns = emojiSymbol ? emoji.get(emojiSymbol) : emojiSymbol;
    ns = ns ? ns + '  ': '';
    return function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var msg = chalk[color](ns + format.apply(null, args));
        log(msg);
        cb && cb();
    }
}

module.exports = {
    error: logWrapper('x', console.error, 'red'),
    info: logWrapper('loudspeaker', console.info, 'cyan'),
    warn: logWrapper('warning', console.info, 'yellow'),
    fatal: logWrapper('bomb', console.error, 'bgRed', process.exit),
    verbose: logWrapper('', console.log, 'green')
};
