"use strict";
var _ = require("lodash");
var clc = require("cli-color");
var { FirebaseError } = require("./error");
var functionsConfig = require("./functionsConfig");
var runtimeconfig = require("./gcp/runtimeconfig");
var _matchPrefix = function (short, long) {
    if (short.length > long.length) {
        return false;
    }
    return _.reduce(short, function (accum, x, i) {
        return accum && x === long[i];
    }, true);
};
var _applyExcept = function (json, except) {
    _.forEach(except, function (key) {
        _.unset(json, key);
    });
};
var _cloneVariable = function (varName, toProject) {
    return runtimeconfig.variables.get(varName).then(function (variable) {
        var id = functionsConfig.varNameToIds(variable.name);
        return runtimeconfig.variables.set(toProject, id.config, id.variable, variable.text);
    });
};
var _cloneConfig = function (configName, toProject) {
    return runtimeconfig.variables.list(configName).then(function (variables) {
        return Promise.all(_.map(variables, function (variable) {
            return _cloneVariable(variable.name, toProject);
        }));
    });
};
var _cloneConfigOrVariable = function (key, fromProject, toProject) {
    var parts = key.split(".");
    if (_.includes(exports.RESERVED_NAMESPACES, parts[0])) {
        throw new FirebaseError("Cannot clone reserved namespace " + clc.bold(parts[0]));
    }
    var configName = _.join(["projects", fromProject, "configs", parts[0]], "/");
    if (parts.length === 1) {
        return _cloneConfig(configName, toProject);
    }
    return runtimeconfig.variables.list(configName).then(function (variables) {
        var promises = [];
        _.forEach(variables, function (variable) {
            var varId = functionsConfig.varNameToIds(variable.name).variable;
            var variablePrefixFilter = parts.slice(1);
            if (_matchPrefix(variablePrefixFilter, varId.split("/"))) {
                promises.push(_cloneVariable(variable.name, toProject));
            }
        });
        return Promise.all(promises);
    });
};
module.exports = function (fromProject, toProject, only, except) {
    except = except || [];
    if (only) {
        return Promise.all(_.map(only, function (key) {
            return _cloneConfigOrVariable(key, fromProject, toProject);
        }));
    }
    return functionsConfig.materializeAll(fromProject).then(function (toClone) {
        _.unset(toClone, "firebase");
        _applyExcept(toClone, except);
        return Promise.all(_.map(toClone, function (val, configId) {
            return functionsConfig.setVariablesRecursive(toProject, configId, "", val);
        }));
    });
};
//# sourceMappingURL=functionsConfigClone.js.map