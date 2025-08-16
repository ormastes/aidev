/**
 * External Test: ConfigManager Interface
 * 
 * This test verifies the ConfigManager external interface contract.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import { describe, test, expect } from '@jest/globals';
import type { 
  ConfigManager, 
  EnvironmentConfig, 
  CreateEnvironmentOptions,
  UpdateEnvironmentOptions,
  ServiceConfig
} from '../../src/interfaces/config-manager.interface';

describe('ConfigManager External Interface Test', () => {
  
  test('should define ConfigManager interface with all required methods', () => {
    // This test verifies the interface structure exists
    // In TypeScript, interfaces are compile-time only, so we test the shape
    
    const mockConfigManager: ConfigManager = {
      createEnvironment: async (options: CreateEnvironmentOptions) => {
        return {
          name: options.name,
          type: options.type,
          port: {
            base: 3200,
            range: [3200, 3299] as [number, number]
          },
          database: {
            type: 'sqlite',
            connection: './data/test.db'
          },
          paths: {
            root: `/environments/${options.name}`,
            data: `/environments/${options.name}/data`,
            logs: `/environments/${options.name}/logs`,
            temp: `/environments/${options.name}/temp`
          },
          services: [],
          created: new Date(),
          updated: new Date()
        };
      },
      
      getEnvironment: async (name: string) => {
        return null;
      },
      
      updateEnvironment: async (name: string, options: UpdateEnvironmentOptions) => {
        return {} as EnvironmentConfig;
      },
      
      deleteEnvironment: async (name: string) => {
        return true;
      },
      
      listEnvironments: async (type?) => {
        return [];
      },
      
      addService: async (envName: string, serviceName: string) => {
        return {
          name: serviceName,
          port: 3201,
          enabled: true
        };
      },
      
      removeService: async (envName: string, serviceName: string) => {
        return true;
      },
      
      environmentExists: async (name: string) => {
        return false;
      },
      
      validateConfig: async (config) => {
        return true;
      },
      
      exportAsEnv: async (name: string) => {
        return '';
      },
      
      exportAsDockerCompose: async (name: string) => {
        return '';
      },
      
      suggestEnvironmentName: async (type) => {
        return `${type}-001`;
      }
    };
    
    // Verify all methods exist
    expect(typeof mockConfigManager.createEnvironment).toBe("function");
    expect(typeof mockConfigManager.getEnvironment).toBe("function");
    expect(typeof mockConfigManager.updateEnvironment).toBe("function");
    expect(typeof mockConfigManager.deleteEnvironment).toBe("function");
    expect(typeof mockConfigManager.listEnvironments).toBe("function");
    expect(typeof mockConfigManager.addService).toBe("function");
    expect(typeof mockConfigManager.removeService).toBe("function");
    expect(typeof mockConfigManager.environmentExists).toBe("function");
    expect(typeof mockConfigManager.validateConfig).toBe("function");
    expect(typeof mockConfigManager.exportAsEnv).toBe("function");
    expect(typeof mockConfigManager.exportAsDockerCompose).toBe("function");
    expect(typeof mockConfigManager.suggestEnvironmentName).toBe("function");
  });
  
  test('should verify EnvironmentConfig structure', () => {
    const config: EnvironmentConfig = {
      name: 'test-theme',
      type: 'theme',
      port: {
        base: 3200,
        range: [3200, 3299]
      },
      database: {
        type: 'sqlite',
        connection: './data/test.db'
      },
      paths: {
        root: '/environments/test-theme',
        data: '/environments/test-theme/data',
        logs: '/environments/test-theme/logs',
        temp: '/environments/test-theme/temp'
      },
      services: [
        {
          name: 'story-reporter',
          port: 3201,
          enabled: true,
          endpoints: ['/api/stories', '/api/reports'],
          healthCheck: '/health'
        }
      ],
      dependencies: [
        {
          theme: 'external-log-lib',
          version: '1.0.0',
          endpoints: ['/api/logs'],
          required: true
        }
      ],
      created: new Date(),
      updated: new Date()
    };
    
    // Verify required fields
    expect(config.name).toBeDefined();
    expect(config.type).toBeDefined();
    expect(config.port).toBeDefined();
    expect(config.port.base).toBeDefined();
    expect(config.port.range).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.paths).toBeDefined();
    expect(config.services).toBeDefined();
    expect(config.created).toBeDefined();
    expect(config.updated).toBeDefined();
    
    // Verify types
    expect(typeof config.name).toBe('string');
    expect(['theme', 'epic', 'demo', 'release', 'test']).toContain(config.type);
    expect(typeof config.port.base).toBe('number');
    expect(Array.isArray(config.port.range)).toBe(true);
    expect(config.port.range).toHaveLength(2);
  });
  
  test('should verify CreateEnvironmentOptions structure', () => {
    const options: CreateEnvironmentOptions = {
      name: 'new-theme',
      type: 'theme',
      description: 'A new theme for testing',
      services: ['story-reporter', 'gui-selector'],
      dependencies: [
        {
          theme: 'external-log-lib',
          version: '1.0.0',
          endpoints: ['/api/logs'],
          required: true
        }
      ]
    };
    
    expect(options.name).toBeDefined();
    expect(options.type).toBeDefined();
    expect(typeof options.name).toBe('string');
    expect(['theme', 'epic', 'demo', 'release', 'test']).toContain(options.type);
    
    // Optional fields
    if (options.description) {
      expect(typeof options.description).toBe('string');
    }
    if (options.services) {
      expect(Array.isArray(options.services)).toBe(true);
    }
    if (options.dependencies) {
      expect(Array.isArray(options.dependencies)).toBe(true);
    }
  });
  
  test('should verify ServiceConfig structure', () => {
    const service: ServiceConfig = {
      name: 'story-reporter',
      port: 3201,
      enabled: true,
      endpoints: ['/api/stories', '/api/reports'],
      healthCheck: '/health'
    };
    
    expect(service.name).toBeDefined();
    expect(service.enabled).toBeDefined();
    expect(typeof service.name).toBe('string');
    expect(typeof service.enabled).toBe('boolean');
    
    // Optional fields
    if (service.port !== undefined) {
      expect(typeof service.port).toBe('number');
    }
    if (service.endpoints) {
      expect(Array.isArray(service.endpoints)).toBe(true);
      service.endpoints.forEach(endpoint => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint).toMatch(/^\//); // Should start with /
      });
    }
    if (service.healthCheck) {
      expect(typeof service.healthCheck).toBe('string');
      expect(service.healthCheck).toMatch(/^\//); // Should start with /
    }
  });
  
  test('should verify environment type constraints', () => {
    const validTypes: EnvironmentConfig['type'][] = ['theme', 'epic', 'demo', 'release', 'test'];
    
    validTypes.forEach(type => {
      const config: Pick<EnvironmentConfig, 'type'> = { type };
      expect(validTypes).toContain(config.type);
    });
    
    // TypeScript will prevent invalid types at compile time
    // This test documents the valid values
  });
  
  test('should verify database type constraints', () => {
    const validDatabaseTypes: EnvironmentConfig["database"]['type'][] = ["postgresql", 'sqlite'];
    
    validDatabaseTypes.forEach(dbType => {
      const db: Pick<EnvironmentConfig["database"], 'type'> = { type: dbType };
      expect(validDatabaseTypes).toContain(db.type);
    });
  });
});