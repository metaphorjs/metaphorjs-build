
var fs              = require("fs"),
    child           = require("child_process"),
    path            = require("path"),

    File            = require("./File.js"),
    eachProject     = require("../func/eachProject.js"),
    Build           = require("./Build.js"),
    JsonFile        = require("./JsonFile.js"),

    isFile          = require("metaphorjs/src/func/fs/isFile.js"),
    isArray         = require("metaphorjs/src/func/isArray.js"),

    Promise         = require("metaphorjs-promise");



var Builder         = function(action, projectFile) {

    if (!isFile(projectFile) && !(projectFile instanceof JsonFile)) {
        throw projectFile + " not found";
    }

    var self            = this;

    self.jsonFile       = projectFile instanceof JsonFile ? projectFile : JsonFile.get(projectFile);
    self.projectFile    = projectFile instanceof JsonFile ? projectFile.path : projectFile;
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
            target      = bld.specificTarget || path.normalize(self.jsonFile.base + bld.target),
            content     = "",
            file,
            fileOpt;

        console.log("Building " + path.basename(target));

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        if (bld.require) {
            var rs = bld.require,
                m;

            for (m in rs) {
                var req = rs[m];
                if (typeof req == "string") {
                    content += "var " + req + " = " + "require" + "('" + m + "');\n"
                }
                else {
                    var reqStr = "var " + req.as + " = " + "require" + "('"+ m +"')";
                    var argStr = req.args ? req.args.join(", ") : "";
                    if (req.call) {
                        if (req.call === true) {
                            reqStr += "(" + argStr + ")";
                        }
                        else {
                            reqStr += "." + req.call + "(" + argStr + ")";
                        }
                    }
                    else if (argStr) {
                        reqStr += "("+ argStr +")";
                    }
                    content += reqStr + ";\n";
                }
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

            file = File.get(filePath);
            fileOpt = bld.fileOptions[filePath];

            content += file.getContent(fileOpt);
            content += "\n";

            if (fileOpt && fileOpt.temporary) {
                fs.unlinkSync(file.path);
            }
        });

        if (bld.expose) {

            var createdNs = {};

            var exposeIn = bld.exposeIn || "MetaphorJs";

            createdNs[exposeIn] = true;

            if (bld.expose == "all") {
                var names = self.collectNames();
                names.forEach(function(name){
                    if (bld.exposeSkip && bls.exposeSkip.indexOf(name) != -1) {
                        return;
                    }
                    if (name != exposeIn) {
                        content += exposeIn + "['" + name + "'] = " + name + ";\n";
                    }
                });
            }
            else {

                var ns, as;

                bld.expose.forEach(function (varName) {

                    if (typeof varName == "string") {
                        content += exposeIn + "['" + varName + "'] = " + varName + ";\n";
                    }
                    else {

                        if (isArray(varName)) {
                            ns = varName[0];
                            as = varName[2] || varName[1];
                            varName = varName[1];
                        }
                        else {
                            ns = varName.ns || exposeIn;
                            as = varName.as || varName.name;
                            varName = varName.name;
                        }

                        if (!createdNs[ns]) {
                            content += ns + " || (" + ns + " = {});\n";
                        }
                        content += ns + "['" + as + "'] = " + varName + ";\n";
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
            if (bld.wrap) {
                content += "return " + bld.exports + ";\n";
            }
            else {
                content += "module"+ ".exports = " + bld.exports + ";\n";
            }
        }

        if (bld.returns) {
            content += "return " + bld.returns + ";\n";
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
            var wrap        = bld.wrap;
            if (typeof wrap != "object") {
                wrap = {};
            }
            var wrapArgs    = "";
            if (wrap.args) {
                wrapArgs =  wrap.args.join(", ");
            }

            var wrapName    = wrap.name || "";

            var wrapStart   = wrap.start ||
                                wrap.deferred ?
                                    "function "+wrapName+"("+wrapArgs+") {\n\"use strict\";\n" :
                                    "(function("+wrapArgs+"){\n\"use strict\";\n";

            var wrapEnd     = wrap.end ||
                                wrap.deferred ?
                                    "\n};" :
                                    "\n}("+wrapArgs+"));";

            content         = wrapStart + content + wrapEnd;

            if (bld.exports || wrap.exported) {
                content = "module" + ".exports = " + content;
            }
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
            var file = File.getOrCreate(path),
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

Builder.buildAll = function(auto) {

    var b;

    eachBuild(function(build, projectFile, buildName){
        if (!auto || build.auto) {
            b = new Builder(buildName, projectFile);
            b.build();
        }
    });

};


Builder.compile = function(action, projectFile) {

    if (!projectFile) {
        projectFile = process.cwd() + "/metaphorjs.json";
    }
    if (!action) {
        throw "Must specify build. Or use mjs-compile --all";
    }

    var deferred    = new Promise;

    var builder     = new Builder(action, projectFile);
    builder.build();
    builder.compile(function(){
        deferred.resolve();
    });

    return deferred;
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