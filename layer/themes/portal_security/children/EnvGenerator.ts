import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { TokenService } from './TokenService';
import { ConfigManager } from './ConfigManager';
import { ServiceDiscovery } from './ServiceDiscovery';
import { PortManager } from './PortManager';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface EnvConfig {
  environment: "development" | 'demo' | 'release' | 'test';
  outputPath?: string;
  includeSecrets?: boolean;
  includeServiceUrls?: boolean;
  includePorts?: boolean;
  customVariables?: Record<string, string>;
}

export interface GeneratedEnv {
  path: string;
  environment: string;
  variables: Record<string, string>;
  timestamp: Date;
}

export class EnvGenerator {
  private tokenService: TokenService;
  private configManager: ConfigManager;
  private serviceDiscovery: ServiceDiscovery;
  private portManager: PortManager;
  private generatedEnvs: Map<string, GeneratedEnv> = new Map();

  constructor(
    tokenService?: TokenService,
    configManager?: ConfigManager,
    serviceDiscovery?: ServiceDiscovery,
    portManager?: PortManager
  ) {
    this.tokenService = tokenService || new TokenService();
    this.configManager = configManager || new ConfigManager();
    this.serviceDiscovery = serviceDiscovery || new ServiceDiscovery();
    this.portManager = portManager || PortManager.getInstance();
  }

  async generateEnvFile(config: EnvConfig): Promise<GeneratedEnv> {
    const envVariables: Record<string, string> = {};

    // Add environment type
    envVariables.NODE_ENV = config.environment;
    envVariables.APP_ENV = config.environment;

    // Add security tokens if requested
    if (config.includeSecrets !== false) {
      const securityVars = await this.generateSecurityVariables(config.environment);
      Object.assign(envVariables, securityVars);
    }

    // Add service URLs if requested
    if (config.includeServiceUrls !== false) {
      const serviceUrls = await this.generateServiceUrls(config.environment);
      Object.assign(envVariables, serviceUrls);
    }

    // Add port allocations if requested
    if (config.includePorts !== false) {
      const ports = await this.generatePortVariables(config.environment);
      Object.assign(envVariables, ports);
    }

    // Add database configuration based on environment
    const dbConfig = await this.generateDatabaseConfig(config.environment);
    Object.assign(envVariables, dbConfig);

    // Add custom variables if provided
    if (config.customVariables) {
      Object.assign(envVariables, config.customVariables);
    }

    // Generate the .env file content
    const envContent = this.formatEnvContent(envVariables);

    // Determine output path
    const outputPath = config.outputPath || this.getDefaultOutputPath(config.environment);

    // Write the .env file
    await this.writeEnvFile(outputPath, envContent);

    // Create and store the result
    const result: GeneratedEnv = {
      path: outputPath,
      environment: config.environment,
      variables: envVariables,
      timestamp: new Date()
    };

    this.generatedEnvs.set(`${config.environment}-${outputPath}`, result);

    return result;
  }

  private async generateSecurityVariables(environment: string): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};

    // Generate JWT secrets (unique per environment)
    const jwtSecret = await this.tokenService.generateSecret();
    vars.JWT_SECRET = jwtSecret;
    vars.JWT_ACCESS_SECRET = `${jwtSecret}_access_${environment}`;
    vars.JWT_REFRESH_SECRET = `${jwtSecret}_refresh_${environment}`;

    // Generate API keys
    vars.API_KEY = await this.tokenService.generateApiKey();
    vars.INTERNAL_API_KEY = await this.tokenService.generateApiKey();

    // Session configuration
    vars.SESSION_SECRET = await this.tokenService.generateSecret();
    vars.SESSION_TIMEOUT = environment === 'release' ? '3600' : '7200';

    // Security configuration
    vars.CORS_ENABLED = environment === "development" ? 'true' : 'false';
    vars.SECURE_COOKIES = environment === 'release' ? 'true' : 'false';
    vars.HTTPS_ONLY = environment === 'release' ? 'true' : 'false';

    return vars;
  }

  private async generateServiceUrls(environment: string): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    // Get discovered services
    const services = await this.serviceDiscovery.discoverServices(environment);
    
    for (const [serviceName, serviceInfo] of services) {
      const envKey = `${serviceName.toUpperCase()}_SERVICE_URL`;
      vars[envKey] = serviceInfo.url;
      
      // Add health check URL if available
      if (serviceInfo.healthCheckUrl) {
        vars[`${serviceName.toUpperCase()}_HEALTH_URL`] = serviceInfo.healthCheckUrl;
      }
    }

    // Add base URLs based on environment
    const baseUrl = this.getBaseUrl(environment);
    vars.BASE_URL = baseUrl;
    vars.API_BASE_URL = `${baseUrl}/api`;
    vars.AUTH_BASE_URL = `${baseUrl}/auth`;

    return vars;
  }

  private async generatePortVariables(environment: string): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};
    
    // Get port allocations from ConfigManager
    const portAllocations = await this.configManager.getPortAllocations(environment);
    
    for (const [serviceName, port] of Object.entries(portAllocations)) {
      const envKey = `${serviceName.toUpperCase()}_PORT`;
      vars[envKey] = String(port);
    }

    // Default ports
    vars.PORT = vars.MAIN_PORT || '3456';
    vars.API_PORT = vars.API_PORT || '3457';
    vars.AUTH_PORT = vars.AUTH_PORT || '3458';

    return vars;
  }

  private async generateDatabaseConfig(environment: string): Promise<Record<string, string>> {
    const vars: Record<string, string> = {};

    if (environment === 'release') {
      // PostgreSQL for production/release
      vars.DB_TYPE = "postgresql";
      vars.DB_HOST = process.env.POSTGRES_HOST || "localhost";
      vars.DB_PORT = process.env.POSTGRES_PORT || '5432';
      vars.DB_NAME = process.env.POSTGRES_DB || 'portal_security_prod';
      vars.DB_USER = process.env.POSTGRES_USER || 'portal_user';
      vars.DB_PASSWORD = process.env.POSTGRES_PASSWORD || await this.tokenService.generateSecret();
      vars.DB_SSL = 'true';
      vars.DB_CONNECTION_POOL_SIZE = '20';
    } else {
      // SQLite for development/test/demo
      vars.DB_TYPE = 'sqlite';
      vars.DB_PATH = `./data/${environment}.db`;
      vars.DB_IN_MEMORY = environment === 'test' ? 'true' : 'false';
    }

    return vars;
  }

  private formatEnvContent(variables: Record<string, string>): string {
    const lines: string[] = [];
    
    // Group variables by category
    const categories: Record<string, string[]> = {
      "Environment": ['NODE_ENV', 'APP_ENV'],
      "Security": ['JWT_SECRET', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'API_KEY', 'INTERNAL_API_KEY', 'SESSION_SECRET', 'SESSION_TIMEOUT', 'CORS_ENABLED', 'SECURE_COOKIES', 'HTTPS_ONLY'],
      "Services": [],
      'Ports': [],
      "Database": ['DB_TYPE', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_PATH', 'DB_IN_MEMORY', 'DB_SSL', 'DB_CONNECTION_POOL_SIZE'],
      'URLs': ['BASE_URL', 'API_BASE_URL', 'AUTH_BASE_URL'],
      'Custom': []
    };

    // Categorize variables
    for (const key of Object.keys(variables)) {
      if (key.endsWith('_SERVICE_URL') || key.endsWith('_HEALTH_URL')) {
        categories.Services.push(key);
      } else if (key.endsWith('_PORT')) {
        categories.Ports.push(key);
      } else if (!Object.values(categories).flat().includes(key)) {
        categories.Custom.push(key);
      }
    }

    // Generate formatted content
    for (const [category, keys] of Object.entries(categories)) {
      if (keys.length === 0) continue;
      
      lines.push(`# ${category}`);
      lines.push('#' + '='.repeat(60));
      
      for (const key of keys) {
        if (variables[key] !== undefined) {
          const value = variables[key];
          // Quote values that contain spaces or special characters
          const quotedValue = value.includes(' ') || value.includes('#') ? `"${value}"` : value;
          lines.push(`${key}=${quotedValue}`);
        }
      }
      
      lines.push('');
    }

    return lines.join('\n');
  }

  private async writeEnvFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }

    // Write file
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  private async getDefaultOutputPath(environment: string): string {
    const baseDir = process.cwd();
    return path.join(baseDir, `.env.${environment}`);
  }

  private async getBaseUrl(environment: string): string {
    switch (environment) {
      case 'release':
        return 'https://portal.production.com';
      case 'demo':
        return 'https://portal.demo.com';
      case "development":
        return 'http://localhost:3456';
      case 'test':
        return 'http://localhost:3456';
      default:
        return 'http://localhost:3456';
    }
  }

  async updateEnvFile(
    environment: string,
    updates: Record<string, string>,
    outputPath?: string
  ): Promise<GeneratedEnv> {
    const filePath = outputPath || this.getDefaultOutputPath(environment);
    
    // Read existing env file if it exists
    let existingVars: Record<string, string> = {};
    if (fs.existsSync(filePath)) {
      const content = fileAPI.readFileSync(filePath, 'utf-8');
      existingVars = this.parseEnvContent(content);
    }

    // Merge updates
    const mergedVars = { ...existingVars, ...updates };

    // Generate new content
    const newContent = this.formatEnvContent(mergedVars);

    // Write updated file
    await this.writeEnvFile(filePath, newContent);

    // Create and store result
    const result: GeneratedEnv = {
      path: filePath,
      environment,
      variables: mergedVars,
      timestamp: new Date()
    };

    this.generatedEnvs.set(`${environment}-${filePath}`, result);

    return result;
  }

  private async parseEnvContent(content: string): Record<string, string> {
    const vars: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') continue;

      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=');
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        vars[key.trim()] = value.trim();
      }
    }

    return vars;
  }

  async getGeneratedEnvs(): Map<string, GeneratedEnv> {
    return new Map(this.generatedEnvs);
  }

  async clearGeneratedEnvs(): void {
    this.generatedEnvs.clear();
  }
}