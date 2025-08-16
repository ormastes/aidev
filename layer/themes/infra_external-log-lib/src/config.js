"use strict";
/**
 * Global configuration for external module interception
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalConfig = void 0;
exports.updateConfig = updateConfig;
exports.resetConfig = resetConfig;
exports.globalConfig = {
    enableInterception: true,
    enableLogging: true,
    enableConsoleLogging: false, // Set to true for debugging
    enableValidation: true,
    enableSecurity: true,
    testMode: process.env.NODE_ENV === 'test'
};
function updateConfig(config) {
    Object.assign(exports.globalConfig, config);
}
function resetConfig() {
    exports.globalConfig.enableInterception = true;
    exports.globalConfig.enableLogging = true;
    exports.globalConfig.enableConsoleLogging = false;
    exports.globalConfig.enableValidation = true;
    exports.globalConfig.enableSecurity = true;
    exports.globalConfig.testMode = process.env.NODE_ENV === 'test';
}
//# sourceMappingURL=config.js.map