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

        //host.$$observable.createEvent("collect-prebuilt", "merge");
        //host.$$observable.createEvent("collect-prebuilt-funcs", "merge");
        host.on("prepare-prebuilt", self._prepareTemplates, self);
        //host.on("collect-prebuilt-funcs", self._prepareFuncs, self);
    },

    /*_prepareFuncs: function() {
        return this.host.builder._prebuilt.expressionFuncs;
    },*/

    _prepareTemplates: function() {

        console.log("prepare templates")

        /*var tpls = {},
            opts = {},
            cfgs = {};*/

        this.host.templateList.forEach(function(tpl){
            console.log(tpl.id)
            MetaphorJs.app.prebuilt.add("templates", tpl.toString(), tpl.id);
            /*tpls[tpl.id] = tpl.toString();
            if (tpl.optObj) {
                opts[tpl.id] = tpl.optObj;
            }
            if (tpl._prebuilt) {
                extend(cfgs, tpl._prebuilt.configs, false, false);
            }*/
        });

        /*return {
            templates: tpls,
            templateOptions: opts,
            //configs: cfgs,
            expressionOpts: this.host.builder._prebuilt.expressionOpts
        };*/
    }
});