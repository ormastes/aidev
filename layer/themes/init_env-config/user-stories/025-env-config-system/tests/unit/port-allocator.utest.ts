/**
 * Unit Test: PortAllocator
 * 
 * Tests the PortAllocator component that manages port allocation
 * for different environment types and services.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { 
  PortAllocator as IPortAllocator,
  PortRange,
  EnvironmentPortConfig 
} from '../../src/interfaces/port-allocator.interface';
import { PortAllocator } from '../../src/components/port-allocator';

// Mock PortRegistry for unit testing
class MockPortRegistry {
  private allocations: Map<string, Map<string, number>> = new Map();

  async getUsedPorts(): Promise<Array<{port: number, env: string, service: string}>> {
    const ports: Array<{port: number, env: string, service: string}> = [];
    this.allocations.forEach((services, env) => {
      services.forEach((port, service) => {
        ports.push({ port, env, service });
      });
    });
    return ports;
  }

  async registerAllocation(environment: string, service: string, port: number): Promise<void> {
    if (!this.allocations.has(environment)) {
      this.allocations.set(environment, new Map());
    }
    this.allocations.get(environment)!.set(service, port);
  }

  async removeEnvironmentAllocations(environment: string): Promise<void> {
    this.allocations.delete(environment);
  }

  async getEnvironmentPorts(environment: string): Promise<Array<{port: number, service: string}>> {
    const envAllocations = this.allocations.get(environment);
    if (!envAllocations) return [];
    
    const ports: Array<{port: number, service: string}> = [];
    envAllocations.forEach((port, service) => {
      ports.push({ port, service });
    });
    return ports;
  }
}

describe('PortAllocator Unit Test', () => {
  let portRegistry: MockPortRegistry;
  let portAllocator: PortAllocator;

  beforeEach(() => {
    portRegistry = new MockPortRegistry();
    portAllocator = new PortAllocator(portRegistry as any);
  });

  test('should get correct port configuration for environment types', () => {
    // Test each environment type
    const types: EnvironmentPortConfig['type'][] = ['release', 'test', 'theme', 'demo', 'epic'];
    
    const expectedConfigs = {
      release: { base: 3456, start: 3400, end: 3499 },
      test: { base: 3100, start: 3100, end: 3199 },
      theme: { base: 3200, start: 3200, end: 3299 },
      demo: { base: 3300, start: 3300, end: 3399 },
      epic: { base: 3500, start: 3500, end: 3599 }
    };

    types.forEach(type => {
      // When: Getting port config for type
      const config = portAllocator.getPortConfigForType(type);
      
      // Then: Should match expected configuration
      expect(config.type).toBe(type);
      expect(config.basePort).toBe(expectedConfigs[type].base);
      expect(config.serviceRange.start).toBe(expectedConfigs[type].start);
      expect(config.serviceRange.end).toBe(expectedConfigs[type].end);
    });
  });

  test('should validate port is within correct range for environment type', () => {
    // Test valid ports for each type
    expect(portAllocator.validatePortForEnvironment(3456, 'release')).toBe(true);
    expect(portAllocator.validatePortForEnvironment(3150, 'test')).toBe(true);
    expect(portAllocator.validatePortForEnvironment(3250, 'theme')).toBe(true);
    expect(portAllocator.validatePortForEnvironment(3350, 'demo')).toBe(true);
    
    // Test invalid ports
    expect(portAllocator.validatePortForEnvironment(3000, 'theme')).toBe(false);
    expect(portAllocator.validatePortForEnvironment(3300, 'theme')).toBe(false); // Demo range
    expect(portAllocator.validatePortForEnvironment(3600, 'demo')).toBe(false);
  });

  test('should allocate base port for new environment', async () => {
    // When: Allocating ports for new theme
    const allocation = await portAllocator.allocatePortsForEnvironment('my-theme', 'theme');
    
    // Then: Should allocate base port in correct range
    expect(allocation.portal).toBe(3200); // First available in theme range
    expect(allocation.services.start).toBe(3201);
    expect(allocation.services.end).toBe(3299);
    
    // And: Should register in port registry
    const registeredPorts = await portRegistry.getEnvironmentPorts('my-theme');
    expect(registeredPorts).toContainEqual({ port: 3200, service: 'portal' });
  });

  test('should allocate next available port when base is taken', async () => {
    // Given: First theme already allocated
    await portRegistry.registerAllocation('theme-1', 'portal', 3200);
    
    // When: Allocating ports for second theme
    const allocation = await portAllocator.allocatePortsForEnvironment('theme-2', 'theme');
    
    // Then: Should allocate next available port
    expect(allocation.portal).toBe(3201);
    expect(allocation.services.start).toBe(3202);
    expect(allocation.services.end).toBe(3299);
  });

  test('should check if port is available', async () => {
    // Given: Some ports allocated
    await portRegistry.registerAllocation('app-1', 'portal', 3200);
    await portRegistry.registerAllocation('app-1', 'api', 3201);
    
    // When/Then: Checking availability
    expect(await portAllocator.isPortAvailable(3200)).toBe(false);
    expect(await portAllocator.isPortAvailable(3201)).toBe(false);
    expect(await portAllocator.isPortAvailable(3202)).toBe(true);
    expect(await portAllocator.isPortAvailable(3199)).toBe(true);
  });

  test('should find next available port in range', async () => {
    // Given: Some ports in use
    await portRegistry.registerAllocation('app-1', 'portal', 3200);
    await portRegistry.registerAllocation('app-2', 'portal', 3201);
    await portRegistry.registerAllocation('app-3', 'portal', 3202);
    
    // When: Finding next available in theme range
    const range: PortRange = { start: 3200, end: 3210 };
    const nextPort = await portAllocator.getNextAvailablePort(range);
    
    // Then: Should find first available
    expect(nextPort).toBe(3203);
  });

  test('should return null when no ports available in range', async () => {
    // Given: All ports in small range are taken
    for (let i = 3200; i <= 3205; i++) {
      await portRegistry.registerAllocation(`app-${i}`, 'portal', i);
    }
    
    // When: Finding next available in full range
    const range: PortRange = { start: 3200, end: 3205 };
    const nextPort = await portAllocator.getNextAvailablePort(range);
    
    // Then: Should return null
    expect(nextPort).toBeNull();
  });

  test('should allocate service port within environment range', async () => {
    // Given: Environment with base allocation
    await portAllocator.allocatePortsForEnvironment('my-app', 'theme');
    
    // When: Allocating service ports
    const apiPort = await portAllocator.allocateServicePort('my-app', 'api-gateway');
    const authPort = await portAllocator.allocateServicePort('my-app', 'auth-service');
    
    // Then: Should allocate sequential ports
    expect(apiPort).toBe(3201);
    expect(authPort).toBe(3202);
    
    // And: Should be registered
    const envPorts = await portRegistry.getEnvironmentPorts('my-app');
    expect(envPorts).toHaveLength(3); // portal + 2 services
  });

  test('should release all environment ports', async () => {
    // Given: Environment with multiple allocations
    await portAllocator.allocatePortsForEnvironment('temp-app', 'demo');
    await portAllocator.allocateServicePort('temp-app', 'service-1');
    await portAllocator.allocateServicePort('temp-app', 'service-2');
    
    // When: Releasing environment ports
    const released = await portAllocator.releaseEnvironmentPorts('temp-app');
    
    // Then: Should be In Progress
    expect(released).toBe(true);
    
    // And: Ports should be available again
    expect(await portAllocator.isPortAvailable(3300)).toBe(true);
    expect(await portAllocator.isPortAvailable(3301)).toBe(true);
    expect(await portAllocator.isPortAvailable(3302)).toBe(true);
  });

  test('should reserve specific port manually', async () => {
    // When: Reserving a specific port
    const reserved = await portAllocator.reservePort(3250, 'custom-app', 'custom-service');
    
    // Then: Should be In Progress
    expect(reserved).toBe(true);
    
    // And: Port should not be available
    expect(await portAllocator.isPortAvailable(3250)).toBe(false);
  });

  test('should get port usage summary', async () => {
    // Given: Various allocations across types
    await portAllocator.allocatePortsForEnvironment('theme-1', 'theme');
    await portAllocator.allocatePortsForEnvironment('theme-2', 'theme');
    await portAllocator.allocateServicePort('theme-1', 'api');
    
    await portAllocator.allocatePortsForEnvironment('test-1', 'test');
    
    await portAllocator.allocatePortsForEnvironment('demo-1', 'demo');
    await portAllocator.allocateServicePort('demo-1', 'service');
    
    // When: Getting usage summary
    const summary = await portAllocator.getPortUsageSummary();
    
    // Then: Should show correct counts
    expect(summary.theme.used).toBe(3); // 2 portals + 1 service
    expect(summary.theme.total).toBe(100); // 3200-3299
    expect(summary.theme.available).toBe(97);
    
    expect(summary.test.used).toBe(1);
    expect(summary.demo.used).toBe(2);
    expect(summary.release.used).toBe(0);
  });

  test('should handle release environment with Working on port', async () => {
    // When: Allocating release environment
    const allocation = await portAllocator.allocatePortsForEnvironment('prod-release', 'release');
    
    // Then: Should always use Working on port 3456
    expect(allocation.portal).toBe(3456);
    
    // When: Trying to allocate another release
    await expect(
      portAllocator.allocatePortsForEnvironment('another-release', 'release')
    ).rejects.toThrow('Release port 3456 is already allocated');
  });
});