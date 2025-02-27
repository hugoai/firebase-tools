"use strict";
var _ = require("lodash");
var querystring = require("querystring");
var request = require("request");
var { FirebaseError } = require("./error");
var logger = require("./logger");
var responseToError = require("./responseToError");
var scopes = require("./scopes");
var utils = require("./utils");
var CLI_VERSION = require("../package.json").version;
var accessToken;
var refreshToken;
var commandScopes;
var _request = function (options, logOptions) {
    logOptions = logOptions || {};
    var qsLog = "";
    var bodyLog = "<request body omitted>";
    if (options.qs && !logOptions.skipQueryParams) {
        qsLog = JSON.stringify(options.qs);
    }
    if (!logOptions.skipRequestBody) {
        bodyLog = options.body || options.form || "";
    }
    logger.debug(">>> HTTP REQUEST", options.method, options.url, qsLog, "\n", bodyLog);
    options.headers = options.headers || {};
    options.headers["connection"] = "keep-alive";
    return new Promise(function (resolve, reject) {
        var req = request(options, function (err, response, body) {
            if (err) {
                return reject(new FirebaseError("Server Error. " + err.message, {
                    original: err,
                    exit: 2,
                }));
            }
            logger.debug("<<< HTTP RESPONSE", response.statusCode, response.headers);
            if (response.statusCode >= 400 && !logOptions.skipResponseBody) {
                logger.debug("<<< HTTP RESPONSE BODY", response.body);
                if (!options.resolveOnHTTPError) {
                    return reject(responseToError(response, body, options));
                }
            }
            return resolve({
                status: response.statusCode,
                response: response,
                body: body,
            });
        });
        if (_.size(options.files) > 0) {
            var form = req.form();
            _.forEach(options.files, function (details, param) {
                form.append(param, details.stream, {
                    knownLength: details.knownLength,
                    filename: details.filename,
                    contentType: details.contentType,
                });
            });
        }
    });
};
var _appendQueryData = function (path, data) {
    if (data && _.size(data) > 0) {
        path += _.includes(path, "?") ? "&" : "?";
        path += querystring.stringify(data);
    }
    return path;
};
var api = {
    clientId: utils.envOverride("FIREBASE_CLIENT_ID", "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"),
    clientSecret: utils.envOverride("FIREBASE_CLIENT_SECRET", "j9iVZfS8kkCEFUPaAeJV0sAi"),
    cloudbillingOrigin: utils.envOverride("FIREBASE_CLOUDBILLING_URL", "https://cloudbilling.googleapis.com"),
    cloudloggingOrigin: utils.envOverride("FIREBASE_CLOUDLOGGING_URL", "https://logging.googleapis.com"),
    adminOrigin: utils.envOverride("FIREBASE_ADMIN_URL", "https://admin.firebase.com"),
    appengineOrigin: utils.envOverride("FIREBASE_APPENGINE_URL", "https://appengine.googleapis.com"),
    authOrigin: utils.envOverride("FIREBASE_AUTH_URL", "https://accounts.google.com"),
    consoleOrigin: utils.envOverride("FIREBASE_CONSOLE_URL", "https://console.firebase.google.com"),
    deployOrigin: utils.envOverride("FIREBASE_DEPLOY_URL", utils.envOverride("FIREBASE_UPLOAD_URL", "https://deploy.firebase.com")),
    firebaseApiOrigin: utils.envOverride("FIREBASE_API_URL", "https://firebase.googleapis.com"),
    firebaseModsRegistryOrigin: utils.envOverride("FIREBASE_MODS_REGISTRY_ORIGIN", "https://mods-registry.firebaseapp.com"),
    firedataOrigin: utils.envOverride("FIREBASE_FIREDATA_URL", "https://mobilesdk-pa.googleapis.com"),
    firestoreOrigin: utils.envOverride("FIRESTORE_URL", "https://firestore.googleapis.com"),
    functionsOrigin: utils.envOverride("FIREBASE_FUNCTIONS_URL", "https://cloudfunctions.googleapis.com"),
    cloudschedulerOrigin: utils.envOverride("FIREBASE_CLOUDSCHEDULER_URL", "https://cloudscheduler.googleapis.com"),
    pubsubOrigin: utils.envOverride("FIREBASE_PUBSUB_URL", "https://pubsub.googleapis.com"),
    googleOrigin: utils.envOverride("FIREBASE_TOKEN_URL", utils.envOverride("FIREBASE_GOOGLE_URL", "https://www.googleapis.com")),
    hostingOrigin: utils.envOverride("FIREBASE_HOSTING_URL", "https://firebaseapp.com"),
    iamOrigin: utils.envOverride("FIREBASE_IAM_URL", "https://iam.googleapis.com"),
    modsOrigin: utils.envOverride("FIREBASE_MODS_URL", "https://firebasemods.googleapis.com"),
    realtimeOrigin: utils.envOverride("FIREBASE_REALTIME_URL", "https://firebaseio.com"),
    resourceManagerOrigin: utils.envOverride("FIREBASE_RESOURCEMANAGER_URL", "https://cloudresourcemanager.googleapis.com"),
    rulesOrigin: utils.envOverride("FIREBASE_RULES_URL", "https://firebaserules.googleapis.com"),
    runtimeconfigOrigin: utils.envOverride("FIREBASE_RUNTIMECONFIG_URL", "https://runtimeconfig.googleapis.com"),
    storageOrigin: utils.envOverride("FIREBASE_STORAGE_URL", "https://storage.googleapis.com"),
    hostingApiOrigin: utils.envOverride("FIREBASE_HOSTING_API_URL", "https://firebasehosting.googleapis.com"),
    cloudRunApiOrigin: utils.envOverride("CLOUD_RUN_API_URL", "https://run.googleapis.com"),
    serviceUsageOrigin: utils.envOverride("FIREBASE_SERVICE_USAGE_URL", "https://serviceusage.googleapis.com"),
    setRefreshToken: function (token) {
        refreshToken = token;
    },
    setAccessToken: function (token) {
        accessToken = token;
    },
    getScopes: function () {
        return commandScopes;
    },
    setScopes: function (s) {
        commandScopes = _.uniq(_.flatten([
            scopes.EMAIL,
            scopes.OPENID,
            scopes.CLOUD_PROJECTS_READONLY,
            scopes.FIREBASE_PLATFORM,
        ].concat(s || [])));
        logger.debug("> command requires scopes:", JSON.stringify(commandScopes));
    },
    getAccessToken: function () {
        return accessToken
            ? Promise.resolve({ access_token: accessToken })
            : require("./auth").getAccessToken(refreshToken, commandScopes);
    },
    addRequestHeaders: function (reqOptions) {
        _.set(reqOptions, ["headers", "User-Agent"], "FirebaseCLI/" + CLI_VERSION);
        _.set(reqOptions, ["headers", "X-Client-Version"], "FirebaseCLI/" + CLI_VERSION);
        return api.getAccessToken().then(function (result) {
            _.set(reqOptions, "headers.authorization", "Bearer " + result.access_token);
            return reqOptions;
        });
    },
    request: function (method, resource, options) {
        options = _.extend({
            data: {},
            origin: api.adminOrigin,
            resolveOnHTTPError: false,
            json: true,
        }, options);
        var validMethods = ["GET", "PUT", "POST", "DELETE", "PATCH"];
        if (validMethods.indexOf(method) < 0) {
            method = "GET";
        }
        var reqOptions = {
            method: method,
        };
        if (options.query) {
            resource = _appendQueryData(resource, options.query);
        }
        if (method === "GET") {
            resource = _appendQueryData(resource, options.data);
        }
        else {
            if (_.size(options.data) > 0) {
                reqOptions.body = options.data;
            }
            else if (_.size(options.form) > 0) {
                reqOptions.form = options.form;
            }
        }
        reqOptions.url = options.origin + resource;
        reqOptions.files = options.files;
        reqOptions.resolveOnHTTPError = options.resolveOnHTTPError;
        reqOptions.json = options.json;
        reqOptions.qs = options.qs;
        reqOptions.headers = options.headers;
        reqOptions.timeout = options.timeout;
        var requestFunction = function () {
            return _request(reqOptions, options.logOptions);
        };
        if (options.auth === true) {
            requestFunction = function () {
                return api.addRequestHeaders(reqOptions).then(function (reqOptionsWithToken) {
                    return _request(reqOptionsWithToken, options.logOptions);
                });
            };
        }
        return requestFunction().catch(function (err) {
            if (options.retryCodes &&
                _.includes(options.retryCodes, _.get(err, "context.response.statusCode"))) {
                return new Promise(function (resolve) {
                    setTimeout(resolve, 1000);
                }).then(requestFunction);
            }
            return Promise.reject(err);
        });
    },
    getProjects: function () {
        return api
            .request("GET", "/v1/projects", {
            auth: true,
        })
            .then(function (res) {
            if (res.body && res.body.projects) {
                return res.body.projects;
            }
            return Promise.reject(new FirebaseError("Server Error: Unexpected Response. Please try again", {
                context: res,
                exit: 2,
            }));
        });
    },
};
module.exports = api;
//# sourceMappingURL=api.js.map