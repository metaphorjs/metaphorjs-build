
var glob = require("glob");

/**
 * Resolve list of files using path pattern. Uses <code>glob</code> internally.
 * @param {string} pattern 
 * @param {string} ext 
 * @returns {array}
 */
module.exports = function(pattern, ext) {
    if (!pattern) {
        return [];
    }
    if (ext && pattern.indexOf("."+ext) != pattern.length - ext.length - 1) {
        pattern += '/*.' + ext;
    }
    return glob.sync(pattern);
};
