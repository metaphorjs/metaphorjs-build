var Base = require("../../Base.js");

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.bundle.TemplateProcessor",
    host: null,

    $constructor: function() {
        this.$super(arguments);
    },

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this;
        self.host.on("process-template", self.processTemplate, self);
    },

    processTemplate: function(tpl) {
        return tpl;
    }
});