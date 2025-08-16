"use strict";
/**
 * External Module Interception Library
 * Provides testable, secure wrappers for Node.js built-in modules
 * Uses Export Facade Pattern for ESM compatibility
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.Buffer = exports.cluster = exports.vm = exports.readline = exports.dns = exports.zlib = exports.EventEmitter = exports.events = exports.util = exports.url = exports.stream = exports.net = exports.crypto = exports.os = exports.https = exports.http = exports.original = exports.updateConfig = exports.globalConfig = exports.removeBlockedCommand = exports.addBlockedCommand = exports.clearChildProcessCallHistory = exports.getChildProcessCallHistory = exports.clearPathCallHistory = exports.getPathCallHistory = exports.removeFsBlockedPath = exports.addFsBlockedPath = exports.clearFsCallHistory = exports.getFsCallHistory = exports.childProcess = exports.path = exports.fsPromises = exports.fs = void 0;
exports.getAllCallHistories = getAllCallHistories;
exports.clearAllCallHistories = clearAllCallHistories;
// Import original modules
const originalUrl = __importStar(require("url"));
const originalUtil = __importStar(require("util"));
const originalEvents = __importStar(require("events"));
const originalZlib = __importStar(require("zlib"));
const originalDns = __importStar(require("dns"));
const originalReadline = __importStar(require("readline"));
const originalVm = __importStar(require("vm"));
const originalCluster = __importStar(require("cluster"));
const originalBuffer = __importStar(require("buffer"));
const originalHttp = __importStar(require("http"));
const originalHttps = __importStar(require("https"));
const originalOs = __importStar(require("os"));
const originalCrypto = __importStar(require("crypto"));
const originalNet = __importStar(require("net"));
const originalStream = __importStar(require("stream"));
// Import facades
const fs_facade_1 = require("./facades/fs-facade");
Object.defineProperty(exports, "fs", { enumerable: true, get: function () { return fs_facade_1.fs; } });
Object.defineProperty(exports, "fsPromises", { enumerable: true, get: function () { return fs_facade_1.fsPromises; } });
Object.defineProperty(exports, "getFsCallHistory", { enumerable: true, get: function () { return fs_facade_1.getFsCallHistory; } });
Object.defineProperty(exports, "clearFsCallHistory", { enumerable: true, get: function () { return fs_facade_1.clearFsCallHistory; } });
Object.defineProperty(exports, "addFsBlockedPath", { enumerable: true, get: function () { return fs_facade_1.addBlockedPath; } });
Object.defineProperty(exports, "removeFsBlockedPath", { enumerable: true, get: function () { return fs_facade_1.removeBlockedPath; } });
const path_facade_1 = require("./facades/path-facade");
Object.defineProperty(exports, "path", { enumerable: true, get: function () { return path_facade_1.path; } });
Object.defineProperty(exports, "getPathCallHistory", { enumerable: true, get: function () { return path_facade_1.getPathCallHistory; } });
Object.defineProperty(exports, "clearPathCallHistory", { enumerable: true, get: function () { return path_facade_1.clearPathCallHistory; } });
const child_process_facade_1 = require("./facades/child-process-facade");
Object.defineProperty(exports, "childProcess", { enumerable: true, get: function () { return child_process_facade_1.childProcess; } });
Object.defineProperty(exports, "getChildProcessCallHistory", { enumerable: true, get: function () { return child_process_facade_1.getChildProcessCallHistory; } });
Object.defineProperty(exports, "clearChildProcessCallHistory", { enumerable: true, get: function () { return child_process_facade_1.clearChildProcessCallHistory; } });
Object.defineProperty(exports, "addBlockedCommand", { enumerable: true, get: function () { return child_process_facade_1.addBlockedCommand; } });
Object.defineProperty(exports, "removeBlockedCommand", { enumerable: true, get: function () { return child_process_facade_1.removeBlockedCommand; } });
// Configuration
var config_1 = require("./config");
Object.defineProperty(exports, "globalConfig", { enumerable: true, get: function () { return config_1.globalConfig; } });
Object.defineProperty(exports, "updateConfig", { enumerable: true, get: function () { return config_1.updateConfig; } });
// Export originals for cases where unwrapped access is needed
exports.original = {
    fs: require('fs'),
    path: require('path'),
    childProcess: require('child_process'),
    http: originalHttp,
    https: originalHttps,
    os: originalOs,
    crypto: originalCrypto,
    net: originalNet,
    stream: originalStream,
    url: originalUrl,
    util: originalUtil,
    events: originalEvents,
    zlib: originalZlib,
    dns: originalDns,
    readline: originalReadline,
    vm: originalVm,
    cluster: originalCluster,
    buffer: originalBuffer
};
// Simple proxies for modules we haven't fully implemented yet
exports.http = originalHttp;
exports.https = originalHttps;
exports.os = originalOs;
exports.crypto = originalCrypto;
exports.net = originalNet;
exports.stream = originalStream;
// Direct exports for modules that don't need interception
exports.url = originalUrl;
exports.util = originalUtil;
exports.events = originalEvents;
exports.EventEmitter = originalEvents.EventEmitter;
exports.zlib = originalZlib;
exports.dns = originalDns;
exports.readline = originalReadline;
exports.vm = originalVm;
exports.cluster = originalCluster;
exports.Buffer = originalBuffer.Buffer;
// Utility function to get all call histories
function getAllCallHistories() {
    return {
        fs: (0, fs_facade_1.getFsCallHistory)(),
        path: (0, path_facade_1.getPathCallHistory)(),
        childProcess: (0, child_process_facade_1.getChildProcessCallHistory)()
    };
}
// Utility function to clear all call histories
function clearAllCallHistories() {
    (0, fs_facade_1.clearFsCallHistory)();
    (0, path_facade_1.clearPathCallHistory)();
    (0, child_process_facade_1.clearChildProcessCallHistory)();
}
// For backward compatibility, also export individual modules
var fs_facade_2 = require("./facades/fs-facade");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return fs_facade_2.fs; } });
//# sourceMappingURL=index.js.map