"use strict";
/**
 * MCPIntegratedFileManager - File manager with deep filesystem-mcp integration
 *
 * Provides file operations that strictly adhere to FILE_STRUCTURE.vf.json
 * and integrates with filesystem-mcp's validation and protection features.
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
exports.MCPIntegratedFileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FileCreationAPI_1 = require("./FileCreationAPI");
class MCPIntegratedFileManager {
    constructor(basePath = process.cwd()) {
        this.structureCache = null;
        this.frozenDirectories = new Set();
        this.themePatterns = new Map();
        this.basePath = basePath;
        this.fileAPI = new FileCreationAPI_1.FileCreationAPI(basePath, true);
        this.initializePatterns();
        this.loadStructure();
    }
    initializePatterns() {
        // Theme naming patterns
        this.themePatterns.set('theme', /^[a-z][a-z0-9_-]*$/);
        this.themePatterns.set('user-story', /^\d{3}-[a-z][a-z0-9-]*$/);
        this.themePatterns.set('epic', /^[a-z][a-z0-9-]*$/);
    }
    async loadStructure() {
        try {
            const structurePath = path.join(this.basePath, 'FILE_STRUCTURE.vf.json');
            if (fs.existsSync(structurePath)) {
                const content = await fs.promises.readFile(structurePath, 'utf8');
                this.structureCache = JSON.parse(content);
                this.identifyFrozenDirectories();
            }
        }
        catch (error) {
            console.error('Failed to load FILE_STRUCTURE.vf.json:', error);
        }
    }
    identifyFrozenDirectories() {
        if (!this.structureCache)
            return;
        // Add frozen directories from structure
        const frozen = [
            '/',
            '/llm_rules',
            '/layer/themes/*/llm_rules',
            '/layer/themes/*/user-stories/*',
            '/layer/themes/*',
            '/layer/epics/*'
        ];
        frozen.forEach(dir => {
            this.frozenDirectories.add(dir);
        });
    }
    /**
     * Create file with MCP structure validation
     */
    async createStructuredFile(filePath, content, options) {
        // Validate against MCP structure
        const validation = await this.validateAgainstStructure(filePath, options.type);
        if (!validation.valid) {
            if (options.suggestAlternatives && validation.allowedPaths) {
                console.log('File creation blocked. Suggested alternatives:');
                validation.allowedPaths.forEach(p => console.log(`  - ${p}`));
            }
            if (options.enforceStructure) {
                throw new Error(`Structure validation failed: ${validation.violations.join(', ')}`);
            }
        }
        // Proceed with file creation
        return await this.fileAPI.createFile(filePath, content, options);
    }
    /**
     * Validate path against FILE_STRUCTURE.vf.json
     */
    async validateAgainstStructure(filePath, type) {
        const result = {
            valid: true,
            path: filePath,
            violations: [],
            suggestions: [],
            allowedPaths: []
        };
        if (!this.structureCache) {
            await this.loadStructure();
        }
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
        const relativePath = path.relative(this.basePath, absolutePath);
        const segments = relativePath.split(path.sep);
        // Check if trying to create in frozen directory
        if (await this.isInFrozenDirectory(absolutePath)) {
            result.valid = false;
            result.violations.push(`Cannot create files in frozen directory: ${path.dirname(relativePath)}`);
            result.suggestions.push(this.getFrozenDirectoryMessage(path.dirname(relativePath)));
            result.allowedPaths = this.getSuggestedPaths(type);
        }
        // Validate theme structure
        if (relativePath.startsWith('layer/themes/')) {
            const themeValidation = this.validateThemeStructure(segments);
            if (!themeValidation.valid) {
                result.valid = false;
                result.violations.push(...themeValidation.violations);
                result.suggestions.push(...themeValidation.suggestions);
            }
        }
        // Validate file type location
        const typeValidation = this.validateFileTypeLocation(relativePath, type);
        if (!typeValidation.valid) {
            result.valid = false;
            result.violations.push(typeValidation.violation);
            result.allowedPaths.push(...this.getSuggestedPaths(type));
        }
        return result;
    }
    /**
     * Check if path is in a frozen directory
     */
    async isInFrozenDirectory(absolutePath) {
        const relativePath = path.relative(this.basePath, absolutePath);
        const dirPath = path.dirname(relativePath);
        // Check exact matches
        if (this.frozenDirectories.has(dirPath)) {
            return true;
        }
        // Check pattern matches
        for (const frozen of this.frozenDirectories) {
            if (frozen.includes('*')) {
                const pattern = frozen.replace(/\*/g, '[^/]+');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(dirPath)) {
                    return true;
                }
            }
        }
        // Check root directory
        if (dirPath === '' || dirPath === '.') {
            return this.structureCache?.templates?.workspace?.freeze || false;
        }
        return false;
    }
    /**
     * Get freeze message for directory
     */
    getFrozenDirectoryMessage(dir) {
        if (dir === '' || dir === '.') {
            return 'Root directory is frozen. Create files in appropriate subdirectories: gen/doc/ for reports, layer/themes/ for features';
        }
        if (dir.includes('llm_rules')) {
            return 'LLM rules are generated from templates. Edit templates/llm_rules/ instead';
        }
        if (dir.includes('user-stories')) {
            return 'User story root is frozen. Create files in appropriate subdirectories: src/, tests/, docs/, etc.';
        }
        if (dir.includes('layer/themes')) {
            return 'Theme root is frozen. Create files in appropriate subdirectories: user-stories/, children/, research/, etc.';
        }
        if (dir.includes('layer/epics')) {
            return 'Epic root is frozen. Create files in appropriate subdirectories: common/, orchestrator/, research/, tests/, etc.';
        }
        return 'Directory is frozen by FILE_STRUCTURE.vf.json configuration';
    }
    /**
     * Validate theme structure
     */
    validateThemeStructure(segments) {
        const result = {
            valid: true,
            violations: [],
            suggestions: []
        };
        // Check theme name pattern
        if (segments.length >= 3) {
            const themeName = segments[2];
            const themePattern = this.themePatterns.get('theme');
            if (themePattern && !themePattern.test(themeName)) {
                result.valid = false;
                result.violations.push(`Invalid theme name: ${themeName}`);
                result.suggestions.push('Theme names must match pattern: ^[a-z][a-z0-9_-]*$');
            }
        }
        // Check user story pattern
        if (segments.length >= 5 && segments[3] === 'user-stories') {
            const storyName = segments[4];
            const storyPattern = this.themePatterns.get('user-story');
            if (storyPattern && !storyPattern.test(storyName)) {
                result.valid = false;
                result.violations.push(`Invalid user story name: ${storyName}`);
                result.suggestions.push('User story names must match pattern: ^\\d{3}-[a-z][a-z0-9-]*$');
            }
        }
        return result;
    }
    /**
     * Validate file type location
     */
    validateFileTypeLocation(relativePath, type) {
        const typeLocations = {
            [FileCreationAPI_1.FileType.DOCUMENT]: ['gen/doc', 'docs', 'layer/themes/*/docs'],
            [FileCreationAPI_1.FileType.REPORT]: ['gen/doc', 'gen/history/retrospect'],
            [FileCreationAPI_1.FileType.TEMPORARY]: ['temp', '*/temp'],
            [FileCreationAPI_1.FileType.LOG]: ['logs', '*/logs'],
            [FileCreationAPI_1.FileType.DATA]: ['data', '*/data'],
            [FileCreationAPI_1.FileType.CONFIG]: ['config', '*/config'],
            [FileCreationAPI_1.FileType.TEST]: ['test', 'tests', '*/tests', '*/test'],
            [FileCreationAPI_1.FileType.SOURCE]: ['src', '*/src', 'layer/themes/*/children'],
            [FileCreationAPI_1.FileType.GENERATED]: ['gen', '*/gen'],
            [FileCreationAPI_1.FileType.DEMO]: ['demo', '*/demo'],
            [FileCreationAPI_1.FileType.SCRIPT]: ['scripts', '*/scripts'],
            [FileCreationAPI_1.FileType.FIXTURE]: ['fixtures', '*/fixtures', 'tests/fixtures'],
            [FileCreationAPI_1.FileType.COVERAGE]: ['coverage', '*/coverage'],
            [FileCreationAPI_1.FileType.BUILD]: ['dist', 'build', '*/dist', '*/build']
        };
        const allowedLocations = typeLocations[type] || [];
        for (const location of allowedLocations) {
            if (location.includes('*')) {
                const pattern = location.replace(/\*/g, '[^/]+');
                const regex = new RegExp(`^${pattern}`);
                if (regex.test(relativePath)) {
                    return { valid: true, violation: '' };
                }
            }
            else {
                if (relativePath.startsWith(location)) {
                    return { valid: true, violation: '' };
                }
            }
        }
        return {
            valid: false,
            violation: `File type ${type} should be created in: ${allowedLocations.join(', ')}`
        };
    }
    /**
     * Get suggested paths for file type
     */
    getSuggestedPaths(type) {
        const suggestions = [];
        switch (type) {
            case FileCreationAPI_1.FileType.DOCUMENT:
                suggestions.push('gen/doc/your-document.md');
                break;
            case FileCreationAPI_1.FileType.REPORT:
                suggestions.push('gen/doc/report-name.md');
                suggestions.push('gen/history/retrospect/feature-retrospect.md');
                break;
            case FileCreationAPI_1.FileType.TEMPORARY:
                suggestions.push('temp/your-file.tmp');
                break;
            case FileCreationAPI_1.FileType.LOG:
                suggestions.push('logs/application.log');
                break;
            case FileCreationAPI_1.FileType.TEST:
                suggestions.push('tests/unit/your-test.test.ts');
                suggestions.push('tests/integration/your-test.itest.ts');
                suggestions.push('tests/system/your-test.stest.ts');
                break;
            case FileCreationAPI_1.FileType.SOURCE:
                suggestions.push('src/your-module.ts');
                suggestions.push('layer/themes/your-theme/children/YourComponent.ts');
                break;
            case FileCreationAPI_1.FileType.CONFIG:
                suggestions.push('config/your-config.json');
                break;
            case FileCreationAPI_1.FileType.SCRIPT:
                suggestions.push('scripts/your-script.ts');
                break;
            default:
                suggestions.push('temp/your-file');
        }
        return suggestions;
    }
    /**
     * Create file in correct location based on type
     */
    async createTypedFile(fileName, content, type, options) {
        // Determine correct path based on type
        const suggestedPaths = this.getSuggestedPaths(type);
        const baseName = path.basename(fileName);
        const correctPath = suggestedPaths[0].replace(path.basename(suggestedPaths[0]), baseName);
        return await this.createStructuredFile(correctPath, content, {
            type,
            enforceStructure: true,
            suggestAlternatives: true,
            ...options
        });
    }
    /**
     * Check if a path would be allowed
     */
    async checkPathAllowed(filePath, type) {
        const validation = await this.validateAgainstStructure(filePath, type);
        return validation.valid;
    }
    /**
     * Get allowed paths for a file type
     */
    getAllowedPaths(type) {
        return this.getSuggestedPaths(type);
    }
    /**
     * Batch validate paths
     */
    async batchValidate(paths) {
        const results = new Map();
        for (const { path: filePath, type } of paths) {
            const validation = await this.validateAgainstStructure(filePath, type);
            results.set(filePath, validation);
        }
        return results;
    }
    /**
     * Create report of structure violations
     */
    async generateViolationReport(paths) {
        const violations = [];
        violations.push('# File Structure Violation Report');
        violations.push(`Generated: ${new Date().toISOString()}\n`);
        for (const filePath of paths) {
            const type = this.detectFileType(filePath);
            const validation = await this.validateAgainstStructure(filePath, type);
            if (!validation.valid) {
                violations.push(`## ${filePath}`);
                violations.push('**Violations:**');
                validation.violations.forEach(v => violations.push(`- ${v}`));
                if (validation.suggestions.length > 0) {
                    violations.push('\n**Suggestions:**');
                    validation.suggestions.forEach(s => violations.push(`- ${s}`));
                }
                if (validation.allowedPaths && validation.allowedPaths.length > 0) {
                    violations.push('\n**Allowed Paths:**');
                    validation.allowedPaths.forEach(p => violations.push(`- ${p}`));
                }
                violations.push('');
            }
        }
        const reportPath = path.join(this.basePath, 'gen/doc/structure-violations.md');
        await this.fileAPI.createFile(reportPath, violations.join('\n'), {
            type: FileCreationAPI_1.FileType.REPORT,
            validate: false
        });
        return reportPath;
    }
    /**
     * Detect file type from path
     */
    detectFileType(filePath) {
        const relativePath = path.relative(this.basePath, filePath);
        const segments = relativePath.split(path.sep);
        const ext = path.extname(filePath);
        // Directory-based detection
        if (segments.includes('gen') && segments.includes('doc'))
            return FileCreationAPI_1.FileType.DOCUMENT;
        if (segments.includes('temp'))
            return FileCreationAPI_1.FileType.TEMPORARY;
        if (segments.includes('logs'))
            return FileCreationAPI_1.FileType.LOG;
        if (segments.includes('test') || segments.includes('tests'))
            return FileCreationAPI_1.FileType.TEST;
        if (segments.includes('src'))
            return FileCreationAPI_1.FileType.SOURCE;
        if (segments.includes('scripts'))
            return FileCreationAPI_1.FileType.SCRIPT;
        if (segments.includes('demo'))
            return FileCreationAPI_1.FileType.DEMO;
        if (segments.includes('coverage'))
            return FileCreationAPI_1.FileType.COVERAGE;
        if (segments.includes('dist') || segments.includes('build'))
            return FileCreationAPI_1.FileType.BUILD;
        if (segments.includes('config'))
            return FileCreationAPI_1.FileType.CONFIG;
        if (segments.includes('fixtures'))
            return FileCreationAPI_1.FileType.FIXTURE;
        // Extension-based detection
        if (['.md', '.txt', '.pdf'].includes(ext))
            return FileCreationAPI_1.FileType.DOCUMENT;
        if (['.log'].includes(ext))
            return FileCreationAPI_1.FileType.LOG;
        if (ext.match(/\.(test|spec|e2e)\.(ts|js)$/))
            return FileCreationAPI_1.FileType.TEST;
        // Pattern-based detection
        if (/report|analysis|summary|retrospect/i.test(filePath))
            return FileCreationAPI_1.FileType.REPORT;
        return FileCreationAPI_1.FileType.TEMPORARY;
    }
}
exports.MCPIntegratedFileManager = MCPIntegratedFileManager;
exports.default = MCPIntegratedFileManager;
//# sourceMappingURL=MCPIntegratedFileManager.js.map