"use strict";
/**
 * Safe File Operations
 *
 * Wrapper functions that check for file structure violations
 * before performing file system operations.
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
exports.SafeFileOps = void 0;
exports.safeWriteFile = safeWriteFile;
exports.safeWriteFileSync = safeWriteFileSync;
exports.safeMkdir = safeMkdir;
exports.safeMkdirSync = safeMkdirSync;
exports.safeAppendFile = safeAppendFile;
exports.safeCopyFile = safeCopyFile;
exports.safeRename = safeRename;
exports.wouldViolate = wouldViolate;
exports.enableStrictMode = enableStrictMode;
exports.disableStrictMode = disableStrictMode;
exports.isStrictModeEnabled = isStrictModeEnabled;
const fs = __importStar(require("fs"));
const FileViolationPreventer_1 = require("../validators/FileViolationPreventer");
const strict_mode_config_1 = require("../config/strict-mode.config");
const pipe_1 = require("../../pipe");
const fileAPI = (0, pipe_1.getFileAPI)();
// Singleton instance of the preventer
let preventerInstance = null;
/**
 * Get or create the FileViolationPreventer instance
 */
async function getPreventer() {
    if (!preventerInstance) {
        const config = (0, strict_mode_config_1.getStrictModeConfig)();
        preventerInstance = new FileViolationPreventer_1.FileViolationPreventer(process.cwd(), config);
        // Initialize asynchronously but don't block
        preventerInstance.initialize().catch(err => {
            console.warn('Failed to initialize FileViolationPreventer:', err);
        });
    }
    return preventerInstance;
}
/**
 * Safe write file operation
 * Checks for violations before writing
 */
async function safeWriteFile(filePath, data, options) {
    const preventer = getPreventer();
    try {
        await preventer.validateFileOperation('write', filePath);
        await fileAPI.createFile(filePath, data, { type: pipe_1.FileType.TEMPORARY });
    }
    catch (error) {
        if (error.name === 'FileViolationError') {
            console.error(`❌ File write blocked: ${error.message}`);
            throw error;
        }
        throw error;
    }
}
/**
 * Safe write file sync operation
 */
function safeWriteFileSync(filePath, data, options) {
    const preventer = getPreventer();
    // Use sync validation
    preventer.validateFileOperation('write', filePath)
        .then(async () => {
        await fileAPI.createFile(filePath, data, { type: pipe_1.FileType.TEMPORARY });
    })
        .catch(error => {
        if (error.name === 'FileViolationError') {
            console.error(`❌ File write blocked: ${error.message}`);
            throw error;
        }
        throw error;
    });
}
/**
 * Safe create directory operation
 */
async function safeMkdir(dirPath, options) {
    const preventer = getPreventer();
    try {
        await preventer.validateFileOperation('mkdir', dirPath);
        await fileAPI.createDirectory(dirPath);
    }
    catch (error) {
        if (error.name === 'FileViolationError') {
            console.error(`❌ Directory creation blocked: ${error.message}`);
            throw error;
        }
        throw error;
    }
}
/**
 * Safe create directory sync operation
 */
function safeMkdirSync(dirPath, options) {
    const preventer = getPreventer();
    preventer.validateFileOperation('mkdir', dirPath)
        .then(async () => {
        await fileAPI.createDirectory(dirPath);
    })
        .catch(error => {
        if (error.name === 'FileViolationError') {
            console.error(`❌ Directory creation blocked: ${error.message}`);
            throw error;
        }
        throw error;
    });
}
/**
 * Safe append file operation
 */
async function safeAppendFile(filePath, data, options) {
    const preventer = getPreventer();
    try {
        await preventer.validateFileOperation('write', filePath);
        await fileAPI.writeFile(filePath, data, { append: true });
    }
    catch (error) {
        if (error.name === 'FileViolationError') {
            console.error(`❌ File append blocked: ${error.message}`);
            throw error;
        }
        throw error;
    }
}
/**
 * Safe copy file operation
 */
async function safeCopyFile(src, dest, flags) {
    const preventer = getPreventer();
    try {
        await preventer.validateFileOperation('create', dest);
        fs.copyFileSync(src, dest, flags);
    }
    catch (error) {
        if (error.name === 'FileViolationError') {
            console.error(`❌ File copy blocked: ${error.message}`);
            throw error;
        }
        throw error;
    }
}
/**
 * Safe rename operation
 */
async function safeRename(oldPath, newPath) {
    const preventer = getPreventer();
    try {
        await preventer.validateFileOperation('create', newPath);
        fs.renameSync(oldPath, newPath);
    }
    catch (error) {
        if (error.name === 'FileViolationError') {
            console.error(`❌ File rename blocked: ${error.message}`);
            throw error;
        }
        throw error;
    }
}
/**
 * Check if a path would violate structure rules
 */
async function wouldViolate(operation, targetPath) {
    const preventer = getPreventer();
    try {
        await preventer.validateFileOperation(operation, targetPath);
        return false; // No violation
    }
    catch (error) {
        if (error.name === 'FileViolationError') {
            return true; // Would violate
        }
        throw error;
    }
}
/**
 * Enable strict mode for the current session
 */
function enableStrictMode() {
    const preventer = getPreventer();
    preventer.enableStrictMode();
    console.log('✅ Strict file checking enabled for external-log-lib');
}
/**
 * Disable strict mode for the current session
 */
function disableStrictMode() {
    const preventer = getPreventer();
    preventer.disableStrictMode();
    console.log('ℹ️ Strict file checking disabled for external-log-lib');
}
/**
 * Get current strict mode status
 */
function isStrictModeEnabled() {
    const preventer = getPreventer();
    return preventer.getStrictModeConfig().enabled;
}
// Export all functions as a namespace
exports.SafeFileOps = {
    safeWriteFile,
    safeWriteFileSync,
    safeMkdir,
    safeMkdirSync,
    safeAppendFile,
    safeCopyFile,
    safeRename,
    wouldViolate,
    enableStrictMode,
    disableStrictMode,
    isStrictModeEnabled
};
exports.default = exports.SafeFileOps;
//# sourceMappingURL=safe-file-operations.js.map