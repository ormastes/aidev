"use strict";
/**
 * Child Process Facade
 * Provides wrapped child_process module with security and logging
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
exports.removeBlockedCommand = exports.addBlockedCommand = exports.clearChildProcessCallHistory = exports.getChildProcessCallHistory = exports.childProcess = void 0;
const childProcessOriginal = __importStar(require("child_process"));
const config_1 = require("../config");
class ChildProcessFacade {
    constructor() {
        this.callHistory = [];
        this.blockedCommands = new Set([
            'rm -rf /',
            'format',
            'del /f /s /q',
            'dd if=/dev/zero',
            'mkfs',
            ':(){ :|:& };:' // Fork bomb
        ]);
    }
    logCall(method, command, args, pid, error) {
        if (!config_1.globalConfig.enableLogging)
            return;
        const record = {
            method,
            command,
            args,
            timestamp: new Date(),
            pid,
            error
        };
        this.callHistory.push(record);
        if (config_1.globalConfig.enableConsoleLogging) {
            console.log(`[CHILD_PROCESS] ${method}("${command}"${args ? `, ${JSON.stringify(args)}` : ''})${pid ? ` PID: ${pid}` : ''}${error ? ` ERROR: ${error}` : ''}`);
        }
    }
    checkCommandSecurity(command) {
        if (!config_1.globalConfig.enableSecurity)
            return;
        // Check for blocked commands
        for (const blocked of this.blockedCommands) {
            if (command.includes(blocked)) {
                throw new Error(`Blocked dangerous command: ${command}`);
            }
        }
        // Check for shell injection attempts
        const dangerousPatterns = [
            /;\s*rm\s+-rf/,
            /&&\s*rm/,
            /\|\s*dd\s+if=/,
            /`[^`]*rm[^`]*`/,
            /\$\([^)]*rm[^)]*\)/
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
                throw new Error(`Potential command injection detected: ${command}`);
            }
        }
    }
    wrapExecMethod(methodName, originalMethod) {
        const facade = this;
        return (function (...args) {
            const command = args[0];
            if (typeof command === 'string') {
                try {
                    facade.checkCommandSecurity(command);
                }
                catch (error) {
                    facade.logCall(methodName, command, args.slice(1), undefined, error);
                    throw error;
                }
            }
            const result = originalMethod.apply(this, args);
            // Log the execution
            if (result && typeof result === 'object' && 'pid' in result) {
                facade.logCall(methodName, command, args.slice(1), result.pid);
            }
            else {
                facade.logCall(methodName, command, args.slice(1));
            }
            return result;
        });
    }
    createChildProcessProxy() {
        const facade = this;
        return new Proxy(childProcessOriginal, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                // Skip non-functions
                if (typeof value !== 'function') {
                    return value;
                }
                // Skip if interception is disabled
                if (!config_1.globalConfig.enableInterception) {
                    return value;
                }
                const methodName = String(prop);
                // Only wrap exec methods
                if (['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork'].includes(methodName)) {
                    return facade.wrapExecMethod(methodName, value);
                }
                return value;
            }
        });
    }
    getCallHistory() {
        return [...this.callHistory];
    }
    clearCallHistory() {
        this.callHistory = [];
    }
    addBlockedCommand(command) {
        this.blockedCommands.add(command);
    }
    removeBlockedCommand(command) {
        this.blockedCommands.delete(command);
    }
}
// Create singleton instance
const childProcessFacade = new ChildProcessFacade();
// Export wrapped version
exports.childProcess = childProcessFacade.createChildProcessProxy();
// Export utility functions
const getChildProcessCallHistory = () => childProcessFacade.getCallHistory();
exports.getChildProcessCallHistory = getChildProcessCallHistory;
const clearChildProcessCallHistory = () => childProcessFacade.clearCallHistory();
exports.clearChildProcessCallHistory = clearChildProcessCallHistory;
const addBlockedCommand = (cmd) => childProcessFacade.addBlockedCommand(cmd);
exports.addBlockedCommand = addBlockedCommand;
const removeBlockedCommand = (cmd) => childProcessFacade.removeBlockedCommand(cmd);
exports.removeBlockedCommand = removeBlockedCommand;
exports.default = exports.childProcess;
//# sourceMappingURL=child-process-facade.js.map