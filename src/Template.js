
var fs = require("fs"),
    nextUid = require("metaphorjs-shared/src/func/nextUid.js"),
    Base = require("./Base.js"),
    MetaphorJs = require("metaphorjs-shared/src/MetaphorJs.js");

require("./plugin/template/Processor.js");

module.exports = (function(){

var cache = {};

var Template = Base.$extend({

    $constructor: function() {
        this.$plugins.push(MetaphorJs.plugin.template.Processor);
        this.$super(arguments);
    },

    $init: function(filePath, options, builder) {

        options = options || {};

        var self = this,
            id = options.id || null;

        if (!id) {
            id = filePath.replace(options.base + "/", "");
            id = id.replace(".html", "");
        }

        self.builder    = builder;
        self.path       = filePath;
        self._processed = false;
        self.content    = self.getOriginalContent();
        self.optStr     = "";
        self.id         = id || nextUid();

        self.$super(options);

        self._process();
    },

    /**
     * Set current bundle
     * @method
     * @param {Bundle} bundle
     */
    setBundle: function(bundle) {
        this.bundle = bundle;
    },

    _process: function() {
        var self = this,
            str = Template.getOptionString(self.content);
        if (str) {
            self.content = self.content.replace(str, "");
            self.optStr = str;
        }
    },

    getContent: function() {
        return this.trigger("prepare", this.content);
    },

    /**
     * Get file content stripped of requires and with all options applied
     * @method
     * @returns {string}
     */
    getOriginalContent: function() {
        return fs.readFileSync(this.path).toString();
    },

    /**
     * @ignore
     */
    toString: function() {
        return this.getContent();
    }
});


Template.getOptions = function(path) {
    var content = fs.readFileSync(path).toString(),
        opt = Template.getOptionString(content),
        f;

    if (opt) {
        f = cache[opt] || new Function("", "return + " + opt);
        cache[opt] = f;
        return f();
    }
    return {};
};

Template.getOptionString = function(content) {
    if (content.substr(0,5) === "<!--{") {
        var inx = content.indexOf("-->"),
            opt = content.substr(4, inx-4);
        return opt;
    }
    return null;
};

return Template;

}());

