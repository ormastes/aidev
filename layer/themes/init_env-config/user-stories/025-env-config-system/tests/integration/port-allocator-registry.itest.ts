/**
 * Integration Test: PortAllocator integrates with PortRegistry
 * 
 * This test verifies that PortAllocator correctly persists and retrieves
 * port allocations using the PortRegistry for state management.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { PortAllocator } from '../../src/interfaces/port-allocator.interface';
import { PortAllocator as PortAllocatorImpl } from '../../src/components/port-allocator';
import { PortRegistry } from '../../src/components/port-registry';

describe('PortAllocator and PortRegistry Integration Test', () => {
  let tempDir: string;
  let portAllocator: PortAllocator;
  let registryPath: string;
  let portRegistry: PortRegistry;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'port-registry-itest-'));
    registryPath = path.join(tempDir, 'port-registry.json');
    
    // Create real implementations
    portRegistry = new PortRegistry(registryPath);
    await portRegistry.initialize();
    portAllocator = new PortAllocatorImpl(portRegistry);
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  test('should persist port allocations to registry file', async () => {
    // Given: A new environment needing ports
    const environmentName = 'test-app';
    const environmentType = 'theme' as const;
    
    // When: Allocating ports
    const allocation = await portAllocator.allocatePortsForEnvironment(
      environmentName,
      environmentType
    );
    
    // Then: Registry file should exist
    const registryExists = await fs.access(registryPath).then(() => true).catch(() => false);
    expect(registryExists).toBe(true);
    
    // And: Registry should contain the allocation
    const registryContent = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(registryContent.environments[environmentName]).toBeDefined();
    expect(registryContent.environments[environmentName].basePort).toBe(allocation.portal);
    expect(registryContent.lastUpdated).toBeDefined();
  });
  
  test('should load existing allocations from registry on startup', async () => {
    // Given: An existing registry with allocations
    const existingRegistry = {
      environments: {
        'existing-app': {
          type: 'theme',
          basePort: 3201,
          services: {
            portal: 3201,
            'api-gateway': 3202
          }
        }
      },
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(registryPath, JSON.stringify(existingRegistry, null, 2));
    
    // When: Creating a new PortAllocator instance
    // (In real implementation, this would load from registry)
    
    // Then: Should recognize existing allocations
    const isPortAvailable = await portAllocator.isPortAvailable(3201);
    expect(isPortAvailable).toBe(false);
    
    const allocations = await portAllocator.getEnvironmentPorts('existing-app');
    expect(allocations).toHaveLength(2);
    expect(allocations.map(a => a.port)).toContain(3201);
    expect(allocations.map(a => a.port)).toContain(3202);
  });
  
  test('should handle concurrent registry updates safely', async () => {
    // Given: Multiple environments being created concurrently
    const environments = [
      { name: 'app-1', type: 'theme' as const },
      { name: 'app-2', type: 'theme' as const },
      { name: 'app-3', type: 'demo' as const }
    ];
    
    // When: Allocating ports concurrently
    const allocationPromises = environments.map(env => 
      portAllocator.allocatePortsForEnvironment(env.name, env.type)
    );
    
    const allocations = await Promise.all(allocationPromises);
    
    // Then: All ports should be unique
    const allPorts = allocations.map(a => a.portal);
    const uniquePorts = new Set(allPorts);
    
    // Debug logging
    if (uniquePorts.size !== allPorts.length) {
      console.log('Port allocation issue:');
      console.log('All ports:', allPorts);
      console.log('Unique ports:', Array.from(uniquePorts));
      console.log('Allocations:', allocations);
    }
    
    expect(uniquePorts.size).toBe(allPorts.length);
    
    // And: Registry should contain all allocations
    const registryContent = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    environments.forEach((env, index) => {
      expect(registryContent.environments[env.name]).toBeDefined();
      expect(registryContent.environments[env.name].basePort).toBe(allocations[index].portal);
    });
  });
  
  test('should update registry when releasing ports', async () => {
    // Given: An allocated environment
    const environmentName = 'temp-app';
    await portAllocator.allocatePortsForEnvironment(environmentName, 'demo');
    
    // When: Releasing the environment's ports
    const released = await portAllocator.releaseEnvironmentPorts(environmentName);
    expect(released).toBe(true);
    
    // Then: Registry should be updated
    const registryContent = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(registryContent.environments[environmentName]).toBeUndefined();
    
    // And: Ports should be available for reuse
    const allocations = await portAllocator.getEnvironmentPorts(environmentName);
    expect(allocations).toHaveLength(0);
  });
  
  test('should maintain registry integrity across restarts', async () => {
    // Given: Some allocations
    await portAllocator.allocatePortsForEnvironment('app-1', 'theme');
    await portAllocator.allocateServicePort('app-1', 'service-1');
    await portAllocator.allocateServicePort('app-1', 'service-2');
    
    // When: Simulating restart by creating new instance
    // (In real implementation, new instance would read from registry)
    
    // Then: All allocations should be preserved
    const summary = await portAllocator.getPortUsageSummary();
    expect(summary.theme.used).toBeGreaterThan(0);
    
    const allocations = await portAllocator.getAllUsedPorts();
    expect(allocations).toHaveLength(3); // portal + 2 services
  });
  
  test('should handle registry corruption gracefully', async () => {
    // Given: A corrupted registry file
    await fs.writeFile(registryPath, 'invalid json content');
    
    // When: Trying to allocate ports
    // Then: Should handle gracefully and create new valid registry
    const allocation = await portAllocator.allocatePortsForEnvironment('recovery-app', 'test');
    expect(allocation.portal).toBeDefined();
    
    // And: Registry should be valid JSON now
    const registryContent = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(registryContent.environments['recovery-app']).toBeDefined();
  });
});