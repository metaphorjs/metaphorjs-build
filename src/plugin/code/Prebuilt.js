require("metaphorjs/src/func/app/prebuilt.js");

var Base = require("../../Base.js"),
    extend = require("metaphorjs-shared/src/func/extend.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

module.exports = Base.$extend({

    $class: "MetaphorJs.plugin.code.Prebuilt",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        var self = this,
            host = this.host;

        host.builder._prebuilt = host.builder._prebuilt || {};
        MetaphorJs.app.prebuilt.setStorage(host.builder._prebuilt);

        host.on("prepare-prebuilt", self._prepareTemplates, self);
    },


    _prepareTemplates: function() {

        this.host.templateList.forEach(function(tpl){
            MetaphorJs.app.prebuilt.add("templates", tpl.toString(), tpl.id);
        });
    }
});