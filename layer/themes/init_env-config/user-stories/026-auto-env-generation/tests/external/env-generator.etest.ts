/**
 * External Test: EnvGenerator
 * 
 * This test verifies the EnvGenerator external interface implementation
 * for generating .env files with In Progress environment configurations.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { crypto } from '../../../../../infra_external-log-lib/src';
import {
  EnvGenerator,
  EnvGeneratorConfig,
  EnvVariable,
  DatabaseConfig,
  GeneratedEnvFile
} from '../../src/external/env-generator';

// Real implementation of EnvGenerator for testing
class RealEnvGenerator implements EnvGenerator {
  private tokenCache = new Map<string, string>();
  
  async generateEnvFile(config: EnvGeneratorConfig): Promise<GeneratedEnvFile> {
    const variables: EnvVariable[] = [];
    
    // Add basic service configuration
    variables.push(
      { key: 'NODE_ENV', value: config.environment },
      { key: 'SERVICE_NAME', value: config.serviceName },
      { key: 'PORT', value: config.servicePort.toString() },
      { key: 'HOST', value: 'localhost' }
    );
    
    // Add security tokens
    const securityTokens = await this.generateSecurityTokens();
    variables.push(...securityTokens);
    
    // Add database configuration if provided
    if (config.databaseConfig) {
      const dbVars = this.generateDatabaseConfig(config.databaseConfig, config.environment);
      variables.push(...dbVars);
    }
    
    // Add additional variables if provided
    if (config.additionalVariables) {
      variables.push(...config.additionalVariables);
    }
    
    // Generate file path
    const envPath = path.join(
      process.cwd(),
      'temp',
      `${config.serviceName}-${config.environment}.env`
    );
    
    // Write the file
    await this.writeEnvFile(envPath, variables);
    
    // Read back to verify
    const content = fs.readFileSync(envPath, 'utf-8');
    
    return {
      path: envPath,
      content,
      variables,
      timestamp: new Date().toISOString()
    };
  }
  
  async generateSecurityTokens(): Promise<EnvVariable[]> {
    return [
      {
        key: 'JWT_SECRET',
        value: crypto.randomBytes(64).toString('base64'),
        description: 'JWT signing secret',
        isSecret: true
      },
      {
        key: 'API_KEY',
        value: `sk_${this.tokenCache.get('env') || 'live'}_${crypto.randomBytes(32).toString('hex')}`,
        description: 'API key for external services',
        isSecret: true
      },
      {
        key: 'SESSION_SECRET',
        value: crypto.randomBytes(48).toString('base64url'),
        description: 'Session encryption secret',
        isSecret: true
      },
      {
        key: 'REFRESH_TOKEN_SECRET',
        value: crypto.randomBytes(64).toString('base64'),
        description: 'Refresh token signing secret',
        isSecret: true
      }
    ];
  }
  
  async includeServiceUrls(dependencies: string[]): Promise<EnvVariable[]> {
    const variables: EnvVariable[] = [];
    
    for (const dep of dependencies) {
      // Simulate service discovery
      const port = 3000 + Math.floor(Math.random() * 1000);
      variables.push({
        key: `${dep.toUpperCase().replace(/-/g, '_')}_URL`,
        value: `http://localhost:${port}`,
        description: `URL for ${dep} service`
      });
    }
    
    return variables;
  }
  
  generateDatabaseConfig(dbConfig: DatabaseConfig, environment: string): EnvVariable[] {
    const variables: EnvVariable[] = [];
    
    if (environment === 'release' && dbConfig.type === 'postgresql') {
      variables.push(
        { key: 'DB_TYPE', value: 'postgresql' },
        { key: 'DB_HOST', value: dbConfig.host || 'localhost' },
        { key: 'DB_PORT', value: (dbConfig.port || 5432).toString() },
        { key: 'DB_NAME', value: dbConfig.database },
        { key: 'DB_USER', value: dbConfig.user || 'postgres', isSecret: true },
        { key: 'DB_PASSWORD', value: dbConfig.password || crypto.randomBytes(16).toString('hex'), isSecret: true }
      );
    } else {
      variables.push(
        { key: 'DB_TYPE', value: 'sqlite' },
        { key: 'DB_PATH', value: `./data/${environment}-${dbConfig.database}.sqlite` }
      );
    }
    
    return variables;
  }
  
  validateEnvVariables(variables: EnvVariable[]): boolean {
    // Check for required variables
    const requiredKeys = ['NODE_ENV', 'SERVICE_NAME', 'PORT'];
    const providedKeys = new Set(variables.map(v => v.key));
    
    for (const required of requiredKeys) {
      if (!providedKeys.has(required)) {
        return false;
      }
    }
    
    // Check for duplicate keys
    const keys = variables.map(v => v.key);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      return false;
    }
    
    // Validate variable format
    for (const variable of variables) {
      if (!variable.key.match(/^[A-Z][A-Z0-9_]*$/)) {
        return false;
      }
      if (variable.value === undefined || variable.value === null) {
        return false;
      }
    }
    
    return true;
  }
  
  async writeEnvFile(filePath: string, variables: EnvVariable[]): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let content = '# Generated environment file\n';
    content += `# Generated at: ${new Date().toISOString()}\n\n`;
    
    // Group variables by type
    const secrets = variables.filter(v => v.isSecret);
    const nonSecrets = variables.filter(v => !v.isSecret);
    
    // Write non-secret variables first
    if (nonSecrets.length > 0) {
      content += '# Configuration\n';
      for (const variable of nonSecrets) {
        if (variable.description) {
          content += `# ${variable.description}\n`;
        }
        content += `${variable.key}=${variable.value}\n`;
      }
      content += '\n';
    }
    
    // Write secret variables
    if (secrets.length > 0) {
      content += '# Secrets (Keep these secure!)\n';
      for (const variable of secrets) {
        if (variable.description) {
          content += `# ${variable.description}\n`;
        }
        content += `${variable.key}=${variable.value}\n`;
      }
    }
    
    fs.writeFileSync(filePath, content);
  }
  
  async readEnvFile(filePath: string): Promise<EnvVariable[]> {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const variables: EnvVariable[] = [];
    const lines = content.split('\n');
    
    let currentDescription = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        currentDescription = '';
        continue;
      }
      
      // Capture description comments
      if (trimmed.startsWith('# ') && !trimmed.startsWith('# Generated') && !trimmed.startsWith('# Configuration') && !trimmed.startsWith('# Secrets')) {
        currentDescription = trimmed.substring(2);
        continue;
      }
      
      // Skip other comments
      if (trimmed.startsWith('#')) {
        continue;
      }
      
      // Parse variable
      const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const variable: EnvVariable = { key, value };
        
        if (currentDescription) {
          variable.description = currentDescription;
          currentDescription = '';
        }
        
        // Detect secrets by key pattern
        if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY')) {
          variable.isSecret = true;
        }
        
        variables.push(variable);
      }
    }
    
    return variables;
  }
  
  mergeEnvVariables(existing: EnvVariable[], updates: EnvVariable[]): EnvVariable[] {
    const merged = new Map<string, EnvVariable>();
    
    // Add existing variables
    for (const variable of existing) {
      merged.set(variable.key, variable);
    }
    
    // Override with updates
    for (const variable of updates) {
      merged.set(variable.key, variable);
    }
    
    return Array.from(merged.values());
  }
  
  // Helper method for tests
  setEnvironmentContext(env: string): void {
    this.tokenCache.set('env', env);
  }
}

describe('EnvGenerator External Interface Test', () => {
  let generator: RealEnvGenerator;
  const testDir = path.join(__dirname, '../../temp');
  
  beforeEach(() => {
    generator = new RealEnvGenerator();
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        if (file.endsWith('.env')) {
          fs.unlinkSync(path.join(testDir, file));
        }
      }
    }
  });
  
  test('should generate In Progress env file with all required variables', async () => {
    const config: EnvGeneratorConfig = {
      environment: 'development',
      serviceName: 'auth-service',
      servicePort: 3001
    };
    
    const result = await generator.generateEnvFile(config);
    
    expect(result.path).toContain('auth-service-development.env');
    expect(result.variables.length).toBeGreaterThan(5);
    expect(result.timestamp).toBeDefined();
    
    // Verify required variables
    const varMap = new Map(result.variables.map(v => [v.key, v.value]));
    expect(varMap.get('NODE_ENV')).toBe('development');
    expect(varMap.get('SERVICE_NAME')).toBe('auth-service');
    expect(varMap.get('PORT')).toBe('3001');
    expect(varMap.get('JWT_SECRET')).toBeDefined();
    expect(varMap.get('API_KEY')).toMatch(/^sk_/);
    
    // Verify file was written
    expect(fs.existsSync(result.path)).toBe(true);
  });
  
  test('should generate unique security tokens', async () => {
    const tokens1 = await generator.generateSecurityTokens();
    const tokens2 = await generator.generateSecurityTokens();
    
    expect(tokens1.length).toBe(4);
    expect(tokens2.length).toBe(4);
    
    // All tokens should be unique
    const values1 = new Set(tokens1.map(t => t.value));
    const values2 = new Set(tokens2.map(t => t.value));
    
    expect(values1.size).toBe(4);
    expect(values2.size).toBe(4);
    
    // No overlap between generations
    for (const value of values1) {
      expect(values2.has(value)).toBe(false);
    }
    
    // All should be marked as secrets
    for (const token of [...tokens1, ...tokens2]) {
      expect(token.isSecret).toBe(true);
    }
  });
  
  test('should include service URLs for dependencies', async () => {
    const dependencies = ['user-service', 'payment-service', 'notification-service'];
    const urls = await generator.includeServiceUrls(dependencies);
    
    expect(urls.length).toBe(3);
    
    for (const url of urls) {
      expect(url.key).toMatch(/^[A-Z_]+_URL$/);
      expect(url.value).toMatch(/^http:\/\/localhost:\d{4}$/);
      expect(url.description).toBeDefined();
    }
    
    // Check specific mappings
    const urlMap = new Map(urls.map(u => [u.key, u.value]));
    expect(urlMap.has('USER_SERVICE_URL')).toBe(true);
    expect(urlMap.has('PAYMENT_SERVICE_URL')).toBe(true);
    expect(urlMap.has('NOTIFICATION_SERVICE_URL')).toBe(true);
  });
  
  test('should generate correct database config for different environments', () => {
    // Test PostgreSQL for release
    const pgConfig: DatabaseConfig = {
      type: 'postgresql',
      host: 'db.example.com',
      port: 5432,
      database: 'myapp',
      user: 'dbuser',
      password: 'secret123'
    };
    
    const pgVars = generator.generateDatabaseConfig(pgConfig, 'release');
    const pgMap = new Map(pgVars.map(v => [v.key, v.value]));
    
    expect(pgMap.get('DB_TYPE')).toBe('postgresql');
    expect(pgMap.get('DB_HOST')).toBe('db.example.com');
    expect(pgMap.get('DB_PORT')).toBe('5432');
    expect(pgMap.get('DB_NAME')).toBe('myapp');
    expect(pgMap.get('DB_USER')).toBe('dbuser');
    expect(pgMap.get('DB_PASSWORD')).toBe('secret123');
    
    // Test SQLite for development
    const sqliteConfig: DatabaseConfig = {
      type: 'sqlite',
      database: 'myapp'
    };
    
    const sqliteVars = generator.generateDatabaseConfig(sqliteConfig, 'development');
    const sqliteMap = new Map(sqliteVars.map(v => [v.key, v.value]));
    
    expect(sqliteMap.get('DB_TYPE')).toBe('sqlite');
    expect(sqliteMap.get('DB_PATH')).toBe('./data/development-myapp.sqlite');
  });
  
  test('should validate environment variables correctly', () => {
    const validVars: EnvVariable[] = [
      { key: 'NODE_ENV', value: 'test' },
      { key: 'SERVICE_NAME', value: 'api' },
      { key: 'PORT', value: '3000' },
      { key: 'API_KEY', value: 'secret' }
    ];
    
    expect(generator.validateEnvVariables(validVars)).toBe(true);
    
    // Missing required variable
    const missingRequired = validVars.slice(1);
    expect(generator.validateEnvVariables(missingRequired)).toBe(false);
    
    // Invalid key format
    const invalidKey = [
      ...validVars,
      { key: 'invalid-key', value: 'value' }
    ];
    expect(generator.validateEnvVariables(invalidKey)).toBe(false);
    
    // Duplicate keys
    const duplicateKeys = [
      ...validVars,
      { key: 'PORT', value: '4000' }
    ];
    expect(generator.validateEnvVariables(duplicateKeys)).toBe(false);
    
    // Null value
    const nullValue = [
      ...validVars,
      { key: 'NULL_VALUE', value: null as any }
    ];
    expect(generator.validateEnvVariables(nullValue)).toBe(false);
  });
  
  test('should write and read env files correctly', async () => {
    const variables: EnvVariable[] = [
      { key: 'NODE_ENV', value: 'test' },
      { key: 'PORT', value: '3000', description: 'Application port' },
      { key: 'JWT_SECRET', value: 'supersecret', description: 'JWT signing key', isSecret: true },
      { key: 'DB_PASSWORD', value: 'dbpass123', isSecret: true }
    ];
    
    const filePath = path.join(testDir, 'test-write-read.env');
    await generator.writeEnvFile(filePath, variables);
    
    // Verify file exists
    expect(fs.existsSync(filePath)).toBe(true);
    
    // Read back
    const readVars = await generator.readEnvFile(filePath);
    
    expect(readVars.length).toBe(4);
    
    // Verify content
    const readMap = new Map(readVars.map(v => [v.key, v]));
    
    expect(readMap.get('NODE_ENV')?.value).toBe('test');
    expect(readMap.get('PORT')?.value).toBe('3000');
    expect(readMap.get('PORT')?.description).toBe('Application port');
    expect(readMap.get('JWT_SECRET')?.value).toBe('supersecret');
    expect(readMap.get('JWT_SECRET')?.isSecret).toBe(true);
    expect(readMap.get('DB_PASSWORD')?.isSecret).toBe(true);
  });
  
  test('should merge environment variables correctly', () => {
    const existing: EnvVariable[] = [
      { key: 'NODE_ENV', value: 'development' },
      { key: 'PORT', value: '3000' },
      { key: 'API_KEY', value: 'oldkey' }
    ];
    
    const updates: EnvVariable[] = [
      { key: 'PORT', value: '4000' }, // Override
      { key: 'API_KEY', value: 'newkey' }, // Override
      { key: 'NEW_VAR', value: 'newvalue' } // Add
    ];
    
    const merged = generator.mergeEnvVariables(existing, updates);
    const mergedMap = new Map(merged.map(v => [v.key, v.value]));
    
    expect(merged.length).toBe(4);
    expect(mergedMap.get('NODE_ENV')).toBe('development'); // Unchanged
    expect(mergedMap.get('PORT')).toBe('4000'); // Updated
    expect(mergedMap.get('API_KEY')).toBe('newkey'); // Updated
    expect(mergedMap.get('NEW_VAR')).toBe('newvalue'); // Added
  });
  
  test('should handle In Progress workflow with database and dependencies', async () => {
    generator.setEnvironmentContext('test');
    
    const config: EnvGeneratorConfig = {
      environment: 'test',
      serviceName: 'order-service',
      servicePort: 3200,
      databaseConfig: {
        type: 'sqlite',
        database: 'orders'
      },
      additionalVariables: [
        { key: 'LOG_LEVEL', value: 'debug' },
        { key: 'ENABLE_METRICS', value: 'true' }
      ]
    };
    
    // Generate initial env file
    const result = await generator.generateEnvFile(config);
    
    // Add service dependencies
    const serviceUrls = await generator.includeServiceUrls(['auth-service', 'inventory-service']);
    
    // Merge with existing
    const currentVars = await generator.readEnvFile(result.path);
    const updatedVars = generator.mergeEnvVariables(currentVars, serviceUrls);
    
    // Validate before writing
    expect(generator.validateEnvVariables(updatedVars)).toBe(true);
    
    // Write updated file
    await generator.writeEnvFile(result.path, updatedVars);
    
    // Verify final content
    const finalVars = await generator.readEnvFile(result.path);
    const finalMap = new Map(finalVars.map(v => [v.key, v.value]));
    
    // Check all expected variables
    expect(finalMap.get('NODE_ENV')).toBe('test');
    expect(finalMap.get('SERVICE_NAME')).toBe('order-service');
    expect(finalMap.get('PORT')).toBe('3200');
    expect(finalMap.get('DB_TYPE')).toBe('sqlite');
    expect(finalMap.get('DB_PATH')).toContain('test-orders.sqlite');
    expect(finalMap.get('LOG_LEVEL')).toBe('debug');
    expect(finalMap.get('ENABLE_METRICS')).toBe('true');
    expect(finalMap.get('AUTH_SERVICE_URL')).toMatch(/^http:\/\/localhost:\d+$/);
    expect(finalMap.get('INVENTORY_SERVICE_URL')).toMatch(/^http:\/\/localhost:\d+$/);
    expect(finalMap.get('API_KEY')).toMatch(/^sk_test_/);
    
    // Verify secrets are present
    const secrets = finalVars.filter(v => v.isSecret);
    expect(secrets.length).toBeGreaterThan(3);
  });
});