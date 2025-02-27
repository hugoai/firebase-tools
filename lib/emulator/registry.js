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
const types_1 = require("./types");
const error_1 = require("../error");
const utils = require("../utils");
const controller = require("./controller");
class EmulatorRegistry {
    static start(instance) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning(instance.getName())) {
                throw new error_1.FirebaseError(`Emulator ${instance.getName()} is already running!`, {});
            }
            yield instance.start();
            yield controller.waitForPortClosed(instance.getInfo().port);
            this.set(instance.getName(), instance);
            const info = instance.getInfo();
            utils.logLabeledSuccess(instance.getName(), `Emulator started at ${clc.bold.underline(`http://${info.host}:${info.port}`)}`);
        });
    }
    static stop(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const instance = this.get(name);
            if (!instance) {
                return;
            }
            yield instance.stop();
            this.clear(instance.getName());
        });
    }
    static stopAll() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const name of this.listRunning()) {
                yield this.stop(name);
            }
        });
    }
    static isRunning(emulator) {
        const instance = this.INSTANCES.get(emulator);
        return instance !== undefined;
    }
    static listRunning() {
        return types_1.ALL_EMULATORS.filter((name) => this.isRunning(name));
    }
    static get(emulator) {
        return this.INSTANCES.get(emulator);
    }
    static getPort(emulator) {
        const instance = this.INSTANCES.get(emulator);
        if (!instance) {
            return undefined;
        }
        return instance.getInfo().port;
    }
    static set(emulator, instance) {
        this.INSTANCES.set(emulator, instance);
    }
    static clear(emulator) {
        this.INSTANCES.delete(emulator);
    }
}
exports.EmulatorRegistry = EmulatorRegistry;
EmulatorRegistry.INSTANCES = new Map();
//# sourceMappingURL=registry.js.map