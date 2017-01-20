var format = require('util').format;
var hl = require('./highlight');

exports.blockcode = function(code, language) {
    var lastChar, hide, inject, html;

    // 没有设置语言
    if (!language || language === '+' || language === '-') {
        return hl.render(code);
    }

    lastChar = language.slice(-1);
    hide = lastChar === '-';
    inject = (lastChar === '-' || lastChar === '+');

    if (inject) {
        language = language.slice(0, -1);
    }

    html = '';
    if (inject) {
        html = {
            'javascript': format('<script>%s</script>', code),
            'css': format('<style type="text/css">%s</style>', code),
            'html': format('<div class="nico-insert-code">%s</div>', code)
        }[language];
    }

    if (hide && inject) {
        return html;
    }

    return html + hl.render(code, language);
}

exports.normalRender = function(text, fn) {
    iframeCount = 0;
    text = text.replace(/^````([\w\:]+)$/gm, '````$1+');
    text = text.replace(/^`````([\w\:]+)$/gm, '`````$1-');
    if (fn.render) return fn.render(text);
    return fn(text);
};

exports.header = function(text, level) {
    var id = encode.uri(text);
    return format('<h%d id="%s">%s</h%d>', level, id, text, level);
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