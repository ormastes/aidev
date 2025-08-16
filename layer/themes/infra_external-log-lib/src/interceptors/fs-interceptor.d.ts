/**
 * FS Interceptor - Intercepts and redirects fs operations to FileCreationAPI
 *
 * This module patches the native fs module to ensure all file operations
 * go through the FileCreationAPI. It can operate in enforcement or warning mode.
 */
export declare enum InterceptMode {
    ENFORCE = "enforce",// Block direct fs usage
    WARN = "warn",// Log warnings but allow
    MONITOR = "monitor",// Silent monitoring
    BYPASS = "bypass"
}
export interface InterceptorConfig {
    mode: InterceptMode;
    allowedCallers?: string[];
    logFile?: string;
    throwOnViolation?: boolean;
}
declare class FSInterceptor {
    private static instance;
    private fileAPI;
    private config;
    private violations;
    private originalMethods;
    private initialized;
    private constructor();
    static getInstance(config?: Partial<InterceptorConfig>): FSInterceptor;
    /**
     * Initialize the interceptor and patch fs methods
     */
    initialize(): void;
    /**
     * Patch fs methods to intercept file operations
     */
    private patchFSMethods;
    /**
     * Create an interceptor for async methods
     */
    private createInterceptor;
    /**
     * Create an interceptor for sync methods
     */
    private createSyncInterceptor;
    /**
     * Create an interceptor for promise-based methods
     */
    private createAsyncInterceptor;
    /**
     * Check if we should intercept this call
     */
    private shouldIntercept;
    /**
     * Log a violation
     */
    private logViolation;
    /**
     * Get caller information from stack
     */
    private getCallerInfo;
    /**
     * Detect file type from path
     */
    private detectFileType;
    /**
     * Get violation statistics
     */
    getViolations(): Map<string, number>;
    /**
     * Clear violations
     */
    clearViolations(): void;
    /**
     * Restore original fs methods
     */
    restore(): void;
    /**
     * Generate violation report
     */
    generateReport(): string;
}
export { FSInterceptor };
export default FSInterceptor;
//# sourceMappingURL=fs-interceptor.d.ts.map