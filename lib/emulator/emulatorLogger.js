"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("../utils");
const logger = require("../logger");
const TYPE_VERBOSITY = {
    DEBUG: 0,
    INFO: 1,
    BULLET: 1,
    SUCCESS: 1,
    USER: 2,
    WARN: 2,
};
var Verbosity;
(function (Verbosity) {
    Verbosity[Verbosity["DEBUG"] = 0] = "DEBUG";
    Verbosity[Verbosity["INFO"] = 1] = "INFO";
    Verbosity[Verbosity["QUIET"] = 2] = "QUIET";
})(Verbosity = exports.Verbosity || (exports.Verbosity = {}));
class EmulatorLogger {
    static log(type, text) {
        if (EmulatorLogger.shouldSupress(type)) {
            logger.debug(`${type}: ${text}`);
            return;
        }
        switch (type) {
            case "DEBUG":
                logger.debug(text);
                break;
            case "INFO":
                logger.info(text);
                break;
            case "USER":
                logger.info(text);
                break;
            case "BULLET":
                utils.logBullet(text);
                break;
            case "WARN":
                utils.logWarning(text);
                break;
            case "SUCCESS":
                utils.logSuccess(text);
                break;
        }
    }
    static logLabeled(type, label, text) {
        if (EmulatorLogger.shouldSupress(type)) {
            logger.debug(`[${label}] ${text}`);
            return;
        }
        switch (type) {
            case "BULLET":
                utils.logLabeledBullet(label, text);
                break;
            case "SUCCESS":
                utils.logLabeledSuccess(label, text);
                break;
            case "WARN":
                utils.logLabeledWarning(label, text);
                break;
        }
    }
    static shouldSupress(type) {
        const typeVerbosity = TYPE_VERBOSITY[type];
        return EmulatorLogger.verbosity > typeVerbosity;
    }
}
exports.EmulatorLogger = EmulatorLogger;
EmulatorLogger.verbosity = Verbosity.DEBUG;
//# sourceMappingURL=emulatorLogger.js.map