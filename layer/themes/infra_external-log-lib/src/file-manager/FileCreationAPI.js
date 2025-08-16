"use strict";
/**
 * FileCreationAPI - Centralized file creation with type-based routing and validation
 *
 * This API ensures all file creation goes through proper validation and logging.
 * It integrates with filesystem-mcp for structure validation and provides
 * fraud detection for unauthorized file operations.
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
exports.FileCreationAPI = exports.FileType = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FileViolationPreventer_1 = require("../validators/FileViolationPreventer");
const ComprehensiveLogger_1 = require("../loggers/ComprehensiveLogger");
const enforcement_config_1 = require("../config/enforcement-config");
var FileType;
(function (FileType) {
    FileType["DOCUMENT"] = "doc";
    FileType["REPORT"] = "report";
    FileType["TEMPORARY"] = "temp";
    FileType["LOG"] = "log";
    FileType["DATA"] = "data";
    FileType["CONFIG"] = "config";
    FileType["TEST"] = "test";
    FileType["SOURCE"] = "source";
    FileType["GENERATED"] = "gen";
    FileType["DEMO"] = "demo";
    FileType["SCRIPT"] = "script";
    FileType["FIXTURE"] = "fixture";
    FileType["COVERAGE"] = "coverage";
    FileType["BUILD"] = "build";
})(FileType || (exports.FileType = FileType = {}));
class FileCreationAPI {
    constructor(basePath = process.cwd(), enableStrictMode = true) {
        this.auditLog = [];
        this.mpcValidationEnabled = true;
        this.fraudDetectionEnabled = true;
        this.basePath = basePath;
        this.validator = new FileViolationPreventer_1.FileViolationPreventer(basePath, {
            enabled: enableStrictMode,
            inheritToChildren: true,
            logWarnings: !enableStrictMode,
            throwOnViolation: enableStrictMode
        });
        this.logger = new ComprehensiveLogger_1.ComprehensiveLogger({
            logDir: path.join(basePath, 'logs'),
            appName: 'FileCreationAPI',
            enableConsole: true,
            enableFile: true
        });
        this.fileTypeConfigs = this.initializeFileTypeConfigs();
        this.initialize();
    }
    async initialize() {
        await this.validator.initialize();
        this.logger.info('FileCreationAPI initialized', {
            basePath: this.basePath,
            strictMode: this.validator.getStrictModeConfig().enabled
        });
    }
    initializeFileTypeConfigs() {
        const configs = new Map();
        // Use automatic routing from enforcement config
        configs.set(FileType.DOCUMENT, {
            baseDir: enforcement_config_1.TYPE_ROUTING_MAP['doc'] || 'gen/doc',
            allowedExtensions: ['.md', '.txt', '.pdf', '.html'],
            maxSize: 10 * 1024 * 1024 // 10MB
        });
        configs.set(FileType.REPORT, {
            baseDir: enforcement_config_1.TYPE_ROUTING_MAP['report'] || 'gen/reports',
            pattern: /report|analysis|summary/i,
            allowedExtensions: ['.md', '.json', '.html', '.pdf'],
            maxSize: 5 * 1024 * 1024 // 5MB
        });
        configs.set(FileType.TEMPORARY, {
            baseDir: enforcement_config_1.TYPE_ROUTING_MAP['temp'] || 'temp',
            maxSize: 100 * 1024 * 1024, // 100MB
            requiresApproval: false
        });
        configs.set(FileType.LOG, {
            baseDir: enforcement_config_1.TYPE_ROUTING_MAP['log'] || 'logs',
            allowedExtensions: ['.log', '.txt', '.json'],
            maxSize: 50 * 1024 * 1024 // 50MB
        });
        configs.set(FileType.DATA, {
            baseDir: enforcement_config_1.TYPE_ROUTING_MAP['data'] || 'data',
            allowedExtensions: ['.json', '.csv', '.xml', '.yaml', '.yml'],
            maxSize: 100 * 1024 * 1024 // 100MB
        });
        configs.set(FileType.CONFIG, {
            baseDir: enforcement_config_1.TYPE_ROUTING_MAP['config'] || 'config',
            allowedExtensions: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'],
            requiresApproval: true,
            maxSize: 1 * 1024 * 1024 // 1MB
        });
        configs.set(FileType.TEST, {
            baseDir: 'tests',
            pattern: /\.(test|spec|e2e)\.(ts|js|tsx|jsx)$/,
            allowedExtensions: ['.ts', '.js', '.tsx', '.jsx'],
            maxSize: 5 * 1024 * 1024 // 5MB
        });
        configs.set(FileType.SOURCE, {
            baseDir: 'src',
            allowedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.h'],
            maxSize: 5 * 1024 * 1024 // 5MB
        });
        configs.set(FileType.GENERATED, {
            baseDir: 'gen',
            maxSize: 50 * 1024 * 1024 // 50MB
        });
        configs.set(FileType.DEMO, {
            baseDir: 'demo',
            maxSize: 10 * 1024 * 1024 // 10MB
        });
        configs.set(FileType.SCRIPT, {
            baseDir: 'scripts',
            allowedExtensions: ['.sh', '.bat', '.ps1', '.py', '.js', '.ts'],
            requiresApproval: true,
            maxSize: 1 * 1024 * 1024 // 1MB
        });
        configs.set(FileType.FIXTURE, {
            baseDir: 'fixtures',
            maxSize: 10 * 1024 * 1024 // 10MB
        });
        configs.set(FileType.COVERAGE, {
            baseDir: 'coverage',
            allowedExtensions: ['.json', '.html', '.lcov', '.xml'],
            maxSize: 50 * 1024 * 1024 // 50MB
        });
        configs.set(FileType.BUILD, {
            baseDir: 'dist',
            maxSize: 500 * 1024 * 1024 // 500MB
        });
        return configs;
    }
    /**
     * Create a file with type-based validation and routing
     */
    async createFile(filePath, content, options) {
        const startTime = Date.now();
        // Check enforcement first
        const callerPath = this.getCallerPath();
        const enforcement = enforcement_config_1.strictEnforcement.getEnforcementReport(callerPath);
        // If not exempt, require type and use auto-routing
        if (!enforcement.isExempt) {
            if (!options.type) {
                throw new Error(`File type is required for non-exempt themes. Caller: ${callerPath}`);
            }
            // Override path with auto-routed folder based on type
            const autoFolder = enforcement_config_1.TYPE_ROUTING_MAP[options.type.toLowerCase()];
            if (autoFolder) {
                const fileName = path.basename(filePath);
                filePath = path.join(this.basePath, autoFolder, fileName);
                this.logger.info('Auto-routing file based on type', {
                    originalPath: filePath,
                    type: options.type,
                    autoFolder,
                    newPath: filePath
                });
            }
        }
        const absolutePath = this.resolveFilePath(filePath, options.type);
        try {
            // Step 1: Validate file type and path
            const typeValidation = await this.validateFileType(absolutePath, options.type);
            if (!typeValidation.valid) {
                throw new Error(`File type validation failed: ${typeValidation.reason}`);
            }
            // Step 2: Check filesystem MCP structure
            if (this.mpcValidationEnabled) {
                await this.validateWithMCP(absolutePath, 'create');
            }
            // Step 3: Fraud detection
            if (this.fraudDetectionEnabled) {
                const fraudCheck = await this.detectFraud(absolutePath, options);
                if (fraudCheck.suspicious) {
                    this.logger.warn('Suspicious file creation detected', {
                        path: absolutePath,
                        reason: fraudCheck.reason
                    });
                    if (fraudCheck.block) {
                        throw new Error(`File creation blocked: ${fraudCheck.reason}`);
                    }
                }
            }
            // Step 4: Create directory if needed
            const dir = path.dirname(absolutePath);
            if (!fs.existsSync(dir)) {
                await this.createDirectory(dir);
            }
            // Step 5: Apply template if specified
            let finalContent = content;
            if (options.template) {
                finalContent = await this.applyTemplate(options.template, content, options.metadata);
            }
            // Step 6: Write file (atomic if requested)
            if (options.atomic) {
                await this.atomicWrite(absolutePath, finalContent, options.encoding);
            }
            else {
                await fs.promises.writeFile(absolutePath, finalContent, {
                    encoding: options.encoding || 'utf8',
                    mode: options.mode
                });
            }
            // Step 7: Audit log
            const auditEntry = {
                operation: 'create',
                path: absolutePath,
                type: options.type,
                timestamp: new Date(),
                success: true,
                caller: this.getCallerInfo(),
                metadata: options.metadata
            };
            this.auditLog.push(auditEntry);
            // Step 8: Log success
            this.logger.info('File created successfully', {
                path: absolutePath,
                type: options.type,
                size: Buffer.isBuffer(finalContent) ? finalContent.length : Buffer.byteLength(finalContent),
                duration: Date.now() - startTime
            });
            const stats = fs.statSync(absolutePath);
            return {
                success: true,
                path: absolutePath,
                type: options.type,
                size: stats.size,
                timestamp: new Date()
            };
        }
        catch (error) {
            // Audit failed attempt
            const auditEntry = {
                operation: 'create',
                path: absolutePath,
                type: options.type,
                timestamp: new Date(),
                success: false,
                caller: this.getCallerInfo(),
                metadata: { error: error.message }
            };
            this.auditLog.push(auditEntry);
            this.logger.error('File creation failed', {
                path: absolutePath,
                type: options.type,
                error: error.message
            });
            return {
                success: false,
                path: absolutePath,
                type: options.type,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
    /**
     * Write to an existing file with validation
     */
    async writeFile(filePath, content, options = {}) {
        const type = options.type || this.detectFileType(filePath);
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
        try {
            // Validate with MCP
            if (this.mpcValidationEnabled) {
                await this.validateWithMCP(absolutePath, 'write');
            }
            // Backup if requested
            if (options.backup && fs.existsSync(absolutePath)) {
                await this.createBackup(absolutePath);
            }
            // Write file
            await fs.promises.writeFile(absolutePath, content, {
                encoding: options.encoding || 'utf8',
                mode: options.mode
            });
            // Audit log
            const auditEntry = {
                operation: 'write',
                path: absolutePath,
                type,
                timestamp: new Date(),
                success: true,
                caller: this.getCallerInfo()
            };
            this.auditLog.push(auditEntry);
            const stats = fs.statSync(absolutePath);
            return {
                success: true,
                path: absolutePath,
                type,
                size: stats.size,
                timestamp: new Date()
            };
        }
        catch (error) {
            return {
                success: false,
                path: absolutePath,
                type,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
    /**
     * Create a directory with validation
     */
    async createDirectory(dirPath) {
        const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.join(this.basePath, dirPath);
        if (this.mpcValidationEnabled) {
            await this.validateWithMCP(absolutePath, 'mkdir');
        }
        await fs.promises.mkdir(absolutePath, { recursive: true });
        const auditEntry = {
            operation: 'mkdir',
            path: absolutePath,
            type: FileType.TEMPORARY,
            timestamp: new Date(),
            success: true,
            caller: this.getCallerInfo()
        };
        this.auditLog.push(auditEntry);
    }
    /**
     * Batch file creation with transaction support
     */
    async createBatch(files) {
        const results = [];
        const createdFiles = [];
        try {
            for (const file of files) {
                const result = await this.createFile(file.path, file.content, file.options);
                results.push(result);
                if (result.success) {
                    createdFiles.push(result.path);
                }
                else {
                    // Rollback on failure
                    throw new Error(`Batch operation failed at ${file.path}: ${result.error}`);
                }
            }
            return results;
        }
        catch (error) {
            // Rollback created files
            this.logger.warn('Batch operation failed, rolling back', { error: error.message });
            for (const filePath of createdFiles) {
                try {
                    await fs.promises.unlink(filePath);
                }
                catch (rollbackError) {
                    this.logger.error('Rollback failed', { path: filePath, error: rollbackError });
                }
            }
            throw error;
        }
    }
    /**
     * Validate file type and location
     */
    async validateFileType(filePath, type) {
        const config = this.fileTypeConfigs.get(type);
        if (!config) {
            return { valid: false, reason: `Unknown file type: ${type}` };
        }
        const ext = path.extname(filePath);
        // Check allowed extensions
        if (config.allowedExtensions && !config.allowedExtensions.includes(ext)) {
            return {
                valid: false,
                reason: `Extension ${ext} not allowed for type ${type}`
            };
        }
        // Check pattern
        if (config.pattern && !config.pattern.test(filePath)) {
            return {
                valid: false,
                reason: `File path doesn't match required pattern for type ${type}`
            };
        }
        return { valid: true };
    }
    /**
     * Validate with filesystem MCP
     */
    async validateWithMCP(filePath, operation) {
        try {
            // Import filesystem MCP validator dynamically
            const mpcModule = await Promise.resolve().then(() => __importStar(require('../../../infra_filesystem-mcp/pipe')));
            const structureWrapper = mpcModule.createFileStructureWrapper(this.basePath);
            // Validate against structure
            const validation = await structureWrapper.validatePath(filePath);
            if (!validation.valid) {
                throw new Error(`MCP validation failed: ${validation.message}`);
            }
        }
        catch (error) {
            // If MCP module not available, use local validator
            await this.validator.validateFileOperation(operation, filePath);
        }
    }
    /**
     * Detect potential fraud
     */
    async detectFraud(filePath, options) {
        const suspiciousPatterns = [
            /\.(bak|backup|tmp)$/i,
            /node_modules/,
            /\.git\//,
            /password|secret|key|token/i
        ];
        // Check for suspicious patterns
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(filePath)) {
                return {
                    suspicious: true,
                    reason: `Path matches suspicious pattern: ${pattern}`,
                    block: pattern.test(/\.(bak|backup)$/i) // Block backup files
                };
            }
        }
        // Check for root directory creation
        const relativePath = path.relative(this.basePath, filePath);
        if (!relativePath || relativePath.startsWith('..')) {
            return {
                suspicious: true,
                reason: 'Attempting to create file outside project directory',
                block: true
            };
        }
        // Check file size limits
        const config = this.fileTypeConfigs.get(options.type);
        if (config?.maxSize && Buffer.isBuffer(options) && options.length > config.maxSize) {
            return {
                suspicious: true,
                reason: `File size exceeds limit for type ${options.type}`,
                block: false
            };
        }
        return { suspicious: false };
    }
    /**
     * Resolve file path based on type
     */
    resolveFilePath(filePath, type) {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        const config = this.fileTypeConfigs.get(type);
        if (config?.baseDir) {
            // Check if path already includes base directory
            if (!filePath.startsWith(config.baseDir)) {
                return path.join(this.basePath, config.baseDir, filePath);
            }
        }
        return path.join(this.basePath, filePath);
    }
    /**
     * Detect file type from path
     */
    detectFileType(filePath) {
        const relativePath = path.relative(this.basePath, filePath);
        const segments = relativePath.split(path.sep);
        // Check by directory
        if (segments[0] === 'gen' && segments[1] === 'doc')
            return FileType.DOCUMENT;
        if (segments[0] === 'temp')
            return FileType.TEMPORARY;
        if (segments[0] === 'logs')
            return FileType.LOG;
        if (segments[0] === 'tests' || segments[0] === 'test')
            return FileType.TEST;
        if (segments[0] === 'src')
            return FileType.SOURCE;
        if (segments[0] === 'scripts')
            return FileType.SCRIPT;
        if (segments[0] === 'demo')
            return FileType.DEMO;
        if (segments[0] === 'coverage')
            return FileType.COVERAGE;
        if (segments[0] === 'dist' || segments[0] === 'build')
            return FileType.BUILD;
        if (segments[0] === 'config')
            return FileType.CONFIG;
        // Check by extension
        const ext = path.extname(filePath);
        if (['.md', '.txt', '.pdf', '.html'].includes(ext))
            return FileType.DOCUMENT;
        if (['.log'].includes(ext))
            return FileType.LOG;
        if (['.json', '.yaml', '.yml', '.toml'].includes(ext))
            return FileType.CONFIG;
        // Check by pattern
        if (/report|analysis|summary/i.test(filePath))
            return FileType.REPORT;
        if (/\.(test|spec)\.(ts|js)$/.test(filePath))
            return FileType.TEST;
        return FileType.TEMPORARY;
    }
    /**
     * Apply template to content
     */
    async applyTemplate(templateName, content, metadata) {
        // For now, just return content
        // TODO: Implement template system
        return content;
    }
    /**
     * Atomic write operation
     */
    async atomicWrite(filePath, content, encoding) {
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await fs.promises.writeFile(tempPath, content, { encoding: encoding || 'utf8' });
            await fs.promises.rename(tempPath, filePath);
        }
        catch (error) {
            // Clean up temp file on error
            try {
                await fs.promises.unlink(tempPath);
            }
            catch { }
            throw error;
        }
    }
    /**
     * Create backup of existing file
     */
    async createBackup(filePath) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.promises.copyFile(filePath, backupPath);
    }
    /**
     * Get caller information for audit
     */
    getCallerInfo() {
        const stack = new Error().stack;
        if (!stack)
            return 'unknown';
        const lines = stack.split('\n');
        // Skip first 3 lines (Error, this function, and calling function)
        const callerLine = lines[3];
        if (!callerLine)
            return 'unknown';
        const match = callerLine.match(/at\s+(.+?)\s+\(/);
        return match ? match[1] : 'unknown';
    }
    /**
     * Get caller file path for enforcement checking
     */
    getCallerPath() {
        const stack = new Error().stack;
        if (!stack)
            return '';
        const lines = stack.split('\n');
        // Look for the first line with a file path that's not this file
        for (const line of lines) {
            const match = line.match(/\((.+?\.(ts|js|tsx|jsx)):\d+:\d+\)/);
            if (match && !match[1].includes('FileCreationAPI')) {
                // Return relative path from project root
                const fullPath = match[1];
                if (fullPath.includes(this.basePath)) {
                    return fullPath.replace(this.basePath + '/', '');
                }
                return fullPath;
            }
        }
        return '';
    }
    /**
     * Get audit log
     */
    getAuditLog() {
        return [...this.auditLog];
    }
    /**
     * Clear audit log
     */
    clearAuditLog() {
        this.auditLog = [];
    }
    /**
     * Export audit log to file
     */
    async exportAuditLog(outputPath) {
        const exportPath = outputPath || path.join(this.basePath, 'logs', `audit-${Date.now()}.json`);
        const content = JSON.stringify(this.auditLog, null, 2);
        await this.createFile(exportPath, content, {
            type: FileType.LOG,
            validate: false // Don't validate audit log export
        });
        return exportPath;
    }
    /**
     * Enable/disable MCP validation
     */
    setMCPValidation(enabled) {
        this.mpcValidationEnabled = enabled;
    }
    /**
     * Enable/disable fraud detection
     */
    setFraudDetection(enabled) {
        this.fraudDetectionEnabled = enabled;
    }
}
exports.FileCreationAPI = FileCreationAPI;
exports.default = FileCreationAPI;
//# sourceMappingURL=FileCreationAPI.js.map