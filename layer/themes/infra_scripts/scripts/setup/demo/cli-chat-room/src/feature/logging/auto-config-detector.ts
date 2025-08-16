/**
 * Automatic Configuration Detector
 * Scans application environment and configures interception automatically
 */

import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import { os } from '../../../../../../../../infra_external-log-lib/src';
import { parse as parseYaml } from 'yaml';
import { config as dotenvConfig } from 'dotenv';

export interface AutoConfig {
  framework?: string;
  databases: DatabaseConfig[];
  services: ServiceConfig[];
  cloudProviders: CloudProvider[];
  messageQueues: MessageQueueConfig[];
  interceptRules: InterceptRule[];
  security: SecurityConfig;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'sqlite' | 'dynamodb' | 'firestore';
  host?: string;
  port?: number;
  database?: string;
  url?: string;
  source: string; // Where this config was found
}

export interface ServiceConfig {
  name: string;
  type: 'http' | 'grpc' | 'websocket' | 'graphql';
  url: string;
  source: string;
}

export interface CloudProvider {
  name: 'aws' | 'gcp' | 'azure';
  services: string[];
  region?: string;
}

export interface MessageQueueConfig {
  type: 'rabbitmq' | 'kafka' | 'redis-pubsub' | 'sqs' | 'pubsub';
  url?: string;
  topics?: string[];
}

export interface InterceptRule {
  pattern: string;
  action: 'include' | 'exclude' | 'redact';
  reason?: string;
}

export interface SecurityConfig {
  redactPatterns: string[];
  sensitiveFields: string[];
  complianceMode?: 'gdpr' | 'hipaa' | 'pci' | 'sox';
}

export class AutoConfigDetector {
  private projectRoot: string;
  private config: AutoConfig = {
    databases: [],
    services: [],
    cloudProviders: [],
    messageQueues: [],
    interceptRules: [],
    security: {
      redactPatterns: [],
      sensitiveFields: []
    }
  };

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || this.findProjectRoot();
  }

  /**
   * Detect all configurations automatically
   */
  async detect(): Promise<AutoConfig> {
    console.log(`🔍 Auto-detecting configuration in: ${this.projectRoot}`);

    // Detect in parallel
    await Promise.all([
      this.detectFromPackageJson(),
      this.detectFromEnvFiles(),
      this.detectFromConfigFiles(),
      this.detectFromDockerCompose(),
      this.detectFromKubernetes(),
      this.detectFromCloudConfig(),
      this.detectFromFramework(),
      this.detectFromProcessEnv(),
      this.detectFromDependencies()
    ]);

    // Apply intelligent defaults
    this.applyIntelligentDefaults();

    // Generate interception rules
    this.generateInterceptRules();

    return this.config;
  }

  /**
   * Find project root by looking for package.json
   */
  private findProjectRoot(): string {
    let dir = process.cwd();
    while (dir !== '/') {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        return dir;
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  }

  /**
   * Detect from package.json
   */
  private async detectFromPackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Detect framework
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.express) this.config.framework = 'express';
    else if (dependencies['@nestjs/core']) this.config.framework = 'nestjs';
    else if (dependencies.next) this.config.framework = 'nextjs';
    else if (dependencies.fastify) this.config.framework = 'fastify';
    else if (dependencies.koa) this.config.framework = 'koa';
    else if (dependencies['@hapi/hapi']) this.config.framework = 'hapi';

    // Detect databases
    if (dependencies.pg || dependencies['pg-pool']) {
      this.config.databases.push({ type: 'postgres', source: 'package.json' });
    }
    if (dependencies.mysql || dependencies.mysql2) {
      this.config.databases.push({ type: 'mysql', source: 'package.json' });
    }
    if (dependencies.mongodb || dependencies.mongoose) {
      this.config.databases.push({ type: 'mongodb', source: 'package.json' });
    }
    if (dependencies.redis || dependencies.ioredis) {
      this.config.databases.push({ type: 'redis', source: 'package.json' });
    }
    if (dependencies.sqlite3 || dependencies['better-sqlite3']) {
      this.config.databases.push({ type: 'sqlite', source: 'package.json' });
    }

    // Detect cloud SDKs
    if (dependencies['aws-sdk'] || dependencies['@aws-sdk/client-s3']) {
      this.config.cloudProviders.push({ 
        name: 'aws', 
        services: this.detectAWSServices(dependencies) 
      });
    }
    if (dependencies['@google-cloud/storage'] || dependencies.firebase) {
      this.config.cloudProviders.push({ 
        name: 'gcp', 
        services: this.detectGCPServices(dependencies) 
      });
    }
    if (dependencies['@azure/storage-blob']) {
      this.config.cloudProviders.push({ 
        name: 'azure', 
        services: this.detectAzureServices(dependencies) 
      });
    }

    // Detect message queues
    if (dependencies.amqplib) {
      this.config.messageQueues.push({ type: 'rabbitmq', source: 'package.json' });
    }
    if (dependencies.kafkajs || dependencies['node-kafka']) {
      this.config.messageQueues.push({ type: 'kafka', source: 'package.json' });
    }
  }

  /**
   * Detect from .env files
   */
  private async detectFromEnvFiles(): Promise<void> {
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(this.projectRoot, envFile);
      if (fs.existsSync(envPath)) {
        const envConfig = dotenvConfig({ path: envPath });
        if (envConfig.parsed) {
          this.parseEnvVariables(envConfig.parsed, envFile);
        }
      }
    }
  }

  /**
   * Parse environment variables for connections
   */
  private parseEnvVariables(env: Record<string, string>, source: string): void {
    // Database URLs
    if (env.DATABASE_URL) {
      const dbConfig = this.parseConnectionString(env.DATABASE_URL);
      if (dbConfig) {
        dbConfig.source = source;
        this.config.databases.push(dbConfig);
      }
    }

    // PostgreSQL
    if (env.POSTGRES_HOST || env.PGHOST) {
      this.config.databases.push({
        type: 'postgres',
        host: env.POSTGRES_HOST || env.PGHOST,
        port: parseInt(env.POSTGRES_PORT || env.PGPORT || '5432'),
        database: env.POSTGRES_DB || env.PGDATABASE,
        source
      });
    }

    // MySQL
    if (env.MYSQL_HOST) {
      this.config.databases.push({
        type: 'mysql',
        host: env.MYSQL_HOST,
        port: parseInt(env.MYSQL_PORT || '3306'),
        database: env.MYSQL_DATABASE,
        source
      });
    }

    // MongoDB
    if (env.MONGODB_URI || env.MONGO_URL) {
      this.config.databases.push({
        type: 'mongodb',
        url: env.MONGODB_URI || env.MONGO_URL,
        source
      });
    }

    // Redis
    if (env.REDIS_URL || env.REDIS_HOST) {
      this.config.databases.push({
        type: 'redis',
        url: env.REDIS_URL,
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT || '6379'),
        source
      });
    }

    // API endpoints
    Object.entries(env).forEach(([key, value]) => {
      if (key.endsWith('_API_URL') || key.endsWith('_ENDPOINT')) {
        if (value.startsWith('http')) {
          this.config.services.push({
            name: key,
            type: 'http',
            url: value,
            source
          });
        }
      }
    });

    // AWS
    if (env.AWS_REGION || env.AWS_ACCESS_KEY_ID) {
      const aws = this.config.cloudProviders.find(c => c.name === 'aws');
      if (aws) {
        aws.region = env.AWS_REGION;
      } else {
        this.config.cloudProviders.push({
          name: 'aws',
          services: [],
          region: env.AWS_REGION
        });
      }
    }

    // Message Queues
    if (env.RABBITMQ_URL || env.AMQP_URL) {
      this.config.messageQueues.push({
        type: 'rabbitmq',
        url: env.RABBITMQ_URL || env.AMQP_URL
      });
    }
    if (env.KAFKA_BROKERS) {
      this.config.messageQueues.push({
        type: 'kafka',
        url: env.KAFKA_BROKERS
      });
    }
  }

  /**
   * Detect from config files
   */
  private async detectFromConfigFiles(): Promise<void> {
    const configDirs = ['config', 'configs', '.config'];
    const configFiles = ['database', 'db', 'redis', 'app', 'application', 'settings'];
    const extensions = ['.json', '.js', '.yaml', '.yml'];

    for (const dir of configDirs) {
      const configPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(configPath)) continue;

      for (const file of configFiles) {
        for (const ext of extensions) {
          const filePath = path.join(configPath, file + ext);
          if (fs.existsSync(filePath)) {
            await this.parseConfigFile(filePath);
          }
        }
      }
    }
  }

  /**
   * Parse configuration file
   */
  private async parseConfigFile(filePath: string): Promise<void> {
    const ext = path.extname(filePath);
    let config: any;

    try {
      if (ext === '.json') {
        config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else if (ext === '.js') {
        config = require(filePath);
      } else if (ext === '.yaml' || ext === '.yml') {
        config = parseYaml(fs.readFileSync(filePath, 'utf8'));
      }

      if (config) {
        this.extractConfigData(config, path.basename(filePath));
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  /**
   * Extract configuration data
   */
  private extractConfigData(config: any, source: string): void {
    // Look for database configs
    if (config.database || config.db) {
      const db = config.database || config.db;
      if (db.host && db.type) {
        this.config.databases.push({
          type: db.type,
          host: db.host,
          port: db.port,
          database: db.database || db.name,
          source
        });
      }
    }

    // Look for service endpoints
    if (config.services || config.endpoints) {
      const services = config.services || config.endpoints;
      Object.entries(services).forEach(([name, value]: [string, any]) => {
        if (typeof value === 'string' && value.startsWith('http')) {
          this.config.services.push({
            name,
            type: 'http',
            url: value,
            source
          });
        } else if (value.url) {
          this.config.services.push({
            name,
            type: value.type || 'http',
            url: value.url,
            source
          });
        }
      });
    }

    // Recursively search for URLs and connection strings
    this.findConnectionsInObject(config, source);
  }

  /**
   * Detect from docker-compose.yml
   */
  private async detectFromDockerCompose(): Promise<void> {
    const composePaths = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml'];
    
    for (const composePath of composePaths) {
      const fullPath = path.join(this.projectRoot, composePath);
      if (fs.existsSync(fullPath)) {
        try {
          const compose = parseYaml(fs.readFileSync(fullPath, 'utf8'));
          if (compose.services) {
            this.parseDockerServices(compose.services, composePath);
          }
        } catch (error) {
          // Ignore parse errors
        }
      }
    }
  }

  /**
   * Parse Docker services
   */
  private parseDockerServices(services: any, source: string): void {
    Object.entries(services).forEach(([name, service]: [string, any]) => {
      // Detect databases
      if (service.image) {
        if (service.image.includes('postgres')) {
          this.config.databases.push({
            type: 'postgres',
            host: name,
            port: 5432,
            source
          });
        } else if (service.image.includes('mysql')) {
          this.config.databases.push({
            type: 'mysql',
            host: name,
            port: 3306,
            source
          });
        } else if (service.image.includes('mongo')) {
          this.config.databases.push({
            type: 'mongodb',
            host: name,
            port: 27017,
            source
          });
        } else if (service.image.includes('redis')) {
          this.config.databases.push({
            type: 'redis',
            host: name,
            port: 6379,
            source
          });
        } else if (service.image.includes('rabbitmq')) {
          this.config.messageQueues.push({
            type: 'rabbitmq',
            url: `amqp://${name}:5672`
          });
        } else if (service.image.includes('kafka')) {
          this.config.messageQueues.push({
            type: 'kafka',
            url: `${name}:9092`
          });
        }
      }
    });
  }

  /**
   * Detect from Kubernetes configs
   */
  private async detectFromKubernetes(): Promise<void> {
    const k8sPaths = ['k8s', 'kubernetes', '.k8s'];
    
    for (const k8sPath of k8sPaths) {
      const fullPath = path.join(this.projectRoot, k8sPath);
      if (fs.existsSync(fullPath)) {
        // Scan for service definitions
        const files = fs.readdirSync(fullPath);
        for (const file of files) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            try {
              const content = parseYaml(fs.readFileSync(path.join(fullPath, file), 'utf8'));
              if (content.kind === 'Service' || content.kind === 'ConfigMap') {
                this.parseK8sResource(content, file);
              }
            } catch (error) {
              // Ignore parse errors
            }
          }
        }
      }
    }
  }

  /**
   * Parse Kubernetes resource
   */
  private parseK8sResource(resource: any, source: string): void {
    if (resource.kind === 'ConfigMap' && resource.data) {
      // Look for connection strings in ConfigMap
      Object.entries(resource.data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const dbConfig = this.parseConnectionString(value);
          if (dbConfig) {
            dbConfig.source = `k8s/${source}`;
            this.config.databases.push(dbConfig);
          }
        }
      });
    }
  }

  /**
   * Detect cloud configuration
   */
  private async detectFromCloudConfig(): Promise<void> {
    // AWS
    if (fs.existsSync(path.join(os.homedir(), '.aws/config'))) {
      this.config.cloudProviders.push({
        name: 'aws',
        services: ['detected-from-aws-config']
      });
    }

    // Google Cloud
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.config.cloudProviders.push({
        name: 'gcp',
        services: ['detected-from-credentials']
      });
    }

    // Azure
    if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
      this.config.cloudProviders.push({
        name: 'azure',
        services: ['storage']
      });
    }
  }

  /**
   * Detect from framework conventions
   */
  private async detectFromFramework(): Promise<void> {
    // NestJS
    if (this.config.framework === 'nestjs') {
      const ormConfigPath = path.join(this.projectRoot, 'ormconfig.json');
      if (fs.existsSync(ormConfigPath)) {
        const ormConfig = JSON.parse(fs.readFileSync(ormConfigPath, 'utf8'));
        this.config.databases.push({
          type: ormConfig.type,
          host: ormConfig.host,
          port: ormConfig.port,
          database: ormConfig.database,
          source: 'ormconfig.json'
        });
      }
    }

    // Next.js
    if (this.config.framework === 'nextjs') {
      const prismaSchema = path.join(this.projectRoot, 'prisma/schema.prisma');
      if (fs.existsSync(prismaSchema)) {
        const schema = fs.readFileSync(prismaSchema, 'utf8');
        if (schema.includes('provider = "postgresql"')) {
          this.config.databases.push({ type: 'postgres', source: 'prisma/schema.prisma' });
        }
      }
    }
  }

  /**
   * Detect from process environment
   */
  private async detectFromProcessEnv(): Promise<void> {
    this.parseEnvVariables(process.env as any, 'process.env');
  }

  /**
   * Detect from installed dependencies
   */
  private async detectFromDependencies(): Promise<void> {
    // Check node_modules for hints
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      // Quick checks for common packages
      const checks = [
        { dir: '@aws-sdk', provider: 'aws' },
        { dir: '@google-cloud', provider: 'gcp' },
        { dir: '@azure', provider: 'azure' },
        { dir: 'stripe', service: { name: 'stripe', type: 'http', url: 'https://api.stripe.com' } },
        { dir: 'twilio', service: { name: 'twilio', type: 'http', url: 'https://api.twilio.com' } },
        { dir: '@sendgrid/mail', service: { name: 'sendgrid', type: 'http', url: 'https://api.sendgrid.com' } }
      ];

      for (const check of checks) {
        if (fs.existsSync(path.join(nodeModulesPath, check.dir))) {
          if (check.provider) {
            const existing = this.config.cloudProviders.find(p => p.name === check.provider);
            if (!existing) {
              this.config.cloudProviders.push({
                name: check.provider as any,
                services: ['detected-from-node_modules']
              });
            }
          }
          if (check.service) {
            this.config.services.push({
              ...check.service as any,
              source: 'node_modules'
            });
          }
        }
      }
    }
  }

  /**
   * Helper methods
   */
  private parseConnectionString(url: string): DatabaseConfig | null {
    try {
      const parsed = new URL(url);
      const type = this.getDbTypeFromProtocol(parsed.protocol);
      if (type) {
        return {
          type,
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port) : undefined,
          database: parsed.pathname.slice(1),
          url,
          source: 'connection-string'
        };
      }
    } catch (error) {
      // Not a valid URL
    }
    return null;
  }

  private getDbTypeFromProtocol(protocol: string): DatabaseConfig['type'] | null {
    const map: Record<string, DatabaseConfig['type']> = {
      'postgres:': 'postgres',
      'postgresql:': 'postgres',
      'mysql:': 'mysql',
      'mongodb:': 'mongodb',
      'redis:': 'redis',
      'sqlite:': 'sqlite'
    };
    return map[protocol] || null;
  }

  private findConnectionsInObject(obj: any, source: string, depth = 0): void {
    if (depth > 5) return; // Prevent infinite recursion

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Check if it's a URL
        if (value.match(/^(https?:|postgres:|mysql:|mongodb:|redis:)/)) {
          const dbConfig = this.parseConnectionString(value);
          if (dbConfig) {
            dbConfig.source = source;
            this.config.databases.push(dbConfig);
          } else if (value.startsWith('http')) {
            this.config.services.push({
              name: key,
              type: 'http',
              url: value,
              source
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        this.findConnectionsInObject(value, source, depth + 1);
      }
    });
  }

  private detectAWSServices(deps: any): string[] {
    const services: string[] = [];
    if (deps['@aws-sdk/client-s3']) services.push('s3');
    if (deps['@aws-sdk/client-dynamodb']) services.push('dynamodb');
    if (deps['@aws-sdk/client-sqs']) services.push('sqs');
    if (deps['@aws-sdk/client-lambda']) services.push('lambda');
    if (deps['aws-sdk']) services.push('multiple');
    return services;
  }

  private detectGCPServices(deps: any): string[] {
    const services: string[] = [];
    if (deps['@google-cloud/storage']) services.push('storage');
    if (deps['@google-cloud/firestore']) services.push('firestore');
    if (deps['@google-cloud/pubsub']) services.push('pubsub');
    if (deps.firebase) services.push('firebase');
    return services;
  }

  private detectAzureServices(deps: any): string[] {
    const services: string[] = [];
    if (deps['@azure/storage-blob']) services.push('blob-storage');
    if (deps['@azure/cosmos']) services.push('cosmos-db');
    if (deps['@azure/service-bus']) services.push('service-bus');
    return services;
  }

  /**
   * Apply intelligent defaults based on detection
   */
  private applyIntelligentDefaults(): void {
    // Add common sensitive fields
    this.config.security.sensitiveFields = [
      'password', 'pwd', 'pass', 'secret', 'token', 'key', 'api_key',
      'auth', 'authorization', 'cookie', 'session', 'credit_card',
      'ssn', 'social_security', 'pin', 'cvv'
    ];

    // Add redaction patterns
    this.config.security.redactPatterns = [
      // Credit cards
      '\\b(?:\\d[ -]*?){13,19}\\b',
      // SSN
      '\\b\\d{3}-\\d{2}-\\d{4}\\b',
      // Email (partial redaction)
      '([a-zA-Z0-9._%+-]+)@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
      // JWT tokens
      'eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*'
    ];

    // Detect compliance requirements
    if (this.config.services.some(s => s.name.toLowerCase().includes('stripe'))) {
      this.config.security.complianceMode = 'pci';
    }
  }

  /**
   * Generate interception rules based on detection
   */
  private generateInterceptRules(): void {
    // Always exclude health checks
    this.config.interceptRules.push({
      pattern: '/health',
      action: 'exclude',
      reason: 'Health check endpoint'
    });

    // Exclude metrics endpoints
    this.config.interceptRules.push({
      pattern: '/metrics',
      action: 'exclude',
      reason: 'Metrics endpoint'
    });

    // Include all detected services
    this.config.services.forEach(service => {
      this.config.interceptRules.push({
        pattern: service.url,
        action: 'include',
        reason: `Detected service: ${service.name}`
      });
    });

    // Redact sensitive paths
    const sensitivePaths = ['/auth', '/login', '/payment', '/checkout'];
    sensitivePaths.forEach(path => {
      this.config.interceptRules.push({
        pattern: path,
        action: 'redact',
        reason: 'Sensitive endpoint'
      });
    });
  }

  /**
   * Export configuration
   */
  exportConfig(outputPath?: string): void {
    const output = outputPath || path.join(this.projectRoot, '.intercept-config.json');
    fs.writeFileSync(output, JSON.stringify(this.config, null, 2));
    console.log(`🔄 Configuration exported to: ${output}`);
  }
}

// Export for use
export const autoDetector = new AutoConfigDetector();