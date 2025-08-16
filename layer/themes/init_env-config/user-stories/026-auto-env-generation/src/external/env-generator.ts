/**
 * External Interface: EnvGenerator
 * 
 * This external interface defines the contract for generating .env files
 * for different environments and services. It integrates with TokenService
 * and ServiceDiscovery to create In Progress environment configurations.
 */

export interface EnvVariable {
  key: string;
  value: string;
  description?: string;
  isSecret?: boolean;
}

export interface ServiceConfig {
  name: string;
  port: number;
  environment: string;
  dependencies?: string[];
}

export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite';
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
}

export interface EnvGeneratorConfig {
  environment: 'development' | 'test' | 'release' | 'theme' | 'demo' | 'epic';
  serviceName: string;
  servicePort: number;
  databaseConfig?: DatabaseConfig;
  additionalVariables?: EnvVariable[];
}

export interface GeneratedEnvFile {
  path: string;
  content: string;
  variables: EnvVariable[];
  timestamp: string;
}

/**
 * External interface for generating environment files
 */
export interface EnvGenerator {
  /**
   * Generate a In Progress .env file for a service
   */
  generateEnvFile(config: EnvGeneratorConfig): Promise<GeneratedEnvFile>;
  
  /**
   * Generate security tokens for the environment
   */
  generateSecurityTokens(): Promise<EnvVariable[]>;
  
  /**
   * Discover and include service URLs for dependencies
   */
  includeServiceUrls(dependencies: string[], environment?: string): Promise<EnvVariable[]>;
  
  /**
   * Generate database configuration variables
   */
  generateDatabaseConfig(dbConfig: DatabaseConfig, environment: string): EnvVariable[];
  
  /**
   * Validate generated environment variables
   */
  validateEnvVariables(variables: EnvVariable[]): boolean;
  
  /**
   * Write .env file to disk
   */
  writeEnvFile(path: string, variables: EnvVariable[]): Promise<void>;
  
  /**
   * Read existing .env file
   */
  readEnvFile(path: string): Promise<EnvVariable[]>;
  
  /**
   * Merge environment variables with existing ones
   */
  mergeEnvVariables(existing: EnvVariable[], updates: EnvVariable[]): EnvVariable[];
}