#!/usr/bin/env node
"use strict";
var semver = require("semver");
var pkg = require("../../package.json");
var nodeVersion = process.version;
if (!semver.satisfies(nodeVersion, pkg.engines.node)) {
    console.error("Firebase CLI v" +
        pkg.version +
        " is incompatible with Node.js " +
        nodeVersion +
        " Please upgrade Node.js to version " +
        pkg.engines.node);
    process.exit(1);
}
var updateNotifier = require("update-notifier")({ pkg: pkg });
updateNotifier.notify({ defer: true, isGlobal: true });
var client = require("..");
var errorOut = require("../errorOut");
var winston = require("winston");
var logger = require("../logger");
var configstore = require("../configstore");
var _ = require("lodash");
var args = process.argv.slice(2);
var handlePreviewToggles = require("../handlePreviewToggles");
var utils = require("../utils");
var cmd;
logger.add(winston.transports.Console, {
    level: process.env.DEBUG ? "debug" : "info",
    showLevel: false,
    colorize: true,
});
if (_.includes(args, "--debug")) {
    logger.transports.console.level = "debug";
}
logger.debug(_.repeat("-", 70));
logger.debug("Command:      ", process.argv.join(" "));
logger.debug("CLI Version:  ", pkg.version);
logger.debug("Platform:     ", process.platform);
logger.debug("Node Version: ", process.version);
logger.debug("Time:         ", new Date().toString());
if (utils.envOverrides.length) {
    logger.debug("Env Overrides:", utils.envOverrides.join(", "));
}
logger.debug(_.repeat("-", 70));
logger.debug();
require("../fetchMOTD")();
process.on("exit", function (code) {
    code = process.exitCode || code;
    if (code > 0 && process.stdout.isTTY) {
        var lastError = configstore.get("lastError") || 0;
        var timestamp = Date.now();
        if (lastError > timestamp - 120000) {
            var help;
            if (code === 1 && cmd) {
                var commandName = _.get(_.last(cmd.args), "_name", "[command]");
                help = "Having trouble? Try firebase --help";
            }
            else {
                help = "Having trouble? Try again or contact support with contents of firebase-debug.log";
            }
            if (cmd) {
                console.log();
                console.log(help);
            }
        }
        configstore.set("lastError", timestamp);
    }
    else {
        configstore.del("lastError");
    }
});
require("exit-code");
process.on("uncaughtException", function (err) {
    errorOut(client, err);
});
if (!handlePreviewToggles(args)) {
    cmd = client.cli.parse(process.argv);
    args = args.filter(function (arg) {
        return arg.indexOf("-") < 0;
    });
    if (!args.length) {
        client.cli.help();
    }
}
//# sourceMappingURL=firebase.js.map