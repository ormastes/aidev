import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { http } from '../../infra_external-log-lib/src';
import { https } from '../../infra_external-log-lib/src';
import { ConfigManager } from './ConfigManager';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ServiceInfo {
  name: string;
  url: string;
  port: number;
  protocol: 'http' | 'https';
  healthCheckUrl?: string;
  status: 'online' | 'offline' | 'unknown';
  dependencies?: string[];
  version?: string;
  metadata?: Record<string, any>;
  lastSeen?: Date;
}

export interface ServiceRegistration {
  name: string;
  port: number;
  protocol?: 'http' | 'https';
  healthCheckPath?: string;
  dependencies?: string[];
  version?: string;
  metadata?: Record<string, any>;
}

export interface DiscoveryOptions {
  timeout?: number;
  retries?: number;
  healthCheckInterval?: number;
  enableAutoDiscovery?: boolean;
}

export class ServiceDiscovery {
  private services: Map<string, Map<string, ServiceInfo>> = new Map();
  private configManager: ConfigManager;
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private discoveryOptions: DiscoveryOptions;
  private serviceRegistryPath: string;

  constructor(
    configManager?: ConfigManager,
    options?: DiscoveryOptions
  ) {
    this.configManager = configManager || new ConfigManager();
    this.discoveryOptions = {
      timeout: 5000,
      retries: 3,
      healthCheckInterval: 30000,
      enableAutoDiscovery: true,
      ...options
    };
    this.serviceRegistryPath = path.join(process.cwd(), 'config', 'service-registry');
    this.initializeServices();
  }

  private async initializeServices(): void {
    // Initialize service maps for each environment
    const environments = ['development', 'test', 'demo', 'release'];
    for (const env of environments) {
      this.services.set(env, new Map());
    }

    // Load persisted service registry
    this.loadServiceRegistry();

    // Start auto-discovery if enabled
    if (this.discoveryOptions.enableAutoDiscovery) {
      this.startAutoDiscovery();
    }
  }

  async registerService(
    environment: string,
    registration: ServiceRegistration
  ): Promise<ServiceInfo> {
    const protocol = registration.protocol || 'http';
    const host = this.getHostForEnvironment(environment);
    const url = `${protocol}://${host}:${registration.port}`;
    const healthCheckUrl = registration.healthCheckPath
      ? `${url}${registration.healthCheckPath}`
      : `${url}/health`;

    const serviceInfo: ServiceInfo = {
      name: registration.name,
      url,
      port: registration.port,
      protocol,
      healthCheckUrl,
      status: 'unknown',
      dependencies: registration.dependencies,
      version: registration.version,
      metadata: registration.metadata,
      lastSeen: new Date()
    };

    // Store in memory
    const envServices = this.services.get(environment) || new Map();
    envServices.set(registration.name, serviceInfo);
    this.services.set(environment, envServices);

    // Persist to registry
    await this.saveServiceRegistry();

    // Start health check for this service
    this.startHealthCheck(environment, registration.name);

    // Check initial status
    await this.checkServiceHealth(environment, registration.name);

    return serviceInfo;
  }

  async discoverServices(environment: string): Promise<Map<string, ServiceInfo>> {
    const envServices = this.services.get(environment) || new Map();

    // Auto-discover from ConfigManager if no services registered
    if (envServices.size === 0) {
      await this.discoverFromConfig(environment);
    }

    // Discover theme dependencies
    await this.discoverThemeDependencies(environment);

    return new Map(envServices);
  }

  private async discoverFromConfig(environment: string): Promise<void> {
    try {
      const config = await this.configManager.getConfig(environment);
      const host = this.getHostForEnvironment(environment);

      for (const service of config.services) {
        if (service.enabled) {
          const protocol = environment === 'release' ? 'https' : 'http';
          const url = `${protocol}://${host}:${service.port}`;

          const serviceInfo: ServiceInfo = {
            name: service.name,
            url,
            port: service.port,
            protocol,
            healthCheckUrl: `${url}/health`,
            status: 'unknown',
            dependencies: service.dependencies,
            lastSeen: new Date()
          };

          const envServices = this.services.get(environment) || new Map();
          envServices.set(service.name, serviceInfo);
          this.services.set(environment, envServices);
        }
      }

      await this.saveServiceRegistry();
    } catch (error) {
      console.error(`Failed to discover services from config for ${environment}:`, error);
    }
  }

  private async discoverThemeDependencies(environment: string): Promise<void> {
    // Discover services from other themes
    const themesDir = path.join(process.cwd(), '..', '..');
    const layerThemesDir = path.join(themesDir, 'layer', 'themes');

    if (!fs.existsSync(layerThemesDir)) {
      return;
    }

    try {
      const themes = fs.readdirSync(layerThemesDir)
        .filter(dir => fs.statSync(path.join(layerThemesDir, dir)).isDirectory());

      for (const theme of themes) {
        const themeConfigPath = path.join(layerThemesDir, theme, 'config', 'service.json');
        
        if (fs.existsSync(themeConfigPath)) {
          const themeConfig = JSON.parse(fs.readFileSync(themeConfigPath, 'utf-8'));
          
          if (themeConfig.environments && themeConfig.environments[environment]) {
            const envConfig = themeConfig.environments[environment];
            const serviceInfo: ServiceInfo = {
              name: `${theme}-service`,
              url: envConfig.url || `http://localhost:${envConfig.port}`,
              port: envConfig.port,
              protocol: envConfig.protocol || 'http',
              healthCheckUrl: envConfig.healthCheckUrl,
              status: 'unknown',
              dependencies: envConfig.dependencies,
              version: themeConfig.version,
              metadata: { theme },
              lastSeen: new Date()
            };

            const envServices = this.services.get(environment) || new Map();
            envServices.set(serviceInfo.name, serviceInfo);
            this.services.set(environment, envServices);
          }
        }
      }
    } catch (error) {
      console.error('Failed to discover theme dependencies:', error);
    }
  }

  async getService(
    environment: string,
    serviceName: string
  ): Promise<ServiceInfo | undefined> {
    const envServices = this.services.get(environment);
    return envServices?.get(serviceName);
  }

  async getServiceUrl(
    environment: string,
    serviceName: string
  ): Promise<string | undefined> {
    const service = await this.getService(environment, serviceName);
    return service?.url;
  }

  async getHealthyServices(environment: string): Promise<ServiceInfo[]> {
    const envServices = this.services.get(environment) || new Map();
    return Array.from(envServices.values()).filter(s => s.status === 'online');
  }

  async checkServiceHealth(
    environment: string,
    serviceName: string
  ): Promise<boolean> {
    const service = await this.getService(environment, serviceName);
    if (!service || !service.healthCheckUrl) {
      return false;
    }

    try {
      const isHealthy = await this.performHealthCheck(service.healthCheckUrl);
      
      // Update service status
      service.status = isHealthy ? 'online' : 'offline';
      service.lastSeen = new Date();
      
      const envServices = this.services.get(environment) || new Map();
      envServices.set(serviceName, service);
      
      return isHealthy;
    } catch (error) {
      service.status = 'offline';
      return false;
    }
  }

  private async performHealthCheck(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      
      const request = protocol.get(url, { timeout: this.discoveryOptions.timeout }, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 204);
      });

      request.on('error', () => resolve(false));
      request.on('timeout', () => {
        request.destroy();
        resolve(false);
      });
    });
  }

  private async startHealthCheck(environment: string, serviceName: string): void {
    const intervalKey = `${environment}-${serviceName}`;
    
    // Clear existing interval if any
    if (this.healthCheckIntervals.has(intervalKey)) {
      clearInterval(this.healthCheckIntervals.get(intervalKey)!);
    }

    // Start new health check interval
    const interval = setInterval(async () => {
      await this.checkServiceHealth(environment, serviceName);
    }, this.discoveryOptions.healthCheckInterval!);

    this.healthCheckIntervals.set(intervalKey, interval);
  }

  private async startAutoDiscovery(): void {
    // Periodically discover new services
    setInterval(async () => {
      for (const environment of this.services.keys()) {
        await this.discoverFromConfig(environment);
        await this.discoverThemeDependencies(environment);
      }
    }, 60000); // Every minute
  }

  async connectToService(
    environment: string,
    serviceName: string,
    path: string = '/',
    options?: http.RequestOptions
  ): Promise<{ statusCode: number; data: string }> {
    const service = await this.getService(environment, serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in environment '${environment}'`);
    }

    if (service.status === 'offline') {
      throw new Error(`Service '${serviceName}' is offline`);
    }

    const url = `${service.url}${path}`;
    const protocol = service.protocol === 'https' ? https : http;

    return new Promise((resolve, reject) => {
      const request = protocol.get(url, options || {}, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode || 0,
          data
        }));
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async getServiceDependencies(
    environment: string,
    serviceName: string
  ): Promise<ServiceInfo[]> {
    const service = await this.getService(environment, serviceName);
    if (!service || !service.dependencies) {
      return [];
    }

    const dependencies: ServiceInfo[] = [];
    for (const depName of service.dependencies) {
      const dep = await this.getService(environment, depName);
      if (dep) {
        dependencies.push(dep);
      }
    }

    return dependencies;
  }

  async getServiceDependencyGraph(environment: string): Promise<Map<string, string[]>> {
    const graph = new Map<string, string[]>();
    const envServices = this.services.get(environment) || new Map();

    for (const [name, service] of envServices) {
      graph.set(name, service.dependencies || []);
    }

    return graph;
  }

  private async getHostForEnvironment(environment: string): string {
    switch (environment) {
      case 'release':
        return process.env.PRODUCTION_HOST || 'portal.production.com';
      case 'demo':
        return process.env.DEMO_HOST || 'portal.demo.com';
      default:
        return 'localhost';
    }
  }

  private async loadServiceRegistry(): Promise<void> {
    const registryFile = path.join(this.serviceRegistryPath, 'services.json');
    
    if (!fs.existsSync(registryFile)) {
      return;
    }

    try {
      const content = fs.readFileSync(registryFile, 'utf-8');
      const registry = JSON.parse(content);

      for (const [env, services] of Object.entries(registry)) {
        const envServices = new Map<string, ServiceInfo>();
        for (const [name, info] of Object.entries(services as any)) {
          const serviceInfo = info as ServiceInfo;
          envServices.set(name, {
            ...serviceInfo,
            lastSeen: new Date((serviceInfo as any).lastSeen)
          });
        }
        this.services.set(env, envServices);
      }
    } catch (error) {
      console.error('Failed to load service registry:', error);
    }
  }

  private async saveServiceRegistry(): Promise<void> {
    const registryFile = path.join(this.serviceRegistryPath, 'services.json');

    // Ensure directory exists
    if (!fs.existsSync(this.serviceRegistryPath)) {
      await fileAPI.createDirectory(this.serviceRegistryPath);
    }

    const registry: Record<string, Record<string, ServiceInfo>> = {};
    
    for (const [env, services] of this.services) {
      registry[env] = Object.fromEntries(services);
    }

    await fileAPI.createFile(registryFile, JSON.stringify(registry, { type: FileType.TEMPORARY }), 'utf-8');
  }

  async unregisterService(
    environment: string,
    serviceName: string
  ): Promise<void> {
    const envServices = this.services.get(environment);
    if (envServices) {
      envServices.delete(serviceName);
    }

    // Stop health check
    const intervalKey = `${environment}-${serviceName}`;
    if (this.healthCheckIntervals.has(intervalKey)) {
      clearInterval(this.healthCheckIntervals.get(intervalKey)!);
      this.healthCheckIntervals.delete(intervalKey);
    }

    await this.saveServiceRegistry();
  }

  async stopAllHealthChecks(): void {
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
  }

  async getAllServices(): Map<string, Map<string, ServiceInfo>> {
    return new Map(this.services);
  }
}