"use strict";
var _ = require("lodash");
var clc = require("cli-color");
var { FirebaseError } = require("./error");
var logger = require("./logger");
var track = require("./track");
var utils = require("./utils");
var cloudfunctions = require("./gcp/cloudfunctions");
var pollOperations = require("./pollOperations");
function functionMatchesGroup(functionName, groupChunks) {
    return _.isEqual(groupChunks, _.last(functionName.split("/"))
        .split("-")
        .slice(0, groupChunks.length));
}
function getFilterGroups(options) {
    if (!options.only) {
        return [];
    }
    var opts;
    return _.chain(options.only.split(","))
        .filter(function (filter) {
        opts = filter.split(":");
        return opts[0] === "functions" && opts[1];
    })
        .map(function (filter) {
        return filter.split(":")[1].split(".");
    })
        .value();
}
function getReleaseNames(uploadNames, existingNames, functionFilterGroups) {
    if (functionFilterGroups.length === 0) {
        return uploadNames;
    }
    var allFunctions = _.union(uploadNames, existingNames);
    return _.filter(allFunctions, function (functionName) {
        return _.some(_.map(functionFilterGroups, function (groupChunks) {
            return functionMatchesGroup(functionName, groupChunks);
        }));
    });
}
function logFilters(existingNames, releaseNames, functionFilterGroups) {
    if (functionFilterGroups.length === 0) {
        return;
    }
    logger.debug("> [functions] filtering triggers to: " + JSON.stringify(releaseNames, null, 2));
    track("Functions Deploy with Filter", "", releaseNames.length);
    if (existingNames.length > 0) {
        var list = _.map(existingNames, function (name) {
            return getFunctionName(name) + "(" + getRegion(name) + ")";
        }).join(", ");
        utils.logBullet(clc.bold.cyan("functions: ") + "current functions in project: " + list);
    }
    if (releaseNames.length > 0) {
        var list = _.map(releaseNames, function (name) {
            return getFunctionName(name) + "(" + getRegion(name) + ")";
        }).join(", ");
        utils.logBullet(clc.bold.cyan("functions: ") + "uploading functions in project: " + list);
    }
    var allFunctions = _.union(releaseNames, existingNames);
    var unmatchedFilters = _.chain(functionFilterGroups)
        .filter(function (filterGroup) {
        return !_.some(_.map(allFunctions, function (functionName) {
            return functionMatchesGroup(functionName, filterGroup);
        }));
    })
        .map(function (group) {
        return group.join("-");
    })
        .value();
    if (unmatchedFilters.length > 0) {
        utils.logWarning(clc.bold.yellow("functions: ") +
            "the following filters were specified but do not match any functions in the project: " +
            unmatchedFilters.join(", "));
    }
}
function getFunctionsInfo(parsedTriggers, projectId) {
    var functionsInfo = [];
    _.forEach(parsedTriggers, function (trigger) {
        if (!trigger.regions) {
            trigger.regions = ["us-central1"];
        }
        _.forEach(trigger.regions, function (region) {
            var triggerDeepCopy = JSON.parse(JSON.stringify(trigger));
            functionsInfo.push(_.chain(triggerDeepCopy)
                .omit("regions")
                .assign({
                name: ["projects", projectId, "locations", region, "functions", trigger.name].join("/"),
            })
                .value());
        });
    });
    return functionsInfo;
}
function getFunctionTrigger(functionInfo) {
    if (functionInfo.httpsTrigger) {
        return _.pick(functionInfo, "httpsTrigger");
    }
    else if (functionInfo.eventTrigger) {
        var trigger = functionInfo.eventTrigger;
        return { eventTrigger: trigger };
    }
    logger.debug("Unknown trigger type found in:", functionInfo);
    return new FirebaseError("Could not parse function trigger, unknown trigger type.");
}
function getFunctionName(fullName) {
    return fullName.split("/")[5];
}
function getScheduleName(fullName, appEngineLocation) {
    var [projectsPrefix, project, regionsPrefix, region, , functionName] = fullName.split("/");
    return `${projectsPrefix}/${project}/${regionsPrefix}/${appEngineLocation}/jobs/firebase-schedule-${functionName}-${region}`;
}
function getTopicName(fullName) {
    var [projectsPrefix, project, , region, , functionName] = fullName.split("/");
    return `${projectsPrefix}/${project}/topics/firebase-schedule-${functionName}-${region}`;
}
function getRegion(fullName) {
    return fullName.split("/")[3];
}
function getFunctionLabel(fullName) {
    return getFunctionName(fullName) + "(" + getRegion(fullName) + ")";
}
function pollDeploys(operations, printSuccess, printFail, printTooManyOps, projectId) {
    var interval;
    if (_.size(operations) > 90) {
        printTooManyOps(projectId);
        return Promise.resolve();
    }
    else if (_.size(operations) > 40) {
        interval = 10 * 1000;
    }
    else if (_.size(operations) > 15) {
        interval = 5 * 1000;
    }
    else {
        interval = 2 * 1000;
    }
    var pollFunction = cloudfunctions.check;
    var retryCondition = function (result) {
        var retryableCodes = [
            1,
            4,
            10,
            14,
        ];
        if (_.includes(retryableCodes, result.error.code)) {
            return true;
        }
        return false;
    };
    return pollOperations
        .pollAndRetry(operations, pollFunction, interval, printSuccess, printFail, retryCondition)
        .catch(function () {
        utils.logWarning(clc.bold.yellow("functions:") + " failed to get status of all the deployments");
        logger.info("You can check on their status at " + utils.consoleUrl(projectId, "/functions/logs"));
        return Promise.reject(new FirebaseError("Failed to get status of functions deployments."));
    });
}
function getDefaultRuntime() {
    logger.info();
    utils.logWarning(clc.bold.yellow("functions: WARNING! NO ENGINES FIELD FOUND IN PACKAGE.JSON. DEFAULTING TO NODE 6 RUNTIME. " +
        "Starting June 1, 2019 deployments will be blocked if no engines field is specified in package.json. " +
        "To fix this, add the following lines to your package.json:\n\n" +
        '"engines": {\n  "node": "6" \n}'));
    logger.info();
    return "nodejs6";
}
module.exports = {
    getFilterGroups: getFilterGroups,
    getReleaseNames: getReleaseNames,
    logFilters: logFilters,
    getFunctionsInfo: getFunctionsInfo,
    getFunctionTrigger: getFunctionTrigger,
    getFunctionName: getFunctionName,
    getRegion: getRegion,
    getScheduleName: getScheduleName,
    getTopicName: getTopicName,
    functionMatchesGroup: functionMatchesGroup,
    getFunctionLabel: getFunctionLabel,
    pollDeploys: pollDeploys,
    getDefaultRuntime: getDefaultRuntime,
};
//# sourceMappingURL=functionsDeployHelper.js.map