"use strict";
var _ = require("lodash");
var clc = require("cli-color");
var cjson = require("cjson");
var fs = require("fs");
var path = require("path");
var detectProjectRoot = require("./detectProjectRoot");
var { FirebaseError } = require("./error");
var fsutils = require("./fsutils");
var utils = require("./utils");
var TARGET_TYPES = {
    storage: { resource: "bucket", exclusive: true },
    database: { resource: "instance", exclusive: true },
    hosting: { resource: "site", exclusive: true },
};
var RC = function (rcpath, data) {
    this.path = rcpath;
    this.data = data || {};
};
RC.prototype = {
    set: function (key, value) {
        return _.set(this.data, key, value);
    },
    unset: function (key) {
        return _.unset(this.data, key);
    },
    get: function (key, fallback) {
        return _.get(this.data, key, fallback);
    },
    addProjectAlias: function (alias, project) {
        this.set(["projects", alias], project);
        return this.save();
    },
    removeProjectAlias: function (alias) {
        this.unset(["projects", alias]);
        return this.save();
    },
    get hasProjects() {
        return _.size(this.data.projects) > 0;
    },
    get projects() {
        return this.get("projects", {});
    },
    targets: function (project, type) {
        return this.get(["targets", project, type], {});
    },
    target: function (project, type, name) {
        return this.get(["targets", project, type, name], []);
    },
    applyTarget: function (project, type, targetName, resources) {
        if (!TARGET_TYPES[type]) {
            throw new FirebaseError("Unrecognized target type " +
                clc.bold(type) +
                ". Must be one of " +
                _.keys(TARGET_TYPES).join(", "), { code: 1 });
        }
        if (_.isString(resources)) {
            resources = [resources];
        }
        var changed = [];
        resources.forEach(function (resource) {
            var cur = this.findTarget(project, type, resource);
            if (cur && cur !== targetName) {
                this.unsetTargetResource(project, type, cur, resource);
                changed.push({ resource: resource, target: cur });
            }
        }.bind(this));
        var existing = this.get(["targets", project, type, targetName], []);
        var list = _.uniq(existing.concat(resources)).sort();
        this.set(["targets", project, type, targetName], list);
        this.save();
        return changed;
    },
    removeTarget: function (project, type, resource) {
        var name = this.findTarget(project, type, resource);
        if (!name) {
            return null;
        }
        this.unsetTargetResource(project, type, name, resource);
        this.save();
        return name;
    },
    clearTarget: function (project, type, name) {
        var exists = this.target(project, type, name).length > 0;
        if (!exists) {
            return false;
        }
        this.unset(["targets", project, type, name]);
        this.save();
        return true;
    },
    findTarget: function (project, type, resource) {
        var targets = this.get(["targets", project, type]);
        for (var targetName in targets) {
            if (_.includes(targets[targetName], resource)) {
                return targetName;
            }
        }
        return null;
    },
    unsetTargetResource: function (project, type, name, resource) {
        var targetPath = ["targets", project, type, name];
        var updatedResources = this.get(targetPath, []).filter(function (r) {
            return r !== resource;
        });
        if (updatedResources.length) {
            this.set(targetPath, updatedResources);
        }
        else {
            this.unset(targetPath);
        }
    },
    requireTarget: function (project, type, name) {
        var target = this.target(project, type, name);
        if (!target.length) {
            throw new FirebaseError("Deploy target " +
                clc.bold(name) +
                " not configured for project " +
                clc.bold(project) +
                ". Configure with:\n\n  firebase target:apply " +
                type +
                " " +
                name +
                " <resources...>", { exit: 1 });
        }
        return target;
    },
    save: function () {
        if (this.path) {
            fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), {
                encoding: "utf8",
            });
            return true;
        }
        return false;
    },
};
RC.loadFile = function (rcpath) {
    var data = {};
    if (fsutils.fileExistsSync(rcpath)) {
        try {
            data = cjson.load(rcpath);
        }
        catch (e) {
            utils.logWarning("JSON error trying to load " + clc.bold(rcpath));
        }
    }
    return new RC(rcpath, data);
};
RC.load = function (cwd) {
    cwd = cwd || process.cwd();
    var dir = detectProjectRoot(cwd);
    var potential = path.resolve(dir || cwd, "./.firebaserc");
    return RC.loadFile(potential);
};
module.exports = RC;
//# sourceMappingURL=rc.js.map