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
const controller = require("../emulator/controller");
const Config = require("../config");
const utils = require("../utils");
const requireAuth = require("../requireAuth");
const requireConfig = require("../requireConfig");
const types_1 = require("../emulator/types");
const DEFAULT_CONFIG = new Config({ database: {}, firestore: {}, functions: {}, hosting: {} }, {});
function beforeEmulatorCommand(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const optionsWithDefaultConfig = Object.assign(Object.assign({}, options), { config: DEFAULT_CONFIG });
        const optionsWithConfig = options.config ? options : optionsWithDefaultConfig;
        const canStartWithoutConfig = options.only &&
            !controller.shouldStart(optionsWithConfig, types_1.Emulators.FUNCTIONS) &&
            !controller.shouldStart(optionsWithConfig, types_1.Emulators.HOSTING);
        if (canStartWithoutConfig && !options.config) {
            utils.logWarning("Could not find config (firebase.json) so using defaults.");
            options.config = DEFAULT_CONFIG;
        }
        else {
            yield requireConfig(options);
            yield requireAuth(options);
        }
    });
}
exports.beforeEmulatorCommand = beforeEmulatorCommand;
//# sourceMappingURL=commandUtils.js.map