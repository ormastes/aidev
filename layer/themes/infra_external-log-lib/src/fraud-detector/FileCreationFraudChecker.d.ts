/**
 * FileCreationFraudChecker - Detects and prevents unauthorized file creation patterns
 *
 * This module scans code for direct file system API usage bypassing the
 * FileCreationAPI and reports violations. It integrates with the fraud-checker
 * theme to provide comprehensive security validation.
 */
export interface FraudPattern {
    name: string;
    pattern: RegExp;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    autoFix?: boolean;
}
export interface FraudDetectionResult {
    filePath: string;
    violations: Violation[];
    suggestions: string[];
    canAutoFix: boolean;
}
export interface Violation {
    line: number;
    column: number;
    code: string;
    pattern: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
}
export interface FraudCheckOptions {
    excludePaths?: string[];
    includeSampleApps?: boolean;
    autoFix?: boolean;
    reportPath?: string;
}
export declare class FileCreationFraudChecker {
    private patterns;
    private fileAPI;
    private basePath;
    private violations;
    constructor(basePath?: string);
    private initializePatterns;
    /**
     * Scan a file for fraud patterns
     */
    scanFile(filePath: string): Promise<FraudDetectionResult>;
    /**
     * Scan directory recursively
     */
    scanDirectory(dirPath: string, options?: FraudCheckOptions): Promise<Map<string, FraudDetectionResult>>;
    /**
     * Check if file is a source file
     */
    private isSourceFile;
    /**
     * Generate fix suggestion
     */
    private generateFixSuggestion;
    /**
     * Auto-fix violations
     */
    autoFix(filePath: string): Promise<boolean>;
    /**
     * Generate fraud report
     */
    generateReport(options?: FraudCheckOptions): Promise<string>;
    /**
     * Add violation section to report
     */
    private addViolationSection;
    /**
     * Export violations as JSON
     */
    exportViolations(outputPath?: string): Promise<string>;
    /**
     * Clear violations
     */
    clearViolations(): void;
}
export default FileCreationFraudChecker;
//# sourceMappingURL=FileCreationFraudChecker.d.ts.map