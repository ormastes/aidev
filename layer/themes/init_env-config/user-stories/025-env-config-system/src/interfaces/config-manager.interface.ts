/**
 * ConfigManager External Interface
 * 
 * Defines the contract for the configuration management system.
 * This interface is used by external consumers to interact with the config system.
 */

export interface EnvironmentConfig {
  name: string;
  type: 'theme' | 'epic' | 'demo' | 'release' | 'test';
  port: {
    base: number;
    range: [number, number];
  };
  database: {
    type: "postgresql" | 'sqlite';
    connection: string;
  };
  paths: {
    root: string;
    data: string;
    logs: string;
    temp: string;
  };
  services: ServiceConfig[];
  dependencies?: ThemeDependency[];
  created: Date;
  updated: Date;
}

export interface ServiceConfig {
  name: string;
  port?: number;
  enabled: boolean;
  endpoints?: string[];
  healthCheck?: string;
}

export interface ThemeDependency {
  theme: string;
  version?: string;
  endpoints: string[];
  required: boolean;
}

export interface CreateEnvironmentOptions {
  name: string;
  type: EnvironmentConfig['type'];
  description?: string;
  services?: string[];
  dependencies?: ThemeDependency[];
}

export interface UpdateEnvironmentOptions {
  description?: string;
  services?: ServiceConfig[];
  dependencies?: ThemeDependency[];
}

export interface ConfigManager {
  /**
   * Create a new environment configuration
   */
  createEnvironment(options: CreateEnvironmentOptions): Promise<EnvironmentConfig>;
  
  /**
   * Get an existing environment configuration
   */
  getEnvironment(name: string): Promise<EnvironmentConfig | null>;
  
  /**
   * Update an existing environment configuration
   */
  updateEnvironment(name: string, options: UpdateEnvironmentOptions): Promise<EnvironmentConfig>;
  
  /**
   * Delete an environment configuration
   */
  deleteEnvironment(name: string): Promise<boolean>;
  
  /**
   * List all environment configurations
   */
  listEnvironments(type?: EnvironmentConfig['type']): Promise<EnvironmentConfig[]>;
  
  /**
   * Add a service to an environment
   */
  addService(envName: string, serviceName: string): Promise<ServiceConfig>;
  
  /**
   * Remove a service from an environment
   */
  removeService(envName: string, serviceName: string): Promise<boolean>;
  
  /**
   * Check if an environment exists
   */
  environmentExists(name: string): Promise<boolean>;
  
  /**
   * Validate environment configuration
   */
  validateConfig(config: Partial<EnvironmentConfig>): Promise<boolean>;
  
  /**
   * Export environment configuration as .env file content
   */
  exportAsEnv(name: string): Promise<string>;
  
  /**
   * Export environment configuration as docker-compose.yml content
   */
  exportAsDockerCompose(name: string): Promise<string>;
  
  /**
   * Get suggested next available environment name
   */
  suggestEnvironmentName(type: EnvironmentConfig['type']): Promise<string>;
}