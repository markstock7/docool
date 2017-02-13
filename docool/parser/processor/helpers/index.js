var _ = require('lodash'),
    elephant = {
        name: require('docool/parser/utils/name'),
        tag: {
            dictionary: require('docool/parser/parsers/jsParser/tag/dictionary')
        }
    },
    MODULE_NAMESPACE = 'module:',
    hasOwnProp = Object.prototype.hasOwnProperty;

function isModuleExports(doclet) {
    return doclet.longname && doclet.longname === doclet.name &&
        doclet.longname.indexOf(MODULE_NAMESPACE) === 0 && doclet.kind !== 'module';
}

function parseType(longname) {
    var err;
    try {
        return catharsis.parse(longname, {
            jsdoc: true
        });
    } catch (e) {
        err = new Error('unable to parse ' + longname + ': ' + e.message);
        require('jsdoc/util/logger').error(err);
        return longname;
    }
}

function stringifyType(parsedType, cssClass, stringifyLinkMap) {
    return require('catharsis').stringify(parsedType, {
        cssClass: cssClass,
        htmlSafe: true,
        links: stringifyLinkMap
    });
}

function find(data, spec) {
    return data(spec).get();
};

function prune(doclets) {
    return doclets.filter(function(doclet) {
        return !doclet.undocumented && !doclet.ignore && doclet.memberof !== '<anonymous>';
    });
}

function indexAll(doclets) {
    var doclet;
    var documented = {};
    var borrowed = {};
    var longname = {};

    for (var i = 0, l = doclets.length; i < l; i++) {
        doclet = doclets[i];

        // track all doclets by longname
        if (!hasOwnProp.call(longname, doclet.longname)) {
            longname[doclet.longname] = [];
        }
        longname[doclet.longname].push(doclet);

        // track longnames of documented symbols
        if (!doclet.undocumented) {
            if (!hasOwnProp.call(documented, doclet.longname)) {
                documented[doclet.longname] = [];
            }
            documented[doclet.longname].push(doclet);
        }

        // track doclets with a `borrowed` property
        if (hasOwnProp.call(doclet, 'borrowed')) {
            borrowed.push(doclet);
        }
    }

    doclets.index = {
        borrowed: borrowed,
        documented: documented,
        longname: longname
    };

    return doclets
};

function getMembers(data) {
    /**
     * @todo make it more Scalable
     * @type {Object}
     */
    var members = {
        classes: find(data, {
            kind: 'class'
        }),
        components: find(data, {
            kind: 'component'
        }),
        events: find(data, {
            kind: 'event'
        }),
        globals: find(data, {
            kind: ['member', 'function', 'constant', 'typedef'],
            memberof: {
                isUndefined: true
            }
        }),
        mixins: find(data, {
            kind: 'mixin'
        }),
        modules: find(data, {
            kind: 'module'
        }),
        namespaces: find(data, {
            kind: 'namespace'
        }),
        interfaces: find(data, {
            kind: 'interface'
        })
    };

    // functions that are also modules (as in `module.exports = function() {};`) are not globals
    members.globals = members.globals.filter(function(doclet) {
        return !isModuleExports(doclet);
    });

    return members;
};

function generateDocletTree(data) {
    var tree = {
        module: {},
        global: {}
    };

    data().each(function(doclet) {
        var currentLongname = '';
        var currentParent;
        var processedLongname;
        var chunkLength;

        processedLongname = elephant.name.splitLongname(doclet.longname);
        chunkLength = processedLongname.chunks.length - 1;
        processedLongname.chunks.forEach(function(chunk, index) {
            currentLongname += chunk;

            if (index === 0) {
                if (_.startsWith(chunk, 'module:')) {
                    currentParent = tree['module'];
                    chunk = '/' + chunk.substring(7);
                } else {
                    currentParent = tree['global'];
                }
            } else if (chunk[0] === elephant.name.SCOPE.PUNC.INSTANCE) {
                currentParent.prototype = currentParent.prototype || {};
                currentParent = currentParent.prototype;
                chunk = '.' + chunk.substring('1');
            }

            if (!_.has(currentParent, chunk)) {
                currentParent[chunk] = {
                    longname: currentLongname
                };
            }

            if (currentParent[chunk]) {
                currentParent = currentParent[chunk];
            }

            if (index === chunkLength) {
                currentParent.doclet = doclet;
                currentParent.kind = doclet.kind;

            }
        });
    });

    return tree;
};

function graft(parentNode, childNodes, parentLongname, parentName) {
    childNodes
        .filter(function(element) {
            return (element.memberof === parentLongname);
        })
        .forEach(function(element, index) {
            var i,
                len;

            if (element.kind === 'namespace') {
                if (!parentNode.namespaces) {
                    parentNode.namespaces = [];
                }

                var thisNamespace = {
                    'name': element.name,
                    'description': element.description || '',
                    'access': element.access || '',
                    'virtual': !!element.virtual
                };

                parentNode.namespaces.push(thisNamespace);

                graft(thisNamespace, childNodes, element.longname, element.name);
            } else if (element.kind === 'mixin') {
                if (!parentNode.mixins) {
                    parentNode.mixins = [];
                }

                var thisMixin = {
                    'name': element.name,
                    'description': element.description || '',
                    'access': element.access || '',
                    'virtual': !!element.virtual
                };

                parentNode.mixins.push(thisMixin);

                graft(thisMixin, childNodes, element.longname, element.name);
            } else if (element.kind === 'function') {
                if (!parentNode.functions) {
                    parentNode.functions = [];
                }

                var thisFunction = {
                    'name': element.name,
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'description': element.description || '',
                    'parameters': [],
                    'examples': []
                };

                parentNode.functions.push(thisFunction);

                if (element.returns) {
                    thisFunction.returns = {
                        'type': element.returns[0].type ? (element.returns[0].type.names.length === 1 ? element.returns[0].type.names[0] : element.returns[0].type.names) : '',
                        'description': element.returns[0].description || ''
                    };
                }

                if (element.examples) {
                    for (i = 0, len = element.examples.length; i < len; i++) {
                        thisFunction.examples.push(element.examples[i]);
                    }
                }

                if (element.params) {
                    for (i = 0, len = element.params.length; i < len; i++) {
                        thisFunction.parameters.push({
                            'name': element.params[i].name,
                            'type': element.params[i].type ? (element.params[i].type.names.length === 1 ? element.params[i].type.names[0] : element.params[i].type.names) : '',
                            'description': element.params[i].description || '',
                            'default': hasOwnProp.call(element.params[i], 'defaultvalue') ? element.params[i].defaultvalue : '',
                            'optional': typeof element.params[i].optional === 'boolean' ? element.params[i].optional : '',
                            'nullable': typeof element.params[i].nullable === 'boolean' ? element.params[i].nullable : ''
                        });
                    }
                }
            } else if (element.kind === 'member') {
                if (!parentNode.properties) {
                    parentNode.properties = [];
                }
                parentNode.properties.push({
                    'name': element.name,
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'description': element.description || '',
                    'type': element.type ? (element.type.length === 1 ? element.type[0] : element.type) : ''
                });
            } else if (element.kind === 'event') {
                if (!parentNode.events) {
                    parentNode.events = [];
                }

                var thisEvent = {
                    'name': element.name,
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'description': element.description || '',
                    'parameters': [],
                    'examples': []
                };

                parentNode.events.push(thisEvent);

                if (element.returns) {
                    thisEvent.returns = {
                        'type': element.returns.type ? (element.returns.type.names.length === 1 ? element.returns.type.names[0] : element.returns.type.names) : '',
                        'description': element.returns.description || ''
                    };
                }

                if (element.examples) {
                    for (i = 0, len = element.examples.length; i < len; i++) {
                        thisEvent.examples.push(element.examples[i]);
                    }
                }

                if (element.params) {
                    for (i = 0, len = element.params.length; i < len; i++) {
                        thisEvent.parameters.push({
                            'name': element.params[i].name,
                            'type': element.params[i].type ? (element.params[i].type.names.length === 1 ? element.params[i].type.names[0] : element.params[i].type.names) : '',
                            'description': element.params[i].description || '',
                            'default': hasOwnProp.call(element.params[i], 'defaultvalue') ? element.params[i].defaultvalue : '',
                            'optional': typeof element.params[i].optional === 'boolean' ? element.params[i].optional : '',
                            'nullable': typeof element.params[i].nullable === 'boolean' ? element.params[i].nullable : ''
                        });
                    }
                }
            } else if (element.kind === 'class') {
                if (!parentNode.classes) {
                    parentNode.classes = [];
                }

                var thisClass = {
                    'name': element.name,
                    'description': element.classdesc || '',
                    'extends': element.augments || [],
                    'access': element.access || '',
                    'virtual': !!element.virtual,
                    'fires': element.fires || '',
                    'constructor': {
                        'name': element.name,
                        'description': element.description || '',
                        'parameters': [],
                        'examples': []
                    }
                };

                parentNode.classes.push(thisClass);

                if (element.examples) {
                    for (i = 0, len = element.examples.length; i < len; i++) {
                        thisClass.constructor.examples.push(element.examples[i]);
                    }
                }

                if (element.params) {
                    for (i = 0, len = element.params.length; i < len; i++) {
                        thisClass.constructor.parameters.push({
                            'name': element.params[i].name,
                            'type': element.params[i].type ? (element.params[i].type.names.length === 1 ? element.params[i].type.names[0] : element.params[i].type.names) : '',
                            'description': element.params[i].description || '',
                            'default': hasOwnProp.call(element.params[i], 'defaultvalue') ? element.params[i].defaultvalue : '',
                            'optional': typeof element.params[i].optional === 'boolean' ? element.params[i].optional : '',
                            'nullable': typeof element.params[i].nullable === 'boolean' ? element.params[i].nullable : ''
                        });
                    }
                }

                graft(thisClass, childNodes, element.longname, element.name);
            }
        });
}

// 将md 产生的文档和js产生的文档合并在一起
function mergeDoclets(doclets) {
    var docletMap = {};
    doclets.forEach(doclet => {
        if (doclet) {
            var key = (doclet.kind || '') + '|' + (doclet.name || '');
            docletMap[key] = Object.assign(docletMap[key] || {}, doclet);
        }
    });
    doclets = _.values(docletMap);
    return doclets;
};

module.exports = {
    prune,
    indexAll,
    getMembers,
    generateDocletTree,
    mergeDoclets,
    graft,
    find,
    borrow: require('./borrow'),
    augment: require('./augment')
};
