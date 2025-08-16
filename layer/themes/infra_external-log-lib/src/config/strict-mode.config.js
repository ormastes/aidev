"use strict";
/**
 * Strict Mode Configuration for File Violation Prevention
 *
 * This configuration controls how the FileViolationPreventer behaves
 * for the external-log-lib theme and its children.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathSpecificConfigs = exports.developmentModeConfig = exports.strictModeConfig = exports.defaultStrictModeConfig = void 0;
exports.getStrictModeConfig = getStrictModeConfig;
/**
 * Default configuration - NOT strict by default
 */
exports.defaultStrictModeConfig = {
    enabled: false, // Not strict by default
    inheritToChildren: true, // Apply to all child directories
    logWarnings: true, // Log warnings in non-strict mode
    throwOnViolation: false // Don't throw exceptions by default
};
/**
 * Strict mode configuration for external-log-lib theme
 * This is activated when strict mode is explicitly enabled
 */
exports.strictModeConfig = {
    enabled: true, // Enable strict checking
    inheritToChildren: true, // Apply to all children
    logWarnings: false, // Don't log, just throw
    throwOnViolation: true // Throw exceptions on violations
};
/**
 * Development mode configuration
 * Logs warnings but doesn't block operations
 */
exports.developmentModeConfig = {
    enabled: true, // Check for violations
    inheritToChildren: true, // Apply to all children
    logWarnings: true, // Log all violations
    throwOnViolation: false // Don't block operations
};
/**
 * Get configuration based on environment
 */
function getStrictModeConfig() {
    const strictEnv = process.env.EXTERNAL_LOG_LIB_STRICT_MODE;
    if (strictEnv === 'true' || strictEnv === '1') {
        return exports.strictModeConfig;
    }
    if (process.env.NODE_ENV === 'development') {
        return exports.developmentModeConfig;
    }
    return exports.defaultStrictModeConfig;
}
/**
 * Configuration for specific paths
 * Some paths may need different strict mode settings
 */
exports.pathSpecificConfigs = new Map([
    ['children', { enabled: true, inheritToChildren: true }], // Always strict for children
    ['tests', { enabled: false }], // Relaxed for tests
    ['gen', { enabled: false }], // Relaxed for generated files
    ['logs', { enabled: false }] // Relaxed for log files
]);
exports.default = {
    defaultStrictModeConfig: exports.defaultStrictModeConfig,
    strictModeConfig: exports.strictModeConfig,
    developmentModeConfig: exports.developmentModeConfig,
    getStrictModeConfig,
    pathSpecificConfigs: exports.pathSpecificConfigs
};
//# sourceMappingURL=strict-mode.config.js.map