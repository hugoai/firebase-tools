"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const indexes_1 = require("../../firestore/indexes");
const error_1 = require("../../error");
const API = require("../../firestore/indexes-api");
const sort = require("../../firestore/indexes-sort");
const util = require("../../firestore/util");
const idx = new indexes_1.FirestoreIndexes();
const VALID_SPEC = {
    indexes: [
        {
            collectionGroup: "collection",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "foo", order: "ASCENDING" },
                { fieldPath: "bar", order: "DESCENDING" },
                { fieldPath: "baz", arrayConfig: "CONTAINS" },
            ],
        },
    ],
    fieldOverrides: [
        {
            collectionGroup: "collection",
            fieldPath: "foo",
            indexes: [
                { order: "ASCENDING", scope: "COLLECTION" },
                { arrayConfig: "CONTAINS", scope: "COLLECTION" },
            ],
        },
    ],
};
describe("IndexValidation", () => {
    it("should accept a valid v1beta2 index spec", () => {
        idx.validateSpec(VALID_SPEC);
    });
    it("should not change a valid v1beta2 index spec after upgrade", () => {
        const upgraded = idx.upgradeOldSpec(VALID_SPEC);
        chai_1.expect(upgraded).to.eql(VALID_SPEC);
    });
    it("should accept an empty spec", () => {
        const empty = {
            indexes: [],
        };
        idx.validateSpec(idx.upgradeOldSpec(empty));
    });
    it("should accept a valid v1beta1 index spec after upgrade", () => {
        idx.validateSpec(idx.upgradeOldSpec({
            indexes: [
                {
                    collectionId: "collection",
                    fields: [
                        { fieldPath: "foo", mode: "ASCENDING" },
                        { fieldPath: "bar", mode: "DESCENDING" },
                        { fieldPath: "baz", mode: "ARRAY_CONTAINS" },
                    ],
                },
            ],
        }));
    });
    it("should reject an incomplete index spec", () => {
        chai_1.expect(() => {
            idx.validateSpec({
                indexes: [
                    {
                        collectionGroup: "collection",
                        fields: [
                            { fieldPath: "foo", order: "ASCENDING" },
                            { fieldPath: "bar", order: "DESCENDING" },
                        ],
                    },
                ],
            });
        }).to.throw(error_1.FirebaseError, /Must contain "queryScope"/);
    });
    it("should reject an overspecified index spec", () => {
        chai_1.expect(() => {
            idx.validateSpec({
                indexes: [
                    {
                        collectionGroup: "collection",
                        queryScope: "COLLECTION",
                        fields: [
                            { fieldPath: "foo", order: "ASCENDING", arrayConfig: "CONTAINES" },
                            { fieldPath: "bar", order: "DESCENDING" },
                        ],
                    },
                ],
            });
        }).to.throw(error_1.FirebaseError, /Must contain exactly one of "order,arrayConfig"/);
    });
});
describe("IndexNameParsing", () => {
    it("should parse an index name correctly", () => {
        const name = "/projects/myproject/databases/(default)/collectionGroups/collection/indexes/abc123/";
        chai_1.expect(util.parseIndexName(name)).to.eql({
            projectId: "myproject",
            collectionGroupId: "collection",
            indexId: "abc123",
        });
    });
    it("should parse a field name correctly", () => {
        const name = "/projects/myproject/databases/(default)/collectionGroups/collection/fields/abc123/";
        chai_1.expect(util.parseFieldName(name)).to.eql({
            projectId: "myproject",
            collectionGroupId: "collection",
            fieldPath: "abc123",
        });
    });
});
describe("IndexSpecMatching", () => {
    it("should identify a positive index spec match", () => {
        const apiIndex = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collection/indexes/abc123",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                { fieldPath: "foo", order: API.Order.ASCENDING },
                { fieldPath: "bar", arrayConfig: API.ArrayConfig.CONTAINS },
            ],
            state: API.State.READY,
        };
        const specIndex = {
            collectionGroup: "collection",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "foo", order: "ASCENDING" },
                { fieldPath: "bar", arrayConfig: "CONTAINS" },
            ],
        };
        chai_1.expect(idx.indexMatchesSpec(apiIndex, specIndex)).to.eql(true);
    });
    it("should identify a negative index spec match", () => {
        const apiIndex = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collection/indexes/abc123",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "foo", order: "DESCENDING" },
                { fieldPath: "bar", arrayConfig: "CONTAINS" },
            ],
            state: API.State.READY,
        };
        const specIndex = {
            collectionGroup: "collection",
            queryScope: "COLLECTION",
            fields: [
                { fieldPath: "foo", order: "ASCENDING" },
                { fieldPath: "bar", arrayConfig: "CONTAINS" },
            ],
        };
        chai_1.expect(idx.indexMatchesSpec(apiIndex, specIndex)).to.eql(false);
    });
    it("should identify a positive field spec match", () => {
        const apiField = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collection/fields/abc123",
            indexConfig: {
                indexes: [
                    {
                        queryScope: "COLLECTION",
                        fields: [{ fieldPath: "abc123", order: "ASCENDING" }],
                    },
                    {
                        queryScope: "COLLECTION",
                        fields: [{ fieldPath: "abc123", arrayConfig: "CONTAINS" }],
                    },
                ],
            },
        };
        const specField = {
            collectionGroup: "collection",
            fieldPath: "abc123",
            indexes: [
                { order: "ASCENDING", queryScope: "COLLECTION" },
                { arrayConfig: "CONTAINS", queryScope: "COLLECTION" },
            ],
        };
        chai_1.expect(idx.fieldMatchesSpec(apiField, specField)).to.eql(true);
    });
    it("should match a field spec with all indexes excluded", () => {
        const apiField = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collection/fields/abc123",
            indexConfig: {},
        };
        const specField = {
            collectionGroup: "collection",
            fieldPath: "abc123",
            indexes: [],
        };
        chai_1.expect(idx.fieldMatchesSpec(apiField, specField)).to.eql(true);
    });
    it("should identify a negative field spec match", () => {
        const apiField = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collection/fields/abc123",
            indexConfig: {
                indexes: [
                    {
                        queryScope: "COLLECTION",
                        fields: [{ fieldPath: "abc123", order: "ASCENDING" }],
                    },
                    {
                        queryScope: "COLLECTION",
                        fields: [{ fieldPath: "abc123", arrayConfig: "CONTAINS" }],
                    },
                ],
            },
        };
        const specField = {
            collectionGroup: "collection",
            fieldPath: "abc123",
            indexes: [
                { order: "DESCENDING", queryScope: "COLLECTION" },
                { arrayConfig: "CONTAINS", queryScope: "COLLECTION" },
            ],
        };
        chai_1.expect(idx.fieldMatchesSpec(apiField, specField)).to.eql(false);
    });
});
describe("IndexSorting", () => {
    it("should be able to handle empty arrays", () => {
        chai_1.expect([].sort(sort.compareSpecIndex)).to.eql([]);
        chai_1.expect([].sort(sort.compareFieldOverride)).to.eql([]);
        chai_1.expect([].sort(sort.compareApiIndex)).to.eql([]);
        chai_1.expect([].sort(sort.compareApiField)).to.eql([]);
    });
    it("should correctly sort an array of Spec indexes", () => {
        const a = {
            collectionGroup: "collectionA",
            queryScope: API.QueryScope.COLLECTION,
            fields: [],
        };
        const b = {
            collectionGroup: "collectionB",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldA",
                    order: API.Order.ASCENDING,
                },
            ],
        };
        const c = {
            collectionGroup: "collectionB",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldA",
                    order: API.Order.ASCENDING,
                },
                {
                    fieldPath: "fieldB",
                    order: API.Order.ASCENDING,
                },
            ],
        };
        const d = {
            collectionGroup: "collectionB",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldB",
                    order: API.Order.ASCENDING,
                },
            ],
        };
        const e = {
            collectionGroup: "collectionB",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldB",
                    order: API.Order.ASCENDING,
                },
                {
                    fieldPath: "fieldA",
                    order: API.Order.ASCENDING,
                },
            ],
        };
        chai_1.expect([b, a, e, d, c].sort(sort.compareSpecIndex)).to.eql([a, b, c, d, e]);
    });
    it("should correcty sort an array of Spec field overrides", () => {
        const a = {
            collectionGroup: "collectionA",
            fieldPath: "fieldA",
            indexes: [],
        };
        const b = {
            collectionGroup: "collectionB",
            fieldPath: "fieldA",
            indexes: [],
        };
        const c = {
            collectionGroup: "collectionB",
            fieldPath: "fieldB",
            indexes: [
                {
                    queryScope: API.QueryScope.COLLECTION,
                    order: API.Order.ASCENDING,
                },
            ],
        };
        const d = {
            collectionGroup: "collectionB",
            fieldPath: "fieldB",
            indexes: [
                {
                    queryScope: API.QueryScope.COLLECTION,
                    arrayConfig: API.ArrayConfig.CONTAINS,
                },
            ],
        };
        chai_1.expect([b, a, d, c].sort(sort.compareFieldOverride)).to.eql([a, b, c, d]);
    });
    it("should correctly sort an array of API indexes", () => {
        const a = {
            name: "/projects/project/databases/(default)/collectionGroups/collectionA/indexes/a",
            queryScope: API.QueryScope.COLLECTION,
            fields: [],
        };
        const b = {
            name: "/projects/project/databases/(default)/collectionGroups/collectionB/indexes/b",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldA",
                    order: API.Order.ASCENDING,
                },
            ],
        };
        const c = {
            name: "/projects/project/databases/(default)/collectionGroups/collectionB/indexes/c",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldA",
                    order: API.Order.ASCENDING,
                },
                {
                    fieldPath: "fieldB",
                    order: API.Order.ASCENDING,
                },
            ],
        };
        const d = {
            name: "/projects/project/databases/(default)/collectionGroups/collectionB/indexes/d",
            queryScope: API.QueryScope.COLLECTION,
            fields: [
                {
                    fieldPath: "fieldA",
                    order: API.Order.DESCENDING,
                },
            ],
        };
        chai_1.expect([b, a, d, c].sort(sort.compareApiIndex)).to.eql([a, b, c, d]);
    });
    it("should correctly sort an array of API field overrides", () => {
        const a = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collectionA/fields/fieldA",
            indexConfig: {
                indexes: [],
            },
        };
        const b = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collectionB/fields/fieldA",
            indexConfig: {
                indexes: [],
            },
        };
        const c = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collectionB/fields/fieldB",
            indexConfig: {
                indexes: [
                    {
                        queryScope: API.QueryScope.COLLECTION,
                        fields: [{ fieldPath: "fieldB", order: API.Order.DESCENDING }],
                    },
                ],
            },
        };
        const d = {
            name: "/projects/myproject/databases/(default)/collectionGroups/collectionB/fields/fieldB",
            indexConfig: {
                indexes: [
                    {
                        queryScope: API.QueryScope.COLLECTION,
                        fields: [{ fieldPath: "fieldB", arrayConfig: API.ArrayConfig.CONTAINS }],
                    },
                ],
            },
        };
        chai_1.expect([b, a, d, c].sort(sort.compareApiField)).to.eql([a, b, c, d]);
    });
});
//# sourceMappingURL=indexes.spec.js.map