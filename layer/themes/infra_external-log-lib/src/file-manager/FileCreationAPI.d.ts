/**
 * FileCreationAPI - Centralized file creation with type-based routing and validation
 *
 * This API ensures all file creation goes through proper validation and logging.
 * It integrates with filesystem-mcp for structure validation and provides
 * fraud detection for unauthorized file operations.
 */
export declare enum FileType {
    DOCUMENT = "doc",
    REPORT = "report",
    TEMPORARY = "temp",
    LOG = "log",
    DATA = "data",
    CONFIG = "config",
    TEST = "test",
    SOURCE = "source",
    GENERATED = "gen",
    DEMO = "demo",
    SCRIPT = "script",
    FIXTURE = "fixture",
    COVERAGE = "coverage",
    BUILD = "build"
}
export interface FileCreationOptions {
    type: FileType;
    template?: string;
    metadata?: Record<string, any>;
    validate?: boolean;
    backup?: boolean;
    atomic?: boolean;
    encoding?: BufferEncoding;
    mode?: number;
}
export interface FileCreationResult {
    success: boolean;
    path: string;
    type: FileType;
    size?: number;
    error?: string;
    violations?: string[];
    timestamp: Date;
}
export interface FileAuditEntry {
    operation: 'create' | 'write' | 'append' | 'delete' | 'mkdir';
    path: string;
    type: FileType;
    timestamp: Date;
    success: boolean;
    caller?: string;
    metadata?: Record<string, any>;
}
export declare class FileCreationAPI {
    private validator;
    private logger;
    private basePath;
    private auditLog;
    private fileTypeConfigs;
    private mpcValidationEnabled;
    private fraudDetectionEnabled;
    constructor(basePath?: string, enableStrictMode?: boolean);
    private initialize;
    private initializeFileTypeConfigs;
    /**
     * Create a file with type-based validation and routing
     */
    createFile(filePath: string, content: string | Buffer, options: FileCreationOptions): Promise<FileCreationResult>;
    /**
     * Write to an existing file with validation
     */
    writeFile(filePath: string, content: string | Buffer, options?: Partial<FileCreationOptions>): Promise<FileCreationResult>;
    /**
     * Create a directory with validation
     */
    createDirectory(dirPath: string): Promise<void>;
    /**
     * Batch file creation with transaction support
     */
    createBatch(files: Array<{
        path: string;
        content: string | Buffer;
        options: FileCreationOptions;
    }>): Promise<FileCreationResult[]>;
    /**
     * Validate file type and location
     */
    private validateFileType;
    /**
     * Validate with filesystem MCP
     */
    private validateWithMCP;
    /**
     * Detect potential fraud
     */
    private detectFraud;
    /**
     * Resolve file path based on type
     */
    private resolveFilePath;
    /**
     * Detect file type from path
     */
    private detectFileType;
    /**
     * Apply template to content
     */
    private applyTemplate;
    /**
     * Atomic write operation
     */
    private atomicWrite;
    /**
     * Create backup of existing file
     */
    private createBackup;
    /**
     * Get caller information for audit
     */
    private getCallerInfo;
    /**
     * Get caller file path for enforcement checking
     */
    private getCallerPath;
    /**
     * Get audit log
     */
    getAuditLog(): FileAuditEntry[];
    /**
     * Clear audit log
     */
    clearAuditLog(): void;
    /**
     * Export audit log to file
     */
    exportAuditLog(outputPath?: string): Promise<string>;
    /**
     * Enable/disable MCP validation
     */
    setMCPValidation(enabled: boolean): void;
    /**
     * Enable/disable fraud detection
     */
    setFraudDetection(enabled: boolean): void;
}
export default FileCreationAPI;
//# sourceMappingURL=FileCreationAPI.d.ts.map