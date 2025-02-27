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
const inquirer = require("inquirer");
const error_1 = require("../error");
const prompt = require("../prompt");
describe("prompt", () => {
    let inquirerStub;
    const PROMPT_RESPONSES = {
        lint: true,
        project: "the-best-project-ever",
    };
    beforeEach(() => {
        inquirerStub = sinon.stub(inquirer, "prompt").resolves(PROMPT_RESPONSES);
    });
    afterEach(() => {
        sinon.restore();
    });
    describe("prompt", () => {
        it("should error if questions are asked in nonInteractive environment", () => __awaiter(void 0, void 0, void 0, function* () {
            const o = { nonInteractive: true };
            const qs = [{ name: "foo" }];
            chai_1.expect(prompt.prompt(o, qs)).to.be.rejectedWith(error_1.FirebaseError, /required.+non\-interactive/);
        }));
        it("should utilize inquirer to prompt for the questions", () => __awaiter(void 0, void 0, void 0, function* () {
            const qs = [
                {
                    name: "foo",
                    message: "this is a test",
                },
            ];
            yield prompt.prompt({}, qs);
            chai_1.expect(inquirerStub).calledOnceWithExactly(qs);
        }));
        it("should add the new values to the options object", () => __awaiter(void 0, void 0, void 0, function* () {
            const options = { hello: "world" };
            const qs = [
                {
                    name: "foo",
                    message: "this is a test",
                },
            ];
            yield prompt.prompt(options, qs);
            chai_1.expect(options).to.deep.equal(Object.assign({ hello: "world" }, PROMPT_RESPONSES));
        }));
    });
    describe("promptOnce", () => {
        it("should provide a name if one is not provided", () => __awaiter(void 0, void 0, void 0, function* () {
            yield prompt.promptOnce({ message: "foo" });
            chai_1.expect(inquirerStub).calledOnceWith([{ name: "question", message: "foo" }]);
        }));
        it("should return the value for the given name", () => __awaiter(void 0, void 0, void 0, function* () {
            const r = yield prompt.promptOnce({ name: "lint" });
            chai_1.expect(r).to.equal(true);
            chai_1.expect(inquirerStub).calledOnce;
        }));
    });
});
//# sourceMappingURL=prompt.spec.js.map