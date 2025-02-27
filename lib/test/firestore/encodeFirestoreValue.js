"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const error_1 = require("../../error");
const encodeFirestoreValue_1 = require("../../firestore/encodeFirestoreValue");
describe("encodeFirestoreValue", () => {
    it("should encode known types", () => {
        const d = new Date();
        const tests = [
            { in: { foo: "str" }, res: { foo: { stringValue: "str" } } },
            { in: { foo: true }, res: { foo: { booleanValue: true } } },
            { in: { foo: 1 }, res: { foo: { integerValue: 1 } } },
            { in: { foo: 3.14 }, res: { foo: { doubleValue: 3.14 } } },
            { in: { foo: d }, res: { foo: { timestampValue: d.toISOString() } } },
            {
                in: { foo: ["str", true] },
                res: { foo: { arrayValue: { values: [{ stringValue: "str" }, { booleanValue: true }] } } },
            },
            { in: { foo: null }, res: { foo: { nullValue: "NULL_VALUE" } } },
            { in: { foo: Buffer.from("buffer") }, res: { foo: { bytesValue: Buffer.from("buffer") } } },
            {
                in: { foo: { nested: true } },
                res: { foo: { mapValue: { fields: { nested: { booleanValue: true } } } } },
            },
        ];
        for (const test of tests) {
            chai_1.expect(encodeFirestoreValue_1.encodeFirestoreValue(test.in)).to.deep.equal(test.res);
        }
    });
    it("should throw an error with unknown types", () => {
        const tests = [
            { in: { foo: undefined } },
            { in: { foo: process.stdout } },
            { in: { foo: /regex/ } },
        ];
        for (const test of tests) {
            chai_1.expect(() => encodeFirestoreValue_1.encodeFirestoreValue(test.in)).to.throw(error_1.FirebaseError);
        }
    });
});
//# sourceMappingURL=encodeFirestoreValue.js.map