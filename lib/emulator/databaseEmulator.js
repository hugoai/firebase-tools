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
const chokidar = require("chokidar");
const clc = require("cli-color");
const fs = require("fs");
const path = require("path");
const request = require("request");
const utils = require("../utils");
const javaEmulators = require("../serve/javaEmulators");
const types_1 = require("../emulator/types");
const constants_1 = require("./constants");
class DatabaseEmulator {
    constructor(args) {
        this.args = args;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.args.rules && this.args.projectId) {
                const rulesPath = this.args.rules;
                this.rulesWatcher = chokidar.watch(rulesPath, { persistent: true, ignoreInitial: true });
                this.rulesWatcher.on("change", (event, stats) => __awaiter(this, void 0, void 0, function* () {
                    const newContent = fs.readFileSync(rulesPath).toString();
                    utils.logLabeledBullet("database", "Change detected, updating rules...");
                    try {
                        yield this.updateRules(newContent);
                        utils.logLabeledSuccess("database", "Rules updated.");
                    }
                    catch (e) {
                        utils.logWarning(this.prettyPrintRulesError(rulesPath, e));
                        utils.logWarning("Failed to update rules");
                    }
                }));
            }
            return javaEmulators.start(types_1.Emulators.DATABASE, this.args);
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve();
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            return javaEmulators.stop(types_1.Emulators.DATABASE);
        });
    }
    getInfo() {
        const host = this.args.host || constants_1.Constants.getDefaultHost(types_1.Emulators.DATABASE);
        const port = this.args.port || constants_1.Constants.getDefaultPort(types_1.Emulators.DATABASE);
        return {
            host,
            port,
        };
    }
    getName() {
        return types_1.Emulators.DATABASE;
    }
    updateRules(content) {
        const { host, port } = this.getInfo();
        return new Promise((resolve, reject) => {
            request.put({
                uri: `http://${host}:${[port]}/.settings/rules.json?ns=${this.args.projectId}`,
                headers: { Authorization: "Bearer owner" },
                body: content,
            }, (err, resp, body) => {
                if (err) {
                    reject(err);
                }
                else if (resp.statusCode !== 200) {
                    reject(JSON.parse(body).error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    prettyPrintRulesError(filePath, error) {
        const relativePath = path.relative(process.cwd(), filePath);
        return `${clc.cyan(relativePath)}:${error.trim()}`;
    }
}
exports.DatabaseEmulator = DatabaseEmulator;
DatabaseEmulator.DATABASE_EMULATOR_ENV = "FIREBASE_DATABASE_EMULATOR_HOST";
//# sourceMappingURL=databaseEmulator.js.map