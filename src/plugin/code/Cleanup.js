var Base = require("../../Base.js");

module.exports = Base.$extend({

    $class: "plugin.code.Cleanup",
    host: null,

    $init: function(host) {
        this.host = host;
    },

    $afterHostInit: function() {
        this.host.on("cleanup-code", this.cleanupCode, this);
    },

    cleanupCode: function(content) {
        var rEmptyVar = /var[\s|,]*;/g,
            rTrailComma = /,\s*;/g,
            rStrict = new RegExp("'use "+ "strict'|" + '"use ' + 'strict";?', "g"),
            rVarSpace = /var\s+/g;

        content = content.replace(rStrict, "");
        content = content.replace(rVarSpace, "var ");
        content = content.replace(rEmptyVar, "");
        content = content.replace(rTrailComma, ";");

        return content;
    }
});