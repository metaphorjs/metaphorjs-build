
var path            = require("path"),
    fs              = require("fs"),
    ClosureCompiler = require("closurecompiler"),
    child           = require("child_process"),
    allFiles        = {},

    rRequire        = new RegExp('//#require [^\n]+', 'g'),

    isFile          = function(filePath) {
        return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
    },

    isDir           = function(dirPath) {
        return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
    };



var readRequires    = function(filePath, content, currentAction) {

    content         = content.toString();

    var matches     = content.match(rRequire) || [],
        loc         = path.dirname(filePath) + "/",
        i, l,
        req,
        requires    = [],
        acts,
        aInx,
        skip;

    for (i = 0, l = matches.length; i < l; i++) {
        content     = content.replace(matches[i], "");
        req         = matches[i].replace('//#require ', '').trim();

        if (req.substr(0,1) == "(") {
            aInx    = req.indexOf(")");
            acts    = req.substr(1, aInx - 1).split(",");
            req     = req.substr(aInx + 1).trim();
            skip    = false;

            if (currentAction) {
                acts.forEach(function(action) {

                    if (action.substr(0,1) == "!") {
                        if (currentAction == action.substr(1)) {
                            skip = true;
                            return false;
                        }
                    }
                    else if (currentAction == action) {
                        skip = true;
                        return false;
                    }
                });
            }

            if (skip) {
                continue;
            }
        }

        req         = path.normalize(loc + req);
        requires.push(req);
    }

    return {
        requires: requires,
        content: content
    };
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

var resolveFile = function(filePath, action) {

    if (!allFiles[filePath]) {
        allFiles[filePath] = {
            path: filePath,
            content: ""
        };

        try {

            var content     = fs.readFileSync(filePath).toString(),
                data        = readRequires(filePath, content, action),
                requires    = [];

        }
        catch (e) {
            console.log("Error reading file: " + filePath);
            throw e;
        }

        data.requires.forEach(function(requiredFile){
            var fileList = resolveFileList("", requiredFile);

            fileList.forEach(function(requiredFile){
                if (!isFile(requiredFile)) {
                    throw requiredFile + " required in " + filePath + " does not exist";
                }
                requires.push(requiredFile);
            });
        });

        allFiles[filePath].requires = requires;
        allFiles[filePath].content = data.content;

        requires.forEach(function(requiredFile){
            resolveFile(requiredFile);

            if (allFiles[requiredFile].requires.indexOf(filePath) != -1) {
                throw "Two files require each other: " + filePath + " <-> " + requiredFile;
            }
        });
    }

    return allFiles[filePath];
};



var Builder         = function(manifestFile, action, onFinishCompiling) {

    var self        = this;

    self.buildList      = [];
    self.included       = {};
    self.files          = [];
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

    if (manifest.after) {
        var after = new Builder(manifestFile, manifest.after);
        after.build();
    }

    if (manifest.files) {
        manifest.files.forEach(function(filename){

            var fileList = resolveFileList(root, filename);

            fileList.forEach(function(filePath) {
                if (!isFile(filePath)) {
                    throw filePath + " defined in manifest " + manifestFile + " does not exist";
                }

                files.push(filePath);
            });
        });
    }

    if (manifest.appendFilesFrom) {
        self.importManifests(manifest.appendFilesFrom, "append");
    }
    if (manifest.prependFilesFrom) {
        self.importManifests(manifest.prependFilesFrom, "prepend");
    }
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

    resolveFiles:   function() {

        var self    = this;
        self.files.forEach(function(filePath){
            resolveFile(filePath, self.action);
        });
    },

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

    prepareBuildList: function() {

        var buildList   = [],
            included    = {},
            stack       = [];

        var processFile = function(file) {

            stack.push(file.path);

            if (stack.length > 50) {
                console.log(stack);
                throw "Recursive requirement";
            }

            file.requires.forEach(function(requiredFile){
                processFile(allFiles[requiredFile]);
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

            content += allFiles[filePath].content;
        });

        if (manifest.append) {
            manifest.append.forEach(function(file) {
                var filePath = path.normalize(self.base + file);
                content += fs.readFileSync(filePath).toString();
            });
        }

        if (manifest.wrap) {
            var wrapStart   = manifest.wrapStart || "(function(){\n\"use strict\"\n";
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
            out;

        srcMf.build();

        if (isFile(target)) {
            fs.unlinkSync(target);
        }

        console.log("Compiling " + src);
        out     = fs.createWriteStream(target);
        proc    = child.spawn("ccjs", [src]);

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
        i, m;

    dirs.forEach(function(dir){
        dir     = cwd + "/" + dir;
        mf      = dir + "/metaphorjs.json";

        if (isDir(dir) && isFile(mf)) {
            m   = require(mf);

            for (i in m) {
                fn(m[i], mf, i);
            }
        }
    });
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
            if (m.auto) {
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