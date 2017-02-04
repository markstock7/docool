var format = require('util').format,
    hl = require('highlight.js'),
    iframeCount = 0;

var escape = function(html) {
    return html
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

var render = function(code, lang) {
    if (!lang) {
        return escape(code);
    }

    code = hl.highlight(lang, code).value;

    return code;
};

module.exports = {
    render: render,
    language: hl.getLanguage.bind(hl)
};