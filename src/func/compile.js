
var Config = require("../Config.js"),
    Builder = require("../Builder.js");

/**
 * @function
 * @param {string} name 
 */
module.exports = function(name) {

    var config = Config.getCurrent();

    if (!config) {
        throw "metaphorjs.json not found in current directory!"
    }
    if (!action) {
        throw "Must specify build. Or use mjs-compile --all";
    }

    var builder     = new Builder(name, config);

    builder.build();
    return builder.compile();
};