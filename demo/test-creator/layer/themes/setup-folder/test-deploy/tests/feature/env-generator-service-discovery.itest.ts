import { EnvGenerator, ServiceDiscovery } from '../../src/external_interface/pipe';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../../layer/themes/infra_external-log-lib/dist';

describe('EnvGenerator integrates with ServiceDiscovery', () => {
  const testDir = path.join(process.cwd(), 'temp/test-env-service-discovery');
  let envGenerator: EnvGenerator;
  let serviceDiscovery: ServiceDiscovery;

  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);
    
    // Initialize services
    envGenerator = new EnvGenerator();
    serviceDiscovery = new ServiceDiscovery();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('Then EnvGenerator integrates with ServiceDiscovery for service URLs', () => {
    it('should include discovered service URLs in generated .env file', async () => {
      // Given: ServiceDiscovery with registered services
      serviceDiscovery.registerService('auth-service', {
        name: 'Authentication Service',
        url: 'http://localhost:3001',
        port: 3001,
        protocol: 'http'
      });
      
      serviceDiscovery.registerService('api-gateway', {
        name: 'API Gateway',
        url: 'http://localhost:3000',
        port: 3000,
        protocol: 'http'
      });

      serviceDiscovery.registerService('database-service', {
        name: 'Database Service',
        url: 'postgres://localhost:5432',
        port: 5432,
        protocol: 'postgres'
      });

      // And: EnvGenerator with basic configuration
      envGenerator.addConfig('APP_NAME', 'test-app');
      envGenerator.addConfig('NODE_ENV', 'development');
      
      // And: ServiceDiscovery is integrated with EnvGenerator
      envGenerator.setServiceDiscovery(serviceDiscovery);

      // When: Generate env file with service discovery
      const outputPath = path.join(testDir, '.env');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeServiceUrls: true
      });

      // Then: File should exist
      expect(await fs.pathExists(outputPath)).toBe(true);

      // And: Content should include basic config
      expect(content).toContain('APP_NAME=test-app');
      expect(content).toContain('NODE_ENV=development');

      // And: Content should include service URLs section
      expect(content).toContain('# Service URLs');
      expect(content).toContain('AUTH_SERVICE_URL=http://localhost:3001');
      expect(content).toContain('API_GATEWAY_URL=http://localhost:3000');
      expect(content).toContain('DATABASE_SERVICE_URL=postgres://localhost:5432');

      // And: Content should include service ports
      expect(content).toContain('AUTH_SERVICE_PORT=3001');
      expect(content).toContain('API_GATEWAY_PORT=3000');
      expect(content).toContain('DATABASE_SERVICE_PORT=5432');
    });

    it('should handle environment-specific service URLs', async () => {
      // Given: ServiceDiscovery with environment-specific services
      serviceDiscovery.registerService('api-service', {
        name: 'API Service',
        environments: {
          development: { url: 'http://localhost:4000', port: 4000 },
          staging: { url: 'https://staging-api.example.com', port: 443 },
          production: { url: 'https://api.example.com', port: 443 }
        }
      });

      envGenerator.setServiceDiscovery(serviceDiscovery);
      envGenerator.addConfig('APP_NAME', 'multi-env-app');

      // When: Generate for different environments
      const devPath = path.join(testDir, '.env.development');
      const devContent = await envGenerator.generate({
        outputPath: devPath,
        environment: 'development',
        includeServiceUrls: true
      });

      const stagingPath = path.join(testDir, '.env.staging');
      const stagingContent = await envGenerator.generate({
        outputPath: stagingPath,
        environment: 'staging',
        includeServiceUrls: true
      });

      // Then: Development environment should have local URL
      expect(devContent).toContain('API_SERVICE_URL=http://localhost:4000');
      expect(devContent).toContain('API_SERVICE_PORT=4000');

      // And: Staging environment should have staging URL
      expect(stagingContent).toContain('API_SERVICE_URL=https://staging-api.example.com');
      expect(stagingContent).toContain('API_SERVICE_PORT=443');
    });

    it('should handle service dependencies and generate dependency URLs', async () => {
      // Given: Services with dependencies
      serviceDiscovery.registerService('user-service', {
        name: 'User Service',
        url: 'http://localhost:5001',
        port: 5001,
        dependencies: ['auth-service', 'database-service']
      });

      serviceDiscovery.registerService('auth-service', {
        name: 'Auth Service',
        url: 'http://localhost:5002',
        port: 5002,
        dependencies: ['database-service']
      });

      serviceDiscovery.registerService('database-service', {
        name: 'Database Service',
        url: 'postgres://localhost:5432',
        port: 5432
      });

      envGenerator.setServiceDiscovery(serviceDiscovery);

      // When: Generate with dependency resolution
      const outputPath = path.join(testDir, '.env.deps');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeServiceUrls: true,
        includeDependencies: true
      });

      // Then: Should include all services
      expect(content).toContain('USER_SERVICE_URL=http://localhost:5001');
      expect(content).toContain('AUTH_SERVICE_URL=http://localhost:5002');
      expect(content).toContain('DATABASE_SERVICE_URL=postgres://localhost:5432');

      // And: Should include dependency information
      expect(content).toContain('# Service Dependencies');
      expect(content).toContain('USER_SERVICE_DEPENDENCIES=auth-service,database-service');
      expect(content).toContain('AUTH_SERVICE_DEPENDENCIES=database-service');
    });

    it('should not include service URLs when includeServiceUrls is false', async () => {
      // Given: ServiceDiscovery with services
      serviceDiscovery.registerService('test-service', {
        name: 'Test Service',
        url: 'http://localhost:9000',
        port: 9000
      });

      envGenerator.setServiceDiscovery(serviceDiscovery);
      envGenerator.addConfig('APP_NAME', 'no-services-app');

      // When: Generate without service URLs
      const outputPath = path.join(testDir, '.env.no-services');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeServiceUrls: false
      });

      // Then: Should not include service URLs
      expect(content).not.toContain('# Service URLs');
      expect(content).not.toContain('TEST_SERVICE_URL');
      expect(content).not.toContain('TEST_SERVICE_PORT');
    });

    it('should generate empty service section when no services are registered', async () => {
      // Given: Empty ServiceDiscovery
      envGenerator.setServiceDiscovery(serviceDiscovery);
      envGenerator.addConfig('APP_NAME', 'empty-services-app');

      // When: Generate with service URLs enabled
      const outputPath = path.join(testDir, '.env.empty');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeServiceUrls: true
      });

      // Then: Should include service section header but no services
      expect(content).toContain('# Service URLs');
      expect(content).not.toContain('_SERVICE_URL=');
      expect(content).not.toContain('_SERVICE_PORT=');
    });

    it('should handle service discovery with both tokens and service URLs', async () => {
      // Given: Both TokenService and ServiceDiscovery
      const { TokenService } = await import('../../src/external_interface/pipe');
      const tokenService = new TokenService({ prefix: 'SEC_' });
      
      serviceDiscovery.registerService('secure-api', {
        name: 'Secure API',
        url: 'https://secure-api.example.com',
        port: 443,
        requiresAuth: true
      });

      envGenerator.setTokenService(tokenService);
      envGenerator.setServiceDiscovery(serviceDiscovery);
      envGenerator.addConfig('APP_NAME', 'secure-app');

      // When: Generate with both tokens and service URLs
      const outputPath = path.join(testDir, '.env.secure');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'production',
        includeTokens: true,
        includeServiceUrls: true
      });

      // Then: Should include both sections
      expect(content).toContain('# Security Tokens');
      expect(content).toContain('SEC_API_KEY=');
      expect(content).toContain('# Service URLs');
      expect(content).toContain('SECURE_API_URL=https://secure-api.example.com');
      expect(content).toContain('SECURE_API_REQUIRES_AUTH=true');
    });

    it('should format service names correctly for environment variables', async () => {
      // Given: Services with various naming conventions
      serviceDiscovery.registerService('my-awesome-service', {
        name: 'My Awesome Service',
        url: 'http://localhost:7000',
        port: 7000
      });

      serviceDiscovery.registerService('service.with.dots', {
        name: 'Service With Dots',
        url: 'http://localhost:7001',
        port: 7001
      });

      serviceDiscovery.registerService('service_with_underscores', {
        name: 'Service With Underscores',
        url: 'http://localhost:7002',
        port: 7002
      });

      envGenerator.setServiceDiscovery(serviceDiscovery);

      // When: Generate env file
      const outputPath = path.join(testDir, '.env.naming');
      const content = await envGenerator.generate({
        outputPath,
        environment: 'development',
        includeServiceUrls: true
      });

      // Then: Service names should be properly formatted
      expect(content).toContain('MY_AWESOME_SERVICE_URL=');
      expect(content).toContain('SERVICE_WITH_DOTS_URL=');
      expect(content).toContain('SERVICE_WITH_UNDERSCORES_URL=');
    });
  });
});