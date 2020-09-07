
const   Config = require("../Config.js"),
        Builder = require("../Builder.js");

/**
 * Build a bundle 
 * @function build
 * @param {string} name 
 */
module.exports = function(name) {

    const config = Config.getCurrent();
    const package = Config.getCurrentNpmConfig();

    if (!config) {
        throw new Error("metaphorjs.json not found in current directory!")
    }

    const run = function(name) {
        const builder     = new Builder(name, config, package);
        builder.build();
    };

    if (!name) {
        for (let k in config.build) {
            run(k);
        }
    }
    else {
        run(name);
    }
};