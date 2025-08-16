/**
 * Strict Mode Configuration for File Violation Prevention
 *
 * This configuration controls how the FileViolationPreventer behaves
 * for the external-log-lib theme and its children.
 */
import { StrictModeConfig } from '../validators/FileViolationPreventer';
/**
 * Default configuration - NOT strict by default
 */
export declare const defaultStrictModeConfig: StrictModeConfig;
/**
 * Strict mode configuration for external-log-lib theme
 * This is activated when strict mode is explicitly enabled
 */
export declare const strictModeConfig: StrictModeConfig;
/**
 * Development mode configuration
 * Logs warnings but doesn't block operations
 */
export declare const developmentModeConfig: StrictModeConfig;
/**
 * Get configuration based on environment
 */
export declare function getStrictModeConfig(): StrictModeConfig;
/**
 * Configuration for specific paths
 * Some paths may need different strict mode settings
 */
export declare const pathSpecificConfigs: Map<string, Partial<StrictModeConfig>>;
declare const _default: {
    defaultStrictModeConfig: StrictModeConfig;
    strictModeConfig: StrictModeConfig;
    developmentModeConfig: StrictModeConfig;
    getStrictModeConfig: typeof getStrictModeConfig;
    pathSpecificConfigs: Map<string, Partial<StrictModeConfig>>;
};
export default _default;
//# sourceMappingURL=strict-mode.config.d.ts.map