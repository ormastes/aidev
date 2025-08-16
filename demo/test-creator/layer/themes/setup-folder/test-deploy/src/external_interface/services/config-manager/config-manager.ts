import * as fs from 'fs-extra';

export interface PortRange {
  start: number;
  end: number;
}

export interface EnvironmentConfig {
  portRange: PortRange;
  mainPort: number;
  services: { [serviceName: string]: number };
  strictValidation?: boolean;
  dbPrefix?: string;
}

export interface DatabaseConfig {
  type: "postgres" | 'sqlite' | 'mysql';
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  path?: string;
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface GlobalConfig {
  [key: string]: string | number | boolean;
}

export interface ConfigurationFile {
  environments: { [envName: string]: any };
  database: { [dbType: string]: any };
  features: FeatureFlags;
  global?: GlobalConfig;
}

export class ConfigManager {
  private environmentConfigs: Map<string, EnvironmentConfig> = new Map();
  private databaseConfigs: Map<string, DatabaseConfig> = new Map();
  private featureFlags: FeatureFlags = {};
  private globalConfig: GlobalConfig = {};

  setEnvironmentConfig(environment: string, config: EnvironmentConfig): void {
    this.environmentConfigs.set(environment, config);
  }

  getEnvironmentConfig(environment: string): EnvironmentConfig | undefined {
    return this.environmentConfigs.get(environment);
  }

  setDatabaseConfig(environment: string, config: DatabaseConfig): void {
    this.databaseConfigs.set(environment, config);
  }

  getDatabaseConfig(environment: string): DatabaseConfig | undefined {
    return this.databaseConfigs.get(environment);
  }

  setFeatureFlags(flags: FeatureFlags): void {
    this.featureFlags = { ...flags };
  }

  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  setGlobalConfig(config: GlobalConfig): void {
    this.globalConfig = { ...config };
  }

  getGlobalConfig(): GlobalConfig {
    return { ...this.globalConfig };
  }

  addServicePort(environment: string, serviceName: string, port: number): void {
    const envConfig = this.environmentConfigs.get(environment);
    
    if (!envConfig) {
      throw new Error(`Environment '${environment}' not configured`);
    }

    // Validate port range if strict validation is enabled
    if (envConfig.strictValidation) {
      if (port < envConfig.portRange.start || port > envConfig.portRange.end) {
        throw new Error(
          `Port ${port} is outside valid range for ${environment} environment: ` +
          `${envConfig.portRange.start}-${envConfig.portRange.end}`
        );
      }
    }

    envConfig.services[serviceName] = port;
  }

  async loadFromFile(configPath: string): Promise<void> {
    const configData = await fs.readJson(configPath) as ConfigurationFile;

    // Load environment configurations
    for (const [envName, envData] of Object.entries(configData.environments)) {
      const config: EnvironmentConfig = {
        portRange: envData.port_range || envData.portRange || { start: 3000, end: 3999 },
        mainPort: envData.main || envData.mainPort || envData.services?.main || 3000,
        services: envData.services || {},
        dbPrefix: envData.db_prefix || envData.dbPrefix
      };
      this.setEnvironmentConfig(envName, config);
    }

    // Load database configurations
    if (configData.database) {
      // For each environment, determine the appropriate database config
      for (const envName of Object.keys(configData.environments)) {
        // Default to SQLite for non-production environments
        const dbType = envName === "production" || envName === 'staging' ? "postgres" : 'sqlite';
        const dbConfig = configData.database[dbType];
        
        if (dbConfig) {
          const config: DatabaseConfig = {
            type: dbType as "postgres" | 'sqlite',
            ...dbConfig
          };
          this.setDatabaseConfig(envName, config);
        }
      }
    }

    // Load feature flags
    if (configData.features) {
      this.setFeatureFlags(configData.features);
    }

    // Load global config if available
    if (configData.global) {
      this.setGlobalConfig(configData.global);
    }
  }

  async saveToFile(configPath: string): Promise<void> {
    const configData: ConfigurationFile = {
      environments: {},
      database: {},
      features: this.featureFlags
    };

    // Save environment configurations
    for (const [envName, envConfig] of this.environmentConfigs) {
      configData.environments[envName] = {
        port_range: envConfig.portRange,
        mainPort: envConfig.mainPort,
        services: envConfig.services,
        db_prefix: envConfig.dbPrefix
      };
    }

    // Save database configurations by type
    const dbTypes = new Set<string>();
    for (const [envName, dbConfig] of this.databaseConfigs) {
      dbTypes.add(dbConfig.type);
      if (!configData.database[dbConfig.type]) {
        configData.database[dbConfig.type] = {};
      }
      // Store common database config
      if (dbConfig.type === "postgres") {
        configData.database.postgres = {
          host: dbConfig.host || "localhost",
          port: dbConfig.port || 5432,
          user: dbConfig.user
        };
      } else if (dbConfig.type === 'sqlite') {
        configData.database.sqlite = {
          path: dbConfig.path || './data/${env}.db'
        };
      }
    }

    // Save global config if any
    if (Object.keys(this.globalConfig).length > 0) {
      configData.global = this.globalConfig;
    }

    await fs.ensureDir(require('path').dirname(configPath));
    await fs.writeJson(configPath, configData, { spaces: 2 });
  }

  getPortAllocation(environment: string, serviceName: string): number | undefined {
    const envConfig = this.environmentConfigs.get(environment);
    if (!envConfig) return undefined;

    if (serviceName === 'main') {
      return envConfig.mainPort;
    }

    return envConfig.services[serviceName];
  }

  getAllPortsForEnvironment(environment: string): { [serviceName: string]: number } {
    const envConfig = this.environmentConfigs.get(environment);
    if (!envConfig) return {};

    return {
      main: envConfig.mainPort,
      ...envConfig.services
    };
  }

  validateConfiguration(): string[] {
    const errors: string[] = [];

    // Check for port conflicts across environments
    const usedPorts = new Map<number, string[]>();

    for (const [envName, envConfig] of this.environmentConfigs) {
      // Check main port
      const mainPortUsers = usedPorts.get(envConfig.mainPort) || [];
      mainPortUsers.push(`${envName}:main`);
      usedPorts.set(envConfig.mainPort, mainPortUsers);

      // Check service ports
      for (const [serviceName, port] of Object.entries(envConfig.services)) {
        const portUsers = usedPorts.get(port) || [];
        portUsers.push(`${envName}:${serviceName}`);
        usedPorts.set(port, portUsers);
      }
    }

    // Report conflicts
    for (const [port, users] of usedPorts) {
      if (users.length > 1) {
        errors.push(`Port ${port} is used by multiple services: ${users.join(', ')}`);
      }
    }

    return errors;
  }

  clearConfiguration(): void {
    this.environmentConfigs.clear();
    this.databaseConfigs.clear();
    this.featureFlags = {};
    this.globalConfig = {};
  }
}