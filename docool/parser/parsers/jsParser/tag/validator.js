var jsParser = {
        tag: {
            dictionary: require('./dictionary')
        }
    },
    logger = require('docool/logger'),
    format = require('util').format;

function buildMessage(tagName, meta, desc) {
    var result = format('The @%s tag %s. File: %s, line: %s', tagName, desc, `${meta.filename.path}${meta.filename.filename}`,
        meta.lineno);
    if (meta.comment) {
        result += '\n' + meta.comment;
    }
    return result;
}

/**
 * Validate the given tag.
 */
exports.validate = function(tag, tagDef, meta) {
    // handle cases where the tag definition does not exist
    if (!tagDef) {
        // log an error if unknown tags are not allowed
        var allowUnknownTags = true;
        if (!allowUnknownTags ||
            (Array.isArray(allowUnknownTags) &&
                allowUnknownTags.indexOf(tag.title) < 0)) {
            logger.error(buildMessage(tag.title, meta, 'is not a known tag'));
        }

        // stop validation, since there's nothing to validate against
        return;
    }

    if (!tag.text && tagDef.mustHaveValue) {
        // check for errors that make the tag useless
        logger.error(buildMessage(tag.title, meta, 'requires a value'));
    } else if (tag.text && tagDef.mustNotHaveValue) {
        // check for minor issues that are usually harmless
        logger.warn(buildMessage(tag.title, meta,
            'does not permit a value; the value will be ignored'));
    } else if (tag.value && tag.value.description && tagDef.mustNotHaveDescription) {
        logger.warn(buildMessage(tag.title, meta,
            'does not permit a description; the description will be ignored'));
    }
};
