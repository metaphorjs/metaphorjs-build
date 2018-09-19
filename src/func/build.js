
var Config = require("../Config.js"),
    Builder = require("../Builder.js");

/**
 * Build a bundle 
 * @function build
 * @param {string} name 
 */
module.exports = function(name) {

    var config = Config.getCurrent(),
        actions = [],
        builds, 
        i;

    if (!config) {
        throw "metaphorjs.json not found in current directory";
    }

    if (!name) {
        builds      = config.build;

        if (builds) {
            for (i in builds) {
                if (builds[i].auto) {
                    actions.push(i);
                }
            }
        }
    }
    else {
        actions.push(name);
    }

    actions.forEach(function(name){
        var builder     = new Builder(name, config);
        builder.build();
    });
};