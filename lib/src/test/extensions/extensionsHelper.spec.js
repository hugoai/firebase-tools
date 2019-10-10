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
const sinon = require("sinon");
const error_1 = require("../../error");
const generateInstanceId = require("../../extensions/generateInstanceId");
const extensionsHelper = require("../../extensions/extensionsHelper");
const prompt = require("../../prompt");
describe("extensionsHelper", () => {
    describe("substituteParams", () => {
        it("should should substitute env variables", () => {
            const testResources = [
                {
                    resourceOne: {
                        name: "${VAR_ONE}",
                        source: "path/${VAR_ONE}",
                    },
                },
                {
                    resourceTwo: {
                        property: "${VAR_TWO}",
                        another: "$NOT_ENV",
                    },
                },
            ];
            const testParam = { VAR_ONE: "foo", VAR_TWO: "bar", UNUSED: "faz" };
            chai_1.expect(extensionsHelper.substituteParams(testResources, testParam)).to.deep.equal([
                {
                    resourceOne: {
                        name: "foo",
                        source: "path/foo",
                    },
                },
                {
                    resourceTwo: {
                        property: "bar",
                        another: "$NOT_ENV",
                    },
                },
            ]);
        });
    });
    describe("getDBInstanceFromURL", () => {
        it("returns the correct instance name", () => {
            chai_1.expect(extensionsHelper.getDBInstanceFromURL("https://my-db.firebaseio.com")).to.equal("my-db");
        });
    });
    describe("populateDefaultParams", () => {
        const expected = {
            ENV_VAR_ONE: "12345",
            ENV_VAR_TWO: "hello@example.com",
            ENV_VAR_THREE: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
            ENV_VAR_FOUR: "users/{sender}.friends",
        };
        const exampleParamSpec = [
            {
                param: "ENV_VAR_ONE",
                required: true,
            },
            {
                param: "ENV_VAR_TWO",
                required: true,
                validationRegex: "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$",
                validationErrorMessage: "You must provide a valid email address.\n",
            },
            {
                param: "ENV_VAR_THREE",
                default: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
                validationRegex: ".*\\{token\\}.*",
                validationErrorMessage: "Your URL must include {token} so that it can be replaced with an actual invitation token.\n",
            },
            {
                param: "ENV_VAR_FOUR",
                default: "users/{sender}.friends",
                required: false,
                validationRegex: ".+/.+\\..+",
                validationErrorMessage: "Values must be comma-separated document path + field, e.g. coll/doc.field,coll/doc.field\n",
            },
        ];
        it("should set default if default is available", () => {
            const envFile = {
                ENV_VAR_ONE: "12345",
                ENV_VAR_TWO: "hello@example.com",
                ENV_VAR_THREE: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
            };
            chai_1.expect(extensionsHelper.populateDefaultParams(envFile, exampleParamSpec)).to.deep.equal(expected);
        });
        it("should throw error if no default is available", () => {
            const envFile = {
                ENV_VAR_ONE: "12345",
                ENV_VAR_THREE: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
                ENV_VAR_FOUR: "users/{sender}.friends",
            };
            chai_1.expect(() => {
                extensionsHelper.populateDefaultParams(envFile, exampleParamSpec);
            }).to.throw(error_1.FirebaseError, /no default available/);
        });
    });
    describe("validateCommandLineParams", () => {
        const exampleParamSpec = [
            {
                param: "ENV_VAR_ONE",
                required: true,
            },
            {
                param: "ENV_VAR_TWO",
                required: true,
                validationRegex: "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$",
                validationErrorMessage: "You must provide a valid email address.\n",
            },
            {
                param: "ENV_VAR_THREE",
                default: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
                validationRegex: ".*\\{token\\}.*",
                validationErrorMessage: "Your URL must include {token} so that it can be replaced with an actual invitation token.\n",
            },
            {
                param: "ENV_VAR_FOUR",
                default: "users/{sender}.friends",
                required: false,
                validationRegex: ".+/.+\\..+",
                validationErrorMessage: "Values must be comma-separated document path + field, e.g. coll/doc.field,coll/doc.field\n",
            },
        ];
        it("should throw error if param variable value is invalid", () => {
            const envFile = {
                ENV_VAR_ONE: "12345",
                ENV_VAR_TWO: "invalid",
                ENV_VAR_THREE: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
                ENV_VAR_FOUR: "users/{sender}.friends",
            };
            chai_1.expect(() => {
                extensionsHelper.validateCommandLineParams(envFile, exampleParamSpec);
            }).to.throw(error_1.FirebaseError, /not valid/);
        });
        it("should throw error if # commandLineParams does not match # env vars from extension.yaml", () => {
            const envFile = {
                ENV_VAR_ONE: "12345",
                ENV_VAR_TWO: "invalid",
                ENV_VAR_THREE: "https://${PROJECT_ID}.firebaseapp.com/?acceptInvitation={token}",
            };
            chai_1.expect(() => {
                extensionsHelper.validateCommandLineParams(envFile, exampleParamSpec);
            }).to.throw(error_1.FirebaseError, /param is missing/);
        });
    });
    describe("getValidInstanceId", () => {
        let promptStub;
        let generateInstanceIdStub;
        beforeEach(() => {
            promptStub = sinon.stub(prompt, "promptOnce");
            generateInstanceIdStub = sinon.stub(generateInstanceId, "generateInstanceId");
        });
        afterEach(() => {
            sinon.restore();
        });
        it("return extensionName if it is not used by another instance ", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            generateInstanceIdStub.resolves(extensionName);
            promptStub.returns("a-valid-name");
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(extensionName);
            chai_1.expect(promptStub).not.to.have.been.called;
        }));
        it("prompt the user if extensionName is already used, and return if the user provides a valid id", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            const userInput = "a-valid-name";
            generateInstanceIdStub.resolves(`${extensionName}-abcd`);
            promptStub.returns(userInput);
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(userInput);
            chai_1.expect(promptStub).to.have.been.calledOnce;
        }));
        it("prompt the user again if the provided id is shorter than 6 characters", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            const userInput1 = "short";
            const userInput2 = "a-valid-name";
            generateInstanceIdStub.resolves(`${extensionName}-abcd`);
            promptStub.onCall(0).returns(userInput1);
            promptStub.onCall(1).returns(userInput2);
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(userInput2);
            chai_1.expect(promptStub).to.have.been.calledTwice;
        }));
        it("prompt the user again if the provided id is longer than 45 characters", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            const userInput1 = "a-really-long-name-that-is-really-longer-than-were-ok-with";
            const userInput2 = "a-valid-name";
            generateInstanceIdStub.resolves(`${extensionName}-abcd`);
            promptStub.onCall(0).returns(userInput1);
            promptStub.onCall(1).returns(userInput2);
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(userInput2);
            chai_1.expect(promptStub).to.have.been.calledTwice;
        }));
        it("prompt the user again if the provided id ends in a -", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            const userInput1 = "invalid-";
            const userInput2 = "-invalid";
            const userInput3 = "a-valid-name";
            generateInstanceIdStub.resolves(`${extensionName}-abcd`);
            promptStub.onCall(0).returns(userInput1);
            promptStub.onCall(1).returns(userInput2);
            promptStub.onCall(2).returns(userInput3);
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(userInput3);
            chai_1.expect(promptStub).to.have.been.calledThrice;
        }));
        it("prompt the user again if the provided id starts with a number", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            const userInput1 = "1invalid";
            const userInput2 = "a-valid-name";
            generateInstanceIdStub.resolves(`${extensionName}-abcd`);
            promptStub.onCall(0).returns(userInput1);
            promptStub.onCall(1).returns(userInput2);
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(userInput2);
            chai_1.expect(promptStub).to.have.been.calledTwice;
        }));
        it("prompt the user again if the provided id contains illegal characters", () => __awaiter(void 0, void 0, void 0, function* () {
            const extensionName = "extension-name";
            const userInput1 = "na.name@name";
            const userInput2 = "a-valid-name";
            generateInstanceIdStub.resolves(`${extensionName}-abcd`);
            promptStub.onCall(0).returns(userInput1);
            promptStub.onCall(1).returns(userInput2);
            const instanceId = yield extensionsHelper.getValidInstanceId("proj", extensionName);
            chai_1.expect(instanceId).to.equal(userInput2);
            chai_1.expect(promptStub).to.have.been.calledTwice;
        }));
    });
});
//# sourceMappingURL=extensionsHelper.spec.js.map