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
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const RTDB_FUNCTION_LOG = "========== RTDB FUNCTION ==========";
const FIRESTORE_FUNCTION_LOG = "========== FIRESTORE FUNCTION ==========";
const START_DOCUMENT_NAME = "test/start";
const END_DOCUMENT_NAME = "test/done";
admin.initializeApp();
exports.deleteFromFirestore = functions.https.onRequest((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield admin
        .firestore()
        .doc(START_DOCUMENT_NAME)
        .delete();
    res.json({ deleted: true });
}));
exports.deleteFromRtdb = functions.https.onRequest((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield admin
        .database()
        .ref(START_DOCUMENT_NAME)
        .remove();
    res.json({ deleted: true });
}));
exports.writeToFirestore = functions.https.onRequest((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ref = admin.firestore().doc(START_DOCUMENT_NAME);
    yield ref.set({ start: new Date().toISOString() });
    ref.get().then((snap) => {
        res.json({ data: snap.data() });
    });
}));
exports.writeToRtdb = functions.https.onRequest((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ref = admin.database().ref(START_DOCUMENT_NAME);
    yield ref.set({ start: new Date().toISOString() });
    ref.once("value", (snap) => {
        res.json({ data: snap });
    });
}));
exports.firestoreReaction = functions.firestore
    .document(START_DOCUMENT_NAME)
    .onWrite(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log(FIRESTORE_FUNCTION_LOG);
    const ref = admin.firestore().doc(END_DOCUMENT_NAME + "_from_firestore");
    yield ref.set({ done: new Date().toISOString() });
    const dbref = admin.database().ref(END_DOCUMENT_NAME + "_from_firestore");
    yield dbref.set({ done: new Date().toISOString() });
    return true;
}));
exports.rtdbReaction = functions.database
    .ref(START_DOCUMENT_NAME)
    .onWrite(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log(RTDB_FUNCTION_LOG);
    const ref = admin.database().ref(END_DOCUMENT_NAME + "_from_database");
    yield ref.set({ done: new Date().toISOString() });
    const firestoreref = admin.firestore().doc(END_DOCUMENT_NAME + "_from_database");
    yield firestoreref.set({ done: new Date().toISOString() });
    return true;
}));
//# sourceMappingURL=index.js.map