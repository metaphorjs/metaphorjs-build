var Base = require("../../Base.js"),
    minify = require('html-minifier').minify;

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.template.Processor",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this,
            host = self.host;
        
        host.$$observable.createEvent("prepare", "pipe");
        host.on("prepare", self.minify, self);
    },

    minify: function(html) {
        html = minify(html, {
            removeTagWhitespace: true,
            collapseWhitespace: true
        });
        return html;
    },

    process: function(html) {
        return html;
    }
});