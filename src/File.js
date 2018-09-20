
var resolvePath = require("./func/resolvePath.js"),
    path = require("path"),
    fs = require("fs"),
    nextUid = require("metaphorjs/src/func/nextUid.js"),
    Base = require("./Base.js"),
    Import = require("./Import.js");

require("./plugin/file/NodeModule.js");
require("./plugin/code/Cleanup.js");
require("./plugin/code/Info.js");
require("./plugin/code/Generator.js");
require("./mixin/WithImports.js");

/**
 * @class File
 */
var File = Base.$extend({

    $class: "File",
    $mixins: ["mixin.WithImports"],

    id: null,
    path: null,
    bundle: null,
    builder: null,

    $constructor: function() {
        this.$plugins.push("plugin.file.NodeModule");
        this.$plugins.push("plugin.code.Cleanup");
        this.$plugins.push("plugin.code.Info");
        this.$plugins.push("plugin.code.Generator");

        this.$super(arguments);
    },

    /**
     * Use File.get instead of constructor
     * @constructor
     * @param {string} filePath
     * @param {object} options
     * @param {Builder} builder
     */
    $init: function(filePath, options, builder) {

        var self = this;

        self.$$observable.createEvent("collect-imports", "concat");
        self.$$observable.createEvent("collect-file-info", "merge");
        self.$$observable.createEvent("collect-code-info", "merge");
        self.$$observable.createEvent("cleanup-code", "pipe");
        self.$$observable.createEvent("decide-wrapping", true);
        self.$$observable.createEvent("decide-module-exports", "merge");

        self.id         = nextUid();
        self.builder    = builder;
        self.path       = filePath;
        self._processed = false;
        self.content    = "";

        self.on("set_as", self._setArrayOption, self);
        self.on("set_as", self._setAsOption, self);

        self.$super(options);
    },

    /**
     * Set current bundle
     * @method
     * @param {Bundle} bundle
     */
    setBundle: function(bundle) {
        this.bundle = bundle;
    },

    /**
     * Get unique variable name for this file
     * @method
     * @returns {string}
     */
    getUniqueName: function() {
        var as = this.getOption("as"),
            name;
        if (as && as.length) {
            name = as[0];
        }
        else {
            name = path.basename(this.path, ".js");
        } 
        if (this.bundle.hasGlobalVar(name) && 
            this.bundle.getGlobalVarOrigin(name) != this.path) {
            return "f_" + this.id;
        }
        return name;
    },

    _setAsOption: function() {
        if (this.options.as) {
            var i, l = this.options.as.length;
            for (i = 0; i < l; i++) {
                if (this.options.as[i] === "*") {
                    this.options.as[i] = path.basename(this.path, ".js");
                }
            } 
        }
    },

    /**
     * Process all global imports in the file
     * @method
     */
    processReqs: function() {
        var self = this;

        if (self._processed) {
            return;
        }

        self.content = self.getOriginalContent();
        self._processed = true;

        var reqs = self.trigger("collect-imports", self.content, self);

        reqs.forEach(self._processReq, self);

        // remove reqs from the code using ranges
        reqs.sort(function(a, b) { 
                return b.range[1] - a.range[1];
            }).forEach(function(r) {
                self.content = self.content.slice(0, r.range[0]) + 
                                self.content.slice(r.range[1]);
        });

        self.content = self.trigger("cleanup-code", self.content);
    },

    _processReq: function(req) {

        var self = this,
            names = (req.names || []).slice(),
            reqPath = req.module,
            resPath;

        if (typeof names === "string") {
            names = [names];
        }

        // module import
        if (reqPath.indexOf("./") !== 0 &&
                reqPath.indexOf("../") !== 0 &&
                reqPath.indexOf("*") === -1 &&
                reqPath.indexOf("/") === -1 &&
                !reqPath.match(/\.js$/)) {

            self.addImport(new Import({
                type: "require",
                module: req.module,
                sub: req.sub,
                names: names,
                in: [self]
            }));
            return; 
        }
        // file import
        else {

            resPath = resolvePath(reqPath, [path.dirname(self.path)]);

            if (!resPath) {
                throw reqPath + " required in " + self.path + " does not exist";
            }

            reqFile = self.builder.getFile(resPath);

            self.addImport(new Import({
                type: "require",
                file: reqFile,
                names: names,
                in: [self]
            }));

            reqFile.addImportedBy(new Import({
                type: "require",
                file: self,
                names: names
            }));
        }
    },

    /**
     * Collect file info from all plugins
     * @method
     * @returns {object}
     */
    getFileInfo: function(){
        if (!this._fileInfo) {
            this._fileInfo = this.trigger("collect-file-info", this);
        }
        return this._fileInfo;
    },

    /**
     * Collect code info from all plugins
     * @method
     * @returns {object}
     */
    getCodeInfo: function(){
        if (!this._codeInfo) {
            this._codeInfo = this.trigger("collect-code-info", 
                                            this.content || this.getOriginalContent());
        }
        return this._codeInfo;
    },

    
    /**
     * Get file content stripped of requires and with all options applied
     * @method
     * @returns {string}
     */
    getContent: function() {

        var self = this,
            name = self.getUniqueName(),
            code = self.content;

        code = self.trigger("cleanup-code", code);
        code = self.trigger("code-wrapped-imports", self).join("\n") + code;

        if (self.needsWrapping()) {
            code = self.trigger("code-wrap", code);
            code = self.trigger("code-prepend-var", name) + code;
        }

        code = self.trigger("code-replace-export", code, 
                            self.trigger('decide-module-exports', self));

        return self.content = code;
    },

    /**
     * Get current state of the code
     * @method
     * @returns {string}
     */
    getCurrentContent: function() {
        return this.content;
    },

    /**
     * Get original file content
     * @method
     * @returns {string}
     */
    getOriginalContent: function() {
        return fs.readFileSync(this.path).toString();
    },

    /**
     * Checks if this file can't be included to global scope
     * without wrapping it first
     * @method
     * @returns {bool}
     */
    needsWrapping: function() {
        return this.getOption("wrap") ||
                this.trigger("decide-wrapping", this) || 
                false;
    },

    /**
     * @ignore
     */
    toString: function() {
        return this.getContent();
    }
});

module.exports = File;
