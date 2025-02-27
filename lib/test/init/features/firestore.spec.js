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
const firestore = require("../../../init/features/firestore");
const indexes = require("../../../init/features/firestore/indexes");
const rules = require("../../../init/features/firestore/rules");
const requireAccess = require("../../../requireAccess");
describe("firestore", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
        sandbox.restore();
    });
    describe("doSetup", () => {
        it("should require access, set up rules and indices, ensure cloud resource location set", () => __awaiter(void 0, void 0, void 0, function* () {
            const requireAccessStub = sandbox.stub(requireAccess, "requireAccess").resolves();
            const initIndexesStub = sandbox.stub(indexes, "initIndexes").resolves();
            const initRulesStub = sandbox.stub(rules, "initRules").resolves();
            const setup = { config: {}, projectId: "my-project-123", projectLocation: "us-central1" };
            yield firestore.doSetup(setup, {});
            chai_1.expect(requireAccessStub).to.have.been.calledOnce;
            chai_1.expect(initRulesStub).to.have.been.calledOnce;
            chai_1.expect(initIndexesStub).to.have.been.calledOnce;
            chai_1.expect(_.get(setup, "config.firestore")).to.deep.equal({});
        }));
        it("should error when cloud resource location is not set", () => __awaiter(void 0, void 0, void 0, function* () {
            const setup = { config: {}, projectId: "my-project-123" };
            chai_1.expect(firestore.doSetup(setup, {})).to.eventually.be.rejectedWith(error_1.FirebaseError, "Cloud resource location is not set");
        }));
    });
});
//# sourceMappingURL=firestore.spec.js.map