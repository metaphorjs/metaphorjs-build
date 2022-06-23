
const Config = require("../Config.js"),
    Builder = require("../Builder.js");

/**
* Get Builder for a bundle 
* @function getBuilder
* @param {string} name 
*/
module.exports = function getBuilder(name) {

    const config = Config.getCurrent();
    const npm = Config.getCurrentNpmConfig();

    if (!config) {
        throw new Error("metaphorjs.json not found in current directory!")
    }

    const builder = new Builder(name, config, npm);

    return builder;
};