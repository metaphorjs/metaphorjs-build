
var path            = require("path"),
    fs              = require("fs"),
    child           = require("child_process"),
    parser          = require("esprima"),
    allFiles        = {},

    rStrict         = /'use strict'|"use strict";?/g,
    rRequires       = /([^\s]+)\s*=\s*require\(['|"]([^)]+)['|"]\)/,
    rInclude        = /[^=\s]?\s*(require\(['|"]([^)]+)['|"]\);?)/,
    rEmptyVar       = /var[\s|,]*;/g,



    isFile          = function(filePath) {
        return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
    },

    isDir           = function(dirPath) {
        return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
    },

    getOrCreate     = function(file) {

        if (!allFiles[file]) {
            allFiles[file] = new File(file);
        }

        return allFiles[file];
    };



var File = function(filePath) {

    var self    = this;

    self.base       = path.dirname(filePath) + "/";
    self.path       = filePath;
    self.as         = [];
    self.requires   = [];
    self.requiredBy = [];

    self.process();
};


var isExportWrapped = function(content) {

    var tree    = parser.parse(content),
        body    = tree.body,
        stmt,
        left;

    while (stmt = body.pop()) {

        if (stmt.type != "ExpressionStatement") {
            continue;
        }
        if (stmt.expression.type != "AssignmentExpression") {
            continue;
        }

        left = stmt.expression.left;

        if (!left.object) {
            continue;
        }

        if (left.object.name != "module" || left.property.name != "exports") {
            continue;
        }

        return false;
    }

    return true;
};

File.prototype = {

    base: null,
    path: null,
    content: "",
    as: null,
    requires: null,
    requiredBy: null,
    processed: false,

    getContent: function(options) {

        var self        = this,
            content     = self.content,
            wrappedExp  = false,
            as          = self.as,
            inx,
            match,
            name;

        options = options || {};

        if (!options.keepExports && content.indexOf("module.exports") != -1) {

            if (options.returnExports) {

                content     = content.replace(/module\.exports\s*=/, "return");

            }
            else {

                wrappedExp  = isExportWrapped(content);
                match       = /module\.exports\s*=\s*([^;]+);/.exec(content);
                name        = match[1];

                if (name.match(/[{(\['"+.]/)) {
                    name    = null;
                }

                if (wrappedExp && as.indexOf(name) != -1) {
                    throw "Cannot assign wrapped module.exports to a variable " + name + " in " + self.path;
                }

                if (!wrappedExp && (inx = as.indexOf(name)) != -1) {
                    as.splice(inx, 1);
                }

                if (name && as.length == 0) {
                    content = content.replace(/module\.exports\s*=\s*[^;]+;/, "");
                }
                else {

                    if (as.length == 0) {
                        content = content.replace(/module\.exports\s*=/, "");
                        //throw "No export names found for " + self.path + "; required by: " + self.requiredBy.join(", ");
                    }
                    else {

                        if (wrappedExp || as.length > 1) {
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
            required,
            matches;

        if (self.processed) {
            return;
        }

        while (matches = rRequires.exec(content)) {
            content     = content.replace(matches[0], "");
            required    = path.normalize(base + matches[2]);

            if (!isFile(required)) {
                throw required + " required in " + self.path + " does not exist";
            }

            required    = getOrCreate(required);
            required.addAs(matches[1]);

            if (required.doesRequire(self.path)) {
                throw "Two files require each other: " + required.path + " <-> " + self.path;
            }

            self.addRequired(required.path);
            required.addRequiredBy(self.path);
        }

        content = content.replace(rEmptyVar, "");

        while (matches = rInclude.exec(content)) {
            content     = content.replace(matches[1], "");
            required    = path.normalize(base + matches[2]);

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

        if (self.as.indexOf(as) == -1) {
            self.as.push(as);
        }
    }

};



var resolveFileList = function(base, filename) {

    var fileList,
        dir,
        filePath,
        files = [];

    if (filename.substr(filename.length - 1) == "*") {
        dir         = path.normalize(base + filename.substr(0, filename.length - 2));
        fileList    = fs.readdirSync(dir);

        fileList.forEach(function(filename) {
            filePath = path.normalize(dir + "/" + filename);
            if (isFile(filePath)) {
                files.push(filePath);
            }
        });
    }
    else {
        files    = [path.normalize(base + filename)];
    }

    return files;
};




var Builder         = function(manifestFile, action, onFinishCompiling) {

    var self        = this;

    self.buildList      = [];
    self.included       = {};
    self.files          = [];
    self.fileOptions    = {};
    self.omit           = [];
    self.manifestFile   = manifestFile;
    self.onFinishCompiling  = onFinishCompiling;

    if (!isFile(manifestFile)) {
        throw manifestFile + " not found";
    }

    var manifest    = require(manifestFile),
        root        = path.dirname(manifestFile) + "/",
        files       = self.files;

    self.allActions = manifest;

    manifest        = manifest[action];

    self.action     = action;
    self.base       = root;
    self.manifest   = manifest;


    if (manifest.files) {

        var fileOptions;

        manifest.files.forEach(function(filename){

            fileOptions = null;

            if (typeof filename != "string") {
                fileOptions = filename[1];
                filename    = filename[0];
            }

            var fileList = resolveFileList(root, filename);

            fileList.forEach(function(filePath) {
                if (!isFile(filePath)) {
                    throw filePath + " defined in manifest " + manifestFile + " does not exist";
                }

                files.push(filePath);
                self.fileOptions[filePath] = fileOptions;
            });
        });
    }

    if (manifest.omit) {
        manifest.omit.forEach(function(omitPath){
            self.omit.push(path.normalize(root + omitPath));
        });
    }

    if (manifest.appendFilesFrom) {
        self.importManifests(manifest.appendFilesFrom, "append");
    }
    if (manifest.prependFilesFrom) {
        self.importManifests(manifest.prependFilesFrom, "prepend");
    }

    files = self.files;

    self.omit.forEach(function(omitPath){
        var inx;
        if ((inx = files.indexOf(omitPath)) != -1) {
            files.splice(inx, 1);
        }
    });

};

Builder.prototype   = {

    manifestFile:   null,
    allActions:     null,
    action:         null,
    manifest:       null,
    buildList:      null,
    included:       null,
    files:          null,
    base:           null,
    onFinishCompiling: null,
    fileOptions:    null,
    omit:           null,

    build:          function() {

        var self    = this;

        if (self.files.length) {
            self.resolveFiles();
            self.prepareBuildList();

            if (self.manifest.target) {
                self.concat();
            }
        }

        if (self.manifest.compile) {
            self.compile();
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
                    processFile(allFiles[requiredFile]);
                }
            });

            if (!included[file.path]) {
                included[file.path] = true;
                buildList.push(file.path);
            }

            stack.pop();
        };

        this.files.forEach(function(filePath){
            processFile(allFiles[filePath]);
        });

        this.buildList = buildList;
    },

    concat:        function() {

        var self        = this,
            manifest    = self.manifest,
            target      = path.normalize(self.base + manifest.target),
            content     = "";

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        if (manifest.require) {
            var rs = manifest.require,
                module;
            for (module in rs) {
                content += "var " + rs[module] + " = require('"+module+"');\n"
            }
        }

        if (manifest.prepend) {
            manifest.prepend.forEach(function(file) {
                var filePath = path.normalize(self.base + file);
                content += fs.readFileSync(filePath).toString();
            });
        }

        self.buildList.forEach(function(filePath){

            if (!allFiles[filePath]) {
                throw filePath + " was not resolved";
            }

            content += allFiles[filePath].getContent(self.fileOptions[filePath]);
        });

        if (manifest.expose) {
            content += "\n";

            var createdNs = {
                "MetaphorJs.lib": true
            };

            manifest.expose.forEach(function(varName){

                if (typeof varName == "string") {
                    content += "MetaphorJs['" + varName + "'] = " + varName + ";\n";
                }
                else {
                    var ns = varName[0];
                    varName = varName[1];

                    if (!createdNs[ns]) {
                        content += ns + " || (" + ns + " = {});\n";
                    }
                    content += ns + "['"+varName+"'] = " + varName + ";\n";
                }
            });
        }

        if (manifest.append) {
            manifest.append.forEach(function(file) {
                var filePath = path.normalize(self.base + file);
                content += fs.readFileSync(filePath).toString();
            });
        }

        if (manifest.global) {
            content += "\ntypeof global != \"undefined\" ? " +
                       "(global['MetaphorJs'] = MetaphorJs) : (window['MetaphorJs'] = MetaphorJs);\n";
        }

        if (manifest.exports) {
            content += "\nmodule.exports = " + manifest.exports + ";\n";
        }

        if (manifest.define) {
            var defName = manifest.define.name,
                defDeps = manifest.define.deps,
                defRet  = manifest.define.return,
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

        if (manifest.wrap) {
            var wrapStart   = manifest.wrapStart || "(function(){\n\"use strict\";\n";
            var wrapEnd     = manifest.wrapEnd || "\n}());";
            content         = wrapStart + content + wrapEnd;
        }

        fs.writeFileSync(target, content);
    },


    getFiles:       function() {
        return this.files;
    },

    importManifests: function(list, mode) {

        var self    = this;

        if (typeof list == "string") {
            if (self.allActions[list]) {
                self.importFilesFrom(self.manifestFile, list, mode);
            }
        }
        else {
            list.forEach(function(fromManifest){

                var manifestFile,
                    action;

                if (typeof fromManifest == "string") {
                    if (self.allActions[fromManifest]) {
                        self.importFilesFrom(self.manifestFile, fromManifest, mode);
                        return;
                    }
                    else {
                        manifestFile    = fromManifest;
                        action          = null;
                    }
                }
                else {
                    manifestFile    = path.normalize(self.base + fromManifest[0]);
                    action          = fromManifest[1];
                }

                if (!manifestFile) {
                    console.log(fromManifest);
                    throw "No manifest file";
                }

                self.importFilesFrom(manifestFile, action, mode);
            });
        }
    },

    importFilesFrom: function(manifestFile, action, mode) {

        var self        = this,
            b           = new Builder(manifestFile, action),
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

    compile:        function() {

        var self        = this,
            manifest    = self.manifest,
            target      = path.normalize(self.base + manifest.target),
            action      = manifest.compile,
            proc,
            srcMf       = new Builder(self.manifestFile, action),
            src         = path.normalize(self.base + srcMf.manifest.target),
            out,
            args        = [];

        srcMf.build();

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        console.log("Compiling " + src);
        out     = fs.createWriteStream(target);
        args.push(src);

        if (manifest.compileAdvanced) {
            args.push('--compilation_level=ADVANCED');
        }

        if (manifest.compileSourceMap) {
            args.push("--create_source_map=" + target + ".map");
        }

        proc    = child.spawn("ccjs", args);

        proc.stderr.pipe(process.stderr);
        proc.stdout.pipe(out);
        proc.on("exit", function(code) {
            if (self.onFinishCompiling) {
                self.onFinishCompiling(code);
            }
            else {
                process.exit(code);
            }
        });
        proc.on("error", function(error) {
            console.log(error);
        });
    }
};



var eachManifest = function(fn) {

    var cwd     = process.cwd(),
        dirs    = fs.readdirSync(cwd),
        mf,
        i, m,
        eachDir = function(dir){
            dir     = cwd + "/" + dir;
            mf      = dir + "/metaphorjs.json";

            if (isDir(dir) && isFile(mf)) {
                m   = require(mf);

                for (i in m) {
                    fn(m[i], mf, i);
                }
            }
        };

    eachDir(cwd);
    dirs.forEach(eachDir);
};


module.exports = {
    build: function(action, manifestFile) {

        if (!manifestFile) {
            manifestFile = process.cwd() + "/metaphorjs.json";
        }

        var actions = [];

        if (!action) {
            var manifest = require(manifestFile);
            for (var i in manifest) {
                if (manifest[i].auto) {
                    actions.push(i);
                }
            }
        }
        else {
            actions.push(action);
        }

        actions.forEach(function(action){
            var builder     = new Builder(manifestFile, action);
            builder.build();
        });
    },

    buildAll: function() {

        var b;

        eachManifest(function(m, manifestFile, action){
            if (!m.compile) {
                b = new Builder(manifestFile, action);
                b.build();
            }
        });
    },

    compileAll: function() {

        var b,
            mfs     = [],
            next    = function(code) {

                if (code != 0) {
                    process.exit(code);
                }

                var item = mfs.shift();

                if (!item) {
                    process.exit(0);
                }

                b = new Builder(item[0], item[1], next);
                b.build();
            };

        eachManifest(function(m, manifestFile, action){
            if (m.compile) {
                mfs.push([manifestFile, action]);
            }
        });

        next(0);
    }


};