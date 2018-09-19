var ns = require("metaphorjs-namespace/src/var/ns.js"),
    path = require("path"),
    File = require("../File.js"),
    getFileList = require("../func/getFileList.js"),
    resolvePath = require("../func/resolvePath.js"),
    
    Config = require("../Config.js");

/**
 * @mixin mixin.Collector
 */
module.exports = ns.register("mixin.Collector", {

    $beforeInit: function() {
        this.allOmits = {};
        this.allReplaces = {};
        this.collected = {};
    },

    $afterInit: function() {
        // return first === false result and skip the rest of listeners
        this.$$observable.createEvent("collect-filter", false);
    },
    
    


    _processMixin: function(mixin, config) {

        var self    = this,
            files   = mixin.files || [],
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
                throw "Mixin "+file+" not found in " + config.path;
            }

            self._processMixin(config.mixin[file], config);
        }

        // external mixin: [path/to/json, "name"]
        else if (path.extname(file) === ".json") {
            
            json = Config.get(resolvePath(file));

            if (!json) {
                throw "Json file not found: " + file;
            }
            if (!json.mixin[fileDef[1]]) {
                throw "Mixin "+fileDef[1]+" not found in " + json.path;
            }

            self._processMixin(json.mixin[fileDef[1]], json);
        }
        else {
            getFileList(resolvePath(file, [config.base]), "js")
                .forEach(function(file){
                    var f = File.get(file, fileDef[1]);
                    f.setOption("base", config.base);

                    var res = self.trigger("collect-filter", f, self);
                    if (res !== false) {
                        self.collected[f.path] = f;
                    }
                });
        }
    },
});