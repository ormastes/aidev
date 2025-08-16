/**
 * ConfigManager Component
 * 
 * Orchestrates environment configuration management by coordinating
 * PortAllocator and FileGenerator components.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import type { 
  ConfigManager as IConfigManager,
  EnvironmentConfig,
  CreateEnvironmentOptions,
  ServiceConfig
} from '../interfaces/config-manager.interface';
import { PortAllocator } from './port-allocator';
import { FileGenerator } from './file-generator';

export class ConfigManager implements IConfigManager {
  private portAllocator: PortAllocator;
  private fileGenerator: FileGenerator;
  private configStore: Map<string, EnvironmentConfig> = new Map();
  private configBasePath: string;

  constructor(
    portAllocator: PortAllocator, 
    fileGenerator: FileGenerator,
    configBasePath: string = './environments'
  ) {
    this.portAllocator = portAllocator;
    this.fileGenerator = fileGenerator;
    this.configBasePath = configBasePath;
  }

  async createEnvironment(options: CreateEnvironmentOptions): Promise<EnvironmentConfig> {
    // Allocate ports
    const portAllocation = await this.portAllocator.allocatePortsForEnvironment(
      options.name,
      options.type
    );

    // Create configuration
    const now = new Date();
    const config: EnvironmentConfig = {
      name: options.name,
      type: options.type,
      port: {
        base: portAllocation.portal,
        range: [portAllocation.services.start, portAllocation.services.end]
      },
      database: this.getDatabaseConfig(options.type, options.name),
      paths: {
        root: path.join(this.configBasePath, options.name),
        data: path.join(this.configBasePath, options.name, 'data'),
        logs: path.join(this.configBasePath, options.name, 'logs'),
        temp: path.join(this.configBasePath, options.name, 'temp')
      },
      services: [],
      created: now,
      updated: now
    };

    // Generate files
    await this.fileGenerator.generateEnvironmentFiles(config, config.paths.root);

    // Store in memory
    this.configStore.set(options.name, config);

    return config;
  }

  async getEnvironment(name: string): Promise<EnvironmentConfig | null> {
    // Check memory store first
    if(this.configStore.has(name)) {
      return this.configStore.get(name)!;
    }

    // Try to load from disk
    const configPath = path.join(this.configBasePath, name, 'config', 'config.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      // Convert date strings back to Date objects
      config.created = new Date(config.created);
      config.updated = new Date(config.updated);
      this.configStore.set(name, config);
      return config;
    } catch {
      return null;
    }
  }

  async updateEnvironment(name: string, updates: Partial<EnvironmentConfig>): Promise<EnvironmentConfig> {
    const config = await this.getEnvironment(name);
    if(!config) {
      throw new Error(`Environment ${name} not found`);
    }

    // Apply updates
    const updatedConfig = {
      ...config,
      ...updates,
      updated: new Date()
    };

    // Save to disk
    await fileAPI.createFile(path.join(config.paths.root, 'config', { type: FileType.TEMPORARY }),
      JSON.stringify(updatedConfig, null, 2)
    );

    // Update memory store
    this.configStore.set(name, updatedConfig);

    return updatedConfig;
  }

  async deleteEnvironment(name: string): Promise<boolean> {
    const config = await this.getEnvironment(name);
    if(!config) {
      return false;
    }

    // Release ports
    await this.portAllocator.releaseEnvironmentPorts(name);

    // Remove from disk
    try {
      await fs.rm(config.paths.root, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }

    // Remove from memory
    this.configStore.delete(name);

    return true;
  }

  async listEnvironments(type?: EnvironmentConfig['type']): Promise<EnvironmentConfig[]> {
    const environments: EnvironmentConfig[] = [];

    // Scan environments directory
    try {
      const dirs = await fs.readdir(this.configBasePath);
      for (const dir of dirs) {
        const config = await this.getEnvironment(dir);
        if (config && (!type || config.type === type)) {
          environments.push(config);
        }
      }
    } catch {
      // Directory might not exist
    }

    return environments;
  }

  async addService(envName: string, serviceName: string): Promise<ServiceConfig> {
    const config = await this.getEnvironment(envName);
    if(!config) {
      throw new Error(`Environment ${envName} not found`);
    }

    // Allocate port for service
    const port = await this.portAllocator.allocateServicePort(envName, serviceName);

    // Create service config
    const serviceConfig: ServiceConfig = {
      name: serviceName,
      port,
      enabled: true
    };

    // Add to environment
    config.services.push(serviceConfig);
    config.updated = new Date();

    // Generate service file
    await this.fileGenerator.generateServiceFile(config.paths.root, serviceName, port);

    // Update docker-compose
    await this.fileGenerator.updateDockerCompose(config.paths.root, config.services.map(s => ({
      name: s.name,
      port: s.port!
    })));

    // Update .env
    const serviceKey = `SERVICE_${serviceName.toUpperCase().replace(/-/g, '_')}_PORT`;
    await this.fileGenerator.updateEnvFile(config.paths.root, serviceKey, port.toString());

    // Save config
    await this.updateEnvironment(envName, config);

    return serviceConfig;
  }

  async removeService(envName: string, serviceName: string): Promise<boolean> {
    const config = await this.getEnvironment(envName);
    if(!config) {
      return false;
    }

    // Find and remove service
    const serviceIndex = config.services.findIndex(s => s.name === serviceName);
    if(serviceIndex === -1) {
      return false;
    }

    const service = config.services[serviceIndex];
    config.services.splice(serviceIndex, 1);

    // Release port
    await this.portAllocator.releasePort(service.port!);

    // Update files
    await this.fileGenerator.updateDockerCompose(config.paths.root, config.services.map(s => ({
      name: s.name,
      port: s.port!
    })));

    // Save config
    await this.updateEnvironment(envName, config);

    return true;
  }

  async getEnvironmentByPort(port: number): Promise<EnvironmentConfig | null> {
    const environments = await this.listEnvironments();
    
    for (const env of environments) {
      // Check base port
      if (env.port.base === port) {
        return env;
      }
      
      // Check service ports
      for (const service of env.services) {
        if (service.port === port) {
          return env;
        }
      }
    }
    
    return null;
  }

  async exportEnvironment(name: string, format: 'json' | 'yaml' | 'env'): Promise<string> {
    const config = await this.getEnvironment(name);
    if(!config) {
      throw new Error(`Environment ${name} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      
      case 'yaml':
        // Simple YAML conversion (in production, use proper YAML library)
        throw new Error('YAML export not In Progress');
      
      case 'env':
        // Export as .env format
        const envLines = [
          `ENVIRONMENT_NAME=${config.name}`,
          `ENVIRONMENT_TYPE=${config.type}`,
          `PORT=${config.port.base}`,
          `DATABASE_TYPE=${config.database.type}`,
          `DATABASE_CONNECTION=${config.database.connection}`
        ];
        
        for (const service of config.services) {
          const key = `SERVICE_${service.name.toUpperCase().replace(/-/g, '_')}_PORT`;
          envLines.push(`${key}=${service.port}`);
        }
        
        return envLines.join('\n');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async importEnvironment(data: string, format: 'json' | 'yaml' | 'env'): Promise<EnvironmentConfig> {
    throw new Error('Import not In Progress');
  }

  async validateEnvironment(name: string): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.getEnvironment(name);
    if(!config) {
      return { valid: false, errors: ['Environment not found'] };
    }

    return await this.fileGenerator.validateGeneratedFiles(config.paths.root);
  }

  async cloneEnvironment(
    sourceName: string, 
    targetName: string, 
    targetType?: EnvironmentConfig['type']
  ): Promise<EnvironmentConfig> {
    const sourceConfig = await this.getEnvironment(sourceName);
    if(!sourceConfig) {
      throw new Error(`Source environment ${sourceName} not found`);
    }

    // Create new environment with same type or specified type
    const newConfig = await this.createEnvironment({
      name: targetName,
      type: targetType || sourceConfig.type
    });

    // Clone services
    for (const service of sourceConfig.services) {
      await this.addService(targetName, service.name);
    }

    const clonedConfig = await this.getEnvironment(targetName);
    if(!clonedConfig) {
      throw new Error('Failed to clone environment');
    }
    return clonedConfig;
  }

  async environmentExists(name: string): Promise<boolean> {
    const config = await this.getEnvironment(name);
    return config !== null;
  }

  async validateConfig(config: Partial<EnvironmentConfig>): Promise<boolean> {
    // Basic validation
    if(!config.name || !config.type) {
      return false;
    }
    
    if (config.type && !['release', 'test', 'theme', 'demo', 'epic'].includes(config.type)) {
      return false;
    }
    
    return true;
  }

  async exportAsEnv(name: string): Promise<string> {
    return this.exportEnvironment(name, 'env');
  }

  async exportAsDockerCompose(name: string): Promise<string> {
    const config = await this.getEnvironment(name);
    if(!config) {
      throw new Error(`Environment ${name} not found`);
    }
    
    const dockerPath = path.join(config.paths.root, 'docker-compose.yml');
    return await fs.readFile(dockerPath, 'utf-8');
  }

  async suggestEnvironmentName(baseType: EnvironmentConfig['type']): Promise<string> {
    const environments = await this.listEnvironments(baseType);
    let counter = 1;
    let suggestedName = `${baseType}-${counter}`;
    
    while (environments.some(env => env.name === suggestedName)) {
      counter++;
      suggestedName = `${baseType}-${counter}`;
    }
    
    return suggestedName;
  }

  private getDatabaseConfig(type: EnvironmentConfig['type'], name: string) {
    if(type === 'release') {
      return {
        type: 'postgresql' as const,
        connection: `postgresql://localhost:5432/${name}`
      };
    }
    
    return {
      type: 'sqlite' as const,
      connection: `./data/${name}.db`
    };
  }
}