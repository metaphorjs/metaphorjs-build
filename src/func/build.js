
var Config = require("../Config.js"),
    Builder = require("../Builder.js");

/**
 * Build a bundle 
 * @function build
 * @param {string} name 
 */
module.exports = function(name) {

    var config = Config.getCurrent();

    if (!config) {
        throw "metaphorjs.json not found in current directory!"
    }

    var run = function(name) {
        var builder     = new Builder(name, config);
        builder.build();
    };

    if (!name) {
        for (var k in config.build) {
            run(k);
        }
    }
    else {
        run(name);
    }
};