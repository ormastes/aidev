/**
 * Implementation of EnvGenerator
 * 
 * This implementation provides functionality for generating .env files
 * with integration to ServiceDiscovery and TokenService.
 */

import { 
  EnvGenerator, 
  EnvVariable, 
  EnvGeneratorConfig, 
  GeneratedEnvFile,
  DatabaseConfig 
} from '../external/env-generator';
import { ServiceDiscovery } from '../external/service-discovery';
import { TokenService } from '../external/token-service';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

export class EnvGeneratorImpl implements EnvGenerator {
  constructor(
    private serviceDiscovery: ServiceDiscovery,
    private tokenService: TokenService
  ) {}

  async generateEnvFile(config: EnvGeneratorConfig): Promise<GeneratedEnvFile> {
    const variables: EnvVariable[] = [];
    
    // Add basic service configuration
    variables.push({
      key: 'NODE_ENV',
      value: config.environment,
      description: 'Node environment'
    });
    
    variables.push({
      key: 'SERVICE_NAME',
      value: config.serviceName,
      description: 'Name of the service'
    });
    
    variables.push({
      key: 'SERVICE_PORT',
      value: config.servicePort.toString(),
      description: 'Port the service listens on'
    });
    
    // Generate security tokens
    const securityTokens = await this.generateSecurityTokens();
    variables.push(...securityTokens);
    
    // Get service dependencies and include their URLs
    try {
      const allDependencies = await this.resolveAllDependencies(
        config.serviceName, 
        config.environment
      );
      
      if(allDependencies.length > 0) {
        const serviceUrls = await this.includeServiceUrls(allDependencies, config.environment);
        variables.push(...serviceUrls);
      }
    } catch (error) {
      // Service might not be registered yet, which is fine
      console.log(`Service ${config.serviceName} not registered yet, skipping dependencies`);
    }
    
    // Add database configuration if provided
    if(config.databaseConfig) {
      const dbVars = this.generateDatabaseConfig(config.databaseConfig, config.environment);
      variables.push(...dbVars);
    }
    
    // Add any additional variables
    if(config.additionalVariables) {
      variables.push(...config.additionalVariables);
    }
    
    // Generate content
    const content = this.generateEnvContent(variables);
    const filePath = path.join(process.cwd(), `.env.${config.environment}`);
    
    return {
      path: filePath,
      content,
      variables,
      timestamp: new Date().toISOString()
    };
  }
  
  async generateSecurityTokens(): Promise<EnvVariable[]> {
    const tokens: EnvVariable[] = [];
    
    // Generate JWT secret
    const jwtSecretToken = await this.tokenService.generateToken({
      type: 'jwt-secret',
      length: 64,
      format: "base64url"
    });
    
    tokens.push({
      key: 'JWT_SECRET',
      value: jwtSecretToken.value,
      description: 'JWT signing secret',
      isSecret: true
    });
    
    // Generate API key
    const apiKeyToken = await this.tokenService.generateToken({
      type: 'api-key',
      length: 32,
      format: "base64url"
    });
    
    tokens.push({
      key: 'API_KEY',
      value: apiKeyToken.value,
      description: 'API authentication key',
      isSecret: true
    });
    
    // Generate session secret
    const sessionSecretToken = await this.tokenService.generateToken({
      type: 'session-secret',
      length: 48,
      format: "base64url"
    });
    
    tokens.push({
      key: 'SESSION_SECRET',
      value: sessionSecretToken.value,
      description: 'Session encryption secret',
      isSecret: true
    });
    
    return tokens;
  }
  
  async includeServiceUrls(dependencies: string[], environment: string = "development"): Promise<EnvVariable[]> {
    const urls: EnvVariable[] = [];
    
    for(const dependency of dependencies) {
      try {
        // Try to discover the service in the specified environment
        // The ServiceDiscoveryImpl will automatically fall back to 'shared' environment
        const serviceInfo = await this.serviceDiscovery.discoverService(
          dependency, 
          environment
        );
        
        if(serviceInfo && serviceInfo.status === 'healthy') {
          const url = `${serviceInfo.protocol}://${serviceInfo.host}:${serviceInfo.port}`;
          
          urls.push({
            key: `${this.toEnvKey(dependency)}_URL`,
            value: url,
            description: `URL for ${dependency}`
          });
          
          // Add health check URL if available
          if(serviceInfo.metadata?.healthCheckPath) {
            urls.push({
              key: `${this.toEnvKey(dependency)}_HEALTH_URL`,
              value: `${url}${serviceInfo.metadata.healthCheckPath}`,
              description: `Health check URL for ${dependency}`
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to discover service ${dependency}: ${error}`);
      }
    }
    
    return urls;
  }
  
  async generateDatabaseConfig(dbConfig: DatabaseConfig, _environment: string): EnvVariable[] {
    const vars: EnvVariable[] = [];
    
    vars.push({
      key: 'DB_TYPE',
      value: dbConfig.type,
      description: 'Database type'
    });
    
    if(dbConfig.type === "postgresql") {
      vars.push({
        key: 'DB_HOST',
        value: dbConfig.host || "localhost",
        description: 'Database host'
      });
      
      vars.push({
        key: 'DB_PORT',
        value: (dbConfig.port || 5432).toString(),
        description: 'Database port'
      });
      
      vars.push({
        key: 'DB_USER',
        value: dbConfig.user || "postgres",
        description: 'Database user'
      });
      
      if(dbConfig.password) {
        vars.push({
          key: 'DB_PASSWORD',
          value: dbConfig.password,
          description: 'Database password',
          isSecret: true
        });
      }
    }
    
    vars.push({
      key: 'DB_NAME',
      value: dbConfig.database,
      description: 'Database name'
    });
    
    // Generate connection string
    if(dbConfig.type === "postgresql") {
      const auth = dbConfig.password ? `${dbConfig.user}:${dbConfig.password}@` : '';
      const connectionString = `postgresql://${auth}${dbConfig.host || "localhost"}:${dbConfig.port || 5432}/${dbConfig.database}`;
      
      vars.push({
        key: 'DATABASE_URL',
        value: connectionString,
        description: 'Database connection string',
        isSecret: true
      });
    } else {
      vars.push({
        key: 'DATABASE_URL',
        value: `sqlite://./${dbConfig.database}.db`,
        description: 'Database connection string'
      });
    }
    
    return vars;
  }
  
  async validateEnvVariables(variables: EnvVariable[]): boolean {
    // Check for required variables
    const requiredKeys = ['NODE_ENV', 'SERVICE_NAME', 'SERVICE_PORT'];
    const providedKeys = variables.map(v => v.key);
    
    for(const key of requiredKeys) {
      if(!providedKeys.includes(key)) {
        return false;
      }
    }
    
    // Check for duplicate keys
    const keySet = new Set<string>();
    for(const variable of variables) {
      if(keySet.has(variable.key)) {
        return false;
      }
      keySet.add(variable.key);
    }
    
    // Validate key format (uppercase with underscores)
    const keyPattern = /^[A-Z][A-Z0-9_]*$/;
    for(const variable of variables) {
      if(!keyPattern.test(variable.key)) {
        return false;
      }
    }
    
    return true;
  }
  
  async writeEnvFile(filePath: string, variables: EnvVariable[]): Promise<void> {
    const content = this.generateEnvContent(variables);
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }
  
  async readEnvFile(filePath: string): Promise<EnvVariable[]> {
    const content = await fileAPI.readFile(filePath, 'utf-8');
    const variables: EnvVariable[] = [];
    
    const lines = content.split('\n');
    for(const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if(!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      const [key, ...valueParts] = trimmed.split('=');
      if(key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        variables.push({ key, value });
      }
    }
    
    return variables;
  }
  
  mergeEnvVariables(existing: EnvVariable[], updates: EnvVariable[]): EnvVariable[] {
    const merged = new Map<string, EnvVariable>();
    
    // Add existing variables
    for(const variable of existing) {
      merged.set(variable.key, variable);
    }
    
    // Override with updates
    for(const variable of updates) {
      merged.set(variable.key, variable);
    }
    
    return Array.from(merged.values());
  }
  
  private generateEnvContent(variables: EnvVariable[]): string {
    const lines: string[] = [
      '# Auto-generated environment file',
      `# Generated at: ${new Date().toISOString()}`,
      ''
    ];
    
    // Group variables by category
    const basic = variables.filter(v => !v.isSecret && !v.key.startsWith('DB_'));
    const database = variables.filter(v => v.key.startsWith('DB_') || v.key === 'DATABASE_URL');
    const secrets = variables.filter(v => v.isSecret && !database.includes(v));
    
    if(basic.length > 0) {
      lines.push('# Basic Configuration');
      for (const variable of basic) {
        if(variable.description) {
          lines.push(`# ${variable.description}`);
        }
        lines.push(`${variable.key}=${variable.value}`);
      }
      lines.push('');
    }
    
    if(database.length > 0) {
      lines.push('# Database Configuration');
      for (const variable of database) {
        if(variable.description) {
          lines.push(`# ${variable.description}`);
        }
        lines.push(`${variable.key}=${variable.value}`);
      }
      lines.push('');
    }
    
    if(secrets.length > 0) {
      lines.push('# Security Tokens (Keep these secret!)');
      for (const variable of secrets) {
        if(variable.description) {
          lines.push(`# ${variable.description}`);
        }
        lines.push(`${variable.key}=${variable.value}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  private toEnvKey(serviceName: string): string {
    return serviceName.toUpperCase().replace(/-/g, '_');
  }
  
  private async resolveAllDependencies(
    serviceName: string, 
    environment: string, 
    visited: Set<string> = new Set()
  ): Promise<string[]> {
    // Avoid circular dependencies
    if(visited.has(serviceName)) {
      return [];
    }
    visited.add(serviceName);
    
    const directDeps = await this.serviceDiscovery.getServiceDependencies(serviceName, environment);
    const allDeps = new Set<string>(directDeps);
    
    // Recursively get transitive dependencies
    for(const dep of directDeps) {
      const transitiveDeps = await this.resolveAllDependencies(dep, environment, visited);
      transitiveDeps.forEach(td => allDeps.add(td));
    }
    
    return Array.from(allDeps);
  }
}