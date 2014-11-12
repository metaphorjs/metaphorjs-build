#!/usr/bin/env node

if (process.env['METAPHORJS_DEV'] || args.dev) {
    require("../../metaphorjs/dev/mockery.js");
}

require("./../dist/metaphorjs.build.js")
    .Project
    .testAll();