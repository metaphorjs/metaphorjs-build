
var cp = require("child_process"),
    Promise = require("../../metaphorjs-promise/src/metaphorjs.promise.js");

/**
 * @param cmd
 * @param args
 * @returns {Promise}
 */
module.exports = function(cmd, args) {


    var proc = cp.spawn(cmd, args),
        deferred = new Promise;

    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    process.stdin.pipe(proc.stdin);

    proc.on("exit", function(code) {

        process.stdin.unpipe(proc.stdin);

        if (code == 0) {
            deferred.resolve();
        }
        else {
            deferred.reject(code);
        }
    });


    return deferred;
};