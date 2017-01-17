var express = require('express'),
    path = require('path'),
    consolidate = require('consolidate'),
    _ = require('lodash');

function Server(options) {
    this.doclets = [];
    this.options = options;
}

Server.prototype.init = function() {
    var app = this.app = express();
}

Server.prototype.start = function() {
    this.init();
    var app = this.app,
        options = this.options;

    app.engine('html', consolidate['swig']);
    app.set('view engine', 'html');

    app.listen(options.port, function() {});
}

Server.prototype.loadDoclets = function(doclets) {
    this.doclets = doclets;
}

Server.prototype.getAppInstance = function() {
    return this.app;
}

module.exports = Server;