
var glob = require("glob");

/**
 * Resolve list of files using path pattern. Uses <code>glob</code> internally.
 * @param {string} pattern 
 * @param {string} ext 
 * @returns {array}
 */
module.exports = function(pattern, ext) {
    if (ext && pattern.indexOf("."+ext) != pattern.length - ext.length - 1) {
        pattern += '/*.' + ext;
    }

    return glob.sync(pattern);
};



/*module.exports = function(directory, ext) {

    var fileList,
        filePath,
        levels = 0,
        files = [];

    if (!directory) {
        return [];
    }


    if (directory.substr(directory.length - 1) == "*") {
        levels++;
    }
    if (directory.substr(directory.length - 2) == "**") {
        levels++;
    }

    if (levels) {
        directory = directory.substr(0, directory.length - (levels + 1));
    }
    directory = path.normalize(directory);

    var readDir = function(dir) {
        fileList    = fs.readdirSync(dir);

        fileList.forEach(function(filename) {
            filePath = path.normalize(dir + "/" + filename);

            if (isFile(filePath)) {

                if (!ext) {
                    files.push(filePath);
                }
                else if (typeof ext == "string" && path.extname(filePath).substr(1) == ext) {
                    files.push(filePath);
                }
                else if (typeof ext != "string" && path.extname(filePath).substr(1).match(ext)) {
                    files.push(filePath);
                }
            }
            else if (isDir(filePath) && levels > 1) {
                readDir(filePath);
            }
        });
    };

    if (levels > 0 || isDir(directory)) {
        readDir(directory);
    }
    else {
        files    = [directory];
    }

    return files;
};*/