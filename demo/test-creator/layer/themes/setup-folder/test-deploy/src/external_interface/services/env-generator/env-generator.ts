import * as fs from 'fs-extra';
import { path } from '../../../../../../../../../../layer/themes/infra_external-log-lib/dist';

export interface EnvConfig {
  [key: string]: string | number | boolean;
}

export interface EnvGeneratorOptions {
  outputPath: string;
  environment: 'development' | 'test' | 'demo' | 'staging' | 'production' | 'release';
  includeTokens?: boolean;
  includeServiceUrls?: boolean;
  includeDependencies?: boolean;
  includePortAllocations?: boolean;
  includeDatabaseConfig?: boolean;
  includeFeatureFlags?: boolean;
  includeGlobalConfig?: boolean;
}

export class EnvGenerator {
  private config: EnvConfig = {};
  private tokenService: any;
  private serviceDiscovery: any;
  private configManager: any;

  constructor() {
    this.config = {};
  }

  setTokenService(tokenService: any): void {
    this.tokenService = tokenService;
  }

  setServiceDiscovery(serviceDiscovery: any): void {
    this.serviceDiscovery = serviceDiscovery;
  }

  setConfigManager(configManager: any): void {
    this.configManager = configManager;
  }

  addConfig(key: string, value: string | number | boolean): void {
    this.config[key] = value;
  }

  addConfigs(configs: EnvConfig): void {
    Object.assign(this.config, configs);
  }

  async generate(options: EnvGeneratorOptions): Promise<string> {
    const envContent: string[] = [];
    
    // Add environment
    envContent.push(`# Environment: ${options.environment}`);
    envContent.push(`NODE_ENV=${options.environment}`);
    envContent.push('');

    // Add all config entries
    for (const [key, value] of Object.entries(this.config)) {
      envContent.push(`${key}=${value}`);
    }

    // Add tokens if requested and tokenService is available
    if (options.includeTokens && this.tokenService) {
      envContent.push('');
      envContent.push('# Security Tokens');
      const tokens = await this.tokenService.generateTokens(options.environment);
      for (const [key, value] of Object.entries(tokens)) {
        envContent.push(`${key}=${value}`);
      }
    }

    // Add service URLs if requested and serviceDiscovery is available
    if (options.includeServiceUrls && this.serviceDiscovery) {
      envContent.push('');
      envContent.push('# Service URLs');
      
      const services = this.serviceDiscovery.getAllServices();
      const dependencies: Map<string, string[]> = new Map();
      
      for (const service of services) {
        const serviceId = service.id;
        const envVarPrefix = this.formatServiceName(serviceId);
        
        // Get environment-specific or default URL and port
        const url = this.serviceDiscovery.getServiceUrl(serviceId, options.environment);
        const port = this.serviceDiscovery.getServicePort(serviceId, options.environment);
        
        if (url) {
          envContent.push(`${envVarPrefix}_URL=${url}`);
        }
        if (port) {
          envContent.push(`${envVarPrefix}_PORT=${port}`);
        }
        
        // Add additional service properties
        if (service.requiresAuth !== undefined) {
          envContent.push(`${envVarPrefix}_REQUIRES_AUTH=${service.requiresAuth}`);
        }
        
        // Collect dependencies if needed
        if (options.includeDependencies && service.dependencies) {
          dependencies.set(serviceId, service.dependencies);
        }
      }
      
      // Add service dependencies if requested
      if (options.includeDependencies && dependencies.size > 0) {
        envContent.push('');
        envContent.push('# Service Dependencies');
        for (const [serviceId, deps] of dependencies) {
          const envVarPrefix = this.formatServiceName(serviceId);
          envContent.push(`${envVarPrefix}_DEPENDENCIES=${deps.join(',')}`);
        }
      }
    }

    // Add port allocations if requested and configManager is available
    if (options.includePortAllocations && this.configManager) {
      envContent.push('');
      envContent.push('# Port Allocations');
      
      const envConfig = this.configManager.getEnvironmentConfig(options.environment);
      if (envConfig) {
        // Add main port
        envContent.push(`PORT=${envConfig.mainPort}`);
        
        // Add service ports
        const allPorts = this.configManager.getAllPortsForEnvironment(options.environment);
        for (const [serviceName, port] of Object.entries(allPorts)) {
          if (serviceName !== 'main') {
            const envVarName = this.formatServiceName(serviceName) + '_PORT';
            envContent.push(`${envVarName}=${port}`);
          }
        }
        
        // Add port range info
        envContent.push(`PORT_RANGE_START=${envConfig.portRange.start}`);
        envContent.push(`PORT_RANGE_END=${envConfig.portRange.end}`);
      }
    }

    // Add database configuration if requested and configManager is available
    if (options.includeDatabaseConfig && this.configManager) {
      const dbConfig = this.configManager.getDatabaseConfig(options.environment);
      if (dbConfig) {
        envContent.push('');
        envContent.push('# Database Configuration');
        envContent.push(`DB_TYPE=${dbConfig.type}`);
        
        if (dbConfig.type === 'postgres' || dbConfig.type === 'mysql') {
          if (dbConfig.host) envContent.push(`DB_HOST=${dbConfig.host}`);
          if (dbConfig.port) envContent.push(`DB_PORT=${dbConfig.port}`);
          if (dbConfig.database) envContent.push(`DB_NAME=${dbConfig.database}`);
          if (dbConfig.user) envContent.push(`DB_USER=${dbConfig.user}`);
          // Note: We don't include password in the generated file for security
        } else if (dbConfig.type === 'sqlite') {
          if (dbConfig.path) envContent.push(`DB_PATH=${dbConfig.path}`);
        }
      }
    }

    // Add feature flags if requested and configManager is available
    if (options.includeFeatureFlags && this.configManager) {
      const featureFlags = this.configManager.getFeatureFlags();
      if (Object.keys(featureFlags).length > 0) {
        envContent.push('');
        envContent.push('# Feature Flags');
        for (const [feature, enabled] of Object.entries(featureFlags)) {
          const envVarName = 'FEATURE_' + this.formatServiceName(feature);
          envContent.push(`${envVarName}=${enabled}`);
        }
      }
    }

    // Add global configuration if requested and configManager is available
    if (options.includeGlobalConfig && this.configManager) {
      const globalConfig = this.configManager.getGlobalConfig();
      if (Object.keys(globalConfig).length > 0) {
        envContent.push('');
        envContent.push('# Global Configuration');
        for (const [key, value] of Object.entries(globalConfig)) {
          const envVarName = this.formatServiceName(key);
          envContent.push(`${envVarName}=${value}`);
        }
      }
    }

    const content = envContent.join('\n') + '\n';

    // Write to file
    await fs.ensureDir(path.dirname(options.outputPath));
    await fs.writeFile(options.outputPath, content, 'utf-8');

    return content;
  }

  private formatServiceName(serviceName: string): string {
    // Convert service name to uppercase environment variable format
    // First, handle camelCase by inserting underscores before uppercase letters
    const withUnderscores = serviceName.replace(/([a-z])([A-Z])/g, '$1_$2');
    // Then replace hyphens, dots, and spaces with underscores
    return withUnderscores
      .replace(/[-.\s]/g, '_')
      .toUpperCase();
  }

  clearConfig(): void {
    this.config = {};
  }

  getConfig(): EnvConfig {
    return { ...this.config };
  }
}