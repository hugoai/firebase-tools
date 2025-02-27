"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const utils = require("../utils");
const runtime = require("../runtimeChoiceSelector");
const error_1 = require("../error");
const cjson = require("cjson");
describe("getRuntimeName", () => {
    it("should properly convert raw runtime to human friendly runtime", () => {
        chai_1.expect(runtime.getHumanFriendlyRuntimeName("nodejs6")).to.contain("Node.js");
    });
});
describe("getRuntimeChoice", () => {
    const sandbox = sinon.createSandbox();
    let cjsonStub;
    let warningSpy;
    beforeEach(() => {
        cjsonStub = sandbox.stub(cjson, "load");
        warningSpy = sandbox.spy(utils, "logWarning");
    });
    afterEach(() => {
        sandbox.restore();
    });
    it("should return node 6 if package.json engines field is set to node 6 and print warning", () => {
        cjsonStub.returns({ engines: { node: "6" }, dependencies: { "firebase-functions": "2.0.0" } });
        chai_1.expect(runtime.getRuntimeChoice("path/to/source")).to.deep.equal("nodejs6");
        chai_1.expect(warningSpy).calledWith(runtime.DEPRECATION_WARNING_MSG);
    });
    it("should return node 8 if package.json engines field is set to node 8", () => {
        cjsonStub.returns({ engines: { node: "8" }, dependencies: { "firebase-functions": "2.0.0" } });
        chai_1.expect(runtime.getRuntimeChoice("path/to/source")).to.deep.equal("nodejs8");
        chai_1.expect(warningSpy).not.called;
    });
    it("should return node 10 if package.json engines field is set to node 10", () => {
        cjsonStub.returns({ engines: { node: "10" }, dependencies: { "firebase-functions": "2.0.0" } });
        chai_1.expect(runtime.getRuntimeChoice("path/to/source")).to.deep.equal("nodejs10");
        chai_1.expect(warningSpy).not.called;
    });
    it("should print warning when firebase-functions version is below 2.0.0", () => {
        cjsonStub.returns({
            engines: { node: "10" },
            dependencies: { "firebase-functions": "^0.5.0" },
        });
        runtime.getRuntimeChoice("path/to/source");
        chai_1.expect(warningSpy).calledWith(runtime.FUNCTIONS_SDK_VERSION_TOO_OLD_WARNING);
    });
    it("should not throw error if semver.intersects call errors", () => {
        cjsonStub.returns({ engines: { node: "8" } });
        chai_1.expect(() => {
            runtime.getRuntimeChoice("path/to/source");
        }).to.not.throw();
        chai_1.expect(warningSpy).not.called;
    });
    it.skip("should throw error if package.json engines field is not set", () => {
        cjsonStub.returns({ dependencies: { "firebase-functions": "2.0.0" } });
        chai_1.expect(() => {
            runtime.getRuntimeChoice("path/to/source");
        }).to.throw(error_1.FirebaseError, runtime.ENGINES_FIELD_REQUIRED_MSG);
    });
    it.skip("should throw error if package.json engines field is set but missing node field", () => {
        cjsonStub.returns({
            engines: {},
            dependencies: { "firebase-functions": "2.0.0" },
        });
        chai_1.expect(() => {
            runtime.getRuntimeChoice("path/to/source");
        }).to.throw(error_1.FirebaseError, runtime.ENGINES_FIELD_REQUIRED_MSG);
    });
    it("should throw error if unsupported node version set in package.json", () => {
        cjsonStub.returns({
            engines: { node: "11" },
            dependencies: { "firebase-functions": "2.0.0" },
        });
        chai_1.expect(() => {
            runtime.getRuntimeChoice("path/to/source");
        }).to.throw(error_1.FirebaseError, runtime.UNSUPPORTED_NODE_VERSION_MSG);
    });
});
//# sourceMappingURL=runtimeChoiceSelector.spec.js.map