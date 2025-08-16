import { EnvGenerator, TokenService } from '../../src/external_interface/pipe';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../../layer/themes/infra_external-log-lib/dist';

describe('EnvGenerator integrates with TokenService', () => {
  const testDir = path.join(process.cwd(), 'temp/test-env-integration');
  let envGenerator: EnvGenerator;
  let tokenService: TokenService;

  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);
    
    // Initialize services
    envGenerator = new EnvGenerator();
    tokenService = new TokenService({ 
      prefix: 'TEST_',
      tokenLength: 32 
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('Then EnvGenerator integrates with TokenService to include security tokens', () => {
    it('should generate .env file with security tokens when tokenService is set', async () => {
      // Given: EnvGenerator with configuration
      envGenerator.addConfig('APP_NAME', 'test-app');
      envGenerator.addConfig('APP_PORT', 3000);
      envGenerator.addConfig('DB_TYPE', 'sqlite');
      
      // And: TokenService is integrated with EnvGenerator
      envGenerator.setTokenService(tokenService);

      // When: Generate env file with tokens included
      const outputPath = path.join(testDir, '.env');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeTokens: true
      });

      // Then: File should exist
      expect(await fs.pathExists(outputPath)).toBe(true);

      // And: Content should include basic config
      expect(content).toContain('APP_NAME=test-app');
      expect(content).toContain('APP_PORT=3000');
      expect(content).toContain('DB_TYPE=sqlite');

      // And: Content should include environment
      expect(content).toContain('NODE_ENV=development');

      // And: Content should include security tokens
      expect(content).toContain('# Security Tokens');
      expect(content).toContain('TEST_API_KEY=');
      expect(content).toContain('TEST_SECRET=');
      expect(content).toContain('TEST_JWT_SECRET=');
      expect(content).toContain('TEST_SESSION_SECRET=');
      expect(content).toContain('TEST_REFRESH_TOKEN=');
      expect(content).toContain('TEST_DEV_KEY=dev-');

      // And: Tokens should be valid hex strings
      const lines = content.split('\n');
      const tokenLines = lines.filter(line => line.startsWith('TEST_'));
      tokenLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key !== 'TEST_DEV_KEY') {
          expect(value).toMatch(/^[a-f0-9]+$/i);
        } else {
          expect(value).toMatch(/^dev-[a-f0-9]+$/i);
        }
      });
    });

    it('should generate different tokens for different environments', async () => {
      // Given: EnvGenerator with tokenService
      envGenerator.setTokenService(tokenService);
      envGenerator.addConfig('APP_NAME', 'test-app');

      // When: Generate for development environment
      const devPath = path.join(testDir, '.env.development');
      const devContent = await envGenerator.generate({
        outputPath: devPath,
        environment: 'development',
        includeTokens: true
      });

      // And: Generate for production environment
      const prodPath = path.join(testDir, '.env.production');
      const prodContent = await envGenerator.generate({
        outputPath: prodPath,
        environment: 'production',
        includeTokens: true
      });

      // Then: Both files should exist
      expect(await fs.pathExists(devPath)).toBe(true);
      expect(await fs.pathExists(prodPath)).toBe(true);

      // And: Development should have dev-specific tokens
      expect(devContent).toContain('TEST_DEV_KEY=dev-');
      expect(devContent).not.toContain('TEST_PROD_KEY=');
      
      // And: Production should have prod-specific tokens
      expect(prodContent).toContain('TEST_PROD_KEY=');
      expect(prodContent).toContain('TEST_ENCRYPTION_KEY=');
      expect(prodContent).not.toContain('TEST_DEV_KEY=');

      // And: Token values should be different between environments
      const getTokenValue = (content: string, key: string): string | null => {
        const match = content.match(new RegExp(`${key}=([a-f0-9-]+)`, 'i'));
        return match ? match[1] : null;
      };

      const devApiKey = getTokenValue(devContent, 'TEST_API_KEY');
      const prodApiKey = getTokenValue(prodContent, 'TEST_API_KEY');
      expect(devApiKey).not.toBe(prodApiKey);
      expect(devApiKey).toBeTruthy();
      expect(prodApiKey).toBeTruthy();
    });

    it('should generate .env file without tokens when includeTokens is false', async () => {
      // Given: EnvGenerator with configuration and tokenService
      envGenerator.addConfig('APP_NAME', 'test-app');
      envGenerator.addConfig('APP_PORT', 3000);
      envGenerator.setTokenService(tokenService);

      // When: Generate without tokens
      const outputPath = path.join(testDir, '.env');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeTokens: false
      });

      // Then: Content should not include tokens
      expect(content).not.toContain('# Security Tokens');
      expect(content).not.toContain('TEST_API_KEY=');
      expect(content).not.toContain('TEST_SECRET=');
    });

    it('should generate .env file without tokens when tokenService is not set', async () => {
      // Given: EnvGenerator without tokenService
      envGenerator.addConfig('APP_NAME', 'test-app');
      envGenerator.addConfig('APP_PORT', 3000);

      // When: Generate with includeTokens true but no tokenService
      const outputPath = path.join(testDir, '.env');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeTokens: true
      });

      // Then: Content should not include tokens
      expect(content).not.toContain('# Security Tokens');
      expect(content).not.toContain('TEST_');
    });

    it('should cache tokens for same environment', async () => {
      // Given: EnvGenerator with tokenService
      envGenerator.setTokenService(tokenService);
      envGenerator.addConfig('APP_NAME', 'test-app');

      // When: Generate multiple times for same environment
      const path1 = path.join(testDir, '.env.1');
      const content1 = await envGenerator.generate({
        outputPath: path1,
        environment: 'development',
        includeTokens: true
      });

      const path2 = path.join(testDir, '.env.2');
      const content2 = await envGenerator.generate({
        outputPath: path2,
        environment: 'development',
        includeTokens: true
      });

      // Then: Token values should be identical (cached)
      const getTokenValue = (content: string, key: string): string | null => {
        const match = content.match(new RegExp(`${key}=([a-f0-9-]+)`, 'i'));
        return match ? match[1] : null;
      };

      const apiKey1 = getTokenValue(content1, 'TEST_API_KEY');
      const apiKey2 = getTokenValue(content2, 'TEST_API_KEY');
      expect(apiKey1).toBe(apiKey2);
    });

    it('should handle complex configuration with tokens', async () => {
      // Given: Complex configuration
      envGenerator.addConfigs({
        APP_NAME: 'complex-app',
        APP_VERSION: '1.0.0',
        APP_PORT: 3000,
        API_URL: 'http://localhost:4000',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'testdb',
        CACHE_ENABLED: true,
        MAX_CONNECTIONS: 100,
      });
      envGenerator.setTokenService(tokenService);

      // When: Generate with tokens
      const outputPath = path.join(testDir, '.env.complex');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'staging',
        includeTokens: true
      });

      // Then: All config should be present
      expect(content).toContain('APP_NAME=complex-app');
      expect(content).toContain('APP_VERSION=1.0.0');
      expect(content).toContain('CACHE_ENABLED=true');
      expect(content).toContain('MAX_CONNECTIONS=100');

      // And: Tokens should be present
      expect(content).toContain('TEST_API_KEY=');
      expect(content).toContain('TEST_SECRET=');
    });
  });
});