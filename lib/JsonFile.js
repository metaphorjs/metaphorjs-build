

var fs              = require("fs"),
    path            = require("path");

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

    for (key in json) {
        self[key] = json[key];
    }

    self.rawBuild   = self.build;
    self.build      = {};
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
    build: null,

    /**
     * @type {Object}
     */
    rawBuild: null,

    getRawBuild: function(name) {
        return this.rawBuild[name];
    }

};

var all = {};

JsonFile.get = function(filePath) {
    filePath = path.normalize(filePath);
    if (!all[filePath]) {
        all[filePath] = new JsonFile(filePath);
    }
    return all[filePath];
};


module.exports = JsonFile;