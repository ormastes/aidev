/**
 * Scanner Module - Theme and Test Discovery
 * Exports all scanner components for theme discovery and test categorization
 */

export { ThemeScanner } from './ThemeScanner';
export { TestDiscovery } from './TestDiscovery';
export { ThemeRegistry } from './ThemeRegistry';
export { TestCategorizer } from './TestCategorizer';

// Export types
export type {
  DiscoveredTest,
  TestFileMetadata,
  TestType,
  TestFramework,
  DiscoveryOptions
} from './TestDiscovery';

export type {
  ThemeEntry,
  ThemeStatistics,
  RegistryOptions,
  RegistrySnapshot
} from './ThemeRegistry';

export type {
  TestCategory,
  CategoryMetadata,
  CategorizationRule,
  CategorizationResult,
  CategorizationStatistics
} from './TestCategorizer';