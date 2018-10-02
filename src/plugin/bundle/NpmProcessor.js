var Base = require("../../Base.js"),
    File = require("../../File.js");

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.bundle.NpmProcessor",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this;
        self.host.on("process-file", self.processNpmEntry, self);
        self.host.on("process-file", self.processNpmMjsEntry, self);
    },

    processNpmMjsEntry: function(file, bundle) {
        if (file && file instanceof File) {

            var info = file.getFileInfo();

            if (!info.mjs) {
                return file;
            }

            var modVerName = info.mjs.module + "-version";

            if (!bundle.getOption(modVerName)) {
                bundle.setOption(modVerName, info.mjs.version);
            }
            if (bundle.getOption(modVerName) != info.mjs.version) {
                throw new Error("Got two different versions of " + info.mjs.module + " module: " +
                    bundle.getOption(modVerName) + " != " + info.mjs.version);
            }
        }

        return file;
    },

    processNpmEntry: function(file, bundle) {

        if (file && file instanceof File) {

            var info = file.getFileInfo();

            if (!info.npm) {
                return file;
            }

            var npmBundle = this.host.builder.getBundle(info.npm.module, "npm");

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
                throw new Error("Got two different versions of " + info.npm.module + " module: " +
                    npmBundle.getOption("version") + " != " + info.npm.version);
            }

            npmBundle.addFile(file);

            return npmBundle;
        }
        
        return file;
    }
});