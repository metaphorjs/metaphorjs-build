

var path            = require("path"),
    fs              = require("fs"),
    extend          = require("metaphorjs-shared/src/func/extend.js"),
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
        },

        getModuleConfig: function(type, name) {
            var cfg = this[type][name] || this.mixin[name];

            if (cfg) {
                if (cfg.extend) {
                    var base = this.getModuleConfig(type, cfg.extend);
                    cfg = extend({}, base, cfg, true, false);
                    delete cfg.extend;
                }
                return cfg;
            }

            return null;
        },

        getBuildConfig: function(name) {
            return this.getModuleConfig("build", name);
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