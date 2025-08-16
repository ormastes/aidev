/**
 * Unit Test: ConfigManager
 * 
 * Tests the ConfigManager component that orchestrates environment
 * configuration management.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { 
  ConfigManager as IConfigManager,
  EnvironmentConfig,
  CreateEnvironmentOptions
} from '../../src/interfaces/config-manager.interface';
import { ConfigManager } from '../../src/components/config-manager';

// Mock dependencies for unit testing
class MockPortAllocator {
  private allocations = new Map<string, number>();
  private nextPorts = { theme: 3200, test: 3100, demo: 3300, release: 3456, epic: 3500 };

  async allocatePortsForEnvironment(name: string, type: string) {
    const basePort = this.nextPorts[type as keyof typeof this.nextPorts];
    if (type !== 'release') {
      this.nextPorts[type as keyof typeof this.nextPorts]++;
    }
    this.allocations.set(name, basePort);
    return {
      portal: basePort,
      services: { start: basePort + 1, end: basePort + 99 }
    };
  }

  async allocateServicePort(environmentName: string, serviceName: string): Promise<number> {
    const basePort = this.allocations.get(environmentName) || 3200;
    return basePort + 1 + Math.floor(Math.random() * 10);
  }

  async releaseEnvironmentPorts(name: string): Promise<boolean> {
    this.allocations.delete(name);
    return true;
  }

  async releasePort(port: number): Promise<boolean> {
    return true;
  }
}

class MockFileGenerator {
  async generateEnvironmentFiles(config: EnvironmentConfig, outputPath: string): Promise<void> {
    // Mock implementation - just create directories
    await fs.mkdir(path.join(outputPath, 'config'), { recursive: true });
    await fs.writeFile(
      path.join(outputPath, 'config', 'config.json'), 
      JSON.stringify(config, null, 2)
    );
  }

  async generateServiceFile(environmentPath: string, serviceName: string, port: number): Promise<void> {
    await fs.mkdir(path.join(environmentPath, "services"), { recursive: true });
    await fs.writeFile(
      path.join(environmentPath, "services", `${serviceName}.json`),
      JSON.stringify({ name: serviceName, port, enabled: true })
    );
  }

  async updateDockerCompose(environmentPath: string, services: any[]): Promise<void> {
    // Mock implementation
  }

  async updateEnvFile(environmentPath: string, key: string, value: string): Promise<void> {
    // Mock implementation
  }

  async validateGeneratedFiles(environmentPath: string): Promise<{valid: boolean, errors: string[]}> {
    return { valid: true, errors: [] };
  }
}

describe('ConfigManager Unit Test', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let portAllocator: MockPortAllocator;
  let fileGenerator: MockFileGenerator;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'config-manager-utest-'));
    portAllocator = new MockPortAllocator();
    fileGenerator = new MockFileGenerator();
    configManager = new ConfigManager(portAllocator as any, fileGenerator as any, tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should create new environment with allocated ports', async () => {
    // When: Creating a new environment
    const config = await configManager.createEnvironment({
      name: 'test-theme',
      type: 'theme'
    });

    // Then: Should have correct configuration
    expect(config.name).toBe('test-theme');
    expect(config.type).toBe('theme');
    expect(config.port.base).toBe(3200);
    expect(config.port.range).toEqual([3201, 3299]);
    expect(config.database.type).toBe('sqlite');
    expect(config.services).toEqual([]);
    expect(config.created).toBeInstanceOf(Date);
    expect(config.updated).toBeInstanceOf(Date);
  });

  test('should store and retrieve environment configuration', async () => {
    // Given: Created environment
    const created = await configManager.createEnvironment({
      name: 'my-app',
      type: 'demo'
    });

    // When: Retrieving by name
    const retrieved = await configManager.getEnvironment('my-app');

    // Then: Should match created config
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe(created.name);
    expect(retrieved!.type).toBe(created.type);
    expect(retrieved!.port.base).toBe(created.port.base);
  });

  test('should return null for non-existent environment', async () => {
    // When: Getting non-existent environment
    const config = await configManager.getEnvironment('does-not-exist');

    // Then: Should be null
    expect(config).toBeNull();
  });

  test('should update environment configuration', async () => {
    // Given: Existing environment
    const created = await configManager.createEnvironment({
      name: 'update-test',
      type: 'theme'
    });

    // Add small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // When: Updating configuration
    const updated = await configManager.updateEnvironment('update-test', {
      database: {
        type: "postgresql",
        connection: 'postgresql://localhost/updatedb'
      }
    });

    // Then: Should have updated values
    expect(updated.database.type).toBe("postgresql");
    expect(updated.database.connection).toBe('postgresql://localhost/updatedb');
    expect(updated.updated.getTime()).toBeGreaterThan(created.created.getTime());
  });

  test('should add service to environment', async () => {
    // Given: Environment without services
    await configManager.createEnvironment({
      name: 'service-test',
      type: 'theme'
    });

    // When: Adding services
    await configManager.addService('service-test', 'api-gateway');
    await configManager.addService('service-test', 'auth-service');

    // Then: Should have services with allocated ports
    const config = await configManager.getEnvironment('service-test');
    expect(config!.services).toHaveLength(2);
    expect(config!.services[0].name).toBe('api-gateway');
    expect(config!.services[0].port).toBeGreaterThan(3200);
    expect(config!.services[1].name).toBe('auth-service');
    expect(config!.services[1].port).toBeGreaterThan(3200);
  });

  test('should remove service from environment', async () => {
    // Given: Environment with services
    await configManager.createEnvironment({
      name: 'remove-test',
      type: 'demo'
    });
    await configManager.addService('remove-test', 'service-1');
    await configManager.addService('remove-test', 'service-2');

    // When: Removing a service
    await configManager.removeService('remove-test', 'service-1');

    // Then: Should only have remaining service
    const config = await configManager.getEnvironment('remove-test');
    expect(config!.services).toHaveLength(1);
    expect(config!.services[0].name).toBe('service-2');
  });

  test('should delete environment and release ports', async () => {
    // Given: Existing environment
    await configManager.createEnvironment({
      name: 'delete-test',
      type: 'test'
    });

    // When: Deleting environment
    const deleted = await configManager.deleteEnvironment('delete-test');

    // Then: Should be deleted
    expect(deleted).toBe(true);
    const config = await configManager.getEnvironment('delete-test');
    expect(config).toBeNull();
  });

  test('should list all environments', async () => {
    // Given: Multiple environments
    await configManager.createEnvironment({ name: 'app-1', type: 'theme' });
    await configManager.createEnvironment({ name: 'app-2', type: 'demo' });
    await configManager.createEnvironment({ name: 'app-3', type: 'test' });

    // When: Listing all
    const all = await configManager.listEnvironments();

    // Then: Should have all environments
    expect(all).toHaveLength(3);
    expect(all.map(e => e.name)).toContain('app-1');
    expect(all.map(e => e.name)).toContain('app-2');
    expect(all.map(e => e.name)).toContain('app-3');
  });

  test('should list environments by type', async () => {
    // Given: Multiple environments of different types
    await configManager.createEnvironment({ name: 'theme-1', type: 'theme' });
    await configManager.createEnvironment({ name: 'theme-2', type: 'theme' });
    await configManager.createEnvironment({ name: 'demo-1', type: 'demo' });

    // When: Listing by type
    const themes = await configManager.listEnvironments('theme');

    // Then: Should only have theme environments
    expect(themes).toHaveLength(2);
    expect(themes.every(e => e.type === 'theme')).toBe(true);
  });

  test('should find environment by port', async () => {
    // Given: Multiple environments
    const env1 = await configManager.createEnvironment({ name: 'port-test-1', type: 'theme' });
    const env2 = await configManager.createEnvironment({ name: 'port-test-2', type: 'demo' });

    // When: Finding by port
    const found1 = await configManager.getEnvironmentByPort(env1.port.base);
    const found2 = await configManager.getEnvironmentByPort(env2.port.base);

    // Then: Should find correct environments
    expect(found1?.name).toBe('port-test-1');
    expect(found2?.name).toBe('port-test-2');
  });

  test('should export environment in JSON format', async () => {
    // Given: Environment with services
    await configManager.createEnvironment({ name: 'export-test', type: 'theme' });
    await configManager.addService('export-test', 'service-1');

    // When: Exporting as JSON
    const exported = await configManager.exportEnvironment('export-test', 'json');

    // Then: Should be valid JSON
    const parsed = JSON.parse(exported);
    expect(parsed.name).toBe('export-test');
    expect(parsed.type).toBe('theme');
    expect(parsed.services).toHaveLength(1);
  });

  test('should validate environment configuration', async () => {
    // Given: Valid environment
    await configManager.createEnvironment({ name: 'valid-env', type: 'test' });

    // When: Validating
    const result = await configManager.validateEnvironment('valid-env');

    // Then: Should be valid
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should clone environment with new name', async () => {
    // Given: Source environment with services
    await configManager.createEnvironment({ name: 'source-env', type: 'theme' });
    await configManager.addService('source-env', 'api');
    await configManager.addService('source-env', 'auth');

    // When: Cloning
    const cloned = await configManager.cloneEnvironment('source-env', 'cloned-env');

    // Then: Should have same structure but different name and ports
    expect(cloned.name).toBe('cloned-env');
    expect(cloned.type).toBe('theme');
    expect(cloned.services).toHaveLength(2);
    expect(cloned.port.base).not.toBe(3200); // Different port
  });

  test('should handle database configuration for different types', async () => {
    // Test SQLite for development
    const devEnv = await configManager.createEnvironment({
      name: 'dev-env',
      type: 'theme'
    });
    expect(devEnv.database.type).toBe('sqlite');
    expect(devEnv.database.connection).toContain('dev-env.db');

    // Test PostgreSQL for release
    const releaseEnv = await configManager.createEnvironment({
      name: 'prod-env',
      type: 'release'
    });
    expect(releaseEnv.database.type).toBe("postgresql");
  });
});