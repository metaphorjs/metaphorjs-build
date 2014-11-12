
var path = require("path"),
    fs = require("fs"),
    cp = require("child_process"),
    Promise = require("metaphorjs-promise"),
    Git = require("./Git.js"),
    isFile = require("../../../metaphorjs/src/func/fs/isFile.js"),
    parseArgs = require("minimist"),
    passthru = require("../func/passthru.js"),
    eachProject = require("../func/eachProject.js"),
    Builder = require("./Builder.js");


module.exports = function(){



    var increaseVersion = function(version, mod) {
        version = version.split(".");

        if (version.length == 2) {
            version.push("0");
        }
        else {
            version[2] = ""+(parseInt(version[2], 10) + mod);
        }
        return version.join(".");
    };

    var Project = function(location) {

        var self = this;

        self.location   = location;
        self.name       = path.basename(location);
        self.git        = new Git(location);
        self.config     = require(location + "/metaphorjs.json");
        self.hasNpm     = isFile(location + "/package.json") && self.config.npm !== false;
        self.hasBower   = isFile(location + "/bower.json");

        self.npmJson    = self.hasNpm ? require(location + "/package.json") : null;
        self.bowerJson  = self.hasBower ? require(location + "/bower.json") : null;
    };

    Project.prototype = {

        location: null,
        name: null,
        git: null,
        hasNpm: false,
        hasBower: false,
        config: null,

        test: function() {

            var self        = this,
                test        = self.config.test,
                tests       = [],
                promise     = new Promise,

                next        = function() {
                    var test = tests.shift();
                    if (test) {
                        process.chdir(self.location);

                        var runTest = function() {
                            passthru(test.cmd, test.args || []).then(next, next);
                        };

                        runTest();

                    }
                    else {
                        promise.resolve();
                    }
                };

            if (test) {

                console.log("Testing " + path.basename(self.location));

                if (test.cmd) {
                    tests = [test];
                }
                else {
                    tests = test;
                }

                next();
            }
            else {
                promise.resolve();
            }

            return promise;
        },

        /**
         * @param {object} options
         * @returns {Promise}
         */
        publish: function(options) {

            if (options.v === true) {
                options.v = 1;
            }

            var self        = this,
                git         = self.git,
                deferred    = new Promise,
                vMod        = options.v && options.m ? parseInt(options.v, 10) : null,
                versionSet  = false,
                newVersion  = null,
                onErr       = function(err) {

                    if (versionSet && vMod !== null) {
                        self.setVersion(-vMod);
                    }

                    deferred.reject(err);
                };

            // check if there were changes
            git.hasChanges(options.w === true)
                .fail(onErr)
                // build and test
                .then(function(hasChanges){

                    if (hasChanges) {
                        console.log("\n\n");
                        console.log(self.name + " has changes");

                        try {
                            process.chdir(self.location);
                            Builder.buildAll();
                        }
                        catch (thrown) {
                            deferred.reject(thrown);
                        }

                        if (options.test !== false) {
                            return self.test();
                        }
                        else {
                            return true;
                        }
                    }
                    else {
                        return deferred.resolve();
                    }
                })
                // compile all
                .then(function(){
                    if (deferred.isPending()) {

                        if (options.compile !== false) {
                            process.chdir(self.location);
                            return Builder.compileAll(true, true).fail(onErr);
                        }
                        else {
                            return true;
                        }
                    }

                    return true;
                })
                // set new version
                .then(function(){
                    if (deferred.isPending()) {

                        self.syncPackageFiles();

                        if (vMod) {
                            newVersion = self.setVersion(vMod);
                            versionSet = true;
                        }
                    }
                })
                // add changes to git
                .then(function(){
                    if (deferred.isPending()) {
                        console.log("adding changes to git");
                        return git.addAll().fail(onErr);
                    }
                    else {
                        return true;
                    }
                })
                // commit changes
                .then(function(){
                    if (deferred.isPending() && options.m) {
                        console.log("committing changes with message " + options.m);
                        return git.commit(options.m).fail(onErr);
                    }
                    else {
                        return deferred.resolve();
                    }
                })
                // set git tag
                .then(function(){
                    if (deferred.isPending() && vMod) {
                        console.log("setting git tag " + newVersion);
                        return git.setTag(newVersion).fail(onErr);
                    }
                    else {
                        return true;
                    }
                })
                // push to github
                .then(function(){
                    if (deferred.isPending() && options.p) {
                        console.log("publishing to git");
                        var funcs = [],
                            push  = self.config.push;

                        if (push) {
                            push.forEach(function(remote){
                                var branch;
                                if (typeof remote == "string") {
                                    branch = "--all";
                                }
                                else {
                                    branch = remote[1];
                                    remote = remote[0];
                                }
                                funcs.push(function(remote, branch){
                                    return function() {
                                        console.log("pushing " + branch + " to " + remote);
                                        return git.push(remote, branch);
                                    }
                                }(remote, branch));

                                funcs.push(function(remote){
                                    return function() {
                                        console.log("sending tags to " + remote);
                                        return git.push(remote, "--tags");
                                    }
                                }(remote));
                            });

                            return Promise.waterfall(funcs);
                        }
                    }

                    return deferred.resolve();
                })
                // publish npm
                .then(function(){
                    if (deferred.isPending() && vMod && self.hasNpm) {
                        console.log("publishing npm");
                        return self.publishNpm().fail(onErr);
                    }
                    else {
                        return deferred.resolve();
                    }
                })
                .then(function(){
                    deferred.resolve();
                });


            return deferred;
        },

        syncPackageFiles: function() {

            var self    = this,
                pJson   = self.location + "/package.json",
                bJson   = self.location + "/bower.json";

            if (self.hasNpm) {
                self.npmJson.description = self.config.description;
                fs.writeFileSync(pJson, JSON.stringify(self.npmJson, null, "    "));
            }
            if (self.hasBower) {
                self.bowerJson.description = self.config.description;
                fs.writeFileSync(bJson, JSON.stringify(self.bowerJson, null, "    "));
            }

        },

        setVersion: function(mod) {

            var self    = this,
                mJson   = self.location + "/metaphorjs.json",
                pJson   = self.location + "/package.json",
                bJson   = self.location + "/bower.json",
                mjs     = require(mJson),
                version = mjs.version;

            console.log(version, '->', (version = increaseVersion(version, mod)));

            self.config.version = version;
            fs.writeFileSync(mJson, JSON.stringify(self.config, null, "    "));

            if (self.hasNpm) {
                self.npmJson.version = version;
                fs.writeFileSync(pJson, JSON.stringify(self.npmJson, null, "    "));
            }
            if (self.hasBower) {
                self.bowerJson.version = version;
                fs.writeFileSync(bJson, JSON.stringify(self.bowerJson, null, "    "));
            }

            return version;
        },

        publishNpm: function() {
            process.chdir(this.location);
            return passthru("npm", ["publish"]);
        }

    };


    Project.testAll = function() {

        var projects = [],
            location,
            project;

        eachProject(function(project, projectFile){
            projects.push(path.dirname(projectFile));
        });

        var next = function() {

            location = projects.shift();

            if (location) {
                project = new Project(location);

                project.test().then(next, function(){
                    process.exit();
                });
            }
            else {
                process.exit(0);
            }
        };

        next();
    };

    Project.publishAll = function() {

        var options     = parseArgs(process.argv.slice(2), {boolean: true}),
            projects    = [],
            location,
            project;

        eachProject(function(project, projectFile){
            projects.push(path.dirname(projectFile));
        });

        var next = function() {

            location = projects.shift();
            //projects = []; // tmp; do only one

            if (location) {
                project = new Project(location);

                project.publish(options).then(next, function(reason){

                    console.log("Project " + location + " failed with reason: ", reason);
                    process.exit();
                });
            }
            else {
                process.exit(0);
            }
        };


        next();
    };

    return Project;

}();