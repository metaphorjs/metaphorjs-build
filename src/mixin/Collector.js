var path = require("path"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js"),
    getFileList = require("../func/getFileList.js"),
    resolvePath = require("../func/resolvePath.js"),
    Config = require("../Config.js");

/**
 * @mixin mixin.Collector
 */
module.exports = MetaphorJs.mixin.Collector = {

    $beforeInit: function() {
        this.allOmits = {};
        this.allReplaces = {};
        this.collected = {};
        this.collectedTemplates = {};
    },

    $afterInit: function() {
        // return first === false result and skip the rest of listeners
        this.$$observable.createEvent("collect-filter", false);
        this.on("collect-filter", this._collectFilter, this);
    },


    _collectFilter: function(f) {
        return !this.allOmits[f.path];
    },

    _processMixin: function(mixin, config) {

        var self    = this,
            files   = mixin.files || [],
            tpls    = mixin.templates || [],
            omit    = mixin.omit || [],
            replace = mixin.replace || [],
            base    = config.base;

        omit.forEach(function(omitFile){
            getFileList(resolvePath(omitFile, [base]), "js")
                .forEach(function(omitFile){
                    self.allOmits[omitFile] = true;
                });
        });

        replace.forEach(function(row){
            self.allReplaces[resolvePath(row[0], [base])] = 
                                resolvePath(row[1], [base]);
        });

        files.forEach(function(file){
            self._processFileItem(file, config);
        });

        tpls.forEach(function(tplFile) {
            var fpath, opt;
            if (typeof tplFile === "string") {
                fpath = tplFile;
                opt = {};
            }
            else {
                fpath = tplFile[0];
                opt = tplFile[1];
            }

            if (opt.base) {
                opt.origBase = opt.base;
                opt.base = path.normalize(base +"/"+ opt.base);
            }
            else {
                opt.base = base;
            }

            getFileList(resolvePath(fpath, [base]), "html")
                .forEach(function(tplFile){
                    if (opt.base && tplFile.indexOf(opt.base) === -1) {
                        opt.base = resolvePath(opt.origBase, [base], true);
                    }
                    var t = self.builder.getTemplate(tplFile, opt);
                    self.collectedTemplates[t.id] = t;
                });
        })
    },

    _processFileItem: function(fileDef, config){

        if (typeof fileDef === "string") {
            fileDef = [fileDef];
        }

        var self    = this,
            file    = fileDef[0],
            json;

        // local mixin: simple name and nothing else: ["name"]
        if (file.match(/^[a-z0-9]+$/i)) {

            if (!config.mixin[file]) {
                throw new Error("Mixin "+file+" not found in " + config.path);
            }

            self._processMixin(config.mixin[file], config);
        }

        // external mixin: [path/to/json, "name"]
        else if (path.extname(file) === ".json") {
            
            json = Config.get(resolvePath(file));

            if (!json) {
                throw new Error("Json file not found: " + file);
            }
            if (!json.mixin[fileDef[1]]) {
                throw new Error("Mixin "+fileDef[1]+" not found in " + json.path);
            }

            self._processMixin(json.mixin[fileDef[1]], json);
        }
        else {
            getFileList(resolvePath(file, [config.base]), "js")
                .forEach(function(file){
                    var f = self.builder.getFile(file, fileDef[1]);
                    f.setOption("base", config.base);

                    var res = self.trigger("collect-filter", f, self);
                    if (res !== false) {
                        self.collected[f.path] = f;
                    }
                });
        }
    }
};