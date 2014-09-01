
var fs = require("fs");

module.exports = function(filePath) {
    return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
};