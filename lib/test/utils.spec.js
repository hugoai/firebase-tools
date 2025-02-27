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
const utils = require("../utils");
describe("utils", () => {
    describe("consoleUrl", () => {
        it("should create a console URL", () => {
            chai_1.expect(utils.consoleUrl("projectId", "/foo/bar")).to.equal("https://console.firebase.google.com/project/projectId/foo/bar");
        });
    });
    describe("getInheritedOption", () => {
        it("should chain up looking for a key", () => {
            const o1 = {};
            const o2 = { parent: o1, foo: "bar" };
            const o3 = { parent: o2, bar: "foo" };
            const o4 = { parent: o3, baz: "zip" };
            chai_1.expect(utils.getInheritedOption(o4, "foo")).to.equal("bar");
        });
        it("should return undefined if the key does not exist", () => {
            const o1 = {};
            const o2 = { parent: o1, foo: "bar" };
            const o3 = { parent: o2, bar: "foo" };
            const o4 = { parent: o3, baz: "zip" };
            chai_1.expect(utils.getInheritedOption(o4, "zip")).to.equal(undefined);
        });
    });
    describe("envOverride", () => {
        it("should return the value if no current value exists", () => {
            chai_1.expect(utils.envOverride("FOOBARBAZ", "notset")).to.equal("notset");
        });
        it("should set an override if it conflicts", () => {
            process.env.FOO_BAR_BAZ = "set";
            chai_1.expect(utils.envOverride("FOO_BAR_BAZ", "notset")).to.equal("set");
            chai_1.expect(utils.envOverrides).to.deep.equal(["FOO_BAR_BAZ"]);
            delete process.env.FOO_BAR_BAZ;
        });
        it("should coerce the value", () => {
            process.env.FOO_BAR_BAZ = "set";
            chai_1.expect(utils.envOverride("FOO_BAR_BAZ", "notset", (s) => s.split(""))).to.deep.equal([
                "s",
                "e",
                "t",
            ]);
            delete process.env.FOO_BAR_BAZ;
        });
        it("should return provided value if coerce fails", () => {
            process.env.FOO_BAR_BAZ = "set";
            const coerce = () => {
                throw new Error();
            };
            chai_1.expect(utils.envOverride("FOO_BAR_BAZ", "notset", coerce)).to.deep.equal("notset");
            delete process.env.FOO_BAR_BAZ;
        });
    });
    describe("addSubdomain", () => {
        it("should add a subdomain", () => {
            chai_1.expect(utils.addSubdomain("https://example.com", "sub")).to.equal("https://sub.example.com");
        });
    });
    describe("endpoint", () => {
        it("should join our strings", () => {
            chai_1.expect(utils.endpoint(["foo", "bar"])).to.equal("/foo/bar");
        });
    });
    describe("promiseAllSettled", () => {
        it("should settle all promises", () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield utils.promiseAllSettled([
                Promise.resolve("foo"),
                Promise.reject("bar"),
                Promise.resolve("baz"),
            ]);
            chai_1.expect(result).to.deep.equal([
                { state: "fulfilled", value: "foo" },
                { state: "rejected", reason: "bar" },
                { state: "fulfilled", value: "baz" },
            ]);
        }));
    });
    describe("promiseProps", () => {
        it("should resolve all promises", () => __awaiter(void 0, void 0, void 0, function* () {
            const o = {
                foo: new Promise((resolve) => {
                    setTimeout(() => {
                        resolve("1");
                    });
                }),
                bar: Promise.resolve("2"),
            };
            const result = yield utils.promiseProps(o);
            chai_1.expect(result).to.deep.equal({
                foo: "1",
                bar: "2",
            });
        }));
        it("should pass through objects", () => __awaiter(void 0, void 0, void 0, function* () {
            const o = {
                foo: new Promise((resolve) => {
                    setTimeout(() => {
                        resolve("1");
                    });
                }),
                bar: ["bar"],
            };
            const result = yield utils.promiseProps(o);
            chai_1.expect(result).to.deep.equal({
                foo: "1",
                bar: ["bar"],
            });
        }));
        it("should reject if a promise rejects", () => __awaiter(void 0, void 0, void 0, function* () {
            const o = {
                foo: new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error("1"));
                    });
                }),
                bar: Promise.resolve("2"),
            };
            return chai_1.expect(utils.promiseProps(o)).to.eventually.be.rejected;
        }));
    });
});
//# sourceMappingURL=utils.spec.js.map