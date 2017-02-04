var logger = require('docool/logger');
exports.handlers = {
    'js::fileParseBegin': function(e) {
        logger.info(`Parse File: ${e.file.relativePath}`);
    },
    'js::fileParseComplete': function(e) {

    }
};