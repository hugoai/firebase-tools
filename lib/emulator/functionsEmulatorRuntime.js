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
const types_1 = require("./types");
const functionsEmulatorShared_1 = require("./functionsEmulatorShared");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const url_1 = require("url");
const _ = require("lodash");
const DATABASE_APP = "__database__";
let hasInitializedFirestore = false;
let hasAccessedFirestore = false;
let hasAccessedDatabase = false;
let defaultApp;
let databaseApp;
let proxiedFirestore;
let proxiedDatabase;
let developerPkgJSON;
function isFeatureEnabled(frb, feature) {
    return frb.disabled_features ? !frb.disabled_features[feature] : true;
}
function NoOp() {
    return false;
}
function requireAsync(moduleName, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        return require(require.resolve(moduleName, opts));
    });
}
function requireResolveAsync(moduleName, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        return require.resolve(moduleName, opts);
    });
}
function makeFakeCredentials() {
    return {
        getAccessToken: () => {
            return Promise.resolve({
                expires_in: 1000000,
                access_token: "owner",
            });
        },
        getCertificate: () => {
            return {};
        },
    };
}
class Proxied {
    constructor(original) {
        this.original = original;
        this.rewrites = {};
        this.proxy = new Proxy(this.original, {
            get: (target, key) => {
                key = key.toString();
                if (this.rewrites[key]) {
                    return this.rewrites[key](target, key);
                }
                if (this.anyValue) {
                    return this.anyValue(target, key);
                }
                return Proxied.getOriginal(target, key);
            },
            apply: (target, thisArg, argArray) => {
                if (this.appliedValue) {
                    return this.appliedValue.apply(thisArg, argArray);
                }
                else {
                    return Proxied.applyOriginal(target, thisArg, argArray);
                }
            },
        });
    }
    static getOriginal(target, key) {
        const value = target[key];
        if (!Proxied.isExists(value)) {
            return undefined;
        }
        else if (Proxied.isConstructor(value) || typeof value !== "function") {
            return value;
        }
        else {
            return value.bind(target);
        }
    }
    static applyOriginal(target, thisArg, argArray) {
        return target.apply(thisArg, argArray);
    }
    static isConstructor(obj) {
        return !!obj.prototype && !!obj.prototype.constructor.name;
    }
    static isExists(obj) {
        return obj !== undefined;
    }
    when(key, value) {
        this.rewrites[key] = value;
        return this;
    }
    any(value) {
        this.anyValue = value;
        return this;
    }
    applied(value) {
        this.appliedValue = value;
        return this;
    }
    finalize() {
        return this.proxy;
    }
}
function resolveDeveloperNodeModule(frb, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkg = requirePackageJson(frb);
        if (!pkg) {
            new types_1.EmulatorLog("SYSTEM", "missing-package-json", "").log();
            throw new Error("Could not find package.json");
        }
        const dependencies = pkg.dependencies;
        const devDependencies = pkg.devDependencies;
        const isInPackageJSON = dependencies[name] || devDependencies[name];
        if (!isInPackageJSON) {
            return { declared: false, installed: false };
        }
        const resolveResult = yield requireResolveAsync(name, { paths: [frb.cwd] }).catch(NoOp);
        if (!resolveResult) {
            return { declared: true, installed: false };
        }
        const modPackageJSON = require(path.join(functionsEmulatorShared_1.findModuleRoot(name, resolveResult), "package.json"));
        const moduleResolution = {
            declared: true,
            installed: true,
            version: modPackageJSON.version,
            resolution: resolveResult,
        };
        logDebug(`Resolved module ${name}`, moduleResolution);
        return moduleResolution;
    });
}
function verifyDeveloperNodeModules(frb) {
    return __awaiter(this, void 0, void 0, function* () {
        const modBundles = [
            { name: "firebase-admin", isDev: false, minVersion: 8 },
            { name: "firebase-functions", isDev: false, minVersion: 3 },
        ];
        for (const modBundle of modBundles) {
            const resolution = yield resolveDeveloperNodeModule(frb, modBundle.name);
            if (!resolution.declared) {
                new types_1.EmulatorLog("SYSTEM", "missing-module", "", modBundle).log();
                return false;
            }
            if (!resolution.installed) {
                new types_1.EmulatorLog("SYSTEM", "uninstalled-module", "", modBundle).log();
                return false;
            }
            const versionInfo = parseVersionString(resolution.version);
            if (versionInfo.major < modBundle.minVersion) {
                new types_1.EmulatorLog("SYSTEM", "out-of-date-module", "", modBundle).log();
                return false;
            }
        }
        return true;
    });
}
function requirePackageJson(frb) {
    if (developerPkgJSON) {
        return developerPkgJSON;
    }
    try {
        const pkg = require(`${frb.cwd}/package.json`);
        developerPkgJSON = {
            dependencies: pkg.dependencies || {},
            devDependencies: pkg.devDependencies || {},
        };
        return developerPkgJSON;
    }
    catch (err) {
        return undefined;
    }
}
function parseVersionString(version) {
    const parts = (version || "0").split(".");
    parts.push("0");
    parts.push("0");
    return {
        major: parseInt(parts[0], 10),
        minor: parseInt(parts[1], 10),
        patch: parseInt(parts[2], 10),
    };
}
function InitializeNetworkFiltering(frb) {
    const networkingModules = [
        { name: "http", module: require("http"), path: ["request"] },
        { name: "http", module: require("http"), path: ["get"] },
        { name: "https", module: require("https"), path: ["request"] },
        { name: "https", module: require("https"), path: ["get"] },
        { name: "net", module: require("net"), path: ["connect"] },
    ];
    try {
        const gcFirestore = functionsEmulatorShared_1.findModuleRoot("@google-cloud/firestore", require.resolve("@google-cloud/firestore", { paths: [frb.cwd] }));
        const gaxPath = require.resolve("google-gax", { paths: [gcFirestore] });
        const gaxModule = {
            module: require(gaxPath),
            path: ["GrpcClient"],
            name: "google-gax",
        };
        networkingModules.push(gaxModule);
        logDebug(`Found google-gax at ${gaxPath}`);
    }
    catch (err) {
        logDebug(`Couldn't find @google-cloud/firestore or google-gax, this may be okay if using @google-cloud/firestore@2.0.0`);
    }
    const history = {};
    const results = networkingModules.map((bundle) => {
        let obj = bundle.module;
        for (const field of bundle.path.slice(0, -1)) {
            obj = obj[field];
        }
        const method = bundle.path.slice(-1)[0];
        const original = obj[method].bind(bundle.module);
        obj[method] = function (...args) {
            const hrefs = args
                .map((arg) => {
                if (typeof arg === "string") {
                    try {
                        const url = new url_1.URL(arg);
                        return arg;
                    }
                    catch (err) {
                        return;
                    }
                }
                else if (typeof arg === "object") {
                    return arg.href;
                }
                else {
                    return;
                }
            })
                .filter((v) => v);
            const href = (hrefs.length && hrefs[0]) || "";
            if (href && !history[href]) {
                history[href] = true;
                if (href.indexOf("googleapis.com") !== -1) {
                    new types_1.EmulatorLog("SYSTEM", "googleapis-network-access", "", {
                        href,
                        module: bundle.name,
                    }).log();
                }
                else {
                    new types_1.EmulatorLog("SYSTEM", "unidentified-network-access", "", {
                        href,
                        module: bundle.name,
                    }).log();
                }
            }
            try {
                return original(...args);
            }
            catch (e) {
                const newed = new original(...args);
                return newed;
            }
        };
        return { name: bundle.name, status: "mocked" };
    });
    logDebug("Outgoing network have been stubbed.", results);
}
function InitializeFirebaseFunctionsStubs(frb) {
    return __awaiter(this, void 0, void 0, function* () {
        const firebaseFunctionsResolution = yield resolveDeveloperNodeModule(frb, "firebase-functions");
        if (!firebaseFunctionsResolution.resolution) {
            throw new Error("Could not resolve 'firebase-functions'");
        }
        const firebaseFunctionsRoot = functionsEmulatorShared_1.findModuleRoot("firebase-functions", firebaseFunctionsResolution.resolution);
        const httpsProviderResolution = path.join(firebaseFunctionsRoot, "lib/providers/https");
        const functionsVersion = parseVersionString(firebaseFunctionsResolution.version);
        let methodName = "_onRequestWithOpts";
        if (functionsVersion.major >= 3 && functionsVersion.minor >= 1) {
            methodName = "_onRequestWithOptions";
        }
        const httpsProvider = require(httpsProviderResolution);
        const requestWithOptions = httpsProvider[methodName];
        httpsProvider[methodName] = (handler, opts) => {
            const cf = requestWithOptions(handler, opts);
            cf.__emulator_func = handler;
            return cf;
        };
        httpsProvider.onRequest = (handler) => {
            return httpsProvider[methodName](handler, {});
        };
    });
}
function getGRPCInsecureCredential(frb) {
    return __awaiter(this, void 0, void 0, function* () {
        const firestorePackageJSON = require(path.join(functionsEmulatorShared_1.findModuleRoot("@google-cloud/firestore", require.resolve("@google-cloud/firestore", { paths: [frb.cwd] })), "package.json"));
        if (firestorePackageJSON.version.startsWith("1")) {
            const grpc = yield requireAsync("grpc", { paths: [frb.cwd] }).catch(NoOp);
            new types_1.EmulatorLog("SYSTEM", "runtime-status", "using grpc-native for admin credential").log();
            return grpc.credentials.createInsecure();
        }
        else {
            const grpc = yield requireAsync("@grpc/grpc-js", { paths: [frb.cwd] }).catch(NoOp);
            new types_1.EmulatorLog("SYSTEM", "runtime-status", "using grpc-js for admin credential").log();
            return grpc.ChannelCredentials.createInsecure();
        }
    });
}
function getDefaultConfig() {
    return JSON.parse(process.env.FIREBASE_CONFIG || "{}");
}
function InitializeFirebaseAdminStubs(frb) {
    return __awaiter(this, void 0, void 0, function* () {
        const adminResolution = yield resolveDeveloperNodeModule(frb, "firebase-admin");
        if (!adminResolution.resolution) {
            throw new Error("Could not resolve 'firebase-admin'");
        }
        const localAdminModule = require(adminResolution.resolution);
        proxiedFirestore = yield makeProxiedFirestore(frb, localAdminModule);
        const defaultConfig = getDefaultConfig();
        const databaseConfig = getDefaultConfig();
        databaseConfig.databaseURL = `http://localhost:${frb.ports.database}?ns=${frb.projectId}`;
        databaseConfig.credential = makeFakeCredentials();
        const adminModuleProxy = new Proxied(localAdminModule);
        const proxiedAdminModule = adminModuleProxy
            .when("initializeApp", (adminModuleTarget) => (opts, appName) => {
            if (appName) {
                new types_1.EmulatorLog("SYSTEM", "non-default-admin-app-used", "", { appName }).log();
                return adminModuleTarget.initializeApp(opts, appName);
            }
            else {
                new types_1.EmulatorLog("SYSTEM", "default-admin-app-used", `config=${defaultConfig}`).log();
            }
            const defaultAppOptions = Object.assign(Object.assign({}, defaultConfig), opts);
            defaultApp = makeProxiedFirebaseApp(frb, adminModuleTarget.initializeApp(defaultAppOptions));
            logDebug("initializeApp(DEFAULT)", defaultAppOptions);
            const databaseAppOptions = Object.assign(Object.assign({}, databaseConfig), opts);
            databaseApp = adminModuleTarget.initializeApp(databaseAppOptions, DATABASE_APP);
            proxiedDatabase = makeProxiedDatabase(adminModuleTarget);
            return defaultApp;
        })
            .when("firestore", (target) => {
            if (frb.ports.firestore) {
                return proxiedFirestore;
            }
            else {
                warnAboutFirestoreProd();
                return Proxied.getOriginal(target, "firestore");
            }
        })
            .when("database", (target) => {
            if (frb.ports.database) {
                return proxiedDatabase;
            }
            else {
                warnAboutDatabaseProd();
                return Proxied.getOriginal(target, "database");
            }
        })
            .finalize();
        require.cache[adminResolution.resolution] = {
            exports: proxiedAdminModule,
        };
        logDebug("firebase-admin has been stubbed.", {
            adminResolution,
        });
    });
}
function makeProxiedFirebaseApp(frb, original) {
    const appProxy = new Proxied(original);
    return appProxy
        .when("firestore", (target) => {
        if (frb.ports.firestore) {
            return proxiedFirestore;
        }
        else {
            warnAboutFirestoreProd();
            return Proxied.getOriginal(target, "firestore");
        }
    })
        .when("database", (target) => {
        if (frb.ports.database) {
            return proxiedDatabase;
        }
        else {
            warnAboutDatabaseProd();
            return Proxied.getOriginal(target, "database");
        }
    })
        .finalize();
}
function makeProxiedDatabase(target) {
    return new Proxied(target.database)
        .applied(() => {
        return databaseApp.database();
    })
        .finalize();
}
function makeProxiedFirestore(frb, target) {
    return __awaiter(this, void 0, void 0, function* () {
        const sslCreds = yield getGRPCInsecureCredential(frb).catch(NoOp);
        const initializeFirestoreSettings = (firestoreTarget, userSettings) => {
            if (!hasInitializedFirestore && frb.ports.firestore) {
                const emulatorSettings = Object.assign({ projectId: frb.projectId, port: frb.ports.firestore, servicePath: "localhost", service: "firestore.googleapis.com", sslCreds, customHeaders: {
                        Authorization: "Bearer owner",
                    } }, userSettings);
                firestoreTarget.settings(emulatorSettings);
                new types_1.EmulatorLog("DEBUG", "set-firestore-settings", "", emulatorSettings).log();
            }
            hasInitializedFirestore = true;
        };
        const firestoreProxy = new Proxied(target.firestore);
        return firestoreProxy
            .applied(() => {
            return new Proxied(target.firestore())
                .when("settings", (firestoreTarget) => {
                return (settings) => {
                    initializeFirestoreSettings(firestoreTarget, settings);
                };
            })
                .any((firestoreTarget, field) => {
                initializeFirestoreSettings(firestoreTarget, {});
                return Proxied.getOriginal(firestoreTarget, field);
            })
                .finalize();
        })
            .finalize();
    });
}
function warnAboutFirestoreProd() {
    if (hasAccessedFirestore) {
        return;
    }
    new types_1.EmulatorLog("WARN", "runtime-status", "The Cloud Firestore emulator is not running, so calls to Firestore will affect production.").log();
    hasAccessedFirestore = true;
}
function warnAboutDatabaseProd() {
    if (hasAccessedDatabase) {
        return;
    }
    new types_1.EmulatorLog("WARN", "runtime-status", "The Realtime Database emulator is not running, so calls to Realtime Database will affect production.").log();
    hasAccessedDatabase = true;
}
function InitializeEnvironmentalVariables(frb) {
    process.env.GCLOUD_PROJECT = frb.projectId;
    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.FIREBASE_CONFIG = JSON.stringify({
        databaseURL: process.env.DATABASE_URL || `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
        storageBucket: process.env.STORAGE_BUCKET_URL || `${process.env.GCLOUD_PROJECT}.appspot.com`,
        projectId: process.env.GCLOUD_PROJECT,
    });
}
function InitializeFunctionsConfigHelper(functionsDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const functionsResolution = yield requireResolveAsync("firebase-functions", {
            paths: [functionsDir],
        });
        const ff = require(functionsResolution);
        logDebug("Checked functions.config()", {
            config: ff.config(),
        });
        const originalConfig = ff.config();
        const proxiedConfig = new Proxied(originalConfig)
            .any((parentConfig, parentKey) => {
            logDebug("config() parent accessed!", {
                parentKey,
                parentConfig,
            });
            return new Proxied(parentConfig[parentKey] || {})
                .any((childConfig, childKey) => {
                const value = childConfig[childKey];
                if (value) {
                    return value;
                }
                else {
                    const valuePath = [parentKey, childKey].join(".");
                    new types_1.EmulatorLog("SYSTEM", "functions-config-missing-value", "", { valuePath }).log();
                    return undefined;
                }
            })
                .finalize();
        })
            .finalize();
        ff.config = () => proxiedConfig;
    });
}
function rawBodySaver(req, res, buf) {
    req.rawBody = buf;
}
function ProcessHTTPS(frb, trigger) {
    return __awaiter(this, void 0, void 0, function* () {
        const ephemeralServer = express();
        const functionRouter = express.Router();
        const socketPath = functionsEmulatorShared_1.getTemporarySocketPath(process.pid);
        yield new Promise((resolveEphemeralServer, rejectEphemeralServer) => {
            const handler = (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    logDebug(`Ephemeral server used!`);
                    const func = trigger.getRawFunction();
                    res.on("finish", () => {
                        instance.close(resolveEphemeralServer);
                    });
                    yield RunHTTPS([req, res], func);
                }
                catch (err) {
                    rejectEphemeralServer(err);
                }
            });
            ephemeralServer.enable("trust proxy");
            ephemeralServer.use(bodyParser.json({
                limit: "10mb",
                verify: rawBodySaver,
            }));
            ephemeralServer.use(bodyParser.text({
                limit: "10mb",
                verify: rawBodySaver,
            }));
            ephemeralServer.use(bodyParser.urlencoded({
                extended: true,
                limit: "10mb",
                verify: rawBodySaver,
            }));
            ephemeralServer.use(bodyParser.raw({
                type: "*/*",
                limit: "10mb",
                verify: rawBodySaver,
            }));
            functionRouter.all("*", handler);
            ephemeralServer.use([`/${frb.projectId}/${frb.triggerId}`, `/${frb.projectId}/:region/${frb.triggerId}`], functionRouter);
            const instance = ephemeralServer.listen(socketPath, () => {
                new types_1.EmulatorLog("SYSTEM", "runtime-status", "ready", { socketPath }).log();
            });
        });
    });
}
function ProcessBackground(frb, trigger) {
    return __awaiter(this, void 0, void 0, function* () {
        new types_1.EmulatorLog("SYSTEM", "runtime-status", "ready").log();
        const proto = frb.proto;
        logDebug("ProcessBackground", proto);
        const data = proto.data;
        delete proto.data;
        const context = proto.context ? proto.context : proto;
        if (context.resource && context.resource.name) {
            logDebug("ProcessBackground: lifting resource.name from resource", context.resource);
            context.resource = context.resource.name;
        }
        yield RunBackground({ data, context }, trigger.getRawFunction());
    });
}
function Run(func) {
    return __awaiter(this, void 0, void 0, function* () {
        const log = console.log;
        console.log = (...messages) => {
            new types_1.EmulatorLog("USER", "function-log", messages.join(" ")).log();
        };
        let caughtErr;
        try {
            yield func();
        }
        catch (err) {
            caughtErr = err;
        }
        console.log = log;
        logDebug(`Ephemeral server survived.`);
        if (caughtErr) {
            throw caughtErr;
        }
    });
}
function RunBackground(proto, func) {
    return __awaiter(this, void 0, void 0, function* () {
        logDebug("RunBackground", proto);
        yield Run(() => {
            return func(proto.data, proto.context);
        });
    });
}
function RunHTTPS(args, func) {
    return __awaiter(this, void 0, void 0, function* () {
        if (args.length < 2) {
            throw new Error("Function must be passed 2 args.");
        }
        yield Run(() => {
            return func(args[0], args[1]);
        });
    });
}
function moduleResolutionDetective(frb, error) {
    return __awaiter(this, void 0, void 0, function* () {
        const clues = {
            tsconfigJSON: yield requireAsync("./tsconfig.json", { paths: [frb.cwd] }).catch(NoOp),
            packageJSON: yield requireAsync("./package.json", { paths: [frb.cwd] }).catch(NoOp),
        };
        const isPotentially = {
            typescript: false,
            uncompiled: false,
            wrong_directory: false,
        };
        isPotentially.typescript = !!clues.tsconfigJSON;
        isPotentially.wrong_directory = !clues.packageJSON;
        isPotentially.uncompiled = !!_.get(clues.packageJSON, "scripts.build", false);
        new types_1.EmulatorLog("SYSTEM", "function-code-resolution-failed", "", {
            isPotentially,
            error: error.stack,
        }).log();
    });
}
function logDebug(msg, data) {
    new types_1.EmulatorLog("DEBUG", "runtime-status", msg, data).log();
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const serializedFunctionsRuntimeBundle = process.argv[2] || "{}";
        const serializedFunctionTrigger = process.argv[3];
        logDebug("Functions runtime initialized.", {
            cwd: process.cwd(),
            node_version: process.versions.node,
        });
        const frb = JSON.parse(serializedFunctionsRuntimeBundle);
        if (frb.triggerId) {
            new types_1.EmulatorLog("INFO", "runtime-status", `Beginning execution of "${frb.triggerId}"`, {
                frb,
            }).log();
        }
        logDebug(`Disabled runtime features: ${JSON.stringify(frb.disabled_features)}`);
        const verified = yield verifyDeveloperNodeModules(frb);
        if (!verified) {
            new types_1.EmulatorLog("INFO", "runtime-status", `Your functions could not be parsed due to an issue with your node_modules (see above)`).log();
            return;
        }
        InitializeEnvironmentalVariables(frb);
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            new types_1.EmulatorLog("WARN", "runtime-status", `Your GOOGLE_APPLICATION_CREDENTIALS environment variable points to ${process.env.GOOGLE_APPLICATION_CREDENTIALS}. Non-emulated services will access production using these credentials. Be careful!`).log();
        }
        if (isFeatureEnabled(frb, "network_filtering")) {
            InitializeNetworkFiltering(frb);
        }
        if (isFeatureEnabled(frb, "functions_config_helper")) {
            yield InitializeFunctionsConfigHelper(frb.cwd);
        }
        yield InitializeFirebaseFunctionsStubs(frb);
        if (isFeatureEnabled(frb, "admin_stubs")) {
            yield InitializeFirebaseAdminStubs(frb);
        }
        let triggers;
        const triggerDefinitions = [];
        let triggerModule;
        if (serializedFunctionTrigger) {
            triggerModule = eval(serializedFunctionTrigger)();
        }
        else {
            try {
                triggerModule = require(frb.cwd);
            }
            catch (err) {
                yield moduleResolutionDetective(frb, err);
                return;
            }
        }
        require("../extractTriggers")(triggerModule, triggerDefinitions);
        triggers = yield functionsEmulatorShared_1.getEmulatedTriggersFromDefinitions(triggerDefinitions, triggerModule);
        const triggerLogData = { triggers, triggerDefinitions };
        new types_1.EmulatorLog("SYSTEM", "triggers-parsed", "", triggerLogData).log();
        if (!frb.triggerId) {
            return;
        }
        if (!triggers[frb.triggerId]) {
            new types_1.EmulatorLog("FATAL", "runtime-status", `Could not find trigger "${frb.triggerId}" in your functions directory.`).log();
            return;
        }
        else {
            logDebug(`Trigger "${frb.triggerId}" has been found, beginning invocation!`);
        }
        const trigger = triggers[frb.triggerId];
        logDebug("", trigger.definition);
        const mode = trigger.definition.httpsTrigger ? "HTTPS" : "BACKGROUND";
        logDebug(`Running ${frb.triggerId} in mode ${mode}`);
        let seconds = 0;
        const timerId = setInterval(() => {
            seconds++;
        }, 1000);
        let timeoutId;
        if (isFeatureEnabled(frb, "timeout")) {
            timeoutId = setTimeout(() => {
                new types_1.EmulatorLog("WARN", "runtime-status", `Your function timed out after ~${trigger.definition.timeout ||
                    "60s"}. To configure this timeout, see
      https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation.`).log();
                process.exit();
            }, trigger.timeoutMs);
        }
        switch (mode) {
            case "BACKGROUND":
                yield ProcessBackground(frb, triggers[frb.triggerId]);
                break;
            case "HTTPS":
                yield ProcessHTTPS(frb, triggers[frb.triggerId]);
                break;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        clearInterval(timerId);
        new types_1.EmulatorLog("INFO", "runtime-status", `Finished "${frb.triggerId}" in ~${Math.max(seconds, 1)}s`).log();
    });
}
if (require.main === module) {
    main()
        .then(() => {
        return types_1.EmulatorLog.waitForFlush();
    })
        .then(() => {
        process.exit(0);
    })
        .catch((err) => {
        new types_1.EmulatorLog("FATAL", "runtime-error", err.stack ? err.stack : err).log();
        process.exit(1);
    });
}
//# sourceMappingURL=functionsEmulatorRuntime.js.map