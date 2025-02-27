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
const clc = require("cli-color");
const _ = require("lodash");
const firebaseApi = require("../../firebaseApi");
const error_1 = require("../../error");
const firebaseApi_1 = require("../../firebaseApi");
const logger = require("../../logger");
const prompt_1 = require("../../prompt");
const utils = require("../../utils");
const NO_PROJECT = "[don't setup a default project]";
const NEW_PROJECT = "[create a new project]";
function getProjectInfo(options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.project) {
            return selectProjectFromOptions(options);
        }
        return selectProjectFromList(options);
    });
}
exports.getProjectInfo = getProjectInfo;
function selectProjectFromOptions(options) {
    return __awaiter(this, void 0, void 0, function* () {
        let project;
        try {
            project = yield firebaseApi_1.getProject(options.project);
        }
        catch (e) {
            throw new error_1.FirebaseError(`Error getting project ${options.project}: ${e}`);
        }
        const projectId = project.projectId;
        const name = project.displayName;
        return {
            id: projectId,
            label: `${projectId} (${name})`,
            instance: _.get(project, "resources.realtimeDatabaseInstance"),
            location: _.get(project, "resources.locationId"),
        };
    });
}
function selectProjectFromList(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield firebaseApi_1.listProjects();
        let choices = projects.filter((p) => !!p).map((p) => {
            return {
                name: `${p.projectId} (${p.displayName})`,
                value: p.projectId,
            };
        });
        choices = _.orderBy(choices, ["name"], ["asc"]);
        choices.unshift({ name: NO_PROJECT, value: NO_PROJECT });
        choices.push({ name: NEW_PROJECT, value: NEW_PROJECT });
        if (choices.length >= 25) {
            utils.logBullet(`Don't want to scroll through all your projects? If you know your project ID, ` +
                `you can initialize it directly using ${clc.bold("firebase init --project <project_id>")}.\n`);
        }
        const projectId = yield prompt_1.promptOnce({
            type: "list",
            name: "id",
            message: "Select a default Firebase project for this directory:",
            choices,
        });
        if (projectId === NEW_PROJECT || projectId === NO_PROJECT) {
            return { id: projectId };
        }
        let project;
        project = projects.find((p) => p.projectId === projectId);
        const pId = choices.find((p) => p.value === projectId);
        const label = pId ? pId.name : "";
        return {
            id: projectId,
            label,
            instance: _.get(project, "resources.realtimeDatabaseInstance"),
            location: _.get(project, "resources.locationId"),
        };
    });
}
function doSetup(setup, config, options) {
    return __awaiter(this, void 0, void 0, function* () {
        setup.project = {};
        logger.info();
        logger.info(`First, let's associate this project directory with a Firebase project.`);
        logger.info(`You can create multiple project aliases by running ${clc.bold("firebase use --add")}, `);
        logger.info(`but for now we'll just set up a default project.`);
        logger.info();
        const projectFromRcFile = _.get(setup.rcfile, "projects.default");
        if (projectFromRcFile) {
            utils.logBullet(`.firebaserc already has a default project, using ${projectFromRcFile}.`);
            const rcProject = yield firebaseApi.getProject(projectFromRcFile);
            setup.projectId = projectFromRcFile;
            setup.projectLocation = _.get(rcProject, "resources.locationId");
            return;
        }
        const projectInfo = yield getProjectInfo(options);
        if (projectInfo.id === NEW_PROJECT) {
            setup.createProject = true;
            return;
        }
        else if (projectInfo.id === NO_PROJECT) {
            return;
        }
        utils.logBullet(`Using project ${projectInfo.label}`);
        _.set(setup.rcfile, "projects.default", projectInfo.id);
        setup.projectId = projectInfo.id;
        setup.instance = projectInfo.instance;
        setup.projectLocation = projectInfo.location;
        utils.makeActiveProject(config.projectDir, projectInfo.id);
    });
}
exports.doSetup = doSetup;
//# sourceMappingURL=project.js.map