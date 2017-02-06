var format = require('util').format,
    hl = require('./highlight'),
    event = require('docool/parser/utils/event'),
    iframeCount = 0;

function codeTagWrapper(code) {
    return `<pre><code>${code}</code></pre>`;
}

exports.header = function(text, level) {
    var id = encode.uri(text);
    return format('<h%d id="%s">%s</h%d>', level, id, text, level);
};

exports.code = function(code, language) {
    var firstChar, hide, inject, html = '', e = {
        originCode: code,
        code
    };

    // 没有设置语言
    if (!language || language === '+' || language === '-') {
        return codeTagWrapper(hl.render(code));
    }

    firstChar = language.slice(-1);
    e.hide = hide = firstChar === '-';
    e.inject = inject = (firstChar === '-' || firstChar === '+');

    if (inject) {
        e.language = language = language.slice(0, -1);
    }

    e.highlightCode = codeTagWrapper(hl.render(e.code, language));

    if (inject) {

        event.emit('md::injectCode', e);

        if (!e.preventDefault) {
            html = {
                'js': format('<script>%s</script>', e.code),
                'css': format('<style type="text/css">%s</style>', e.code),
                'html': format('<div class="docool-inject-html">%s</div>', e.code)
            }[language];

            if (hide) {
                return html;
            }
            return `${html}${e.highlightCode}`;
        }
        return '';
    }

    return e.highlightCode;
}

exports.normalRender = function(text, fn) {
    iframeCount = 0;
    text = text.replace(/^````([\w\:]+)$/gm, '````$1+');
    text = text.replace(/^`````([\w\:]+)$/gm, '`````$1-');
    if (fn.render) return fn.render(text);
    return fn(text);
};



var toc = [];
var tocLevel = 3;
exports.tocHeader = function(text, level) {
    var id = encode.uri(text);
    if (level <= tocLevel) {
        toc.push({ id: id, text: text, level: level });
    }
    return format('<h%d id="%s">%s</h%d>', level, id, text, level);
}
exports.tocRender = function(text, level, fn) {
    toc = [];
    tocLevel = level || 3;
    if (fn.render) {
        fn.render(text);
    } else {
        fn(text);
    }
    return toc;
}