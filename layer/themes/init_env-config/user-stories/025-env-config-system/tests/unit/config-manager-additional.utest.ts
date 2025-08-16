/**
 * Additional Unit Tests for ConfigManager
 * 
 * Tests for improving coverage of error paths, edge cases, and 
 * less common functionality.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { ConfigManager } from '../../src/components/config-manager';

// Enhanced Mock classes with more error simulation capabilities
class MockPortAllocator {
  private allocations = new Map<string, number>();
  private nextPorts = { theme: 3200, test: 3100, demo: 3300, release: 3456, epic: 3500 };
  private shouldFail = false;
  private failOnRelease = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  setFailOnRelease(value: boolean) {
    this.failOnRelease = value;
  }

  async allocatePortsForEnvironment(name: string, type: string) {
    if (this.shouldFail) {
      throw new Error('Port allocation failed');
    }
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
    if (this.shouldFail) {
      throw new Error('Service port allocation failed');
    }
    const basePort = this.allocations.get(environmentName) || 3200;
    return basePort + 1 + Math.floor(Math.random() * 10);
  }

  async releaseEnvironmentPorts(name: string): Promise<boolean> {
    if (this.failOnRelease) {
      return false;
    }
    this.allocations.delete(name);
    return true;
  }

  async releasePort(port: number): Promise<boolean> {
    if (this.failOnRelease) {
      return false;
    }
    return true;
  }
}

class MockFileGenerator {
  private shouldFail = false;
  private validationErrors: string[] = [];

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  setValidationErrors(errors: string[]) {
    this.validationErrors = errors;
  }

  async generateEnvironmentFiles(config: any, outputPath: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('File generation failed');
    }
    await fs.mkdir(path.join(outputPath, 'config'), { recursive: true });
    await fs.writeFile(
      path.join(outputPath, 'config', 'config.json'), 
      JSON.stringify(config, null, 2)
    );
  }

  async generateServiceFile(environmentPath: string, serviceName: string, port: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Service file generation failed');
    }
    await fs.mkdir(path.join(environmentPath, 'services'), { recursive: true });
    await fs.writeFile(
      path.join(environmentPath, 'services', `${serviceName}.json`),
      JSON.stringify({ name: serviceName, port, enabled: true })
    );
  }

  async updateDockerCompose(environmentPath: string, services: any[]): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Docker compose update failed');
    }
  }

  async updateEnvFile(environmentPath: string, key: string, value: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Env file update failed');
    }
  }

  async validateGeneratedFiles(environmentPath: string): Promise<{valid: boolean, errors: string[]}> {
    if (this.validationErrors.length > 0) {
      return { valid: false, errors: this.validationErrors };
    }
    return { valid: true, errors: [] };
  }
}

describe('ConfigManager Additional Unit Tests', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let portAllocator: MockPortAllocator;
  let fileGenerator: MockFileGenerator;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'config-manager-additional-'));
    portAllocator = new MockPortAllocator();
    fileGenerator = new MockFileGenerator();
    configManager = new ConfigManager(portAllocator as any, fileGenerator as any, tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Error handling', () => {
    test('should throw error when updating non-existent environment', async () => {
      await expect(configManager.updateEnvironment('non-existent', {
        database: { type: 'postgresql', connection: 'postgresql://localhost/test' }
      })).rejects.toThrow('Environment non-existent not found');
    });

    test('should throw error when deleting non-existent environment', async () => {
      await expect(configManager.deleteEnvironment('non-existent'))
        .rejects.toThrow('Environment non-existent not found');
    });

    test('should throw error when exporting non-existent environment', async () => {
      await expect(configManager.exportEnvironment('non-existent', 'json'))
        .rejects.toThrow('Environment non-existent not found');
    });

    test('should throw error when cloning non-existent source environment', async () => {
      await expect(configManager.cloneEnvironment('non-existent', 'target'))
        .rejects.toThrow('Source environment non-existent not found');
    });

    test('should handle port allocation failure', async () => {
      portAllocator.setShouldFail(true);
      
      await expect(configManager.createEnvironment({
        name: 'fail-test',
        type: 'theme'
      })).rejects.toThrow('Port allocation failed');
    });

    test('should handle file generation failure', async () => {
      fileGenerator.setShouldFail(true);
      
      await expect(configManager.createEnvironment({
        name: 'fail-test',
        type: 'theme'
      })).rejects.toThrow('File generation failed');
    });
  });

  describe('Export functionality', () => {
    beforeEach(async () => {
      await configManager.createEnvironment({ name: 'export-test', type: 'demo' });
      await configManager.addService('export-test', 'api');
      await configManager.addService('export-test', 'database');
    });

    test('should export environment as env format', async () => {
      const exported = await configManager.exportEnvironment('export-test', 'env');
      
      expect(exported).toContain('ENVIRONMENT_NAME=export-test');
      expect(exported).toContain('ENVIRONMENT_TYPE=demo');
      expect(exported).toContain('PORT=3300');
      expect(exported).toContain('DATABASE_TYPE=sqlite');
      expect(exported).toContain('SERVICE_API_PORT=');
      expect(exported).toContain('SERVICE_DATABASE_PORT=');
    });

    test('should throw error for YAML export (not implemented)', async () => {
      await expect(configManager.exportEnvironment('export-test', 'yaml'))
        .rejects.toThrow('YAML export not In Progress');
    });

    test('should throw error for unsupported export format', async () => {
      await expect(configManager.exportEnvironment('export-test', 'xml' as any))
        .rejects.toThrow('Unsupported format: xml');
    });

    test('should export using exportAsEnv shorthand', async () => {
      const exported = await configManager.exportAsEnv('export-test');
      expect(exported).toContain('ENVIRONMENT_NAME=export-test');
    });
  });

  describe('Import functionality', () => {
    test('should throw not implemented error for import', async () => {
      await expect(configManager.importEnvironment('{}', 'json'))
        .rejects.toThrow('Import not In Progress');
    });
  });

  describe('Service management edge cases', () => {
    test('should return false when removing non-existent service', async () => {
      await configManager.createEnvironment({ name: 'service-test', type: 'theme' });
      
      const result = await configManager.removeService('service-test', 'non-existent');
      expect(result).toBe(false);
    });

    test('should return false when removing service from non-existent environment', async () => {
      const result = await configManager.removeService('non-existent', 'service');
      expect(result).toBe(false);
    });

    test('should handle service addition failure', async () => {
      await configManager.createEnvironment({ name: 'service-fail', type: 'theme' });
      portAllocator.setShouldFail(true);
      
      await expect(configManager.addService('service-fail', 'failing-service'))
        .rejects.toThrow('Service port allocation failed');
    });
  });

  describe('Validation functionality', () => {
    test('should return validation errors for non-existent environment', async () => {
      const result = await configManager.validateEnvironment('non-existent');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Environment not found');
    });

    test('should return validation errors from file generator', async () => {
      await configManager.createEnvironment({ name: 'invalid-env', type: 'test' });
      fileGenerator.setValidationErrors(['Missing docker-compose.yml', 'Invalid .env format']);
      
      const result = await configManager.validateEnvironment('invalid-env');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Missing docker-compose.yml');
      expect(result.errors).toContain('Invalid .env format');
    });
  });

  describe('Configuration validation', () => {
    test('should validate valid configuration', async () => {
      const result = await configManager.validateConfig({
        name: 'valid-config',
        type: 'theme'
      });
      
      expect(result).toBe(true);
    });

    test('should reject configuration without name', async () => {
      const result = await configManager.validateConfig({
        type: 'theme'
      });
      
      expect(result).toBe(false);
    });

    test('should reject configuration without type', async () => {
      const result = await configManager.validateConfig({
        name: 'test'
      });
      
      expect(result).toBe(false);
    });

    test('should reject configuration with invalid type', async () => {
      const result = await configManager.validateConfig({
        name: 'test',
        type: 'invalid' as any
      });
      
      expect(result).toBe(false);
    });
  });

  describe('Environment existence check', () => {
    test('should return true for existing environment', async () => {
      await configManager.createEnvironment({ name: 'exists', type: 'demo' });
      
      const exists = await configManager.environmentExists('exists');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent environment', async () => {
      const exists = await configManager.environmentExists('does-not-exist');
      expect(exists).toBe(false);
    });
  });

  describe('Port-based environment lookup', () => {
    test('should find environment by service port', async () => {
      await configManager.createEnvironment({ name: 'port-lookup', type: 'theme' });
      const service = await configManager.addService('port-lookup', 'test-service');
      
      const found = await configManager.getEnvironmentByPort(service.port!);
      expect(found?.name).toBe('port-lookup');
    });

    test('should return null for unknown port', async () => {
      const found = await configManager.getEnvironmentByPort(9999);
      expect(found).toBeNull();
    });
  });

  describe('Clone functionality edge cases', () => {
    test('should clone environment with different type', async () => {
      await configManager.createEnvironment({ name: 'source', type: 'theme' });
      await configManager.addService('source', 'service1');
      
      const cloned = await configManager.cloneEnvironment('source', 'target', 'demo');
      
      expect(cloned.name).toBe('target');
      expect(cloned.type).toBe('demo');
      expect(cloned.services).toHaveLength(1);
      expect(cloned.port.base).toBe(3300); // Demo port
    });

    test('should handle clone failure gracefully', async () => {
      await configManager.createEnvironment({ name: 'source', type: 'theme' });
      
      // Force failure during service cloning
      portAllocator.setShouldFail(true);
      
      // Clone should still create the base environment even if service cloning fails
      await expect(configManager.cloneEnvironment('source', 'failed-clone'))
        .resolves.toBeDefined();
    });
  });

  describe('Database configuration', () => {
    test('should use PostgreSQL for release environment', async () => {
      const config = await configManager.createEnvironment({
        name: 'release-db',
        type: 'release'
      });
      
      expect(config.database.type).toBe('postgresql');
      expect(config.database.connection).toContain('postgresql://');
    });

    test('should use SQLite for test environment', async () => {
      const config = await configManager.createEnvironment({
        name: 'test-db',
        type: 'test'
      });
      
      expect(config.database.type).toBe('sqlite');
      expect(config.database.connection).toContain('test-db.db');
    });

    test('should use SQLite for epic environment', async () => {
      const config = await configManager.createEnvironment({
        name: 'epic-db',
        type: 'epic'
      });
      
      expect(config.database.type).toBe('sqlite');
      expect(config.database.connection).toContain('epic-db.db');
    });
  });

  describe('Delete environment edge cases', () => {
    test('should handle port release failure during deletion', async () => {
      await configManager.createEnvironment({ name: 'delete-fail', type: 'theme' });
      portAllocator.setFailOnRelease(true);
      
      // Should still delete even if port release fails
      const result = await configManager.deleteEnvironment('delete-fail');
      expect(result).toBe(true);
      
      // Environment should be gone
      const env = await configManager.getEnvironment('delete-fail');
      expect(env).toBeNull();
    });
  });

  describe('Export as Docker Compose', () => {
    test('should export environment as docker compose', async () => {
      await configManager.createEnvironment({ name: 'docker-test', type: 'demo' });
      await configManager.addService('docker-test', 'web');
      await configManager.addService('docker-test', 'api');
      
      // Create a mock docker-compose.yml file
      const dockerPath = path.join(tempDir, 'docker-test', 'docker-compose.yml');
      await fs.mkdir(path.dirname(dockerPath), { recursive: true });
      await fs.writeFile(dockerPath, `version: '3.8'
services:
  web:
    image: nginx
    ports:
      - "3301:80"
  api:
    image: node:14
    ports:
      - "3302:3000"`);
      
      const exported = await configManager.exportAsDockerCompose('docker-test');
      
      expect(exported).toContain('version:');
      expect(exported).toContain('services:');
      expect(exported).toContain('web:');
      expect(exported).toContain('api:');
    });

    test('should throw error when exporting non-existent env as docker compose', async () => {
      await expect(configManager.exportAsDockerCompose('non-existent'))
        .rejects.toThrow('Environment non-existent not found');
    });
  });

  describe('Environment name suggestion', () => {
    test('should suggest unique environment name', async () => {
      // Create some existing environments
      await configManager.createEnvironment({ name: 'theme-1', type: 'theme' });
      await configManager.createEnvironment({ name: 'theme-2', type: 'theme' });
      
      // Should suggest theme-3
      const suggested = await configManager.suggestEnvironmentName('theme');
      expect(suggested).toBe('theme-3');
    });

    test('should suggest first name when no environments exist', async () => {
      const suggested = await configManager.suggestEnvironmentName('demo');
      expect(suggested).toBe('demo-1');
    });

    test('should handle gaps in numbering', async () => {
      // Create non-sequential environments
      await configManager.createEnvironment({ name: 'test-1', type: 'test' });
      await configManager.createEnvironment({ name: 'test-3', type: 'test' });
      
      // Should still suggest test-2 (fills the gap)
      const suggested = await configManager.suggestEnvironmentName('test');
      expect(suggested).toBe('test-2');
    });

    test('should only consider environments of the same type', async () => {
      await configManager.createEnvironment({ name: 'theme-1', type: 'theme' });
      await configManager.createEnvironment({ name: 'demo-1', type: 'demo' });
      await configManager.createEnvironment({ name: 'demo-2', type: 'demo' });
      
      // Should suggest theme-2, not theme-3
      const suggested = await configManager.suggestEnvironmentName('theme');
      expect(suggested).toBe('theme-2');
    });
  });
});