var Promise = require('bluebird'),
    parser = require('./parser');

// module.exports = {
//     parse: function(files) {
//         var doclets = parser.parse(files);
//         return doclets;
//     }
// }

module.exports = parser;