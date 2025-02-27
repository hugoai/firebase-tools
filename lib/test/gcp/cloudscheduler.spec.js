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
const _ = require("lodash");
const chai_1 = require("chai");
const nock = require("nock");
const api = require("../../api");
const error_1 = require("../../error");
const gcp_1 = require("../../gcp");
const VERSION = "v1beta1";
const TEST_JOB = {
    name: "projects/test-project/locations/us-east1/jobs/test",
    schedule: "every 5 minutes",
    timeZone: "America/Los_Angeles",
    httpTarget: {
        uri: "https://afakeone.come",
        httpMethod: "POST",
    },
    retryConfig: {},
};
describe("cloudscheduler", () => {
    describe("createOrUpdateJob", () => {
        afterEach(() => {
            nock.cleanAll();
        });
        it("should create a job if none exists", () => __awaiter(void 0, void 0, void 0, function* () {
            nock(api.cloudschedulerOrigin)
                .get(`/${VERSION}/${TEST_JOB.name}`)
                .reply(404, { context: { response: { statusCode: 404 } } });
            nock(api.cloudschedulerOrigin)
                .post(`/${VERSION}/projects/test-project/locations/us-east1/jobs`)
                .reply(200, TEST_JOB);
            const response = yield gcp_1.cloudscheduler.createOrReplaceJob(TEST_JOB);
            chai_1.expect(response.body).to.deep.equal(TEST_JOB);
            chai_1.expect(nock.isDone()).to.be.true;
        }));
        it("should do nothing if a functionally identical job exists", () => __awaiter(void 0, void 0, void 0, function* () {
            const otherJob = _.cloneDeep(TEST_JOB);
            otherJob.name = "something-different";
            nock(api.cloudschedulerOrigin)
                .get(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            const response = yield gcp_1.cloudscheduler.createOrReplaceJob(TEST_JOB);
            chai_1.expect(response).to.be.undefined;
            chai_1.expect(nock.isDone()).to.be.true;
        }));
        it("should update if a job exists with the same name and a different schedule", () => __awaiter(void 0, void 0, void 0, function* () {
            const otherJob = _.cloneDeep(TEST_JOB);
            otherJob.schedule = "every 6 minutes";
            nock(api.cloudschedulerOrigin)
                .get(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            nock(api.cloudschedulerOrigin)
                .patch(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            const response = yield gcp_1.cloudscheduler.createOrReplaceJob(TEST_JOB);
            chai_1.expect(response.body).to.deep.equal(otherJob);
            chai_1.expect(nock.isDone()).to.be.true;
        }));
        it("should update if a job exists with the same name but a different timeZone", () => __awaiter(void 0, void 0, void 0, function* () {
            const otherJob = _.cloneDeep(TEST_JOB);
            otherJob.timeZone = "America/New_York";
            nock(api.cloudschedulerOrigin)
                .get(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            nock(api.cloudschedulerOrigin)
                .patch(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            const response = yield gcp_1.cloudscheduler.createOrReplaceJob(TEST_JOB);
            chai_1.expect(response.body).to.deep.equal(otherJob);
            chai_1.expect(nock.isDone()).to.be.true;
        }));
        it("should update if a job exists with the same name but a different retry config", () => __awaiter(void 0, void 0, void 0, function* () {
            const otherJob = _.cloneDeep(TEST_JOB);
            otherJob.retryConfig = { maxDoublings: 10 };
            nock(api.cloudschedulerOrigin)
                .get(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            nock(api.cloudschedulerOrigin)
                .patch(`/${VERSION}/${TEST_JOB.name}`)
                .reply(200, otherJob);
            const response = yield gcp_1.cloudscheduler.createOrReplaceJob(TEST_JOB);
            chai_1.expect(response.body).to.deep.equal(otherJob);
            chai_1.expect(nock.isDone()).to.be.true;
        }));
        it("should error and exit if cloud resource location is not set", () => __awaiter(void 0, void 0, void 0, function* () {
            nock(api.cloudschedulerOrigin)
                .get(`/${VERSION}/${TEST_JOB.name}`)
                .reply(404, { context: { response: { statusCode: 404 } } });
            nock(api.cloudschedulerOrigin)
                .post(`/${VERSION}/projects/test-project/locations/us-east1/jobs`)
                .reply(404, { context: { response: { statusCode: 404 } } });
            yield chai_1.expect(gcp_1.cloudscheduler.createOrReplaceJob(TEST_JOB)).to.be.rejectedWith(error_1.FirebaseError, "Cloud resource location is not set");
            chai_1.expect(nock.isDone()).to.be.true;
        }));
    });
});
//# sourceMappingURL=cloudscheduler.spec.js.map