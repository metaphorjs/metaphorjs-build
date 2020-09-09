require("metaphorjs-promise/src/lib/Promise.js");
require("./plugin/builder/Cleanup.js")

const   fs              = require("fs"),
        path            = require("path"),
        Base            = require("./Base.js"),
        Build           = require("./Build.js"),
        Webpack         = require("./Webpack.js"),
        File            = require("./File.js"),
        Template        = require("./Template.js"),
        Config          = require("./Config.js"),
        extend          = require("metaphorjs-shared/src/func/extend.js"),
        nextUid         = require("metaphorjs-shared/src/func/nextUid.js"),
        MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js");

const { exit } = require("process");

/**
* @class Builder
*/
module.exports = Base.$extend({

    $constructor: function() {
        this.$plugins.push(MetaphorJs.plugin.builder.Cleanup);
        this.$super(arguments);
    },

    /**
     * @constructor
     */
    $init: function(buildName, projectFile, packageJson) {

        if (!(projectFile instanceof Config) && 
            !fs.existsSync(projectFile)) {
            throw projectFile + " not found";
        }

        this.$$observable.createEvent("pipe", {
            returnResult: "pipe",
            expectPromises: true,
            resolvePromises: true
        });

        this.allFiles       = {};
        this.allTemplates   = {};
        this.allBundles     = {};

        this.package        = packageJson;
        this.config         = projectFile instanceof Config ? projectFile : Config.get(projectFile);
        this.projectFile    = projectFile instanceof Config ? projectFile.path : projectFile;
        //this.bundle         = this.getBundle(buildName, "build");
        this.currentBuild   = new Build(buildName, this);
        this.buildName      = buildName;

        //this.bundle.top     = true;

        this.trigger("init", this);
    },

    getFile: function(filePath, options) {
        let all = this.allFiles;

        if (!all[filePath]) {
            all[filePath] = new File(filePath, options, this);
        }
        else {
            if (options) {
                let f = all[filePath];
                for (let key in options) {
                    if (f.getOption(key) !== null) {
                        f.setOption(key, options[key]);
                    }
                }
            }
        }
    
        return all[filePath];
    },

    getTemplate: function(filePath, options) {
        let all = this.allTemplates,
            opt;

        if (!all[filePath]) {
            opt = extend(options, Template.getOptions(filePath), true);
            all[filePath] = new Template(filePath, opt, this);
        }
        else {
            opt = extend(options, Template.getOptions(filePath), true);
            if (opt) {
                let f = all[filePath];
                for (let key in opt) {
                    if (f.getOption(key) !== null) {
                        f.setOption(key, opt[key]);
                    }
                }
            }
        }

        return all[filePath];
    },
/*
    getBundle: function(name, type) {
        var all = this.allBundles;
        var fullName = ""+type +"/" + name;
        if (!all[fullName]) {
            all[fullName] = new Bundle(name, type, this);
        }

        return all[fullName];
    },

    bundleExists: function(name, type) {
        return !!this.allBundles[""+type +"/" + name];
    },
*/
    getTargetPath: function() {
        let target;
        target  = this.config.getBuildConfig(this.buildName).target;
        return path.resolve(this.config.base, target);
    },

    getBuilderDir: function() {
        return path.normalize(__dirname) + "/..";
    },

    getRandTmpFile: function() {
        let name = "/tmp/build_" + nextUid() + ".js";
        if (fs.existsSync(name)) {
            return this.getRandTmpFile();
        }
        return name;
    },

    build: function() {
        const cfg = this.config.getBuildConfig(this.buildName);
       
        if (!cfg) {
            console.log("Build config not found");
            exit();
        }

        console.log("Building " + this.buildName);

        this.trigger("before-build", this);

        this.currentBuild.collect(this.config, this.buildName);
        this.trigger("after-collect", this);

        this.currentBuild.prepareBuildList();
        this.trigger("after-build-list", this);

        this.currentBuild.preparePrebuilt();

        const webpack = new MetaphorJs.build.Webpack({
            files: this.currentBuild.buildList,
            exclude: this.currentBuild.excludeList,
            config: cfg,
            package: this.package

        });

        webpack.createIndex();
        webpack.createConfig();
        webpack.run();

        //this.trigger("pipe");
        //this.$$observable.removeAllListeners("pipe");
    },

    /**
     * Create build
     * @method
     */
    _build:          function() {

        var code;

        console.log("Building " + this.buildName);

        this.trigger("before-build", this);

        //this.bundle.collect(this.config, this.buildName);
        this.currentBuild.collect(this.config, this.buildName);
        this.trigger("after-collect", this);

        //this.bundle.prepareBuildList();
        this.currentBuild.prepareBuildList();
        this.trigger("after-build-list", this);

        

        /*code        = this.bundle.getContent();
        code        = this.trigger("cleanup", code, this);
        var res     = this.trigger("build-ready", this, code);

        if (typeof res === "string") {
            code    = res;
        }

        return MetaphorJs.lib.Promise.resolve(code);*/
    }

});


