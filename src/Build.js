
require("./mixin/Collector.js");
require("./plugin/code/Prebuilt.js");

const   Base = require("./Base.js"),
        MetaphorJs = require("metaphorjs-shared/src/MetaphorJs"),
        nextUid = require("metaphorjs-shared/src/func/nextUid");


module.exports = Base.$extend({
    $class: "MetaphorJs.build.Build",
    $mixins: [MetaphorJs.mixin.Collector],


    $constructor: function() {
        this.$plugins.push(MetaphorJs.plugin.code.Prebuilt);

        this.$super(arguments);
    },


    /**
     * @constructor
     * @param {string} name
     * @param {Builder} builder
     */
    $init: function(name, builder) {

        this.$super();

        this.$$observable.createEvent("process-template", "pipe");  

        this.id = nextUid();
        this.builder = builder;
        this.name = name;
        this.buildList = [];
        this.excludeList = [];
        this.templateList = [];
        this.included = {};
        this.templates = {};
    
        this.trigger("init", this);
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

        var mixin;       

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
            this.setOptions(mixin.options);
        }

        this._processMixin(mixin, config);

        var replacement;
        for (var path in this.collected) {
            while (this.allReplaces[path]) {
                replacement = this.builder.getFile(this.allReplaces[path]);
                this.collected[replacement.path] = replacement;
                delete this.collected[path];
                path = replacement.path;
            }
        }

        for (path in this.allOmits) {
            if (this.collected[path]) {
                delete this.collected[path];
            }
        }

        this.trigger("files-collected", this);
    },


    /**
     * Resolve all required files, collect inner bundles
     * @method
     */
    prepareBuildList: function() {

        this.buildList = Object.keys(this.collected);
        this.excludeList = Object.keys(this.allOmits);

        for (path in this.collectedTemplates) {
            this.addTemplate(this.collectedTemplates[path]);
        }

        this.trigger("build-list-ready", this);
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
                //template.setBundle(self);
            }
        }
    },

    preparePrebuilt: function() {
        this.trigger("prepare-prebuilt");
    }
});
