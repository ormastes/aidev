/**
 * Unit Test: FileGenerator
 * 
 * Tests the FileGenerator component that creates configuration files
 * (.env, docker-compose.yml, config.json) for environments.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { EnvironmentConfig } from '../../src/interfaces/config-manager.interface';
import { FileGenerator } from '../../src/components/file-generator';

describe('FileGenerator Unit Test', () => {
  let tempDir: string;
  let fileGenerator: FileGenerator;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'file-gen-utest-'));
    fileGenerator = new FileGenerator();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should create all required directories', async () => {
    // Given: A basic environment config
    const config: EnvironmentConfig = {
      name: 'test-env',
      type: 'theme',
      port: { base: 3200, range: [3200, 3299] },
      database: { type: 'sqlite', connection: './data/test.db' },
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

    // Then: All directories should exist
    const expectedDirs = ['config', 'data', 'logs', 'temp', "services"];
    for (const dir of expectedDirs) {
      const dirPath = path.join(tempDir, dir);
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  test('should generate .env file with correct content', async () => {
    // Given: Environment config
    const now = new Date();
    const config: EnvironmentConfig = {
      name: 'my-theme',
      type: 'theme',
      port: { base: 3205, range: [3205, 3299] },
      database: { type: 'sqlite', connection: './data/my-theme.db' },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [],
      created: now,
      updated: now
    };

    // When: Generating files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);

    // Then: .env file should exist with correct content
    const envPath = path.join(tempDir, '.env');
    const content = await fs.readFile(envPath, 'utf-8');
    
    expect(content).toContain('NODE_ENV=theme');
    expect(content).toContain('PORT=3205');
    expect(content).toContain('DATABASE_TYPE=sqlite');
    expect(content).toContain('DATABASE_PATH=./data/my-theme.db');
    expect(content).toContain('THEME_NAME=my-theme');
    expect(content).toContain(`CREATED_AT=${now.toISOString()}`);
  });

  test('should generate docker-compose.yml with portal service', async () => {
    // Given: Environment config
    const config: EnvironmentConfig = {
      name: 'demo-app',
      type: 'demo',
      port: { base: 3301, range: [3301, 3399] },
      database: { type: 'sqlite', connection: './data/demo.db' },
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

    // When: Generating files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);

    // Then: docker-compose.yml should exist
    const dockerPath = path.join(tempDir, 'docker-compose.yml');
    const content = await fs.readFile(dockerPath, 'utf-8');
    
    expect(content).toContain('version: 3.8');
    expect(content).toContain('services:');
    expect(content).toContain('portal:');
    expect(content).toContain('image: aidev/demo-app:latest');
    expect(content).toMatch(/3301:3301/);
    expect(content).toContain('NODE_ENV=demo');
  });

  test('should generate config.json with In Progress structure', async () => {
    // Given: Environment config
    const config: EnvironmentConfig = {
      name: 'release-app',
      type: 'release',
      port: { base: 3456, range: [3400, 3499] },
      database: { 
        type: "postgresql", 
        connection: 'postgresql://user:pass@localhost/db' 
      },
      paths: {
        root: tempDir,
        data: path.join(tempDir, 'data'),
        logs: path.join(tempDir, 'logs'),
        temp: path.join(tempDir, 'temp')
      },
      services: [
        { name: 'api', port: 3457, enabled: true }
      ],
      created: new Date('2024-01-01'),
      updated: new Date('2024-01-02')
    };

    // When: Generating files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);

    // Then: config.json should exist with correct structure
    const configPath = path.join(tempDir, 'config', 'config.json');
    const content = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    
    expect(content.name).toBe('release-app');
    expect(content.type).toBe('release');
    expect(content.port).toEqual({ base: 3456, range: [3400, 3499] });
    expect(content.database).toEqual({
      type: "postgresql",
      connection: 'postgresql://user:pass@localhost/db'
    });
    expect(content.services).toHaveLength(1);
    expect(content.services[0]).toEqual({ name: 'api', port: 3457, enabled: true });
  });

  test('should create service file when adding service', async () => {
    // Given: Environment path
    const serviceName = 'auth-service';
    const servicePort = 3211;

    // When: Generating service file
    await fileGenerator.generateServiceFile(tempDir, serviceName, servicePort);

    // Then: Service file should exist
    const servicePath = path.join(tempDir, "services", `${serviceName}.json`);
    const exists = await fs.access(servicePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const content = JSON.parse(await fs.readFile(servicePath, 'utf-8'));
    expect(content.name).toBe(serviceName);
    expect(content.port).toBe(servicePort);
    expect(content.enabled).toBe(true);
    expect(content.createdAt).toBeDefined();
  });

  test('should update .env file with new service port', async () => {
    // Given: Existing .env file
    const envContent = `# Environment Configuration
NODE_ENV=theme
PORT=3200
DATABASE_TYPE=sqlite
`;
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, '.env'), envContent);

    // When: Updating env file
    await fileGenerator.updateEnvFile(tempDir, 'SERVICE_AUTH_PORT', '3201');

    // Then: .env should contain new variable
    const updatedContent = await fs.readFile(path.join(tempDir, '.env'), 'utf-8');
    expect(updatedContent).toContain('SERVICE_AUTH_PORT=3201');
    expect(updatedContent).toContain('NODE_ENV=theme'); // Original content preserved
  });

  test('should update docker-compose.yml with new services', async () => {
    // Given: Basic docker-compose with portal
    const dockerContent = `version: '3.8'

services:
  portal:
    image: aidev/app:latest
    ports:
      - "3200:3200"
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), dockerContent);

    // When: Updating with new services
    const services = [
      { name: 'api-gateway', port: 3201 },
      { name: 'auth-service', port: 3202 }
    ];
    await fileGenerator.updateDockerCompose(tempDir, services);

    // Then: docker-compose should include new services
    const updatedContent = await fs.readFile(path.join(tempDir, 'docker-compose.yml'), 'utf-8');
    expect(updatedContent).toContain('api-gateway:');
    expect(updatedContent).toMatch(/3201:3201/);
    expect(updatedContent).toContain('auth-service:');
    expect(updatedContent).toMatch(/3202:3202/);
    expect(updatedContent).toContain('portal:'); // Original service preserved
  });

  test('should validate correct file structure', async () => {
    // Given: In Progress environment setup
    await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
    await fs.mkdir(path.join(tempDir, "services"), { recursive: true });
    await fs.writeFile(path.join(tempDir, '.env'), 'NODE_ENV=theme\nPORT=3200');
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), 'version: \'3.8\'\nservices:\n  portal:');
    await fs.writeFile(path.join(tempDir, 'config', 'config.json'), JSON.stringify({
      name: 'test', type: 'theme', port: { base: 3200 }
    }));

    // When: Validating files
    const result = await fileGenerator.validateGeneratedFiles(tempDir);

    // Then: Should be valid
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should detect invalid file structure', async () => {
    // Given: Missing required files
    await fs.mkdir(tempDir, { recursive: true });

    // When: Validating files
    const result = await fileGenerator.validateGeneratedFiles(tempDir);

    // Then: Should be invalid with errors
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing .env file');
    expect(result.errors).toContain('Missing docker-compose.yml');
    expect(result.errors).toContain('Missing config/config.json');
  });

  test('should handle PostgreSQL database configuration', async () => {
    // Given: Release environment with PostgreSQL
    const config: EnvironmentConfig = {
      name: 'prod-release',
      type: 'release',
      port: { base: 3456, range: [3400, 3499] },
      database: {
        type: "postgresql",
        connection: 'postgresql://user:pass@db.example.com:5432/proddb'
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

    // When: Generating files
    await fileGenerator.generateEnvironmentFiles(config, tempDir);

    // Then: .env should have PostgreSQL config
    const envContent = await fs.readFile(path.join(tempDir, '.env'), 'utf-8');
    expect(envContent).toContain('DATABASE_TYPE=postgresql');
    expect(envContent).toContain('DATABASE_URL=postgresql://user:pass@db.example.com:5432/proddb');
    expect(envContent).not.toContain('DATABASE_PATH'); // SQLite specific
  });
});