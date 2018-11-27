
var Base = require("./Base.js"),
    File = require("./File.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    nextUid = require("metaphorjs-shared/src/func/nextUid.js");

require("./plugin/bundle/FileProcessor.js");
require("./plugin/bundle/TemplateProcessor.js");
require("./plugin/bundle/NpmProcessor.js");
require("./plugin/bundle/Names.js");
require("./plugin/code/Prebuilt.js");
require("./plugin/code/Generator.js");
require("./mixin/WithImports.js");
require("./mixin/Collector.js");

/**
 * @class Bundle
 */

var Bundle = Base.$extend({
    $class: "MetaphorJs.build.Bundle",
    $mixins: [MetaphorJs.mixin.WithImports, 
                MetaphorJs.mixin.Collector],

    id: null,
    name: null,
    type: null,
    top: false,
    parent: null,
    builder: null,

    $constructor: function() {
        this.$plugins.push(MetaphorJs.plugin.bundle.FileProcessor);
        this.$plugins.push(MetaphorJs.plugin.bundle.TemplateProcessor);
        this.$plugins.push(MetaphorJs.plugin.bundle.NpmProcessor);
        this.$plugins.push(MetaphorJs.plugin.bundle.Names);
        this.$plugins.push(MetaphorJs.plugin.code.Generator);
        this.$plugins.push(MetaphorJs.plugin.code.Prebuilt);

        this.$super(arguments);
    },

    /**
     * @constructor
     * @param {string} name
     * @param {string} type
     * @param {Builder} builder
     */
    $init: function(name, type, builder) {

        var self = this;

        self.$super();

        self.$$observable.createEvent("process-file", "pipe");  
        self.$$observable.createEvent("process-template", "pipe");  

        self.id = nextUid();
        self.builder = builder;
        self.name = name;
        self.type = type;
        self.buildList = [];
        self.templateList = [];
        self.included = {};
        self.templates = {};
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
     * @param {string|object} fromModule {
     *  build|docs or already extracted mixin
     *  @default build
     * }
     */
    collect: function(config, name, fromModule) {

        if (!fromModule) {
            fromModule = "build";
        }

        var self        = this,
            mixin;       
        
        if (typeof fromModule === "string") {
            mixin = config.getModuleConfig(fromModule, name);
        }
        else if (fromModule) {
            mixin = fromModule;
        }

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
                replacement = self.builder.getFile(self.allReplaces[path]);
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
     * Get list of global vars
     * @method
     * @returns {array}
     */
    getGlobalNames: function() {
        var list = [], k;
        for (k in this.globals) {
            if (this.globals.hasOwnProperty(k)) {
                list.push(k);
            }
        }
        return list;
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

        for (path in self.collectedTemplates) {
            self.addTemplate(self.collectedTemplates[path]);
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

            file.prepareForBundling();
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
     * Add template to the bundle
     * @param {Template} template 
     */
    addTemplate: function(template) {
        var self = this;
        if (!self.templates[template.id]) {
            template = self.trigger("process-template", template, self);
            if (template && !self.templates[template.id]) {
                self.templates[template.id] = true;
                self.templateList.push(template);
                template.setBundle(self);
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
            prepend = self.getOption("prepend"),
            append = self.getOption("append"),
            globl = self.getOption("global"),
            expose = self.getOption("expose"),
            amd = self.getOption("amd"),
            ret = self.getOption("return"),
            req = self.getOption("require"),
            doesExport = self.getOption("exports");

        code += '/* BUNDLE START ' + self.id + ' */';
        strict !== false && (code += '\n"use strict";\n');
        code += self.trigger("code-module-imports", self).join("\n");
        code += self.trigger("code-prebuilt-var", 
                    self.trigger("collect-prebuilt"));
        code += self.buildList.join("\n");

        if (expose) {
            code += self.trigger("code-expose", expose, self);
        }

        if (globl) {
            code += self.trigger("code-global", globl, self);
        }

        if (req) {
            code = self.trigger("code-require", req, self) + code;
        }

        if (wrap) {
            if (ret) {
                code += self.trigger("code-return", ret, self);
            }
        
            code = self.trigger("code-wrap", code, self.getOption("wrap"), self);

            if (!self.top) {
                code = self.trigger("code-prepend-var", self.getUniqueName(), self) + code;
            }

            if (doesExport && ret) {
                code = self.trigger("code-export", false, self) + code;
            }
        }
        else {
            if (doesExport) {
                code += self.trigger("code-export", doesExport, self);
            }
        }

        if (prepend) {
            code = self.trigger("code-prepend", prepend, self) + code;
        }

        if (append) {
            code = code + self.trigger("code-append", append, self);
        }

        if (amd) {
            code = self.trigger("code-amd-module", code, amd, self);
        }

        code += '/* BUNDLE END ' + self.id + ' */';

        return code;
    },



    _generateTemplates: function() {
        return "";
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
});


module.exports = Bundle;