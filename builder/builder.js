
var fs              = require("fs"),
    child           = require("child_process"),
    path            = require("path"),
    File            = require("./File.js"),
    getOrCreate     = File.getOrCreate,
    isFile          = require("../lib/isFile.js"),
    isDir           = require("../lib/isDir.js"),
    eachProject     = require("../lib/eachProject.js"),
    Promise         = require("../../metaphorjs-promise/src/metaphorjs.promise.js"),
    Build           = require("./Build.js"),
    JsonFile        = require("../lib/JsonFile.js");



var Builder         = function(action, projectFile) {

    if (!isFile(projectFile)) {
        throw projectFile + " not found";
    }

    var self            = this;

    self.jsonFile       = JsonFile.get(projectFile);
    self.projectFile    = projectFile;
    self.bld            = new Build(self.jsonFile, action);

};

Builder.prototype   = {

    /**
     * @type JsonFile
     */
    jsonFile:       null,

    /**
     * @type Build
     */
    bld:            null,
    projectFile:    null,

    build:          function() {

        var self    = this,
            bld     = self.bld;

        if (bld.files.length && bld.target) {
            self.concat();
        }
    },

    concat:        function() {

        var self        = this,
            bld         = self.bld,
            target      = path.normalize(self.jsonFile.base + bld.target),
            content     = "";

        console.log("Building " + path.basename(target));

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        if (bld.require) {
            var rs = bld.require,
                module;

            for (module in rs) {
                content += "var " + rs[module] + " = require('"+module+"');\n"
            }
        }

        if (bld.prepend) {
            bld.prepend.forEach(function(file) {
                var filePath = path.normalize(self.jsonFile.base + file);
                content += fs.readFileSync(filePath).toString();
                content += "\n";
            });
        }

        bld.buildList.forEach(function(filePath){

            if (!File.exists(filePath)) {
                throw filePath + " was not resolved";
            }

            content += File.get(filePath).getContent(bld.fileOptions[filePath]);
            content += "\n";
        });

        if (bld.expose) {

            var createdNs = {"MetaphorJs": true};

            if (bld.expose == "all") {
                var names = self.collectNames();
                names.forEach(function(name){
                    if (name != "MetaphorJs") {
                        content += "MetaphorJs['" + name + "'] = " + name + ";\n";
                    }
                });
            }
            else {

                bld.expose.forEach(function (varName) {

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

        if (bld.append) {
            bld.append.forEach(function(file) {
                var filePath = path.normalize(self.jsonFile.base + file);
                content += fs.readFileSync(filePath).toString();
                content += "\n";
            });
        }

        if (bld.global) {
            content += "typeof global != \"undefined\" ? " +
                       "(global['MetaphorJs'] = MetaphorJs) : (window['MetaphorJs'] = MetaphorJs);\n";
        }

        if (bld.exports) {
            content += "module.exports = " + bld.exports + ";\n";
        }

        if (bld.define) {
            var defName = bld.define.name,
                defDeps = bld.define.deps,
                defRet  = bld.define.return,
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
            content += "\n";
        }

        content = File.removeDupReqs(content);

        if (bld.wrap) {
            var wrapStart   = bld.wrapStart || "(function(){\n\"use strict\";\n";
            var wrapEnd     = bld.wrapEnd || "\n}());";
            content         = wrapStart + content + wrapEnd;
        }

        fs.writeFileSync(target, content);
    },



    compile:        function(onFinish) {

        var self        = this,
            bld         = self.bld,
            source      = path.normalize(self.jsonFile.base + bld.target),
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

        if (bld.compileAdvanced) {
            args.push('--compilation_level=ADVANCED');
        }

        if (bld.compileSourceMap) {
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
            bl      = self.bld.buildList,
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