"use strict";
/**
 * FS Interceptor - Intercepts and redirects fs operations to FileCreationAPI
 *
 * This module patches the native fs module to ensure all file operations
 * go through the FileCreationAPI. It can operate in enforcement or warning mode.
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
exports.FSInterceptor = exports.InterceptMode = void 0;
const originalFs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FileCreationAPI_1 = require("../file-manager/FileCreationAPI");
var InterceptMode;
(function (InterceptMode) {
    InterceptMode["ENFORCE"] = "enforce";
    InterceptMode["WARN"] = "warn";
    InterceptMode["MONITOR"] = "monitor";
    InterceptMode["BYPASS"] = "bypass"; // Disable interception
})(InterceptMode || (exports.InterceptMode = InterceptMode = {}));
class FSInterceptor {
    constructor(config) {
        this.violations = new Map();
        this.originalMethods = new Map();
        this.initialized = false;
        this.config = {
            mode: InterceptMode.WARN,
            allowedCallers: [
                'FileCreationAPI',
                'MCPIntegratedFileManager',
                'FileViolationPreventer',
                'node_modules',
                'test-setup'
            ],
            logFile: 'logs/fs-violations.log',
            throwOnViolation: false,
            ...config
        };
        this.fileAPI = new FileCreationAPI_1.FileCreationAPI(process.cwd(), false);
    }
    static getInstance(config) {
        if (!FSInterceptor.instance) {
            FSInterceptor.instance = new FSInterceptor(config);
        }
        return FSInterceptor.instance;
    }
    /**
     * Initialize the interceptor and patch fs methods
     */
    initialize() {
        if (this.initialized || this.config.mode === InterceptMode.BYPASS) {
            return;
        }
        this.patchFSMethods();
        this.initialized = true;
        console.log(`[FSInterceptor] Initialized in ${this.config.mode} mode`);
    }
    /**
     * Patch fs methods to intercept file operations
     */
    patchFSMethods() {
        // Store original methods
        this.originalMethods.set('writeFile', originalFs.writeFile);
        this.originalMethods.set('writeFileSync', originalFs.writeFileSync);
        this.originalMethods.set('appendFile', originalFs.appendFile);
        this.originalMethods.set('appendFileSync', originalFs.appendFileSync);
        this.originalMethods.set('mkdir', originalFs.mkdir);
        this.originalMethods.set('mkdirSync', originalFs.mkdirSync);
        // Patch async writeFile
        originalFs.writeFile = this.createInterceptor('writeFile', async (filePath, data, options) => {
            return await this.fileAPI.createFile(filePath, data, {
                type: this.detectFileType(filePath),
                encoding: options?.encoding
            });
        });
        // Patch sync writeFile
        originalFs.writeFileSync = this.createSyncInterceptor('writeFileSync', (filePath, data, options) => {
            // For sync operations, we need to use the original for now
            // but log the violation
            this.logViolation('writeFileSync', filePath);
            return this.originalMethods.get('writeFileSync')(filePath, data, options);
        });
        // Patch promises.writeFile
        if (originalFs.promises) {
            const originalPromiseWriteFile = originalFs.promises.writeFile;
            originalFs.promises.writeFile = this.createAsyncInterceptor('promises.writeFile', async (filePath, data, options) => {
                return await this.fileAPI.createFile(filePath, data, {
                    type: this.detectFileType(filePath),
                    encoding: options?.encoding
                });
            });
        }
        // Patch mkdir operations
        originalFs.mkdir = this.createInterceptor('mkdir', async (dirPath, options) => {
            return await this.fileAPI.createDirectory(dirPath);
        });
        originalFs.mkdirSync = this.createSyncInterceptor('mkdirSync', (dirPath, options) => {
            this.logViolation('mkdirSync', dirPath);
            return this.originalMethods.get('mkdirSync')(dirPath, options);
        });
    }
    /**
     * Create an interceptor for async methods
     */
    createInterceptor(methodName, replacement) {
        const self = this;
        return function (...args) {
            const filePath = args[0];
            const callback = args[args.length - 1];
            if (!self.shouldIntercept(methodName, filePath)) {
                return self.originalMethods.get(methodName)(...args);
            }
            if (self.config.mode === InterceptMode.ENFORCE) {
                // Use FileCreationAPI
                replacement(filePath, args[1], args[2])
                    .then((result) => {
                    if (typeof callback === 'function') {
                        callback(null, result);
                    }
                })
                    .catch((error) => {
                    if (typeof callback === 'function') {
                        callback(error);
                    }
                });
            }
            else {
                // Log and pass through
                self.logViolation(methodName, filePath);
                return self.originalMethods.get(methodName)(...args);
            }
        };
    }
    /**
     * Create an interceptor for sync methods
     */
    createSyncInterceptor(methodName, handler) {
        const self = this;
        return function (...args) {
            const filePath = args[0];
            if (!self.shouldIntercept(methodName, filePath)) {
                return self.originalMethods.get(methodName)(...args);
            }
            return handler(...args);
        };
    }
    /**
     * Create an interceptor for promise-based methods
     */
    createAsyncInterceptor(methodName, replacement) {
        const self = this;
        return async function (...args) {
            const filePath = args[0];
            if (!self.shouldIntercept(methodName, filePath)) {
                return originalFs.promises.writeFile(...args);
            }
            if (self.config.mode === InterceptMode.ENFORCE) {
                return replacement(...args);
            }
            else {
                self.logViolation(methodName, filePath);
                return originalFs.promises.writeFile(...args);
            }
        };
    }
    /**
     * Check if we should intercept this call
     */
    shouldIntercept(method, filePath) {
        if (this.config.mode === InterceptMode.BYPASS) {
            return false;
        }
        // Check if caller is whitelisted
        const stack = new Error().stack;
        if (stack && this.config.allowedCallers) {
            for (const allowed of this.config.allowedCallers) {
                if (stack.includes(allowed)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Log a violation
     */
    logViolation(method, filePath) {
        const key = `${method}:${filePath}`;
        const count = (this.violations.get(key) || 0) + 1;
        this.violations.set(key, count);
        if (this.config.mode === InterceptMode.WARN) {
            const caller = this.getCallerInfo();
            console.warn(`[FSInterceptor] Direct fs.${method} usage detected:\n` +
                `  File: ${filePath}\n` +
                `  Caller: ${caller}\n` +
                `  Use FileCreationAPI instead`);
        }
        if (this.config.throwOnViolation) {
            throw new Error(`Direct fs.${method} usage not allowed. Use FileCreationAPI for: ${filePath}`);
        }
    }
    /**
     * Get caller information from stack
     */
    getCallerInfo() {
        const stack = new Error().stack;
        if (!stack)
            return 'unknown';
        const lines = stack.split('\n');
        // Find the first line that's not this interceptor
        for (const line of lines.slice(3)) {
            if (!line.includes('fs-interceptor') && !line.includes('FSInterceptor')) {
                const match = line.match(/at\s+(.+?)\s+\((.+?)\)/);
                if (match) {
                    return `${match[1]} (${match[2]})`;
                }
                return line.trim();
            }
        }
        return 'unknown';
    }
    /**
     * Detect file type from path
     */
    detectFileType(filePath) {
        const ext = path.extname(filePath);
        const dir = path.dirname(filePath);
        if (dir.includes('gen/doc'))
            return FileCreationAPI_1.FileType.DOCUMENT;
        if (dir.includes('temp'))
            return FileCreationAPI_1.FileType.TEMPORARY;
        if (dir.includes('logs'))
            return FileCreationAPI_1.FileType.LOG;
        if (dir.includes('test'))
            return FileCreationAPI_1.FileType.TEST;
        if (dir.includes('src'))
            return FileCreationAPI_1.FileType.SOURCE;
        if (dir.includes('scripts'))
            return FileCreationAPI_1.FileType.SCRIPT;
        if (dir.includes('config'))
            return FileCreationAPI_1.FileType.CONFIG;
        if (filePath.includes('report'))
            return FileCreationAPI_1.FileType.REPORT;
        if (['.md', '.txt'].includes(ext))
            return FileCreationAPI_1.FileType.DOCUMENT;
        if (['.log'].includes(ext))
            return FileCreationAPI_1.FileType.LOG;
        if (['.json', '.yaml', '.yml'].includes(ext))
            return FileCreationAPI_1.FileType.DATA;
        return FileCreationAPI_1.FileType.TEMPORARY;
    }
    /**
     * Get violation statistics
     */
    getViolations() {
        return new Map(this.violations);
    }
    /**
     * Clear violations
     */
    clearViolations() {
        this.violations.clear();
    }
    /**
     * Restore original fs methods
     */
    restore() {
        if (!this.initialized)
            return;
        for (const [method, original] of this.originalMethods) {
            originalFs[method] = original;
        }
        if (originalFs.promises && this.originalMethods.has('promises.writeFile')) {
            originalFs.promises.writeFile = this.originalMethods.get('promises.writeFile');
        }
        this.initialized = false;
        console.log('[FSInterceptor] Restored original fs methods');
    }
    /**
     * Generate violation report
     */
    generateReport() {
        const lines = [];
        lines.push('FS Interceptor Violation Report');
        lines.push('='.repeat(40));
        lines.push(`Mode: ${this.config.mode}`);
        lines.push(`Total Violations: ${this.violations.size}\n`);
        const sorted = Array.from(this.violations.entries())
            .sort((a, b) => b[1] - a[1]);
        for (const [key, count] of sorted) {
            const [method, file] = key.split(':');
            lines.push(`${count}x ${method}: ${file}`);
        }
        return lines.join('\n');
    }
}
exports.FSInterceptor = FSInterceptor;
// Auto-initialize in development
if (process.env.NODE_ENV !== 'production' && process.env.ENFORCE_FILE_API === 'true') {
    const interceptor = FSInterceptor.getInstance({
        mode: InterceptMode.WARN
    });
    interceptor.initialize();
}
exports.default = FSInterceptor;
//# sourceMappingURL=fs-interceptor.js.map