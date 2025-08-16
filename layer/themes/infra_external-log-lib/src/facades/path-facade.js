"use strict";
/**
 * Path Facade
 * Provides wrapped path module with logging and validation
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
exports.clearPathCallHistory = exports.getPathCallHistory = exports.path = void 0;
const pathOriginal = __importStar(require("path"));
const config_1 = require("../config");
class PathFacade {
    constructor() {
        this.callHistory = [];
    }
    logCall(method, args, result) {
        if (!config_1.globalConfig.enableLogging)
            return;
        const record = {
            method,
            args: [...args],
            result,
            timestamp: new Date()
        };
        this.callHistory.push(record);
        if (config_1.globalConfig.enableConsoleLogging) {
            console.log(`[PATH] ${method}(${args.join(', ')}) => ${result}`);
        }
    }
    validatePath(path) {
        if (!config_1.globalConfig.enableValidation)
            return;
        // Check for null bytes
        if (path.includes('\0')) {
            throw new Error('Path contains null bytes');
        }
        // Check for extremely long paths
        if (path.length > 4096) {
            throw new Error('Path exceeds maximum length');
        }
    }
    wrapMethod(methodName, originalMethod) {
        const facade = this;
        return (function (...args) {
            // Validate string arguments
            args.forEach(arg => {
                if (typeof arg === 'string' && config_1.globalConfig.enableSecurity) {
                    facade.validatePath(arg);
                }
            });
            const result = originalMethod.apply(this, args);
            facade.logCall(methodName, args, result);
            return result;
        });
    }
    createPathProxy() {
        const facade = this;
        return new Proxy(pathOriginal, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // Skip non-functions and constants
                if (typeof value !== 'function') {
                    return value;
                }
                // Skip if interception is disabled
                if (!config_1.globalConfig.enableInterception) {
                    return value;
                }
                const methodName = String(prop);
                return facade.wrapMethod(methodName, value);
            }
        });
    }
    getCallHistory() {
        return [...this.callHistory];
    }
    clearCallHistory() {
        this.callHistory = [];
    }
}
// Create singleton instance
const pathFacade = new PathFacade();
// Export wrapped version
exports.path = pathFacade.createPathProxy();
// Export utility functions for testing
const getPathCallHistory = () => pathFacade.getCallHistory();
exports.getPathCallHistory = getPathCallHistory;
const clearPathCallHistory = () => pathFacade.clearCallHistory();
exports.clearPathCallHistory = clearPathCallHistory;
// Also export as default
exports.default = exports.path;
//# sourceMappingURL=path-facade.js.map