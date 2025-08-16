/**
 * Main entry point for the circular dependency detection library
 */

// Core exports
export { DependencyGraph } from './core/dependency-graph';
export * from './core/types';

// Analyzer exports
export { TypeScriptAnalyzer } from './typescript/ts-analyzer';
export { CppAnalyzer } from './cpp/cpp-analyzer';
export { PythonAnalyzer } from './python/python-analyzer';

// CLI exports
export { MultiLanguageAnalyzer } from './cli/multi-language-analyzer';
export { ReportGenerator } from './cli/report-generator';
export { ConfigurationManager } from './cli/config-manager';
export { VisualizationGenerator } from './cli/visualization-generator';

// Convenience factory functions
export function createAnalyzer(language: string) {
  switch (language.toLowerCase()) {
    case 'typescript':
    case 'ts':
      return new (require('./typescript/ts-analyzer').TypeScriptAnalyzer)();
    case 'cpp':
    case 'c++':
      return new (require('./cpp/cpp-analyzer').CppAnalyzer)();
    case 'python':
    case 'py':
      return new (require('./python/python-analyzer').PythonAnalyzer)();
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

export function createMultiAnalyzer(configPath?: string) {
  const { MultiLanguageAnalyzer } = require('./cli/multi-language-analyzer');
  const { ConfigurationManager } = require('./cli/config-manager');
  
  if (configPath) {
    const configManager = new ConfigurationManager();
    const config = configManager.loadConfig(configPath);
    return new MultiLanguageAnalyzer(config);
  }
  
  return new MultiLanguageAnalyzer();
}