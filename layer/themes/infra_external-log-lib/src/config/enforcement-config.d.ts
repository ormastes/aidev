/**
 * Strict Enforcement Configuration for File Creation API
 * Only sample/demo themes are exempt from using the FileCreationAPI
 */
export interface EnforcementConfig {
    mode: 'strict' | 'warn' | 'monitor' | 'bypass';
    exemptPatterns: string[];
    requireTypeForAll: boolean;
    autoRouting: boolean;
    blockDirectFS: boolean;
}
/**
 * Themes/paths that are EXEMPT from FileCreationAPI requirement
 * These are sample applications that can use original fs interfaces
 */
export declare const EXEMPT_FILES: string[];
export declare const EXEMPT_THEMES: string[];
/**
 * Themes that MUST use FileCreationAPI with automatic folder routing
 * All themes not in EXEMPT_THEMES are automatically included
 */
export declare const ENFORCED_THEMES: string[];
/**
 * File type routing configuration
 * Maps file types to their automatic folder destinations
 */
export declare const TYPE_ROUTING_MAP: Record<string, string>;
/**
 * Strict type requirements
 * These patterns MUST specify a type - no default allowed
 */
export declare const REQUIRE_TYPE_PATTERNS: string[];
export declare class EnforcementValidator {
    private config;
    constructor(config?: Partial<EnforcementConfig>);
    /**
     * Check if a file path is exempt from FileCreationAPI requirement
     */
    isExempt(filePath: string): boolean;
    /**
     * Check if a file MUST use FileCreationAPI
     */
    mustUseFileAPI(filePath: string): boolean;
    /**
     * Check if a file type is required for a given path
     */
    isTypeRequired(filePath: string): boolean;
    /**
     * Get the automatic folder for a file type
     */
    getAutoFolder(fileType: string): string | null;
    /**
     * Validate a file operation
     */
    validateOperation(filePath: string, options?: {
        type?: string;
        folder?: string;
    }): {
        valid: boolean;
        errors: string[];
        warnings: string[];
        autoFolder?: string;
    };
    /**
     * Extract theme name from file path
     */
    private extractThemeName;
    /**
     * Check if a path matches a pattern (supports wildcards)
     */
    private matchesPattern;
    /**
     * Get enforcement report for a file
     */
    getEnforcementReport(filePath: string): {
        theme: string | null;
        isExempt: boolean;
        mustUseAPI: boolean;
        requiresType: boolean;
        enforcementLevel: 'none' | 'optional' | 'required' | 'strict';
    };
}
export declare const strictEnforcement: EnforcementValidator;
export declare function isDirectFSAllowed(filePath: string): boolean;
export declare function validateFileOperation(filePath: string, options?: {
    type?: string;
    folder?: string;
}): {
    valid: boolean;
    errors: string[];
    autoFolder?: string;
};
//# sourceMappingURL=enforcement-config.d.ts.map