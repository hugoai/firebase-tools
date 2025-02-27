"use strict";
var _ = require("lodash");
var clc = require("cli-color");
var { FirebaseError } = require("./error");
module.exports = function (options, allowNull = false) {
    if (!options.project && !allowNull) {
        var aliases = _.get(options, "rc.projects", {});
        var aliasCount = _.size(aliases);
        if (aliasCount === 0) {
            throw new FirebaseError("No project active. Run with " +
                clc.bold("--project <projectId>") +
                " or define an alias by\nrunning " +
                clc.bold("firebase use --add"), {
                exit: 1,
            });
        }
        else {
            var aliasList = _.map(aliases, function (projectId, aname) {
                return "  " + aname + " (" + projectId + ")";
            }).join("\n");
            throw new FirebaseError("No project active, but project aliases are available.\n\nRun " +
                clc.bold("firebase use <alias>") +
                " with one of these options:\n\n" +
                aliasList);
        }
    }
    return options.project;
};
//# sourceMappingURL=getProjectId.js.map