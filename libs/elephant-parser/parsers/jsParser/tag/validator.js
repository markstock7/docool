var jsParser = {
        tag: {
            dictionary: require('./dictionary')
        }
    },
    format = require('util').format;

function buildMessage(tagName, meta, desc) {
    var result = format('The @%s tag %s. File: %s, line: %s', tagName, desc, meta.filename,
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
            console.error(buildMessage(tag.title, meta, 'is not a known tag'));
        }

        // stop validation, since there's nothing to validate against
        return;
    }

    // check for errors that make the tag useless
    if (!tag.text && tagDef.mustHaveValue) {
        console.error(buildMessage(tag.title, meta, 'requires a value'));
    }

    // check for minor issues that are usually harmless
    else if (tag.text && tagDef.mustNotHaveValue) {
        console.warn(buildMessage(tag.title, meta,
            'does not permit a value; the value will be ignored'));
    } else if (tag.value && tag.value.description && tagDef.mustNotHaveDescription) {
        console.warn(buildMessage(tag.title, meta,
            'does not permit a description; the description will be ignored'));
    }
};