
var fs              = require("fs"),
    path            = require("path"),
    cp              = require("child_process"),

    Base            = require("./Base.js"),
    Bundle          = require("./Bundle.js"),
    Config          = require("./Config.js"),
    nextUid         = require("metaphorjs/src/func/nextUid.js"),

    isFile          = require("metaphorjs/src/func/fs/isFile.js");



/**
* @class Builder
*/
module.exports = Base.$extend({

    /**
     * @constructor
     */
    $init: function(buildName, projectFile) {

        if (!isFile(projectFile) && 
            !(projectFile instanceof Config)) {
            throw projectFile + " not found";
        }

        var self            = this;

        self.$$observable.createEvent("pipe", {
            returnResult: "pipe",
            expectPromises: true,
            resolvePromises: true
        });

        self.config         = projectFile instanceof Config ? projectFile : Config.get(projectFile);
        self.projectFile    = projectFile instanceof Config ? projectFile.path : projectFile;
        self.bundle         = Bundle.get(buildName, "build");
        self.buildName      = buildName;

        self.bundle.top     = true;
        

        self.trigger("init", self);
    },

    getTargetPath: function() {
        var self = this, target;
        target  = self.config.build[self.buildName].target;
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
            cfg = self.config.build[self.buildName],
            pipe = ((cfg.pipe || "build|write")+"").split("|");

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

        return Promise.resolve(code);
    },

    _compile: function(code) {
        var self    = this,
            cwd     = process.cwd(),
            bdir    = self.getBuilderDir(),
            promise;

        console.log("Compiling " + self.buildName);

        promise = new Promise(function(resolve, reject){
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
                console.log(code ? code.length : "bad file")
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

    _babel: function(code) {

        var self    = this,
            cwd     = process.cwd(),
            bdir    = self.getBuilderDir(),
            promise;

        console.log("Running babel " + self.buildName);

        promise = new Promise(function(resolve, reject){
            process.chdir(bdir);
            
            var target = self.getRandTmpFile(),
                out = fs.createWriteStream(target),
                args = ["babel"],
                bin = "/usr/local/bin/npx",
                source = self.getRandTmpFile(),
                proc;

            fs.writeFileSync(source, code);
            args.push(source);

            proc = cp.spawn(bin, args);
            proc.stderr.pipe(process.stderr);
            proc.stdout.pipe(out);
            proc.on("exit", function(code) {
                process.chdir(cwd);
                var code = fs.readFileSync(target).toString();
                console.log(code ? code.length : "bad file")
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

        return Promise.resolve(code);
    }


});


