var md = require('marked'),
    share = require('./_share'),
    hlRenderer,
    tocRenderer,
    tocMarkdown,
    hlMarkdown;

md.setOptions({
    highlight: share.blockcode
});
hlRenderer = new md.Renderer();
hlRenderer.header = share.header;
hlRenderer.code = share.code;
hlMarkdown = function(content) {
    var opt = {
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: true,
        sanitize: false,
        smartLists: true,
        renderer: hlRenderer
    };
    return md(content, opt);
}

exports.render = function(text) {
    return share.normalRender(text, hlMarkdown);
}


tocRenderer = new md.Renderer();
tocRenderer.header = share.tocHeader;
tocMarkdown = function(content) {
    var opt = {
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: true,
        sanitize: false,
        smartLists: true,
        renderer: tocRenderer
    };
    return md(content, opt);
};

exports.toc = function(text, level) {
    return share.tocRender(text, level, tocMarkdown);
}
