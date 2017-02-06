var taffydb = require('taffydb'),
    _ = require('lodash');

function getPropsType(value) {
    return _.replace(_.replace(value, /(React\.)?PropTypes\./, ''), /\.isRequired/, '');
}

function isPropsRequired(value) {
    return _.endsWith(value, '.isRequired');
}

function buildComponentPropTypes(componentDoclet, docletDb) {
    var propTypes, props, longname;

    props = componentDoclet.props = componentDoclet.props || {};

    longname = componentDoclet.longname + '.propTypes';
    propTypes = docletDb({ longname: longname }).first();
    if (propTypes) {
        docletDb({ longname: longname }).remove();
        // 此时为复制运算，需要继续寻找定义propTypes的地方
        if (propTypes.meta.code.type === 'Identifier') {
            longname = propTypes.meta.code.value;
            propTypes = docletDb({ memberof: longname }).get();
            if (propTypes.length) {
                docletDb({ memberof: longname }).remove();
            }
        } else if (propTypes.meta.code.type === 'ObjectExpression') {
            propTypes = docletDb({ memberof: longname }).get();
            if (propTypes.length) {
                docletDb({ memberof: longname }).remove();
            }
        }

        propTypes.forEach(propType => {
            var prop = props[propType.name];
            if (!prop) {
                props[propType.name] = { name: propType.name };
                prop = props[propType.name];
            }

            prop.type = propType.type ? propType.type.names.join(' / ') : getPropsType(propType.meta.code.value);
            prop.required = isPropsRequired(propType.meta.code.value);
            prop.description = propType.description || '';
        });
    }

}

function buildComponentPropsDefault(componentDoclet, docletDb) {
    var defaultProps, props, longname;

    props = componentDoclet.props = componentDoclet.props || {};

    longname = componentDoclet.longname + '.defaultProps';
    defaultProps = docletDb({ longname: longname }).first();
    if (defaultProps) {
        docletDb({ longname: longname }).remove();
        if (defaultProps.meta.code.type === 'Identifier') {
            longname = defaultProps.meta.code.value;
            defaultProps = docletDb({ memberof: longname }).get();
            if (defaultProps.length) {
                docletDb({ memberof: longname }).remove();
             }
        } else if (defaultProps.meta.code.type === 'ObjectExpression') {
            defaultProps = docletDb({ memberof: longname }).get();
            if (defaultProps.length) {
                docletDb({ memberof: longname }).remove();
            }
        }
        defaultProps.forEach(defaultProp => {
            if (!props[defaultProp.name]) {
                props[defaultProp.name] = {
                    name: defaultProp.name
                };
            }
            props[defaultProp.name].default = defaultProp.meta.code.value;
        });
    }
}
/**
 * 从 PropType 中 为 props 解析出类型
 * 从 defaultProps 中 为 props 解析出默认值
 */
exports.handlers = {
    'js::fileParseComplete': function(e) {
        var doclets = e.doclets,
            docletDb = taffydb.taffy(doclets.slice(0)),
            componentDoclets;

        doclets.length = 0;
        componentDoclets = docletDb({ kind: 'component' }).get();

        if (componentDoclets.length) {
            docletDb({ kind: 'component' }).remove();
            componentDoclets.forEach(componentDoclet => {

                buildComponentPropTypes(componentDoclet, docletDb);
                buildComponentPropsDefault(componentDoclet, docletDb);

                docletDb.insert(componentDoclet);
            });
        }

        docletDb().get().forEach(doclet => {
            doclets.push(doclet);
        });
    }
};