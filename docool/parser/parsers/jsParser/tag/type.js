var catharsis = require('catharsis'),
    cast = require('../../../utils/cast'),
    jsParser = {
        name: require('../name')
    },
    util = require('util');


/**
 * Information about a type expression extracted from tag text.
 *
 * @typedef TypeExpressionInfo
 * @memberof module:jsdoc/tag/type
 * @property {string} expression - The type expression.
 * @property {string} text - The updated tag text.
 */

/** @private */
function unescapeBraces(text) {
    return text.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
}

/**
 * Extract a type expression from the tag text.
 *
 * input: @param {string} hello - hello world
 * output:
 *     expression : "string"
 *     newString : "@param  hello - hello world"
 */
function extractTypeExpression(string) {
    var completeExpression;
    var count = 0;
    var position = 0;
    var expression = '';
    var startIndex = string.search(/\{[^@]/); //
    var textStartIndex;

    if (startIndex !== -1) {
        // advance to the first character in the type expression
        position = textStartIndex = startIndex + 1;
        count++;

        while (position < string.length) {
            switch (string[position]) {
                case '\\':
                    // backslash is an escape character, so skip the next character
                    position++;
                    break;
                case '{':
                    count++;
                    break;
                case '}':
                    count--;
                    break;
                default:
                    // do nothing
            }

            // 找到了配对的{}
            if (count === 0) {
                // 将express从字符串中删除
                completeExpression = string.slice(startIndex, position + 1);
                expression = string.slice(textStartIndex, position).trim();
                break;
            }

            position++;
        }
    }

    string = completeExpression ? string.replace(completeExpression, '') : string;

    return {
        expression: unescapeBraces(expression),
        newString: string.trim()
    };
}

/** @private */
function getTagInfo(tagValue, canHaveName, canHaveType) {
    var name = '';
    var typeExpression = '';
    var text = tagValue;
    var expressionAndText;
    var nameAndDescription;
    var typeOverride;

    if (canHaveType) {
        expressionAndText = extractTypeExpression(text);
        typeExpression = expressionAndText.expression;
        text = expressionAndText.newString;
    }

    if (canHaveName) {
        nameAndDescription = jsParser.name.splitName(text);
        name = nameAndDescription.name;
        text = nameAndDescription.description;
    }

    return {
        name: name,
        typeExpression: typeExpression,
        text: text
    };
}

function parseName(tagInfo) {
    // like '[foo]' or '[ foo ]' or '[foo=bar]' or '[ foo=bar ]' or '[ foo = bar ]'
    // or 'foo=bar' or 'foo = bar'
    if (/^(\[)?\s*(.+?)\s*(\])?$/.test(tagInfo.name)) {
        tagInfo.name = RegExp.$2;
        // were the "optional" brackets present?
        if (RegExp.$1 && RegExp.$3) {
            tagInfo.optional = true;
        }

        // like 'foo=bar' or 'foo = bar'
        if (/^(.+?)\s*=\s*(.+)$/.test(tagInfo.name)) {
            tagInfo.name = RegExp.$1;
            tagInfo.defaultvalue = jsdoc.util.cast.cast(RegExp.$2);
        }
    }

    return tagInfo;
}

/** @private */
function getTypeStrings(parsedType, isOutermostType) {
    var applications;
    var typeString;

    var types = [];

    var TYPES = catharsis.Types;

    switch (parsedType.type) {
        case TYPES.AllLiteral:
            types.push('*');
            break;
        case TYPES.FunctionType:
            types.push('function');
            break;
        case TYPES.NameExpression:
            types.push(parsedType.name);
            break;
        case TYPES.NullLiteral:
            types.push('null');
            break;
        case TYPES.RecordType:
            types.push('Object');
            break;
        case TYPES.TypeApplication:
            // if this is the outermost type, we strip the modifiers; otherwise, we keep them
            if (isOutermostType) {
                applications = parsedType.applications.map(function(application) {
                    return catharsis.stringify(application);
                }).join(', ');
                typeString = util.format('%s.<%s>', getTypeStrings(parsedType.expression),
                    applications);

                types.push(typeString);
            } else {
                types.push(catharsis.stringify(parsedType));
            }
            break;
        case TYPES.TypeUnion:
            parsedType.elements.forEach(function(element) {
                types = types.concat(getTypeStrings(element));
            });
            break;
        case TYPES.UndefinedLiteral:
            types.push('undefined');
            break;
        case TYPES.UnknownLiteral:
            types.push('?');
            break;
        default:
            // this shouldn't happen
            throw new Error(util.format('unrecognized type %s in parsed type: %j', parsedType.type,
                parsedType));
    }

    return types;
}

/**
 * Extract JSDoc-style and Closure Compiler-style type information from the type expression
 * specified in the tag info.
 *
 * @private
 * @param {module:jsdoc/tag/type.TagInfo} tagInfo - Information contained in the tag.
 * @return {module:jsdoc/tag/type.TagInfo} Updated information from the tag.
 */
function parseTypeExpression(tagInfo) {
    var errorMessage;
    var parsedType;

    // don't try to parse empty type expressions
    if (!tagInfo.typeExpression) {
        return tagInfo;
    }

    try {
        parsedType = catharsis.parse(tagInfo.typeExpression, {
            jsdoc: true
        });
    } catch (e) {
        // always re-throw so the caller has a chance to report which file was bad
        throw new Error(util.format('Invalid type expression "%s": %s', tagInfo.typeExpression,
            e.message));
    }

    tagInfo.type = tagInfo.type.concat(getTypeStrings(parsedType, true));
    tagInfo.parsedType = parsedType;

    // Catharsis and JSDoc use the same names for 'optional' and 'nullable'...
    ['optional', 'nullable'].forEach(function(key) {
        if (parsedType[key] !== null && parsedType[key] !== undefined) {
            tagInfo[key] = parsedType[key];
        }
    });

    // ...but not 'variable'.
    if (parsedType.repeatable !== null && parsedType.repeatable !== undefined) {
        tagInfo.variable = parsedType.repeatable;
    }

    return tagInfo;
}

// TODO: allow users to add/remove type parsers (perhaps via plugins)
var typeParsers = [parseName, parseTypeExpression];

/**
 * Parse the value of a JSDoc tag.
 *
 * @param {string} tagValue - The value of the tag. For example, the tag `@param {string} name` has
 * a value of `{string} name`.
 * @param {boolean} canHaveName - Indicates whether the value can include a symbol name.
 * @param {boolean} canHaveType - Indicates whether the value can include a type expression that
 * describes the symbol.
 * @return {module:jsdoc/tag/type.TagInfo} Information obtained from the tag.
 * @throws {Error} Thrown if a type expression cannot be parsed.
 */
exports.parse = function parse(tagValue, canHaveName, canHaveType) {
    if (typeof tagValue !== 'string') {
        tagValue = '';
    }

    var tagInfo = getTagInfo(tagValue, canHaveName, canHaveType);
    tagInfo.type = tagInfo.type || [];

    typeParsers.forEach(function(parser) {
        tagInfo = parser.call(this, tagInfo);
    });

    // if we wanted a type, but the parsers didn't add any type names, use the type expression
    if (canHaveType && !tagInfo.type.length && tagInfo.typeExpression) {
        tagInfo.type = [tagInfo.typeExpression];
    }

    return tagInfo;
};