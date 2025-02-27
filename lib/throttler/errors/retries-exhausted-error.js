"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_error_1 = require("./task-error");
class RetriesExhaustedError extends task_error_1.default {
    constructor(taskName, totalRetries, lastTrialError) {
        super(taskName, `retries exhausted after ${totalRetries + 1} attempts`, {
            original: lastTrialError,
        });
    }
}
exports.default = RetriesExhaustedError;
//# sourceMappingURL=retries-exhausted-error.js.map