
var path = require("path"),

    JsonFile = require("./JsonFile.js"),
    File = require("./File.js"),
    resolvePath = require("../func/resolvePath.js"),

    getFileList = require("metaphorjs/src/func/fs/getFileList.js");


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
                    ext     = mixin.extension || "js";


                mixins.forEach(function(item){
                    if (typeof item == "string") {
                        processMixin(getMixin(jsonFile, item), jsonFile);
                    }
                    else {
                        var json = JsonFile.get(resolvePath(item[0], [base]));
                        processMixin(getMixin(json, item[1]), json);
                    }
                });

                omit.forEach(function(omitFile){
                    getFileList(resolvePath(omitFile, [base]), ext)
                        .forEach(function(omitFile){
                            allOmits[omitFile] = true;
                        });
                });

                replace.forEach(function(row){
                    allReplaces[resolvePath(row[0], [base])] = resolvePath(row[1], [base]);
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
                    json = JsonFile.get(resolvePath(file, [jsonFile.base]));
                    if (fileDef[2]) {
                        renderMixin(json, fileDef[1], fileDef[2]);
                    }
                    else {
                        processMixin(getMixin(json, fileDef[1]), json);
                    }
                }
                else {
                    ext = path.extname(file).substr(1) || jsonFile.extension || "js";
                    getFileList(resolvePath(file, [jsonFile.base]), ext)
                        .forEach(function(file){
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