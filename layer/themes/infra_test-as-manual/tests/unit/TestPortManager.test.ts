import { TestPortManager } from '../../children/TestPortManager';
import { EnhancedPortManager, DeployType } from '../../../portal_security/pipe';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

// Mock dependencies
jest.mock('fs');
jest.mock('../../../portal_security/pipe');

describe("TestPortManager", () => {
  let testPortManager: TestPortManager;
  let mockSecurityPortManager: jest.Mocked<EnhancedPortManager>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    // Clear singleton instance
    (TestPortManager as any).instance = undefined;
    
    // Setup mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
      allocations: {},
      lastUpdated: new Date().toISOString()
    }));
    mockFs.writeFileSync = jest.fn();
    mockFs.mkdirSync = jest.fn();

    // Mock EnhancedPortManager
    mockSecurityPortManager = {
      allocatePort: jest.fn().mockResolvedValue(3000),
      releasePort: jest.fn().mockResolvedValue(true),
      isPortAvailable: jest.fn().mockResolvedValue(true),
      getPortForDeploy: jest.fn().mockReturnValue(3000),
      validatePortRange: jest.fn().mockReturnValue(true)
    } as any;

    (EnhancedPortManager.getInstance as jest.Mock).mockReturnValue(mockSecurityPortManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = TestPortManager.getInstance();
      const instance2 = TestPortManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with security port manager', () => {
      testPortManager = TestPortManager.getInstance();
      
      expect(EnhancedPortManager.getInstance).toHaveBeenCalled();
    });

    it('should load test configuration on initialization', () => {
      testPortManager = TestPortManager.getInstance();
      
      expect(mockFs.existsSync).toHaveBeenCalled();
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });
  });

  describe('Port Allocation', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should allocate port for unit tests', async () => {
      const port = await testPortManager.allocateTestPort('unit-test-1', 'unit');
      
      expect(port).toBe(3000);
      expect(mockSecurityPortManager.allocatePort).toHaveBeenCalledWith(
        expect.objectContaining({
          appName: 'unit-test-1',
          deployType: expect.any(String)
        })
      );
    });

    it('should allocate port for integration tests', async () => {
      const port = await testPortManager.allocateTestPort('integration-test-1', "integration");
      
      expect(port).toBe(3000);
      expect(mockSecurityPortManager.allocatePort).toHaveBeenCalled();
    });

    it('should allocate port for e2e tests', async () => {
      const port = await testPortManager.allocateTestPort('e2e-test-1', 'e2e');
      
      expect(port).toBe(3000);
      expect(mockSecurityPortManager.allocatePort).toHaveBeenCalled();
    });

    it('should throw error for invalid test type', async () => {
      await expect(
        testPortManager.allocateTestPort('test-1', 'invalid' as any)
      ).rejects.toThrow('Invalid test type');
    });

    it('should track test port allocations', async () => {
      const port1 = await testPortManager.allocateTestPort('test-1', 'unit');
      const port2 = await testPortManager.allocateTestPort('test-2', 'unit');
      
      const allocations = testPortManager.getTestAllocations();
      expect(allocations.size).toBe(2);
      expect(allocations.has('test-1')).toBe(true);
      expect(allocations.has('test-2')).toBe(true);
    });

    it('should prevent duplicate allocations for same test', async () => {
      const port1 = await testPortManager.allocateTestPort('duplicate-test', 'unit');
      const port2 = await testPortManager.allocateTestPort('duplicate-test', 'unit');
      
      // Should return same port
      expect(port1).toBe(port2);
      expect(mockSecurityPortManager.allocatePort).toHaveBeenCalledTimes(1);
    });
  });

  describe('Port Release', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should release allocated port', async () => {
      const port = await testPortManager.allocateTestPort('release-test', 'unit');
      await testPortManager.releaseTestPort('release-test');
      
      expect(mockSecurityPortManager.releasePort).toHaveBeenCalledWith(port);
    });

    it('should remove from tracking after release', async () => {
      await testPortManager.allocateTestPort('release-test', 'unit');
      await testPortManager.releaseTestPort('release-test');
      
      const allocations = testPortManager.getTestAllocations();
      expect(allocations.has('release-test')).toBe(false);
    });

    it('should handle release of non-existent test gracefully', async () => {
      await expect(
        testPortManager.releaseTestPort('non-existent')
      ).resolves.not.toThrow();
    });

    it('should release all test ports on cleanup', async () => {
      await testPortManager.allocateTestPort('test-1', 'unit');
      await testPortManager.allocateTestPort('test-2', "integration");
      await testPortManager.allocateTestPort('test-3', 'e2e');
      
      await testPortManager.releaseAllTestPorts();
      
      expect(mockSecurityPortManager.releasePort).toHaveBeenCalledTimes(3);
      expect(testPortManager.getTestAllocations().size).toBe(0);
    });
  });

  describe('Test Environment Setup', () => {
    beforeEach(() => {
      delete process.env.TEST_PORT_BASE;
      delete process.env.TEST_PORT_RANGE;
    });

    it('should setup environment variables', () => {
      testPortManager = TestPortManager.getInstance();
      
      expect(process.env.TEST_PORT_BASE).toBeDefined();
      expect(process.env.TEST_PORT_RANGE).toBeDefined();
    });

    it('should not override existing environment variables', () => {
      process.env.TEST_PORT_BASE = '5000';
      process.env.TEST_PORT_RANGE = '5000-5100';
      
      testPortManager = TestPortManager.getInstance();
      
      expect(process.env.TEST_PORT_BASE).toBe('5000');
      expect(process.env.TEST_PORT_RANGE).toBe('5000-5100');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should save test configuration', async () => {
      await testPortManager.allocateTestPort('config-test', 'unit');
      testPortManager.saveTestConfiguration();
      
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockFs.writeFileSync.mock.calls[0][1] as string
      );
      expect(savedData.allocations).toBeDefined();
      expect(savedData.lastUpdated).toBeDefined();
    });

    it('should create config directory if not exists', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      testPortManager = TestPortManager.getInstance();
      
      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });

    it('should handle corrupted config file', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      expect(() => TestPortManager.getInstance()).not.toThrow();
    });
  });

  describe('Port Range Management', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should validate port ranges for test types', () => {
      const unitRange = testPortManager.getPortRangeForTestType('unit');
      const integrationRange = testPortManager.getPortRangeForTestType("integration");
      const e2eRange = testPortManager.getPortRangeForTestType('e2e');
      
      expect(unitRange.start).toBeLessThan(unitRange.end);
      expect(integrationRange.start).toBeLessThan(integrationRange.end);
      expect(e2eRange.start).toBeLessThan(e2eRange.end);
    });

    it('should ensure ranges do not overlap', () => {
      const ranges = [
        testPortManager.getPortRangeForTestType('unit'),
        testPortManager.getPortRangeForTestType("integration"),
        testPortManager.getPortRangeForTestType('e2e')
      ];
      
      for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
          expect(ranges[i].end).toBeLessThan(ranges[j].start);
        }
      }
    });
  });

  describe('Concurrent Access', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should handle concurrent allocation requests', async () => {
      const allocations = await Promise.all([
        testPortManager.allocateTestPort('concurrent-1', 'unit'),
        testPortManager.allocateTestPort('concurrent-2', 'unit'),
        testPortManager.allocateTestPort('concurrent-3', 'unit')
      ]);
      
      // All ports should be unique
      expect(new Set(allocations).size).toBe(3);
    });

    it('should handle concurrent release requests', async () => {
      // Allocate ports
      await Promise.all([
        testPortManager.allocateTestPort('concurrent-1', 'unit'),
        testPortManager.allocateTestPort('concurrent-2', 'unit'),
        testPortManager.allocateTestPort('concurrent-3', 'unit')
      ]);
      
      // Release concurrently
      await Promise.all([
        testPortManager.releaseTestPort('concurrent-1'),
        testPortManager.releaseTestPort('concurrent-2'),
        testPortManager.releaseTestPort('concurrent-3')
      ]);
      
      expect(testPortManager.getTestAllocations().size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should handle security manager allocation failure', async () => {
      mockSecurityPortManager.allocatePort.mockRejectedValue(
        new Error('No ports available')
      );
      
      await expect(
        testPortManager.allocateTestPort('fail-test', 'unit')
      ).rejects.toThrow('No ports available');
    });

    it('should handle security manager release failure', async () => {
      await testPortManager.allocateTestPort('fail-test', 'unit');
      
      mockSecurityPortManager.releasePort.mockRejectedValue(
        new Error('Release failed')
      );
      
      await expect(
        testPortManager.releaseTestPort('fail-test')
      ).rejects.toThrow('Release failed');
    });

    it('should handle file system errors gracefully', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      
      expect(() => testPortManager.saveTestConfiguration()).not.toThrow();
    });
  });

  describe('Test Lifecycle Integration', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should support beforeAll hook pattern', async () => {
      const port = await testPortManager.allocateTestPort('lifecycle-test', 'unit');
      
      expect(port).toBeDefined();
      expect(testPortManager.getTestAllocations().has('lifecycle-test')).toBe(true);
    });

    it('should support afterAll hook pattern', async () => {
      await testPortManager.allocateTestPort('lifecycle-test', 'unit');
      await testPortManager.releaseTestPort('lifecycle-test');
      
      expect(testPortManager.getTestAllocations().has('lifecycle-test')).toBe(false);
    });

    it('should auto-cleanup on process exit', () => {
      const exitHandler = jest.fn();
      process.on('exit', exitHandler);
      
      testPortManager = TestPortManager.getInstance();
      
      // Simulate process exit
      process.emit('exit', 0);
      
      // Should trigger cleanup
      expect(exitHandler).toHaveBeenCalled();
    });
  });

  describe('Monitoring and Metrics', () => {
    beforeEach(() => {
      testPortManager = TestPortManager.getInstance();
    });

    it('should track allocation statistics', async () => {
      await testPortManager.allocateTestPort('stats-1', 'unit');
      await testPortManager.allocateTestPort('stats-2', "integration");
      await testPortManager.allocateTestPort('stats-3', 'e2e');
      
      const stats = testPortManager.getStatistics();
      
      expect(stats.totalAllocations).toBe(3);
      expect(stats.byType.unit).toBe(1);
      expect(stats.byType.integration).toBe(1);
      expect(stats.byType.e2e).toBe(1);
    });

    it('should track port usage duration', async () => {
      const startTime = Date.now();
      
      await testPortManager.allocateTestPort('duration-test', 'unit');
      
      // Simulate test duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await testPortManager.releaseTestPort('duration-test');
      
      const stats = testPortManager.getStatistics();
      expect(stats.averageDuration).toBeGreaterThanOrEqual(100);
    });

    it('should report port availability', async () => {
      const availability = await testPortManager.getPortAvailability();
      
      expect(availability.unit).toBeDefined();
      expect(availability.integration).toBeDefined();
      expect(availability.e2e).toBeDefined();
      expect(availability.total).toBeDefined();
    });
  });
});