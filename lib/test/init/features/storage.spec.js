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
const chai_1 = require("chai");
const _ = require("lodash");
const sinon = require("sinon");
const error_1 = require("../../../error");
const Config = require("../../../config");
const storage_1 = require("../../../init/features/storage");
const prompt = require("../../../prompt");
describe("storage", () => {
    const sandbox = sinon.createSandbox();
    let writeProjectFileStub;
    let promptStub;
    beforeEach(() => {
        writeProjectFileStub = sandbox.stub(Config.prototype, "writeProjectFile");
        promptStub = sandbox.stub(prompt, "promptOnce");
    });
    afterEach(() => {
        sandbox.restore();
    });
    describe("doSetup", () => {
        it("should set up the correct properties in the project", () => __awaiter(void 0, void 0, void 0, function* () {
            const setup = {
                config: {},
                rcfile: {},
                projectId: "my-project-123",
                projectLocation: "us-central",
            };
            promptStub.returns("storage.rules");
            writeProjectFileStub.resolves();
            yield storage_1.doSetup(setup, new Config("/path/to/src", {}));
            chai_1.expect(_.get(setup, "config.storage.rules")).to.deep.equal("storage.rules");
        }));
        it("should error when cloud resource location is not set", () => __awaiter(void 0, void 0, void 0, function* () {
            const setup = {
                config: {},
                rcfile: {},
                projectId: "my-project-123",
            };
            chai_1.expect(storage_1.doSetup(setup, new Config("/path/to/src", {}))).to.eventually.be.rejectedWith(error_1.FirebaseError, "Cloud resource location is not set");
        }));
    });
});
//# sourceMappingURL=storage.spec.js.map