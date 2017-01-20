var info = require('debug')('🎺');
exports.handlers = {
    'js::fileParseBegin': function(e) {
        console.log(e);
    },
    'js::fileParseComplete': function(e) {

    }
};