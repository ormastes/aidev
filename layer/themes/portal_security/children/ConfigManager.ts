import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { PortManager } from './PortManager';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ServiceConfig {
  name: string;
  port: number;
  enabled: boolean;
  dependencies?: string[];
  environment?: Record<string, any>;
}

export interface EnvironmentConfig {
  name: string;
  services: ServiceConfig[];
  database: DatabaseConfig;
  security: SecurityConfig;
  features: FeatureFlags;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite' | 'mysql';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  path?: string;
  inMemory?: boolean;
  ssl?: boolean;
  poolSize?: number;
}

export interface SecurityConfig {
  corsEnabled: boolean;
  httpsOnly: boolean;
  secureCookies: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  tokenExpiry: {
    access: number;
    refresh: number;
  };
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export class ConfigManager {
  private configs: Map<string, EnvironmentConfig> = new Map();
  private portManager: PortManager;
  private configPath: string;
  private portAllocations: Map<string, Map<string, number>> = new Map();

  constructor(configPath?: string, portManager?: PortManager) {
    this.configPath = configPath || path.join(process.cwd(), 'config');
    this.portManager = portManager || PortManager.getInstance();
    this.initializeDefaultConfigs();
  }

  private async initializeDefaultConfigs(): void {
    // Development configuration
    this.configs.set('development', {
      name: 'development',
      services: [
        { name: 'main', port: 3456, enabled: true },
        { name: 'api', port: 3457, enabled: true },
        { name: 'auth', port: 3458, enabled: true },
        { name: 'admin', port: 3459, enabled: true },
        { name: 'websocket', port: 3460, enabled: true }
      ],
      database: {
        type: 'sqlite',
        path: './data/dev.db',
        inMemory: false
      },
      security: {
        corsEnabled: true,
        httpsOnly: false,
        secureCookies: false,
        sessionTimeout: 7200,
        maxLoginAttempts: 5,
        tokenExpiry: {
          access: 900,
          refresh: 86400
        }
      },
      features: {
        debugMode: true,
        apiDocs: true,
        mockData: true,
        rateLimiting: false
      }
    });

    // Test configuration
    this.configs.set('test', {
      name: 'test',
      services: [
        { name: 'main', port: 4456, enabled: true },
        { name: 'api', port: 4457, enabled: true },
        { name: 'auth', port: 4458, enabled: true }
      ],
      database: {
        type: 'sqlite',
        inMemory: true
      },
      security: {
        corsEnabled: true,
        httpsOnly: false,
        secureCookies: false,
        sessionTimeout: 300,
        maxLoginAttempts: 3,
        tokenExpiry: {
          access: 300,
          refresh: 600
        }
      },
      features: {
        debugMode: true,
        apiDocs: false,
        mockData: true,
        rateLimiting: false
      }
    });

    // Demo configuration
    this.configs.set('demo', {
      name: 'demo',
      services: [
        { name: 'main', port: 5456, enabled: true },
        { name: 'api', port: 5457, enabled: true },
        { name: 'auth', port: 5458, enabled: true },
        { name: 'admin', port: 5459, enabled: true }
      ],
      database: {
        type: 'sqlite',
        path: './data/demo.db',
        inMemory: false
      },
      security: {
        corsEnabled: false,
        httpsOnly: true,
        secureCookies: true,
        sessionTimeout: 3600,
        maxLoginAttempts: 3,
        tokenExpiry: {
          access: 600,
          refresh: 43200
        }
      },
      features: {
        debugMode: false,
        apiDocs: true,
        mockData: false,
        rateLimiting: true
      }
    });

    // Release/Production configuration
    this.configs.set('release', {
      name: 'release',
      services: [
        { name: 'main', port: 443, enabled: true },
        { name: 'api', port: 8443, enabled: true },
        { name: 'auth', port: 8444, enabled: true },
        { name: 'admin', port: 8445, enabled: true },
        { name: 'websocket', port: 8446, enabled: true }
      ],
      database: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'portal_security',
        username: 'portal_user',
        ssl: true,
        poolSize: 20
      },
      security: {
        corsEnabled: false,
        httpsOnly: true,
        secureCookies: true,
        sessionTimeout: 3600,
        maxLoginAttempts: 3,
        tokenExpiry: {
          access: 900,
          refresh: 86400
        }
      },
      features: {
        debugMode: false,
        apiDocs: false,
        mockData: false,
        rateLimiting: true
      }
    });

    // Initialize port allocations for each environment
    this.initializePortAllocations();
  }

  private async initializePortAllocations(): void {
    for (const [envName, config] of this.configs) {
      const allocations = new Map<string, number>();
      for (const service of config.services) {
        allocations.set(service.name, service.port);
      }
      this.portAllocations.set(envName, allocations);
    }
  }

  async getConfig(environment: string): Promise<EnvironmentConfig> {
    // Try to load from file first
    const fileConfig = await this.loadConfigFromFile(environment);
    if (fileConfig) {
      this.configs.set(environment, fileConfig);
      return fileConfig;
    }

    // Return default config
    const config = this.configs.get(environment);
    if (!config) {
      throw new Error(`Configuration for environment '${environment}' not found`);
    }

    return config;
  }

  async getPortAllocations(environment: string): Promise<Record<string, number>> {
    const allocations = this.portAllocations.get(environment);
    if (!allocations) {
      // Generate new allocations if not exists
      const config = await this.getConfig(environment);
      const newAllocations: Record<string, number> = {};
      
      for (const service of config.services) {
        if (service.enabled) {
          // Try to use configured port or allocate new one
          const port = service.port || await this.portManager.allocatePort(service.name);
          newAllocations[service.name] = port;
        }
      }
      
      this.portAllocations.set(environment, new Map(Object.entries(newAllocations)));
      return newAllocations;
    }

    return Object.fromEntries(allocations);
  }

  async allocateServicePort(
    environment: string,
    serviceName: string
  ): Promise<number> {
    const allocations = this.portAllocations.get(environment) || new Map();
    
    // Check if already allocated
    if (allocations.has(serviceName)) {
      return allocations.get(serviceName)!;
    }

    // Allocate new port
    const port = await this.portManager.allocatePort(serviceName);
    allocations.set(serviceName, port);
    this.portAllocations.set(environment, allocations);

    return port;
  }

  async updateServiceConfig(
    environment: string,
    serviceName: string,
    updates: Partial<ServiceConfig>
  ): Promise<void> {
    const config = await this.getConfig(environment);
    const serviceIndex = config.services.findIndex(s => s.name === serviceName);

    if (serviceIndex === -1) {
      // Add new service
      config.services.push({
        name: serviceName,
        port: updates.port || await this.allocateServicePort(environment, serviceName),
        enabled: updates.enabled !== false,
        dependencies: updates.dependencies,
        environment: updates.environment
      });
    } else {
      // Update existing service
      config.services[serviceIndex] = {
        ...config.services[serviceIndex],
        ...updates
      };
    }

    this.configs.set(environment, config);
    await this.saveConfigToFile(environment, config);
  }

  async addService(
    environment: string,
    service: ServiceConfig
  ): Promise<void> {
    const config = await this.getConfig(environment);
    
    // Check if service already exists
    if (config.services.some(s => s.name === service.name)) {
      throw new Error(`Service '${service.name}' already exists in environment '${environment}'`);
    }

    // Allocate port if not provided
    if (!service.port) {
      service.port = await this.allocateServicePort(environment, service.name);
    }

    config.services.push(service);
    this.configs.set(environment, config);
    await this.saveConfigToFile(environment, config);
  }

  async removeService(
    environment: string,
    serviceName: string
  ): Promise<void> {
    const config = await this.getConfig(environment);
    config.services = config.services.filter(s => s.name !== serviceName);
    
    // Release port allocation
    const allocations = this.portAllocations.get(environment);
    if (allocations) {
      allocations.delete(serviceName);
    }

    this.configs.set(environment, config);
    await this.saveConfigToFile(environment, config);
  }

  async getDatabaseConfig(environment: string): Promise<DatabaseConfig> {
    const config = await this.getConfig(environment);
    return config.database;
  }

  async getSecurityConfig(environment: string): Promise<SecurityConfig> {
    const config = await this.getConfig(environment);
    return config.security;
  }

  async getFeatureFlags(environment: string): Promise<FeatureFlags> {
    const config = await this.getConfig(environment);
    return config.features;
  }

  async updateFeatureFlag(
    environment: string,
    flag: string,
    enabled: boolean
  ): Promise<void> {
    const config = await this.getConfig(environment);
    config.features[flag] = enabled;
    this.configs.set(environment, config);
    await this.saveConfigToFile(environment, config);
  }

  async propagateConfigChange(
    sourcEnvironment: string,
    targetEnvironments: string[],
    configType: 'services' | 'database' | 'security' | 'features'
  ): Promise<void> {
    const sourceConfig = await this.getConfig(sourcEnvironment);

    for (const targetEnv of targetEnvironments) {
      const targetConfig = await this.getConfig(targetEnv);

      switch (configType) {
        case 'services':
          // Don't overwrite ports, just service list and dependencies
          for (const service of sourceConfig.services) {
            const existing = targetConfig.services.find(s => s.name === service.name);
            if (existing) {
              existing.dependencies = service.dependencies;
              existing.environment = service.environment;
            } else {
              await this.addService(targetEnv, {
                ...service,
                port: await this.allocateServicePort(targetEnv, service.name)
              });
            }
          }
          break;

        case 'security':
          targetConfig.security = { ...sourceConfig.security };
          break;

        case 'features':
          targetConfig.features = { ...sourceConfig.features };
          break;

        case 'database':
          // Only propagate non-environment-specific settings
          if (sourceConfig.database.type === targetConfig.database.type) {
            targetConfig.database.poolSize = sourceConfig.database.poolSize;
            targetConfig.database.ssl = sourceConfig.database.ssl;
          }
          break;
      }

      this.configs.set(targetEnv, targetConfig);
      await this.saveConfigToFile(targetEnv, targetConfig);
    }
  }

  private async loadConfigFromFile(environment: string): Promise<EnvironmentConfig | null> {
    const filePath = path.join(this.configPath, `${environment}.config.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as EnvironmentConfig;
    } catch (error) {
      console.error(`Failed to load config for environment '${environment}':`, error);
      return null;
    }
  }

  private async saveConfigToFile(
    environment: string,
    config: EnvironmentConfig
  ): Promise<void> {
    const filePath = path.join(this.configPath, `${environment}.config.json`);

    // Ensure directory exists
    if (!fs.existsSync(this.configPath)) {
      await fileAPI.createDirectory(this.configPath);
    }

    await fileAPI.createFile(filePath, JSON.stringify(config, { type: FileType.TEMPORARY }), 'utf-8');
  }

  async getAllEnvironments(): string[] {
    return Array.from(this.configs.keys());
  }

  async validateConfig(environment: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const config = await this.getConfig(environment);

      // Validate services
      const servicePorts = new Set<number>();
      for (const service of config.services) {
        if (service.enabled) {
          if (!service.port || service.port < 1 || service.port > 65535) {
            errors.push(`Invalid port for service '${service.name}'`);
          }
          if (servicePorts.has(service.port)) {
            errors.push(`Duplicate port ${service.port} for service '${service.name}'`);
          }
          servicePorts.add(service.port);
        }
      }

      // Validate database config
      if (config.database.type === 'postgresql') {
        if (!config.database.host || !config.database.database) {
          errors.push('PostgreSQL configuration missing required fields');
        }
      } else if (config.database.type === 'sqlite') {
        if (!config.database.inMemory && !config.database.path) {
          errors.push('SQLite configuration requires either path or inMemory flag');
        }
      }

      // Validate security config
      if (config.security.sessionTimeout < 60) {
        errors.push('Session timeout must be at least 60 seconds');
      }
      if (config.security.maxLoginAttempts < 1) {
        errors.push('Max login attempts must be at least 1');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Failed to validate config: ${error}`);
      return { valid: false, errors };
    }
  }
}