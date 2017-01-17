var Promise = require('bluebird'),
    event = require('../../utils/event'),
    md = require('./markdown'),
    _ = require('lodash');

var parser = module.exports = {
    parse: function(files) {
        var doclets = [];
        files = files || [];

        files.forEach(file => {
            var sourceCode = file.sourceCode,
                filename = file.filename,
                doclet;

            event.emit('md::fileParseBegin', {
                file: file
            });

            if (sourceCode.length) {
                doclet = parser.parseContent(sourceCode, filename);
            }

            event.emit('md::fileParseComplete', {
                doclet: doclet
            });
            doclets.push(doclet);
        });

        return doclets;
    },
    parseContent(content, filename) {
        var lines = content.split(/\t\n|\r|\n/),
            header = [],
            body = [],
            recording = true,
            doclet = {},
            meta;
        lines.forEach(line => {
            line = _.trim(line);
            if (recording && _.startsWith(line, '---')) {
                recording = false;
            } else if (recording && _.startsWith(line, '@')) {
                header.push(line);
            } else {
                body.push(line);
            }
        });

        meta = parser.parseMeta(header);

        Object.assign(doclet, meta);

        try {
            doclet.html = md.render(body.join('\n'));
        } catch(e) {
            console.error(e.message.split(/\r\n|\r|\n/)[0]);
        }

        return doclet;
    },

    parseMeta(tags) {
        var meta = {};
        tags.forEach(tag => {
            var result = /^@(\S*)\s*(.*)/.exec(tag);
            if (result) {
                meta[result[1]] = result[2];
            }
        });
        return meta;
    },

    parseToc(content) {

    }
}