
var Base = require("../../Base.js"),
    fs = require("fs");

module.exports = Base.$extend({

    $class: "plugin.file.NodeModule",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this;
        self.host.on("collect-file-info", self.collectFileInfo, self);
    },

    collectFileInfo: function(file) {

        if (file.path.indexOf("/node_modules/") !== -1) {

            var parts = file.path.split("/node_modules/"),
                moduleName = parts[1].split("/")[0],
                pkg = parts[0] + "/node_modules/" + moduleName + "/package.json",
                pkgJson = JSON.parse(fs.readFileSync(pkg))
            
            return {
                
                npm: {
                    module: moduleName,
                    version: pkgJson.version
                }
            };
        }
    }
});