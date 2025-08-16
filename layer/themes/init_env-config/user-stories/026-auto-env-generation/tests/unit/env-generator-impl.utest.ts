/**
 * Unit Test: EnvGeneratorImpl Coverage Tests
 * 
 * This test file improves coverage for uncovered methods in EnvGeneratorImpl
 */

import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';
import { DatabaseConfig, EnvVariable } from '../../src/external/env-generator';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('EnvGeneratorImpl Coverage Tests', () => {
  let envGenerator: EnvGeneratorImpl;
  let serviceDiscovery: ServiceDiscoveryImpl;
  let tokenService: TokenServiceImpl;
  
  beforeEach(() => {
    serviceDiscovery = new ServiceDiscoveryImpl();
    tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
  });
  
  describe('generateDatabaseConfig', () => {
    it('should generate PostgreSQL config with all fields', () => {
      const dbConfig: DatabaseConfig = {
        type: 'postgresql',
        host: 'db.example.com',
        port: 5432,
        database: 'myapp',
        user: 'admin',
        password: 'secret123'
      };
      
      const result = envGenerator.generateDatabaseConfig(dbConfig, 'production');
      
      expect(result).toContainEqual({
        key: 'DB_TYPE',
        value: 'postgresql',
        description: 'Database type'
      });
      
      expect(result).toContainEqual({
        key: 'DB_HOST',
        value: 'db.example.com',
        description: 'Database host'
      });
      
      expect(result).toContainEqual({
        key: 'DB_PORT',
        value: '5432',
        description: 'Database port'
      });
      
      expect(result).toContainEqual({
        key: 'DB_USER',
        value: 'admin',
        description: 'Database user'
      });
      
      expect(result).toContainEqual({
        key: 'DB_PASSWORD',
        value: 'secret123',
        description: 'Database password',
        isSecret: true
      });
      
      expect(result).toContainEqual({
        key: 'DATABASE_URL',
        value: 'postgresql://admin:secret123@db.example.com:5432/myapp',
        description: 'Database connection string',
        isSecret: true
      });
    });
    
    it('should generate PostgreSQL config with defaults', () => {
      const dbConfig: DatabaseConfig = {
        type: 'postgresql',
        database: 'myapp'
      };
      
      const result = envGenerator.generateDatabaseConfig(dbConfig, 'production');
      
      expect(result).toContainEqual({
        key: 'DB_HOST',
        value: 'localhost',
        description: 'Database host'
      });
      
      expect(result).toContainEqual({
        key: 'DB_PORT',
        value: '5432',
        description: 'Database port'
      });
      
      expect(result).toContainEqual({
        key: 'DB_USER',
        value: 'postgres',
        description: 'Database user'
      });
      
      // Should not include password if not provided
      const passwordVar = result.find(v => v.key === 'DB_PASSWORD');
      expect(passwordVar).toBeUndefined();
      
      expect(result).toContainEqual({
        key: 'DATABASE_URL',
        value: 'postgresql://localhost:5432/myapp',
        description: 'Database connection string',
        isSecret: true
      });
    });
    
    it('should generate SQLite config', () => {
      const dbConfig: DatabaseConfig = {
        type: 'sqlite',
        database: 'myapp'
      };
      
      const result = envGenerator.generateDatabaseConfig(dbConfig, 'development');
      
      expect(result).toContainEqual({
        key: 'DB_TYPE',
        value: 'sqlite',
        description: 'Database type'
      });
      
      expect(result).toContainEqual({
        key: 'DB_NAME',
        value: 'myapp',
        description: 'Database name'
      });
      
      expect(result).toContainEqual({
        key: 'DATABASE_URL',
        value: 'sqlite://./myapp.db',
        description: 'Database connection string'
      });
      
      // Should not include host, port, user for SQLite
      const hostVar = result.find(v => v.key === 'DB_HOST');
      const portVar = result.find(v => v.key === 'DB_PORT');
      const userVar = result.find(v => v.key === 'DB_USER');
      
      expect(hostVar).toBeUndefined();
      expect(portVar).toBeUndefined();
      expect(userVar).toBeUndefined();
    });
  });
  
  describe('validateEnvVariables', () => {
    it('should validate correct env variables', () => {
      const variables: EnvVariable[] = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'SERVICE_NAME', value: 'api' },
        { key: 'SERVICE_PORT', value: '3000' },
        { key: 'API_KEY', value: 'secret' }
      ];
      
      const result = envGenerator.validateEnvVariables(variables);
      expect(result).toBe(true);
    });
    
    it('should reject missing required variables', () => {
      const variables: EnvVariable[] = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'SERVICE_NAME', value: 'api' }
        // Missing SERVICE_PORT
      ];
      
      const result = envGenerator.validateEnvVariables(variables);
      expect(result).toBe(false);
    });
    
    it('should reject duplicate keys', () => {
      const variables: EnvVariable[] = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'SERVICE_NAME', value: 'api' },
        { key: 'SERVICE_PORT', value: '3000' },
        { key: 'NODE_ENV', value: 'development' } // Duplicate
      ];
      
      const result = envGenerator.validateEnvVariables(variables);
      expect(result).toBe(false);
    });
    
    it('should reject invalid key format', () => {
      const variables: EnvVariable[] = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'SERVICE_NAME', value: 'api' },
        { key: 'SERVICE_PORT', value: '3000' },
        { key: 'invalid-key', value: 'value' } // Invalid format
      ];
      
      const result = envGenerator.validateEnvVariables(variables);
      expect(result).toBe(false);
    });
    
    it('should reject keys starting with number', () => {
      const variables: EnvVariable[] = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'SERVICE_NAME', value: 'api' },
        { key: 'SERVICE_PORT', value: '3000' },
        { key: '1INVALID', value: 'value' } // Starts with number
      ];
      
      const result = envGenerator.validateEnvVariables(variables);
      expect(result).toBe(false);
    });
  });
  
  describe('writeEnvFile', () => {
    const testFilePath = '/tmp/test-env-' + Date.now() + '.env';
    
    afterEach(async () => {
      try {
        await fs.unlink(testFilePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }
    });
    
    it('should write env file with correct format', async () => {
      const variables: EnvVariable[] = [
        { key: 'NODE_ENV', value: 'test', description: 'Environment' },
        { key: 'SERVICE_NAME', value: 'test-service' },
        { key: 'SERVICE_PORT', value: '3000' },
        { key: 'API_KEY', value: 'secret', isSecret: true }
      ];
      
      await envGenerator.writeEnvFile(testFilePath, variables);
      
      const content = await fs.readFile(testFilePath, 'utf-8');
      
      expect(content).toContain('NODE_ENV=test');
      expect(content).toContain('SERVICE_NAME=test-service');
      expect(content).toContain('SERVICE_PORT=3000');
      expect(content).toContain('API_KEY=secret');
      expect(content).toContain('# Environment');
    });
    
    it('should handle write errors gracefully', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/test.env';
      
      await expect(
        envGenerator.writeEnvFile(invalidPath, [
          { key: 'TEST', value: 'value' }
        ])
      ).rejects.toThrow();
    });
  });
  
  describe('generateEnvFile with database config', () => {
    it('should include database configuration in generated env file', async () => {
      const config = {
        environment: 'release' as const,
        serviceName: 'db-service',
        servicePort: 5000,
        databaseConfig: {
          type: 'postgresql' as const,
          host: 'db.prod.com',
          port: 5432,
          database: 'proddb',
          user: 'produser',
          password: 'prodpass'
        }
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      expect(result.content).toContain('DB_TYPE=postgresql');
      expect(result.content).toContain('DB_HOST=db.prod.com');
      expect(result.content).toContain('DB_PORT=5432');
      expect(result.content).toContain('DB_USER=produser');
      expect(result.content).toContain('DB_PASSWORD=prodpass');
      expect(result.content).toContain('DATABASE_URL=postgresql://produser:prodpass@db.prod.com:5432/proddb');
    });
    
    it('should format env content correctly with categories', async () => {
      const config = {
        environment: 'release' as const,
        serviceName: 'full-service',
        servicePort: 8080,
        additionalVariables: [
          { key: 'CUSTOM_VAR', value: 'custom-value', description: 'Custom variable' }
        ]
      };
      
      const result = await envGenerator.generateEnvFile(config);
      
      expect(result.content).toContain('# Auto-generated environment file');
      expect(result.content).toContain('# Basic Configuration');
      expect(result.content).toContain('# Security Tokens (Keep these secret!)');
      expect(result.content).toContain('NODE_ENV=release');
      expect(result.content).toContain('SERVICE_NAME=full-service');
      expect(result.content).toContain('JWT_SECRET=');
      expect(result.content).toContain('CUSTOM_VAR=custom-value');
    });
  });
});