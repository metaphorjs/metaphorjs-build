

var MetaphorJs = {


};


var fs = require("fs");

var isFile = function(filePath) {
    return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
};




var isDir = function(dirPath) {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
};

var path = require("path");

var getFileList = function(directory, ext) {

    var fileList,
        filePath,
        levels = 0,
        files = [];

    if (directory.substr(directory.length - 1) == "*") {
        levels++;
    }
    if (directory.substr(directory.length - 2) == "**") {
        levels++;
    }

    if (levels) {
        directory = directory.substr(0, directory.length - (levels + 1));
    }
    directory = path.normalize(directory);

    var readDir = function(dir) {
        fileList    = fs.readdirSync(dir);

        fileList.forEach(function(filename) {
            filePath = path.normalize(dir + "/" + filename);

            if (isFile(filePath)) {
                if (!ext) {
                    files.push(filePath);
                }
                else if (typeof ext == "string" && path.extname(filePath).substr(1) == ext) {
                    files.push(filePath);
                }
                else if (path.extname(filePath).substr(1).match(ext)) {
                    files.push(filePath);
                }
            }
            else if (isDir(filePath) && levels > 1) {
                readDir(filePath);
            }
        });
    };


    if (levels > 0 || isDir(directory)) {
        readDir(directory);
    }
    else {
        files    = [directory];
    }

    return files;
};





var JsonFile = function(){

    var JsonFile = function(jsonFilePath) {

        var self    = this;

        self.path   = path.normalize(jsonFilePath);
        self.base   = path.dirname(self.path) + '/';
        self.build  = {};
        self.test   = [];
        self.push   = [];
        self.mixin  = {};

        var json    = require(self.path),
            key;

        for (key in json) {
            self[key] = json[key];
        }
    };

    JsonFile.prototype = {

        /**
         * @type {string}
         */
        path: null,

        /**
         * @type {string}
         */
        base: null,

        /**
         * @type {string}
         */
        target: null,

        /**
         * @type {bool}
         */
        compile: true,

        /**
         * @type {[]}
         */
        test: null,

        /**
         * @type {string}
         */
        version: null,

        /**
         * @type {[]}
         */
        push: null,

        /**
         * @type {Object}
         */
        mixin: null,

        /**
         * @type {Object}
         */
        build: null
    };

    var all = {};

    JsonFile.get = function(filePath) {
        filePath = path.normalize(filePath);
        if (!all[filePath]) {
            all[filePath] = new JsonFile(filePath);
        }
        return all[filePath];
    };


    return JsonFile;

}();





var File = function(){


    var rStrict         = new RegExp("'use "+ "strict'|" + '"use ' + 'strict";?', "g"),
        rRequires       = /([^\s]+)\s*=\s*require\(['|"]([^)]+)['|"]\)\s*,?/,
        rInclude        = /[^=\s]?\s*(require\(['|"]([^)]+)['|"]\);?)/,
        rEmptyVar       = /var[\s|,]*;/g,
        rVarSpace       = /var\s+/g,
        rTrailComma     = /,\s*;/g,



        allFiles        = {},

        getOrCreate     = function(file) {

            if (!allFiles[file]) {
                allFiles[file] = new File(file);
            }

            return allFiles[file];
        };




    var File = function(filePath, temporary) {

        var self    = this;

        self.base       = path.dirname(filePath) + "/";
        self.path       = filePath;
        self.as         = [];
        self.requires   = [];
        self.requiredBy = [];

        self.reqNames   = {};

        self.temporary  = temporary;

        self.process();
        self.findUnused();
    };

    File.prototype = {

        base: null,
        path: null,
        content: "",
        as: null,
        requires: null,
        requiredBy: null,
        processed: false,
        reqNames: null,

        temporary: false,

        /**
         * @param {Object} options
         * @returns {string}
         */
        getContent: function(options) {

            var self        = this,
                content     = self.content,
                as          = self.as.slice(),
                inx,
                match,
                name, funcName;

            options = options || {};

            if (!options.keepExports && content.indexOf("module.exports") != -1) {

                if (options.returnExports) {

                    content     = content.replace(/module\.exports\s*=/, "return");

                }
                else {

                    match       = /module\.exports\s*=\s*([^(\['"+. ]+)\s*;/.exec(content);
                    name        = match ? match[1] : null;

                    match       = /module\.exports\s*=\s*function\s+([^( ]+)/i.exec(content);
                    funcName    = match ? match[1] : null;

                    if (name && (inx = as.indexOf(name)) != -1) {
                        as.splice(inx, 1);
                    }

                    if (name && as.length == 0) {
                        content = content.replace(/module\.exports\s*=\s*[^;]+;/, "");
                    }
                    else {

                        if (as.length == 0 || (funcName && as.length == 1 && as[0] == funcName)) {
                            content = content.replace(/module\.exports\s*=\s*/, "");
                            //throw "No export names found for " + self.path + "; required by: " + self.requiredBy.join(", ");
                        }
                        else {

                            if (as.length > 1) {
                                content = "var " + as.join(", ") + ";\n" + content;
                                content = content.replace("module.exports", as.join(" = "));
                            }
                            else {

                                content = content.replace("module.exports", "var " + as[0]);
                            }
                        }
                    }
                }

                content = content.replace(rStrict, "");
            }

            return content;
        },

        process:function() {

            var self        = this,
                content     = fs.readFileSync(self.path).toString(),
                base        = self.base,
                start       = 0,
                mjsPath     = process.env.METAPHORJS_PATH,
                required,
                matches;

            if (self.processed) {
                return;
            }

            while (matches = rRequires.exec(content.substr(start))) {

                required    = matches[2];

                if (required.indexOf(".js") == -1) {
                    start += matches.index + required.length;
                    continue;
                }

                if (isFile(path.normalize(base + required))) {
                    required    = path.normalize(base + required);
                }
                else if (isFile(mjsPath +"/"+ required)) {
                    required    = mjsPath +"/"+ required;
                }
                else {
                    throw required + " required in " + self.path + " does not exist";
                }

                content     = content.replace(matches[0], "");

                self.reqNames[matches[1]] = required;

                required    = getOrCreate(required);
                required.addAs(matches[1]);

                if (required.doesRequire(self.path)) {
                    throw "Two files require each other: " + required.path + " <-> " + self.path;
                }

                self.addRequired(required.path);
                required.addRequiredBy(self.path);
            }

            content = content.replace(rEmptyVar, "");
            content = content.replace(rTrailComma, ";");
            start   = 0;

            while (matches = rInclude.exec(content.substr(start))) {

                required    = matches[2];

                if (required.indexOf(".js") == -1) {
                    start += required.length;
                    continue;
                }

                content     = content.replace(matches[1], "");
                required    = path.normalize(base + required);

                if (!isFile(required)) {
                    throw required + " required in " + self.path + " does not exist";
                }

                required    = getOrCreate(required);

                if (required.doesRequire(self.path)) {
                    throw "Two files require each other: " + required.path + " <-> " + self.path;
                }

                self.addRequired(required.path);
                required.addRequiredBy(self.path);
            }


            self.content    = content;
            self.processed  = true;
        },

        doesRequire: function(file) {
            return this.requires.indexOf(file) != -1;
        },

        addRequired: function(file) {
            var self = this;

            if (self.requires.indexOf(file) == -1) {
                self.requires.push(file);
            }
        },

        addRequiredBy: function(file) {
            this.requiredBy.push(file);
        },

        addAs: function(as) {
            var self = this;

            if (as == "*") {
                as = path.basename(self.path, ".js");
            }

            if (self.as.indexOf(as) == -1) {
                self.as.push(as);
            }
        },

        findUnused: function() {
            var self        = this,
                content     = self.content,
                name,
                reg;

            for (name in self.reqNames) {

                reg = new RegExp('[^a-zA-Z0-9]'+name+'[^a-zA-Z0-9]');

                if (!content.match(reg)) {
                    console.log("Unused requirement " + name + " in " + self.path);
                }
            }
        }
    };

    File.getOrCreate = getOrCreate;

    File.exists = function(filePath) {
        return !!allFiles[filePath];
    };

    File.get = function(filePath) {
        return allFiles[filePath];
    };

    File.removeDupReqs = function(content) {

        var matches,
            required,
            name,
            start = 0,
            used = {};

        while (matches = rRequires.exec(content.substr(start))) {

            name        = matches[1];
            required    = matches[2];

            if (used[name]) {
                content = content.substr(0, start + matches.index) +
                          content.substr(start + matches.index + matches[0].length);
            }
            else {
                used[name] = true;
                start += matches.index + matches[0].length;
            }
        }

        content = content.replace(rEmptyVar, "");
        content = content.replace(rTrailComma, ";");
        content = content.replace(rVarSpace, "var ");

        return content;
    };

    return File;

}();



var firstFile = function() {

    var l = arguments.length,
        i,
        path,
        inx;

    for (i = 0; i < l; i++) {
        path = arguments[i];
        if ((inx = path.indexOf('*')) != -1) {
            path = path.substr(0, inx);
            path = path.split('/');
            path.pop();
            path = path.join("/");
        }
        if (isFile(path)) {
            return arguments[i];
        }
    }

    return arguments[0];
};



var Build = function(jsonFile, name) {

    var self    = this;

    self.name           = name;
    self.jsonFile       = jsonFile;
    self.files          = [];
    self.fileOptions    = {};

    var raw = typeof name == "string" ?
                jsonFile.build[name] || jsonFile.mixin[name] :
                name,
        key;

    if (raw) {
        for (key in raw) {
            self[key] = raw[key];
        }

        self.collectFiles(raw);
        self.prepareBuildList();
    }
};

Build.prototype = {

    /**
     * @type {string}
     */
    name: null,

    /**
     * @type {JsonFile}
     */
    jsonFile: null,

    /**
     * @type {[]}
     */
    files: null,

    /**
     * @type {[]}
     */
    buildList: null,

    /**
     * @type {bool}
     */
    wrap: false,

    /**
     * @type {string}
     */
    target: "",

    /**
     * @type {string}
     */
    specificTarget: null,

    /**
     * @type {bool}
     */
    compile: true,

    /**
     * @type {Object}
     */
    allOmits: null,

    /**
     * @type {Object}
     */
    allReplaces: null,

    /**
     * @type {object}
     */
    fileOptions: null,

    collectFiles: function(raw) {

        var self        = this,
            all         = {},
            allFiles    = [],
            allOmits    = {},
            allReplaces = {},

            addFile = function(path, props, temporary) {
                if (!all[path]) {
                    all[path] = props || {};
                }
                else {
                    var oldProps = all[path];
                    if (!oldProps) {
                        all[path] = props;
                    }
                    else {
                        var key, oldVal;
                        for (key in props) {
                            if (typeof oldProps[key] == "undefined") {
                                oldProps[key] = props[key];
                            }
                            else if (key == "as") {
                                oldVal = oldProps[key];
                                if (typeof oldVal == "string") {
                                    oldProps[key] = [oldVal];
                                }
                                oldProps[key].push(props[key]);
                            }
                        }
                    }
                }

                if (temporary) {
                    all[path].temporary = true;
                }
            },

            getMixin = function(jsonFile, name) {
                return jsonFile.mixin[name] || {};
            },

            renderMixin = function(jsonFile, name, props) {

                var raw = jsonFile.build[name] || jsonFile.mixin[name],
                    ext = raw.extension || "js",
                    tmp = "/tmp/mjs-build-tmp-" + (new Date).getTime() + "." + ext,
                    r = require,
                    Builder = typeof Builder == "undefined" ? r("./Builder.js") : Builder;

                raw.specificTarget = tmp;

                var builder = new Builder(raw, jsonFile);
                builder.build();

                addFile(tmp, props);
            },

            processMixin = function(mixin, jsonFile, props) {

                var files   = mixin.files || [],
                    omit    = mixin.omit || [],
                    replace = mixin.replace || [],
                    mixins  = mixin.mixins || [],
                    base    = jsonFile.base,
                    ext     = mixin.extension || "js",
                    mjsPath = process.env.METAPHORJS_PATH;


                mixins.forEach(function(item){
                    if (typeof item == "string") {
                        processMixin(getMixin(jsonFile, item), jsonFile);
                    }
                    else {
                        var json = JsonFile.get(
                            firstFile(
                                base + item[0],
                                mjsPath + "/" + item[0]
                            )
                        );
                        processMixin(getMixin(json, item[1]), json);
                    }
                });

                omit.forEach(function(omitFile){
                    var list = getFileList(
                        firstFile(
                            base + omitFile,
                            mjsPath + "/" + omitFile
                        )
                        , ext);
                    list.forEach(function(omitFile){
                        allOmits[omitFile] = true;
                    });
                });

                replace.forEach(function(row){
                    allReplaces[firstFile(path.normalize(base + row[0]), mjsPath + '/' + row[0])]
                        = firstFile(path.normalize(base + row[1]), mjsPath +'/'+ row[1]);
                });

                files.forEach(function(file){
                    processFileItem(file, jsonFile);
                });
            },

            processFileItem = function(fileDef, jsonFile){

                if (typeof fileDef == "string") {
                    fileDef = [fileDef];
                }

                var file    = fileDef[0],
                    mjsPath = process.env.METAPHORJS_PATH,
                    list,
                    json,
                    ext;


                // mixin
                if (file.indexOf('.') == -1 && file.indexOf('*') == -1) {
                    if (fileDef[1]) {
                        renderMixin(jsonFile, file, fileDef[1]);
                    }
                    else {
                        processMixin(getMixin(jsonFile, file), jsonFile);
                    }
                }
                else if (path.extname(file) == ".json") {
                    json = JsonFile.get(
                        firstFile(
                            jsonFile.base + file,
                            mjsPath + "/" + file
                        )
                    );
                    if (fileDef[2]) {
                        renderMixin(json, fileDef[1], fileDef[2]);
                    }
                    else {
                        processMixin(getMixin(json, fileDef[1]), json);
                    }
                }
                else {
                    ext = path.extname(file).substr(1) || jsonFile.extension || "js";
                    list = getFileList(firstFile(
                        jsonFile.base + file,
                        mjsPath + "/" + file
                    ), ext);
                    list.forEach(function(file){
                        addFile(file, fileDef[1]);
                    });
                }
            };

        processMixin(raw, self.jsonFile);

        var file;

        for (file in all) {
            while (allReplaces[file]) {
                file = allReplaces[file];
            }
            if (!allOmits[file]) {
                allFiles.push([file, all[file] || {}]);

                if (all[file]) {
                    self.fileOptions[file] = all[file];
                }
            }
        }

        self.allOmits = allOmits;
        self.allReplaces = allReplaces;
        self.files = allFiles;
    },

    prepareBuildList: function() {

        var self        = this,
            buildList   = [],
            included    = {},
            stack       = [],
            omit        = self.allOmits,
            replace     = self.allReplaces;

        var processFile = function(file) {

            stack.push(file.path);

            if (stack.length > 50) {
                console.log(stack);
                throw "Recursive requirement";
            }

            file.requires.forEach(function(requiredFile){
                while (replace[requiredFile]) {
                    requiredFile = replace[requiredFile];
                }
                if (!omit[requiredFile]) {
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
            processFile(File.getOrCreate(filePath[0]));
        });

        var options = self.fileOptions;

        buildList.forEach(function(filePath){

            var opt = options[filePath],
                file;

            if (opt && opt.as) {
                file = File.getOrCreate(filePath);
                if (typeof opt.as == "string") {
                    file.addAs(opt.as);
                }
                else {
                    opt.as.forEach(function(as) {
                        file.addAs(as);
                    });
                }
            }

        });

        this.buildList = buildList;
    }

};







/**
 * @param {function} fn
 */
var eachProject = function(fn) {

    var cwd     = process.cwd(),
        dirs    = fs.readdirSync(cwd),
        pf,
        project,
        eachDir = function(dir){

            dir     = cwd + "/" + dir;
            pf      = dir + "/metaphorjs.json";

            if (isDir(dir) && isFile(pf)) {
                project   = require(pf);
                fn(project, pf);
            }
        };

    eachDir("");
    dirs.forEach(eachDir);
};

var toString = Object.prototype.toString;

var undf = undefined;




var varType = function(){

    var types = {
        '[object String]': 0,
        '[object Number]': 1,
        '[object Boolean]': 2,
        '[object Object]': 3,
        '[object Function]': 4,
        '[object Array]': 5,
        '[object RegExp]': 9,
        '[object Date]': 10
    };


    /**
     * 'string': 0,
     * 'number': 1,
     * 'boolean': 2,
     * 'object': 3,
     * 'function': 4,
     * 'array': 5,
     * 'null': 6,
     * 'undefined': 7,
     * 'NaN': 8,
     * 'regexp': 9,
     * 'date': 10,
     * unknown: -1
     * @param {*} value
     * @returns {number}
     */
    return function varType(val) {

        if (!val) {
            if (val === null) {
                return 6;
            }
            if (val === undf) {
                return 7;
            }
        }

        var num = types[toString.call(val)];

        if (num === undf) {
            return -1;
        }

        if (num == 1 && isNaN(val)) {
            return 8;
        }

        return num;
    };

}();



/**
 * @param {*} value
 * @returns {boolean}
 */
function isArray(value) {
    return typeof value == "object" && varType(value) === 5;
};

var child           = require("child_process"),
    
    
    
    
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





var cp = require("child_process");

/**
 * @param cmd
 * @param args
 * @returns {Promise}
 */
var passthru = function(cmd, args) {


    var proc = cp.spawn(cmd, args),
        deferred = new Promise;

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    process.stdin.pipe(proc.stdin);

    proc.on("exit", function(code) {

        process.stdin.unpipe(proc.stdin);

        if (code == 0) {
            deferred.resolve();
        }
        else {
            deferred.reject(code);
        }
    });


    return deferred;
};



var Git = function(location) {

    var self = this;

    self.location = location;

};

Git.prototype = {

    location: null,

    hasChanges: function() {

        var deferred = new Promise,
            loc = this.location,
            check = isDir(loc + "/src") ? "./src" : ".";

        process.chdir(loc);

        cp.execFile("git", ["status", check], function(err, stdout) {
            if (err) {
                deferred.reject(err);
            }
            else {
                deferred.resolve(stdout.indexOf("modified:") != -1);
            }
        });

        return deferred;
    },

    addAll: function() {
        process.chdir(this.location);
        return passthru("git", ["add", "-A", "."]);
    },

    commit: function(message) {
        process.chdir(this.location);
        return passthru("git", ["commit", "-m", message]);
    },

    setTag: function(version) {
        process.chdir(this.location);
        return passthru("git", ["tag", version]);
    },

    push: function(remote, branch) {
        process.chdir(this.location);
        return passthru("git", ["push", remote, branch]);
    }

};



var parseArgs = require("minimist");


var Project = function(){



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
            git.hasChanges()
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

        setVersion: function(mod) {

            var self    = this,
                mJson   = self.location + "/metaphorjs.json",
                pJson   = self.location + "/package.json",
                bJson   = self.location + "/bower.json",
                mjs     = require(mJson),
                pjs,
                bjs,
                version = mjs.version;

            console.log(version, '->', (version = increaseVersion(version, mod)));

            mjs.version = version;
            fs.writeFileSync(mJson, JSON.stringify(mjs, null, "    "));

            if (self.hasNpm) {
                pjs     = require(pJson);
                pjs.version = version;
                fs.writeFileSync(pJson, JSON.stringify(pjs, null, "    "));
            }
            if (self.hasBower) {
                bjs     = require(bJson);
                bjs.version = version;
                fs.writeFileSync(bJson, JSON.stringify(bjs, null, "    "));
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
MetaphorJs['Build'] = Build;
MetaphorJs['Builder'] = Builder;
MetaphorJs['File'] = File;
MetaphorJs['JsonFile'] = JsonFile;
MetaphorJs['Git'] = Git;
MetaphorJs['Project'] = Project;
module.exports = MetaphorJs;
