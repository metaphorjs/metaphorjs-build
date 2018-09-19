
var fs              = require("fs"),
    child           = require("child_process"),
    path            = require("path"),

    Base            = require("./Base.js"),
    File            = require("./File.js"),
    Bundle          = require("./Bundle.js"),
    JsonFile        = require("./JsonFile.js"),

    isFile          = require("metaphorjs/src/func/fs/isFile.js"),
    isArray         = require("metaphorjs/src/func/isArray.js"),
    trim            = require("metaphorjs/src/func/trim.js"),

    Scope           = require("metaphorjs/src/lib/Scope.js"),

    Promise         = require("metaphorjs-promise/src/lib/Promise.js");



    

/**
 * @class Builder
 */

var Builder         = function(buildName, projectFile) {

    if (!isFile(projectFile) && 
        !(projectFile instanceof JsonFile)) {
        throw projectFile + " not found";
    }

    var self            = this;

    self.jsonFile       = projectFile instanceof JsonFile ? projectFile : JsonFile.get(projectFile);
    self.projectFile    = projectFile instanceof JsonFile ? projectFile.path : projectFile;
    self.bundle         = Bundle.get(self.jsonFile, buildName, "build");
    self.buildName      = buildName;
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

    templates:      null,
    gettersCode:    null,
    gettersCodes:   null,

    /**
     * Create build
     * @method
     */
    build:          function() {

        var self    = this,
            target,
            content;

        self.bundle.collect();
        self.bundle.prepareBuildList();

        target      = self.jsonFile.build[self.buildName].target;
        target      = path.normalize(self.jsonFile.base + "/" + target);
        content     = self.bundle.getContent();

        fs.writeFileSync(target, content);
    },

    /*prepareTemplates: function() {

        var self = this,
            scope = new Scope,
            boundary = '##--##',
            saveBoundary = '--##--',
            filePath,
            tplCfg,
            fns = [],
            codes = [],
            tpls = {};


        for (filePath in self.bld.templates) {

            tplCfg = self.bld.templates[filePath];

            var tpl = trim(fs.readFileSync(filePath, {encoding: "utf-8"})),
                tplUrl;

            if (!tpl) {
                continue;
            }

            tpl = minify(tpl, {
                collapseWhitespace: true,
                collapseInlineTagWhitespace: true,
                removeComments: false
            });

            tplUrl = filePath;

            if (tplCfg.root) {
                tplUrl = tplUrl.replace(tplCfg.root, "");
            }
            if (tplCfg.prefix) {
                tplUrl = tplCfg.prefix + tplUrl;
            }

            tpls[tplUrl] = tpl;
        }

        self.templates = tpls;
        self.gettersCode = "[" + fns.join(", ") + "]";
        self.gettersCodes = codes;
    },*/

    /*concat:        function() {

        var self        = this,
            bld         = self.bld,
            target      = bld.specificTarget || path.normalize(self.jsonFile.base + bld.target),
            content     = "",
            exposeIn,
            exposedNames= [],
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
                if (typeof req === "string") {
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

        content += "var __MetaphorJsPrebuilt = {};\n";

        if (self.templates) {
            content += "__MetaphorJsPrebuilt['__tpls'] = " + JSON.stringify(self.templates) + ";\n";
            content += "__MetaphorJsPrebuilt['__tpl_getters'] = " + self.gettersCode + ";\n";
            content += "__MetaphorJsPrebuilt['__tpl_getter_codes'] = " + JSON.stringify(self.gettersCodes) + ";\n";
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

            var createdNs = {},
                es6export = bld.es6export || false,
                exportContent = "";

            exposeIn = bld.exposeIn || "MetaphorJsExports";
            exportContent += "var " + exposeIn + " = {};\n";

            if (bld.expose === "all") {
                var names = self.collectNames();
                names.forEach(function(name){
                    if (bld.exposeSkip && bls.exposeSkip.indexOf(name) !== -1) {
                        return;
                    }
                    if (name !== exposeIn) {
                        exposedNames.push([name, name]);
                        exportContent += exposeIn + "['" + name + "'] = " + name + ";\n";
                    }
                });
            }
            else {

                var ns, as;

                bld.expose.forEach(function (varName) {

                    if (typeof varName === "string") {
                        exposedNames.push([varName, varName]);
                        exportContent += exposeIn + "['" + varName + "'] = " + varName + ";\n";
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
                            exportContent += ns + " || (" + ns + " = {});\n";
                        }

                        exposedNames.push([varName, as]);
                        exportContent += ns + "['" + as + "'] = " + varName + ";\n";
                    }
                });
            }

            content += exportContent;
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
                       "(global['MetaphorJs'] = "+ exposeIn +") : (window['MetaphorJs'] = "+ exposeIn +");\n";
        }

        if (bld.exports) {
            if (bld.exports === true) {
                bld.exports = exposeIn;
            }
            if (bld.wrap) {
                content += "return " + bld.exports + ";\n";
            }
            else {
                content += "module"+ ".exports = " + bld.exports + ";\n";
            }
        }

        if (bld.returns) {
            if (bld.es6export) {
                content += "return " + exposeIn + ";\n";
            }
            else {
                content += "return " + bld.returns + ";\n";
            }
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
            if (typeof wrap !== "object") {
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
            if (bld.es6export) {
                content = "var " + exposeIn + " = " + content;
            }

            if (bld.shebang) {
                content = bld.shebang + "\n" + content;
            }
        }

        if (bld.es6export) {

            exportContent = "";
            exposeIn = bld.exposeIn || "MetaphorJsExports";
            var es6exportList = [];

            exposedNames.forEach(function (item) {
                var as = item[1]; // key in exposedIn (this is all we care)
                es6exportList.push(as);
                content += "\nvar " + as + " = " + exposeIn + '.' + as + ';';
            });

            if (es6exportList.length > 0) {
                content += "\n\nexport { " + es6exportList.join(", ") + " };\n";
            }
        }

        fs.writeFileSync(target, content);

        if (bld.chmod) {
            fs.chmodSync(target, bld.chmod);
        }
    },



    compile:        function(onFinish) {

        var self        = this,
            bld         = self.bld,
            promise     = new Promise,
            source      = path.normalize(self.jsonFile.base + bld.target),
            target      = bld.compileTarget ?
                            path.normalize(self.jsonFile.base + bld.compileTarget) :
                            source.replace(/\.js$/, ".min.js"),
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

        //if (bld.Xmx) {
            //args.push("--Xmx=" + bld.Xmx);
        //}

        var ccjs    = require.resolve("closurecompiler").replace("ClosureCompiler.js", "bin/ccjs");

        proc    = child.spawn(ccjs, args);

        proc.stderr.pipe(process.stderr);
        proc.stdout.pipe(out);
        proc.on("exit", function(code) {
            promise.resolve();
        });
        proc.on("error", function(error) {
            console.log(error);
        });

        return promise;
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

    }*/
};



