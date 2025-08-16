import { PortManager } from './PortManager';
import { net } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * PortEnforcer - Active port security enforcement
 * Prevents unauthorized port usage through multiple layers
 */
export class PortEnforcer {
  private static instance: PortEnforcer;
  private portManager: PortManager;
  private authorizedPorts: Set<number> = new Set();
  private violations: Array<{timestamp: Date, port: number, app: string, blocked: boolean}> = [];
  
  private constructor() {
    this.portManager = PortManager.getInstance();
    this.initializeEnforcement();
  }
  
  static getInstance(): PortEnforcer {
    if (!PortEnforcer.instance) {
      PortEnforcer.instance = new PortEnforcer();
    }
    return PortEnforcer.instance;
  }
  
  private async initializeEnforcement(): void {
    // Load all authorized ports from PortManager
    const apps = this.portManager.getAllRegisteredApps();
    apps.forEach(app => {
      Object.values(app.ports).forEach(port => {
        this.authorizedPorts.add(port);
      });
    });
    
    // Hook into Node.js server creation
    this.interceptServerCreation();
    
    // Set up monitoring
    this.startPortMonitoring();
  }
  
  /**
   * Intercept and validate all server.listen() calls
   */
  private async interceptServerCreation(): void {
    const originalListen = net.Server.prototype.listen;
    const enforcer = this;
    
    net.Server.prototype.listen = function(...args: any[]): any {
      const port = enforcer.extractPort(args);
      
      if (port && !enforcer.isPortAuthorized(port)) {
        const error = new Error(`SECURITY VIOLATION: Unauthorized port ${port} blocked by PortEnforcer. Use PortManager.getPortForEnvironment() to get assigned port.`);
        
        // Log violation
        enforcer.logViolation(port, 'unknown', true);
        
        // Write to security log
        enforcer.writeSecurityLog(`BLOCKED: Attempted to use unauthorized port ${port}`);
        
        // Throw error to prevent server start
        throw error;
      }
      
      // If authorized, proceed normally
      return originalListen.apply(this, args);
    };
  }
  
  /**
   * Extract port from various listen() argument formats
   */
  private async extractPort(args: any[]): number | null {
    if (typeof args[0] === 'number') return args[0];
    if (typeof args[0] === 'object' && args[0]?.port) return args[0].port;
    if (typeof args[1] === 'number') return args[1];
    return null;
  }
  
  /**
   * Check if port is authorized
   */
  private async isPortAuthorized(port: number): boolean {
    // Allow common development ports in dev-local mode
    if (this.portManager.getCurrentEnvironment() === 'dev-local') {
      // Allow 31xx range for local development
      if (port >= 3100 && port <= 3199) return true;
    }
    
    return this.authorizedPorts.has(port);
  }
  
  /**
   * Monitor for unauthorized port usage
   */
  private async startPortMonitoring(): void {
    setInterval(() => {
      this.scanActivePorts();
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Scan for active ports and check authorization
   */
  private async scanActivePorts(): Promise<void> {
    const exec = require('child_process').exec;
    
    exec('netstat -ltn | grep LISTEN', (error: any, stdout: string) => {
      if (error) return;
      
      const lines = stdout.split('\n');
      lines.forEach(line => {
        const match = line.match(/:(\d{4})\s+/);
        if (match) {
          const port = parseInt(match[1]);
          if (port >= 3000 && port < 4000 && !this.isPortAuthorized(port)) {
            this.logViolation(port, 'unknown', false);
            this.writeSecurityLog(`WARNING: Unauthorized port ${port} detected in use`);
          }
        }
      });
    });
  }
  
  /**
   * Log security violation
   */
  private async logViolation(port: number, app: string, blocked: boolean): void {
    this.violations.push({
      timestamp: new Date(),
      port,
      app,
      blocked
    });
    
    // Keep only last 100 violations
    if (this.violations.length > 100) {
      this.violations = this.violations.slice(-100);
    }
  }
  
  /**
   * Write to security log file
   */
  private async writeSecurityLog(message: string): void {
    const logDir = path.join(__dirname, '../../logs');
    const logFile = path.join(logDir, 'port-security.log');
    
    if (!fs.existsSync(logDir)) {
      await fileAPI.createDirectory(logDir);
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    await fileAPI.writeFile(logFile, logEntry, { append: true });
  }
  
  /**
   * Get security violations report
   */
  async getViolations(): typeof this.violations {
    return [...this.violations];
  }
  
  /**
   * Validate port before use (for explicit checking)
   */
  async validatePort(port: number, appId: string): {valid: boolean, message?: string} {
    const expectedPort = this.portManager.getPortForEnvironment(
      appId, 
      this.portManager.getCurrentEnvironment()
    );
    
    if (port !== expectedPort) {
      return {
        valid: false,
        message: `Port ${port} not authorized for ${appId}. Expected port: ${expectedPort}`
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Generate iptables rules for Linux firewall
   */
  async generateFirewallRules(): string[] {
    const rules: string[] = [];
    
    // Drop all connections to 3xxx ports by default
    rules.push('iptables -A INPUT -p tcp --dport 3000:3999 -j DROP');
    
    // Allow only authorized ports
    this.authorizedPorts.forEach(port => {
      rules.push(`iptables -I INPUT -p tcp --dport ${port} -j ACCEPT`);
    });
    
    return rules;
  }
}