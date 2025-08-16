/**
 * Scenario Test: Database configuration differs correctly between release (PostgreSQL) and other environments (SQLite)
 * 
 * This test verifies that database configurations are correctly set based on the environment type,
 * with production/release environments using PostgreSQL and development/test environments using SQLite.
 */

import { EnvGenerator, EnvGeneratorConfig, DatabaseConfig } from '../../src/external/env-generator';
import { EnvGeneratorImpl } from '../../src/implementations/env-generator-impl';
import { ServiceDiscoveryImpl } from '../../src/implementations/service-discovery-impl';
import { TokenServiceImpl } from '../../src/implementations/token-service-impl';

describe('Scenario: Database configuration differs correctly between release (PostgreSQL) and other environments (SQLite)', () => {
  let envGenerator: EnvGenerator;
  
  beforeEach(() => {
    const serviceDiscovery = new ServiceDiscoveryImpl();
    const tokenService = new TokenServiceImpl();
    envGenerator = new EnvGeneratorImpl(serviceDiscovery, tokenService);
  });
  
  it('should use PostgreSQL for release environment', async () => {
    // Given: Release environment configuration with database
    const config: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'production-app',
      servicePort: 443,
      databaseConfig: {
        type: "postgresql",
        host: 'db.production.com',
        port: 5432,
        database: 'prod_db',
        user: 'prod_user',
        password: "PLACEHOLDER"
      }
    };
    
    // When: Generating env file for release
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should include PostgreSQL configuration
    expect(result.content).toContain('DB_TYPE=postgresql');
    expect(result.content).toContain('DB_HOST=db.production.com');
    expect(result.content).toContain('DB_PORT=5432');
    expect(result.content).toContain('DB_USER=prod_user');
    expect(result.content).toContain('DB_PASSWORD=secure_password');
    expect(result.content).toContain('DB_NAME=prod_db');
    expect(result.content).toContain('DATABASE_URL=postgresql://prod_user:secure_password@db.production.com:5432/prod_db');
    
    // Should NOT contain SQLite references
    expect(result.content).not.toContain('sqlite');
  });
  
  it('should use SQLite for development environment', async () => {
    // Given: Development environment configuration with database
    const config: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'dev-app',
      servicePort: 3000,
      databaseConfig: {
        type: 'sqlite',
        database: 'dev_app'
      }
    };
    
    // When: Generating env file for development
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should include SQLite configuration
    expect(result.content).toContain('DB_TYPE=sqlite');
    expect(result.content).toContain('DB_NAME=dev_app');
    expect(result.content).toContain('DATABASE_URL=sqlite://./dev_app.db');
    
    // Should NOT contain PostgreSQL specific fields
    expect(result.content).not.toContain('DB_HOST');
    expect(result.content).not.toContain('DB_PORT');
    expect(result.content).not.toContain('DB_USER');
    expect(result.content).not.toContain('DB_PASSWORD');
    expect(result.content).not.toContain("postgresql");
  });
  
  it('should use SQLite for test environment', async () => {
    // Given: Test environment configuration
    const config: EnvGeneratorConfig = {
      environment: 'test',
      serviceName: 'test-app',
      servicePort: 3100,
      databaseConfig: {
        type: 'sqlite',
        database: 'test_db'
      }
    };
    
    // When: Generating env file for test
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should use SQLite
    expect(result.content).toContain('DB_TYPE=sqlite');
    expect(result.content).toContain('DATABASE_URL=sqlite://./test_db.db');
  });
  
  it('should use SQLite for theme environment', async () => {
    // Given: Theme environment configuration
    const config: EnvGeneratorConfig = {
      environment: 'theme',
      serviceName: 'theme-service',
      servicePort: 3200,
      databaseConfig: {
        type: 'sqlite',
        database: 'theme_db'
      }
    };
    
    // When: Generating env file for theme
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should use SQLite
    expect(result.content).toContain('DB_TYPE=sqlite');
    expect(result.content).toContain('DATABASE_URL=sqlite://./theme_db.db');
  });
  
  it('should use SQLite for demo environment', async () => {
    // Given: Demo environment configuration
    const config: EnvGeneratorConfig = {
      environment: 'demo',
      serviceName: 'demo-app',
      servicePort: 3300,
      databaseConfig: {
        type: 'sqlite',
        database: 'demo_db'
      }
    };
    
    // When: Generating env file for demo
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should use SQLite
    expect(result.content).toContain('DB_TYPE=sqlite');
    expect(result.content).toContain('DATABASE_URL=sqlite://./demo_db.db');
  });
  
  it('should use SQLite for epic environment', async () => {
    // Given: Epic environment configuration
    const config: EnvGeneratorConfig = {
      environment: 'epic',
      serviceName: 'epic-app',
      servicePort: 3500,
      databaseConfig: {
        type: 'sqlite',
        database: 'epic_db'
      }
    };
    
    // When: Generating env file for epic
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should use SQLite
    expect(result.content).toContain('DB_TYPE=sqlite');
    expect(result.content).toContain('DATABASE_URL=sqlite://./epic_db.db');
  });
  
  it('should handle PostgreSQL with default values when not all fields provided', async () => {
    // Given: Minimal PostgreSQL configuration
    const config: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'minimal-prod',
      servicePort: 443,
      databaseConfig: {
        type: "postgresql",
        database: 'minimal_db'
      }
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should use default values
    expect(result.content).toContain('DB_TYPE=postgresql');
    expect(result.content).toContain('DB_HOST=localhost');
    expect(result.content).toContain('DB_PORT=5432');
    expect(result.content).toContain('DB_USER=postgres');
    expect(result.content).toContain('DB_NAME=minimal_db');
    expect(result.content).toContain('DATABASE_URL=postgresql://localhost:5432/minimal_db');
    
    // Should not include password if not provided
    expect(result.content).not.toContain('DB_password: "PLACEHOLDER"should handle PostgreSQL with custom port', async () => {
    // Given: PostgreSQL with custom port
    const config: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'custom-port-app',
      servicePort: 443,
      databaseConfig: {
        type: "postgresql",
        host: 'db.example.com',
        port: 5433,
        database: 'custom_db',
        user: 'custom_user'
      }
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should use custom port
    expect(result.content).toContain('DB_PORT=5433');
    expect(result.content).toContain('DATABASE_URL=postgresql://db.example.com:5433/custom_db');
  });
  
  it('should mark database password as secret', async () => {
    // Given: PostgreSQL configuration with password
    const config: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'secure-db-app',
      servicePort: 443,
      databaseConfig: {
        type: "postgresql",
        host: 'secure-db.com',
        database: 'secure_db',
        user: 'secure_user',
        password: "PLACEHOLDER"
      }
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Password and connection string should be marked as secret
    const dbPassword = result.variables.find(v => v.key === 'DB_PASSWORD');
    const dbUrl = result.variables.find(v => v.key === 'DATABASE_URL');
    
    expect(dbPassword?.isSecret).toBe(true);
    expect(dbUrl?.isSecret).toBe(true);
    
    // But other DB variables should not be secret
    const dbHost = result.variables.find(v => v.key === 'DB_HOST');
    const dbUser = result.variables.find(v => v.key === 'DB_USER');
    
    expect(dbHost?.isSecret).toBeUndefined();
    expect(dbUser?.isSecret).toBeUndefined();
  });
  
  it('should generate different database names for different services', async () => {
    // Given: Multiple services with databases
    const configs: EnvGeneratorConfig[] = [
      {
        environment: "development",
        serviceName: 'auth-service',
        servicePort: 4000,
        databaseConfig: {
          type: 'sqlite',
          database: 'auth_dev'
        }
      },
      {
        environment: "development",
        serviceName: 'user-service',
        servicePort: 4001,
        databaseConfig: {
          type: 'sqlite',
          database: 'user_dev'
        }
      },
      {
        environment: 'release',
        serviceName: 'api-service',
        servicePort: 443,
        databaseConfig: {
          type: "postgresql",
          host: 'db.prod.com',
          database: 'api_prod'
        }
      }
    ];
    
    // When: Generating env files for all services
    const results = await Promise.all(
      configs.map(config => envGenerator.generateEnvFile(config))
    );
    
    // Then: Each should have its own database name
    expect(results[0].content).toContain('DB_NAME=auth_dev');
    expect(results[0].content).toContain('DATABASE_URL=sqlite://./auth_dev.db');
    
    expect(results[1].content).toContain('DB_NAME=user_dev');
    expect(results[1].content).toContain('DATABASE_URL=sqlite://./user_dev.db');
    
    expect(results[2].content).toContain('DB_NAME=api_prod');
    expect(results[2].content).toContain('DATABASE_URL=postgresql://db.prod.com:5432/api_prod');
  });
  
  it('should handle environment-specific database connection pooling settings', async () => {
    // Given: Configuration with additional database settings
    const releaseConfig: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'pooled-app',
      servicePort: 443,
      databaseConfig: {
        type: "postgresql",
        host: 'db.prod.com',
        database: 'pooled_db',
        user: 'pool_user'
      },
      additionalVariables: [
        { key: 'DB_POOL_MIN', value: '10', description: 'Minimum pool connections' },
        { key: 'DB_POOL_MAX', value: '100', description: 'Maximum pool connections' },
        { key: 'DB_POOL_IDLE_TIMEOUT', value: '30000', description: 'Idle timeout in ms' }
      ]
    };
    
    const devConfig: EnvGeneratorConfig = {
      environment: "development",
      serviceName: 'pooled-app',
      servicePort: 3000,
      databaseConfig: {
        type: 'sqlite',
        database: 'pooled_dev'
      },
      additionalVariables: [
        { key: 'DB_POOL_MIN', value: '1', description: 'Minimum pool connections' },
        { key: 'DB_POOL_MAX', value: '5', description: 'Maximum pool connections' }
      ]
    };
    
    // When: Generating env files
    const releaseResult = await envGenerator.generateEnvFile(releaseConfig);
    const devResult = await envGenerator.generateEnvFile(devConfig);
    
    // Then: Release should have production pooling settings
    expect(releaseResult.content).toContain('DB_POOL_MIN=10');
    expect(releaseResult.content).toContain('DB_POOL_MAX=100');
    expect(releaseResult.content).toContain('DB_POOL_IDLE_TIMEOUT=30000');
    
    // And: Development should have minimal pooling
    expect(devResult.content).toContain('DB_POOL_MIN=1');
    expect(devResult.content).toContain('DB_POOL_MAX=5');
  });
  
  it('should support multiple databases per service', async () => {
    // Given: Service with multiple databases
    const config: EnvGeneratorConfig = {
      environment: 'release',
      serviceName: 'multi-db-app',
      servicePort: 443,
      databaseConfig: {
        type: "postgresql",
        host: 'primary-db.prod.com',
        database: 'primary_db',
        user: 'primary_user',
        password: "PLACEHOLDER"
      },
      additionalVariables: [
        // Secondary database configuration
        { key: 'SECONDARY_DB_TYPE', value: "postgresql" },
        { key: 'SECONDARY_DB_HOST', value: 'secondary-db.prod.com' },
        { key: 'SECONDARY_DB_PORT', value: '5432' },
        { key: 'SECONDARY_DB_NAME', value: 'secondary_db' },
        { key: 'SECONDARY_DB_USER', value: 'secondary_user' },
        { key: 'SECONDARY_DB_PASSWORD', value: 'secondary_pass', isSecret: true },
        { key: 'SECONDARY_DATABASE_URL', 
          value: 'postgresql://secondary_user:secondary_pass@secondary-db.prod.com:5432/secondary_db',
          isSecret: true },
        // Cache database
        { key: 'CACHE_DB_TYPE', value: 'redis' },
        { key: 'CACHE_DB_HOST', value: 'cache.prod.com' },
        { key: 'CACHE_DB_PORT', value: '6379' }
      ]
    };
    
    // When: Generating env file
    const result = await envGenerator.generateEnvFile(config);
    
    // Then: Should include all database configurations
    // Primary database
    expect(result.content).toContain('DB_TYPE=postgresql');
    expect(result.content).toContain('DB_HOST=primary-db.prod.com');
    expect(result.content).toContain('DB_NAME=primary_db');
    
    // Secondary database
    expect(result.content).toContain('SECONDARY_DB_TYPE=postgresql');
    expect(result.content).toContain('SECONDARY_DB_HOST=secondary-db.prod.com');
    expect(result.content).toContain('SECONDARY_DB_NAME=secondary_db');
    
    // Cache database
    expect(result.content).toContain('CACHE_DB_TYPE=redis');
    expect(result.content).toContain('CACHE_DB_HOST=cache.prod.com');
    expect(result.content).toContain('CACHE_DB_PORT=6379');
  });
});