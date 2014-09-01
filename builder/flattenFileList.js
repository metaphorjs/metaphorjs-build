
var resolveFileList = require("./resolveFileList.js"),
    isFile = require("../lib/isFile.js");

module.exports = function(base, list, definedIn) {

    var files       = [],
        options     = {},
        fileOptions,

        each        = function(filename) {

            fileOptions = null;

            if (typeof filename != "string") {
                fileOptions = filename[1];
                filename    = filename[0];
            }

            var fileList = resolveFileList(base, filename);

            fileList.forEach(function(filePath) {
                if (!isFile(filePath)) {
                    throw filePath + " defined in " + definedIn + " does not exist";
                }

                files.push(filePath);
                options[filePath] = fileOptions;
            });
        };

    list.forEach(each);

    return {
        list: files,
        options: options
    };
};