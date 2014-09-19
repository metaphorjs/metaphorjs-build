
var fs              = require("fs"),
    child           = require("child_process"),
    path            = require("path"),
    File            = require("./File.js"),
    getOrCreate     = File.getOrCreate,
    isFile          = require("../lib/isFile.js"),
    isDir           = require("../lib/isDir.js"),
    flattenFileList = require("./flattenFileList.js"),
    eachProject     = require("../lib/eachProject.js"),
    Promise         = require("../../metaphorjs-promise/src/metaphorjs.promise.js");



var Builder         = function(action, projectFile) {

    if (!isFile(projectFile)) {
        throw projectFile + " not found";
    }

    var self            = this;

    self.buildList      = [];
    self.included       = {};
    self.files          = [];
    self.fileOptions    = {};
    self.omit           = [];
    self.projectFile   = projectFile;
    self.allActions     = require(projectFile).build;
    self.action         = action;

    var base        = self.base = path.dirname(projectFile) + "/",
        project    = self.project = self.allActions[action];

    if (project.files) {

        var result = flattenFileList(base, project.files, projectFile);

        self.files  = self.files.concat(result.list);

        for (var i in result.options) {
            self.fileOptions[i] = result.options[i];
        }
    }

    if (project.omit) {
        project.omit.forEach(function(omitPath){
            self.omit.push(path.normalize(base + omitPath));
        });
    }

    if (project.appendFilesFrom) {
        self.importprojects(project.appendFilesFrom, "append");
    }
    if (project.prependFilesFrom) {
        self.importprojects(project.prependFilesFrom, "prepend");
    }


    self.omit.forEach(function(omitPath){
        var inx;
        if ((inx = self.files.indexOf(omitPath)) != -1) {
            self.files.splice(inx, 1);
        }
    });

};

Builder.prototype   = {

    projectFile:   null,
    allActions:     null,
    action:         null,
    project:       null,
    buildList:      null,
    included:       null,
    files:          null,
    base:           null,
    fileOptions:    null,
    omit:           null,

    build:          function() {

        var self    = this;

        if (self.files.length) {
            self.resolveFiles();
            self.prepareBuildList();

            if (self.project.target) {
                self.concat();
            }
        }
    },

    resolveFiles:   function() {
        var self = this,
            opt,
            file;

        self.files.forEach(function(filePath){
            file = getOrCreate(filePath);

            if ((opt = self.fileOptions[filePath]) && opt.as) {
                file.addAs(opt.as);
            }
        });
    },

    prepareBuildList: function() {

        var self        = this,
            buildList   = [],
            included    = {},
            stack       = [],
            omit        = self.omit;

        var processFile = function(file) {

            stack.push(file.path);

            if (stack.length > 50) {
                console.log(stack);
                throw "Recursive requirement";
            }

            file.requires.forEach(function(requiredFile){
                if (omit.indexOf(requiredFile) == -1) {
                    processFile(File.get(requiredFile));
                }
            });

            if (!included[file.path]) {
                included[file.path] = true;
                buildList.push(file.path);
            }

            stack.pop();
        };

        this.files.forEach(function(filePath){
            processFile(File.get(filePath));
        });

        this.buildList = buildList;
    },

    concat:        function() {

        var self        = this,
            project    = self.project,
            target      = path.normalize(self.base + project.target),
            content     = "";

        console.log("Building " + path.basename(target));

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        if (project.require) {
            var rs = project.require,
                module;
            for (module in rs) {
                content += "var " + rs[module] + " = require('"+module+"');\n"
            }
        }

        if (project.prepend) {
            project.prepend.forEach(function(file) {
                var filePath = path.normalize(self.base + file);
                content += fs.readFileSync(filePath).toString();
            });
        }

        self.buildList.forEach(function(filePath){

            if (!File.exists(filePath)) {
                throw filePath + " was not resolved";
            }

            content += File.get(filePath).getContent(self.fileOptions[filePath]);
        });

        if (project.expose) {
            content += "\n";

            var createdNs = {
                "MetaphorJs.lib": true,
                "MetaphorJs.view": true,
                "MetaphorJs.cmp": true
            };

            if (project.expose == "all") {
                var names = self.collectNames();
                names.forEach(function(name){
                    if (name != "MetaphorJs") {
                        content += "MetaphorJs['" + name + "'] = " + name + ";\n";
                    }
                });
            }
            else {

                project.expose.forEach(function (varName) {

                    if (typeof varName == "string") {
                        content += "MetaphorJs['" + varName + "'] = " + varName + ";\n";
                    }
                    else {
                        var ns = varName[0];
                        varName = varName[1];

                        if (!createdNs[ns]) {
                            content += ns + " || (" + ns + " = {});\n";
                        }
                        content += ns + "['" + varName + "'] = " + varName + ";\n";
                    }
                });
            }
        }

        if (project.append) {
            project.append.forEach(function(file) {
                var filePath = path.normalize(self.base + file);
                content += fs.readFileSync(filePath).toString();
            });
        }

        if (project.global) {
            content += "\ntypeof global != \"undefined\" ? " +
                       "(global['MetaphorJs'] = MetaphorJs) : (window['MetaphorJs'] = MetaphorJs);\n";
        }

        if (project.exports) {
            content += "\nmodule.exports = " + project.exports + ";\n";
        }

        if (project.define) {
            var defName = project.define.name,
                defDeps = project.define.deps,
                defRet  = project.define.return,
                start   = 'define("'+defName+'", ',
                end     = "\n});\n",
                deps    = [],
                args    = [],
                dep;

            if (defDeps) {
                for (dep in defDeps) {
                    deps.push("'" + dep + "'");
                    args.push(defDeps[dep]);
                }
                start   += '[' + deps.join(", ") + '], ';
                start   += 'function(' + args.join(", ") + ') {' + "\n";
            }
            else {
                start += "function() {\n";
            }

            if (defRet) {
                end     = "\nreturn " + defRet + ";" + end;
            }

            content = start + content + end;
        }

        if (project.wrap) {
            var wrapStart   = project.wrapStart || "(function(){\n\"use strict\";\n";
            var wrapEnd     = project.wrapEnd || "\n}());";
            content         = wrapStart + content + wrapEnd;
        }

        fs.writeFileSync(target, content);
    },


    getFiles:       function() {
        return this.files;
    },

    importprojects: function(list, mode) {

        var self    = this;

        if (typeof list == "string") {
            if (self.allActions[list]) {
                self.importFilesFrom(self.projectFile, list, mode);
            }
        }
        else {
            list.forEach(function(fromproject){

                var projectFile,
                    action;

                if (typeof fromproject == "string") {
                    if (self.allActions[fromproject]) {
                        self.importFilesFrom(self.projectFile, fromproject, mode);
                        return;
                    }
                    else {
                        projectFile    = fromproject;
                        action          = null;
                    }
                }
                else {
                    projectFile    = path.normalize(self.base + fromproject[0]);
                    action          = fromproject[1];
                }

                if (!projectFile) {
                    console.log(fromproject);
                    throw "No project file";
                }

                self.importFilesFrom(projectFile, action, mode);
            });
        }
    },

    importFilesFrom: function(projectFile, action, mode) {

        var self        = this,
            b           = new Builder(action, projectFile),
            importFiles = b.getFiles(),
            curFiles    = self.files,
            result;

        importFiles.forEach(function(filePath){
            if (b.fileOptions[filePath] && !self.fileOptions[filePath]) {
                self.fileOptions[filePath] = b.fileOptions[filePath];
            }
        });

        if (mode == "append") {

            result      = curFiles.slice();

            importFiles.forEach(function(filePath){
                if (result.indexOf(filePath) == -1) {
                    result.push(filePath);
                }
            });
        }
        else {
            result      = importFiles.slice();

            curFiles.forEach(function(filePath){
                if (result.indexOf(filePath) == -1) {
                    result.push(filePath);
                }
            });
        }

        self.files      = result;
    },

    compile:        function(onFinish) {

        var self        = this,
            project    = self.project,
            source      = path.normalize(self.base + project.target),
            target      = source.replace(/\.js$/, ".min.js"),
            args        = [],
            proc,
            out;

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        console.log("Compiling " + path.basename(target));
        out     = fs.createWriteStream(target);
        args.push(source);

        args.push('--language_in=ECMASCRIPT5_STRICT');

        if (project.compileAdvanced) {
            args.push('--compilation_level=ADVANCED');
        }

        if (project.compileSourceMap) {
            args.push("--create_source_map=" + target + ".map");
        }

        proc    = child.spawn("ccjs", args);

        proc.stderr.pipe(process.stderr);
        proc.stdout.pipe(out);
        proc.on("exit", function(code) {
            if (onFinish) {
                onFinish(code);
            }
            else {
                process.exit(code);
            }
        });
        proc.on("error", function(error) {
            console.log(error);
        });
    },

    collectNames: function() {

        var self    = this,
            bl      = self.buildList,
            names   = [],
            uni     = {};

        bl.forEach(function(path) {
            var file = getOrCreate(path),
                as  = file.as;

            as.forEach(function(name) {
                if (!uni[name]) {
                    uni[name] = true;
                    names.push(name);
                }
            });
        });

        return names;

    }
};



/**
 * @param {function} fn
 */
var eachBuild = function(fn) {

    eachProject(function(project, projectFile){

        var builds = project.build,
            i;

        if (builds) {
            for (i in builds) {
                fn(builds[i], projectFile, i);
            }
        }
    });
};


Builder.build = function(action, projectFile) {

    if (!projectFile) {
        projectFile = process.cwd() + "/metaphorjs.json";
    }

    var actions = [];

    if (!action) {
        var project    = require(projectFile),
            builds      = project.build;

        if (builds) {
            for (var i in builds) {
                if (builds[i].auto) {
                    actions.push(i);
                }
            }
        }
    }
    else {
        actions.push(action);
    }

    actions.forEach(function(action){
        var builder     = new Builder(action, projectFile);
        builder.build();
    });
};

Builder.compile = function(action, projectFile) {

    if (!projectFile) {
        projectFile = process.cwd() + "/metaphorjs.json";
    }
    if (!action) {
        throw "Must specify build. Or use mjs-compile-all";
    }

    var deferred    = new Promise;

    var builder     = new Builder(action, projectFile);
    builder.build();
    builder.compile(function(){
        deferred.resolve();
    });

    return deferred;
};

Builder.buildAll = function(auto) {

    var b;

    eachBuild(function(build, projectFile, buildName){
        if (!auto || build.auto) {
            b = new Builder(buildName, projectFile);
            b.build();
        }
    });

};

Builder.compileAll = function(noExit, noBuild) {

    var b,
        builds      = [],
        deferred    = new Promise,
        item,
        next        = function(code) {

            if (code != 0) {
                deferred.reject(item[1] + " failed compiling with code " + code);
                if (!noExit) {
                    process.exit(code);
                }
                return;
            }

            item = builds.shift();

            if (!item) {
                deferred.resolve();
                if (!noExit) {
                    process.exit(0);
                }
                return;
            }

            b = new Builder(item[0], item[1]);
            if (!noBuild) {
                b.build();
            }
            b.compile(next);
        };

    eachBuild(function(project, projectFile, buildName){
        if (project.compile !== false) {
            builds.push([buildName, projectFile]);
        }
    });

    next(0);

    return deferred;
};



module.exports = Builder;