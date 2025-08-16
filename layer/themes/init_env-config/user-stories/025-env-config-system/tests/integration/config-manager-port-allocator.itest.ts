/**
 * Integration Test: ConfigManager integrates with PortAllocator
 * 
 * This test verifies that ConfigManager correctly uses PortAllocator
 * for automatic port assignment when creating environments.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { ConfigManager } from '../../src/interfaces/config-manager.interface';
import type { PortAllocator } from '../../src/interfaces/port-allocator.interface';
import { ConfigManager as ConfigManagerImpl } from '../../src/components/config-manager';
import { PortAllocator as PortAllocatorImpl } from '../../src/components/port-allocator';
import { PortRegistry } from '../../src/components/port-registry';
import { FileGenerator } from '../../src/components/file-generator';

describe('ConfigManager and PortAllocator Integration Test', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let portAllocator: PortAllocator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'config-port-itest-'));
    
    // Create real implementations
    const registryPath = path.join(tempDir, 'port-registry.json');
    const portRegistry = new PortRegistry(registryPath);
    await portRegistry.initialize();
    
    portAllocator = new PortAllocatorImpl(portRegistry);
    const fileGenerator = new FileGenerator();
    configManager = new ConfigManagerImpl(portAllocator as any, fileGenerator, tempDir);
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  test('should allocate ports automatically when creating new environment', async () => {
    // Given: ConfigManager and PortAllocator instances
    const environmentName = 'test-theme-123';
    const environmentType = 'theme' as const;
    
    // When: Creating a new environment
    const config = await configManager.createEnvironment({
      name: environmentName,
      type: environmentType
    });
    
    // Then: Ports should be allocated from the correct range
    expect(config.port.base).toBeGreaterThanOrEqual(3200);
    expect(config.port.base).toBeLessThanOrEqual(3299);
    expect(config.port.range).toEqual([config.port.base + 1, 3299]);
    
    // And: PortAllocator should have the allocation recorded
    const allocations = await portAllocator.getEnvironmentPorts(environmentName);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].port).toBe(config.port.base);
    expect(allocations[0].service).toBe('portal');
    expect(allocations[0].environment).toBe(environmentName);
  });
  
  test('should allocate different ports for multiple environments', async () => {
    // Given: Two environments to create
    const env1 = { name: 'theme-1', type: 'theme' as const };
    const env2 = { name: 'theme-2', type: 'theme' as const };
    
    // When: Creating both environments
    const config1 = await configManager.createEnvironment({
      name: env1.name,
      type: env1.type,
    });
    
    const config2 = await configManager.createEnvironment({
      name: env2.name,
      type: env2.type,
    });
    
    // Then: Different ports should be allocated
    expect(config1.port.base).not.toBe(config2.port.base);
    
    // And: Both should be in the theme port range
    expect(config1.port.base).toBeGreaterThanOrEqual(3200);
    expect(config1.port.base).toBeLessThanOrEqual(3299);
    expect(config2.port.base).toBeGreaterThanOrEqual(3200);
    expect(config2.port.base).toBeLessThanOrEqual(3299);
  });
  
  test('should handle port allocation for services', async () => {
    // Given: An existing environment
    const environmentName = 'test-env';
    const config = await configManager.createEnvironment({
      name: environmentName,
      type: 'theme',
    });
    
    // When: Adding a service
    const serviceName = 'story-reporter';
    await configManager.addService(environmentName, serviceName);
    
    // Then: Service should have a port allocated
    const updatedConfig = await configManager.getEnvironment(environmentName);
    const service = updatedConfig?.services.find(s => s.name === serviceName);
    expect(service).toBeDefined();
    expect(service!.port).toBeGreaterThan(config.port.base);
    expect(service!.port).toBeLessThanOrEqual(config.port.range[1]);
    
    // And: PortAllocator should have the service allocation
    const allocations = await portAllocator.getEnvironmentPorts(environmentName);
    const serviceAllocation = allocations.find(a => a.service === serviceName);
    expect(serviceAllocation).toBeDefined();
    expect(serviceAllocation!.port).toBe(service!.port);
  });
  
  test('should release ports when deleting environment', async () => {
    // Given: An environment with services
    const environmentName = 'temp-env';
    await configManager.createEnvironment({
      name: environmentName,
      type: 'demo',
    });
    
    await configManager.addService(environmentName, 'service-1');
    
    await configManager.addService(environmentName, 'service-2');
    
    // When: Deleting the environment
    await configManager.deleteEnvironment(environmentName);
    
    // Then: All ports should be released
    const allocations = await portAllocator.getEnvironmentPorts(environmentName);
    expect(allocations).toHaveLength(0);
    
    // And: Ports should be available for reuse  
    const basePort = 3300; // Demo base port
    const isAvailable = await portAllocator.isPortAvailable(basePort);
    expect(isAvailable).toBe(true);
  });
  
  test('should validate port ranges for different environment types', async () => {
    // Test each environment type gets correct port range
    const environmentTypes = [
      { type: 'release' as const, expectedBase: 3456, rangeStart: 3400, rangeEnd: 3499 },
      { type: 'test' as const, expectedBase: 3100, rangeStart: 3100, rangeEnd: 3199 },
      { type: 'theme' as const, expectedBase: 3200, rangeStart: 3200, rangeEnd: 3299 },
      { type: 'demo' as const, expectedBase: 3300, rangeStart: 3300, rangeEnd: 3399 }
    ];
    
    for (const envType of environmentTypes) {
      // When: Creating environment of specific type
      const config = await configManager.createEnvironment({
        name: `${envType.type}-test`,
        type: envType.type,
      });
      
      // Then: Port should be in correct range
      if (envType.type === 'release') {
        // Release has Working on port
        expect(config.port.base).toBe(envType.expectedBase);
      } else {
        expect(config.port.base).toBeGreaterThanOrEqual(envType.rangeStart);
        expect(config.port.base).toBeLessThanOrEqual(envType.rangeEnd);
      }
    }
  });
});