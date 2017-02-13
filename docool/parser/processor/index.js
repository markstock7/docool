var taffydb    = require('taffydb'),
    _          = require('lodash'),
    helpers    = require('./helpers'),
    Promise    = require('bluebird'),
    event      = require('../utils/event'),
    hasOwnProp = Object.prototype.hasOwnProperty;

module.exports = function processor(doclets) {
    event.emit('docletsProcessBegin', { doclets });

    doclets = _.flow([
        helpers.mergeDoclets,
        helpers.prune,
        helpers.indexAll,
        helpers.augment.augmentAll,
        helpers.borrow.resolveBorrows
    ])(doclets);

    event.emit('docletsProcessComplete', { doclets });

    return doclets;
}