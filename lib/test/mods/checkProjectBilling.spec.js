"use strict";
const chai = require("chai");
chai.use(require("chai-as-promised"));
const sinon = require("sinon");
const checkProjectBilling = require("../../mods/checkProjectBilling");
const prompt = require("../../prompt");
const cloudbilling = require("../../gcp/cloudbilling");
const expect = chai.expect;
describe("checkProjectBilling", function () {
    beforeEach(function () {
        sinon.stub(prompt, "promptOnce");
        sinon.stub(cloudbilling, "checkBillingEnabled").resolves();
        sinon.stub(cloudbilling, "listBillingAccounts").resolves();
        sinon.stub(cloudbilling, "setBillingAccount").resolves();
    });
    afterEach(function () {
        prompt.promptOnce.restore();
        cloudbilling.checkBillingEnabled.restore();
        cloudbilling.listBillingAccounts.restore();
        cloudbilling.setBillingAccount.restore();
    });
    it("should resolve if billing enabled.", function () {
        const projectId = "already enabled";
        const modName = "test mod";
        cloudbilling.checkBillingEnabled.resolves(true);
        return checkProjectBilling(projectId, modName, true).then(function () {
            expect(cloudbilling.checkBillingEnabled.calledWith(projectId));
            expect(cloudbilling.listBillingAccounts.notCalled);
            expect(cloudbilling.setBillingAccount.notCalled);
            expect(prompt.promptOnce.notCalled);
        });
    });
    it("should list accounts if no billing account set, but accounts available.", function () {
        const projectId = "not set, but have list";
        const modName = "test mod 2";
        const accounts = [
            {
                name: "test-cloud-billing-account-name",
                open: true,
                displayName: "test-account",
            },
        ];
        cloudbilling.checkBillingEnabled.resolves(false);
        cloudbilling.listBillingAccounts.resolves(accounts);
        cloudbilling.setBillingAccount.resolves(true);
        prompt.promptOnce.resolves("test-account");
        return checkProjectBilling(projectId, modName, true).then(function () {
            expect(cloudbilling.checkBillingEnabled.calledWith(projectId));
            expect(cloudbilling.listBillingAccounts.calledOnce);
            expect(cloudbilling.setBillingAccount.calledOnce);
            expect(cloudbilling.setBillingAccount.calledWith(projectId, "test-cloud-billing-account-name"));
        });
    });
    it("should not list accounts if no billing accounts set or available.", function () {
        const projectId = "not set, not available";
        const modName = "test mod 3";
        const accounts = [];
        cloudbilling.checkBillingEnabled.onCall(0).resolves(false);
        cloudbilling.checkBillingEnabled.onCall(1).resolves(true);
        cloudbilling.listBillingAccounts.resolves(accounts);
        prompt.promptOnce.resolves();
        return checkProjectBilling(projectId, modName, true).then(function () {
            expect(cloudbilling.checkBillingEnabled.calledWith(projectId));
            expect(cloudbilling.listBillingAccounts.calledOnce);
            expect(cloudbilling.setBillingAccount.notCalled);
            expect(cloudbilling.checkBillingEnabled.callCount).to.equal(2);
        });
    });
});
//# sourceMappingURL=checkProjectBilling.spec.js.map