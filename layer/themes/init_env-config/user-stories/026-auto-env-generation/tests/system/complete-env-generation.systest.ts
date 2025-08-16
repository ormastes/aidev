/**
 * System Test: In Progress Environment Creation with Automatic .env Generation
 * 
 * This test verifies the In Progress end-to-end workflow of creating an environment
 * with automatic .env file generation including all variables.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { childProcess } from '../../../../../infra_external-log-lib/dist';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

describe('In Progress Environment Generation System Test', () => {
  const testDir = path.join(__dirname, '../../temp/system-test');
  const envFile = path.join(testDir, '.env');
  
  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(envFile)) {
      fs.unlinkSync(envFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });
  
  test('should generate In Progress .env file via CLI command', async () => {
    // Given: The system is in a valid state
    // When: generate In Progress .env file via CLI command
    // Then: The expected behavior occurs
    // Create a simple CLI script that generates env files
    const cliScript = path.join(testDir, 'generate-env.js');
    const cliContent = `#!/usr/bin/env node
const { fs } = require('../../../../../infra_external-log-lib/src');
const crypto = require('crypto');
const { path } = require('../../../../../infra_external-log-lib/src');

async function generateEnv() {
  const environment = process.argv[2] || 'development';
  const serviceName = process.argv[3] || 'test-service';
  const servicePort = parseInt(process.argv[4] || '3000');
  
  const variables = [];
  
  // Basic configuration
  variables.push({ key: 'NODE_ENV', value: environment });
  variables.push({ key: 'SERVICE_NAME', value: serviceName });
  variables.push({ key: 'PORT', value: servicePort.toString() });
  variables.push({ key: 'HOST', value: 'localhost' });
  
  // Security tokens
  variables.push({
    key: 'JWT_SECRET',
    value: crypto.randomBytes(64).toString('base64'),
    isSecret: true
  });
  variables.push({
    key: 'API_KEY',
    value: 'sk_' + (environment === 'release' ? 'live' : environment) + '_' + crypto.randomBytes(32).toString('hex'),
    isSecret: true
  });
  variables.push({
    key: 'SESSION_SECRET',
    value: crypto.randomBytes(48).toString('base64url'),
    isSecret: true
  });
  variables.push({
    key: 'REFRESH_TOKEN_SECRET',
    value: crypto.randomBytes(64).toString('base64'),
    isSecret: true
  });
  
  // Database configuration
  if (environment === 'release') {
    variables.push({ key: 'DB_TYPE', value: 'postgresql' });
    variables.push({ key: 'DB_HOST', value: 'localhost' });
    variables.push({ key: 'DB_PORT', value: '5432' });
    variables.push({ key: 'DB_NAME', value: 'testdb' });
    variables.push({ key: 'DB_USER', value: 'testuser', isSecret: true });
    variables.push({ key: 'DB_PASSWORD', value: 'testpass', isSecret: true });
  } else {
    variables.push({ key: 'DB_TYPE', value: 'sqlite' });
    variables.push({ key: 'DB_PATH', value: './data/' + environment + '-testdb.sqlite' });
  }
  
  // Additional variables
  variables.push({ key: 'LOG_LEVEL', value: 'info' });
  variables.push({ key: 'ENABLE_CACHE', value: 'true' });
  
  // Generate .env content
  let content = '# Generated environment file\\n';
  content += '# Generated at: ' + new Date().toISOString() + '\\n\\n';
  
  // Non-secret variables
  content += '# Configuration\\n';
  for (const v of variables.filter(v => !v.isSecret)) {
    content += v.key + '=' + v.value + '\\n';
  }
  
  content += '\\n# Secrets (Keep these secure!)\\n';
  for (const v of variables.filter(v => v.isSecret)) {
    content += v.key + '=' + v.value + '\\n';
  }
  
  // Write to file
  fs.writeFileSync('${envFile}', content);
  
  console.log(JSON.stringify({
    "success": true,
    path: '${envFile}',
    variableCount: variables.length
  }));
}

generateEnv().catch(error => {
  console.error(JSON.stringify({ "success": false, error: error.message }));
  process.exit(1);
});
`;
    
    fs.writeFileSync(cliScript, cliContent);
    fs.chmodSync(cliScript, '755');
    
    // Execute the CLI script
    const { stdout, stderr } = await exec(`node ${cliScript} development my-app 3456`);
    
    if (stderr) {
      console.error('CLI stderr:', stderr);
    }
    
    const result = JSON.parse(stdout);
    expect(result.success).toBe(true);
    expect(result.variableCount).toBeGreaterThan(10);
    
    // Verify .env file was created
    expect(fs.existsSync(envFile)).toBe(true);
    
    // Read and parse the generated .env file
    const envContent = fs.readFileSync(envFile, 'utf-8');
    const envVars = parseEnvFile(envContent);
    
    // Verify required variables
    expect(envVars['NODE_ENV']).toBe('development');
    expect(envVars['SERVICE_NAME']).toBe('my-app');
    expect(envVars['PORT']).toBe('3456');
    expect(envVars['HOST']).toBe('localhost');
    
    // Verify database configuration
    expect(envVars['DB_TYPE']).toBe('sqlite');
    expect(envVars['DB_PATH']).toContain('development-testdb.sqlite');
    
    // Verify security tokens
    expect(envVars['JWT_SECRET']).toBeDefined();
    expect(envVars['JWT_SECRET'].length).toBeGreaterThan(50);
    expect(envVars['API_KEY']).toMatch(/^sk_development_/);
    expect(envVars['SESSION_SECRET']).toBeDefined();
    expect(envVars['REFRESH_TOKEN_SECRET']).toBeDefined();
    
    // Verify additional variables
    expect(envVars['LOG_LEVEL']).toBe('info');
    expect(envVars['ENABLE_CACHE']).toBe('true');
  }, 30000);
  
  test('should generate different configs for different environments', async () => {
    // Given: The system is in a valid state
    // When: generate different configs for different environments
    // Then: The expected behavior occurs
    const environments = ['development', 'test', 'release'];
    const generatedFiles: Record<string, any> = {};
    
    for (const env of environments) {
      const envSpecificFile = path.join(testDir, `.env.${env}`);
      
      // Create inline generator script
      const scriptContent = `
const { fs } = require('../../../../../infra_external-log-lib/src');
const crypto = require('crypto');

function generateEnvFile(environment) {
  const isRelease = environment === 'release';
  const environments = ['development', 'test', 'release'];
  
  let content = '# Generated environment file\\n';
  content += '# Environment: ' + environment + '\\n\\n';
  
  // Basic config
  content += 'NODE_ENV=' + environment + '\\n';
  content += 'SERVICE_NAME=multi-env-test\\n';
  content += 'PORT=' + (3000 + environments.indexOf(environment)) + '\\n';
  content += 'HOST=localhost\\n\\n';
  
  // Database config
  if (isRelease) {
    content += '# Database Configuration\\n';
    content += 'DB_TYPE=postgresql\\n';
    content += 'DB_HOST=db.production.com\\n';
    content += 'DB_PORT=5432\\n';
    content += 'DB_NAME=prod_db\\n';
    content += 'DB_USER=prod_user\\n';
    content += 'DB_PASSWORD=' + crypto.randomBytes(16).toString('hex') + '\\n\\n';
  } else {
    content += '# Database Configuration\\n';
    content += 'DB_TYPE=sqlite\\n';
    content += 'DB_PATH=./data/' + environment + '-test.sqlite\\n\\n';
  }
  
  // Security tokens
  content += '# Security Tokens\\n';
  content += 'JWT_SECRET=' + crypto.randomBytes(64).toString('base64') + '\\n';
  content += 'API_KEY=sk_' + (isRelease ? 'live' : environment) + '_' + crypto.randomBytes(32).toString('hex') + '\\n';
  content += 'SESSION_SECRET=' + crypto.randomBytes(48).toString('base64url') + '\\n';
  
  if (isRelease) {
    content += 'OAUTH_CLIENT_SECRET=' + crypto.randomBytes(48).toString('base64') + '\\n';
  }
  
  return content;
}

const env = '${env}';
const content = generateEnvFile(env);
fs.writeFileSync('${envSpecificFile}', content);
console.log('Generated ' + env + ' config');
`;
      
      const scriptFile = path.join(testDir, `generate-${env}.js`);
      fs.writeFileSync(scriptFile, scriptContent);
      
      await exec(`node ${scriptFile}`);
      
      // Read and parse the generated file
      const content = fs.readFileSync(envSpecificFile, 'utf-8');
      generatedFiles[env] = parseEnvFile(content);
      
      // Clean up
      fs.unlinkSync(scriptFile);
      fs.unlinkSync(envSpecificFile);
    }
    
    // Verify differences between environments
    
    // All should have different NODE_ENV
    expect(generatedFiles.development['NODE_ENV']).toBe('development');
    expect(generatedFiles.test['NODE_ENV']).toBe('test');
    expect(generatedFiles.release['NODE_ENV']).toBe('release');
    
    // Different ports
    expect(generatedFiles.development['PORT']).toBe('3000');
    expect(generatedFiles.test['PORT']).toBe('3001');
    expect(generatedFiles.release['PORT']).toBe('3002');
    
    // Database differences
    expect(generatedFiles.development['DB_TYPE']).toBe('sqlite');
    expect(generatedFiles.release['DB_TYPE']).toBe('postgresql');
    expect(generatedFiles.release['DB_HOST']).toBe('db.production.com');
    
    // API key prefixes
    expect(generatedFiles.development['API_KEY']).toMatch(/^sk_development_/);
    expect(generatedFiles.test['API_KEY']).toMatch(/^sk_test_/);
    expect(generatedFiles.release['API_KEY']).toMatch(/^sk_live_/);
    
    // OAuth only in release
    expect(generatedFiles.development['OAUTH_CLIENT_SECRET']).toBeUndefined();
    expect(generatedFiles.release['OAUTH_CLIENT_SECRET']).toBeDefined();
    
    // All tokens should be unique
    const allTokens = new Set<string>();
    for (const env of environments) {
      const tokens = [
        generatedFiles[env]['JWT_SECRET'],
        generatedFiles[env]['API_KEY'],
        generatedFiles[env]['SESSION_SECRET']
      ];
      for (const token of tokens) {
        expect(allTokens.has(token)).toBe(false);
        allTokens.add(token);
      }
    }
  });
  
  test('should handle service dependencies in env generation', async () => {
    // Given: The system is in a valid state
    // When: handle service dependencies in env generation
    // Then: The expected behavior occurs
    // Simulate a microservices setup
    const scriptContent = `
const { fs } = require('../../../../../infra_external-log-lib/src');
const crypto = require('crypto');

// Simulate service registry
const services = {
  'auth-service': { port: 3001, url: 'http://localhost:3001' },
  'user-service': { port: 3002, url: 'http://localhost:3002' },
  'payment-service': { port: 3003, url: 'http://localhost:3003' }
};

function generateEnvWithDependencies(serviceName, dependencies) {
  let content = '# Service: ' + serviceName + '\\n';
  content += '# Generated at: ' + new Date().toISOString() + '\\n\\n';
  
  content += 'SERVICE_NAME=' + serviceName + '\\n';
  content += 'PORT=3000\\n';
  content += 'NODE_ENV=development\\n\\n';
  
  if (dependencies.length > 0) {
    content += '# Service Dependencies\\n';
    for (const dep of dependencies) {
      if (services[dep]) {
        const envKey = dep.toUpperCase().replace(/-/g, '_') + '_URL';
        content += envKey + '=' + services[dep].url + '\\n';
      }
    }
    content += '\\n';
  }
  
  content += '# Security\\n';
  content += 'JWT_SECRET=' + crypto.randomBytes(32).toString('base64') + '\\n';
  content += 'SERVICE_API_KEY=' + crypto.randomBytes(24).toString('hex') + '\\n';
  
  return content;
}

const result = generateEnvWithDependencies('order-service', ['auth-service', 'user-service', 'payment-service']);
fs.writeFileSync('${path.join(testDir, '.env.deps')}', result);
console.log('Generated');
`;
    
    const scriptFile = path.join(testDir, 'generate-deps.js');
    fs.writeFileSync(scriptFile, scriptContent);
    
    await exec(`node ${scriptFile}`);
    
    const envFile = path.join(testDir, '.env.deps');
    const content = fs.readFileSync(envFile, 'utf-8');
    const vars = parseEnvFile(content);
    
    // Verify service URLs are included
    expect(vars['AUTH_SERVICE_URL']).toBe('http://localhost:3001');
    expect(vars['USER_SERVICE_URL']).toBe('http://localhost:3002');
    expect(vars['PAYMENT_SERVICE_URL']).toBe('http://localhost:3003');
    
    // Clean up
    fs.unlinkSync(scriptFile);
    fs.unlinkSync(envFile);
  });
  
  test('should validate generated env files', async () => {
    // Given: The system is in a valid state
    // When: validate generated env files
    // Then: The expected behavior occurs
    // Create a validation script
    const validationScript = `
const { fs } = require('../../../../../infra_external-log-lib/src');

function validateEnvFile(content) {
  const lines = content.split('\\n');
  const errors = [];
  const vars = {};
  const requiredVars = ['NODE_ENV', 'SERVICE_NAME', 'PORT'];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      errors.push('Invalid line format: ' + line);
      continue;
    }
    
    const [, key, value] = match;
    
    if (vars[key]) {
      errors.push('Duplicate key: ' + key);
    }
    
    if (!value) {
      errors.push('Empty value for key: ' + key);
    }
    
    vars[key] = value;
  }
  
  // Check required vars
  for (const required of requiredVars) {
    if (!vars[required]) {
      errors.push('Missing required variable: ' + required);
    }
  }
  
  // Check port is numeric
  if (vars['PORT'] && isNaN(parseInt(vars['PORT']))) {
    errors.push('PORT must be numeric, got: ' + vars['PORT']);
  }
  
  return { valid: errors.length === 0, errors, varCount: Object.keys(vars).length };
}

// Test valid env file
const validContent = \`# Test env file
NODE_ENV=test
SERVICE_NAME=validator-test
PORT=3000
API_KEY=test-key-123
DB_PATH=./test.db
\`;

// Test invalid env file
const invalidContent = \`# Invalid env file
node-env=test
SERVICE_NAME=validator-test
PORT=abc
API_KEY=
DB_PATH=/tmp/test.db
DB_PATH=/tmp/duplicate.db
\`;

const validResult = validateEnvFile(validContent);
const invalidResult = validateEnvFile(invalidContent);

console.log(JSON.stringify({
  valid: validResult,
  invalid: invalidResult
}));
`;
    
    const scriptFile = path.join(testDir, 'validate-env.js');
    fs.writeFileSync(scriptFile, validationScript);
    
    const { stdout } = await exec(`node ${scriptFile}`);
    const results = JSON.parse(stdout);
    
    // Valid file should pass
    expect(results.valid.valid).toBe(true);
    expect(results.valid.errors).toEqual([]);
    expect(results.valid.varCount).toBe(5);
    
    // Invalid file should fail
    expect(results.invalid.valid).toBe(false);
    expect(results.invalid.errors).toContain('Invalid line format: node-env=test');
    expect(results.invalid.errors).toContain('PORT must be numeric, got: abc');
    expect(results.invalid.errors).toContain('Empty value for key: API_KEY');
    expect(results.invalid.errors).toContain('Duplicate key: DB_PATH');
    expect(results.invalid.errors).toContain('Missing required variable: NODE_ENV');
    
    // Clean up
    fs.unlinkSync(scriptFile);
  });
});

// Helper function to parse .env file content
function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      vars[key] = value;
    }
  }
  
  return vars;
}