
var isDir = require("./isDir.js"),
    isFile = require("./isFile.js"),
    fs = require("fs");

/**
 * @param {function} fn
 */
module.exports = function(fn) {

    var cwd     = process.cwd(),
        dirs    = fs.readdirSync(cwd),
        pf,
        project,
        eachDir = function(dir){

            dir     = cwd + "/" + dir;
            pf      = dir + "/metaphorjs.json";

            if (isDir(dir) && isFile(pf)) {
                project   = require(pf);
                fn(project, pf);
            }
        };

    eachDir("");
    dirs.forEach(eachDir);
};