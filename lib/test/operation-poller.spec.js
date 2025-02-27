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
const api = require("../api");
const error_1 = require("../error");
const operation_poller_1 = require("../operation-poller");
const timeout_error_1 = require("../throttler/errors/timeout-error");
const helpers_1 = require("./helpers");
const TEST_ORIGIN = "https://firebasedummy.googleapis.com.com";
const VERSION = "v1";
const LRO_RESOURCE_NAME = "operations/cp.3322442424242444";
const FULL_RESOURCE_NAME = `/${VERSION}/${LRO_RESOURCE_NAME}`;
const API_OPTIONS = { auth: true, origin: TEST_ORIGIN };
describe("OperationPoller", () => {
    describe("poll", () => {
        let sandbox;
        let stubApiRequest;
        let pollerOptions;
        beforeEach(() => {
            sandbox = sinon.createSandbox();
            helpers_1.mockAuth(sandbox);
            stubApiRequest = sandbox.stub(api, "request");
            pollerOptions = {
                apiOrigin: TEST_ORIGIN,
                apiVersion: VERSION,
                operationResourceName: LRO_RESOURCE_NAME,
                backoff: 10,
            };
        });
        afterEach(() => {
            sandbox.restore();
        });
        it("should return result with response field if polling succeeds", () => __awaiter(void 0, void 0, void 0, function* () {
            const successfulResponse = {
                done: true,
                response: "completed",
            };
            stubApiRequest
                .withArgs("GET", FULL_RESOURCE_NAME, API_OPTIONS)
                .resolves({ body: successfulResponse });
            chai_1.expect(yield operation_poller_1.pollOperation(pollerOptions)).to.deep.equal("completed");
            chai_1.expect(stubApiRequest.callCount).to.equal(1);
        }));
        it("should return result with error field if polling operation returns failure response", () => __awaiter(void 0, void 0, void 0, function* () {
            const failedResponse = {
                done: true,
                error: {
                    message: "failed",
                    code: 7,
                },
            };
            stubApiRequest
                .withArgs("GET", FULL_RESOURCE_NAME, API_OPTIONS)
                .resolves({ body: failedResponse });
            let err;
            try {
                yield operation_poller_1.pollOperation(pollerOptions);
            }
            catch (e) {
                err = e;
            }
            chai_1.expect(err.message).to.equal("failed");
            chai_1.expect(err.status).to.equal(7);
            chai_1.expect(stubApiRequest.callCount).to.equal(1);
        }));
        it("should return result with error field if api call rejects with unrecoverable error", () => __awaiter(void 0, void 0, void 0, function* () {
            const unrecoverableError = new error_1.FirebaseError("poll failed", { status: 404 });
            stubApiRequest.withArgs("GET", FULL_RESOURCE_NAME, API_OPTIONS).rejects(unrecoverableError);
            let err;
            try {
                yield operation_poller_1.pollOperation(pollerOptions);
            }
            catch (e) {
                err = e;
            }
            chai_1.expect(err).to.equal(unrecoverableError);
            chai_1.expect(stubApiRequest.callCount).to.equal(1);
        }));
        it("should retry polling if http request responds with 500 or 503 status code", () => __awaiter(void 0, void 0, void 0, function* () {
            const retriableError1 = new error_1.FirebaseError("poll failed", { status: 500 });
            const retriableError2 = new error_1.FirebaseError("poll failed", { status: 503 });
            const successfulResponse = {
                done: true,
                response: "completed",
            };
            stubApiRequest
                .withArgs("GET", FULL_RESOURCE_NAME, API_OPTIONS)
                .onFirstCall()
                .rejects(retriableError1)
                .onSecondCall()
                .rejects(retriableError2)
                .onThirdCall()
                .resolves({ body: successfulResponse });
            chai_1.expect(yield operation_poller_1.pollOperation(pollerOptions)).to.deep.equal("completed");
            chai_1.expect(stubApiRequest.callCount).to.equal(3);
        }));
        it("should retry polling until the LRO is done", () => __awaiter(void 0, void 0, void 0, function* () {
            const successfulResponse = {
                done: true,
                response: "completed",
            };
            stubApiRequest
                .withArgs("GET", FULL_RESOURCE_NAME, API_OPTIONS)
                .resolves({ done: false })
                .onThirdCall()
                .resolves({ body: successfulResponse });
            chai_1.expect(yield operation_poller_1.pollOperation(pollerOptions)).to.deep.equal("completed");
            chai_1.expect(stubApiRequest.callCount).to.equal(3);
        }));
        it("should reject with TimeoutError when timed out after failed retries", () => __awaiter(void 0, void 0, void 0, function* () {
            pollerOptions.masterTimeout = 200;
            stubApiRequest.withArgs("GET", FULL_RESOURCE_NAME, API_OPTIONS).resolves({ done: false });
            let error;
            try {
                yield operation_poller_1.pollOperation(pollerOptions);
            }
            catch (err) {
                error = err;
            }
            chai_1.expect(error).to.be.instanceOf(timeout_error_1.default);
            chai_1.expect(stubApiRequest.callCount).to.be.at.least(3);
        }));
    });
});
//# sourceMappingURL=operation-poller.spec.js.map