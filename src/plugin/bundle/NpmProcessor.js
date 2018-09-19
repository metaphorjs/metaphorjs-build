var Base = require("../../Base.js"),
    File = require("../../File.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js");

module.exports = Base.$extend({

    $class: "plugin.bundle.NpmProcessor",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this;
        self.host.on("process-file", self.processNpmEntry, self);
    },

    processNpmEntry: function(file, bundle) {

        if (file && file instanceof File) {

            var info = file.getFileInfo();

            if (!info.npm) {
                return file;
            }

            var Bundle = ns.get("Bundle");
            var npmBundle = Bundle.get(info.npm.module, "npm");

            // avoid infinite recursion
            if (npmBundle === bundle) {
                return file;
            }

            if (!npmBundle.getOption("version")) {
                npmBundle.setOption("module", info.npm.module);
                npmBundle.setOption("version", info.npm.version);
                npmBundle.setOption("wrap", true);
            }

            if (npmBundle.getOption("version") != info.npm.version) {
                throw "Got two different versions of " + info.npm.module + " module: " +
                    npmBundle.getOption("version") + " != " + info.npm.version;
            }

            npmBundle.addFile(file);

            return npmBundle;
        }
        
        return file;
    }
});