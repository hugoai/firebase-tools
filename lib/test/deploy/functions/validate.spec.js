"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const fsutils = require("../../../fsutils");
const validate = require("../../../deploy/functions/validate");
const projectPath = require("../../../projectPath");
const error_1 = require("../../../error");
const sinon = require("sinon");
const cjson = require("cjson");
describe("validate", () => {
    describe("functionsDirectoryExists", () => {
        const sandbox = sinon.createSandbox();
        let resolvePpathStub;
        let dirExistsStub;
        beforeEach(() => {
            resolvePpathStub = sandbox.stub(projectPath, "resolveProjectPath");
            dirExistsStub = sandbox.stub(fsutils, "dirExistsSync");
        });
        afterEach(() => {
            sandbox.restore();
        });
        it("should not throw error if functions directory is present", () => {
            resolvePpathStub.returns("some/path/to/project");
            dirExistsStub.returns(true);
            chai_1.expect(() => {
                validate.functionsDirectoryExists("cwd", "sourceDirName");
            }).to.not.throw();
        });
        it("should throw error if the functions directory does not exist", () => {
            resolvePpathStub.returns("some/path/to/project");
            dirExistsStub.returns(false);
            chai_1.expect(() => {
                validate.functionsDirectoryExists("cwd", "sourceDirName");
            }).to.throw(error_1.FirebaseError);
        });
    });
    describe("functionNamesAreValid", () => {
        it("should allow properly formatted function names", () => {
            const properNames = { "my-function-1": "some field", "my-function-2": "some field" };
            chai_1.expect(() => {
                validate.functionNamesAreValid(properNames);
            }).to.not.throw();
        });
        it("should throw error on improperly formatted function names", () => {
            const properNames = {
                "my-function-!@#$%": "some field",
                "my-function-!@#$!@#": "some field",
            };
            chai_1.expect(() => {
                validate.functionNamesAreValid(properNames);
            }).to.throw(error_1.FirebaseError);
        });
        it("should throw error if some function names are improperly formatted", () => {
            const properNames = { "my-function$%#": "some field", "my-function-2": "some field" };
            chai_1.expect(() => {
                validate.functionNamesAreValid(properNames);
            }).to.throw(error_1.FirebaseError);
        });
        it.skip("should throw error on empty function names", () => {
            const properNames = {};
            chai_1.expect(() => {
                validate.functionNamesAreValid(properNames);
            }).to.throw(error_1.FirebaseError);
        });
    });
    describe("packageJsonIsValid", () => {
        const sandbox = sinon.createSandbox();
        let cjsonLoadStub;
        let fileExistsStub;
        beforeEach(() => {
            fileExistsStub = sandbox.stub(fsutils, "fileExistsSync");
            cjsonLoadStub = sandbox.stub(cjson, "load");
        });
        afterEach(() => {
            sandbox.restore();
        });
        it("should throw error if package.json file is missing", () => {
            fileExistsStub.withArgs("sourceDir/package.json").returns(false);
            chai_1.expect(() => {
                validate.packageJsonIsValid("sourceDirName", "sourceDir", "projectDir");
            }).to.throw(error_1.FirebaseError, "No npm package found");
        });
        it("should throw error if functions source file is missing", () => {
            cjsonLoadStub.returns({ name: "my-project", engines: { node: "8" } });
            fileExistsStub.withArgs("sourceDir/package.json").returns(true);
            fileExistsStub.withArgs("sourceDir/index.js").returns(false);
            chai_1.expect(() => {
                validate.packageJsonIsValid("sourceDirName", "sourceDir", "projectDir");
            }).to.throw(error_1.FirebaseError, "does not exist, can't deploy");
        });
        it("should throw error if main is defined and that file is missing", () => {
            cjsonLoadStub.returns({ name: "my-project", main: "src/main.js", engines: { node: "8" } });
            fileExistsStub.withArgs("sourceDir/package.json").returns(true);
            fileExistsStub.withArgs("sourceDir/src/main.js").returns(false);
            chai_1.expect(() => {
                validate.packageJsonIsValid("sourceDirName", "sourceDir", "projectDir");
            }).to.throw(error_1.FirebaseError, "does not exist, can't deploy");
        });
        it("should throw error if engines field is not set", () => {
            cjsonLoadStub.returns({ name: "my-project" });
            fileExistsStub.withArgs("sourceDir/package.json").returns(true);
            fileExistsStub.withArgs("sourceDir/index.js").returns(true);
            chai_1.expect(() => {
                validate.packageJsonIsValid("sourceDirName", "sourceDir", "projectDir");
            }).to.throw(error_1.FirebaseError, "Engines field is required but was not found");
        });
        it("should throw error if engines field is set but node field missing", () => {
            cjsonLoadStub.returns({ name: "my-project", engines: {} });
            fileExistsStub.withArgs("sourceDir/package.json").returns(true);
            fileExistsStub.withArgs("sourceDir/index.js").returns(true);
            chai_1.expect(() => {
                validate.packageJsonIsValid("sourceDirName", "sourceDir", "projectDir");
            }).to.throw(error_1.FirebaseError, "Engines field is required but was not found");
        });
        it("should not throw error if package.json, functions file exists and engines present", () => {
            cjsonLoadStub.returns({ name: "my-project", engines: { node: "8" } });
            fileExistsStub.withArgs("sourceDir/package.json").returns(true);
            fileExistsStub.withArgs("sourceDir/index.js").returns(true);
            chai_1.expect(() => {
                validate.packageJsonIsValid("sourceDirName", "sourceDir", "projectDir");
            }).to.not.throw();
        });
    });
});
//# sourceMappingURL=validate.spec.js.map