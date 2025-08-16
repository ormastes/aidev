export interface PortConfig {
  appId: string;
  internalPort: number;
  devPrefix: number;
  demoPrefix: number;
  releasePrefix: number;
}

export class PortManager {
  private static instance: PortManager;
  private portConfigs: Map<string, PortConfig> = new Map();
  
  // Environment prefixes
  private static readonly ENV_PREFIXES = {
    'dev-local': 31,  // Local development (developer's machine)
    dev: 32,          // Shared development server
    demo: 33,         // Demo server
    release: 34       // Production/Release
  };

  private constructor() {
    this.initializeDefaultPorts();
  }

  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  private initializeDefaultPorts(): void {
    // Register default apps with their IDs
    const defaultConfigs: Array<{appId: string, id: number, internalPort: number}> = [
      { appId: 'web-security', id: 0, internalPort: 4000 },  // Proxy itself
      { appId: 'portal', id: 1, internalPort: 4001 },
      { appId: 'gui-selector', id: 56, internalPort: 4056 },
      { appId: 'chat-space', id: 10, internalPort: 4010 },
      { appId: "pocketflow", id: 20, internalPort: 4020 },
      { appId: 'coordinator-agent', id: 30, internalPort: 4030 },
      { appId: 'external-log', id: 40, internalPort: 4040 }
    ];

    defaultConfigs.forEach(config => {
      this.registerApp(config.appId, config.id, config.internalPort);
    });
  }

  registerApp(appId: string, id: number, internalPort: number): void {
    if (id < 0 || id > 99) {
      throw new Error('App ID must be between 0 and 99');
    }

    const config: PortConfig = {
      appId,
      internalPort,
      devPrefix: PortManager.ENV_PREFIXES.dev,
      demoPrefix: PortManager.ENV_PREFIXES.demo,
      releasePrefix: PortManager.ENV_PREFIXES.release
    };

    // Store with the 2-digit ID as key
    const idKey = id.toString().padStart(2, '0');
    this.portConfigs.set(idKey, config);
  }

  getPortForEnvironment(appId: string, environment: 'dev-local' | 'dev' | 'demo' | 'release'): number {
    // Find the config by appId
    let id: string | undefined;
    let config: PortConfig | undefined;
    
    for (const [key, cfg] of this.portConfigs.entries()) {
      if (cfg.appId === appId) {
        id = key;
        config = cfg;
        break;
      }
    }

    if (!config || !id) {
      throw new Error(`App ${appId} not registered`);
    }

    const prefix = PortManager.ENV_PREFIXES[environment];
    return parseInt(`${prefix}${id}`);
  }

  getInternalPort(appId: string): number {
    for (const config of this.portConfigs.values()) {
      if (config.appId === appId) {
        return config.internalPort;
      }
    }
    throw new Error(`App ${appId} not registered`);
  }

  getAppByExternalPort(port: number): string | undefined {
    const portStr = port.toString();
    if (portStr.length !== 4) return undefined;

    const id = portStr.substring(2);
    const config = this.portConfigs.get(id);
    return config?.appId;
  }

  getAllRegisteredApps(): Array<{appId: string, id: string, ports: {[key: string]: number}}> {
    const apps: Array<{appId: string, id: string, ports: {[key: string]: number}}> = [];
    
    for (const [id, config] of this.portConfigs.entries()) {
      apps.push({
        appId: config.appId,
        id,
        ports: {
          'dev-local': parseInt(`${PortManager.ENV_PREFIXES['dev-local']}${id}`),
          dev: parseInt(`${config.devPrefix}${id}`),
          demo: parseInt(`${config.demoPrefix}${id}`),
          release: parseInt(`${config.releasePrefix}${id}`)
        }
      });
    }
    
    return apps;
  }

  getCurrentEnvironment(): 'dev-local' | 'dev' | 'demo' | 'release' {
    const env = process.env.NODE_ENV || "development";
    
    // Check for explicit dev-local flag
    if (process.env.DEV_LOCAL === 'true' || env === 'dev-local') return 'dev-local';
    
    if (env === "production" || env === 'release') return 'release';
    if (env === 'demo') return 'demo';
    if (env === 'dev' || env === "development") return 'dev';
    
    // Default to dev-local for local development
    return 'dev-local';
  }
  
  // Get port with optional offset for multiple instances
  getPortWithOffset(appId: string, environment: 'dev-local' | 'dev' | 'demo' | 'release', offset: number = 0): number {
    const basePort = this.getPortForEnvironment(appId, environment);
    return basePort + offset;
  }
  
  // Check if running in local development
  isLocalDevelopment(): boolean {
    return this.getCurrentEnvironment() === 'dev-local';
  }
  
  // Register a dynamic local service (31xx range only)
  registerLocalService(serviceName: string, port: number): boolean {
    if (port < 3100 || port > 3199) {
      console.warn(`Port ${port} is not in local development range (3100-3199)`);
      return false;
    }
    
    // Extract ID from port (e.g., 3142 -> 42)
    const id = port - 3100;
    this.registerApp(`local-${serviceName}`, id, port);
    
    console.log(`Registered local service '${serviceName}' on port ${port}`);
    return true;
  }
  
  // Get all local services (31xx range)
  getLocalServices(): Array<{name: string, port: number}> {
    const services: Array<{name: string, port: number}> = [];
    
    for (const [id, config] of this.portConfigs.entries()) {
      const portNum = parseInt(id);
      if (config.appId.startsWith('local-')) {
        services.push({
          name: config.appId.replace('local-', ''),
          port: 3100 + portNum
        });
      }
    }
    
    return services;
  }
  
  // Check if a 31xx port is available
  isLocalPortAvailable(port: number): boolean {
    if (port < 3100 || port > 3199) return false;
    
    const id = (port - 3100).toString().padStart(2, '0');
    return !this.portConfigs.has(id);
  }

  /**
   * Allocate a new port for a service
   * This finds an available port and registers it
   */
  async allocatePort(serviceName: string): Promise<number> {
    // Start from a base port and find an available one
    const basePort = 5000;
    const maxPort = 9999;
    
    // Check if service already has a port allocated
    const existingPort = this.getInternalPort(serviceName);
    if (existingPort > 0) {
      return existingPort;
    }
    
    // Find next available port
    for (let port = basePort; port <= maxPort; port++) {
      // Check if port is not used by any registered app
      const appUsingPort = this.getAppByExternalPort(port);
      if (!appUsingPort && this.registerLocalService(serviceName, port)) {
        return port;
      }
    }
    
    throw new Error(`No available ports found for service ${serviceName}`);
  }
}