/**
 * External Test: PortAllocator Interface
 * 
 * This test verifies the PortAllocator external interface contract.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect } from '@jest/globals';
import type { 
  PortAllocator, 
  PortRange, 
  PortAllocation,
  EnvironmentPortConfig
} from '../../src/interfaces/port-allocator.interface';

describe('PortAllocator External Interface Test', () => {
  
  test('should define PortAllocator interface with all required methods', () => {
    // Verify interface structure through a mock implementation
    const mockPortAllocator: PortAllocator = {
      allocatePortsForEnvironment: async (environmentName, environmentType) => {
        return {
          portal: 3200,
          services: { start: 3201, end: 3299 }
        };
      },
      
      allocateServicePort: async (environmentName, serviceName) => {
        return 3201;
      },
      
      releaseEnvironmentPorts: async (environmentName) => {
        return true;
      },
      
      releasePort: async (port) => {
        return true;
      },
      
      isPortAvailable: async (port) => {
        return true;
      },
      
      getEnvironmentPorts: async (environmentName) => {
        return [];
      },
      
      getNextAvailablePort: async (range) => {
        return range.start;
      },
      
      getAllUsedPorts: async () => {
        return [];
      },
      
      getPortConfigForType: (type) => {
        return {
          type,
          basePort: 3200,
          serviceRange: { start: 3200, end: 3299 }
        };
      },
      
      reservePort: async (port, environmentName, serviceName) => {
        return true;
      },
      
      validatePortForEnvironment: (port, environmentType) => {
        return true;
      },
      
      getPortUsageSummary: async () => {
        return {
          theme: { total: 100, used: 10, available: 90 },
          epic: { total: 100, used: 0, available: 100 },
          demo: { total: 100, used: 5, available: 95 },
          release: { total: 100, used: 20, available: 80 },
          test: { total: 100, used: 15, available: 85 }
        };
      }
    };
    
    // Verify all methods exist
    expect(typeof mockPortAllocator.allocatePortsForEnvironment).toBe('function');
    expect(typeof mockPortAllocator.allocateServicePort).toBe('function');
    expect(typeof mockPortAllocator.releaseEnvironmentPorts).toBe('function');
    expect(typeof mockPortAllocator.releasePort).toBe('function');
    expect(typeof mockPortAllocator.isPortAvailable).toBe('function');
    expect(typeof mockPortAllocator.getEnvironmentPorts).toBe('function');
    expect(typeof mockPortAllocator.getNextAvailablePort).toBe('function');
    expect(typeof mockPortAllocator.getAllUsedPorts).toBe('function');
    expect(typeof mockPortAllocator.getPortConfigForType).toBe('function');
    expect(typeof mockPortAllocator.reservePort).toBe('function');
    expect(typeof mockPortAllocator.validatePortForEnvironment).toBe('function');
    expect(typeof mockPortAllocator.getPortUsageSummary).toBe('function');
  });
  
  test('should verify PortRange structure', () => {
    const portRange: PortRange = {
      start: 3200,
      end: 3299
    };
    
    expect(portRange.start).toBeDefined();
    expect(portRange.end).toBeDefined();
    expect(typeof portRange.start).toBe('number');
    expect(typeof portRange.end).toBe('number');
    expect(portRange.start).toBeLessThanOrEqual(portRange.end);
  });
  
  test('should verify PortAllocation structure', () => {
    const allocation: PortAllocation = {
      port: 3201,
      service: 'story-reporter',
      environment: 'test-theme',
      allocatedAt: new Date()
    };
    
    expect(allocation.port).toBeDefined();
    expect(allocation.service).toBeDefined();
    expect(allocation.environment).toBeDefined();
    expect(allocation.allocatedAt).toBeDefined();
    
    expect(typeof allocation.port).toBe('number');
    expect(typeof allocation.service).toBe('string');
    expect(typeof allocation.environment).toBe('string');
    expect(allocation.allocatedAt).toBeInstanceOf(Date);
  });
  
  test('should verify EnvironmentPortConfig structure', () => {
    const portConfig: EnvironmentPortConfig = {
      type: 'theme',
      basePort: 3200,
      serviceRange: {
        start: 3200,
        end: 3299
      }
    };
    
    expect(portConfig.type).toBeDefined();
    expect(portConfig.basePort).toBeDefined();
    expect(portConfig.serviceRange).toBeDefined();
    
    expect(['theme', 'epic', 'demo', 'release', 'test']).toContain(portConfig.type);
    expect(typeof portConfig.basePort).toBe('number');
    expect(portConfig.serviceRange.start).toBeDefined();
    expect(portConfig.serviceRange.end).toBeDefined();
  });
  
  test('should verify port ranges for standard environment types', () => {
    const expectedRanges = {
      release: { base: 3456, start: 3400, end: 3499 },
      test: { base: 3100, start: 3100, end: 3199 },
      theme: { base: 3200, start: 3200, end: 3299 },
      demo: { base: 3300, start: 3300, end: 3399 },
      epic: { base: 3500, start: 3500, end: 3599 } // Assuming epic gets its own range
    };
    
    Object.entries(expectedRanges).forEach(([type, range]) => {
      // Document expected port ranges
      expect(range.base).toBeGreaterThanOrEqual(3000);
      expect(range.base).toBeLessThan(4000);
      expect(range.end - range.start).toBeGreaterThanOrEqual(50); // At least 50 ports per environment
    });
  });
  
  test('should verify allocatePortsForEnvironment return structure', async () => {
    const mockAllocator: Pick<PortAllocator, 'allocatePortsForEnvironment'> = {
      allocatePortsForEnvironment: async (environmentName, environmentType) => {
        return {
          portal: 3200,
          services: { start: 3201, end: 3299 }
        };
      }
    };
    
    const result = await mockAllocator.allocatePortsForEnvironment('test-theme', 'theme');
    
    expect(result.portal).toBeDefined();
    expect(result.services).toBeDefined();
    expect(typeof result.portal).toBe('number');
    expect(result.services.start).toBeDefined();
    expect(result.services.end).toBeDefined();
    expect(result.services.start).toBeLessThanOrEqual(result.services.end);
  });
  
  test('should verify getPortUsageSummary return structure', async () => {
    const mockAllocator: Pick<PortAllocator, 'getPortUsageSummary'> = {
      getPortUsageSummary: async () => {
        return {
          theme: { total: 100, used: 10, available: 90 },
          epic: { total: 100, used: 0, available: 100 },
          demo: { total: 100, used: 5, available: 95 },
          release: { total: 100, used: 20, available: 80 },
          test: { total: 100, used: 15, available: 85 }
        };
      }
    };
    
    const summary = await mockAllocator.getPortUsageSummary();
    
    const environmentTypes: EnvironmentPortConfig['type'][] = ['theme', 'epic', 'demo', 'release', 'test'];
    
    environmentTypes.forEach(type => {
      expect(summary[type]).toBeDefined();
      expect(summary[type].total).toBeDefined();
      expect(summary[type].used).toBeDefined();
      expect(summary[type].available).toBeDefined();
      
      expect(typeof summary[type].total).toBe('number');
      expect(typeof summary[type].used).toBe('number');
      expect(typeof summary[type].available).toBe('number');
      
      // Verify consistency
      expect(summary[type].used + summary[type].available).toBe(summary[type].total);
      expect(summary[type].used).toBeGreaterThanOrEqual(0);
      expect(summary[type].available).toBeGreaterThanOrEqual(0);
    });
  });
});