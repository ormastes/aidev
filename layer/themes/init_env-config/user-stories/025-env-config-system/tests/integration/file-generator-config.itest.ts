/**
 * Integration Test: FileGenerator creates valid config files
 * 
 * This test verifies that FileGenerator correctly generates all required
 * configuration files (.env, docker-compose.yml, config.json) with proper
 * content and structure.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import type { EnvironmentConfig } from '../../src/interfaces/config-manager.interface';

import { FileGenerator } from '../../src/components/file-generator';

describe('FileGenerator Configuration Files Integration Test', () => {
  let tempDir: string;
  let fileGenerator: FileGenerator;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'file-gen-itest-'));
    
    // Create real implementation
    fileGenerator = new FileGenerator();
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  test('should generate valid .env file with all required variables', async () => {
    // Given: A configuration for a theme environment
    const config: EnvironmentConfig = {
      name: 'test-theme',
      type: 'theme',
      port: {
        base: 3205,
        range: [3205, 3299]
      },
      database: {
        type: 'sqlite',
        connection: './data/test-theme.db'
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [],
      created: new Date(),
      updated: new Date()
    };
    
    // When: Generating environment files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);
    
    // Then: .env file should exist
    const envPath = path.join(tempDir, '.env');
    const envExists = await fs.access(envPath).then(() => true).catch(() => false);
    expect(envExists).toBe(true);
    
    // And: Should contain all required variables
    const envContent = await fs.readFile(envPath, 'utf-8');
    expect(envContent).toContain('NODE_ENV=theme');
    expect(envContent).toContain('PORT=3205');
    expect(envContent).toContain('DATABASE_TYPE=sqlite');
    expect(envContent).toContain('DATABASE_PATH=./data/test-theme.db');
    expect(envContent).toContain('THEME_NAME=test-theme');
    expect(envContent).toContain('CREATED_AT=');
    
    // And: Should be valid shell format
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    lines.forEach(line => {
      expect(line).toMatch(/^[A-Z_]+=[^\s]*$/);
    });
  });
  
  test('should generate valid docker-compose.yml', async () => {
    // Given: A configuration with services
    const config: EnvironmentConfig = {
      name: 'demo-app',
      type: 'demo',
      port: {
        base: 3301,
        range: [3301, 3399]
      },
      database: {
        type: 'sqlite',
        connection: './data/demo-app.db'
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [
        { name: 'api-gateway', port: 3302, enabled: true },
        { name: 'auth-service', port: 3303, enabled: true }
      ],
      created: new Date(),
      updated: new Date()
    };
    
    // When: Generating environment files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);
    
    // Then: docker-compose.yml should exist
    const dockerPath = path.join(tempDir, 'docker-compose.yml');
    const dockerExists = await fs.access(dockerPath).then(() => true).catch(() => false);
    expect(dockerExists).toBe(true);
    
    // And: Should be valid YAML
    const dockerContent = await fs.readFile(dockerPath, 'utf-8');
    expect(dockerContent).toContain('version:');
    expect(dockerContent).toContain('services:');
    
    // And: Should contain portal service
    expect(dockerContent).toContain('portal:');
    expect(dockerContent).toContain('3301:3301');
    expect(dockerContent).toContain('NODE_ENV=demo');
    
    // And: Should contain additional services
    expect(dockerContent).toContain('api-gateway:');
    expect(dockerContent).toContain('3302:3302');
    expect(dockerContent).toContain('auth-service:');
    expect(dockerContent).toContain('3303:3303');
  });
  
  test('should generate valid config.json with proper structure', async () => {
    // Given: A release environment configuration
    const config: EnvironmentConfig = {
      name: 'prod-release',
      type: 'release',
      port: {
        base: 3456,
        range: [3400, 3499]
      },
      database: {
        type: 'postgresql',
        connection: 'postgresql://user:pass@localhost:5432/proddb'
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [],
      created: new Date(),
      updated: new Date()
    };
    
    // When: Generating environment files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);
    
    // Then: config.json should exist
    const configPath = path.join(tempDir, 'config', 'config.json');
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    expect(configExists).toBe(true);
    
    // And: Should be valid JSON
    const configContent = await fs.readFile(configPath, 'utf-8');
    const parsedConfig = JSON.parse(configContent);
    
    // And: Should contain all required fields
    expect(parsedConfig.name).toBe('prod-release');
    expect(parsedConfig.type).toBe('release');
    expect(parsedConfig.port.base).toBe(3456);
    expect(parsedConfig.port.range).toEqual([3400, 3499]);
    expect(parsedConfig.database.type).toBe('postgresql');
    expect(parsedConfig.paths).toBeDefined();
    expect(parsedConfig.services).toBeInstanceOf(Array);
    expect(parsedConfig.created).toBeDefined();
    expect(parsedConfig.updated).toBeDefined();
  });
  
  test('should create all required directories', async () => {
    // Given: A configuration
    const config: EnvironmentConfig = {
      name: 'test-env',
      type: 'test',
      port: {
        base: 3100,
        range: [3100, 3199]
      },
      database: {
        type: 'sqlite',
        connection: './data/test.db'
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [],
      created: new Date(),
      updated: new Date()
    };
    
    // When: Generating environment files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);
    
    // Then: All directories should be created
    const dirs = ['config', 'data', 'logs', 'temp', 'services'];
    for (const dir of dirs) {
      const dirPath = path.join(tempDir, dir);
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    }
  });
  
  test('should update files when adding services', async () => {
    // Given: An existing environment
    const config: EnvironmentConfig = {
      name: 'update-test',
      type: 'theme',
      port: {
        base: 3210,
        range: [3210, 3299]
      },
      database: {
        type: 'sqlite',
        connection: './data/update-test.db'
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [],
      created: new Date(),
      updated: new Date()
    };
    
    await fileGenerator.generateEnvironmentFiles(config, tempDir);
    
    // When: Adding a service
    await fileGenerator.generateServiceFile(tempDir, 'new-service', 3211);
    await fileGenerator.updateDockerCompose(tempDir, [
      { name: 'new-service', port: 3211 }
    ]);
    
    // Update .env file with service port
    await fileGenerator.updateEnvFile(tempDir, 'SERVICE_NEW_SERVICE_PORT', '3211');
    
    // Then: Service file should exist
    const serviceFile = path.join(tempDir, 'services', 'new-service.json');
    const serviceExists = await fs.access(serviceFile).then(() => true).catch(() => false);
    expect(serviceExists).toBe(true);
    
    // And: .env should be updated
    const envContent = await fs.readFile(path.join(tempDir, '.env'), 'utf-8');
    expect(envContent).toContain('SERVICE_NEW_SERVICE_PORT=3211');
    
    // And: docker-compose should include the service
    const dockerContent = await fs.readFile(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    expect(dockerContent).toContain('new-service:');
  });
  
  test('should validate generated files', async () => {
    // Given: Generated environment files
    const config: EnvironmentConfig = {
      name: 'validate-test',
      type: 'demo',
      port: {
        base: 3310,
        range: [3310, 3399]
      },
      database: {
        type: 'sqlite',
        connection: './data/validate.db'
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [],
      created: new Date(),
      updated: new Date()
    };
    
    await fileGenerator.generateEnvironmentFiles(config, tempDir);
    
    // When: Validating the files
    const validation = await fileGenerator.validateGeneratedFiles(tempDir);
    
    // Then: Should be valid
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    
    // When: Corrupting a file
    await fs.writeFile(path.join(tempDir, 'config', 'config.json'), 'invalid json');
    
    // Then: Validation should fail
    const validation2 = await fileGenerator.validateGeneratedFiles(tempDir);
    expect(validation2.valid).toBe(false);
    expect(validation2.errors).toContain('Invalid config/config.json format');
  });
});