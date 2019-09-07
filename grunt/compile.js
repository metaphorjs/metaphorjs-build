
module.exports = function(grunt) {

    if (process.env['METAPHORJS_DEV']) {
        require("../../metaphorjs/dev/env.js");
    }

    grunt.registerMultiTask("mjs-compile", function(){

        var done = this.async();

        try {
            var opt = this.options(),
                promise,
                Builder = require("../dist/metaphorjs.build.js").Builder;

            if (opt.all) {
                promise = Builder.compileAll(opt.auto || false);
            }
            else {
                promise = Builder.compile(opt.build || null, opt.jsonFile || null);
            }

            promise.done(done);
        }
        catch (thrownErr) {
            grunt.warn(thrownErr);
            done();
        }

    });

};