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

export const globalConfig: InterceptionConfig = {
  enableInterception: true,
  enableLogging: true,
  enableConsoleLogging: false, // Set to true for debugging
  enableValidation: true,
  enableSecurity: true,
  testMode: process.env.NODE_ENV === 'test'
};

export function updateConfig(config: Partial<InterceptionConfig>): void {
  Object.assign(globalConfig, config);
}

export function resetConfig(): void {
  globalConfig.enableInterception = true;
  globalConfig.enableLogging = true;
  globalConfig.enableConsoleLogging = false;
  globalConfig.enableValidation = true;
  globalConfig.enableSecurity = true;
  globalConfig.testMode = process.env.NODE_ENV === 'test';
}