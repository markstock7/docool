var express = require('express'),
    app = express(),
    path = require('path'),
    consolidate = require('consolidate'),
    _ = require('lodash');

var serverStart = false,
    docletDb = null;

app.engine('html', consolidate['swig']);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'templates/tmpl'));
app.use('/static', express.static(path.join(__dirname, 'templates/static')));
app.use('/static', express.static(path.join(__dirname, 'templates/bower_components')));

function init() {

    app.listen(3000, function() {});

    app.get('/', function(req, res) {
        var type = req.params.type;
        // classes|modules|namespaces|minixs|interfaces|globals
        res.render('home', docletDb.processedDoclets);
    });

    app.get('/doc/:type/list', function(req, res) {
        var type = req.params.type;
        // classes|modules|namespaces|minixs|interfaces|globals
        res.render('list', docletDb.processedDoclets);
    });

    app.get('/doc/:type/:name', function(req, res) {
        var data = Object.assign({}, docletDb[0]),
            params = req.params,
            doclets = docletDb[0].nav[params.type + 's'],
            doclet;
        if (doclets) {
            doclet = _.find(doclets, doclet => doclet.name === params.name);
        }
        data.doclet = doclet;

        res.render('doclet', data);
    });
}

module.exports.start = function start(_docletDb) {
    if (!serverStart) {
        init();
        serverStart = true;
    }
    // console.log(_docletDb);
    docletDb = _docletDb;
};