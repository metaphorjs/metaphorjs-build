
var path = require("path"),
    fs = require("fs"),
    isFile = require("../lib/isFile.js"),
    isDir = require("../lib/isDir.js");

module.exports = function(base, filename) {

    var fileList,
        dir,
        filePath,
        levels = 0,
        files = [];

    if (filename.substr(filename.length - 1) == "*") {
        levels++;
    }
    if (filename.substr(filename.length - 2) == "**") {
        levels++;
    }

    var readDir = function(dir) {
        fileList    = fs.readdirSync(dir);

        fileList.forEach(function(filename) {
            filePath = path.normalize(dir + "/" + filename);
            if (isFile(filePath)) {
                files.push(filePath);
            }
            else if (isDir(filePath) && levels > 1) {
                readDir(filePath);
            }
        });
    };

    if (levels > 0) {
        dir         = path.normalize(base + filename.substr(0, filename.length - (levels + 1)));
        readDir(dir);
    }
    else {
        files    = [path.normalize(base + filename)];
    }

    return files;
};