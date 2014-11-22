

var fs              = require("fs"),
    path            = require("path"),
    isString        = require("metaphorjs/src/func/isString.js"),
    isArray         = require("metaphorjs/src/func/isArray.js");


module.exports = function(){

    var insertVars = function(string, root) {

        return string.replace(/@{([^}]+)}/ig, function(match, key) {

            if (root[key]) {
                return root[key];
            }
            else {
                return "";
            }
        });
    };

    var prepareData = function(data, root) {

        var k, val, i, l;

        for (k in data) {

            val = data[k];

            if (isString(val)) {
                data[k] = insertVars(val, root);
            }
            else if (isArray(val)) {
                for (i = 0, l = val.length; i < l; i++) {
                    prepareData(data[k][i], root);
                }
            }
            else if (val && typeof val == "object") {
                prepareData(data[k], root);
            }
        }
    };


    var JsonFile = function(jsonFilePath) {

        var self    = this;

        self.path   = path.normalize(jsonFilePath);
        self.base   = path.dirname(self.path) + '/';
        self.build  = {};
        self.test   = [];
        self.push   = [];
        self.mixin  = {};

        var json    = require(self.path),
            key;

        prepareData(json, json);

        for (key in json) {
            self[key] = json[key];
        }
    };

    JsonFile.prototype = {

        /**
         * @type {string}
         */
        path: null,

        /**
         * @type {string}
         */
        base: null,

        /**
         * @type {string}
         */
        target: null,

        /**
         * @type {bool}
         */
        compile: true,

        /**
         * @type {[]}
         */
        test: null,

        /**
         * @type {string}
         */
        version: null,

        /**
         * @type {[]}
         */
        push: null,

        /**
         * @type {Object}
         */
        mixin: null,

        /**
         * @type {Object}
         */
        build: null
    };

    var all = {};

    JsonFile.get = function(filePath) {
        filePath = path.normalize(filePath);
        if (!all[filePath]) {
            all[filePath] = new JsonFile(filePath);
        }
        return all[filePath];
    };


    return JsonFile;

}();