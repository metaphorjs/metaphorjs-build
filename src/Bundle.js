
var Base = require("./Base.js"),
    File = require("./File.js"),
    nextUid = require("metaphorjs/src/func/nextUid.js");

require("./plugin/bundle/FileProcessor.js");
require("./plugin/bundle/NpmProcessor.js");
require("./plugin/bundle/Names.js");
require("./plugin/code/Generator.js");
require("./mixin/WithImports.js");
require("./mixin/Collector.js");

var all = {};

/**
 * @class Bundle
 */

var Bundle = Base.$extend({
    $class: "Bundle",
    $mixins: ["mixin.WithImports", 
                "mixin.Collector"],

    id: null,
    name: null,
    type: null,
    top: false,
    parent: null,

    $constructor: function() {
        this.$plugins.push("plugin.bundle.FileProcessor");
        this.$plugins.push("plugin.bundle.NpmProcessor");
        this.$plugins.push("plugin.bundle.Names");
        this.$plugins.push("plugin.code.Generator");

        this.$super(arguments);
    },

    /**
     * @constructor
     * @param {string} name
     * @param {string} type
     */
    $init: function(name, type) {

        var self = this;

        self.$super();

        self.$$observable.createEvent("process-file", "pipe");  

        self.id = nextUid();
        self.name = name;
        self.type = type;
        self.buildList = [];
        self.included = {};
        self.globals = {};

        self.on("set_expose", self._setArrayOption, self);
        self.trigger("init", self);
    },

    /**
     * Set current bundle
     * @method
     * @param {Bundle} bundle
     */
    setBundle: function(bundle) {
        this.parent = bundle;
    },

    /**
     * Collect files as defined in json file
     * @method
     * @param {Config} config
     * @param {string} name Build name
     */
    collect: function(config, name) {

        var self        = this,
            mixin       = config.getBuildConfig(name);

        if (!mixin) {
            throw mixin + " not found in " + config.path;
        }

        if (mixin.options) {
            self.setOptions(mixin.options);
        }

        self._processMixin(mixin, config);

        var replacement;
        for (var path in self.collected) {
            while (self.allReplaces[path]) {
                replacement = File.get(self.allReplaces[path]);
                self.collected[replacement.path] = replacement;
                delete self.collected[path];
                path = replacement.path;
            }
        }

        for (path in self.allOmits) {
            if (self.collected[path]) {
                delete self.collected[path];
            }
        }

        self.trigger("files-collected", self);
    },

    /**
     * Resolve all required files, collect inner bundles
     * @method
     */
    prepareBuildList: function() {

        var self = this;

        for (var path in self.collected) {
            self.addFile(self.collected[path]);
        }

        // hoist all module reqs
        // top level only
        self.getImports("module", true, true).forEach(self.addImport, self);
        self.trigger("imports-hoisted", self);
        self.trigger("prepare-module-names", self);
        self.trigger("prepare-file-names", self);
        self.eachBundle(function(b){
            b.trigger("prepare-file-names", b);
        });

        // make inner bundles expose some of its imports
        self.eachFile(function(file) {
            var b = file.bundle;
            if (!b.top) {
                file.getParents().forEach(function(imp) {
                    if (!b.hasFile(imp.file)) {
                        b.setOption("expose", imp.names);
                    }
                });
            }
        });

        self.trigger("build-list-ready", self);
    },

    /**
     * Add already processed file to the build list
     * @method
     * @param {File} file
     */
    addFile: function(file) {
        var self = this;
        if (!self.included[file.id]) {
            file = self.trigger("process-file", file, self);
            if (file && !self.included[file.id]) {
                self.included[file.id] = true;
                self.buildList.push(file);
                file.setBundle(self);
            }
        }
    },

    /**
     * @ignore
     */
    toString: function() {
        return this.getContent();
    },

    /**
     * Checks if this bundle can't be included to global scope
     * without wrapping it first
     * @method
     * @returns {bool}
     */
    needsWrapping: function() {
        return this.getOption("wrap") || 
                this.top === false || 
                false;
    },

    getUniqueName: function() {
        return "bundle_" + this.id;
    },

    hasGlobalVar: function(name) {
        return this.globals.hasOwnProperty(name);
    },

    getGlobalVarOrigin: function(name){
        return this.globals[name];
    },


    /**
     * Get concatenated content
     * @method
     * @returns {string}
     */
    getContent: function() {
        var self = this,
            code = "",
            strict = self.getOption("strict"),
            wrap = self.needsWrapping(),
            globl = self.getOption("global"),
            expose = self.getOption("expose"),
            amd = self.getOption("amd"),
            ret = self.getOption("return"),
            doesExport = self.getOption("exports"),
            exposeName = self.getOption("exposeIn", self.getUniqueName());

        code += '/* BUNDLE START ' + self.id + ' */';

        code += self.trigger("code-module-imports", self).join("\n");
        code += this.buildList.join("\n");

        if (expose) {
            code = self.trigger("code-expose", code, exposeName, expose);
        }
        if (globl) {
            code += self.trigger("code-global", 
                    globl === true ? 'MetaphorJs' : globl, 
                    exposeName);
        }

        if (wrap) {
            if (expose || ret) {
                code = self.trigger("code-return", code, ret || exposeName);
            }
        
            code = self.trigger("code-wrap", code);

            if (!self.top) {
                code = self.trigger("code-prepend-var", code, self.getUniqueName());
            }

            if (doesExport && expose) {
                code = self.trigger("code-export", false) + code;
            }
        }
        else {
            if (doesExport) {
                code += self.trigger("code-export", 
                                doesExport === true ? exposeName : doesExport);
            }
        }

        if (amd) {
            if (!amd.return) {
                amd.return = exposeName;
            }
            code = self.trigger("code-amd-module", code, amd, self);
        }

        code += '/* BUNDLE END ' + self.id + ' */';

        if (strict !== false) {
            code = '"use strict";\n' + code;
        }

        return code;
    },

    /**
     * Iterate over all files in this bundle and sub-bundles
     * @param {function} fn
     * @param {object} context 
     */
    eachFile: function(fn, context) {
        var self = this;
        self.buildList.forEach(function(entry){
            if (entry instanceof File) {
                fn.call(context, entry);
            }
            else {
                entry.eachFile(fn, context);
            }
        });
    },

    /**
     * Iterate over all sub bundles
     * @param {function} fn
     * @param {object} context 
     */
    eachBundle: function(fn, context) {
        var self = this;
        self.buildList.forEach(function(entry){
            if (entry instanceof Bundle) {
                fn.call(context, entry);
                entry.eachBundle(fn, context);
            }
        });
    },

    /**
     * @method
     * @param {File} file
     * @returns {bool}
     */
    hasFile: function(file) {
        return this.buildList.indexOf(file) !== -1;
    },

    /**
     * Get a list of files that import given module or file
     * @method
     * @param {object} def
     * @param {string} name optional; name under which file is imported
     * @returns {array}
     */
    whoImports: function(def, name) {
        var self = this;
        if (def.file) {
            return def.file.getParents().filter(function(file) {
                var imp = file.doesImport(def);
                return imp ? (name ? imp.hasName(name) : true) : false;
            });
        }
        else {
            var list = [];
            self.eachFile(function(file) {
                var subd;
                if (subd = file.doesImport(def)) {
                    if (!name || subd.hasName(name)) {
                        list.push(file);
                    }
                }
            });
            return list;
        }
    }
}, 

// Static methods
{
    get: function(name, type) {
        var fullName = ""+type +"/" + name;
        if (!all[fullName]) {
            all[fullName] = new Bundle(name, type);
        }

        return all[fullName];
    },

    exists: function(name, type) {
        return !!all[""+type +"/" + name];
    }
});


module.exports = Bundle;