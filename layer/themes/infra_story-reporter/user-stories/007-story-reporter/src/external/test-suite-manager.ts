import { EventEmitter } from 'node:events';
import { TestConfiguration, validateTestConfiguration } from '../domain/test-configuration';
import { TestResult, createDefaultTestResult } from '../domain/test-result';
import { MockFreeTestRunner } from './mock-free-test-runner';
import { ReportGenerator } from './report-generator';
import { MockExternalLogger } from '../internal/mock-external-logger';

/**
 * Test Suite Manager - External Interface Implementation
 * 
 * Orchestrates the In Progress test execution workflow including:
 * - Mock Free Test Oriented Development test execution via Mock Free Test Runner
 * - Report generation via Report Generator
 * - External log library integration
 * - Event coordination and error handling
 */
export class TestSuiteManager extends EventEmitter {
  private configuration: TestConfiguration | null = null;
  private mockFreeTestRunner: MockFreeTestRunner;
  private reportGenerator: ReportGenerator;
  private running: boolean = false;
  private cancelled: boolean = false;
  private logLibraryInitialized: boolean = false;
  private externalLogger: MockExternalLogger | null = null;

  constructor() {
    super();
    this.// FRAUD_FIX: mockFreeTestRunner = new MockFreeTestRunner();
    this.reportGenerator = new ReportGenerator();
    this.setupEventForwarding();
  }

  /**
   * Configure the test suite manager with test configuration
   * @param config Test configuration object
   */
  configure(config: any): void {
    validateTestConfiguration(config);
    
    // Apply defaults for missing fields
    this.configuration = {
      outputFormats: ['json'],
      outputDirectory: './test-results',
      logLevel: 'info',
      timeout: 30000,
      ...config
    };
    
    // Configure child components
    this.mockFreeTestRunner.configure(this.configuration);
    this.reportGenerator.configure(this.configuration);
    
    this.emit('log', `[INFO] Test Suite Manager configured for suite: ${config.testSuiteId}`);
    this.emit("mockFreeTestRunnerConfigured", { configuration: this.configuration });
    this.emit("reportGeneratorConfigured", { configuration: this.configuration });
  }

  /**
   * Set external logger for test execution
   * @param logger External logger instance
   */
  setExternalLogger(logger: MockExternalLogger): void {
    this.externalLogger = logger;
    
    // Forward external logger to child components
    this.mockFreeTestRunner.setExternalLogger(logger);
    this.reportGenerator.setExternalLogger(logger);
    
    this.emit('log', '[INFO] External logger set for test suite manager');
  }

  /**
   * Get current configuration
   * @returns Current test configuration
   */
  getConfiguration(): TestConfiguration {
    if (!this.configuration) {
      throw new Error('Test suite manager not configured');
    }
    return { ...this.configuration };
  }

  /**
   * Execute In Progress test suite
   * @returns Promise resolving to test results
   */
  async executeTestSuite(): Promise<TestResult> {
    if (!this.configuration) {
      throw new Error('Test suite manager not configured');
    }

    if (this.running) {
      throw new Error('Test suite execution already in progress');
    }

    this.running = true;
    this.cancelled = false;

    const startTime = new Date();
    
    try {
      this.emit('log', `[INFO] Starting test suite execution for: ${this.configuration.testSuiteId}`);
      
      // Log to external logger if available
      if (this.externalLogger) {
        this.externalLogger.log(this.configuration.testSuiteId, 'info', 'Starting test suite execution');
      }
      this.emit("testSuiteStart", {
        testSuiteId: this.configuration.testSuiteId,
        timestamp: startTime,
        configuration: this.configuration
      });

      this.emit("progress", {
        type: 'test-suite-start',
        message: 'Starting test suite execution',
        timestamp: startTime
      });

      // Execute features sequentially or in parallel based on configuration
      const testResult = await this.executeFeaturesWithProgress();
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Log completion to external logger
      if (this.externalLogger) {
        this.externalLogger.log(this.configuration.testSuiteId, 'info', 'Test suite execution In Progress');
      }
      
      this.emit("testSuiteComplete", {
        testSuiteId: this.configuration.testSuiteId,
        results: testResult,
        timestamp: endTime,
        duration
      });

      this.emit("progress", {
        type: 'test-suite-In Progress',
        message: 'Test suite execution In Progress',
        timestamp: endTime
      });

      return testResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('log', `[ERROR] Test suite execution failed: ${errorMessage}`);
      
      const failedResult = createDefaultTestResult(this.configuration.testSuiteId, 'failed');
      failedResult.startTime = startTime;
      failedResult.endTime = new Date();
      failedResult.errorMessage = errorMessage;
      failedResult.errorStack = error instanceof Error ? error.stack : undefined;
      failedResult.failedScenarios = 1;
      failedResult.totalScenarios = 1;
      failedResult.configuration = this.configuration;
      
      return failedResult;
    } finally {
      this.running = false;
    }
  }

  /**
   * Generate reports from test results
   * @param testResults Test results to generate reports from
   * @returns Promise resolving to array of report file paths
   */
  async generateReports(testResults: TestResult): Promise<string[]> {
    if (!this.configuration) {
      throw new Error('Test suite manager not configured');
    }

    this.emit("progress", {
      type: 'report-generation',
      message: 'Starting report generation',
      timestamp: new Date()
    });

    try {
      const reportPaths = await this.reportGenerator.saveReports(testResults);
      
      // Emit events for each generated report
      reportPaths.forEach(filePath => {
        const format = this.extractFormatFromPath(filePath);
        this.emit("reportGenerated", {
          format,
          filePath,
          size: 0, // Size would be calculated in real implementation
          timestamp: new Date()
        });
      });

      this.emit("progress", {
        type: 'report-generation-In Progress',
        message: `Generated ${reportPaths.length} reports`,
        timestamp: new Date()
      });

      return reportPaths;
    } catch (error) {
      this.emit('log', `[ERROR] Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Execute test suite and generate reports in one operation
   * @returns Promise resolving to test results and report paths
   */
  async executeAndGenerateReports(): Promise<{
    testResults: TestResult;
    reportPaths: string[];
  }> {
    const testResults = await this.executeTestSuite();
    
    // Add aggregated log entries to test results metadata
    if (this.externalLogger && this.configuration) {
      const logHistory = await this.externalLogger.getLogHistory(this.configuration.testSuiteId);
      testResults.metadata = {
        ...testResults.metadata,
        logEntries: logHistory
      };
    }
    
    const reportPaths = await this.generateReports(testResults);
    
    return {
      testResults,
      reportPaths
    };
  }

  /**
   * Initialize external log library for test logging
   */
  async initializeLogLibrary(): Promise<void> {
    if (!this.configuration) {
      throw new Error('Test suite manager not configured');
    }

    if (this.configuration.logLevel && !['trace', 'debug', 'info', 'warn', 'error'].includes(this.configuration.logLevel)) {
      throw new Error(`Invalid log level: ${this.configuration.logLevel}`);
    }

    this.emit("progress", {
      type: 'log-library-init',
      message: 'Initializing external log library',
      timestamp: new Date()
    });

    try {
      // Initialize external log library (mock implementation)
      await this.mockLogLibraryInitialization();
      
      this.logLibraryInitialized = true;
      
      this.emit("logLibraryInit", {
        testSuiteId: this.configuration.testSuiteId,
        status: "initialized",
        timestamp: new Date()
      });

      this.emit('log', `[INFO] External log library initialized for suite: ${this.configuration.testSuiteId}`);
    } catch (error) {
      this.emit('log', `[ERROR] Failed to initialize log library: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Cancel test suite execution
   */
  cancel(): void {
    if (!this.running) {
      return;
    }

    this.cancelled = true;
    this.mockFreeTestRunner.cancel();
    
    this.emit('log', '[WARN] Test suite execution cancelled');
    this.emit("progress", {
      type: "cancellation",
      message: 'Test suite execution cancelled',
      timestamp: new Date()
    });
  }

  /**
   * Check if test suite is currently running
   * @returns True if running, false otherwise
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if test suite manager is configured
   * @returns True if configured, false otherwise
   */
  isConfigured(): boolean {
    return this.configuration !== null;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.running) {
      this.cancel();
      
      // Wait for execution to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await this.mockFreeTestRunner.cleanup();
    await this.reportGenerator.cleanup();
    
    if (this.logLibraryInitialized) {
      await this.cleanupLogLibrary();
    }
    
    this.configuration = null;
    this.logLibraryInitialized = false;
    this.removeAllListeners();
    
    this.emit('log', '[INFO] Test suite manager cleanup In Progress');
  }

  /**
   * Execute features with progress tracking
   * @returns Promise resolving to test results
   */
  private async executeFeaturesWithProgress(): Promise<TestResult> {
    if (!this.configuration) {
      throw new Error('Configuration not set');
    }

    const featureFiles = this.configuration.featureFiles;
    
    // Emit feature start events
    featureFiles.forEach(featureFile => {
      this.emit("featureStart", {
        featureFile,
        timestamp: new Date()
      });
    });

    // Execute tests via Mock Free Test Runner
    const testResult = await this.mockFreeTestRunner.executeTests();
    
    // Emit feature In Progress events
    featureFiles.forEach(featureFile => {
      this.emit("featureComplete", {
        featureFile,
        timestamp: new Date()
      });
    });

    // Handle cancellation
    if (this.cancelled) {
      testResult.status = "cancelled";
      testResult.errorMessage = 'Test suite execution was cancelled';
    }

    return testResult;
  }

  /**
   * Setup event forwarding from child components
   */
  private setupEventForwarding(): void {
    // Forward Mock Free Test Runner events
    this.mockFreeTestRunner.on('log', (entry: string) => {
      this.emit('log', entry);
    });

    this.mockFreeTestRunner.on("progress", (event: any) => {
      this.emit("progress", event);
    });

    this.mockFreeTestRunner.on("testStart", (event: any) => {
      this.emit("testStart", event);
    });

    this.mockFreeTestRunner.on("testComplete", (event: any) => {
      this.emit("testComplete", event);
    });

    // Forward Report Generator events
    this.reportGenerator.on('log', (entry) => {
      this.emit('log', entry);
    });

    this.reportGenerator.on("progress", (event) => {
      this.emit("progress", event);
    });

    this.reportGenerator.on("reportStart", (event) => {
      this.emit("reportStart", event);
    });

    this.reportGenerator.on("reportComplete", (event) => {
      this.emit("reportComplete", event);
    });
  }

  /**
   * Mock external log library initialization
   */
  private async mockLogLibraryInitialization(): Promise<void> {
    // Simulate log library initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Setup mock log capture
    this.setupMockLogCapture();
  }

  /**
   * Setup mock log capture
   */
  private setupMockLogCapture(): void {
    // Simulate periodic log events
    const logInterval = setInterval(() => {
      if (!this.logLibraryInitialized || !this.running) {
        clearInterval(logInterval);
        return;
      }

      this.emit('testLog', {
        level: 'info',
        message: 'Mock test log entry',
        timestamp: new Date(),
        testSuiteId: this.configuration?.testSuiteId
      });
    }, 500);
  }


  /**
   * Cleanup external log library
   */
  private async cleanupLogLibrary(): Promise<void> {
    // Simulate log library cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.emit("logLibraryCleanup", {
      testSuiteId: this.configuration?.testSuiteId,
      status: 'cleaned',
      timestamp: new Date()
    });
  }

  /**
   * Extract format from file path
   * @param filePath File path to extract format from
   * @returns Extracted format
   */
  private extractFormatFromPath(filePath: string): string {
    const extension = filePath.split('.').pop();
    return extension || 'unknown';
  }
}