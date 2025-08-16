/**
 * FileViolationPreventer
 *
 * Prevents file creation violations by checking against FILE_STRUCTURE.vf.json
 * Uses filesystem-mcp logic to validate operations before execution
 * Supports strict mode (throws exceptions) and non-strict mode (logs warnings)
 */
import * as fs from 'fs';
export interface StrictModeConfig {
    enabled: boolean;
    inheritToChildren: boolean;
    logWarnings: boolean;
    throwOnViolation: boolean;
}
export declare class FileViolationError extends Error {
    readonly path: string;
    readonly violationType: string;
    constructor(message: string, path: string, violationType: string);
}
export declare class FileViolationPreventer {
    private fileStructure;
    private strictConfig;
    private basePath;
    private themePath;
    constructor(basePath?: string, strictMode?: boolean | StrictModeConfig);
    /**
     * Initialize by loading FILE_STRUCTURE.vf.json
     */
    initialize(): Promise<void>;
    /**
     * Check if strict mode is enabled for a given path
     */
    isStrictModeEnabled(filePath: string): boolean;
    /**
     * Validate a file operation before execution
     */
    validateFileOperation(operation: 'create' | 'write' | 'mkdir', targetPath: string): Promise<void>;
    /**
     * Check for violations using filesystem-mcp logic
     */
    private checkViolations;
    /**
     * Check if a directory is frozen
     */
    private isDirectoryFrozen;
    /**
     * Check if a file is allowed in a frozen directory
     */
    private isAllowedInFrozenDirectory;
    /**
     * Check theme-specific rules
     */
    private checkThemeSpecificRules;
    /**
     * Check pattern violations
     */
    private checkPatternViolation;
    /**
     * Format violations for output
     */
    private formatViolations;
    /**
     * Safe file write with violation checking
     */
    safeWriteFile(filePath: string, content: string): Promise<void>;
    /**
     * Safe file creation with violation checking
     */
    safeCreateFile(filePath: string, content?: string): Promise<void>;
    /**
     * Safe directory creation with violation checking
     */
    safeMkdir(dirPath: string, options?: fs.MakeDirectoryOptions): Promise<void>;
    /**
     * Get current strict mode configuration
     */
    getStrictModeConfig(): StrictModeConfig;
    /**
     * Update strict mode configuration
     */
    setStrictModeConfig(config: Partial<StrictModeConfig>): void;
    /**
     * Enable strict mode for this theme and children
     */
    enableStrictMode(): void;
    /**
     * Disable strict mode (default)
     */
    disableStrictMode(): void;
    /**
     * Log warning message
     */
    private logWarn;
}
export default FileViolationPreventer;
//# sourceMappingURL=FileViolationPreventer.d.ts.map