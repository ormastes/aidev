import { ConfigManager } from '../../children/config/ConfigManager';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  
  beforeEach(() => {
    // Reset the singleton instance before each test
    (ConfigManager as any).instance = undefined;
    
    // Store original env
    process.env._NODE_ENV = process.env.NODE_ENV;
    process.env._DB_HOST = process.env.DB_HOST;
    process.env._DB_PORT = process.env.DB_PORT;
    process.env._DB_USER = process.env.DB_USER;
    process.env._DB_PASSWORD = process.env.DB_PASSWORD;
    process.env._DB_NAME = process.env.DB_NAME;
    
    // Clear DB env vars to ensure clean state
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
  });

  afterEach(() => {
    // Restore original env
    process.env.NODE_ENV = process.env._NODE_ENV;
    process.env.DB_HOST = process.env._DB_HOST;
    process.env.DB_PORT = process.env._DB_PORT;
    process.env.DB_USER = process.env._DB_USER;
    process.env.DB_PASSWORD = process.env._DB_PASSWORD;
    process.env.DB_NAME = process.env._DB_NAME;
  });

  describe('singleton instance', () => {
    it('should return the same instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with default configuration', () => {
      configManager = ConfigManager.getInstance();
      
      expect(configManager.get('ports')).toBeDefined();
      expect(configManager.get('database')).toBeDefined();
    });
  });

  describe('getPort', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('should get port for release environment', () => {
      const port = configManager.getPort('ai-dev-portal', 'release');
      expect(port).toBe(3456);
    });

    it('should get port for demo environment', () => {
      const port = configManager.getPort('story-reporter', 'demo');
      expect(port).toBe(3301);
    });

    it('should get port for development environment', () => {
      const port = configManager.getPort('gui-selector', 'development');
      expect(port).toBe(3202);
    });

    it('should use NODE_ENV if environment not specified', () => {
      process.env.NODE_ENV = 'demo';
      const port = configManager.getPort('auth-service');
      expect(port).toBe(3303);
    });

    it('should default to development if NODE_ENV not set', () => {
      delete process.env.NODE_ENV;
      const port = configManager.getPort('database-service');
      expect(port).toBe(3204);
    });

    it('should return 3000 for unknown service', () => {
      const port = configManager.getPort('unknown-service', 'development');
      expect(port).toBe(3000);
    });

    it('should return 3000 for unknown environment', () => {
      const port = configManager.getPort('ai-dev-portal', 'production');
      expect(port).toBe(3000);
    });

    it('should handle all defined services', () => {
      const services = [
        'ai-dev-portal', 
        'story-reporter', 
        'gui-selector', 
        'auth-service', 
        'database-service'
      ];
      
      services.forEach(service => {
        expect(configManager.getPort(service, 'release')).toBeGreaterThan(0);
        expect(configManager.getPort(service, 'demo')).toBeGreaterThan(0);
        expect(configManager.getPort(service, 'development')).toBeGreaterThan(0);
      });
    });
  });

  describe('getDatabaseConfig', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('should get database config for release environment', () => {
      const config = configManager.getDatabaseConfig('release');
      
      expect(config.type).toBe('postgres');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('aidev');
      expect(config.password).toBe('aidev');
      expect(config.database).toBe('aidev_prod');
    });

    it('should use environment variables for release database', () => {
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '5433';
      process.env.DB_USER = 'custom_user';
      process.env.DB_PASSWORD = 'custom_pass';
      process.env.DB_NAME = 'custom_db';
      
      // Need to recreate instance to pick up env vars
      (ConfigManager as any).instance = undefined;
      configManager = ConfigManager.getInstance();
      
      const config = configManager.getDatabaseConfig('release');
      
      expect(config.host).toBe('db.example.com');
      expect(config.port).toBe('5433');
      expect(config.username).toBe('custom_user');
      expect(config.password).toBe('custom_pass');
      expect(config.database).toBe('custom_db');
    });

    it('should get database config for demo environment', () => {
      const config = configManager.getDatabaseConfig('demo');
      
      expect(config.type).toBe('sqlite');
      expect(config.database).toBe('./demo.sqlite');
    });

    it('should get database config for development environment', () => {
      const config = configManager.getDatabaseConfig('development');
      
      expect(config.type).toBe('sqlite');
      expect(config.database).toBe('./dev.sqlite');
    });

    it('should use NODE_ENV if environment not specified', () => {
      process.env.NODE_ENV = 'demo';
      const config = configManager.getDatabaseConfig();
      
      expect(config.type).toBe('sqlite');
      expect(config.database).toBe('./demo.sqlite');
    });

    it('should default to development if NODE_ENV not set', () => {
      delete process.env.NODE_ENV;
      const config = configManager.getDatabaseConfig();
      
      expect(config.type).toBe('sqlite');
      expect(config.database).toBe('./dev.sqlite');
    });
  });

  describe('get and set', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('should get existing configuration', () => {
      const ports = configManager.get('ports');
      expect(ports).toBeDefined();
      expect(ports.release).toBeDefined();
      expect(ports.demo).toBeDefined();
      expect(ports.development).toBeDefined();
    });

    it('should set and get custom configuration', () => {
      const customConfig = { key: 'value', nested: { data: 123 } };
      configManager.set('custom', customConfig);
      
      const retrieved = configManager.get('custom');
      expect(retrieved).toEqual(customConfig);
    });

    it('should overwrite existing configuration', () => {
      const originalPorts = configManager.get('ports');
      const newPorts = { test: { service: 1234 } };
      
      configManager.set('ports', newPorts);
      
      const retrieved = configManager.get('ports');
      expect(retrieved).toEqual(newPorts);
      expect(retrieved).not.toEqual(originalPorts);
    });

    it('should return undefined for non-existent key', () => {
      const result = configManager.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle null and undefined values', () => {
      configManager.set('null-value', null);
      configManager.set('undefined-value', undefined);
      
      expect(configManager.get('null-value')).toBeNull();
      expect(configManager.get('undefined-value')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('should handle empty string keys', () => {
      configManager.set('', 'empty-key-value');
      expect(configManager.get('')).toBe('empty-key-value');
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key!@#$%^&*()_+-=[]{}|;:,.<>?';
      configManager.set(specialKey, 'special-value');
      expect(configManager.get(specialKey)).toBe('special-value');
    });

    it('should handle large configuration objects', () => {
      const largeConfig = {
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          value: `value-${i}`,
          nested: { level: 1, data: { level: 2 } }
        }))
      };
      
      configManager.set('large', largeConfig);
      const retrieved = configManager.get('large');
      
      expect(retrieved).toEqual(largeConfig);
      expect(retrieved.data).toHaveLength(1000);
    });

    it('should maintain separate configurations', () => {
      configManager.set('config1', { value: 1 });
      configManager.set('config2', { value: 2 });
      
      expect(configManager.get('config1').value).toBe(1);
      expect(configManager.get('config2').value).toBe(2);
    });

    it('should handle numeric environment values', () => {
      process.env.DB_PORT = '5432';
      (ConfigManager as any).instance = undefined;
      configManager = ConfigManager.getInstance();
      
      const config = configManager.getDatabaseConfig('release');
      expect(config.port).toBe('5432'); // Environment variables are strings
    });
  });
});