var _ = require('lodash');

exports.handlers = {
    'filesParseFinish': (e) => {
        var doclets = e.doclets, buffer = {}, other =[], key;
        doclets.forEach(doclet => {
            if (doclet.kind && doclet.name) {
                key = `${doclet.kind},${doclet.name}`;
                buffer[key] = Object.assign(buffer[key] || {}, doclet[key]);
            } else {
                other.push(doclet);
            }
        });

        doclets.length = 0;

        _.forEach(buffer, (value, key) => {
            doclets.push(value);
        });

        _.forEach(other, (value) => {
            doclets.push(value);
        });
    },
}