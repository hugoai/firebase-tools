"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const clc = require("cli-color");
const fs = require("fs");
const gcp = require("./gcp");
const logger = require("./logger");
const error_1 = require("./error");
const utils = require("./utils");
const prompt_1 = require("./prompt");
const QUOTA_EXCEEDED_STATUS_CODE = 429;
const RULESET_COUNT_LIMIT = 1000;
const RULESETS_TO_GC = 10;
class RulesDeploy {
    constructor(options, type) {
        this.type = type;
        this.options = options;
        this.project = options.project;
        this.rulesFiles = {};
        this.rulesetNames = {};
    }
    addFile(path) {
        const fullPath = this.options.config.path(path);
        let src;
        try {
            src = fs.readFileSync(fullPath, "utf8");
        }
        catch (e) {
            logger.debug("[rules read error]", e.stack);
            throw new error_1.FirebaseError("Error reading rules file " + clc.bold(path));
        }
        this.rulesFiles[path] = [{ name: path, content: src }];
    }
    compile() {
        const promises = [];
        _.forEach(this.rulesFiles, (files, filename) => {
            promises.push(this._compileRuleset(filename, files));
        });
        return Promise.all(promises);
    }
    createRulesets() {
        const promises = [];
        _.forEach(this.rulesFiles, (files, filename) => {
            utils.logBullet(clc.bold.cyan(this.type + ":") + " uploading rules " + clc.bold(filename) + "...");
            promises.push(gcp.rules.createRuleset(this.options.project, files).then((rulesetName) => {
                this.rulesetNames[filename] = rulesetName;
            }));
        });
        return Promise.all(promises).catch((err) => __awaiter(this, void 0, void 0, function* () {
            if (err.status === QUOTA_EXCEEDED_STATUS_CODE) {
                utils.logBullet(clc.bold.yellow(this.type + ":") + " quota exceeded error while uploading rules");
                const history = yield gcp.rules.listAllRulesets(this.options.project);
                if (history.length > RULESET_COUNT_LIMIT) {
                    const answers = yield prompt_1.prompt({
                        confirm: !!this.options.force,
                    }, [
                        {
                            type: "confirm",
                            name: "confirm",
                            message: `You have ${history.length} rules, do you want to delete the oldest ${RULESETS_TO_GC} to free up space?`,
                            default: false,
                        },
                    ]);
                    if (answers.confirm) {
                        const releases = yield gcp.rules.listAllReleases(this.options.project);
                        const isReleased = (ruleset) => !!releases.find((release) => release.rulesetName === ruleset.name);
                        const unreleased = _.reject(history, isReleased);
                        const entriesToDelete = unreleased.reverse().slice(0, RULESETS_TO_GC);
                        for (const entry of entriesToDelete) {
                            yield gcp.rules.deleteRuleset(this.options.project, gcp.rules.getRulesetId(entry));
                            logger.debug(`[rules] Deleted ${entry.name}`);
                        }
                        utils.logBullet(clc.bold.yellow(this.type + ":") + " retrying rules upload");
                        return this.createRulesets();
                    }
                }
            }
            throw err;
        }));
    }
    release(filename, resourceName) {
        return gcp.rules
            .updateOrCreateRelease(this.options.project, this.rulesetNames[filename], resourceName)
            .then(() => {
            utils.logSuccess(clc.bold.green(this.type + ": ") +
                "released rules " +
                clc.bold(filename) +
                " to " +
                clc.bold(resourceName));
        });
    }
    _compileRuleset(filename, files) {
        utils.logBullet(clc.bold.cyan(this.type + ":") +
            " checking " +
            clc.bold(filename) +
            " for compilation errors...");
        return gcp.rules.testRuleset(this.options.project, files).then((response) => {
            if (response.body && response.body.issues && response.body.issues.length > 0) {
                const warnings = [];
                const errors = [];
                response.body.issues.forEach((issue) => {
                    const issueMessage = "[" +
                        issue.severity.substring(0, 1) +
                        "] " +
                        issue.sourcePosition.line +
                        ":" +
                        issue.sourcePosition.column +
                        " - " +
                        issue.description;
                    if (issue.severity === "ERROR") {
                        errors.push(issueMessage);
                    }
                    else {
                        warnings.push(issueMessage);
                    }
                });
                if (warnings.length > 0) {
                    warnings.forEach((warning) => {
                        utils.logWarning(warning);
                    });
                }
                if (errors.length > 0) {
                    const add = errors.length === 1 ? "" : "s";
                    const message = "Compilation error" + add + " in " + clc.bold(filename) + ":\n" + errors.join("\n");
                    return utils.reject(message, { exit: 1 });
                }
            }
            utils.logSuccess(clc.bold.green(this.type + ":") +
                " rules file " +
                clc.bold(filename) +
                " compiled successfully");
            return Promise.resolve();
        });
    }
}
exports.RulesDeploy = RulesDeploy;
//# sourceMappingURL=RulesDeploy.js.map