var Base = require("../../Base.js"),
    extend = require("metaphorjs-shared/src/func/extend.js");    

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
        extend(host.builder._prebuilt, {
            expressions: {},
            expressionFuncs: {}
        }, false, false);

        host.$$observable.createEvent("collect-prebuilt", "merge");
        host.$$observable.createEvent("collect-prebuilt-funcs", "merge");
        host.on("collect-prebuilt", self._prepareTemplates, self);
        host.on("collect-prebuilt-funcs", self._prepareFuncs, self);
    },

    _prepareFuncs: function() {
        return this.host.builder._prebuilt.expressionFuncs;
    },

    _prepareTemplates: function() {

        var tpls = {},
            opts = {},
            cfgs = {};

        this.host.templateList.forEach(function(tpl){
            tpls[tpl.id] = tpl.toString();
            if (tpl.optObj) {
                opts[tpl.id] = tpl.optObj;
            }
            if (tpl._prebuilt) {
                extend(cfgs, tpl._prebuilt.configs, false, false);
            }
        });

        return {
            templates: tpls,
            templateOptions: opts,
            configs: cfgs
        };
    }
});