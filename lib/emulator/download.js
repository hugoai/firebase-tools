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
const crypto = require("crypto");
const request = require("request");
const ProgressBar = require("progress");
const error_1 = require("../error");
const utils = require("../utils");
const javaEmulators = require("../serve/javaEmulators");
const tmp = require("tmp");
const fs = require("fs-extra");
const path = require("path");
tmp.setGracefulCleanup();
module.exports = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const emulator = javaEmulators.get(name);
    utils.logLabeledBullet(name, `downloading ${path.basename(emulator.localPath)}...`);
    fs.ensureDirSync(emulator.cacheDir);
    const tmpfile = yield downloadToTmp(emulator.remoteUrl);
    yield validateSize(tmpfile, emulator.expectedSize);
    yield validateChecksum(tmpfile, emulator.expectedChecksum);
    fs.copySync(tmpfile, emulator.localPath);
    fs.chmodSync(emulator.localPath, 0o755);
    yield removeOldJars(emulator);
});
function removeOldJars(emulator) {
    const current = emulator.localPath;
    const files = fs.readdirSync(emulator.cacheDir);
    for (const file of files) {
        const fullFilePath = path.join(emulator.cacheDir, file);
        if (file.indexOf(emulator.namePrefix) < 0) {
            continue;
        }
        if (fullFilePath !== current) {
            utils.logLabeledBullet(emulator.name, `Removing outdated emulator: ${file}`);
            fs.removeSync(fullFilePath);
        }
    }
}
function downloadToTmp(remoteUrl) {
    return new Promise((resolve, reject) => {
        const tmpfile = tmp.fileSync();
        const req = request.get(remoteUrl);
        const writeStream = fs.createWriteStream(tmpfile.name);
        req.on("error", (err) => reject(err));
        let bar;
        req.on("response", (response) => {
            if (response.statusCode !== 200) {
                reject(new error_1.FirebaseError(`download failed, status ${response.statusCode}`, { exit: 1 }));
            }
            const total = parseInt(response.headers["content-length"] || "0", 10);
            const totalMb = Math.ceil(total / 1000000);
            bar = new ProgressBar(`Progress: :bar (:percent of ${totalMb}MB)`, { total, head: ">" });
        });
        req.on("data", (chunk) => {
            if (bar) {
                bar.tick(chunk.length);
            }
        });
        writeStream.on("finish", () => {
            resolve(tmpfile.name);
        });
        req.pipe(writeStream);
    });
}
function validateSize(filepath, expectedSize) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const stat = fs.statSync(filepath);
            return stat.size === expectedSize
                ? resolve()
                : reject(new error_1.FirebaseError(`download failed, expected ${expectedSize} bytes but got ${stat.size}`, { exit: 1 }));
        });
    });
}
function validateChecksum(filepath, expectedChecksum) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash("md5");
            const stream = fs.createReadStream(filepath);
            stream.on("data", (data) => hash.update(data));
            stream.on("end", () => {
                const checksum = hash.digest("hex");
                return checksum === expectedChecksum
                    ? resolve()
                    : reject(new error_1.FirebaseError(`download failed, expected checksum ${expectedChecksum} but got ${checksum}`, { exit: 1 }));
            });
        });
    });
}
//# sourceMappingURL=download.js.map