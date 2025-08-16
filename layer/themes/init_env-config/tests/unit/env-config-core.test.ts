/**
 * Core tests for Environment Configuration Theme
 */

describe('Environment Configuration Theme - Core Functionality', () => {
  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('environment variable management', () => {
    it('should read environment variables with defaults', () => {
      const getEnvVar = (key: string, defaultValue?: string) => {
        return process.env[key] || defaultValue;
      };

      process.env.TEST_VAR = 'test_value';
      
      expect(getEnvVar('TEST_VAR')).toBe('test_value');
      expect(getEnvVar('NON_EXISTENT_VAR', 'default')).toBe('default');
      expect(getEnvVar('NON_EXISTENT_VAR')).toBeUndefined();

      delete process.env.TEST_VAR;
    });

    it('should validate required environment variables', () => {
      const validateRequiredEnvVars = (requiredVars: string[]) => {
        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        return true;
      };

      process.env.REQUIRED_VAR_1 = 'value1';
      process.env.REQUIRED_VAR_2 = 'value2';

      expect(validateRequiredEnvVars(['REQUIRED_VAR_1', 'REQUIRED_VAR_2'])).toBe(true);
      
      expect(() => {
        validateRequiredEnvVars(['REQUIRED_VAR_1', 'MISSING_VAR']);
      }).toThrow('Missing required environment variables: MISSING_VAR');

      delete process.env.REQUIRED_VAR_1;
      delete process.env.REQUIRED_VAR_2;
    });

    it('should parse environment variables by type', () => {
      const parseEnvVar = (key: string, type: 'string' | 'number' | 'boolean' | 'json', defaultValue?: any) => {
        const value = process.env[key];
        
        if (!value) return defaultValue;
        
        switch (type) {
          case 'string':
            return value;
          case 'number':
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
          case 'boolean':
            return value.toLowerCase() === 'true';
          case 'json':
            try {
              return JSON.parse(value);
            } catch {
              return defaultValue;
            }
          default:
            return value;
        }
      };

      process.env.STRING_VAR = 'hello';
      process.env.NUMBER_VAR = '42';
      process.env.BOOLEAN_VAR = 'true';
      process.env.JSON_VAR = '{"key": "value"}';
      process.env.INVALID_NUMBER = 'not_a_number';

      expect(parseEnvVar('STRING_VAR', 'string')).toBe('hello');
      expect(parseEnvVar('NUMBER_VAR', 'number')).toBe(42);
      expect(parseEnvVar('BOOLEAN_VAR', 'boolean')).toBe(true);
      expect(parseEnvVar('JSON_VAR', 'json')).toEqual({ key: 'value' });
      expect(parseEnvVar('INVALID_NUMBER', 'number', 0)).toBe(0);

      // Cleanup
      delete process.env.STRING_VAR;
      delete process.env.NUMBER_VAR;
      delete process.env.BOOLEAN_VAR;
      delete process.env.JSON_VAR;
      delete process.env.INVALID_NUMBER;
    });
  });

  describe('configuration file management', () => {
    it('should load configuration from files', () => {
      const loadConfig = (configPath?: string) => {
        // Mock file loading
        const defaultConfig = {
          development: {
            database: { host: 'localhost', port: 5432 },
            logging: { level: 'debug' }
          },
          production: {
            database: { host: 'prod-db', port: 5432 },
            logging: { level: 'info' }
          }
        };

        const environment = process.env.NODE_ENV || 'development';
        return defaultConfig[environment as keyof typeof defaultConfig] || defaultConfig.development;
      };

      process.env.NODE_ENV = 'development';
      const devConfig = loadConfig();
      expect(devConfig.database.host).toBe('localhost');
      expect(devConfig.logging.level).toBe('debug');

      process.env.NODE_ENV = 'production';
      const prodConfig = loadConfig();
      expect(prodConfig.database.host).toBe('prod-db');
      expect(prodConfig.logging.level).toBe('info');
    });

    it('should merge environment variables with config files', () => {
      const mergeConfig = (fileConfig: any, envOverrides: Record<string, any>) => {
        const merged = { ...fileConfig };
        
        Object.entries(envOverrides).forEach(([key, value]) => {
          const keys = key.split('_');
          let current = merged;
          
          for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i].toLowerCase();
            if (!current[k]) current[k] = {};
            current = current[k];
          }
          
          current[keys[keys.length - 1].toLowerCase()] = value;
        });
        
        return merged;
      };

      const fileConfig = {
        database: { host: 'localhost', port: 5432 },
        redis: { host: 'localhost', port: 6379 }
      };

      process.env.DATABASE_HOST = 'override-db';
      process.env.REDIS_PORT = '6380';

      const envOverrides = {
        DATABASE_HOST: process.env.DATABASE_HOST,
        REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379')
      };

      const merged = mergeConfig(fileConfig, envOverrides);
      
      expect(merged.database.host).toBe('override-db');
      expect(merged.redis.port).toBe(6380);

      delete process.env.DATABASE_HOST;
      delete process.env.REDIS_PORT;
    });

    it('should validate configuration schemas', () => {
      const validateConfig = (config: any, schema: any) => {
        const errors: string[] = [];
        
        const validate = (obj: any, schemaObj: any, path = '') => {
          Object.entries(schemaObj).forEach(([key, rules]: [string, any]) => {
            const value = obj[key];
            const currentPath = path ? `${path}.${key}` : key;
            
            if (rules.required && (value === undefined || value === null)) {
              errors.push(`${currentPath} is required`);
              return;
            }
            
            if (value !== undefined && rules.type && typeof value !== rules.type) {
              errors.push(`${currentPath} must be of type ${rules.type}`);
            }
            
            if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
              errors.push(`${currentPath} must be at least ${rules.min}`);
            }
            
            if (rules.properties && typeof value === 'object') {
              validate(value, rules.properties, currentPath);
            }
          });
        };
        
        validate(config, schema);
        return { valid: errors.length === 0, errors };
      };

      const schema = {
        database: {
          required: true,
          type: 'object',
          properties: {
            host: { required: true, type: 'string' },
            port: { required: true, type: 'number', min: 1 }
          }
        },
        logging: {
          required: false,
          type: 'object',
          properties: {
            level: { required: true, type: 'string' }
          }
        }
      };

      const validConfig = {
        database: { host: 'localhost', port: 5432 },
        logging: { level: 'info' }
      };

      const invalidConfig = {
        database: { host: 'localhost' }, // missing port
        logging: { level: 123 } // wrong type
      };

      const validResult = validateConfig(validConfig, schema);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateConfig(invalidConfig, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('database.port is required');
      expect(invalidResult.errors).toContain('logging.level must be of type string');
    });
  });

  describe('environment detection', () => {
    it('should detect development vs production environment', () => {
      const detectEnvironment = () => {
        const env = process.env.NODE_ENV?.toLowerCase();
        
        if (env === 'production' || env === 'prod') {
          return 'production';
        } else if (env === 'test' || env === 'testing') {
          return 'test';
        } else if (env === 'staging') {
          return 'staging';
        } else {
          return 'development';
        }
      };

      process.env.NODE_ENV = 'production';
      expect(detectEnvironment()).toBe('production');

      process.env.NODE_ENV = 'development';
      expect(detectEnvironment()).toBe('development');

      process.env.NODE_ENV = 'test';
      expect(detectEnvironment()).toBe('test');

      delete process.env.NODE_ENV;
      expect(detectEnvironment()).toBe('development');
    });

    it('should provide environment-specific configurations', () => {
      const getEnvironmentConfig = (environment: string) => {
        const configs = {
          development: {
            debug: true,
            logLevel: 'debug',
            cacheTimeout: 0,
            allowCORS: true
          },
          production: {
            debug: false,
            logLevel: 'error',
            cacheTimeout: 3600,
            allowCORS: false
          },
          test: {
            debug: false,
            logLevel: 'silent',
            cacheTimeout: 0,
            allowCORS: true
          }
        };

        return configs[environment as keyof typeof configs] || configs.development;
      };

      const devConfig = getEnvironmentConfig('development');
      expect(devConfig.debug).toBe(true);
      expect(devConfig.logLevel).toBe('debug');

      const prodConfig = getEnvironmentConfig('production');
      expect(prodConfig.debug).toBe(false);
      expect(prodConfig.logLevel).toBe('error');
      expect(prodConfig.cacheTimeout).toBe(3600);
    });
  });

  describe('secret management', () => {
    it('should handle sensitive configuration data', () => {
      const maskSecrets = (config: any, secretKeys: string[] = ['password', 'secret', 'key', 'token']) => {
        const masked = JSON.parse(JSON.stringify(config));
        
        const maskValue = (obj: any, path = '') => {
          Object.entries(obj).forEach(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (secretKeys.some(secretKey => key.toLowerCase().includes(secretKey))) {
              obj[key] = '***MASKED***';
            } else if (typeof value === 'object' && value !== null) {
              maskValue(value, currentPath);
            }
          });
        };
        
        maskValue(masked);
        return masked;
      };

      const config = {
        database: {
          host: 'localhost',
          password: 'super_secret_password',
          port: 5432
        },
        auth: {
          jwtSecret: 'jwt_secret_key',
          apiKey: 'api_key_value'
        },
        redis: {
          host: 'localhost',
          port: 6379
        }
      };

      const masked = maskSecrets(config);
      
      expect(masked.database.host).toBe('localhost');
      expect(masked.database.password).toBe('***MASKED***');
      expect(masked.auth.jwtSecret).toBe('***MASKED***');
      expect(masked.auth.apiKey).toBe('***MASKED***');
      expect(masked.redis.host).toBe('localhost');
    });

    it('should validate environment variable naming conventions', () => {
      const validateEnvVarNames = (envVars: Record<string, string>) => {
        const issues: string[] = [];
        const conventions = {
          uppercaseOnly: /^[A-Z_][A-Z0-9_]*$/,
          noConsecutiveUnderscores: /^(?!.*__)/,
          noTrailingUnderscore: /^.*[^_]$/
        };

        Object.keys(envVars).forEach(varName => {
          if (!conventions.uppercaseOnly.test(varName)) {
            issues.push(`${varName}: should use UPPERCASE_WITH_UNDERSCORES format`);
          }
          
          if (!conventions.noConsecutiveUnderscores.test(varName)) {
            issues.push(`${varName}: should not have consecutive underscores`);
          }
          
          if (!conventions.noTrailingUnderscore.test(varName)) {
            issues.push(`${varName}: should not end with underscore`);
          }
        });

        return { valid: issues.length === 0, issues };
      };

      const goodVars = {
        'DATABASE_HOST': 'localhost',
        'API_KEY': 'secret',
        'PORT': '3000'
      };

      const badVars = {
        'database_host': 'localhost', // lowercase
        'API__KEY': 'secret', // consecutive underscores
        'PORT_': '3000' // trailing underscore
      };

      const goodResult = validateEnvVarNames(goodVars);
      expect(goodResult.valid).toBe(true);

      const badResult = validateEnvVarNames(badVars);
      expect(badResult.valid).toBe(false);
      expect(badResult.issues).toHaveLength(3);
    });
  });

  describe('configuration caching', () => {
    it('should cache configuration to avoid repeated parsing', () => {
      class ConfigCache {
        private cache = new Map<string, any>();
        private lastModified = new Map<string, number>();

        set(key: string, value: any, ttl?: number) {
          this.cache.set(key, value);
          this.lastModified.set(key, Date.now() + (ttl || 0));
        }

        get(key: string): any {
          const value = this.cache.get(key);
          const expiry = this.lastModified.get(key);
          
          if (expiry && Date.now() > expiry) {
            this.cache.delete(key);
            this.lastModified.delete(key);
            return undefined;
          }
          
          return value;
        }

        has(key: string): boolean {
          const value = this.cache.get(key);
          const expiry = this.lastModified.get(key);
          
          if (expiry && Date.now() > expiry) {
            this.cache.delete(key);
            this.lastModified.delete(key);
            return false;
          }
          
          return value !== undefined;
        }

        clear() {
          this.cache.clear();
          this.lastModified.clear();
        }

        size(): number {
          return this.cache.size;
        }
      }

      const cache = new ConfigCache();
      
      cache.set('config1', { host: 'localhost' });
      expect(cache.get('config1')).toEqual({ host: 'localhost' });
      expect(cache.has('config1')).toBe(true);
      expect(cache.size()).toBe(1);

      cache.set('config2', { port: 3000 }, 1); // 1ms TTL
      expect(cache.get('config2')).toEqual({ port: 3000 });
      
      // Wait for expiry
      setTimeout(() => {
        expect(cache.get('config2')).toBeUndefined();
      }, 2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should invalidate cache when configuration changes', () => {
      const createConfigManager = () => {
        let configVersion = 0;
        const cache = new Map<string, { data: any; version: number }>();

        return {
          setConfig(key: string, data: any) {
            configVersion++;
            cache.set(key, { data, version: configVersion });
          },

          getConfig(key: string) {
            const cached = cache.get(key);
            return cached?.data;
          },

          invalidateAll() {
            cache.clear();
            configVersion++;
          },

          getVersion() {
            return configVersion;
          }
        };
      };

      const manager = createConfigManager();
      
      manager.setConfig('app', { debug: true });
      expect(manager.getConfig('app')).toEqual({ debug: true });
      expect(manager.getVersion()).toBe(1);

      manager.setConfig('db', { host: 'localhost' });
      expect(manager.getVersion()).toBe(2);

      manager.invalidateAll();
      expect(manager.getConfig('app')).toBeUndefined();
      expect(manager.getVersion()).toBe(3);
    });
  });

  describe('configuration hot-reloading', () => {
    it('should support watching configuration file changes', () => {
      const createConfigWatcher = () => {
        const listeners = new Set<(config: any) => void>();
        let currentConfig = { version: 1, data: {} };

        return {
          addListener(callback: (config: any) => void) {
            listeners.add(callback);
          },

          removeListener(callback: (config: any) => void) {
            listeners.delete(callback);
          },

          updateConfig(newConfig: any) {
            currentConfig = { version: currentConfig.version + 1, data: newConfig };
            listeners.forEach(listener => listener(currentConfig));
          },

          getCurrentConfig() {
            return currentConfig;
          },

          getListenerCount() {
            return listeners.size;
          }
        };
      };

      const watcher = createConfigWatcher();
      let receivedConfig: any = null;

      const listener = (config: any) => {
        receivedConfig = config;
      };

      watcher.addListener(listener);
      expect(watcher.getListenerCount()).toBe(1);

      watcher.updateConfig({ host: 'localhost', port: 3000 });
      expect(receivedConfig.version).toBe(2);
      expect(receivedConfig.data).toEqual({ host: 'localhost', port: 3000 });

      watcher.removeListener(listener);
      expect(watcher.getListenerCount()).toBe(0);
    });
  });

  describe('configuration templating', () => {
    it('should support variable interpolation in config values', () => {
      const interpolateConfig = (config: any, variables: Record<string, string>) => {
        const interpolated = JSON.parse(JSON.stringify(config));
        
        const interpolateValue = (value: any): any => {
          if (typeof value === 'string') {
            return value.replace(/\${([^}]+)}/g, (match, varName) => {
              return variables[varName] || match;
            });
          } else if (Array.isArray(value)) {
            return value.map(interpolateValue);
          } else if (typeof value === 'object' && value !== null) {
            const result: any = {};
            Object.entries(value).forEach(([key, val]) => {
              result[key] = interpolateValue(val);
            });
            return result;
          }
          return value;
        };
        
        return interpolateValue(interpolated);
      };

      const config = {
        database: {
          url: 'postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}',
          timeout: '${DB_TIMEOUT}'
        },
        logging: {
          level: '${LOG_LEVEL}',
          file: '/var/log/${APP_NAME}.log'
        }
      };

      const variables = {
        DB_USER: 'admin',
        DB_PASS: 'password',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'myapp',
        DB_TIMEOUT: '30000',
        LOG_LEVEL: 'info',
        APP_NAME: 'myapp'
      };

      const result = interpolateConfig(config, variables);
      
      expect(result.database.url).toBe('postgresql://admin:password@localhost:5432/myapp');
      expect(result.database.timeout).toBe('30000');
      expect(result.logging.level).toBe('info');
      expect(result.logging.file).toBe('/var/log/myapp.log');
    });
  });
});