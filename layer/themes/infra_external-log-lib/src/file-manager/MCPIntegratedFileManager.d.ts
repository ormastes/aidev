/**
 * MCPIntegratedFileManager - File manager with deep filesystem-mcp integration
 *
 * Provides file operations that strictly adhere to FILE_STRUCTURE.vf.json
 * and integrates with filesystem-mcp's validation and protection features.
 */
import { FileType, FileCreationOptions, FileCreationResult } from './FileCreationAPI';
export interface MCPValidationResult {
    valid: boolean;
    path: string;
    violations: string[];
    suggestions: string[];
    allowedPaths?: string[];
}
export interface StructureAwareOptions extends FileCreationOptions {
    enforceStructure?: boolean;
    suggestAlternatives?: boolean;
    validateHierarchy?: boolean;
}
export declare class MCPIntegratedFileManager {
    private fileAPI;
    private basePath;
    private structureCache;
    private frozenDirectories;
    private themePatterns;
    constructor(basePath?: string);
    private initializePatterns;
    private loadStructure;
    private identifyFrozenDirectories;
    /**
     * Create file with MCP structure validation
     */
    createStructuredFile(filePath: string, content: string | Buffer, options: StructureAwareOptions): Promise<FileCreationResult>;
    /**
     * Validate path against FILE_STRUCTURE.vf.json
     */
    validateAgainstStructure(filePath: string, type: FileType): Promise<MCPValidationResult>;
    /**
     * Check if path is in a frozen directory
     */
    private isInFrozenDirectory;
    /**
     * Get freeze message for directory
     */
    private getFrozenDirectoryMessage;
    /**
     * Validate theme structure
     */
    private validateThemeStructure;
    /**
     * Validate file type location
     */
    private validateFileTypeLocation;
    /**
     * Get suggested paths for file type
     */
    private getSuggestedPaths;
    /**
     * Create file in correct location based on type
     */
    createTypedFile(fileName: string, content: string | Buffer, type: FileType, options?: Partial<StructureAwareOptions>): Promise<FileCreationResult>;
    /**
     * Check if a path would be allowed
     */
    checkPathAllowed(filePath: string, type: FileType): Promise<boolean>;
    /**
     * Get allowed paths for a file type
     */
    getAllowedPaths(type: FileType): string[];
    /**
     * Batch validate paths
     */
    batchValidate(paths: Array<{
        path: string;
        type: FileType;
    }>): Promise<Map<string, MCPValidationResult>>;
    /**
     * Create report of structure violations
     */
    generateViolationReport(paths: string[]): Promise<string>;
    /**
     * Detect file type from path
     */
    private detectFileType;
}
export default MCPIntegratedFileManager;
//# sourceMappingURL=MCPIntegratedFileManager.d.ts.map