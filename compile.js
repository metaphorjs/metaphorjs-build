#!/usr/bin/env node

require("./builder/Builder.js")
    .compile(process.argv[2], process.argv[3]);