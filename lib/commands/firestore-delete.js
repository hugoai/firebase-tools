"use strict";
var clc = require("cli-color");
var Command = require("../command");
var FirestoreDelete = require("../firestore/delete");
var { prompt } = require("../prompt");
var requirePermissions = require("../requirePermissions");
var utils = require("../utils");
var _getConfirmationMessage = function (deleteOp, options) {
    if (options.allCollections) {
        return ("You are about to delete " +
            clc.bold.yellow.underline("THE ENTIRE DATABASE") +
            " for " +
            clc.cyan(options.project) +
            ". Are you sure?");
    }
    if (deleteOp.isDocumentPath) {
        if (options.recursive) {
            return ("You are about to delete the document at " +
                clc.cyan(deleteOp.path) +
                " and all of its subcollections. Are you sure?");
        }
        return "You are about to delete the document at " + clc.cyan(deleteOp.path) + ". Are you sure?";
    }
    if (options.recursive) {
        return ("You are about to delete all documents in the collection at " +
            clc.cyan(deleteOp.path) +
            " and all of their subcollections. " +
            "Are you sure?");
    }
    return ("You are about to delete all documents in the collection at " +
        clc.cyan(deleteOp.path) +
        ". Are you sure?");
};
module.exports = new Command("firestore:delete [path]")
    .description("Delete data from Cloud Firestore.")
    .option("-r, --recursive", "Recursive. Delete all documents and subcollections. " +
    "Any action which would result in the deletion of child documents will fail if " +
    "this argument is not passed. May not be passed along with --shallow.")
    .option("--shallow", "Shallow. Delete only parent documents and ignore documents in " +
    "subcollections. Any action which would orphan documents will fail if this argument " +
    "is not passed. May not be passed along with -r.")
    .option("--all-collections", "Delete all. Deletes the entire Firestore database, " +
    "including all collections and documents. Any other flags or arguments will be ignored.")
    .option("-y, --yes", "No confirmation. Otherwise, a confirmation prompt will appear.")
    .before(requirePermissions, ["datastore.entities.list", "datastore.entities.delete"])
    .action(function (path, options) {
    if (!path && !options.allCollections) {
        return utils.reject("Must specify a path.", { exit: 1 });
    }
    var deleteOp = new FirestoreDelete(options.project, path, {
        recursive: options.recursive,
        shallow: options.shallow,
        allCollections: options.allCollections,
    });
    var checkPrompt;
    if (options.yes) {
        checkPrompt = Promise.resolve({ confirm: true });
    }
    else {
        checkPrompt = prompt(options, [
            {
                type: "confirm",
                name: "confirm",
                default: false,
                message: _getConfirmationMessage(deleteOp, options),
            },
        ]);
    }
    return checkPrompt.then(function (res) {
        if (!res.confirm) {
            return utils.reject("Command aborted.", { exit: 1 });
        }
        if (options.allCollections) {
            return deleteOp.deleteDatabase();
        }
        return deleteOp.execute();
    });
});
//# sourceMappingURL=firestore-delete.js.map