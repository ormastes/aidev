"use strict";
/**
 * FileViolationPreventer
 *
 * Prevents file creation violations by checking against FILE_STRUCTURE.vf.json
 * Uses filesystem-mcp logic to validate operations before execution
 * Supports strict mode (throws exceptions) and non-strict mode (logs warnings)
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
exports.FileViolationPreventer = exports.FileViolationError = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pipe_1 = require("../../pipe");
const fileAPI = (0, pipe_1.getFileAPI)();
class FileViolationError extends Error {
    constructor(message, path, violationType) {
        super(message);
        this.path = path;
        this.violationType = violationType;
        this.name = 'FileViolationError';
    }
}
exports.FileViolationError = FileViolationError;
class FileViolationPreventer {
    constructor(basePath = process.cwd(), strictMode = false) {
        this.fileStructure = null;
        this.basePath = basePath;
        this.themePath = path.join(basePath, 'layer/themes/infra_external-log-lib');
        // Set up strict mode configuration
        if (typeof strictMode === 'boolean') {
            this.strictConfig = {
                enabled: strictMode,
                inheritToChildren: true,
                logWarnings: !strictMode,
                throwOnViolation: strictMode
            };
        }
        else {
            this.strictConfig = {
                enabled: false,
                inheritToChildren: true,
                logWarnings: true,
                throwOnViolation: false,
                ...strictMode
            };
        }
    }
    /**
     * Initialize by loading FILE_STRUCTURE.vf.json
     */
    async initialize() {
        const structurePath = path.join(this.basePath, 'FILE_STRUCTURE.vf.json');
        if (!fs.existsSync(structurePath)) {
            this.logWarn(`FILE_STRUCTURE.vf.json not found at ${structurePath}`);
            return;
        }
        try {
            const content = fs.readFileSync(structurePath, 'utf8');
            this.fileStructure = JSON.parse(content);
        }
        catch (error) {
            this.logWarn(`Failed to load FILE_STRUCTURE.vf.json: ${error}`);
        }
    }
    /**
     * Check if strict mode is enabled for a given path
     */
    async isStrictModeEnabled(filePath) {
        // Check if path is within this theme or its children
        const relativePath = path.relative(this.themePath, filePath);
        const isInTheme = !relativePath.startsWith('..');
        if (isInTheme) {
            if (this.strictConfig.inheritToChildren) {
                return this.strictConfig.enabled;
            }
            // Only apply to direct theme files, not children
            const segments = relativePath.split(path.sep);
            return this.strictConfig.enabled && segments.length <= 1;
        }
        return false;
    }
    /**
     * Validate a file operation before execution
     */
    async validateFileOperation(operation, targetPath) {
        if (!this.fileStructure) {
            await this.initialize();
        }
        // Skip validation if not in strict mode for this path
        if (!this.isStrictModeEnabled(targetPath)) {
            return;
        }
        const violations = await this.checkViolations(operation, targetPath);
        if (violations.length > 0) {
            const message = this.formatViolations(violations, targetPath);
            if (this.strictConfig.throwOnViolation) {
                throw new FileViolationError(message, targetPath, violations[0].type);
            }
            else if (this.strictConfig.logWarnings) {
                this.logWarn(message);
            }
        }
    }
    /**
     * Check for violations using filesystem-mcp logic
     */
    async checkViolations(operation, targetPath) {
        const violations = [];
        if (!this.fileStructure) {
            return violations;
        }
        const relativePath = path.relative(this.basePath, targetPath);
        const segments = relativePath.split(path.sep);
        // Check if creating in frozen directory
        const parentDir = path.dirname(targetPath);
        const isFrozen = await this.isDirectoryFrozen(parentDir);
        if (isFrozen) {
            const allowedInFrozen = await this.isAllowedInFrozenDirectory(parentDir, path.basename(targetPath));
            if (!allowedInFrozen) {
                violations.push({
                    type: 'freeze_violation',
                    message: `Cannot ${operation} '${path.basename(targetPath)}' in frozen directory '${parentDir}'`
                });
            }
        }
        // Check theme-specific rules
        if (relativePath.startsWith('layer/themes/infra_external-log-lib')) {
            const themeViolations = await this.checkThemeSpecificRules(operation, targetPath);
            violations.push(...themeViolations);
        }
        // Check pattern matching
        const patternViolation = await this.checkPatternViolation(targetPath);
        if (patternViolation) {
            violations.push(patternViolation);
        }
        return violations;
    }
    /**
     * Check if a directory is frozen
     */
    async isDirectoryFrozen(dirPath) {
        if (!this.fileStructure)
            return false;
        const relativePath = path.relative(this.basePath, dirPath);
        // Check root freeze
        if (relativePath === '' || relativePath === '.') {
            return this.fileStructure.templates.workspace?.freeze || false;
        }
        // Check theme freeze rules
        if (relativePath.startsWith('layer/themes')) {
            const template = this.fileStructure.templates.theme;
            if (template && template.freeze) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if a file is allowed in a frozen directory
     */
    async isAllowedInFrozenDirectory(dirPath, fileName) {
        if (!this.fileStructure)
            return true;
        const relativePath = path.relative(this.basePath, dirPath);
        // Check root allowed files
        if (relativePath === '' || relativePath === '.') {
            const workspace = this.fileStructure.templates.workspace;
            if (!workspace)
                return false;
            const allowedFiles = new Set();
            // Add required children
            workspace.required_children?.forEach(child => {
                allowedFiles.add(child.name);
            });
            // Add optional children
            workspace.optional_children?.forEach(child => {
                allowedFiles.add(child.name);
            });
            return allowedFiles.has(fileName);
        }
        return true;
    }
    /**
     * Check theme-specific rules
     */
    async checkThemeSpecificRules(operation, targetPath) {
        const violations = [];
        const fileName = path.basename(targetPath);
        const dirName = path.basename(path.dirname(targetPath));
        // Prevent creation of backup files
        if (fileName.endsWith('.bak') || fileName.endsWith('.backup')) {
            violations.push({
                type: 'backup_file',
                message: 'Backup files are not allowed. Use version control instead.'
            });
        }
        // Prevent duplicate mock files
        if (fileName.includes('mock') && fileName.endsWith('.js')) {
            const tsVersion = fileName.replace('.js', '.ts');
            const tsPath = path.join(path.dirname(targetPath), tsVersion);
            if (fs.existsSync(tsPath)) {
                violations.push({
                    type: 'duplicate_mock',
                    message: `JavaScript mock file not allowed when TypeScript version exists: ${tsVersion}`
                });
            }
        }
        // Check for proper directory structure
        const allowedThemeDirs = [
            'src', 'tests', 'pipe', 'children', 'common', 'research',
            'resources', 'user-stories', 'docs', 'gen', 'dist', 'coverage',
            'examples', 'scripts', 'node_modules', 'logs', 'utils'
        ];
        const relativePath = path.relative(this.themePath, targetPath);
        const topLevelDir = relativePath.split(path.sep)[0];
        if (operation === 'mkdir' && !allowedThemeDirs.includes(topLevelDir)) {
            violations.push({
                type: 'unexpected_directory',
                message: `Directory '${topLevelDir}' not in allowed list: ${allowedThemeDirs.join(', ')}`
            });
        }
        return violations;
    }
    /**
     * Check pattern violations
     */
    async checkPatternViolation(targetPath) {
        const fileName = path.basename(targetPath);
        // Check theme naming pattern
        if (targetPath.includes('layer/themes/')) {
            const themeMatch = targetPath.match(/layer\/themes\/([^/]+)/);
            if (themeMatch) {
                const themeName = themeMatch[1];
                const themePattern = /^[a-z][a-z0-9_-]*$/;
                if (!themePattern.test(themeName)) {
                    return {
                        type: 'pattern_violation',
                        message: `Theme name '${themeName}' doesn't match pattern: ^[a-z][a-z0-9_-]*$`
                    };
                }
            }
        }
        // Check file naming patterns
        if (fileName.includes(' ')) {
            return {
                type: 'pattern_violation',
                message: 'File names should not contain spaces'
            };
        }
        return null;
    }
    /**
     * Format violations for output
     */
    formatViolations(violations, targetPath) {
        const lines = [`File operation violation for: ${targetPath}`];
        violations.forEach(v => {
            lines.push(`  [${v.type}] ${v.message}`);
        });
        return lines.join('\n');
    }
    /**
     * Safe file write with violation checking
     */
    async safeWriteFile(filePath, content) {
        await this.validateFileOperation('write', filePath);
        await fileAPI.createFile(filePath, content, { type: pipe_1.FileType.TEMPORARY });
    }
    /**
     * Safe file creation with violation checking
     */
    async safeCreateFile(filePath, content = '') {
        await this.validateFileOperation('create', filePath);
        await fileAPI.createFile(filePath, content, { type: pipe_1.FileType.TEMPORARY });
    }
    /**
     * Safe directory creation with violation checking
     */
    async safeMkdir(dirPath, options) {
        await this.validateFileOperation('mkdir', dirPath);
        await fileAPI.createDirectory(dirPath);
    }
    /**
     * Get current strict mode configuration
     */
    async getStrictModeConfig() {
        return { ...this.strictConfig };
    }
    /**
     * Update strict mode configuration
     */
    async setStrictModeConfig(config) {
        this.strictConfig = { ...this.strictConfig, ...config };
    }
    /**
     * Enable strict mode for this theme and children
     */
    async enableStrictMode() {
        this.strictConfig.enabled = true;
        this.strictConfig.throwOnViolation = true;
        this.strictConfig.logWarnings = false;
    }
    /**
     * Disable strict mode (default)
     */
    async disableStrictMode() {
        this.strictConfig.enabled = false;
        this.strictConfig.throwOnViolation = false;
        this.strictConfig.logWarnings = true;
    }
    /**
     * Log warning message
     */
    async logWarn(message) {
        if (this.strictConfig.logWarnings) {
            console.warn(`[FileViolationPreventer] ${message}`);
        }
    }
}
exports.FileViolationPreventer = FileViolationPreventer;
exports.default = FileViolationPreventer;
//# sourceMappingURL=FileViolationPreventer.js.map