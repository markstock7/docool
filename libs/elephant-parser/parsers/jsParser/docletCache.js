var hasOwnProp = Object.prototype.hasOwnProperty;

var DocletCache = module.exports = function DocletCache() {
    this._doclets = {};
};

DocletCache.prototype.get = function (name) {
    if (!hasOwnProp.call(this._doclets, name)) {
        return null;
    }

    // always return the most recent doclet
    return this._doclets[name][this._doclets[name].length - 1];
};

DocletCache.prototype.put = function (name, value) {
    if (!hasOwnProp.call(this._doclets, name)) {
        this._doclets[name] = [];
    }

    this._doclets[name].push(value);
};