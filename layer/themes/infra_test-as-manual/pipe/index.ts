/**
 * test-as-manual theme pipe gateway
 * All external access to this theme must go through this file
 */

// Original MFTOD Converter (backward compatibility)
export { MFTODConverter } from '../user-stories/001-mftod-converter/src/application/converter';
export { 
  TestParser,
  BDDParser 
} from '../user-stories/001-mftod-converter/src/domain/test-parser';
export {
  DocumentFormatter,
  MarkdownFormatter,
  HTMLFormatter,
  JSONFormatter
} from '../user-stories/001-mftod-converter/src/domain/document-formatter';

// Enhanced Manual Generator (new features)
export { 
  ManualGenerator,
  TestParser as EnhancedTestParser,
  TemplateEngine,
  MetadataExtractor,
  DocumentBuilder
} from '../user-stories/002-enhanced-manual-generator/src/core/ManualGenerator';

// Theme Scanner and Registry (new features)
export {
  ThemeScanner,
  TestDiscovery,
  ThemeRegistry,
  TestCategorizer
} from '../user-stories/002-enhanced-manual-generator/src/scanner';

// Types
export type {
  ConversionOptions,
  TestDocument,
  TestSuite,
  TestCase
} from '../user-stories/001-mftod-converter/src/domain/types';

export type {
  ManualGeneratorOptions,
  GeneratedManual,
  ParsedTest,
  ThemeDefinition,
  ScanResult,
  DiscoveredTest,
  ThemeEntry,
  TestCategory
} from '../user-stories/002-enhanced-manual-generator/src';

// Unified Service (combines both implementations)
export class TestAsManualService {
  private mftodConverter?: any;
  private manualGenerator?: any;
  
  /**
   * Get the original MFTOD converter for simple conversions
   */
  async getOriginalConverter() {
    if (!this.mftodConverter) {
      const { MFTODConverter } = await import('../user-stories/001-mftod-converter/src/application/converter');
      this.mftodConverter = new MFTODConverter();
    }
    return this.mftodConverter;
  }
  
  /**
   * Get the enhanced manual generator for advanced features
   */
  async getEnhancedGenerator(options?: any) {
    if (!this.manualGenerator) {
      const { ManualGenerator } = await import('../user-stories/002-enhanced-manual-generator/src');
      this.manualGenerator = new ManualGenerator(options);
    }
    return this.manualGenerator;
  }
  
  /**
   * Convert a test file using the appropriate converter
   */
  async convert(filePath: string, options?: any): Promise<any> {
    // Use enhanced generator if advanced features requested
    if (options?.generateTOC || options?.includeMetadata || options?.template) {
      const generator = await this.getEnhancedGenerator(options);
      return generator.generateFromFile(filePath);
    }
    
    // Otherwise use original converter for backward compatibility
    const converter = await this.getOriginalConverter();
    return converter.convertFile(filePath, options);
  }
}

// ============== WEB TEST SUPPORT ==============
// Test Port Manager - Manages test port allocation via Security Theme
export { 
  TestPortManager,
  TestPortAllocation,
  testPortManager
} from '../children/TestPortManager';

// Deployment Test Manager - Multi-environment testing
export {
  DeploymentTestManager,
  DeploymentEnvironment,
  TestDeploymentConfig,
  DeploymentTestRunner,
  TestRunResult,
  EnvironmentTestResult,
  ComparisonReport,
  deploymentTestManager
} from '../children/DeploymentTestManager';

// Playwright Integration - Test framework integration
export {
  PlaywrightSecurityConfig,
  testHelpers,
  playwrightSecurity
} from '../children/PlaywrightIntegration';

// Web App Deployment Tester - Comprehensive deployment testing
export {
  WebAppDeploymentTester,
  WebAppConfig,
  DeploymentTestSuite,
  DeploymentTest,
  TestContext,
  TestResult,
  DeploymentReport,
  EnvironmentReport,
  webAppDeploymentTester
} from '../children/WebAppDeploymentTester';

// Test Credential Provider - Dynamic test user management
export {
  TestCredentialProvider,
  TestCredentials,
  TestSuiteCredentials,
  testCredentialProvider
} from '../children/TestCredentialProvider';

// Helper function to get credentials directly
export function getTestCredentials(role: 'admin' | 'user' | 'moderator' | 'developer' = 'admin') {
  const provider = TestCredentialProvider.getInstance();
  return provider.getCredentialsByRole(role);
}

// ============== EMBEDDED APP TESTING ==============
// Support for testing web applications embedded within other web applications
export {
  EmbeddedAppManager,
  EmbeddedAppConfig,
  MessageProtocol
} from '../children/EmbeddedAppManager';

export {
  EmbeddedAppTester,
  ManualTestProcedures
} from '../children/EmbeddedAppTester';

// Default export - Enhanced with web test support
export default TestAsManualService;
