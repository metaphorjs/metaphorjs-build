
var cp = require("child_process"),
    lib_Promise = require("metaphorjs-promise/src/lib/Promise.js");

/**
 * @function
 * @param {string} cmd
 * @param {string} args
 * @returns {Promise}
 */
module.exports = function(cmd, args) {

    var proc = cp.spawn(cmd, args),
        deferred = new lib_Promise(function(resolve, reject){
            proc.stdout.pipe(process.stdout);
            proc.stderr.pipe(process.stderr);
            process.stdin.pipe(proc.stdin);

            proc.on("exit", function(code) {

                process.stdin.unpipe(proc.stdin);

                if (code == 0) {
                    resolve();
                }
                else {
                    reject(code);
                }
            });
        });

    return deferred;
};