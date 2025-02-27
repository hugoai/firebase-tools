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
const childProcess = require("child_process");
const clc = require("cli-color");
const Command = require("../command");
const types_1 = require("../emulator/types");
const error_1 = require("../error");
const utils = require("../utils");
const logger = require("../logger");
const controller = require("../emulator/controller");
const databaseEmulator_1 = require("../emulator/databaseEmulator");
const registry_1 = require("../emulator/registry");
const firestoreEmulator_1 = require("../emulator/firestoreEmulator");
const commandUtils_1 = require("../emulator/commandUtils");
function runScript(script) {
    return __awaiter(this, void 0, void 0, function* () {
        utils.logBullet(`Running script: ${clc.bold(script)}`);
        const env = Object.assign({}, process.env);
        const databaseInstance = registry_1.EmulatorRegistry.get(types_1.Emulators.DATABASE);
        if (databaseInstance) {
            const info = databaseInstance.getInfo();
            const address = `${info.host}:${info.port}`;
            env[databaseEmulator_1.DatabaseEmulator.DATABASE_EMULATOR_ENV] = address;
        }
        const firestoreInstance = registry_1.EmulatorRegistry.get(types_1.Emulators.FIRESTORE);
        if (firestoreInstance) {
            const info = firestoreInstance.getInfo();
            const address = `${info.host}:${info.port}`;
            env[firestoreEmulator_1.FirestoreEmulator.FIRESTORE_EMULATOR_ENV] = address;
            env[firestoreEmulator_1.FirestoreEmulator.FIRESTORE_EMULATOR_ENV_ALT] = address;
        }
        const proc = childProcess.spawn(script, {
            stdio: ["inherit", "inherit", "inherit"],
            shell: true,
            windowsHide: true,
            env,
        });
        logger.debug(`Running ${script} with environment ${JSON.stringify(env)}`);
        return new Promise((resolve, reject) => {
            proc.on("error", (err) => {
                utils.logWarning(`There was an error running the script: ${JSON.stringify(err)}`);
                reject();
            });
            const exitDelayMs = 500;
            proc.once("exit", (code, signal) => {
                if (signal) {
                    utils.logWarning(`Script exited with signal: ${signal}`);
                    setTimeout(reject, exitDelayMs);
                    return;
                }
                const exitCode = code || 0;
                if (code === 0) {
                    utils.logSuccess(`Script exited successfully (code 0)`);
                }
                else {
                    utils.logWarning(`Script exited unsuccessfully (code ${code})`);
                }
                setTimeout(() => {
                    resolve(exitCode);
                }, exitDelayMs);
            });
        });
    });
}
module.exports = new Command("emulators:exec <script>")
    .before(commandUtils_1.beforeEmulatorCommand)
    .description("start the local Firebase emulators, " + "run a test script, then shut down the emulators")
    .option("--only <list>", "only run specific emulators. " +
    "This is a comma separated list of emulators to start. " +
    "Valid options are: " +
    JSON.stringify(controller.VALID_EMULATOR_STRINGS))
    .action((script, options) => __awaiter(void 0, void 0, void 0, function* () {
    let exitCode = 0;
    try {
        yield controller.startAll(options);
        exitCode = yield runScript(script);
    }
    catch (e) {
        logger.debug("Error in emulators:exec", e);
        throw e;
    }
    finally {
        yield controller.cleanShutdown();
    }
    if (exitCode !== 0) {
        throw new error_1.FirebaseError(`Script "${clc.bold(script)}" exited with code ${exitCode}`, {
            exit: exitCode,
        });
    }
}));
//# sourceMappingURL=emulators-exec.js.map