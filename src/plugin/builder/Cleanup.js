
var Base = require("../../Base.js"),
    removeDebug = require("../../func/removeDebug.js");

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.builder.Cleanup",
    host: null,

    $constructor: function() {
        this.$super(arguments);
    },

    $init: function(host) {
        this.host = host;  
    },

    $afterHostInit: function() {
        var self = this,
            cfg = self.host.config.getBuildConfig(self.host.buildName) || {},
            opt = cfg.options || {};

        self.host.$$observable.createEvent("cleanup", "pipe")

        if (opt.removeDebug) {
            self.host.on("cleanup", self.removeDebug, self);
        }
    },


    removeDebug: function(code) {
        return removeDebug(code);
    }
});