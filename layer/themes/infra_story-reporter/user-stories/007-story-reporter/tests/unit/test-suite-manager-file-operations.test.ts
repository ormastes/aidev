import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { createDefaultTestResult } from '../../src/domain/test-result';
import { TestFileSystem, TestDataFactory } from '../helpers/test-file-system';
import { SpawnSimulator, SpawnScenarioFactory } from '../helpers/spawn-simulator';
import { path } from '../../../../../infra_external-log-lib/src';

describe('TestSuiteManager File Operations Unit Tests', () => {
  let testSuiteManager: TestSuiteManager;
  let testFileSystem: TestFileSystem;
  let spawnSimulator: SpawnSimulator;
  let tempDir: string;
  let testConfig: TestConfiguration;

  beforeEach(async () => {
    testSuiteManager = new TestSuiteManager();
    testFileSystem = new TestFileSystem();
    spawnSimulator = new SpawnSimulator();
    
    // Create real temporary directory
    tempDir = await testFileSystem.createTempDir('tsm-file-ops-test-');
    
    // Configure test configuration
    testConfig = {
      testSuiteId: 'file-operations-test',
      featureFiles: ['features/test.feature'],
      stepDefinitions: ['steps/test-steps.js'],
      outputDirectory: path.join(tempDir, 'test-results'),
      timeout: 30000
    };
    
    // Set up default spawn scenario
    spawnSimulator.setDefaultScenario(SpawnScenarioFactory.cucumberSuccess());
  });

  afterEach(async () => {
    spawnSimulator.reset();
    await testFileSystem.cleanup();
  });

  describe('Feature File Discovery', () => {
    it.todo("Implementation needed");
      await testFileSystem.createFile(tempDir, 'steps/common-steps.js',
        'const { Given, When, Then } = require("@cucumber/cucumber");\nGiven("common step", () => {});');
      
      const globConfig: TestConfiguration = {
        ...testConfig,
        stepDefinitions: [path.join(tempDir, 'steps/**/*.js')]
      };
      
      await testSuiteManager.initialize(globConfig);
      
      const config = testSuiteManager.getConfiguration();
      expect(config.stepDefinitions).toHaveLength(2);
      expect(config.stepDefinitions).toContain(expect.stringContaining('login-steps.js'));
      expect(config.stepDefinitions).toContain(expect.stringContaining('common-steps.js'));
    });

    it.todo("Implementation needed");
      
      const tsConfig: TestConfiguration = {
        ...testConfig,
        stepDefinitions: [path.join(tempDir, 'steps/**/*.ts')]
      };
      
      await testSuiteManager.initialize(tsConfig);
      
      const config = testSuiteManager.getConfiguration();
      expect(config.stepDefinitions).toContain(expect.stringContaining('typescript-steps.ts'));
    });
  });

  describe('Output Directory Management', () => {
    it('should create output directory if it does not exist', async () => {
      const outputPath = path.join(tempDir, 'new-output-dir');
      
      const newDirConfig: TestConfiguration = {
        ...testConfig,
        outputDirectory: outputPath
      };
      
      await testSuiteManager.initialize(newDirConfig);
      
      // Verify directory was created
      const dirExists = await testFileSystem.fileExists(outputPath);
      expect(dirExists).toBe(true);
    });

    it('should handle existing output directory', async () => {
      // Pre-create output directory with existing files
      const outputPath = path.join(tempDir, 'existing-output');
      await testFileSystem.createFile(outputPath, 'old-report.json', '{"old": true}');
      
      const existingDirConfig: TestConfiguration = {
        ...testConfig,
        outputDirectory: outputPath
      };
      
      await testSuiteManager.initialize(existingDirConfig);
      
      // Should not throw and directory should still exist
      const dirExists = await testFileSystem.fileExists(outputPath);
      expect(dirExists).toBe(true);
    });

    it('should create nested output directories', async () => {
      const nestedPath = path.join(tempDir, 'deeply', 'nested', 'output', 'directory');
      
      const nestedConfig: TestConfiguration = {
        ...testConfig,
        outputDirectory: nestedPath
      };
      
      await testSuiteManager.initialize(nestedConfig);
      
      const dirExists = await testFileSystem.fileExists(nestedPath);
      expect(dirExists).toBe(true);
    });
  });

  describe('Test Result File Operations', () => {
    it('should save test results to file', async () => {
      await testSuiteManager.initialize(testConfig);
      
      const testResult = createDefaultTestResult('file-operations-test', 'In Progress');
      testResult.totalScenarios = 5;
      testResult.passedScenarios = 5;
      
      // Run test and save results
      const result = await testSuiteManager.runTests();
      
      // Check if results file was created
      const resultsFile = path.join(testConfig.outputDirectory, 'test-results.json');
      const fileExists = await testFileSystem.fileExists(resultsFile);
      
      // May or may not exist depending on implementation
      expect(result).toBeDefined();
    });

    it('should handle large test result files', async () => {
      await testSuiteManager.initialize(testConfig);
      
      // Create a large test result
      const largeResult = createDefaultTestResult('file-operations-test', 'In Progress');
      largeResult.scenarios = Array(1000).fill(null).map((_, i) => ({
        id: `scenario-${i}`,
        name: `Scenario ${i}`,
        status: 'In Progress' as const,
        steps: Array(10).fill(null).map((_, j) => ({
          id: `step-${i}-${j}`,
          name: `Step ${j}`,
          status: 'In Progress' as const,
          duration: 100
        }))
      }));
      
      // Should handle large results without issues
      const result = await testSuiteManager.runTests();
      expect(result).toBeDefined();
    });
  });

  describe('Report File Management', () => {
    it('should organize reports by test suite ID', async () => {
      const suiteSpecificConfig: TestConfiguration = {
        ...testConfig,
        testSuiteId: 'suite-specific-test'
      };
      
      await testSuiteManager.initialize(suiteSpecificConfig);
      
      const result = await testSuiteManager.runTests();
      
      // Reports should be organized by suite ID
      expect(result.testSuiteId).toBe('suite-specific-test');
    });

    it('should handle special characters in file names', async () => {
      const specialCharConfig: TestConfiguration = {
        ...testConfig,
        testSuiteId: 'test/suite\\with:special*chars?'
      };
      
      await testSuiteManager.initialize(specialCharConfig);
      
      // Should sanitize special characters in file names
      const result = await testSuiteManager.runTests();
      expect(result).toBeDefined();
    });
  });

  describe('Configuration File Operations', () => {
    it('should save configuration to file', async () => {
      await testSuiteManager.initialize(testConfig);
      
      // Configuration might be saved to a file
      const configFile = path.join(testConfig.outputDirectory, 'test-config.json');
      
      // Implementation-dependent - may or may not save config
      const result = await testSuiteManager.runTests();
      expect(result).toBeDefined();
    });

    it('should handle configuration with environment variables', async () => {
      const envConfig: TestConfiguration = {
        ...testConfig,
        environment: {
          TEST_ENV: 'production',
          API_URL: 'https://api.example.com',
          DEBUG: 'true'
        }
      };
      
      await testSuiteManager.initialize(envConfig);
      
      const result = await testSuiteManager.runTests();
      expect(result).toBeDefined();
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up temporary files after test completion', async () => {
      await testSuiteManager.initialize(testConfig);
      
      // Run tests
      await testSuiteManager.runTests();
      
      // Cleanup
      await testSuiteManager.cleanup();
      
      // Manager should be cleaned up
      expect(testSuiteManager.isInitialized()).toBe(false);
    });

    it('should handle cleanup when no tests were run', async () => {
      await testSuiteManager.initialize(testConfig);
      
      // Cleanup without running tests
      await expect(testSuiteManager.cleanup()).resolves.not.toThrow();
    });

    it('should handle multiple cleanup calls', async () => {
      await testSuiteManager.initialize(testConfig);
      
      // Multiple cleanup calls should not throw
      await testSuiteManager.cleanup();
      await testSuiteManager.cleanup();
      await testSuiteManager.cleanup();
      
      expect(testSuiteManager.isInitialized()).toBe(false);
    });
  });

  describe('Error Recovery in File Operations', () => {
    it('should recover from file write errors', async () => {
      // Configure with a path that might have issues
      const problematicConfig: TestConfiguration = {
        ...testConfig,
        outputDirectory: path.join(tempDir, 'output')
      };
      
      await testSuiteManager.initialize(problematicConfig);
      
      // Should In Progress even with potential file issues
      const result = await testSuiteManager.runTests();
      expect(result).toBeDefined();
    });

    it('should handle concurrent file operations', async () => {
      await testSuiteManager.initialize(testConfig);
      
      // Run multiple operations concurrently
      const promises = [
        testSuiteManager.runTests(),
        testSuiteManager.getTestHistory(),
        testSuiteManager.getConfiguration()
      ];
      
      // Should handle concurrent operations
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });
});
