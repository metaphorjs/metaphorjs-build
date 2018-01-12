var __MetaphorJsPrebuilt = {};


var MetaphorJs = {


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


    /*
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



function isString(value) {
    return typeof value == "string" || value === ""+value;
    //return typeof value == "string" || varType(value) === 0;
};



/**
 * @param {*} value
 * @returns {boolean}
 */
function isArray(value) {
    return typeof value == "object" && varType(value) === 5;
};


var fs              = require("fs"),
    path            = require("path");


var JsonFile = function(){

    var insertVars = function(string, root) {

        return string.replace(/@{([^}]+)}/ig, function(match, key) {

            if (root[key]) {
                return root[key];
            }
            else {
                return "";
            }
        });
    };

    var prepareData = function(data, root) {

        var k, val, i, l;

        for (k in data) {

            val = data[k];

            if (isString(val)) {
                data[k] = insertVars(val, root);
            }
            else if (isArray(val)) {
                for (i = 0, l = val.length; i < l; i++) {
                    prepareData(data[k][i], root);
                }
            }
            else if (val && typeof val == "object") {
                prepareData(data[k], root);
            }
        }
    };


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

        prepareData(json, json);

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




var isDir = function(dirPath) {
    return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
};



var resolvePath = function(toResolve, locations) {

    if (toResolve.indexOf("./") !== 0 &&
        toResolve.indexOf("../") !== 0 &&
        toResolve.indexOf("*") == -1 &&
        toResolve.indexOf("/") == -1 &&
        toResolve.indexOf(".js") != toResolve.length - 3) {
        return true;
    }

    locations = locations || [];

    if (process.env.METAPHORJS_PATH) {
        locations.push(process.env.METAPHORJS_PATH);
    }
    if (process.env.NODE_PATH) {
        locations = locations.concat(process.env.NODE_PATH.split(path.delimiter));
    }

    var norm = toResolve,
        inx,
        i, l,
        loc,
        dirMode = false,
        abs = norm.substr(0, 1) == "/";

    while ((inx = norm.indexOf('*')) != -1) {
        norm = norm.substr(0, inx);
        norm = norm.split('/');
        norm.pop();
        norm = norm.join("/");
        dirMode = true;
    }

    if (abs) {
        if (fs.existsSync(norm)) {
            if (dirMode || !isDir(norm)) {
                return path.normalize(norm) + toResolve.replace(norm, "");
            }
        }
    }

    for (i = 0, l = locations.length; i < l; i++) {
        loc = locations[i];

        if (loc.substr(loc.length - 1) != '/') {
            loc += '/';
        }

        if (fs.existsSync(loc + norm)) {
            if (dirMode || !isDir(loc + norm)) {
                return path.normalize(loc + norm) + toResolve.replace(norm, "");
            }
        }
    }

    try {
        var resolved = require.resolve(toResolve);
        if (resolved == toResolve) {
            return true;
        }
        return resolved;
    }
    catch (thrown) {}

    return false;
};


var nextUid = function(){
    var uid = ['0', '0', '0'];

    // from AngularJs
    /**
     * @returns {String}
     */
    return function nextUid() {
        var index = uid.length;
        var digit;

        while(index) {
            index--;
            digit = uid[index].charCodeAt(0);
            if (digit == 57 /*'9'*/) {
                uid[index] = 'A';
                return uid.join('');
            }
            if (digit == 90  /*'Z'*/) {
                uid[index] = '0';
            } else {
                uid[index] = String.fromCharCode(digit + 1);
                return uid.join('');
            }
        }
        uid.unshift('0');
        return uid.join('');
    };
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

        self.id         = "_f_" + nextUid();
        self.base       = path.dirname(filePath) + "/";
        self.path       = filePath;
        self.as         = [];
        self.requires   = [];
        self.requiredBy = [];
        self.localRequires = [];

        self.reqNames   = {};

        self.temporary  = temporary;

        self.process();
        self.findUnused();
    };

    File.prototype = {

        id: null,
        base: null,
        path: null,
        content: "",
        as: null,
        requires: null,
        requiredBy: null,
        processed: false,
        reqNames: null,

        requiresUniqueAlias: false,
        localRequires: null,
        wrap: false,
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

            //if (!as.length) {
            //    self.addAs("*");
            //    as          = self.as.slice();
            //}

            options = options || {};

            if (this.requiresUniqueAlias) {
                as.push(this.id);
            }

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

                //if (this.wrap) {
                //    content = "(function(){\n"+content+"\n}());";
                //}

                content = content.replace(rStrict, "");
            }

            return content;
        },

        process:function() {

            var self        = this,
                content     = fs.readFileSync(self.path).toString(),
                base        = self.base,
                start       = 0,
                required,
                matches;

            if (self.processed) {
                return;
            }

            while (matches = rRequires.exec(content.substr(start))) {

                required    = resolvePath(matches[2], [base]);

                if (required === true) {
                    start += matches.index + matches[2].length;
                    continue;
                }
                else if (required === false) {
                    throw matches[2] + " required in " + self.path + " does not exist";
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

                required    = resolvePath(matches[2], [base]);

                if (required === true) {
                    start += matches[2].length;
                    continue;
                }
                else if (required === false) {
                    throw matches[2] + " required in " + self.path + " does not exist";
                }

                content     = content.replace(matches[1], "");
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

        addLocalRequired: function(desiredName, fileId) {
            this.localRequires.push({
                desiredName: desiredName,
                fileId: fileId
            })
        },

        addRequiredBy: function(file) {
            this.requiredBy.push(file);
        },


        getDefaultAlias: function() {
            var as = path.basename(this.path, ".js");
            if (as.indexOf(".") != -1 || as.indexOf("-") != -1) {
                return null;
            }
            return as;
        },

        addAs: function(as) {
            var self = this;

            if (as == "*") {
                as = self.getDefaultAlias();
                if (!as) {
                    return;
                }
            }

            if (as && self.as.indexOf(as) == -1) {
                self.as.push(as);
            }
        },

        removeAs: function(as) {
            var self = this,
                inx;
            if ((inx = self.as.indexOf(as)) != -1) {
                self.as.splice(inx,1);
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
        },

        needsWrapping: function() {

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



var isFile = function(filePath) {
    return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
};



var getFileList = function(directory, ext) {

    var fileList,
        filePath,
        levels = 0,
        files = [];

    if (!directory) {
        return [];
    }


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
                else if (typeof ext != "string" && path.extname(filePath).substr(1).match(ext)) {
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




var Build = function(jsonFile, name) {

    var self    = this;

    self.name           = name;
    self.jsonFile       = jsonFile;
    self.files          = [];
    self.fileOptions    = {};
    self.templates      = [];

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
    templates: null,

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
            allTpls     = {},
            allTplsCnt  = 0,
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

            addTplFile = function(path, props) {
                if (!allTpls[path]) {
                    allTpls[path] = props || {};
                    allTplsCnt++;
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
                    tpls    = mixin.templates || [],
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

                tpls.forEach(function(file){
                    processTplItem(file, jsonFile);
                });
            },

            processTplItem = function(fileDef, jsonFile) {

                if (typeof fileDef == "string") {
                    fileDef = [fileDef];
                }

                var file    = fileDef[0],
                    ext;

                ext = path.extname(file).substr(1) || /^html|tpl$/;
                getFileList(resolvePath(file, [jsonFile.base]), ext)
                    .forEach(function(file){
                        addTplFile(file, fileDef[1]);
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
        self.templates = allTplsCnt > 0 ? allTpls : null;
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

        var options = self.fileOptions,
            allAliases = {};
        
        var addAlias = function(file, as) {

            if (as == "*") {
                as = file.getDefaultAlias();
            }

            if (!as) {
                return;
            }

            // alias is already occupied
            // in this build
            if (allAliases[as] && allAliases[as] != file.path) {

                throw "Non unique alias \"" + as + "\" Found in " +
                        allAliases[as] + " and " + file.path;
            }
            else {
                allAliases[as] = file.path;
                file.addAs(as);
            }
        };

        buildList.forEach(function(filePath){

            var opt = options[filePath],
                file;

            if (opt && opt.as) {
                file = File.getOrCreate(filePath);
                if (typeof opt.as == "string") {
                    //file.addAs(opt.as, allAliases);
                    addAlias(file, opt.as);
                }
                else {
                    opt.as.forEach(function(as) {
                        addAlias(file, as);
                        //file.addAs(as, allAliases);
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

            dir     = dir ? cwd + "/" + dir : cwd;
            pf      = dir + "/metaphorjs.json";

            if (isDir(dir) && isFile(pf)) {
                project   = require(pf);
                fn(project, pf);
            }
        };


    eachDir("");
    dirs.forEach(eachDir);
};



/**
 * @function trim
 * @param {String} value
 * @returns {string}
 */
var trim = function() {
    // native trim is way faster: http://jsperf.com/angular-trim-test
    // but IE doesn't have it... :-(
    if (!String.prototype.trim) {
        return function(value) {
            return isString(value) ? value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : value;
        };
    }
    return function(value) {
        return isString(value) ? value.trim() : value;
    };
}();

/**
 * @param {Function} fn
 * @param {*} context
 */
var bind = Function.prototype.bind ?
              function(fn, context){
                  return fn.bind(context);
              } :
              function(fn, context) {
                  return function() {
                      return fn.apply(context, arguments);
                  };
              };



/**
 * @param {string} str
 * @param {string} separator
 * @param {bool} allowEmpty
 * @returns {[]}
 */
var split = function(str, separator, allowEmpty) {

    var l       = str.length,
        sl      = separator.length,
        i       = 0,
        prev    = 0,
        prevChar= "",
        inQDbl  = false,
        inQSng  = false,
        parts   = [],
        esc     = "\\",
        char;

    if (!sl) {
        return [str];
    }

    for (; i < l; i++) {

        char = str.charAt(i);

        if (char == esc) {
            i++;
            continue;
        }

        if (char == '"') {
            inQDbl = !inQDbl;
            continue;
        }
        if (char == "'") {
            inQSng = !inQSng;
            continue;
        }

        if (!inQDbl && !inQSng) {
            if ((sl == 1 && char == separator) ||
                (sl > 1 && str.substring(i, i + sl) == separator)) {

                if (str.substr(i - 1, sl) == separator ||
                    str.substr(i + 1, sl) == separator) {

                    if (!allowEmpty) {
                        i += (sl - 1);
                        continue;
                    }
                }

                parts.push(str.substring(prev, i).replace(esc + separator, separator));
                prev = i + sl;
                i += (sl - 1);
            }
        }

        prevChar = char;
    }

    parts.push(str.substring(prev).replace(esc + separator, separator));

    return parts;
};

function isFunction(value) {
    return typeof value == 'function';
};



function isDate(value) {
    return varType(value) === 10;
};



function isRegExp(value) {
    return varType(value) === 9;
};

function isWindow(obj) {
    return obj === window ||
           (obj && obj.document && obj.location && obj.alert && obj.setInterval);
};



// from Angular

var equals = function(){

    var equals = function equals(o1, o2) {
        if (o1 === o2) return true;
        if (o1 === null || o2 === null) return false;
        if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
        var t1 = typeof o1, t2 = typeof o2, length, key, keySet;
        if (t1 == t2) {
            if (t1 == 'object') {
                if (isArray(o1)) {
                    if (!isArray(o2)) return false;
                    if ((length = o1.length) == o2.length) {
                        for(key=0; key<length; key++) {
                            if (!equals(o1[key], o2[key])) return false;
                        }
                        return true;
                    }
                } else if (isDate(o1)) {
                    return isDate(o2) && o1.getTime() == o2.getTime();
                } else if (isRegExp(o1) && isRegExp(o2)) {
                    return o1.toString() == o2.toString();
                } else {
                    if (isWindow(o1) || isWindow(o2) || isArray(o2)) return false;
                    keySet = {};
                    for(key in o1) {
                        if (key.charAt(0) == '$' || isFunction(o1[key])) {//&& typeof o1[key] == "object") {
                            continue;
                        }
                        //if (isFunction(o1[key])) {
                        //    continue;
                        //}
                        if (!equals(o1[key], o2[key])) {
                            return false;
                        }
                        keySet[key] = true;
                    }
                    for(key in o2) {
                        if (!keySet.hasOwnProperty(key) &&
                            key.charAt(0) != '$' &&
                            o2[key] !== undf &&
                            !isFunction(o2[key])) return false;
                    }
                    return true;
                }
            }
        }
        return false;
    };

    return equals;
}();



function isPlainObject(value) {
    // IE < 9 returns [object Object] from toString(htmlElement)
    return typeof value == "object" &&
           varType(value) === 3 &&
            !value.nodeType &&
            value.constructor === Object;

};

var strUndef = "undefined";



var copy = function() {

    var win = typeof window != strUndef ? window : null,
        glob = typeof global != strUndef ? global : null;

    var copy = function copy(source, dest){

        if (win && source === win) {
            throw new Error("Cannot copy window object");
        }
        if (glob && source === glob) {
            throw new Error("Cannot copy global object");
        }

        if (!dest) {
            dest = source;
            if (source) {
                if (isArray(source)) {
                    dest = copy(source, []);
                } else if (isDate(source)) {
                    dest = new Date(source.getTime());
                } else if (isRegExp(source)) {
                    dest = new RegExp(source.source);
                } else if (isPlainObject(source)) {
                    dest = copy(source, {});
                }
            }
        } else {
            if (source === dest) {
                throw new Error("Objects are identical");
            }
            if (isArray(source)) {
                dest.length = 0;
                for ( var i = 0, l = source.length; i < l; i++) {
                    dest.push(copy(source[i]));
                }
            } else {
                var key;
                for (key in dest) {
                    delete dest[key];
                }
                for (key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (key.charAt(0) == '$' || isFunction(source[key])) {
                            dest[key] = source[key];
                        }
                        else {
                            dest[key] = copy(source[key]);
                        }
                    }
                }
            }
        }
        return dest;
    };

    return copy;
}();


var slice = Array.prototype.slice;

function isBool(value) {
    return value === true || value === false;
};




var extend = function(){

    /**
     * @param {Object} dst
     * @param {Object} src
     * @param {Object} src2 ... srcN
     * @param {boolean} override = false
     * @param {boolean} deep = false
     * @returns {object}
     */
    var extend = function extend() {


        var override    = false,
            deep        = false,
            args        = slice.call(arguments),
            dst         = args.shift(),
            src,
            k,
            value;

        if (isBool(args[args.length - 1])) {
            override    = args.pop();
        }
        if (isBool(args[args.length - 1])) {
            deep        = override;
            override    = args.pop();
        }

        while (args.length) {
            // IE < 9 fix: check for hasOwnProperty presence
            if ((src = args.shift()) && src.hasOwnProperty) {
                for (k in src) {

                    if (src.hasOwnProperty(k) && (value = src[k]) !== undf) {

                        if (deep) {
                            if (dst[k] && isPlainObject(dst[k]) && isPlainObject(value)) {
                                extend(dst[k], value, override, deep);
                            }
                            else {
                                if (override === true || dst[k] == undf) { // == checks for null and undefined
                                    if (isPlainObject(value)) {
                                        dst[k] = {};
                                        extend(dst[k], value, override, true);
                                    }
                                    else {
                                        dst[k] = value;
                                    }
                                }
                            }
                        }
                        else {
                            if (override === true || dst[k] == undf) {
                                dst[k] = value;
                            }
                        }
                    }
                }
            }
        }

        return dst;
    };

    return extend;
}();



function isPrimitive(value) {
    var vt = varType(value);
    return vt < 3 && vt > -1;
};

function returnFalse() {
    return false;
};




var ObservableEvent = (function(){

    /**
     * This class is private - you can't create an event other than via Observable.
     * See Observable reference.
     * @class ObservableEvent
     * @private
     */
    var ObservableEvent = function(name, returnResult, autoTrigger, triggerFilter, filterContext) {

        var self    = this;

        self.name           = name;
        self.listeners      = [];
        self.map            = {};
        self.hash           = nextUid();
        self.uni            = '$$' + name + '_' + self.hash;
        self.suspended      = false;
        self.lid            = 0;

        if (typeof returnResult == "object" && returnResult !== null) {
            extend(self, returnResult, true, false);
        }
        else {
            self.returnResult = returnResult === undf ? null : returnResult; // first|last|all
            self.autoTrigger = autoTrigger;
            self.triggerFilter = triggerFilter;
            self.filterContext = filterContext;
        }
    };


    extend(ObservableEvent.prototype, {

        name: null,
        listeners: null,
        map: null,
        hash: null,
        uni: null,
        suspended: false,
        lid: null,
        returnResult: null,
        autoTrigger: null,
        lastTrigger: null,
        triggerFilter: null,
        filterContext: null,

        /**
         * Get event name
         * @method
         * @returns {string}
         */
        getName: function() {
            return this.name;
        },

        /**
         * @method
         */
        destroy: function() {
            var self        = this,
                k;

            for (k in self) {
                self[k] = null;
            }
        },

        /**
         * @method
         * @param {function} fn Callback function { @required }
         * @param {object} context Function's "this" object
         * @param {object} options See Observable's on()
         */
        on: function(fn, context, options) {

            if (!fn) {
                return null;
            }

            context     = context || null;
            options     = options || {};

            var self        = this,
                uni         = self.uni,
                uniContext  = context || fn;

            if (uniContext[uni] && !options.allowDupes) {
                return null;
            }

            var id      = ++self.lid,
                first   = options.first || false;

            uniContext[uni]  = id;


            var e = {
                fn:         fn,
                context:    context,
                uniContext: uniContext,
                id:         id,
                called:     0, // how many times the function was triggered
                limit:      0, // how many times the function is allowed to trigger
                start:      1, // from which attempt it is allowed to trigger the function
                count:      0, // how many attempts to trigger the function was made
                append:     null, // append parameters
                prepend:    null // prepend parameters
            };

            extend(e, options, true, false);

            if (first) {
                self.listeners.unshift(e);
            }
            else {
                self.listeners.push(e);
            }

            self.map[id] = e;

            if (self.autoTrigger && self.lastTrigger && !self.suspended) {
                var prevFilter = self.triggerFilter;
                self.triggerFilter = function(l){
                    if (l.id == id) {
                        return prevFilter ? prevFilter(l) !== false : true;
                    }
                    return false;
                };
                self.trigger.apply(self, self.lastTrigger);
                self.triggerFilter = prevFilter;
            }

            return id;
        },

        /**
         * @method
         * @param {function} fn Callback function { @required }
         * @param {object} context Function's "this" object
         * @param {object} options See Observable's on()
         */
        once: function(fn, context, options) {

            options = options || {};
            options.limit = 1;

            return this.on(fn, context, options);
        },

        /**
         * @method
         * @param {function} fn Callback function { @required }
         * @param {object} context Function's "this" object
         */
        un: function(fn, context) {

            var self        = this,
                inx         = -1,
                uni         = self.uni,
                listeners   = self.listeners,
                id;

            if (fn == parseInt(fn)) {
                id      = fn;
            }
            else {
                context = context || fn;
                id      = context[uni];
            }

            if (!id) {
                return false;
            }

            for (var i = 0, len = listeners.length; i < len; i++) {
                if (listeners[i].id == id) {
                    inx = i;
                    delete listeners[i].uniContext[uni];
                    break;
                }
            }

            if (inx == -1) {
                return false;
            }

            listeners.splice(inx, 1);
            delete self.map[id];
            return true;
        },

        /**
         * @method hasListener
         * @return bool
         */

        /**
         * @method
         * @param {function} fn Callback function { @required }
         * @param {object} context Function's "this" object
         * @return bool
         */
        hasListener: function(fn, context) {

            var self    = this,
                listeners   = self.listeners,
                id;

            if (fn) {

                context = context || fn;

                if (!isFunction(fn)) {
                    id  = fn;
                }
                else {
                    id  = context[self.uni];
                }

                if (!id) {
                    return false;
                }

                for (var i = 0, len = listeners.length; i < len; i++) {
                    if (listeners[i].id == id) {
                        return true;
                    }
                }

                return false;
            }
            else {
                return listeners.length > 0;
            }
        },


        /**
         * @method
         */
        removeAllListeners: function() {
            var self    = this,
                listeners = self.listeners,
                uni     = self.uni,
                i, len;

            for (i = 0, len = listeners.length; i < len; i++) {
                delete listeners[i].uniContext[uni];
            }
            self.listeners   = [];
            self.map         = {};
        },

        /**
         * @method
         */
        suspend: function() {
            this.suspended = true;
        },

        /**
         * @method
         */
        resume: function() {
            this.suspended = false;
        },


        _prepareArgs: function(l, triggerArgs) {
            var args;

            if (l.append || l.prepend) {
                args    = slice.call(triggerArgs);
                if (l.prepend) {
                    args    = l.prepend.concat(args);
                }
                if (l.append) {
                    args    = args.concat(l.append);
                }
            }
            else {
                args = triggerArgs;
            }

            return args;
        },

        /**
         * @method
         * @return {*}
         */
        trigger: function() {

            var self            = this,
                listeners       = self.listeners,
                returnResult    = self.returnResult,
                filter          = self.triggerFilter,
                filterContext   = self.filterContext,
                args;

            if (self.suspended) {
                return null;
            }

            if (self.autoTrigger) {
                self.lastTrigger = slice.call(arguments);
            }

            if (listeners.length == 0) {
                return null;
            }

            var ret     = returnResult == "all" || returnResult == "merge" ?
                          [] : null,
                q, l,
                res;

            if (returnResult == "first") {
                q = [listeners[0]];
            }
            else {
                // create a snapshot of listeners list
                q = slice.call(listeners);
            }

            // now if during triggering someone unsubscribes
            // we won't skip any listener due to shifted
            // index
            while (l = q.shift()) {

                // listener may already have unsubscribed
                if (!l || !self.map[l.id]) {
                    continue;
                }

                args = self._prepareArgs(l, arguments);

                if (filter && filter.call(filterContext, l, args, self) === false) {
                    continue;
                }

                if (l.filter && l.filter.apply(l.filterContext || l.context, args) === false) {
                    continue;
                }

                l.count++;

                if (l.count < l.start) {
                    continue;
                }

                res = l.fn.apply(l.context, args);

                l.called++;

                if (l.called == l.limit) {
                    self.un(l.id);
                }

                if (returnResult == "all") {
                    ret.push(res);
                }
                else if (returnResult == "merge" && res) {
                    ret = ret.concat(res);
                }
                else if (returnResult == "first") {
                    return res;
                }
                else if (returnResult == "nonempty" && res) {
                    return res;
                }
                else if (returnResult == "last") {
                    ret = res;
                }
                else if (returnResult == false && res === false) {
                    return false;
                }
            }

            if (returnResult) {
                return ret;
            }
        }
    }, true, false);


    return ObservableEvent;
}());




var Observable = (function(){


    /**
     * @description A javascript event system implementing two patterns - observable and collector.
     * @description Observable:
     * @code examples/observable.js
     *
     * @description Collector:
     * @code examples/collector.js
     *
     * @class Observable
     * @version 1.1
     * @author johann kuindji
     * @link https://github.com/kuindji/metaphorjs-observable
     */
    var Observable = function() {

        this.events = {};

    };


    extend(Observable.prototype, {



        /**
        * You don't have to call this function unless you want to pass params other than event name.
        * Normally, events are created automatically.
        *
        * @method createEvent
        * @access public
        * @param {string} name {
        *       Event name
        *       @required
        * }
        * @param {bool|string} returnResult {
        *   false -- return first 'false' result and stop calling listeners after that<br>
        *   "all" -- return all results as array<br>
        *   "merge" -- merge all results into one array (each result must be array)<br>
        *   "first" -- return result of the first handler (next listener will not be called)<br>
        *   "last" -- return result of the last handler (all listeners will be called)<br>
        * }
        * @param {bool} autoTrigger {
        *   once triggered, all future subscribers will be automatically called
        *   with last trigger params
        *   @code examples/autoTrigger.js
        * }
        * @param {function} triggerFilter {
        *   This function will be called each time event is triggered. Return false to skip listener.
        *   @code examples/triggerFilter.js
        *   @param {object} listener This object contains all information about the listener, including
        *       all data you provided in options while subscribing to the event.
        *   @param {[]} arguments
        *   @return {bool}
        * }
        * @return {ObservableEvent}
        */

        /**
         * @method createEvent
         * @param {string} name
         * @param {object} options {
         *  @type {string} returnResult
         *  @param {bool} autoTrigger
         *  @param {function} triggerFilter
         * }
         * @param {object} filterContext
         * @returns {ObservableEvent}
         */
        createEvent: function(name, returnResult, autoTrigger, triggerFilter, filterContext) {
            name = name.toLowerCase();
            var events  = this.events;
            if (!events[name]) {
                events[name] = new ObservableEvent(name, returnResult, autoTrigger, triggerFilter, filterContext);
            }
            return events[name];
        },

        /**
        * @method
        * @access public
        * @param {string} name Event name
        * @return {ObservableEvent|undefined}
        */
        getEvent: function(name) {
            name = name.toLowerCase();
            return this.events[name];
        },

        /**
        * Subscribe to an event or register collector function.
        * @method
        * @access public
        * @param {string} name {
        *       Event name
        *       @required
        * }
        * @param {function} fn {
        *       Callback function
        *       @required
        * }
        * @param {object} context "this" object for the callback function
        * @param {object} options {
        *       You can pass any key-value pairs in this object. All of them will be passed to triggerFilter (if
        *       you're using one).
        *       @type {bool} first {
        *           True to prepend to the list of handlers
        *           @default false
        *       }
        *       @type {number} limit {
        *           Call handler this number of times; 0 for unlimited
        *           @default 0
        *       }
        *       @type {number} start {
        *           Start calling handler after this number of calls. Starts from 1
        *           @default 1
        *       }
         *      @type {[]} append Append parameters
         *      @type {[]} prepend Prepend parameters
         *      @type {bool} allowDupes allow the same handler twice
        * }
        */
        on: function(name, fn, context, options) {
            name = name.toLowerCase();
            var events  = this.events;
            if (!events[name]) {
                events[name] = new ObservableEvent(name);
            }
            return events[name].on(fn, context, options);
        },

        /**
        * Same as {@link Observable.on}, but options.limit is forcefully set to 1.
        * @method
        * @access public
        */
        once: function(name, fn, context, options) {
            options     = options || {};
            options.limit = 1;
            return this.on(name, fn, context, options);
        },


        /**
        * Unsubscribe from an event
        * @method
        * @access public
        * @param {string} name Event name
        * @param {function} fn Event handler
        * @param {object} context If you called on() with context you must call un() with the same context
        */
        un: function(name, fn, context) {
            name = name.toLowerCase();
            var events  = this.events;
            if (!events[name]) {
                return;
            }
            events[name].un(fn, context);
        },

        /**
         * @method hasListener
         * @access public
         * @return bool
         */

        /**
        * @method hasListener
        * @access public
        * @param {string} name Event name { @required }
        * @return bool
        */

        /**
        * @method
        * @access public
        * @param {string} name Event name { @required }
        * @param {function} fn Callback function { @required }
        * @param {object} context Function's "this" object
        * @return bool
        */
        hasListener: function(name, fn, context) {
            var events = this.events;

            if (name) {
                name = name.toLowerCase();
                if (!events[name]) {
                    return false;
                }
                return events[name].hasListener(fn, context);
            }
            else {
                for (name in events) {
                    if (events[name].hasListener()) {
                        return true;
                    }
                }
                return false;
            }
        },


        /**
        * Remove all listeners from all events
        * @method removeAllListeners
        * @access public
        */

        /**
        * Remove all listeners from specific event
        * @method
        * @access public
        * @param {string} name Event name { @required }
        */
        removeAllListeners: function(name) {
            var events  = this.events;
            if (!events[name]) {
                return;
            }
            events[name].removeAllListeners();
        },

        /**
        * Trigger an event -- call all listeners.
        * @method
        * @access public
        * @param {string} name Event name { @required }
        * @param {*} ... As many other params as needed
        * @return mixed
        */
        trigger: function() {

            var name = arguments[0],
                events  = this.events;

            name = name.toLowerCase();

            if (!events[name]) {
                return null;
            }

            var e = events[name];
            return e.trigger.apply(e, slice.call(arguments, 1));
        },

        /**
        * Suspend an event. Suspended event will not call any listeners on trigger().
        * @method
        * @access public
        * @param {string} name Event name
        */
        suspendEvent: function(name) {
            name = name.toLowerCase();
            var events  = this.events;
            if (!events[name]) {
                return;
            }
            events[name].suspend();
        },

        /**
        * @method
        * @access public
        */
        suspendAllEvents: function() {
            var events  = this.events;
            for (var name in events) {
                events[name].suspend();
            }
        },

        /**
        * Resume suspended event.
        * @method
        * @access public
        * @param {string} name Event name
        */
        resumeEvent: function(name) {
            name = name.toLowerCase();
            var events  = this.events;
            if (!events[name]) {
                return;
            }
            events[name].resume();
        },

        /**
        * @method
        * @access public
        */
        resumeAllEvents: function() {
            var events  = this.events;
            for (var name in events) {
                events[name].resume();
            }
        },

        /**
         * @method
         * @access public
         * @param {string} name Event name
         */
        destroyEvent: function(name) {
            var events  = this.events;
            if (events[name]) {
                events[name].removeAllListeners();
                events[name].destroy();
                delete events[name];
            }
        },


        /**
        * Destroy observable
        * @method
        * @md-not-inheritable
        * @access public
        */
        destroy: function() {
            var self    = this,
                events  = self.events;

            for (var i in events) {
                self.destroyEvent(i);
            }

            for (i in self) {
                self[i] = null;
            }
        },

        /**
        * Although all methods are public there is getApi() method that allows you
        * extending your own objects without overriding "destroy" (which you probably have)
        * @code examples/api.js
        * @method
        * @md-not-inheritable
        * @returns object
        */
        getApi: function() {

            var self    = this;

            if (!self.api) {

                var methods = [
                        "createEvent", "getEvent", "on", "un", "once", "hasListener", "removeAllListeners",
                        "trigger", "suspendEvent", "suspendAllEvents", "resumeEvent",
                        "resumeAllEvents", "destroyEvent"
                    ],
                    api = {},
                    name;

                for(var i =- 1, l = methods.length;
                        ++i < l;
                        name = methods[i],
                        api[name] = bind(self[name], self)){}

                self.api = api;
            }

            return self.api;

        }
    }, true, false);


    return Observable;
}());



function levenshteinArray(from, to) {

    var m = from.length,
        n = to.length,
        D = new Array(m + 1),
        P = new Array(m + 1),
        i, j, c,
        route,
        cost,
        dist,
        ops = 0;

    if (m == n && m == 0) {
        return {
            changes: 0,
            distance: 0,
            prescription: []
        };
    }

    for (i = 0; i <= m; i++) {
        D[i]    = new Array(n + 1);
        P[i]    = new Array(n + 1);
        D[i][0] = i;
        P[i][0] = 'D';
    }
    for (i = 0; i <= n; i++) {
        D[0][i] = i;
        P[0][i] = 'I';
    }

    for (i = 1; i <= m; i++) {
        for (j = 1; j <= n; j++) {
            cost = (!equals(from[i - 1], to[j - 1])) ? 1 : 0;

            if(D[i][j - 1] < D[i - 1][j] && D[i][j - 1] < D[i - 1][j - 1] + cost) {
                //Insert
                D[i][j] = D[i][j - 1] + 1;
                P[i][j] = 'I';
            }
            else if(D[i - 1][j] < D[i - 1][j - 1] + cost) {
                //Delete
                D[i][j] = D[i - 1][j] + 1;
                P[i][j] = 'D';
            }
            else {
                //Replace or noop
                D[i][j] = D[i - 1][j - 1] + cost;
                if (cost == 1) {
                    P[i][j] = 'R';
                }
                else {
                    P[i][j] = '-';
                }
            }
        }
    }

    //Prescription
    route = [];
    i = m;
    j = n;

    do {
        c = P[i][j];
        route.push(c);
        if (c != '-') {
            ops++;
        }
        if(c == 'R' || c == '-') {
            i --;
            j --;
        }
        else if(c == 'D') {
            i --;
        }
        else {
            j --;
        }
    } while((i != 0) || (j != 0));

    dist = D[m][n];

    return {
        changes: ops / route.length,
        distance: dist,
        prescription: route.reverse()
    };
};
/**
 * @param {Function} fn
 * @param {Object} context
 * @param {[]} args
 * @param {number} timeout
 */
function async(fn, context, args, timeout) {
    return setTimeout(function(){
        fn.apply(context, args || []);
    }, timeout || 0);
};



var error = (function(){

    var listeners = [];

    var error = function error(e) {

        var i, l;

        for (i = 0, l = listeners.length; i < l; i++) {
            if (listeners[i][0].call(listeners[i][1], e) === false) {
                return;
            }
        }

        var stack = (e ? e.stack : null) || (new Error).stack;

        if (typeof console != strUndef && console.error) {
            async(function(){
                if (e) {
                    console.error(e);
                }
                if (stack) {
                    console.error(stack);
                }
            });
        }
        else {
            throw e;
        }
    };

    error.on = function(fn, context) {
        error.un(fn, context);
        listeners.push([fn, context]);
    };

    error.un = function(fn, context) {
        var i, l;
        for (i = 0, l = listeners.length; i < l; i++) {
            if (listeners[i][0] === fn && listeners[i][1] === context) {
                listeners.splice(i, 1);
                break;
            }
        }
    };

    return error;
}());




function emptyFn(){};



var functionFactory = function() {

    var REG_REPLACE_EXPR    = /((^|[^a-z0-9_$\]\)'"])|(this))(\.)([^0-9])/ig,
        REG_REPLACER        = "$2____.$5",

        f               = Function,
        fnBodyStart     = 'try {',
        getterBodyEnd   = ';} catch (thrownError) { return undefined; }',
        setterBodyEnd   = ';} catch (thrownError) { return undefined; }',

        getterCache     = {},
        getterCacheCnt  = 0,

        createGetter    = function createGetter(expr, returnAsCode) {

            try {
                if (!getterCache[expr] || returnAsCode) {
                    getterCacheCnt++;

                    var body = "".concat(
                        fnBodyStart,
                        'return ',
                        expr.replace(REG_REPLACE_EXPR, REG_REPLACER),
                        getterBodyEnd
                    );

                    if (returnAsCode) {
                        return "function(____) {" + body + "}";
                    }
                    else {
                        return getterCache[expr] = new f(
                            '____',
                            body
                        );
                    }
                }
                return getterCache[expr];
            }
            catch (thrownError){
                error(thrownError);
                return emptyFn;
            }
        },

        setterCache     = {},
        setterCacheCnt  = 0,

        createSetter    = function createSetter(expr, returnAsCode) {
            try {
                if (!setterCache[expr] || returnAsCode) {
                    setterCacheCnt++;
                    var code = expr.replace(REG_REPLACE_EXPR, REG_REPLACER),
                        body = "".concat(fnBodyStart, code, ' = $$$$', setterBodyEnd);

                    if (returnAsCode) {
                        return "function(____, $$$$) {" + body + "}";
                    }
                    else {
                        return setterCache[expr] = new f(
                            '____',
                            '$$$$',
                            body
                        );
                    }
                }
                return setterCache[expr];
            }
            catch (thrownError) {
                error(thrownError);
                return emptyFn;
            }
        },

        funcCache       = {},
        funcCacheCnt    = 0,

        createFunc      = function createFunc(expr, returnAsCode) {
            try {
                if (!funcCache[expr] || returnAsCode) {
                    funcCacheCnt++;

                    var body = "".concat(
                        fnBodyStart,
                        expr.replace(REG_REPLACE_EXPR, REG_REPLACER),
                        getterBodyEnd
                    );

                    if (returnAsCode) {
                        return "function(____) {" + body + "}";
                    }
                    else {
                        return funcCache[expr] = new f(
                            '____',
                            body
                        );
                    }
                }
                return funcCache[expr];
            }
            catch (thrownError) {
                error(thrownError);
                return emptyFn;
            }
        },

        resetCache = function() {
            getterCacheCnt >= 1000 && (getterCache = {});
            setterCacheCnt >= 1000 && (setterCache = {});
            funcCacheCnt >= 1000 && (funcCache = {});
        };

    return {
        createGetter: createGetter,
        createSetter: createSetter,
        createFunc: createFunc,
        resetCache: resetCache,
        enableResetCacheInterval: function() {
            setTimeout(resetCache, 10000);
        }
    };
}();



var createGetter = functionFactory.createGetter;




var createSetter = functionFactory.createSetter;



var Watchable = function(){

    var isStatic    = function(val) {

            if (!isString(val)) {
                return true;
            }

            var first   = val.substr(0, 1),
                last    = val.length - 1;

            if (first == '"' || first == "'") {
                if (val.indexOf(first, 1) == last) {
                    return val.substring(1, last);
                }
            }

            return false;
        },

        prescription2moves = function(a1, a2, prs, getKey) {

            var newPrs = [],
                i, l, k, action,
                map1 = {},
                prsi,
                a2i,
                index;

            for (i = 0, l = a1.length; i < l; i++) {
                k = getKey(a1[i]);
                if (k) {
                    map1[k] = i;
                }
            }

            a2i = 0;
            var used = {};

            for (prsi = 0, l = prs.length; prsi < l; prsi++) {

                action = prs[prsi];

                if (action == 'D') {
                    continue;
                }

                k = getKey(a2[a2i]);

                if (k != undf && used[k] !== true && (index = map1[k]) !== undf) {
                    newPrs.push(index);
                    used[k] = true;
                }
                else {
                    newPrs.push(action);
                }
                a2i++;
            }

            return newPrs;
        },


        observable;

    /**
     * @class Watchable
     */

    /**
     * @param {object} dataObj object containing observed property
     * @param {string} code property name or custom code
     * @param {function} fn optional listener
     * @param {object} fnScope optional listener's "this" object
     *  @subparam {*} userData optional data to pass to the listener
     *  @subparam {Namespace} namespace optional namespace to get filters and pipes from
     *  @subparam {*} mock do not calculate real values, use mock instead
     *  @subparam {function} predefined getter fn
     * @constructor
     */
    var Watchable   = function(dataObj, code, fn, fnScope, opt) {

        // userData, namespace, mock

        if (!observable) {
            observable  = new Observable;
        }

        var self    = this,
            id      = nextUid(),
            type;

        if (opt.namespace) {
            self.namespace = opt.namespace;
            self.nsGet = opt.namespace.get;
        }

        self.mock = opt.mock;
        self.origCode = code;

        if (opt.mock && code.indexOf(".") == -1) {
            type = "attr";
        }
        else if (code && dataObj) {
            type    = dataObj.hasOwnProperty(code) ? "attr" : "expr";
        }
        else if (code && !dataObj) {
            type = "expr";
        }


        if (fn) {
            observable.on(id, fn, fnScope || this, {
                append: [opt.userData],
                allowDupes: true
            });
        }

        if (type == "expr") {
            code        = self._parsePipes(code, dataObj, true);
            code        = self._parsePipes(code, dataObj, false);

            if (self.inputPipes || self.pipes) {
                code    = normalizeExpr(dataObj, code);
                type    = dataObj.hasOwnProperty(code) ? "attr" : "expr";
            }

            if (self.staticValue = isStatic(code)) {
                type    = "static";
            }
        }

        self.userData   = opt.userData;
        self.code       = code;
        self.id         = id;
        self.type       = type;
        self.obj        = dataObj;

        if (type == "expr") {
            self.getterFn   = opt.getterFn || createGetter(code);
        }

        if (type != "static" || self.pipes) {
            self.curr = self.curr || self._getValue();
            self.currCopy = isPrimitive(self.curr) ? self.curr : copy(self.curr);
        }
        else {
            self.check = returnFalse;
            self.curr = self.prev = self.staticValue;
        }
    };

    extend(Watchable.prototype, {

        namespace: null,
        nsGet: null,
        staticValue: null,
        origCode: null,
        code: null,
        getterFn: null,
        setterFn: null,
        id: null,
        type: null,
        obj: null,
        itv: null,
        curr: null,
        currCopy: null,
        prev: null,
        unfilteredCopy: null,
        unfiltered: null,
        pipes: null,
        inputPipes: null,
        lastSetValue: null,
        userData: null,
        obsrvDelegate: null,
        obsrvChanged: false,
        forcePipes: false,

        mock: false,

        // means that pipes always return the same output given the same input.
        // if you want to mark pipe as undeterministic - put ? before it
        // {{ .somevalue | ?pipe }}
        // then value will be passed through all pipes on each check.
        deterministic: true,

        getConfig: function() {
            var getterFn = null;
            if (this.type == "expr") {
                getterFn   = createGetter(this.code, true);
            }
            return {
                type: this.type,
                code: this.origCode,
                withoutPipes: this.code,
                getter: getterFn,
                hasPipes: this.pipes !== null,
                hasInputPipes: this.inputPipes !== null
            }
        },

        _indexArrayItems: function(a) {

            var key = '$$' + this.id,
                i, l, item;

            if (a) {
                for (i = 0, l = a.length; i < l; i++) {
                    item = a[i];
                    if (item && !isPrimitive(item) && !item[key]) {
                        item[key] = nextUid();
                    }
                }
            }
        },


        _parsePipes: function(text, dataObj, input) {

            var self        = this,
                separator   = input ? ">>" : "|",
                propName    = input ? "inputPipes" : "pipes",
                cb          = input ? self.onInputParamChange : self.onPipeParamChange;

            if (text.indexOf(separator) == -1) {
                return text;
            }

            var parts   = split(text, separator),
                ret     = input ? parts.pop() : parts.shift(),
                pipes   = [],
                pipe,
                i, l;

            for(i = 0, l = parts.length; i < l; i++) {
                pipe = split(trim(parts[i]), ':');
                self._addPipe(pipes, pipe, dataObj, cb);
            }

            if (pipes.length) {
                self[propName] = pipes;
            }

            return trim(ret);
        },

        _addPipe: function(pipes, pipe, dataObj, onParamChange) {

            var self    = this,
                name    = pipe.shift(),
                fn      = null,
                ws      = [],
                fchar   = name.substr(0,1),
                opt     = {
                    neg: false,
                    dblneg: false,
                    undeterm: false
                },
                i, l;

            if (name.substr(0,2) == "!!") {
                name = name.substr(2);
                opt.dblneg = true;
            }
            else {
                if (fchar == "!") {
                    name = name.substr(1);
                    opt.neg = true;
                }
                else if (fchar == "?") {
                    name = name.substr(1);
                    opt.undeterm = true;
                }
            }

            if (self.mock) {
                fn      = function(){};
            }
            else {
                if (self.nsGet) {
                    fn = self.nsGet("filter." + name, true);
                }
                if (!fn) {
                    fn = (typeof window != "undefined" ? window[name] : null) || dataObj[name];
                }
            }

            if (isFunction(fn)) {

                for (i = -1, l = pipe.length; ++i < l;
                     ws.push(create(dataObj, pipe[i], onParamChange, self, null, self.namespace, self.mock))) {}

                if (fn.$undeterministic) {
                    opt.undeterm = true;
                }

                pipes.push([fn, pipe, ws, opt]);

                if (opt.undeterm) {
                    self.deterministic = false;
                }
            }
        },

        _getRawValue: function() {
            var self    = this,
                val;

            if (self.mock) {
                return self.mock;
            }

            switch (self.type) {
                case "static":
                    val = self.staticValue;
                    break;

                case "attr":
                    val = self.obj[self.code];
                    break;
                case "expr":
                    val = self.getterFn(self.obj);
                    break;
                case "object":
                    val = self.obj;
                    break;
            }

            if (isArray(val)) {
                if (!self.inputPipes) {
                    self._indexArrayItems(val);
                }
                val = val.slice();
            }

            return val;
        },

        _getValue: function(useUnfiltered) {

            var self    = this,
                val     = useUnfiltered ? self.unfiltered : self._getRawValue();

            self.unfiltered = val;

            if (self.mock) {
                val = self.mock;
            }
            else {
                val = self._runThroughPipes(val, self.pipes);
            }

            return val;
        },


        _runThroughPipes: function(val, pipes) {

            if (pipes) {
                var j,
                    args,
                    exprs,
                    self    = this,
                    jlen    = pipes.length,
                    dataObj = self.obj,
                    opt,
                    z, zl;

                for (j = 0; j < jlen; j++) {
                    exprs   = pipes[j][1];
                    opt     = pipes[j][3];
                    args    = [];
                    for (z = -1, zl = exprs.length; ++z < zl;
                         args.push(evaluate(exprs[z], dataObj))){}

                    args.unshift(dataObj);
                    args.unshift(val);

                    val     = pipes[j][0].apply(null, args);

                    if (opt.neg) {
                        val = !val;
                    }
                    else if (opt.dblneg) {
                        val = !!val;
                    }
                }
            }

            return val;
        },

        /**
         * Subscribe to the change event
         * @method
         * @param {function} fn listener
         * @param {object} fnScope listener's "this" object
         * @param {object} options see Observable's options in on()
         */
        subscribe: function(fn, fnScope, options) {
            observable.on(this.id, fn, fnScope, options);
        },

        /**
         * Unsubscribe from change event
         * @param {function} fn
         * @param {object} fnScope
         * @returns {*}
         */
        unsubscribe: function(fn, fnScope) {
            return observable.un(this.id, fn, fnScope);
        },

        /**
         * @returns {boolean}
         */
        hasPipes: function() {
            return this.pipes !== null;
        },

        /**
         * @returns {boolean}
         */
        hasInputPipes: function() {
            return this.inputPipes != null;
        },

        /**
         * Get current value (filtered and via executing the code)
         * @returns {*}
         */
        getValue: function() {
            return this._getValue();
        },

        /**
         * Get last calculated value before filters were applied
         * @returns {*}
         */
        getUnfilteredValue: function() {
            return this.unfiltered || this.curr;
        },

        /**
         * Get previous value
         * @returns {*}
         */
        getPrevValue: function() {
            return this.prev;
        },

        /**
         * Get last calculated value (with filters and pipes)
         * @returns {*}
         */
        getLastValue: function() {
            return this.curr;
        },

        /**
         * Get simple array change prescription
         * @param {[]} from optional
         * @param {[]} to optional
         * @returns {[]}
         */
        getPrescription: function(from, to) {
            to = to || this._getValue();
            return levenshteinArray(from || [], to || []).prescription;
        },

        /**
         * Get array change prescription with moves
         * @param {[]} from
         * @param {function} trackByFn
         * @param {[]} to
         * @returns {[]}
         */
        getMovePrescription: function(from, trackByFn, to) {

            var self    = this;
                to      = to || self._getValue();

            return prescription2moves(
                from || [],
                to || [],
                self.getPrescription(from || [], to || []),
                trackByFn
            );
        },

        /**
         * Set value to observed property
         * @param {*} val
         */
        setValue: function(val) {

            var self    = this,
                type    = self.type;

            self.lastSetValue = val;

            val = self._runThroughPipes(val, self.inputPipes);

            if (type == "attr") {
                self.obj[self.code] = val;
            }
            else if (type == "expr") {

                if (!self.setterFn) {
                    self.setterFn   = createSetter(self.code);
                }

                self.setterFn(self.obj, val);
            }
            else if (type == "object") {
                self.obj = val;
            }
        },

        onInputParamChange: function(val, prev, async) {
            this.setValue(this.lastSetValue);
            if (async) {
                this.checkAll();
            }
        },

        onPipeParamChange: function(val, prev, async) {
            this.forcePipes = true;
            this.check();
            this.forcePipes = false;
        },

        /*onObserverChange: function(changes) {

            var self = this,
                code = self.code,
                i, l,
                change;

            for (i = 0, l = changes.length; i < l; i++) {
                change = changes[i];
                if (change.name == code) {
                    self.obsrvChanged = true;
                    break;
                }
            }
        },*/

        _check: function(async) {

            var self    = this,
                val;

            if (self.deterministic && self.pipes && !self.forcePipes) {
                if (!self._checkUnfiltered()) {
                    return false;
                }
                else {
                    // code smell.
                    // useUnfiltered param implies that
                    // _checkUnfiltered has been called.
                    val = self._getValue(true);
                }
            }
            else {
                val     = self._getValue();
            }

            var curr    = self.currCopy,
                eq      = equals(curr, val);

            //if (self.obsrvDelegate) {
            //    eq      = !self.obsrvChanged;
            //}
            //else {
            //    eq      = equals(curr, val);
            //}

            if (!eq) {
                self.curr = val;
                self.prev = curr;
                self.currCopy = isPrimitive(val) ? val : copy(val);
                //self.obsrvChanged = false;
                observable.trigger(self.id, val, curr, async);
                return true;
            }

            return false;
        },

        _checkUnfiltered: function() {

            var self    = this,
                val     = self._getRawValue(),
                curr    = self.unfilteredCopy,
                eq      = equals(curr, val);

            if (!eq) {
                self.unfiltered = val;
                self.unfilteredCopy = isPrimitive(val) ? val : copy(val);
                return true;
            }

            return false;
        },

        /**
         * Check for changes
         * @param {bool} async
         * @returns {bool}
         */
        check: function(async) {
            return this._check(async);
        },

        /**
         * Check all observed properties for changes
         * @returns {bool}
         */
        checkAll: function() {
            return this.obj.$$watchers.$checkAll();
        },

        /**
         * Get last calculated value (with filters and pipes)
         * @returns {*}
         */
        getLastResult: function() {
            return this.curr;
        },

        /**
         * Set time interval to check for changes periodically
         * @param {number} ms
         */
        setInterval: function(ms) {

            var self    = this;
            if (self.itv) {
                self.clearInterval();
            }
            self.itv = setInterval(function(){self.check();}, ms);
        },

        /**
         * Clear check interval
         * @method
         */
        clearInterval: function() {
            var self    = this;
            if (self.itv) {
                clearInterval(self.itv);
                self.itv = null;
            }
        },

        /**
         * Unsubscribe and destroy if there are no other listeners
         * @param {function} fn
         * @param {object} fnScope
         * @returns {boolean} true if destroyed
         */
        unsubscribeAndDestroy: function(fn, fnScope) {

            var self    = this,
                id      = self.id;

            if (fn) {
                observable.un(id, fn, fnScope);
            }

            if (!observable.hasListener(id)) {
                self.destroy();
                return true;
            }

            return false;
        },

        /**
         * @method
         */
        destroy: function() {

            var self    = this,
                pipes   = self.pipes,
                ipipes  = self.inputPipes,
                i, il,
                j, jl,
                ws;

            if (self.itv) {
                self.clearInterval();
            }

            if (pipes) {
                for (i = -1, il = pipes.length; ++i < il;) {
                    ws = pipes[i][2];
                    for (j = -1, jl = ws.length; ++j < jl;) {
                        ws[j].unsubscribeAndDestroy(self.check, self);
                    }
                }
            }
            if (ipipes) {
                for (i = -1, il = ipipes.length; ++i < il;) {
                    ws = ipipes[i][2];
                    for (j = -1, jl = ws.length; ++j < jl;) {
                        ws[j].unsubscribeAndDestroy(self.onInputParamChange, self);
                    }
                }
            }

            //if (self.obsrvDelegate) {
            //    Object.unobserve(self.obj, self.obsrvDelegate);
            //}

            if (self.obj) {
                //delete self.obj.$$watchers.$codes[self.origCode];
                self.obj.$$watchers.$codes[self.origCode] = null;
            }

            observable.destroyEvent(self.id);

            for (i in self) {
                if (self.hasOwnProperty(i)){
                    self[i] = null;
                }
            }
        }
    }, true, false);


    /**
     * @method
     * @static
     * @param {object} obj
     * @param {string} code
     * @param {function} fn
     * @param {object} fnScope
     * @param {object} opt
     * @returns {Watchable}
     */
    var create = function(obj, code, fn, fnScope, opt) {

            //userData, namespace, mock
            opt = opt || {};
            code = code || "";
            code = normalizeExpr(obj, trim(code), opt.mock);

            if (obj) {
                if (!obj.$$watchers) {
                    obj.$$watchers = {
                        $codes: {},
                        $checkAll: function() {

                            var ws      = this.$codes,
                                i,
                                changes = 0;

                            for (i in ws) {

                                if (ws[i] && ws[i].check()) {
                                    changes++;
                                }
                            }

                            return changes;
                        },
                        $destroyAll: function() {

                            var ws      = this.$codes,
                                i;

                            for (i in ws) {
                                if (ws[i]) {
                                    ws[i].destroy();
                                    //delete ws[i];
                                    ws[i] = null;
                                }
                            }
                        }
                    };
                }

                if (obj.$$watchers.$codes[code]) {
                    obj.$$watchers.$codes[code].subscribe(fn, fnScope,
                        {append: [opt.userData || null], allowDupes: true});
                }
                else {
                    obj.$$watchers.$codes[code] = new Watchable(
                        obj, code, fn, fnScope, opt);
                }

                return obj.$$watchers.$codes[code];
            }
            else {
                return new Watchable(obj, code, fn, fnScope, opt);
            }
        },

        /**
         * @method
         * @static
         * @param {object} obj
         * @param {string} code
         * @param {function} fn
         * @param {object} fnScope
         */
        unsubscribeAndDestroy = function(obj, code, fn, fnScope) {
            code = trim(code);

            var ws = obj.$$watchers ? obj.$$watchers.$codes : null;

            if (ws && ws[code] && ws[code].unsubscribeAndDestroy(fn, fnScope)) {
                //delete ws[code];
                ws[code] = null;
            }
        },

        /**
         * Normalize expression
         * @param {object} dataObj
         * @param {string} expr
         * @param {*} mockMode
         * @returns {string}
         */
        normalizeExpr = function(dataObj, expr, mockMode) {

            // in mock mode we can't check dataObj for having
            // a property. dataObj does not exists in this
            // context
            if (mockMode) {
                var match;
                if ((match = expr.match(/(^|this)\.([A-Z0-9_$]+)$/i)) !== null) {
                    return match[2];
                }
                else {
                    return expr;
                }
            }

            if (dataObj && expr) {
                if (dataObj.hasOwnProperty(expr)) {
                    return expr;
                }
                var prop;
                if (expr.charAt(0) == '.') {
                    prop = expr.substr(1);
                    if (dataObj.hasOwnProperty(prop)) {
                        return prop;
                    }
                }
                else if (expr.substr(0, 5) == "this.") {
                    prop = expr.substr(5);
                    if (dataObj.hasOwnProperty(prop)) {
                        return prop;
                    }
                }
            }
            return expr;
        },

        /**
         * Evaluate code against object
         * @param {string} expr
         * @param {object} scope
         * @returns {*}
         */
        evaluate    = function(expr, scope) {
            var val;
            if (val = isStatic(expr)) {
                return val;
            }
            return createGetter(expr)(scope);
        };



    Watchable.create = create;
    Watchable.unsubscribeAndDestroy = unsubscribeAndDestroy;
    Watchable.normalizeExpr = normalizeExpr;
    Watchable.eval = evaluate;

    return Watchable;
}();







var createWatchable = Watchable.create;

function isNull(value) {
    return value === null;
};



function isObject(value) {
    if (value === null || typeof value != "object") {
        return false;
    }
    var vt = varType(value);
    return vt > 2 || vt == -1;
};



var Cache = function(){

    var globalCache;

    /**
     * @class Cache
     * @param {bool} cacheRewritable
     * @constructor
     */
    var Cache = function(cacheRewritable) {

        var storage = {},

            finders = [];

        if (arguments.length == 0) {
            cacheRewritable = true;
        }

        return {

            /**
             * @param {function} fn
             * @param {object} context
             * @param {bool} prepend
             */
            addFinder: function(fn, context, prepend) {
                finders[prepend? "unshift" : "push"]({fn: fn, context: context});
            },

            /**
             * @method
             * @param {string} name
             * @param {*} value
             * @param {bool} rewritable
             * @returns {*} value
             */
            add: function(name, value, rewritable) {

                if (storage[name] && storage[name].rewritable === false) {
                    return storage[name];
                }

                storage[name] = {
                    rewritable: typeof rewritable != strUndef ? rewritable : cacheRewritable,
                    value: value
                };

                return value;
            },

            /**
             * @method
             * @param {string} name
             * @returns {*}
             */
            get: function(name) {

                if (!storage[name]) {
                    if (finders.length) {

                        var i, l, res,
                            self = this;

                        for (i = 0, l = finders.length; i < l; i++) {

                            res = finders[i].fn.call(finders[i].context, name, self);

                            if (res !== undf) {
                                return self.add(name, res, true);
                            }
                        }
                    }

                    return undf;
                }

                return storage[name].value;
            },

            /**
             * @method
             * @param {string} name
             * @returns {*}
             */
            remove: function(name) {
                var rec = storage[name];
                if (rec && rec.rewritable === true) {
                    delete storage[name];
                }
                return rec ? rec.value : undf;
            },

            /**
             * @method
             * @param {string} name
             * @returns {boolean}
             */
            exists: function(name) {
                return !!storage[name];
            },

            /**
             * @param {function} fn
             * @param {object} context
             */
            eachEntry: function(fn, context) {
                var k;
                for (k in storage) {
                    fn.call(context, storage[k].value, k);
                }
            },

            /**
             * @method
             */
            destroy: function() {

                var self = this;

                if (self === globalCache) {
                    globalCache = null;
                }

                storage = null;
                cacheRewritable = null;

                self.add = null;
                self.get = null;
                self.destroy = null;
                self.exists = null;
                self.remove = null;
            }
        };
    };

    /**
     * @method
     * @static
     * @returns {Cache}
     */
    Cache.global = function() {

        if (!globalCache) {
            globalCache = new Cache(true);
        }

        return globalCache;
    };

    return Cache;

}();





/**
 * @class Namespace
 * @code ../examples/main.js
 */
var Namespace = function(){


    /**
     * @param {Object} root optional; usually window or global
     * @param {String} rootName optional. If you want custom object to be root and
     * this object itself is the first level of namespace
     * @param {Cache} cache optional
     * @constructor
     */
    var Namespace   = function(root, rootName, cache) {

        cache       = cache || new Cache(false);
        var self    = this,
            rootL   = rootName ? rootName.length : null;

        if (!root) {
            if (typeof global != strUndef) {
                root    = global;
            }
            else {
                root    = window;
            }
        }

        var normalize   = function(ns) {
            if (ns && rootName && ns.substr(0, rootL) != rootName) {
                return rootName + "." + ns;
            }
            return ns;
        };

        var parseNs     = function(ns) {

            ns = normalize(ns);

            var tmp     = ns.split("."),
                i,
                last    = tmp.pop(),
                parent  = tmp.join("."),
                len     = tmp.length,
                name,
                current = root;


            if (cache[parent]) {
                return [cache[parent], last, ns];
            }

            if (len > 0) {
                for (i = 0; i < len; i++) {

                    name    = tmp[i];

                    if (rootName && i == 0 && name == rootName) {
                        current = root;
                        continue;
                    }

                    if (current[name] === undf) {
                        current[name]   = {};
                    }

                    current = current[name];
                }
            }

            return [current, last, ns];
        };

        /**
         * Get namespace/cache object
         * @method
         * @param {string} ns
         * @param {bool} cacheOnly
         * @returns {*}
         */
        var get       = function(ns, cacheOnly) {

            ns = normalize(ns);

            if (cache.exists(ns)) {
                return cache.get(ns);
            }

            if (cacheOnly) {
                return undf;
            }

            var tmp     = ns.split("."),
                i,
                len     = tmp.length,
                name,
                current = root;

            for (i = 0; i < len; i++) {

                name    = tmp[i];

                if (rootName && i == 0 && name == rootName) {
                    current = root;
                    continue;
                }

                if (current[name] === undf) {
                    return undf;
                }

                current = current[name];
            }

            if (current) {
                cache.add(ns, current);
            }

            return current;
        };

        /**
         * Register item
         * @method
         * @param {string} ns
         * @param {*} value
         */
        var register    = function(ns, value) {

            var parse   = parseNs(ns),
                parent  = parse[0],
                name    = parse[1];

            if (isObject(parent) && parent[name] === undf) {

                parent[name]        = value;
                cache.add(parse[2], value);
            }

            return value;
        };

        /**
         * Item exists
         * @method
         * @param {string} ns
         * @returns boolean
         */
        var exists      = function(ns) {
            return get(ns, true) !== undf;
        };

        /**
         * Add item only to the cache
         * @function add
         * @param {string} ns
         * @param {*} value
         */
        var add = function(ns, value) {

            ns = normalize(ns);
            cache.add(ns, value);
            return value;
        };

        /**
         * Remove item from cache
         * @method
         * @param {string} ns
         */
        var remove = function(ns) {
            ns = normalize(ns);
            cache.remove(ns);
        };

        /**
         * Make alias in the cache
         * @method
         * @param {string} from
         * @param {string} to
         */
        var makeAlias = function(from, to) {

            from = normalize(from);
            to = normalize(to);

            var value = cache.get(from);

            if (value !== undf) {
                cache.add(to, value);
            }
        };

        /**
         * Destroy namespace and all classes in it
         * @method
         */
        var destroy     = function() {

            var self = this,
                k;

            if (self === globalNs) {
                globalNs = null;
            }

            cache.eachEntry(function(entry){
                if (entry && entry.$destroy) {
                    entry.$destroy();
                }
            });

            cache.destroy();
            cache = null;

            for (k in self) {
                self[k] = null;
            }
        };

        self.register   = register;
        self.exists     = exists;
        self.get        = get;
        self.add        = add;
        self.remove     = remove;
        self.normalize  = normalize;
        self.makeAlias  = makeAlias;
        self.destroy    = destroy;
    };

    Namespace.prototype.register = null;
    Namespace.prototype.exists = null;
    Namespace.prototype.get = null;
    Namespace.prototype.add = null;
    Namespace.prototype.remove = null;
    Namespace.prototype.normalize = null;
    Namespace.prototype.makeAlias = null;
    Namespace.prototype.destroy = null;

    var globalNs;

    /**
     * Get global namespace
     * @method
     * @static
     * @returns {Namespace}
     */
    Namespace.global = function() {
        if (!globalNs) {
            globalNs = new Namespace;
        }
        return globalNs;
    };

    return Namespace;

}();




var ns  = new Namespace(MetaphorJs, "MetaphorJs");



var instantiate = function(fn, args) {

    var Temp = function(){},
        inst, ret;

    Temp.prototype  = fn.prototype;
    inst            = new Temp;
    ret             = fn.apply(inst, args);

    // If an object has been returned then return it otherwise
    // return the original instance.
    // (consistent with behaviour of the new operator)
    return isObject(ret) || ret === false ? ret : inst;

};
/**
 * Function interceptor
 * @param {function} origFn
 * @param {function} interceptor
 * @param {object|null} context
 * @param {object|null} origContext
 * @param {string} when
 * @param {bool} replaceValue
 * @returns {Function}
 */
function intercept(origFn, interceptor, context, origContext, when, replaceValue) {

    when = when || "before";

    return function() {

        var intrRes,
            origRes;

        if (when == "instead") {
            return interceptor.apply(context || origContext, arguments);
        }
        else if (when == "before") {
            intrRes = interceptor.apply(context || origContext, arguments);
            origRes = intrRes !== false ? origFn.apply(origContext || context, arguments) : null;
        }
        else {
            origRes = origFn.apply(origContext || context, arguments);
            intrRes = interceptor.apply(context || origContext, arguments);
        }

        return replaceValue ? intrRes : origRes;
    };
};



var Class = function(){


    var proto   = "prototype",

        constr  = "$constructor",

        $constr = function $constr() {
            var self = this;
            if (self.$super && self.$super !== emptyFn) {
                self.$super.apply(self, arguments);
            }
        },

        wrapPrototypeMethod = function wrapPrototypeMethod(parent, k, fn) {

            var $super = parent[proto][k] || (k == constr ? parent : emptyFn) || emptyFn;

            return function() {
                var ret,
                    self    = this,
                    prev    = self.$super;

                if (self.$destroyed) {
                    self.$super = null;
                    return null;
                }

                self.$super     = $super;
                ret             = fn.apply(self, arguments);
                self.$super     = prev;

                return ret;
            };
        },

        preparePrototype = function preparePrototype(prototype, cls, parent, onlyWrap) {
            var k, ck, pk, pp = parent[proto];

            for (k in cls) {
                if (cls.hasOwnProperty(k)) {
                    
                    pk = pp[k];
                    ck = cls[k];

                    prototype[k] = isFunction(ck) && (!pk || isFunction(pk)) ?
                                    wrapPrototypeMethod(parent, k, ck) :
                                    ck;
                }
            }

            if (onlyWrap) {
                return;
            }

            prototype.$plugins      = null;
            prototype.$pluginMap    = null;

            if (pp.$beforeInit) {
                prototype.$beforeInit = pp.$beforeInit.slice();
                prototype.$afterInit = pp.$afterInit.slice();
                prototype.$beforeDestroy = pp.$beforeDestroy.slice();
                prototype.$afterDestroy = pp.$afterDestroy.slice();
            }
            else {
                prototype.$beforeInit = [];
                prototype.$afterInit = [];
                prototype.$beforeDestroy = [];
                prototype.$afterDestroy = [];
            }
        },
        
        mixinToPrototype = function(prototype, mixin) {
            
            var k;
            for (k in mixin) {
                if (mixin.hasOwnProperty(k)) {
                    if (k == "$beforeInit") {
                        prototype.$beforeInit.push(mixin[k]);
                    }
                    else if (k == "$afterInit") {
                        prototype.$afterInit.push(mixin[k]);
                    }
                    else if (k == "$beforeDestroy") {
                        prototype.$beforeDestroy.push(mixin[k]);
                    }
                    else if (k == "$afterDestroy") {
                        prototype.$afterDestroy.push(mixin[k]);
                    }
                    else if (!prototype[k]) {
                        prototype[k] = mixin[k];
                    }
                }
            }
        };


    var Class = function(ns){

        if (!ns) {
            ns = new Namespace;
        }

        var createConstructor = function(className) {

            return function() {

                var self    = this,
                    before  = [],
                    after   = [],
                    args    = arguments,
                    newArgs,
                    i, l,
                    plugins, plugin,
                    pmap,
                    plCls;

                if (!self) {
                    throw "Must instantiate via new: " + className;
                }

                self.$plugins   = [];

                newArgs = self[constr].apply(self, arguments);

                if (newArgs && isArray(newArgs)) {
                    args = newArgs;
                }

                plugins = self.$plugins;
                pmap    = self.$pluginMap = {};

                for (i = -1, l = self.$beforeInit.length; ++i < l;
                     before.push([self.$beforeInit[i], self])) {}

                for (i = -1, l = self.$afterInit.length; ++i < l;
                     after.push([self.$afterInit[i], self])) {}

                if (plugins && plugins.length) {

                    for (i = 0, l = plugins.length; i < l; i++) {

                        plugin = plugins[i];

                        if (isString(plugin)) {
                            plCls = plugin;
                            plugin = ns.get(plugin, true);
                            if (!plugin) {
                                throw plCls + " not found";
                            }
                        }

                        plugin = new plugin(self, args);

                        pmap[plugin.$class] = plugin;

                        if (plugin.$beforeHostInit) {
                            before.push([plugin.$beforeHostInit, plugin]);
                        }
                        if (plugin.$afterHostInit) {
                            after.push([plugin.$afterHostInit, plugin]);
                        }

                        plugins[i] = plugin;
                    }
                }

                for (i = -1, l = before.length; ++i < l;
                     before[i][0].apply(before[i][1], args)){}

                if (self.$init) {
                    self.$init.apply(self, args);
                }

                for (i = -1, l = after.length; ++i < l;
                     after[i][0].apply(after[i][1], args)){}

            };
        };


        /**
         * @class BaseClass
         * @description All classes defined with MetaphorJs.Class extend this class.
         * You can access it via <code>cs.BaseClass</code>. Basically,
         * <code>cs.define({});</code> is the same as <code>cs.BaseClass.$extend({})</code>.
         * @constructor
         */
        var BaseClass = function() {

        };

        extend(BaseClass.prototype, {

            $class: null,
            $extends: null,
            $plugins: null,
            $pluginMap: null,
            $mixins: null,

            $destroyed: false,
            $destroying: false,

            $constructor: emptyFn,
            $init: emptyFn,
            $beforeInit: [],
            $afterInit: [],
            $beforeDestroy: [],
            $afterDestroy: [],

            /**
             * Get class name
             * @method
             * @returns {string}
             */
            $getClass: function() {
                return this.$class;
            },

            /**
             * @param {string} cls
             * @returns {boolean}
             */
            $is: function(cls) {
                return isInstanceOf(this, cls);
            },

            /**
             * Get parent class name
             * @method
             * @returns {string | null}
             */
            $getParentClass: function() {
                return this.$extends;
            },

            /**
             * Intercept method
             * @method
             * @param {string} method Intercepted method name
             * @param {function} fn function to call before or after intercepted method
             * @param {object} newContext optional interceptor's "this" object
             * @param {string} when optional, when to call interceptor before | after | instead; default "before"
             * @param {bool} replaceValue optional, return interceptor's return value or original method's; default false
             * @returns {function} original method
             */
            $intercept: function(method, fn, newContext, when, replaceValue) {
                var self = this,
                    orig = self[method];
                self[method] = intercept(orig || emptyFn, fn, newContext || self, self, when, replaceValue);
                return orig || emptyFn;
            },

            /**
             * Implement new methods or properties on instance
             * @param {object} methods
             */
            $implement: function(methods) {
                var $self = this.constructor;
                if ($self && $self.$parent) {
                    preparePrototype(this, methods, $self.$parent, true);
                }
            },

            /**
             * Does this instance have a plugin
             * @param cls
             * @returns {bool}
             */
            $hasPlugin: function(cls) {
                return !!this.$pluginMap[ns.normalize(cls)];
            },

            /**
             * @param {string} cls
             * @returns {object|null}
             */
            $getPlugin: function(cls) {
                return this.$pluginMap[ns.normalize(cls)] || null;
            },

            /**
             * @param {function} fn
             * @returns {Function}
             */
            $bind: function(fn) {
                var self = this;
                return function() {
                    if (self.$isDestroyed()) {
                        return;
                    }
                    return fn.apply(self, arguments);
                };
            },

            /**
             * @return bool
             */
            $isDestroyed: function() {
                return self.$destroying || self.$destroyed;
            },

            /**
             * Destroy instance
             * @method
             */
            $destroy: function() {

                var self    = this,
                    before  = self.$beforeDestroy,
                    after   = self.$afterDestroy,
                    plugins = self.$plugins,
                    i, l, res;

                if (self.$destroying || self.$destroyed) {
                    return;
                }

                self.$destroying = true;

                for (i = -1, l = before.length; ++i < l;
                     before[i].apply(self, arguments)){}

                for (i = 0, l = plugins.length; i < l; i++) {
                    if (plugins[i].$beforeHostDestroy) {
                        plugins[i].$beforeHostDestroy.call(plugins[i], arguments);
                    }
                }

                res = self.destroy.apply(self, arguments);

                for (i = -1, l = before.length; ++i < l;
                     after[i].apply(self, arguments)){}

                for (i = 0, l = plugins.length; i < l; i++) {
                    plugins[i].$destroy.apply(plugins[i], arguments);
                }

                if (res !== false) {
                    for (i in self) {
                        if (self.hasOwnProperty(i)) {
                            self[i] = null;
                        }
                    }
                }

                self.$destroying = false;
                self.$destroyed = true;
            },

            destroy: function(){}
        });

        BaseClass.$self = BaseClass;

        /**
         * Create an instance of current class. Same as cs.factory(name)
         * @method
         * @static
         * @code var myObj = My.Class.$instantiate(arg1, arg2, ...);
         * @returns {object} class instance
         */
        BaseClass.$instantiate = function() {

            var cls = this,
                args = arguments,
                cnt = args.length;

            // lets make it ugly, but without creating temprorary classes and leaks.
            // and fallback to normal instantiation.

            switch (cnt) {
                case 0:
                    return new cls;
                case 1:
                    return new cls(args[0]);
                case 2:
                    return new cls(args[0], args[1]);
                case 3:
                    return new cls(args[0], args[1], args[2]);
                case 4:
                    return new cls(args[0], args[1], args[2], args[3]);
                default:
                    return instantiate(cls, args);
            }
        };

        /**
         * Override class methods (on prototype level, not on instance level)
         * @method
         * @static
         * @param {object} methods
         */
        BaseClass.$override = function(methods) {
            var $self = this.$self,
                $parent = this.$parent;

            if ($self && $parent) {
                preparePrototype($self.prototype, methods, $parent);
            }
        };

        /**
         * Create new class based on current one
         * @param {object} definition
         * @param {object} statics
         * @returns {function}
         */
        BaseClass.$extend = function(definition, statics) {
            return defineClass(definition, statics, this);
        };

        /**
         * Destroy class
         * @method
         */
        BaseClass.$destroy = function() {
            var self = this,
                k;

            for (k in self) {
                self[k] = null;
            }
        };

        /**
         * @class Class
         */

        /**
         * @method Class
         * @constructor
         * @param {Namespace} ns optional namespace. See metaphorjs-namespace repository
         */

        /**
         * @method
         * @param {object} definition {
         *  @type {string} $class optional
         *  @type {string} $extends optional
         *  @type {array} $mixins optional
         *  @type {function} $constructor optional
         *  @type {function} $init optional
         *  @type {function} $beforeInit if this is a mixin
         *  @type {function} $afterInit if this is a mixin
         *  @type {function} $beforeHostInit if this is a plugin
         *  @type {function} $afterHostInit if this is a plugin
         *  @type {function} $beforeDestroy if this is a mixin
         *  @type {function} $afterDestroy if this is a mixin
         *  @type {function} $beforeHostDestroy if this is a plugin
         *  @type {function} destroy your own destroy function
         * }
         * @param {object} statics any statis properties or methods
         * @param {string|function} $extends this is a private parameter; use definition.$extends
         * @code var cls = cs.define({$class: "Name"});
         */
        var defineClass = function(definition, statics, $extends) {

            definition          = definition || {};
            
            var name            = definition.$class,
                parentClass     = $extends || definition.$extends,
                mixins          = definition.$mixins,
                pConstructor,
                i, l, k, noop, prototype, c, mixin;

            if (parentClass) {
                if (isString(parentClass)) {
                    pConstructor = ns.get(parentClass);
                }
                else {
                    pConstructor = parentClass;
                    parentClass = pConstructor.$class || "";
                }
            }
            else {
                pConstructor = BaseClass;
                parentClass = "";
            }

            if (parentClass && !pConstructor) {
                throw parentClass + " not found";
            }

            if (name) {
                name = ns.normalize(name);
            }

            definition.$class   = name;
            definition.$extends = parentClass;
            definition.$mixins  = null;


            noop                = function(){};
            noop[proto]         = pConstructor[proto];
            prototype           = new noop;
            noop                = null;
            definition[constr]  = definition[constr] || $constr;

            preparePrototype(prototype, definition, pConstructor);

            if (mixins) {
                for (i = 0, l = mixins.length; i < l; i++) {
                    mixin = mixins[i];
                    if (isString(mixin)) {
                        mixin = ns.get(mixin, true);
                    }
                    mixinToPrototype(prototype, mixin);
                }
            }

            c = createConstructor(name);
            prototype.constructor = c;
            c[proto] = prototype;

            for (k in BaseClass) {
                if (k != proto && BaseClass.hasOwnProperty(k)) {
                    c[k] = BaseClass[k];
                }
            }

            for (k in pConstructor) {
                if (k != proto && pConstructor.hasOwnProperty(k)) {
                    c[k] = pConstructor[k];
                }
            }

            if (statics) {
                for (k in statics) {
                    if (k != proto && statics.hasOwnProperty(k)) {
                        c[k] = statics[k];
                    }
                }
            }

            c.$parent   = pConstructor;
            c.$self     = c;

            if (name) {
                ns.register(name, c);
            }

            return c;
        };




        /**
         * Instantiate class. Pass constructor parameters after "name"
         * @method
         * @code cs.factory("My.Class.Name", arg1, arg2, ...);
         * @param {string} name Full name of the class
         * @returns {object} class instance
         */
        var factory = function(name) {

            var cls     = ns.get(name),
                args    = slice.call(arguments, 1);

            if (!cls) {
                throw name + " not found";
            }

            return cls.$instantiate.apply(cls, args);
        };



        /**
         * Is cmp instance of cls
         * @method
         * @code cs.instanceOf(myObj, "My.Class");
         * @code cs.instanceOf(myObj, My.Class);
         * @param {object} cmp
         * @param {string|object} cls
         * @returns {boolean}
         */
        var isInstanceOf = function(cmp, cls) {
            var _cls    = isString(cls) ? ns.get(cls) : cls;
            return _cls ? cmp instanceof _cls : false;
        };



        /**
         * Is one class subclass of another class
         * @method
         * @code cs.isSubclassOf("My.Subclass", "My.Class");
         * @code cs.isSubclassOf(myObj, "My.Class");
         * @code cs.isSubclassOf("My.Subclass", My.Class);
         * @code cs.isSubclassOf(myObj, My.Class);
         * @param {string|object} childClass
         * @param {string|object} parentClass
         * @return {bool}
         */
        var isSubclassOf = function(childClass, parentClass) {

            var p   = childClass,
                g   = ns.get;

            if (!isString(parentClass)) {
                parentClass  = parentClass.prototype.$class;
            }
            else {
                parentClass = ns.normalize(parentClass);
            }
            if (isString(childClass)) {
                p   = g(ns.normalize(childClass));
            }

            while (p && p.prototype) {

                if (p.prototype.$class == parentClass) {
                    return true;
                }

                p = p.$parent;
            }

            return false;
        };

        var self    = this;

        self.factory = factory;
        self.isSubclassOf = isSubclassOf;
        self.isInstanceOf = isInstanceOf;
        self.define = defineClass;

        self.destroy = function(){

            if (self === globalCs) {
                globalCs = null;
            }

            BaseClass.$destroy();
            BaseClass = null;

            ns.destroy();
            ns = null;

            Class = null;

        };

        /**
         * @type {BaseClass} BaseClass reference to the BaseClass class
         */
        self.BaseClass = BaseClass;

    };

    Class.prototype = {

        factory: null,
        isSubclassOf: null,
        isInstanceOf: null,
        define: null,
        destroy: null
    };

    var globalCs;

    /**
     * Get default global class manager
     * @method
     * @static
     * @returns {Class}
     */
    Class.global = function() {
        if (!globalCs) {
            globalCs = new Class(Namespace.global());
        }
        return globalCs;
    };

    return Class;

}();




var cs = new Class(ns);





var defineClass = cs.define;





var TextRenderer = function(){

    var startSymbol             = '{{',
        endSymbol               = '}}',
        startSymbolLength       = 2,
        endSymbolLength         = 2,

        savedBoundary           = '--##--',

        langStartSymbol         = '{[',
        langEndSymbol           = ']}',
        langStartLength         = 2,
        langEndLength           = 2,

        rReplaceEscape          = /\\{/g,

        observer                = new Observable,

        factory                 = function(scope, origin, parent, userData, recursive) {

            if (!origin || !origin.indexOf ||
                (origin.indexOf(startSymbol) == -1 &&
                 origin.indexOf(langStartSymbol) == -1 &&
                 origin.indexOf(savedBoundary) == -1)) {
                return null;
            }

            return new TextRenderer(scope, origin, parent, userData, recursive);
        };

    var TextRenderer = defineClass({

        $class: "TextRenderer",

        id: null,
        parent: null,
        isRoot: null,
        scope: null,
        origin: "",
        processed: null,
        text: null,
        watchers: null,
        children: null,
        data: null,
        recursive: false,
        dataChangeDelegate: null,
        changeTmt: null,
        lang: null,
        boundary: null,
        mock: null,

        $init: function(scope, origin, parent, userData, recursive, boundary, mock) {

            var self        = this;

            self.id         = nextUid();
            self.origin     = origin;
            self.scope      = scope;
            self.parent     = parent;
            self.isRoot     = !parent;
            self.data       = userData;
            self.lang       = scope.$app ? scope.$app.lang : null;
            self.boundary   = boundary || "---";
            self.mock       = mock;

            if (recursive === true || recursive === false) {
                self.recursive = recursive;
            }

            self.watchers   = [];
            self.children   = [];

            self.dataChangeDelegate = bind(self.doDataChange, self);
            self.processed  = self.processText(origin, self.mock);
            self.render();
        },

        subscribe: function(fn, context) {
            return observer.on(this.id, fn, context);
        },

        unsubscribe: function(fn, context) {
            return observer.un(this.id, fn, context);
        },

        getString: function() {
            var self = this;

            if (isNull(self.text)) {
                self.render();
            }

            var text = self.text;

            if (text.indexOf('\\{') != -1) {
                return text.replace(rReplaceEscape, '{');
            }

            return text;
        },


        render: function() {

            var self    = this,
                text    = self.processed,
                b       = self.boundary,
                i, l,
                ch;

            if (!self.children.length) {
                self.createChildren();
            }

            ch = self.children;

            for (i = -1, l = ch.length; ++i < l;
                 text = text.replace(
                     b + i + b,
                     ch[i] instanceof TextRenderer ? ch[i].getString() : ch[i]
                 )) {}

            self.text = text;

            return text;
        },



        processText: function(text, mock) {

            /*
             arguably, str += "" is faster than separators.push() + separators.join()
             well, at least in my Firefox it is so.
             */

            var self        = this,
                index       = 0,
                textLength  = text.length,
                startIndex,
                endIndex,
                result      = "";
            //separators  = [];

            // regular keys
            while(index < textLength) {
                if (((startIndex = text.indexOf(startSymbol, index)) != -1) &&
                    ((endIndex = text.indexOf(endSymbol, startIndex + startSymbolLength)) != -1) &&
                    text.substr(startIndex - 1, 1) != '\\') {

                    result += text.substring(index, startIndex);

                    if (endIndex != startIndex + startSymbolLength) {
                        result += self.watcherMatch(
                            text.substring(startIndex + startSymbolLength, endIndex),
                            false,
                            mock
                        );
                    }

                    index = endIndex + endSymbolLength;

                } else {
                    // we did not find an interpolation
                    if (index !== textLength) {
                        result += text.substring(index);
                    }
                    break;
                }
            }

            index       = 0;
            text        = result;
            textLength  = text.length;
            result      = "";
            //separators  = [];

            // lang keys
            while(index < textLength) {

                if (((startIndex = text.indexOf(langStartSymbol, index)) != -1) &&
                    ((endIndex = text.indexOf(langEndSymbol, startIndex + langStartLength)) != -1) &&
                    text.substr(startIndex - 1, 1) != '\\') {

                    result += text.substring(index, startIndex);

                    if (endIndex != startIndex + langStartLength) {
                        result += self.watcherMatch(
                            text.substring(startIndex + langStartLength, endIndex),
                            true,
                            mock
                        );
                    }

                    index = endIndex + langEndLength;

                } else {
                    // we did not find an interpolation
                    if (index !== textLength) {
                        result += text.substring(index);
                    }
                    break;
                }
            }

            //saved keys
            index       = 0;
            text        = result;
            textLength  = text.length;
            result      = "";
            var bndLen      = savedBoundary.length,
                getterid;

            while(index < textLength) {
                if (((startIndex = text.indexOf(savedBoundary, index)) != -1) &&
                    (endIndex = text.indexOf(savedBoundary, startIndex + bndLen)) != -1) {

                    result += text.substring(index, startIndex);

                    getterid    = text.substring(startIndex, endIndex + bndLen);
                    getterid    = getterid.replace(savedBoundary, "");
                    getterid    = parseInt(getterid);

                    result += self.watcherMatch(
                        getterid,
                        false,
                        mock
                    );

                    index = endIndex + bndLen;
                } else {
                    // we did not find an interpolation
                    if (index !== textLength) {
                        result += text.substring(index);
                    }
                    break;
                }
            }

            return result;
        },

        watcherMatch: function(expr, isLang, mock) {

            var self    = this,
                ws      = self.watchers,
                b       = self.boundary,
                getter  = null;

            if (typeof expr == "number") {
                var getterId = expr;
                if (typeof __MetaphorJsPrebuilt != "undefined") {
                    expr = __MetaphorJsPrebuilt['__tpl_getter_codes'][getterId];
                    getter = __MetaphorJsPrebuilt['__tpl_getters'][getterId];
                }
                else {
                    return "";
                }
            }

            if (isLang) {
                expr        = trim(expr);
                var tmp     = split(expr, "|"),
                    key     = trim(tmp[0]);
                if (key.substr(0, 1) != ".") {
                    tmp[0]  = "'" + key + "'";
                }
                if (tmp.length == 1) {
                    tmp.push("l");
                }
                expr        = tmp.join(" | ");
            }

            ws.push(createWatchable(
                self.scope,
                expr,
                self.onDataChange,
                self,
                {namespace: ns, mock: mock, getterFn: getter}
            ));

            return b + (ws.length-1) + b;
        },

        onDataChange: function() {

            var self    = this;

            if (!self.changeTmt) {
                self.changeTmt = setTimeout(self.dataChangeDelegate, 0);
            }
        },

        doDataChange: function() {
            var self = this;
            self.destroyChildren();
            self.triggerChange();
            self.changeTmt = null;
        },

        triggerChange: function() {

            var self    = this;
            self.text   = null;

            if (self.isRoot) {
                observer.trigger(self.id, self, self.data);
            }
            else {
                self.parent.triggerChange();
            }
        },


        createChildren: function() {

            var self    = this,
                ws      = self.watchers,
                ch      = self.children,
                scope   = self.scope,
                rec     = self.recursive,
                i, l,
                val;

            for (i = -1, l = ws.length; ++i < l; ){
                val     = ws[i].getLastResult();
                if (val === undf) {
                    val = "";
                }
                ch.push((rec && factory(scope, val, self, null, true)) || val);
            }
        },

        destroyChildren: function() {

            var self    = this,
                ch      = self.children,
                i, l;

            for (i = -1, l = ch.length; ++i < l; ){
                if (ch[i] instanceof TextRenderer) {
                    ch[i].$destroy();
                }
            }

            self.children = [];
        },

        destroyWatchers: function() {

            var self    = this,
                ws      = self.watchers,
                i, l;

            for (i = -1, l = ws.length; ++i < l;
                 ws[i].unsubscribeAndDestroy(self.onDataChange, self)){}

            self.watchers = [];
        },

        destroy: function() {

            var self = this;

            self.destroyChildren();
            self.destroyWatchers();

            observer.destroyEvent(self.id);

            if (self.changeTmt) {
                clearTimeout(self.changeTmt);
            }
        }

    }, {
        create: factory
    });

    return TextRenderer;
}();







var createFunc = functionFactory.createFunc;



var Scope = function(cfg) {
    var self    = this;

    self.$$observable    = new Observable;
    self.$$historyWatchers  = {};
    extend(self, cfg, true, false);

    if (self.$parent) {
        self.$parent.$on("check", self.$$onParentCheck, self);
        self.$parent.$on("destroy", self.$$onParentDestroy, self);
        self.$parent.$on("freeze", self.$freeze, self);
        self.$parent.$on("unfreeze", self.$unfreeze, self);
    }
    else {
        self.$root  = self;
        self.$isRoot= true;
    }
};

extend(Scope.prototype, {

    $app: null,
    $parent: null,
    $root: null,
    $isRoot: false,
    $level: 0,
    $static: false,
    $$frozen: false,
    $$observable: null,
    $$watchers: null,
    $$historyWatchers: null,
    $$checking: false,
    $$destroyed: false,

    $$tmt: null,

    $new: function(data) {
        var self = this;
        return new Scope(extend({}, data, {
            $parent: self,
            $root: self.$root,
            $app: self.$app,
            $level: self.$level + 1,
            $static: self.$static
        }, true, false));
    },

    $newIsolated: function() {
        return new Scope({
            $app: this.$app,
            $level: self.$level + 1,
            $static: this.$static
        });
    },

    $freeze: function() {
        var self = this;
        if (!self.$$frozen) {
            self.$$frozen = true;
            self.$$observable.trigger("freeze", self);
        }
    },

    $unfreeze: function() {
        var self = this;
        if (self.$$frozen) {
            self.$$frozen = false;
            self.$$observable.trigger("unfreeze", self);
        }
    },

    $on: function(event, fn, fnScope) {
        return this.$$observable.on(event, fn, fnScope);
    },

    $un: function(event, fn, fnScope) {
        return this.$$observable.un(event, fn, fnScope);
    },

    $watch: function(expr, fn, fnScope) {
        return Watchable.create(this, expr, fn, fnScope);
    },

    $unwatch: function(expr, fn, fnScope) {
        return Watchable.unsubscribeAndDestroy(this, expr, fn, fnScope);
    },

    $createGetter: function(expr) {
        var self    = this,
            getter  = createGetter(expr);
        return function() {
            return getter(self);
        };
    },

    $createSetter: function(expr) {
        var self    = this,
            setter  = createSetter(expr);
        return function(value) {
            return setter(value, self);
        };
    },

    $createFunc: function(expr) {
        var self    = this,
            fn      = createFunc(expr);
        return function() {
            return fn(self);
        };
    },

    $watchHistory: function(prop, param) {
        var self = this;
        if (!self.$$historyWatchers[param]) {
            self.$$historyWatchers[param] = prop;
            MetaphorJs.history.on("change-" + param, self.$$onHistoryChange, self);
        }
    },

    $unwatchHistory: function(param) {
        var self = this;
        if (!self.$$historyWatchers[param]) {
            delete self.$$historyWatchers[param];
            MetaphorJs.history.un("change-" + param, self.$$onHistoryChange, self);
        }
    },

    $wrap: function(fn, context) {
        var self = this,
            name;

        if (typeof fn == "string") {
            name = fn;
            fn = context[name];
        }

        var wrapper = function() {
            var res = fn.apply(context, arguments);
            self.$check();
            return res;
        };

        if (name) {
            context[name] = wrapper;
        }

        return wrapper;
    },

    $get: function(key) {

        var s = this;

        while (s) {
            if (s[key] !== undf) {
                return s[key];
            }
            s = s.$parent;
        }

        return undf;
    },

    $set: function(key, value) {
        var self = this;
        if (typeof key == "string") {
            this[key] = value;
        }
        else {
            for (var k in key) {
                self[k] = key[k];
            }
        }
        this.$check();
    },

    $$onParentDestroy: function() {
        this.$destroy();
    },

    $$onParentCheck: function() {
        this.$check();
    },

    $$onHistoryChange: function(val, prev, name) {
        var self = this,
            prop;
        if (self.$$historyWatchers[name]) {
            prop = self.$$historyWatchers[name];
            self[prop] = val;
            self.$check();
        }
    },

    $scheduleCheck: function(timeout) {
        var self = this;
        if (!self.$$tmt) {
            self.$tmt = async(self.$check, self, null, timeout);
        }
    },

    $check: function() {
        var self = this,
            changes;

        if (self.$$checking || self.$static || self.$$frozen) {
            return;
        }
        self.$$checking = true;

        if (self.$$tmt) {
            clearTimeout(self.$$tmt);
            self.$$tmt = null;
        }

        if (self.$$watchers) {
            changes = self.$$watchers.$checkAll();
        }

        self.$$checking = false;

        if (!self.$$destroyed) {
            self.$$observable.trigger("check", changes);
        }

        if (changes > 0) {
            self.$check();
        }
    },

    $reset: function(resetVars) {
        var self = this;
        self.$$observable.trigger("reset");
    },

    $destroy: function() {

        var self    = this,
            param, i;

        if (self.$$destroyed) {
            return;
        }

        self.$$destroyed = true;
        self.$$observable.trigger("destroy");
        self.$$observable.destroy();

        if (self.$parent && self.$parent.$un) {
            self.$parent.$un("check", self.$$onParentCheck, self);
            self.$parent.$un("destroy", self.$$onParentDestroy, self);
            self.$parent.$un("freeze", self.$freeze, self);
            self.$parent.$un("unfreeze", self.$unfreeze, self);
        }

        if (self.$$watchers) {
            self.$$watchers.$destroyAll();
        }

        for (param in self.$$historyWatchers) {
            self.$unwatchHistory(param);
        }

        for (i in self) {
            if (self.hasOwnProperty(i)) {
                self[i] = null;
            }
        }

        self.$$destroyed = true;
    }

}, true, false);




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

    templates:      null,
    gettersCode:    null,
    gettersCodes:   null,

    build:          function() {

        var self    = this,
            bld     = self.bld;

        if (bld.templates) {
            self.prepareTemplates();
            //console.log(bld.templates)
        }

        if (bld.files.length && bld.target) {
            self.concat();
        }
    },

    prepareTemplates: function() {

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

            tplUrl = filePath;

            if (tplCfg.root) {
                tplUrl = tplUrl.replace(tplCfg.root, "");
            }
            if (tplCfg.prefix) {
                tplUrl = tplCfg.prefix + tplUrl;
            }

            var tr = new TextRenderer(scope, tpl, null, null, null, boundary, "mock");

            tr.watchers.forEach(function(w, inx){
                var cfg = w.getConfig();
                if (cfg.type == "expr" && !cfg.hasPipes && !cfg.hasInputPipes) {
                    var nextInx = fns.length;
                    fns.push(cfg.getter);
                    codes.push(cfg.code);
                    tpl = tr.processed.replace(
                        boundary + inx + boundary,
                        saveBoundary + nextInx + saveBoundary
                    );
                }
                else {
                    tpl = tr.processed.replace(
                        boundary + inx + boundary,
                        '{{ ' + cfg.code + ' }}'
                    );
                }

                tpls[tplUrl] = tpl;
            });
        }

        self.templates = tpls;
        self.gettersCode = "[" + fns.join(", ") + "]";
        self.gettersCodes = codes;
    },

    concat:        function() {

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

            if (bld.expose == "all") {
                var names = self.collectNames();
                names.forEach(function(name){
                    if (bld.exposeSkip && bls.exposeSkip.indexOf(name) != -1) {
                        return;
                    }
                    if (name != exposeIn) {
                        exposedNames.push([name, name]);
                        exportContent += exposeIn + "['" + name + "'] = " + name + ";\n";
                    }
                });
            }
            else {

                var ns, as;

                bld.expose.forEach(function (varName) {

                    if (typeof varName == "string") {
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

    hasChanges: function(wholeProject) {

        var deferred = new Promise,
            loc = this.location,
            check = wholeProject ?
                        (".") :
                        (isDir(loc + "/src") ? "./src" : ".");

        process.chdir(loc);

        cp.execFile("git", ["status", check], function(err, stdout) {
            if (err) {
                deferred.reject(err);
            }
            else {
                deferred.resolve(stdout.indexOf("modified:") != -1 || stdout.indexOf("Untracked files:") != -1);
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
                    if ((deferred.isPending() && options.p) || options.forcePush) {
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
var MetaphorJsExports = {};
MetaphorJsExports['Build'] = Build;
MetaphorJsExports['Builder'] = Builder;
MetaphorJsExports['File'] = File;
MetaphorJsExports['JsonFile'] = JsonFile;
MetaphorJsExports['Git'] = Git;
MetaphorJsExports['Project'] = Project;
module.exports = MetaphorJsExports;
