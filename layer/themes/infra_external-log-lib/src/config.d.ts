/**
 * Global configuration for external module interception
 */
export interface InterceptionConfig {
    enableInterception: boolean;
    enableLogging: boolean;
    enableConsoleLogging: boolean;
    enableValidation: boolean;
    enableSecurity: boolean;
    testMode: boolean;
}
export declare const globalConfig: InterceptionConfig;
export declare function updateConfig(config: Partial<InterceptionConfig>): void;
export declare function resetConfig(): void;
//# sourceMappingURL=config.d.ts.map