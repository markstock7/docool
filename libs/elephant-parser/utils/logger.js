var util = require('util'),
    logger;


function Logger() {}
util.inherits(Logger, require('events').EventEmitter);

logger = new Logger();
/**
 * Logging levels for the JSDoc logger. The default logging level is
 * {@link module:jsdoc/util/logger.LEVELS.ERROR}.
 *
 * @alias module:jsdoc/util/logger.LEVELS
 * @enum
 * @type {number}
 */
var LEVELS = logger.LEVELS = {
    /**
     * Do not log any messages.
     */
    SILENT: 0,
    /**
     * Log fatal errors that prevent JSDoc from running.
     */
    FATAL: 10,
    /**
     * Log all errors, including errors from which JSDoc can recover.
     */
    ERROR: 20,
    /**
     * Log the following messages:
     *
     * + Warnings
     * + Errors
     */
    WARN: 30,
    /**
     * Log the following messages:
     *
     * + Informational messages
     * + Warnings
     * + Errors
     */
    INFO: 40,
    /**
     * Log the following messages:
     *
     * + Debugging messages
     * + Informational messages
     * + Warnings
     * + Errors
     */
    DEBUG: 50,
    /**
     * Log all messages.
     */
    VERBOSE: 1000
};

var DEFAULT_LEVEL = LEVELS.WARN;
var logLevel = DEFAULT_LEVEL;

var PREFIXES = {
    DEBUG: 'DEBUG: ',
    ERROR: 'ERROR: ',
    FATAL: 'FATAL: ',
    WARN: 'WARNING: '
};

// Add a prefix to a log message if necessary.
function addPrefix(args, prefix) {
    var updatedArgs;

    if (prefix && typeof args[0] === 'string') {
        updatedArgs = args.slice(0);
        updatedArgs[0] = prefix + updatedArgs[0];
    }

    return updatedArgs || args;
}

// TODO: document events
function wrapLogFunction(name, func) {
    var eventName = 'logger:' + name;
    var upperCaseName = name.toUpperCase();
    var level = LEVELS[upperCaseName];
    var prefix = PREFIXES[upperCaseName];

    return function() {
        var loggerArgs;

        var args = Array.prototype.slice.call(arguments, 0);

        if (logLevel >= level) {
            loggerArgs = addPrefix(args, prefix);
            func.apply(null, loggerArgs);
        }

        args.unshift(eventName);
        logger.emit.apply(logger, args);
    };
}

// Print a message to STDOUT without a terminating newline.
function printToStdout() {
    var args = Array.prototype.slice.call(arguments, 0);

    process.stdout.write(util.format.apply(util, args));
}

/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.DEBUG}.
 *
 * @alias module:jsdoc/util/logger.debug
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.debug = wrapLogFunction('debug', console.info);
/**
 * Print a string at log level {@link module:jsdoc/util/logger.LEVELS.DEBUG}. The string is not
 * terminated by a newline.
 *
 * @alias module:jsdoc/util/logger.printDebug
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.printDebug = wrapLogFunction('debug', printToStdout);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.ERROR}.
 *
 * @alias module:jsdoc/util/logger.error
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.error = wrapLogFunction('error', console.error);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.FATAL}.
 *
 * @alias module:jsdoc/util/logger.fatal
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.fatal = wrapLogFunction('fatal', console.error);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.INFO}.
 *
 * @alias module:jsdoc/util/logger.info
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.info = wrapLogFunction('info', console.info);
/**
 * Print a string at log level {@link module:jsdoc/util/logger.LEVELS.INFO}. The string is not
 * terminated by a newline.
 *
 * @alias module:jsdoc/util/logger.printInfo
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.printInfo = wrapLogFunction('info', printToStdout);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.VERBOSE}.
 *
 * @alias module:jsdoc/util/logger.verbose
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.verbose = wrapLogFunction('verbose', console.info);
/**
 * Print a string at log level {@link module:jsdoc/util/logger.LEVELS.VERBOSE}. The string is not
 * terminated by a newline.
 *
 * @alias module:jsdoc/util/logger.printVerbose
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.printVerbose = wrapLogFunction('verbose', printToStdout);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.WARN}.
 *
 * @alias module:jsdoc/util/logger.warn
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.warn = wrapLogFunction('warn', console.warn);

/**
 * Set the log level.
 *
 * @alias module:jsdoc/util/logger.setLevel
 * @param {module:jsdoc/util/logger.LEVELS} level - The log level to use.
 */
logger.setLevel = function setLevel(level) {
    logLevel = (level !== undefined) ? level : DEFAULT_LEVEL;
};

/**
 * Get the current log level.
 *
 * @alias module:jsdoc/util/logger.getLevel
 * @return {module:jsdoc/util/logger.LEVELS} The current log level.
 */
logger.getLevel = function getLevel() {
    return logLevel;
};

module.exports = logger;