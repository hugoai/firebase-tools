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
const pf = require("portfinder");
const path = require("path");
const utils = require("../utils");
const track = require("../track");
const filterTargets = require("../filterTargets");
const registry_1 = require("../emulator/registry");
const types_1 = require("../emulator/types");
const constants_1 = require("../emulator/constants");
const functionsEmulator_1 = require("../emulator/functionsEmulator");
const databaseEmulator_1 = require("../emulator/databaseEmulator");
const firestoreEmulator_1 = require("../emulator/firestoreEmulator");
const hostingEmulator_1 = require("../emulator/hostingEmulator");
const error_1 = require("../error");
const getProjectId = require("../getProjectId");
exports.VALID_EMULATOR_STRINGS = types_1.ALL_EMULATORS;
function checkPortOpen(port) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield pf.getPortPromise({ port, stopPort: port });
            return true;
        }
        catch (e) {
            return false;
        }
    });
}
exports.checkPortOpen = checkPortOpen;
function waitForPortClosed(port) {
    return __awaiter(this, void 0, void 0, function* () {
        const interval = 250;
        const timeout = 30000;
        let elapsed = 0;
        while (elapsed < timeout) {
            const open = yield checkPortOpen(port);
            if (!open) {
                return;
            }
            yield new Promise((r) => setTimeout(r, interval));
            elapsed += interval;
        }
        throw new error_1.FirebaseError(`TIMEOUT: Port ${port} was not active within ${timeout}ms`);
    });
}
exports.waitForPortClosed = waitForPortClosed;
function startEmulator(instance) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = instance.getName();
        const info = instance.getInfo();
        track("emulators:start", name);
        const portOpen = yield checkPortOpen(info.port);
        if (!portOpen) {
            yield cleanShutdown();
            utils.logWarning(`Port ${info.port} is not open, could not start ${name} emulator.`);
            utils.logBullet(`To select a different port for the emulator, update your "firebase.json":
    {
      // ...
      "emulators": {
        "${name}": {
          "port": "${clc.yellow("PORT")}"
        }
      }
    }`);
            return utils.reject(`Could not start ${name} emulator, port taken.`, {});
        }
        yield registry_1.EmulatorRegistry.start(instance);
    });
}
exports.startEmulator = startEmulator;
function cleanShutdown() {
    return __awaiter(this, void 0, void 0, function* () {
        utils.logBullet("Shutting down emulators.");
        for (const name of registry_1.EmulatorRegistry.listRunning()) {
            utils.logBullet(`Stopping ${name} emulator`);
            yield registry_1.EmulatorRegistry.stop(name);
        }
        return true;
    });
}
exports.cleanShutdown = cleanShutdown;
function shouldStart(options, name) {
    const targets = filterTargets(options, exports.VALID_EMULATOR_STRINGS);
    return targets.indexOf(name) >= 0;
}
exports.shouldStart = shouldStart;
function startAll(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const targets = filterTargets(options, exports.VALID_EMULATOR_STRINGS);
        options.targets = targets;
        const projectId = getProjectId(options, true);
        utils.logBullet(`Starting emulators: ${JSON.stringify(targets)}`);
        if (options.only) {
            const requested = options.only.split(",");
            const ignored = _.difference(requested, targets);
            for (const name of ignored) {
                utils.logWarning(`Not starting the ${clc.bold(name)} emulator, make sure you have run ${clc.bold("firebase init")}.`);
            }
        }
        if (shouldStart(options, types_1.Emulators.FUNCTIONS)) {
            const functionsAddr = constants_1.Constants.getAddress(types_1.Emulators.FUNCTIONS, options);
            const functionsEmulator = new functionsEmulator_1.FunctionsEmulator(options, {
                host: functionsAddr.host,
                port: functionsAddr.port,
            });
            yield startEmulator(functionsEmulator);
        }
        if (shouldStart(options, types_1.Emulators.FIRESTORE)) {
            const firestoreAddr = constants_1.Constants.getAddress(types_1.Emulators.FIRESTORE, options);
            const args = {
                host: firestoreAddr.host,
                port: firestoreAddr.port,
                projectId,
                auto_download: true,
            };
            const rulesLocalPath = options.config.get("firestore.rules");
            if (rulesLocalPath) {
                const rules = path.join(options.projectRoot, rulesLocalPath);
                if (fs.existsSync(rules)) {
                    args.rules = rules;
                }
                else {
                    utils.logWarning(`Firestore rules file ${clc.bold(rules)} specified in firebase.json does not exist, starting Firestore emulator without rules.`);
                }
            }
            else {
                utils.logWarning(`No Firestore rules file specified in firebase.json, using default rules.`);
            }
            const firestoreEmulator = new firestoreEmulator_1.FirestoreEmulator(args);
            yield startEmulator(firestoreEmulator);
            utils.logLabeledBullet(types_1.Emulators.FIRESTORE, `For testing set ${clc.bold(`${firestoreEmulator_1.FirestoreEmulator.FIRESTORE_EMULATOR_ENV}=${firestoreAddr.host}:${firestoreAddr.port}`)}`);
        }
        if (shouldStart(options, types_1.Emulators.DATABASE)) {
            const databaseAddr = constants_1.Constants.getAddress(types_1.Emulators.DATABASE, options);
            const args = {
                host: databaseAddr.host,
                port: databaseAddr.port,
                projectId,
                auto_download: true,
            };
            if (shouldStart(options, types_1.Emulators.FUNCTIONS)) {
                const functionsAddr = constants_1.Constants.getAddress(types_1.Emulators.FUNCTIONS, options);
                args.functions_emulator_host = functionsAddr.host;
                args.functions_emulator_port = functionsAddr.port;
            }
            const rulesLocalPath = options.config.get("database.rules");
            if (rulesLocalPath) {
                const rules = path.join(options.projectRoot, rulesLocalPath);
                if (fs.existsSync(rules)) {
                    args.rules = rules;
                }
                else {
                    utils.logWarning(`Database rules file ${clc.bold(rules)} specified in firebase.json does not exist, starting Database emulator without rules.`);
                }
            }
            else {
                utils.logWarning(`No Database rules file specified in firebase.json, using default rules.`);
            }
            const databaseEmulator = new databaseEmulator_1.DatabaseEmulator(args);
            yield startEmulator(databaseEmulator);
            utils.logLabeledBullet(types_1.Emulators.DATABASE, `For testing set ${clc.bold(`${databaseEmulator_1.DatabaseEmulator.DATABASE_EMULATOR_ENV}=${databaseAddr.host}:${databaseAddr.port}`)}`);
        }
        if (shouldStart(options, types_1.Emulators.HOSTING)) {
            const hostingAddr = constants_1.Constants.getAddress(types_1.Emulators.HOSTING, options);
            const hostingEmulator = new hostingEmulator_1.HostingEmulator({
                host: hostingAddr.host,
                port: hostingAddr.port,
                options,
            });
            yield startEmulator(hostingEmulator);
        }
        const running = registry_1.EmulatorRegistry.listRunning();
        for (const name of running) {
            const instance = registry_1.EmulatorRegistry.get(name);
            if (instance) {
                yield instance.connect();
            }
        }
    });
}
exports.startAll = startAll;
//# sourceMappingURL=controller.js.map