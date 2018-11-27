require("metaphorjs-promise/src/lib/Promise.js");

var fs              = require("fs"),
    path            = require("path"),
    cp              = require("child_process"),
    Base            = require("./Base.js"),
    Bundle          = require("./Bundle.js"),
    File            = require("./File.js"),
    Template        = require("./Template.js"),
    Config          = require("./Config.js"),
    extend          = require("metaphorjs-shared/src/func/extend.js"),
    nextUid         = require("metaphorjs-shared/src/func/nextUid.js"),
    MetaphorJs      = require("metaphorjs-shared/src/MetaphorJs.js");

/**
* @class Builder
*/
module.exports = Base.$extend({

    /**
     * @constructor
     */
    $init: function(buildName, projectFile) {

        if (!fs.existsSync(projectFile) && 
            !(projectFile instanceof Config)) {
            throw projectFile + " not found";
        }

        var self            = this;

        self.$$observable.createEvent("pipe", {
            returnResult: "pipe",
            expectPromises: true,
            resolvePromises: true
        });

        self.allFiles       = {};
        self.allTemplates   = {};
        self.allBundles     = {};

        self.config         = projectFile instanceof Config ? projectFile : Config.get(projectFile);
        self.projectFile    = projectFile instanceof Config ? projectFile.path : projectFile;
        self.bundle         = self.getBundle(buildName, "build");
        self.buildName      = buildName;

        self.bundle.top     = true;

        self.trigger("init", self);
    },

    getFile: function(filePath, options) {
        var all = this.allFiles;

        if (!all[filePath]) {
            all[filePath] = new File(filePath, options, this);
        }
        else {
            if (options) {
                var f = all[filePath];
                for (var key in options) {
                    if (f.getOption(key) !== null) {
                        f.setOption(key, options[key]);
                    }
                }
            }
        }
    
        return all[filePath];
    },

    getTemplate: function(filePath, options) {
        var all = this.allTemplates,
            opt;

        if (!all[filePath]) {
            opt = extend(options, Template.getOptions(filePath), true);
            all[filePath] = new Template(filePath, opt, this);
        }
        else {
            opt = extend(options, Template.getOptions(filePath), true);
            if (opt) {
                var f = all[filePath];
                for (var key in opt) {
                    if (f.getOption(key) !== null) {
                        f.setOption(key, opt[key]);
                    }
                }
            }
        }
    
        return all[filePath];
    },

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

    getTargetPath: function() {
        var self = this, target;
        target  = self.config.getBuildConfig(self.buildName).target;
        target  = path.resolve(self.config.base, target);
        return target;
    },

    getBuilderDir: function() {
        return path.normalize(__dirname) + "/..";
    },

    getRandTmpFile: function() {
        var name = "/tmp/build_" + nextUid() + ".js";
        if (fs.existsSync(name)) {
            return this.getRandTmpFile();
        }
        return name;
    },

    build: function() {
        var self = this,
            cfg = self.config.getBuildConfig(self.buildName),
            pipe = cfg.pipe || [];
        
        if (typeof pipe === "string") {
            pipe = pipe.split("|");
        }
        if (pipe.length === 0) {
            pipe = ["build", "write"];
        }

        pipe.forEach(function(processor){
            if (self["_" + processor]) {
                self.on("pipe", self["_" + processor], self);
            }
        });

        self.trigger("pipe");
        self.$$observable.removeAllListeners("pipe");
    },

    /**
     * Create build
     * @method
     */
    _build:          function() {

        var self    = this,
            code;

        console.log("Building " + self.buildName);

        self.trigger("before-build", self);

        self.bundle.collect(self.config, self.buildName);
        self.trigger("after-collect", self);

        self.bundle.prepareBuildList();
        self.trigger("after-build-list", self);

        code        = self.bundle.getContent();
        var res     = self.trigger("build-ready", self, code);

        if (typeof res === "string") {
            code    = res;
        }

        return MetaphorJs.lib.Promise.resolve(code);
    },

    _compile: function(code) {
        var self    = this,
            cwd     = process.cwd(),
            bdir    = self.getBuilderDir(),
            promise;

        console.log("Compiling " + self.buildName);

        promise = new MetaphorJs.lib.Promise(function(resolve, reject){
            process.chdir(bdir);
            
            var target = self.getRandTmpFile(),
                out = fs.createWriteStream(target),
                args = ["ccjs"],
                bin = "/usr/local/bin/npx",
                source = self.getRandTmpFile(),
                proc;

            fs.writeFileSync(source, code);
            args.push(source);
            args.push('--language_in=ECMASCRIPT5_STRICT');

            proc = cp.spawn(bin, args);

            proc.stderr.pipe(process.stderr);
            proc.stdout.pipe(out);
            proc.on("exit", function() {
                process.chdir(cwd);
                var code = fs.readFileSync(target).toString();
                //fs.unlinkSync(source);
                fs.unlinkSync(target);
                resolve(code);
            });
            proc.on("error", function(error) {
                console.log(error);
                reject(error);
            });
        });

        return promise;
    },

    _babel: function(code) {

        var self    = this,
            cwd     = process.cwd(),
            bdir    = self.getBuilderDir(),
            chdir   = false,
            bcfg,
            promise;

        if (fs.existsSync(cwd + "/.babelrc"))  {
            bcfg = cwd + "/.babelrc";
        } 
        else if (fs.existsSync(bdir + "/.babelrc")) {
            bcfg = bdir + "/.babelrc";
            chdir = true;
        }

        console.log("Running babel " + self.buildName);

        promise = new MetaphorJs.lib.Promise(function(resolve, reject){

            chdir && process.chdir(bdir);

            var target = self.getRandTmpFile(),
                out = fs.createWriteStream(target),
                args = ["babel"],
                bin = "/usr/local/bin/npx",
                source = self.getRandTmpFile(),
                proc;

            fs.writeFileSync(source, code);
            args.push(source);

            if (bcfg) {
                args.push("--config-file");
                args.push(bcfg);
            }

            proc = cp.spawn(bin, args);
            proc.stderr.pipe(process.stderr);
            proc.stdout.pipe(out);
            proc.on("exit", function() {
                chdir && process.chdir(cwd);
                var code = fs.readFileSync(target).toString();
                fs.unlinkSync(source);
                fs.unlinkSync(target);
                resolve(code);
            });
            proc.on("error", function(error) {
                console.log(error);
                reject(error);
            });
        });

        return promise;
    },


    _write: function(code) {
        var self    = this,
            target  = self.getTargetPath();

        console.log("Writing " + self.buildName + " to " + target);

        fs.writeFileSync(target, code);
        self.trigger("build-written", self, target, code);

        return MetaphorJs.lib.Promise.resolve(code);
    }


});


