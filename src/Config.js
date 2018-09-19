

var path            = require("path"),
    fs              = require("fs"),
    Base            = require("./Base.js");

/**
 * metaphorjs.json wrapper
 * @class Config
 */
module.exports = function(){

    var defaults = {
        mixin: {},
        build: {},
        docs: {}
    };

    var all = {};

    var Config = Base.$extend({

        /**
         * @type {string}
         */
        path: null,

        /**
         * @type {string}
         */
        base: null,

        /**
         * @constructor
         * @param {string} jsonFilePath 
         */
        $init: function(jsonFilePath) {

            var self    = this;
    
            self.path   = path.normalize(jsonFilePath);
            self.base   = path.dirname(self.path) + '/';
    
            var json    = require(self.path),
                key;
    
            for (key in defaults) {
                self[key] = defaults[key];
            }
    
            for (key in json) {
                self[key] = json[key];
            }
        }
    }, {

        /**
         * Get wrapped metaphorjs.json by file path
         * @static
         * @method
         * @param {string} filePath 
         */
        get: function(filePath) {
            filePath = path.normalize(filePath);
            if (!all[filePath]) {
                all[filePath] = new Config(filePath);
            }
            return all[filePath];
        },

        /**
         * Get wrapped metaphorjs.json by current directory
         * @static
         * @method
         */
        getCurrent: function() {
            var cwd = process.cwd(),
                file = cwd + "/metaphorjs.json";

            if (fs.existsSync(file)) {
                return Config.get(file);
            }

            return null;
        }
    });


    return Config;

}();