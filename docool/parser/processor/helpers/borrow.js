var SCOPE = require('docool/parser/utils/name').SCOPE,
    _ = require('lodash'),
    hasOwnProp = Object.prototype.hasOwnProperty;

function cloneBorrowedDoclets(doclet, doclets) {
    doclet.borrowed.forEach(function(borrowed) {
        var borrowedDoclets = doclets.index.longname[borrowed.from];
        var borrowedAs = borrowed.as || borrowed.from;
        var clonedDoclets;
        var parts;
        var scopePunc;

        if (borrowedDoclets) {
            borrowedAs = borrowedAs.replace(/^prototype\./, SCOPE.PUNC.INSTANCE);
            clonedDoclets = _.cloneDeep(borrowedDoclets).forEach(function(clone) {
                // TODO: this will fail on longnames like '"Foo#bar".baz'
                parts = borrowedAs.split(SCOPE.PUNC.INSTANCE);

                if (parts.length === 2) {
                    clone.scope = SCOPE.NAMES.INSTANCE;
                    scopePunc = SCOPE.PUNC.INSTANCE;
                } else {
                    clone.scope = SCOPE.NAMES.STATIC;
                    scopePunc = SCOPE.PUNC.STATIC;
                }

                clone.name = parts.pop();
                clone.memberof = doclet.longname;
                clone.longname = clone.memberof + scopePunc + clone.name;
                doclets.push(clone);
            });
        }
    });
}

/**
 Take a copy of the docs for borrowed symbols and attach them to the
 docs for the borrowing symbol. This process changes the symbols involved,
 moving docs from the "borrowed" array and into the general docs, then
 deleting the "borrowed" array.
 */
exports.resolveBorrows = function(doclets) {
    var doclet;

    if (!doclets.index) {
        // logger.error('Unable to resolve borrowed symbols, because the docs have not been indexed.');
        return;
    }

    for (var i = 0, l = doclets.index.borrowed.length; i < l; i++) {
        doclet = doclets.index.borrowed[i];

        cloneBorrowedDoclets(doclet, doclets);
        delete doclet.borrowed;
    }

    doclets.index.borrowed = [];

    return doclets;
};