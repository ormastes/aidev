/**
 * Docker configuration generator utilities to reduce duplication
 */

export interface DockerServiceConfig {
  serviceName: string;
  port: number;
  image?: string;
  tag?: string;
  environment?: Record<string, string | number>;
  volumes?: string[];
  networks?: string[];
  depends_on?: string[];
  restart?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  healthcheck?: {
    test: string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
  };
}

export interface DockerComposeService {
  image: string;
  ports?: string[];
  environment?: Array<string | { [key: string]: string | number }>;
  volumes?: string[];
  networks?: string[];
  depends_on?: string[];
  restart?: string;
  healthcheck?: {
    test: string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
  };
}

export interface DockerComposeConfig {
  version?: string;
  services: Record<string, DockerComposeService>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

export class DockerConfigGenerator {
  private static readonly DEFAULT_IMAGE_PREFIX = 'aidev';
  private static readonly DEFAULT_TAG = 'latest';
  private static readonly DEFAULT_RESTART_POLICY = 'unless-stopped';
  
  /**
   * Generates a Docker service configuration
   */
  static generateServiceConfig(config: DockerServiceConfig): DockerComposeService {
    const {
      serviceName,
      port,
      image,
      tag = this.DEFAULT_TAG,
      environment = {},
      volumes = [],
      networks = [],
      depends_on = [],
      restart = this.DEFAULT_RESTART_POLICY,
      healthcheck
    } = config;

    const serviceImage = image || `${this.DEFAULT_IMAGE_PREFIX}/${serviceName}:${tag}`;
    
    // Convert environment object to array format
    const envArray = Object.entries({
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: port,
      ...environment
    }).map(([key, value]) => `${key}=${value}`);

    // Add default volumes if not specified
    const defaultVolumes = [
      `./data/${serviceName}:/app/data`,
      `./logs/${serviceName}:/app/logs`
    ];
    
    const allVolumes = volumes.length > 0 ? volumes : defaultVolumes;

    const service: DockerComposeService = {
      image: serviceImage,
      ports: [`${port}:${port}`],
      environment: envArray,
      volumes: allVolumes,
      restart
    };

    // Add optional configurations
    if (networks.length > 0) {
      service.networks = networks;
    }

    if (depends_on.length > 0) {
      service.depends_on = depends_on;
    }

    if (healthcheck) {
      service.healthcheck = healthcheck;
    }

    return service;
  }

  /**
   * Generates a complete docker-compose configuration
   */
  static generateComposeConfig(services: DockerServiceConfig[]): DockerComposeConfig {
    const config: DockerComposeConfig = {
      version: '3.8',
      services: {},
      networks: {
        aidev_network: {
          driver: 'bridge'
        }
      }
    };

    for (const serviceConfig of services) {
      const serviceName = serviceConfig.serviceName;
      config.services[serviceName] = this.generateServiceConfig(serviceConfig);
      
      // Add network if not specified
      if (!config.services[serviceName].networks) {
        config.services[serviceName].networks = ['aidev_network'];
      }
    }

    return config;
  }

  /**
   * Generates a health check configuration for HTTP services
   */
  static generateHttpHealthcheck(
    port: number,
    path: string = '/health',
    interval: string = '30s',
    timeout: string = '10s',
    retries: number = 3
  ): DockerComposeService['healthcheck'] {
    return {
      test: ['CMD', 'curl', '-f', `http://localhost:${port}${path}`, '||', 'exit', '1'],
      interval,
      timeout,
      retries,
      start_period: '40s'
    };
  }

  /**
   * Generates environment variables for service discovery
   */
  static generateServiceDiscoveryEnv(services: DockerServiceConfig[]): Record<string, string> {
    const env: Record<string, string> = {};
    
    for (const service of services) {
      const serviceNameUpper = service.serviceName.toUpperCase().replace(/-/g, '_');
      env[`SERVICE_${serviceNameUpper}_HOST`] = service.serviceName;
      env[`SERVICE_${serviceNameUpper}_PORT`] = String(service.port);
      env[`SERVICE_${serviceNameUpper}_URL`] = `http://${service.serviceName}:${service.port}`;
    }
    
    return env;
  }

  /**
   * Merges multiple Docker service configurations
   */
  static mergeServiceConfigs(
    base: DockerComposeService,
    override: Partial<DockerComposeService>
  ): DockerComposeService {
    const merged = { ...base };

    if (override.environment) {
      merged.environment = [
        ...(base.environment || []),
        ...(override.environment || [])
      ];
    }

    if (override.volumes) {
      merged.volumes = [
        ...(base.volumes || []),
        ...(override.volumes || [])
      ];
    }

    if (override.networks) {
      merged.networks = [
        ...(base.networks || []),
        ...(override.networks || [])
      ];
    }

    if (override.depends_on) {
      merged.depends_on = [
        ...(base.depends_on || []),
        ...(override.depends_on || [])
      ];
    }

    // Override other properties
    if (override.image) merged.image = override.image;
    if (override.ports) merged.ports = override.ports;
    if (override.restart) merged.restart = override.restart;
    if (override.healthcheck) merged.healthcheck = override.healthcheck;

    return merged;
  }

  /**
   * Validates a Docker service configuration
   */
  static validateServiceConfig(config: DockerServiceConfig): string[] {
    const errors: string[] = [];

    if (!config.serviceName || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(config.serviceName)) {
      errors.push('Invalid service name format');
    }

    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    if (config.tag && !/^[a-zA-Z0-9._-]+$/.test(config.tag)) {
      errors.push('Invalid Docker tag format');
    }

    return errors;
  }
}

export const dockerConfigGenerator = DockerConfigGenerator;