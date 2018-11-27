var Base = require("../../Base.js"),
    path = require("path"),
    fs = require("fs");
    

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.code.Prebuilt",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this,
            host = this.host;

        host.$$observable.createEvent("collect-prebuilt", "merge");
        host.on("collect-prebuilt", self._prepareTemplates, self);
    },


    _prepareTemplates: function() {

        var tpls = {};

        this.host.templateList.forEach(function(tpl){
            tpls[tpl.id] = tpl.toString();
        });

        return {templates: tpls};
    }
});