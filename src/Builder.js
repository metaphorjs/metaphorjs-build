require("metaphorjs-promise/src/lib/Promise.js");
require("./plugin/builder/Cleanup.js")
require("./Webpack.js");

const   fs              = require("fs"),
        path            = require("path"),
        Base            = require("./Base.js"),
        Build           = require("./Build.js"),
        File            = require("./File.js"),
        Template        = require("./Template.js"),
        Config          = require("./Config.js"),
        extend          = require("metaphorjs-shared/src/func/extend.js"),
        nextUid         = require("metaphorjs-shared/src/func/nextUid.js"),
        MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js"),
        obj2code        = require("./func/obj2code.js");

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

        const time = (new Date).getTime();
        this.entryFilename = `/tmp/wp-${time}.js`;
        this.prebuiltFilename = `/tmp/wp-prebuilt-${time}.js`;

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

    prepare: function() {
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
    },

    build: function() {

        this.prepare();

        const cfg = this.config.getBuildConfig(this.buildName);
        
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

    getBuildList: function() {
        return this.currentBuild.buildList;
    },

    getExcludeList: function() {
        return this.currentBuild.excludeList;
    },

    rebuild: function() {
        this.allFiles       = {};
        this.allTemplates   = {};
        this.currentBuild   = new Build(this.buildName, this);
        this.prepare();
        this.createPrebuildFile();
        this.createEntryFile();
    },

    rebuildTemplates: function() {

    },
    

    getTemplateWatcher: function() {
        return {
            apply: (compiler) => {
                compiler.hooks.watchRun.tap("MjsWatchRun",
                    (context) => {
                        if (context.modifiedFiles) {
                            const files = [ ...context.modifiedFiles ];
                            const isTpl = !!files.find(f => f.match(/\.html$/));

                            if (isTpl) {
                                this.rebuild();
                            }
                        }
                    });
            }
        }
    },

    getTarget: function() {
        const cfg = this.config.getBuildConfig(this.buildName);
        let target = cfg.target;
        if (target[0] !== "/" && target[0] !== ".") {
            if (target.indexOf("/") !== -1) {
                target = target.split("/");
                return {
                    filename: target.pop(),
                    path: path.resolve("./" + target.join("/"))
                }
            }
            else {
                return {
                    path: path.resolve("./"),
                    filename: target
                }
            }
        }
    },

    getTemplateList: function() {

    },

    createPrebuildFile: function() {
        const mjsPath = require.resolve("metaphorjs-shared/src/MetaphorJs.js");
        let content = `const MetaphorJs = require("${ mjsPath }");` + "\n";
        content +=     "MetaphorJs.prebuilt = " + 
                            obj2code(MetaphorJs.app.prebuilt.getStorage()) + "\n";
        fs.writeFileSync(this.prebuiltFilename, content);
        return this.prebuiltFilename;
    },


    createEntryFile: function() {

        const files = this.currentBuild.buildList,
              mjsPath = require.resolve("metaphorjs-shared/src/MetaphorJs.js");

        let content = "";
        content += `const MetaphorJs = require("${ mjsPath }");` + "\n";
        content += `require("${ this.prebuiltFilename }");` + "\n";
        files.forEach(f => {
            content += `require("${ f }");` + "\n";
        });

        fs.writeFileSync(this.entryFilename, content);
        
        //this.pbltName = pblt;
        //this.pbltContent = prebuilt;
        //return this.indexContent = content;

        return this.entryFilename;
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


