
module.exports = function(grunt) {

    if (process.env['METAPHORJS_DEV']) {
        require("../../metaphorjs/dev/mockery.js");
    }

    grunt.registerMultiTask("mjs-compile", function(){

        try {
            var opt = this.options(),
                Builder = require("./dist/metaphorjs.build.js").Builder;

            if (opt.all) {
                Builder.compileAll(opt.auto || false);
            }
            else {
                Builder.compile(opt.build || null, opt.jsonFile || null);
            }
        }
        catch (thrownErr) {
            grunt.warn(thrownErr);
        }
    });

};