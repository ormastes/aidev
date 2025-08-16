import { net } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { createServer } from 'http';
import { Server } from 'net';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export type DeployType = 'local' | 'dev' | 'demo' | 'release' | 'production';
export type AppType = 'predefined' | 'dynamic';

export interface AppRegistration {
  appId: string;
  appName: string;
  type: AppType;
  deployType: DeployType;
  assignedPort?: number;
  requestedPort?: number;
  ipAddress?: string;
  pid?: number;
  startTime?: Date;
  status: 'registered' | 'active' | 'inactive' | 'blocked';
}

export interface PortRange {
  deployType: DeployType;
  prefix: number;
  start: number;
  end: number;
}

/**
 * EnhancedPortManager - Central authority for ALL port allocations
 * No web theme can open a port without going through this manager
 */
export class EnhancedPortManager {
  private static instance: EnhancedPortManager;
  private registrations: Map<string, AppRegistration> = new Map();
  private activePorts: Map<number, AppRegistration> = new Map();
  private portRanges: PortRange[] = [
    { deployType: 'local', prefix: 31, start: 3100, end: 3199 },
    { deployType: 'dev', prefix: 32, start: 3200, end: 3299 },
    { deployType: 'demo', prefix: 33, start: 3300, end: 3399 },
    { deployType: 'release', prefix: 34, start: 3400, end: 3499 },
    { deployType: 'production', prefix: 35, start: 3500, end: 3599 }
  ];
  
  // Predefined apps with fixed port assignments
  private predefinedApps = new Map<string, {name: string, id: number}>([
    ['portal', { name: 'AI Dev Portal', id: 56 }],  // 3456 in release
    ['gui-selector', { name: 'GUI Selector', id: 57 }],  // 3457 in release
    ['chat-space', { name: 'Chat Space', id: 10 }],
    ['pocketflow', { name: 'PocketFlow', id: 20 }],
    ['story-reporter', { name: 'Story Reporter', id: 30 }],
    ['external-log', { name: 'External Logger', id: 40 }],
    ['security-proxy', { name: 'Security Proxy', id: 0 }]
  ]);
  
  private configFile: string;
  private originalListen: any;
  private interceptActive: boolean = false;
  
  private constructor() {
    this.configFile = path.join(__dirname, '../../config/port-registry.json');
    this.loadConfiguration();
    this.interceptPortBinding();
  }
  
  static getInstance(): EnhancedPortManager {
    if (!EnhancedPortManager.instance) {
      EnhancedPortManager.instance = new EnhancedPortManager();
    }
    return EnhancedPortManager.instance;
  }
  
  /**
   * Register an app and get assigned port
   * This is THE ONLY WAY to get a port
   */
  async registerApp(options: {
    appId: string;
    deployType: DeployType;
    requestedPort?: number;
    ipAddress?: string;
  }): { success: boolean; port?: number; message?: string } {
    const { appId, deployType, requestedPort, ipAddress } = options;
    
    // Check if this is a predefined app
    const predefined = this.predefinedApps.get(appId);
    
    if (predefined) {
      // Predefined app - use fixed port
      const port = this.getPortForPredefined(appId, deployType);
      
      // Check if port is already in use by another app
      const existing = this.activePorts.get(port);
      if (existing && existing.appId !== appId) {
        return {
          success: false,
          message: `Port ${port} already in use by ${existing.appName}`
        };
      }
      
      // Register the app
      const registration: AppRegistration = {
        appId,
        appName: predefined.name,
        type: 'predefined',
        deployType,
        assignedPort: port,
        requestedPort,
        ipAddress,
        status: 'registered',
        startTime: new Date()
      };
      
      this.registrations.set(`${appId}-${deployType}`, registration);
      this.saveConfiguration();
      
      return { success: true, port, message: `Registered ${appId} on port ${port}` };
      
    } else {
      // Dynamic app - assign next available port
      const port = requestedPort && this.isPortAvailable(requestedPort, deployType) 
        ? requestedPort 
        : this.getNextAvailablePort(deployType);
      
      if (!port) {
        return {
          success: false,
          message: `No available ports for ${deployType} deployment`
        };
      }
      
      // Register the dynamic app
      const registration: AppRegistration = {
        appId,
        appName: appId,
        type: 'dynamic',
        deployType,
        assignedPort: port,
        requestedPort,
        ipAddress,
        status: 'registered',
        startTime: new Date()
      };
      
      this.registrations.set(`${appId}-${deployType}-${ipAddress || 'local'}`, registration);
      this.saveConfiguration();
      
      return { success: true, port, message: `Registered ${appId} on port ${port}` };
    }
  }
  
  /**
   * Get port for predefined app
   */
  private async getPortForPredefined(appId: string, deployType: DeployType): number {
    const app = this.predefinedApps.get(appId);
    if (!app) throw new Error(`Unknown predefined app: ${appId}`);
    
    const range = this.portRanges.find(r => r.deployType === deployType);
    if (!range) throw new Error(`Unknown deploy type: ${deployType}`);
    
    return range.prefix * 100 + app.id;
  }
  
  /**
   * Get next available port for dynamic apps
   */
  private async getNextAvailablePort(deployType: DeployType): number | null {
    const range = this.portRanges.find(r => r.deployType === deployType);
    if (!range) return null;
    
    // Start from x60 for dynamic apps (x00-x59 reserved for predefined)
    for (let i = 60; i <= 99; i++) {
      const port = range.prefix * 100 + i;
      if (this.isPortAvailable(port, deployType)) {
        return port;
      }
    }
    
    return null;
  }
  
  /**
   * Check if port is available
   */
  private async isPortAvailable(port: number, deployType: DeployType): boolean {
    // Check if port is in correct range
    const range = this.portRanges.find(r => r.deployType === deployType);
    if (!range || port < range.start || port > range.end) {
      return false;
    }
    
    // Check if port is already registered
    if (this.activePorts.has(port)) {
      return false;
    }
    
    // Check if port is actually in use (network check)
    return !this.isPortInUse(port);
  }
  
  /**
   * Check if port is actually in use on the network
   */
  private async isPortInUse(port: number): boolean {
    try {
      const server = net.createServer();
      server.listen(port);
      server.close();
      return false;
    } catch {
      return true;
    }
  }
  
  /**
   * Intercept ALL port binding attempts
   * This is the enforcement mechanism
   */
  private async interceptPortBinding(): void {
    if (this.interceptActive) return;
    
    // Store original listen method
    this.originalListen = net.Server.prototype.listen;
    const manager = this;
    
    // Override listen method
    net.Server.prototype.listen = function(...args: any[]): any {
      const port = manager.extractPort(args);
      
      if (port) {
        // Check if this port is registered
        let authorized = false;
        let registration: AppRegistration | undefined;
        
        // Check all registrations for this port
        for (const reg of manager.registrations.values()) {
          if (reg.assignedPort === port && reg.status === 'registered') {
            authorized = true;
            registration = reg;
            break;
          }
        }
        
        if (!authorized) {
          const error = new Error(
            `PORT SECURITY VIOLATION: Port ${port} not authorized. ` +
            `Must register with PortManager.registerApp() first. ` +
            `Use: EnhancedPortManager.getInstance().registerApp({appId, deployType})`
          );
          
          // Log violation
          manager.logViolation(port, 'unknown');
          
          // Block the port binding
          throw error;
        }
        
        // Mark as active
        if (registration) {
          registration.status = 'active';
          registration.pid = process.pid;
          manager.activePorts.set(port, registration);
          manager.saveConfiguration();
          
          console.log(`✅ Port ${port} authorized for ${registration.appName}`);
        }
      }
      
      // Proceed with original listen
      return manager.originalListen.apply(this, args);
    };
    
    this.interceptActive = true;
  }
  
  /**
   * Extract port from listen() arguments
   */
  private async extractPort(args: any[]): number | null {
    if (typeof args[0] === 'number') return args[0];
    if (typeof args[0] === 'object' && args[0]?.port) return args[0].port;
    if (typeof args[1] === 'number') return args[1];
    return null;
  }
  
  /**
   * Open port for web theme (mandatory API)
   * ALL web themes MUST use this method
   */
  async openPort(appId: string, deployType: DeployType, options?: {
    requestedPort?: number;
    ipAddress?: string;
  }): Promise<Server> {
    return new Promise((resolve, reject) => {
      // Register the app
      const result = this.registerApp({
        appId,
        deployType,
        requestedPort: options?.requestedPort,
        ipAddress: options?.ipAddress
      });
      
      if (!result.success || !result.port) {
        reject(new Error(result.message || 'Failed to register app'));
        return;
      }
      
      // Create and return server on assigned port
      const server = createServer();
      
      server.listen(result.port, () => {
        console.log(`🚀 ${appId} started on port ${result.port} (${deployType})`);
        resolve(server);
      });
      
      server.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Update app registration if port manager doesn't like current setup
   */
  async updateRegistration(appId: string, deployType: DeployType, newPort?: number): boolean {
    const key = `${appId}-${deployType}`;
    const registration = this.registrations.get(key);
    
    if (!registration) {
      console.error(`No registration found for ${appId} in ${deployType}`);
      return false;
    }
    
    // Remove from old port
    if (registration.assignedPort) {
      this.activePorts.delete(registration.assignedPort);
    }
    
    // Assign new port
    if (newPort && this.isPortAvailable(newPort, deployType)) {
      registration.assignedPort = newPort;
    } else {
      registration.assignedPort = this.getNextAvailablePort(deployType) || registration.assignedPort;
    }
    
    // Update status
    registration.status = 'registered';
    this.saveConfiguration();
    
    console.log(`📝 Updated ${appId} to port ${registration.assignedPort}`);
    return true;
  }
  
  /**
   * Get all registrations
   */
  async getAllRegistrations(): AppRegistration[] {
    return Array.from(this.registrations.values());
  }
  
  /**
   * Get active ports
   */
  async getActivePorts(): Map<number, AppRegistration> {
    return new Map(this.activePorts);
  }
  
  /**
   * Log security violation
   */
  private async logViolation(port: number, appId: string): void {
    const logDir = path.join(process.cwd(), 'gen', 'logs');
    const logFile = path.join(logDir, 'port-violations.log');
    
    if (!fs.existsSync(logDir)) {
      await fileAPI.createDirectory(logDir);
    }
    
    const entry = `[${new Date().toISOString()}] VIOLATION: Unauthorized attempt to use port ${port} by ${appId}\n`;
    await fileAPI.writeFile(logFile, entry, { append: true });
  }
  
  /**
   * Save configuration to disk
   */
  private async saveConfiguration(): void {
    const config = {
      registrations: Array.from(this.registrations.entries()),
      activePorts: Array.from(this.activePorts.entries()),
      timestamp: new Date().toISOString()
    };
    
    const dir = path.dirname(this.configFile);
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    await fileAPI.createFile(this.configFile, JSON.stringify(config, { type: FileType.TEMPORARY }));
  }
  
  /**
   * Load configuration from disk
   */
  private async loadConfiguration(): void {
    if (fs.existsSync(this.configFile)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
        
        // Restore registrations
        if (config.registrations) {
          this.registrations = new Map(config.registrations);
        }
        
        // Don't restore active ports (they need to re-register on startup)
        console.log(`📋 Loaded ${this.registrations.size} app registrations`);
      } catch (err) {
        console.error('Failed to load port configuration:', err);
      }
    }
  }
  
  /**
   * Generate report of port usage
   */
  async generateReport(): string {
    let report = '🔒 Enhanced Port Manager Report\n';
    report += '================================\n\n';
    
    report += 'Port Ranges:\n';
    this.portRanges.forEach(range => {
      report += `  ${range.deployType}: ${range.start}-${range.end} (prefix: ${range.prefix})\n`;
    });
    
    report += '\nPredefined Apps:\n';
    this.predefinedApps.forEach((app, id) => {
      report += `  ${id}: ${app.name} (ports: `;
      this.portRanges.forEach(range => {
        const port = range.prefix * 100 + app.id;
        report += `${range.deployType}=${port} `;
      });
      report += ')\n';
    });
    
    report += '\nActive Registrations:\n';
    this.registrations.forEach(reg => {
      report += `  ${reg.appName} (${reg.appId}):\n`;
      report += `    Type: ${reg.type}\n`;
      report += `    Deploy: ${reg.deployType}\n`;
      report += `    Port: ${reg.assignedPort}\n`;
      report += `    Status: ${reg.status}\n`;
      if (reg.ipAddress) report += `    IP: ${reg.ipAddress}\n`;
      report += '\n';
    });
    
    report += '\nActive Ports:\n';
    this.activePorts.forEach((reg, port) => {
      report += `  ${port}: ${reg.appName} (PID: ${reg.pid})\n`;
    });
    
    return report;
  }
}