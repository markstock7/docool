var format = require('util').format;
var hl = require('highlight.js');

var escape = function(html) {
    return html
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

var shortcuts = {
    'js': 'javascript',
    'json': 'javascript',
    'md': 'markdown',
    'mkd': 'markdown',
    'markdown': 'markdown'
};

var language = function(language) {
    if (!language) {
        return null;
    }
    if (language === 'html') {
        return 'html';
    }

    if (language && shortcuts[language]) {
        language = shortcuts[language];
    }

    if (!language || !hl.LANGUAGES[language]) {
        return null;
    }
    return language;
};

var render = function(code, language) {
    language = language(language);

    if (!language) {
        return '<pre>' + escape(code) + '</pre>';
    }
    if (language === 'html') {
        language = 'xml';
    }
    code = hl.highlight(language, code).value;
    return format(
        '<div class="highlight"><pre><code class="%s">%s</code></pre></div>',
        language, code
    );
};

module.exports = {
    render: render,
    language: language
};