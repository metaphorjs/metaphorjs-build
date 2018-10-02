
module.exports = function(grunt) {

    if (process.env['METAPHORJS_DEV']) {
        require("../../metaphorjs/dev/env.js");
    }

    grunt.registerMultiTask("mjs-build", function(){

        try {

            var opt = this.options(),
                Builder = require("../dist/metaphorjs.build.js").Builder;

            if (opt.all) {
                Builder.buildAll(opt.auto || false);
            }
            else {
                Builder.build(opt.build || null, opt.jsonFile || null);
            }
        }
        catch (thrownErr) {
            grunt.warn(thrownErr);
        }
    });

};