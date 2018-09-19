
var fs              = require("fs"),
    path            = require("path"),

    Base            = require("./Base.js"),
    Bundle          = require("./Bundle.js"),
    Config          = require("./Config.js"),

    isFile          = require("metaphorjs/src/func/fs/isFile.js");



/**
* @class Builder
*/
module.exports = Base.$extend({

    /**
     * @constructor
     */
    $init: function(buildName, projectFile) {

        if (!isFile(projectFile) && 
            !(projectFile instanceof Config)) {
            throw projectFile + " not found";
        }

        var self            = this;

        self.config         = projectFile instanceof Config ? projectFile : Config.get(projectFile);
        self.projectFile    = projectFile instanceof Config ? projectFile.path : projectFile;
        self.bundle         = Bundle.get(buildName, "build");
        self.buildName      = buildName;

        self.bundle.top     = true;
        

        self.trigger("init", self);
    },

    /**
     * Create build
     * @method
     */
    build:          function() {

        var self    = this,
            target,
            content;

        self.trigger("before-build", self);

        self.bundle.collect(self.config, self.buildName);
        self.trigger("after-collect", self);

        self.bundle.prepareBuildList();
        self.trigger("after-build-list", self);

        content     = self.bundle.getContent();
        target      = self.config.build[self.buildName].target;
        target      = path.resolve(self.config.base, target);

        fs.writeFileSync(target, content);
        self.trigger("build-written", self, target, content);
    }
});


