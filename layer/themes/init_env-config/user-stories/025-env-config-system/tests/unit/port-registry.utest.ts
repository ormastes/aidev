/**
 * Unit Test: PortRegistry
 * 
 * Tests the PortRegistry component that manages persistent storage
 * of port allocations in a JSON file.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { PortRegistry } from '../../src/components/port-registry';

describe('PortRegistry Unit Test', () => {
  let tempDir: string;
  let registryPath: string;
  let portRegistry: PortRegistry;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'port-registry-test-'));
    registryPath = path.join(tempDir, 'port-registry.json');
    portRegistry = new PortRegistry(registryPath);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should initialize empty registry file if not exists', async () => {
    // When: Initializing registry
    await portRegistry.initialize();

    // Then: Registry file should exist
    const exists = await fs.access(registryPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // And: Should contain empty structure
    const content = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(content.environments).toEqual({});
    expect(content.lastUpdated).toBeDefined();
  });

  test('should register new port allocation', async () => {
    // Given: Initialized registry
    await portRegistry.initialize();

    // When: Registering a new allocation
    await portRegistry.registerAllocation('test-app', 'portal', 3200);

    // Then: Registry should contain the allocation
    const content = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(content.environments['test-app']).toBeDefined();
    expect(content.environments['test-app'].services.portal).toBe(3200);
  });

  test('should get all used ports', async () => {
    // Given: Registry with multiple allocations
    const testData = {
      environments: {
        'app-1': {
          type: 'theme',
          basePort: 3200,
          services: { portal: 3200, api: 3201 }
        },
        'app-2': {
          type: 'demo',
          basePort: 3300,
          services: { portal: 3300 }
        }
      },
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(registryPath, JSON.stringify(testData, null, 2));

    // When: Getting all used ports
    const usedPorts = await portRegistry.getUsedPorts();

    // Then: Should return all allocated ports
    expect(usedPorts).toHaveLength(3);
    expect(usedPorts).toContainEqual({ port: 3200, env: 'app-1', service: 'portal' });
    expect(usedPorts).toContainEqual({ port: 3201, env: 'app-1', service: 'api' });
    expect(usedPorts).toContainEqual({ port: 3300, env: 'app-2', service: 'portal' });
  });

  test('should get ports for specific environment', async () => {
    // Given: Registry with allocations
    const testData = {
      environments: {
        'target-app': {
          type: 'theme',
          basePort: 3205,
          services: { portal: 3205, auth: 3206, db: 3207 }
        },
        'other-app': {
          type: 'test',
          basePort: 3100,
          services: { portal: 3100 }
        }
      },
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(registryPath, JSON.stringify(testData, null, 2));

    // When: Getting ports for specific environment
    const ports = await portRegistry.getEnvironmentPorts('target-app');

    // Then: Should return only that environment's ports
    expect(ports).toHaveLength(3);
    expect(ports).toContainEqual({ port: 3205, service: 'portal' });
    expect(ports).toContainEqual({ port: 3206, service: 'auth' });
    expect(ports).toContainEqual({ port: 3207, service: 'db' });
  });

  test('should remove all allocations for an environment', async () => {
    // Given: Registry with allocations
    const testData = {
      environments: {
        'to-remove': {
          type: 'demo',
          basePort: 3310,
          services: { portal: 3310, api: 3311 }
        },
        'to-keep': {
          type: 'theme',
          basePort: 3220,
          services: { portal: 3220 }
        }
      },
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(registryPath, JSON.stringify(testData, null, 2));

    // When: Removing environment allocations
    await portRegistry.removeEnvironmentAllocations('to-remove');

    // Then: Environment should be removed
    const content = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(content.environments['to-remove']).toBeUndefined();
    expect(content.environments['to-keep']).toBeDefined();
  });

  test('should handle concurrent access with file locking', async () => {
    // Given: Initialized registry
    await portRegistry.initialize();

    // When: Multiple concurrent operations
    const operations = [
      portRegistry.registerAllocation('app-1', 'portal', 3200),
      portRegistry.registerAllocation('app-2', 'portal', 3201),
      portRegistry.registerAllocation('app-3', 'portal', 3202)
    ];

    await Promise.all(operations);

    // Then: All allocations should be registered
    const content = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(Object.keys(content.environments)).toHaveLength(3);
    expect(content.environments['app-1'].services.portal).toBe(3200);
    expect(content.environments['app-2'].services.portal).toBe(3201);
    expect(content.environments['app-3'].services.portal).toBe(3202);
  });

  test('should handle corrupted registry file gracefully', async () => {
    // Given: Corrupted registry file
    await fs.writeFile(registryPath, 'invalid json content');

    // When: Trying to read
    // Then: Should recover with empty registry
    await portRegistry.initialize();
    const ports = await portRegistry.getUsedPorts();
    expect(ports).toEqual([]);

    // And: Registry should be valid JSON
    const content = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(content.environments).toEqual({});
  });

  test('should update lastUpdated timestamp on modifications', async () => {
    // Given: Registry with old timestamp
    const oldTime = new Date('2024-01-01').toISOString();
    const testData = {
      environments: {},
      lastUpdated: oldTime
    };
    await fs.writeFile(registryPath, JSON.stringify(testData, null, 2));

    // When: Making a modification
    await portRegistry.registerAllocation('new-app', 'portal', 3250);

    // Then: Timestamp should be updated
    const content = JSON.parse(await fs.readFile(registryPath, 'utf-8'));
    expect(content.lastUpdated).not.toBe(oldTime);
    expect(new Date(content.lastUpdated).getTime()).toBeGreaterThan(new Date(oldTime).getTime());
  });
});