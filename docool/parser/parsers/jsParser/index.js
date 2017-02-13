var Parser = require('./parser'),
    // DocletDb = require('./docletDb').DocletDb,
    Promise = require('bluebird'),
    parser = new Parser();
    // docletDb = new DocletDb();

// module.exports = {
//     parse: function(files) {
//         var doclets = parser.parse(files);
//         return docletDb.clearBuffer().insert(doclets).processDoclets().getProcessedDoclets();
//     }
// }

module.exports = parser;
