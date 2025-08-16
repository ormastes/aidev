import { MockFreeTestRunner } from '../../src/external/mock-free-test-runner';
import { TestConfiguration } from '../../src/domain/test-configuration';

describe('MockFreeTestRunner Coverage Completion Tests', () => {
  let mockFreeTestRunner: MockFreeTestRunner;
  let testConfig: TestConfiguration;

  beforeEach(() => {
    mockFreeTestRunner = new MockFreeTestRunner();
    testConfig = {
      testSuiteId: 'coverage-test-suite',
      featureFiles: ['test.feature'],
      stepDefinitions: ['steps.js'],
      outputDirectory: './coverage-test-results',
      outputFormats: ['json']
    };
  });

  afterEach(async () => {
    await mockFreeTestRunner.cleanup();
  });

  describe('Process State Management Coverage', () => {
    it('should cover initial state before configuration', () => {
      // Cover line checking state before configuration
      expect(mockFreeTestRunner.isRunning()).toBe(false);
      expect(mockFreeTestRunner.isConfigured()).toBe(false);
    });

    it('should cover configured state without execution', () => {
      mockFreeTestRunner.configure(testConfig);
      
      // Cover configuration state
      expect(mockFreeTestRunner.isConfigured()).toBe(true);
      expect(mockFreeTestRunner.isRunning()).toBe(false);
      
      // Cover getConfiguration method
      const config = mockFreeTestRunner.getConfiguration();
      expect(config.testSuiteId).toBe('coverage-test-suite');
    });

    it('should cover error when getting configuration before setup', () => {
      // Cover error path in getConfiguration when not configured
      expect(() => {
        mockFreeTestRunner.getConfiguration();
      }).toThrow('Test runner not configured');
    });

    it('should cover cancel when not running', () => {
      mockFreeTestRunner.configure(testConfig);
      
      // Cover cancel() when not running - should be safe no-op
      expect(() => {
        mockFreeTestRunner.cancel();
      }).not.toThrow();
      
      expect(mockFreeTestRunner.isRunning()).toBe(false);
    });
  });

  describe('Configuration Edge Cases Coverage', () => {
    it('should handle full configuration with all optional fields', () => {
      const fullConfig: TestConfiguration = {
        testSuiteId: 'full-config-test',
        featureFiles: ['feature1.feature', 'feature2.feature'],
        stepDefinitions: ['steps1.js', 'steps2.js'],
        outputDirectory: './full-test-results',
        outputFormats: ['json', 'html', 'xml'],
        logLevel: 'debug',
        timeout: 60000,
        parallel: { enabled: true, workers: 2 },
        tags: ['@smoke'],
        excludeTags: ['@slow'],
        environment: {
          'NODE_ENV': 'test',
          'LOG_LEVEL': 'debug'
        }
      };

      expect(() => mockFreeTestRunner.configure(fullConfig)).not.toThrow();
      expect(mockFreeTestRunner.isConfigured()).toBe(true);

      const storedConfig = mockFreeTestRunner.getConfiguration();
      expect(storedConfig.testSuiteId).toBe('full-config-test');
      expect(storedConfig.parallel).toEqual({ enabled: true, workers: 2 });
      expect(storedConfig.tags).toEqual(['@smoke']);
      expect(storedConfig.excludeTags).toEqual(['@slow']);
      expect(storedConfig.environment).toEqual({
        'NODE_ENV': 'test',
        'LOG_LEVEL': 'debug'
      });
    });

    it('should handle configuration with minimal required fields only', () => {
      const minimalConfig: TestConfiguration = {
        testSuiteId: 'minimal-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js'],
        outputFormats: ['json']
      };

      expect(() => mockFreeTestRunner.configure(minimalConfig)).not.toThrow();
      expect(mockFreeTestRunner.isConfigured()).toBe(true);

      const storedConfig = mockFreeTestRunner.getConfiguration();
      expect(storedConfig.testSuiteId).toBe('minimal-test');
      expect(storedConfig.outputDirectory).toBe('./test-results'); // Default value
      expect(storedConfig.logLevel).toBe('info'); // Default value
      expect(storedConfig.timeout).toBe(30000); // Default value
    });

    it('should handle parallel configuration with enabled false', () => {
      const parallelConfig: TestConfiguration = {
        testSuiteId: 'parallel-disabled-test',
        featureFiles: ['test.feature'],
        stepDefinitions: ['steps.js'],
        outputFormats: ['json'],
        parallel: { enabled: false, workers: 1 }
      };

      expect(() => mockFreeTestRunner.configure(parallelConfig)).not.toThrow();
      
      const storedConfig = mockFreeTestRunner.getConfiguration();
      expect(storedConfig.parallel?.enabled).toBe(false);
      expect(storedConfig.parallel?.workers).toBe(1);
    });
  });

  describe('Event Emission Coverage', () => {
    it('should emit configuration log event', () => {
      const logSpy = jest.fn();
      mockFreeTestRunner.on('log', logSpy);

      mockFreeTestRunner.configure(testConfig);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Mock Free Test Oriented Development Test Runner configured')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('coverage-test-suite')
      );
    });

    it('should emit cleanup log event after listeners are removed', async () => {
      // Since cleanup removes all listeners before emitting the final log,
      // we need to verify the cleanup behavior differently
      mockFreeTestRunner.configure(testConfig);
      
      // Spy on the emit method itself to capture all emissions
      const emitSpy = jest.spyOn(mockFreeTestRunner, 'emit');
      
      await mockFreeTestRunner.cleanup();

      // Verify that emit was called with the cleanup message
      expect(emitSpy).toHaveBeenCalledWith('log', '[INFO] Test runner cleanup In Progress');
      
      emitSpy.mockRestore();
    });

    it('should remove all listeners during cleanup', async () => {
      const logSpy = jest.fn();
      const progressSpy = jest.fn();
      
      mockFreeTestRunner.on('log', logSpy);
      mockFreeTestRunner.on('progress', progressSpy);
      
      mockFreeTestRunner.configure(testConfig);
      
      // Verify listeners are registered
      expect(mockFreeTestRunner.listenerCount('log')).toBeGreaterThan(0);
      expect(mockFreeTestRunner.listenerCount('progress')).toBeGreaterThan(0);
      
      await mockFreeTestRunner.cleanup();
      
      // Verify listeners are removed
      expect(mockFreeTestRunner.listenerCount('log')).toBe(0);
      expect(mockFreeTestRunner.listenerCount('progress')).toBe(0);
    });
  });

  describe('State Reset Coverage', () => {
    it('should reset configuration to null during cleanup', async () => {
      mockFreeTestRunner.configure(testConfig);
      expect(mockFreeTestRunner.isConfigured()).toBe(true);
      
      await mockFreeTestRunner.cleanup();
      
      // Configuration should be reset to null
      expect(mockFreeTestRunner.isConfigured()).toBe(false);
      expect(() => {
        mockFreeTestRunner.getConfiguration();
      }).toThrow('Test runner not configured');
    });

    it('should handle cleanup when not configured', async () => {
      // Should be safe to cleanup even when not configured
      expect(() => mockFreeTestRunner.cleanup()).not.toThrow();
      
      await mockFreeTestRunner.cleanup();
      
      expect(mockFreeTestRunner.isConfigured()).toBe(false);
      expect(mockFreeTestRunner.isRunning()).toBe(false);
    });
  });
});