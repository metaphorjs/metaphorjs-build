
module.exports = function(grunt) {

    if (process.env['METAPHORJS_DEV']) {
        require("../metaphorjs/dev/mockery.js");
    }

    var Builder = require("./dist/metaphorjs.build.js").Builder;

    grunt.registerTask("mjs_build", function(){

        var opt = this.options();

        if (opt.all) {
            Builder.buildAll(opt.auto || false);
        }
        else {
            Builder.build(opt.build || null, opt.jsonFile || null);
        }
    });

    grunt.registerTask("mjs_compile", function(){

        var opt = this.options();

        if (opt.all) {
            Builder.compileAll(opt.auto || false);
        }
        else {
            Builder.compile(opt.build || null, opt.jsonFile || null);
        }
    });

};