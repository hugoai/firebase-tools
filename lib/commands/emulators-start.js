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
const Command = require("../command");
const controller = require("../emulator/controller");
const commandUtils_1 = require("../emulator/commandUtils");
const utils = require("../utils");
module.exports = new Command("emulators:start")
    .before(commandUtils_1.beforeEmulatorCommand)
    .description("start the local Firebase emulators")
    .option("--only <list>", "only run specific emulators. " +
    "This is a comma separated list of emulators to start. " +
    "Valid options are: " +
    JSON.stringify(controller.VALID_EMULATOR_STRINGS))
    .action((options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield controller.startAll(options);
    }
    catch (e) {
        yield controller.cleanShutdown();
        throw e;
    }
    utils.logSuccess("All emulators started, it is now safe to connect.");
    yield new Promise((res, rej) => {
        process.on("SIGINT", () => {
            controller
                .cleanShutdown()
                .then(res)
                .catch(res);
        });
    });
}));
//# sourceMappingURL=emulators-start.js.map