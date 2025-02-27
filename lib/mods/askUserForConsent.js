"use strict";
const _ = require("lodash");
const clc = require("cli-color");
const { FirebaseError } = require("../error");
const iam = require("../gcp/iam");
const { promptOnce } = require("../prompt");
const utils = require("../utils");
function _formatDescription(modName, projectId, roles) {
    const question = `${clc.bold(modName)} will be granted the following access to project ${clc.bold(projectId)}`;
    return Promise.all(_.map(roles, (role) => module.exports._retrieveRoleInfo(role))).then((results) => {
        results.unshift(question);
        return _.join(results, "\n");
    });
}
function _retrieveRoleInfo(role) {
    return iam.getRole(role).then((result) => {
        return `- ${result.title} (${result.description})`;
    });
}
function _prompt(modName, projectId, roles) {
    if (!roles || !roles.length) {
        return Promise.resolve();
    }
    return _formatDescription(modName, projectId, roles)
        .then(function (message) {
        utils.logLabeledBullet("mods", message);
        const question = {
            name: "consent",
            type: "confirm",
            message: "Would you like to continue?",
            default: true,
        };
        return promptOnce(question);
    })
        .then((consented) => {
        if (!consented) {
            throw new FirebaseError("Without explicit consent for the roles listed, we cannot deploy this mod.", { exit: 2 });
        }
    });
}
module.exports = {
    prompt: _prompt,
    _formatDescription: _formatDescription,
    _retrieveRoleInfo: _retrieveRoleInfo,
};
//# sourceMappingURL=askUserForConsent.js.map