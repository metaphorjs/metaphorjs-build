#!/usr/bin/env node

/*
 * -v -- increase version and publish to npm
 * -m -- commit with message
 * -p -- publish to git
 * -w -- check for changes in the whole project, not just src
 * --no-test -- skip testing
 * --no-compile -- do not compile
 *
 */

if (process.env['METAPHORJS_DEV'] || args.dev) {
    require("../../metaphorjs/dev/mockery.js");
}

require("./../dist/metaphorjs.build.js")
    .Project
    .publishAll();