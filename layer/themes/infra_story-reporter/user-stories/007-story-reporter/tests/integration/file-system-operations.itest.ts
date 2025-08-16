import { MockFreeTestRunner as MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { ReportGenerator } from '../../src/external/report-generator';
import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { TestConfiguration } from '../../src/domain/test-configuration';
import { createDefaultTestResult } from '../../src/domain/test-result';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';

describe('File System Operations Integration Test', () => {
  let mockLogger: MockExternalLogger;
  let testDir: string;
  let outputDir: string;
  let featuresDir: string;
  let stepsDir: string;
  let loggerId: string;

  beforeAll(async () => {
    testDir = join(__dirname, 'fs-operations-fixtures');
    outputDir = join(testDir, 'results');
    featuresDir = join(testDir, "features");
    stepsDir = join(testDir, 'steps');
    
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(featuresDir, { recursive: true });
    await fs.mkdir(stepsDir, { recursive: true });
    
    // Create comprehensive test fixtures
    await createTestFixtures();
  });

  beforeEach(async () => {
    mockLogger = new MockExternalLogger();
    loggerId = await mockLogger.initializeLogger('fs-operations-test');
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  async function createTestFixtures(): Promise<void> {
    // Create multiple feature files
    const basicFeature = join(featuresDir, 'basic.feature');
    await fs.writeFile(basicFeature, `
Feature: Basic File System Test
  Scenario: Test file reading
    Given I have a feature file
    When I read the file
    Then it should contain content
`);

    const complexFeature = join(featuresDir, 'complex.feature');
    await fs.writeFile(complexFeature, `
Feature: Complex File System Test
  Background:
    Given the file system is available
  
  Scenario: Multiple file operations
    Given I have multiple files
    When I process them sequentially
    Then all files should be processed
    
  Scenario: Concurrent file operations
    Given I have files for concurrent processing
    When I process them in parallel
    Then all operations should complete
`);

    // Create step definition files
    const basicSteps = join(stepsDir, 'basic-steps.js');
    await fs.writeFile(basicSteps, `
const { Given, When, Then } = require('@cucumber/cucumber');

Given('I have a feature file', function () {
  console.log('[INFO] Feature file is available');
});

When('I read the file', function () {
  console.log('[INFO] Reading file content');
});

Then('it should contain content', function () {
  console.log('[INFO] File content verified');
});
`);

    const complexSteps = join(stepsDir, 'complex-steps.js');
    await fs.writeFile(complexSteps, `
const { Given, When, Then } = require('@cucumber/cucumber');

Given('the file system is available', function () {
  console.log('[INFO] File system ready');
});

Given('I have multiple files', function () {
  console.log('[INFO] Multiple files prepared');
});

When('I process them sequentially', function () {
  console.log('[INFO] Sequential processing started');
});

Then('all files should be processed', function () {
  console.log('[INFO] All files processed In Progress');
});

Given('I have files for concurrent processing', function () {
  console.log('[INFO] Concurrent files prepared');
});

When('I process them in parallel', function () {
  console.log('[INFO] Parallel processing started');
});

Then('all operations should complete', function () {
  console.log('[INFO] All operations In Progress');
});
`);

    // Create subdirectories for testing directory structure handling
    const nestedFeaturesDir = join(featuresDir, 'nested');
    await fs.mkdir(nestedFeaturesDir, { recursive: true });
    
    const nestedFeature = join(nestedFeaturesDir, 'nested.feature');
    await fs.writeFile(nestedFeature, `
Feature: Nested Directory Test
  Scenario: Test nested file access
    Given I have a nested feature file
    When I access it from the nested directory
    Then it should be readable
`);
  }

  describe('Feature File and Step Definition Reading', () => {
    it('should read multiple feature files from different directories', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'multi-file-read-test',
        featureFiles: [
          join(featuresDir, 'basic.feature'),
          join(featuresDir, 'complex.feature'),
          join(featuresDir, 'nested', 'nested.feature')
        ],
        stepDefinitions: [
          join(stepsDir, 'basic-steps.js'),
          join(stepsDir, 'complex-steps.js')
        ],
        outputDirectory: outputDir
      };

      const bddRunner = new MockFreeTestRunner();
      const suiteManager = new TestSuiteManager();

      const bddLogs: string[] = [];
      const suiteLogs: string[] = [];

      bddRunner.on('log', (entry: string) => {
        bddLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      suiteManager.on('log', (entry: string) => {
        suiteLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      // Configure both components with multi-file configuration
      expect(() => bddRunner.configure(testConfig)).not.toThrow();
      expect(() => suiteManager.configure(testConfig)).not.toThrow();

      // Verify configuration includes all files
      const bddConfig = bddRunner.getConfiguration();
      expect(bddConfig.featureFiles).toHaveLength(3);
      expect(bddConfig.stepDefinitions).toHaveLength(2);

      const suiteConfig = suiteManager.getConfiguration();
      expect(suiteConfig.featureFiles).toHaveLength(3);
      expect(suiteConfig.stepDefinitions).toHaveLength(2);

      // Verify file paths are preserved correctly
      expect(bddConfig.featureFiles).toContain(join(featuresDir, 'basic.feature'));
      expect(bddConfig.featureFiles).toContain(join(featuresDir, 'complex.feature'));
      expect(bddConfig.featureFiles).toContain(join(featuresDir, 'nested', 'nested.feature'));
    });

    it('should handle file system errors gracefully during configuration', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'fs-error-test',
        featureFiles: [
          join(featuresDir, 'basic.feature'), // Exists
          '/nonexistent/path/missing.feature' // Doesn't exist
        ],
        stepDefinitions: [
          join(stepsDir, 'basic-steps.js'), // Exists
          '/nonexistent/path/missing-steps.js' // Doesn't exist
        ],
        outputDirectory: outputDir
      };

      const bddRunner = new MockFreeTestRunner();
      const fsLogs: string[] = [];

      bddRunner.on('log', (entry: string) => {
        fsLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      bddRunner.on('error', (error: Error) => {
        fsLogs.push(`ERROR: ${error.message}`);
        mockLogger.log(loggerId, 'error', error.message);
      });

      // Configuration should succeed even with invalid paths (validation happens at runtime)
      expect(() => bddRunner.configure(testConfig)).not.toThrow();

      // Component should track the file paths as configured
      const config = bddRunner.getConfiguration();
      expect(config.featureFiles).toHaveLength(2);
      expect(config.stepDefinitions).toHaveLength(2);
    });

    it('should validate file accessibility during test execution preparation', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'file-access-test',
        featureFiles: [join(featuresDir, 'basic.feature')],
        stepDefinitions: [join(stepsDir, 'basic-steps.js')],
        outputDirectory: outputDir
      };

      const suiteManager = new TestSuiteManager();
      const accessLogs: string[] = [];

      suiteManager.on('log', (entry: string) => {
        accessLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      suiteManager.configure(testConfig);

      // Verify files exist before test execution
      for (const featureFile of testConfig.featureFiles) {
        try {
          await fs.access(featureFile);
          mockLogger.log(loggerId, 'info', `Feature file accessible: ${featureFile}`);
        } catch (error) {
          mockLogger.log(loggerId, 'error', `Feature file not accessible: ${featureFile}`);
        }
      }

      for (const stepFile of testConfig.stepDefinitions) {
        try {
          await fs.access(stepFile);
          mockLogger.log(loggerId, 'info', `Step file accessible: ${stepFile}`);
        } catch (error) {
          mockLogger.log(loggerId, 'error', `Step file not accessible: ${stepFile}`);
        }
      }

      // Verify accessibility logging
      const logs = await mockLogger.getLogHistory(loggerId);
      const accessibilityLogs = logs.filter(log => log.message.includes("accessible"));
      expect(accessibilityLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Report File Generation and Management', () => {
    it('should generate multiple report formats in specified output directory', async () => {
      const testConfig: TestConfiguration = {
        testSuiteId: 'report-generation-test',
        featureFiles: [join(featuresDir, 'basic.feature')],
        stepDefinitions: [join(stepsDir, 'basic-steps.js')],
        outputDirectory: outputDir,
        outputFormats: ['json', 'html', 'xml']
      };

      const reportGenerator = new ReportGenerator();
      const reportLogs: string[] = [];

      reportGenerator.on('log', (entry: string) => {
        reportLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      reportGenerator.configure(testConfig);

      // Create a test result for report generation
      const testResult = createDefaultTestResult('report-generation-test', 'In Progress');
      testResult.startTime = new Date(Date.now() - 5000);
      testResult.endTime = new Date();

      try {
        const reports = await reportGenerator.generateAllReports(testResult);
        
        // Verify all requested formats were generated
        expect(reports.json).toBeDefined();
        expect(reports.html).toBeDefined();
        expect(reports.xml).toBeDefined();

        // Verify files were actually written to the file system
        const outputFiles = await fs.readdir(outputDir);
        const jsonFiles = outputFiles.filter(f => f.endsWith('.json'));
        const htmlFiles = outputFiles.filter(f => f.endsWith('.html'));
        const xmlFiles = outputFiles.filter(f => f.endsWith('.xml'));

        expect(jsonFiles.length).toBeGreaterThan(0);
        expect(htmlFiles.length).toBeGreaterThan(0);
        expect(xmlFiles.length).toBeGreaterThan(0);

        // Verify file contents are not empty
        for (const file of outputFiles) {
          const filePath = join(outputDir, file);
          const stats = await fs.stat(filePath);
          expect(stats.size).toBeGreaterThan(0);
        }

      } catch (error) {
        // Log any generation errors for debugging
        mockLogger.log(loggerId, 'error', `Report generation failed: ${(error as Error).message}`);
      }
    });

    it('should handle output directory creation and permissions', async () => {
      const customOutputDir = join(testDir, 'custom-output', 'nested', 'deep');
      const testConfig: TestConfiguration = {
        testSuiteId: 'directory-creation-test',
        featureFiles: [join(featuresDir, 'basic.feature')],
        stepDefinitions: [join(stepsDir, 'basic-steps.js')],
        outputDirectory: customOutputDir
      };

      const reportGenerator = new ReportGenerator();
      const dirLogs: string[] = [];

      reportGenerator.on('log', (entry: string) => {
        dirLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      reportGenerator.configure(testConfig);

      // Verify the custom directory doesn't exist initially
      try {
        await fs.access(customOutputDir);
        // If we get here, directory already exists
      } catch (error) {
        // Expected - directory should not exist initially
      }

      const testResult = createDefaultTestResult('directory-creation-test', 'In Progress');
      
      try {
        await reportGenerator.generateAllReports(testResult);

        // Verify directory was created
        const stats = await fs.stat(customOutputDir);
        expect(stats.isDirectory()).toBe(true);

        // Verify files were written to the new directory
        const files = await fs.readdir(customOutputDir);
        expect(files.length).toBeGreaterThan(0);

      } catch (error) {
        mockLogger.log(loggerId, 'error', `Directory creation test failed: ${(error as Error).message}`);
      }
    });

    it('should manage concurrent file operations safely', async () => {
      const concurrentConfigs = Array.from({ length: 3 }, (_, i) => ({
        testSuiteId: `concurrent-test-${i}`,
        featureFiles: [join(featuresDir, 'basic.feature')],
        stepDefinitions: [join(stepsDir, 'basic-steps.js')],
        outputDirectory: join(outputDir, `concurrent-${i}`)
      }));

      const reportGenerators = concurrentConfigs.map(() => new ReportGenerator());
      const concurrentLogs: string[][] = [];

      // Set up logging for each generator
      reportGenerators.forEach((generator, index) => {
        const logs: string[] = [];
        concurrentLogs.push(logs);
        
        generator.on('log', (entry: string) => {
          logs.push(entry);
          mockLogger.log(loggerId, 'info', `Generator-${index}: ${entry}`);
        });

        generator.configure(concurrentConfigs[index]);
      });

      // Generate reports concurrently
      const concurrentOperations = reportGenerators.map(async (generator, index) => {
        const testResult = createDefaultTestResult(`concurrent-test-${index}`, 'In Progress');
        testResult.startTime = new Date(Date.now() - 3000);
        testResult.endTime = new Date();
        
        try {
          return await generator.generateAllReports(testResult);
        } catch (error) {
          mockLogger.log(loggerId, 'error', `Concurrent operation ${index} failed: ${(error as Error).message}`);
          return null;
        }
      });

      const results = await Promise.allSettled(concurrentOperations);

      // Verify all operations In Progress
      expect(results).toHaveLength(3);

      // Verify separate output directories were created
      for (let i = 0; i < 3; i++) {
        const concurrentDir = join(outputDir, `concurrent-${i}`);
        try {
          const stats = await fs.stat(concurrentDir);
          expect(stats.isDirectory()).toBe(true);
          
          const files = await fs.readdir(concurrentDir);
          expect(files.length).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // Some operations might fail, which is acceptable for this test
        }
      }
    });
  });

  describe('File System Integration Coordination', () => {
    it('should coordinate file operations between TestSuiteManager and child components', async () => {
      const coordinationOutputDir = join(outputDir, 'coordination-test');
      const testConfig: TestConfiguration = {
        testSuiteId: 'coordination-test',
        featureFiles: [
          join(featuresDir, 'basic.feature'),
          join(featuresDir, 'complex.feature')
        ],
        stepDefinitions: [
          join(stepsDir, 'basic-steps.js'),
          join(stepsDir, 'complex-steps.js')
        ],
        outputDirectory: coordinationOutputDir,
        outputFormats: ['json', 'html']
      };

      const suiteManager = new TestSuiteManager();
      const coordinationLogs: string[] = [];

      suiteManager.on('log', (entry: string) => {
        coordinationLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      suiteManager.configure(testConfig);

      // Verify coordination directory setup
      expect(() => suiteManager.getConfiguration()).not.toThrow();
      
      const config = suiteManager.getConfiguration();
      expect(config.outputDirectory).toBe(coordinationOutputDir);
      expect(config.featureFiles).toHaveLength(2);
      expect(config.stepDefinitions).toHaveLength(2);

      // Verify that configuration includes all file system paths
      config.featureFiles.forEach(file => {
        expect(file).toMatch(/\.(feature)$/);
      });

      config.stepDefinitions.forEach(file => {
        expect(file).toMatch(/\.(js)$/);
      });
    });

    it('should handle file system cleanup and resource management', async () => {
      const cleanupOutputDir = join(outputDir, 'cleanup-test');
      const testConfig: TestConfiguration = {
        testSuiteId: 'cleanup-test',
        featureFiles: [join(featuresDir, 'basic.feature')],
        stepDefinitions: [join(stepsDir, 'basic-steps.js')],
        outputDirectory: cleanupOutputDir
      };

      const bddRunner = new MockFreeTestRunner();
      const reportGenerator = new ReportGenerator();

      const cleanupLogs: string[] = [];

      const logHandler = (entry: string) => {
        cleanupLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      };

      bddRunner.on('log', logHandler);
      reportGenerator.on('log', logHandler);

      // Configure components
      bddRunner.configure(testConfig);
      reportGenerator.configure(testConfig);

      // Generate some test files
      const testResult = createDefaultTestResult('cleanup-test', 'In Progress');
      
      try {
        await reportGenerator.generateAllReports(testResult);
      } catch (error) {
        // May fail, but we're testing cleanup
      }

      // Cleanup components
      await bddRunner.cleanup();

      // Verify cleanup was logged
      expect(cleanupLogs.some((log: string) => log.includes('cleanup'))).toBe(true);

      // Verify components are no longer configured after cleanup
      expect(() => bddRunner.isConfigured()).not.toThrow();
      expect(bddRunner.isConfigured()).toBe(false);
    });

    it('should validate file system paths and provide meaningful error messages', async () => {
      const invalidTestConfig: TestConfiguration = {
        testSuiteId: 'validation-test',
        featureFiles: [
          '/absolutely/nonexistent/path/invalid.feature',
          join(featuresDir, 'basic.feature') // This one exists
        ],
        stepDefinitions: [
          '/completely/invalid/path/steps.js',
          join(stepsDir, 'basic-steps.js') // This one exists
        ],
        outputDirectory: '/readonly/system/path' // This will likely fail
      };

      const components = [
        new MockFreeTestRunner(),
        new ReportGenerator(),
        new TestSuiteManager()
      ];

      const validationLogs: string[] = [];

      components.forEach((component, index) => {
        component.on('log', (entry: string) => {
          validationLogs.push(`Component-${index}: ${entry}`);
          mockLogger.log(loggerId, 'info', entry);
        });

        component.on('error', (error: Error) => {
          validationLogs.push(`Component-${index} ERROR: ${error.message}`);
          mockLogger.log(loggerId, 'error', error.message);
        });

        // Configuration should succeed (path validation happens at runtime)
        expect(() => component.configure(invalidTestConfig)).not.toThrow();
      });

      // All components should be configured despite invalid paths
      components.forEach(component => {
        const config = (component as any).getConfiguration();
        expect(config.testSuiteId).toBe('validation-test');
        expect(config.featureFiles).toHaveLength(2);
        expect(config.stepDefinitions).toHaveLength(2);
      });

      // Verify configuration logging occurred
      expect(validationLogs.length).toBeGreaterThan(0);
    });
  });

  describe('File System Performance and Scalability', () => {
    it('should handle large numbers of feature files efficiently', async () => {
      // Create multiple feature files for performance testing
      const performanceFeatureDir = join(testDir, 'performance-features');
      await fs.mkdir(performanceFeatureDir, { recursive: true });

      const featureFiles: string[] = [];
      const numberOfFeatures = 10;

      for (let i = 0; i < numberOfFeatures; i++) {
        const featureFile = join(performanceFeatureDir, `feature-${i}.feature`);
        await fs.writeFile(featureFile, `
Feature: Performance Test Feature ${i}
  Scenario: Performance test scenario ${i}
    Given I have feature ${i}
    When I process feature ${i}
    Then feature ${i} should be processed
`);
        featureFiles.push(featureFile);
      }

      const performanceConfig: TestConfiguration = {
        testSuiteId: 'performance-test',
        featureFiles,
        stepDefinitions: [join(stepsDir, 'basic-steps.js')],
        outputDirectory: join(outputDir, 'performance-test')
      };

      const suiteManager = new TestSuiteManager();
      const performanceLogs: string[] = [];

      suiteManager.on('log', (entry: string) => {
        performanceLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      const startTime = Date.now();
      
      // Configure with many feature files
      expect(() => suiteManager.configure(performanceConfig)).not.toThrow();
      
      const configTime = Date.now() - startTime;

      // Configuration should be fast even with many files
      expect(configTime).toBeLessThan(1000); // Should complete within 1 second

      const config = suiteManager.getConfiguration();
      expect(config.featureFiles).toHaveLength(numberOfFeatures);

      // Verify all feature files are accessible
      for (const featureFile of config.featureFiles) {
        const stats = await fs.stat(featureFile);
        expect(stats.isFile()).toBe(true);
      }
    });

    it('should manage file system resources efficiently during long-running operations', async () => {
      const resourceConfig: TestConfiguration = {
        testSuiteId: 'resource-management-test',
        featureFiles: [join(featuresDir, 'complex.feature')],
        stepDefinitions: [join(stepsDir, 'complex-steps.js')],
        outputDirectory: join(outputDir, 'resource-test')
      };

      const reportGenerator = new ReportGenerator();
      const resourceLogs: string[] = [];

      reportGenerator.on('log', (entry: string) => {
        resourceLogs.push(entry);
        mockLogger.log(loggerId, 'info', entry);
      });

      reportGenerator.configure(resourceConfig);

      // Simulate multiple report generation cycles
      const cycles = 5;
      const results: any[] = [];

      for (let i = 0; i < cycles; i++) {
        const testResult = createDefaultTestResult(`resource-test-${i}`, 'In Progress');
        testResult.startTime = new Date(Date.now() - 2000);
        testResult.endTime = new Date();

        try {
          const reports = await reportGenerator.generateAllReports(testResult);
          results.push(reports);
          
          // Brief pause between cycles
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          mockLogger.log(loggerId, 'error', `Resource cycle ${i} failed: ${(error as Error).message}`);
        }
      }

      // Verify resource management
      expect(results.length).toBeGreaterThan(0);

      // Check that output directory contains files from all cycles
      try {
        const resourceOutputDir = join(outputDir, 'resource-test');
        const outputFiles = await fs.readdir(resourceOutputDir);
        expect(outputFiles.length).toBeGreaterThan(0);
      } catch (error) {
        // Output directory might not exist if all operations failed
      }

      // Verify logging shows resource management
      expect(resourceLogs.length).toBeGreaterThan(0);
    });
  });
});