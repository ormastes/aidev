"use strict";
/**
 * File System Facade
 * Provides wrapped fs module with logging and security features
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
exports.removeBlockedPath = exports.addBlockedPath = exports.clearFsCallHistory = exports.getFsCallHistory = exports.fsPromises = exports.fs = void 0;
const fsOriginal = __importStar(require("fs"));
const fsPromisesOriginal = __importStar(require("fs/promises"));
const config_1 = require("../config");
class FsFacade {
    constructor() {
        this.callHistory = [];
        this.blockedPaths = new Set([
            '/etc/passwd',
            '/etc/shadow',
            '~/.ssh/id_rsa',
            '~/.aws/credentials'
        ]);
    }
    logCall(method, args, result, error, duration) {
        if (!config_1.globalConfig.enableLogging)
            return;
        const record = {
            method,
            args: args.map(arg => {
                if (typeof arg === 'string')
                    return arg;
                if (typeof arg === 'function')
                    return '[Function]';
                if (Buffer.isBuffer(arg))
                    return `[Buffer ${arg.length}]`;
                return arg;
            }),
            timestamp: new Date(),
            result: result !== undefined ? (Buffer.isBuffer(result) ? `[Buffer ${result.length}]` : result) : undefined,
            error,
            duration: duration || 0
        };
        this.callHistory.push(record);
        if (config_1.globalConfig.enableConsoleLogging) {
            console.log(`[FS] ${method}(${record.args.join(', ')})${error ? ` ERROR: ${error}` : ''}`);
        }
    }
    checkPathSecurity(path) {
        // Check for path traversal
        if (path.includes('../') || path.includes('..\\')) {
            throw new Error(`Path traversal detected: ${path}`);
        }
        // Check blocked paths
        for (const blocked of this.blockedPaths) {
            if (path.startsWith(blocked) || path === blocked) {
                throw new Error(`Access to blocked path denied: ${path}`);
            }
        }
    }
    wrapMethod(methodName, originalMethod, isAsync = false) {
        const facade = this;
        if (isAsync) {
            return (async function (...args) {
                const startTime = Date.now();
                // Security check for path-based methods
                if (args[0] && typeof args[0] === 'string' && config_1.globalConfig.enableSecurity) {
                    try {
                        facade.checkPathSecurity(args[0]);
                    }
                    catch (error) {
                        facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
                        throw error;
                    }
                }
                try {
                    const result = await originalMethod.apply(this, args);
                    facade.logCall(methodName, args, result, undefined, Date.now() - startTime);
                    return result;
                }
                catch (error) {
                    facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
                    throw error;
                }
            });
        }
        else {
            return (function (...args) {
                const startTime = Date.now();
                // Security check for path-based methods
                if (args[0] && typeof args[0] === 'string' && config_1.globalConfig.enableSecurity) {
                    try {
                        facade.checkPathSecurity(args[0]);
                    }
                    catch (error) {
                        facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
                        throw error;
                    }
                }
                try {
                    const result = originalMethod.apply(this, args);
                    facade.logCall(methodName, args, result, undefined, Date.now() - startTime);
                    return result;
                }
                catch (error) {
                    facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
                    throw error;
                }
            });
        }
    }
    createFsProxy() {
        const facade = this;
        return new Proxy(fsOriginal, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // Skip non-functions and internal properties
                if (typeof value !== 'function' || prop.toString().startsWith('_')) {
                    return value;
                }
                // Skip if interception is disabled
                if (!config_1.globalConfig.enableInterception) {
                    return value;
                }
                const methodName = String(prop);
                // Determine if method is async
                const asyncMethods = ['access', 'appendFile', 'chmod', 'chown', 'close', 'copyFile',
                    'fchmod', 'fchown', 'fdatasync', 'fstat', 'fsync', 'ftruncate',
                    'futimes', 'lchmod', 'lchown', 'link', 'lstat', 'mkdir', 'mkdtemp',
                    'open', 'read', 'readdir', 'readFile', 'readlink', 'realpath',
                    'rename', 'rmdir', 'stat', 'symlink', 'truncate', 'unlink',
                    'utimes', 'write', 'writeFile'];
                const isAsync = methodName.endsWith('Sync') ? false : asyncMethods.includes(methodName);
                return facade.wrapMethod(methodName, value, isAsync);
            }
        });
    }
    createFsPromisesProxy() {
        const facade = this;
        return new Proxy(fsPromisesOriginal, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // Skip non-functions and internal properties
                if (typeof value !== 'function' || prop.toString().startsWith('_')) {
                    return value;
                }
                // Skip if interception is disabled
                if (!config_1.globalConfig.enableInterception) {
                    return value;
                }
                const methodName = String(prop);
                // All fs/promises methods are async
                return facade.wrapMethod(methodName, value, true);
            }
        });
    }
    getCallHistory() {
        return [...this.callHistory];
    }
    clearCallHistory() {
        this.callHistory = [];
    }
    addBlockedPath(path) {
        this.blockedPaths.add(path);
    }
    removeBlockedPath(path) {
        this.blockedPaths.delete(path);
    }
}
// Create singleton instance
const fsFacade = new FsFacade();
// Export wrapped versions
exports.fs = fsFacade.createFsProxy();
exports.fsPromises = fsFacade.createFsPromisesProxy();
// Export utility functions for testing
const getFsCallHistory = () => fsFacade.getCallHistory();
exports.getFsCallHistory = getFsCallHistory;
const clearFsCallHistory = () => fsFacade.clearCallHistory();
exports.clearFsCallHistory = clearFsCallHistory;
const addBlockedPath = (path) => fsFacade.addBlockedPath(path);
exports.addBlockedPath = addBlockedPath;
const removeBlockedPath = (path) => fsFacade.removeBlockedPath(path);
exports.removeBlockedPath = removeBlockedPath;
// Also export as default for convenience
exports.default = exports.fs;
//# sourceMappingURL=fs-facade.js.map