
var resolveFileList = require("../builder/resolveFileList.js"),
    path = require("path"),
    JsonFile = require("../lib/JsonFile.js"),
    File = require("./File.js");

var Build = function(jsonFile, name) {

    var self    = this;

    self.name           = name;
    self.jsonFile       = jsonFile;
    self.files          = [];
    self.fileOptions    = {};

    var raw = jsonFile.getRawBuild(name),
        key;

    for (key in raw) {
        self[key] = raw[key];
    }

    self.collectFiles(raw);
    self.prepareBuildList();
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

            addFile = function(path, props) {
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
            },

            getMixin = function(jsonFile, name) {
                return jsonFile.mixin[name] || {};
            },

            processMixin = function(mixin, jsonFile) {

                var files   = mixin.files || [],
                    omit    = mixin.omit || [],
                    replace = mixin.replace || [],
                    mixins  = mixin.mixins || [],
                    base    = jsonFile.base;

                mixins.forEach(function(item){
                    if (typeof item == "string") {
                        processMixin(getMixin(jsonFile, item), jsonFile);
                    }
                    else {
                        var json = JsonFile.get(jsonFile.base + item[0]);
                        processMixin(getMixin(json, item[1]), json);
                    }
                });

                omit.forEach(function(omitFile){
                    var list = resolveFileList(jsonFile.base, omitFile);
                    list.forEach(function(omitFile){
                        allOmits[omitFile] = true;
                    });
                });

                replace.forEach(function(row){
                    allReplaces[path.normalize(base + row[0])] = path.normalize(base + row[1]);
                });

                files.forEach(function(file){
                    processFileItem(file, jsonFile);
                });
            },

            processFileItem = function(fileDef, jsonFile){

                if (typeof fileDef == "string") {
                    fileDef = [fileDef];
                }

                var file = fileDef[0],
                    list,
                    json;

                // mixin
                if (file.indexOf('.') == -1 && file.indexOf('*') == -1) {
                    processMixin(getMixin(jsonFile, file), jsonFile);
                }
                else if (path.extname(file) == ".json") {
                    json = JsonFile.get(jsonFile.base + file);
                    processMixin(getMixin(json, fileDef[1]), json);
                }
                else {
                    list = resolveFileList(jsonFile.base, file);
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



module.exports = Build;