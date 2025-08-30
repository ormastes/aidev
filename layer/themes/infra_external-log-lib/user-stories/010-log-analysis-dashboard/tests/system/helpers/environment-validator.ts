import { execSync } from 'child_process';
import { request } from 'http';
import { URL } from 'url';

interface ServiceInfo {
  name: string;
  url: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  healthCheck?: boolean;
}

/**
 * Validates test environment and discovers running services
 * Essential for system test reliability
 */
export class EnvironmentValidator {
  
  async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating test environment...');
    
    // Check Node.js version
    await this.validateNodeVersion();
    
    // Check required dependencies
    await this.validateDependencies();
    
    // Check available ports
    await this.validatePorts();
    
    // Validate browser installations
    await this.validateBrowsers();
    
    console.log('✅ Environment validation complete');
  }
  
  async discoverRunningServices(): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    
    // Check common ports for web applications
    const commonPorts = [3000, 3001, 3457, 4000, 5000, 8000, 8080, 9000];
    
    for (const port of commonPorts) {
      try {
        const isRunning = await this.checkPortInUse(port);
        if (isRunning) {
          const serviceInfo = await this.identifyService(port);
          services.push(serviceInfo);
        }
      } catch (error) {
        // Skip failed port checks
      }
    }
    
    return services;
  }
  
  private async validateNodeVersion(): Promise<void> {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Minimum version: 18.0.0`);
    }
    
    console.log(`✓ Node.js version: ${nodeVersion}`);
  }
  
  private async validateDependencies(): Promise<void> {
    const requiredPackages = ['playwright', '@playwright/test'];
    
    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg);
        console.log(`✓ Package ${pkg} is available`);
      } catch (error) {
        throw new Error(`Required package ${pkg} is not installed`);
      }
    }
  }
  
  private async validatePorts(): Promise<void> {
    const requiredPorts = [3457]; // Log analysis dashboard
    
    for (const port of requiredPorts) {
      const isAvailable = await this.checkPortInUse(port);
      if (!isAvailable) {
        console.warn(`⚠️ Port ${port} is not in use - service may not be running`);
      } else {
        console.log(`✓ Port ${port} is in use`);
      }
    }
  }
  
  private async validateBrowsers(): Promise<void> {
    try {
      // This will be validated by Playwright itself
      console.log('✓ Browser validation delegated to Playwright');
    } catch (error) {
      throw new Error(`Browser validation failed: ${error}`);
    }
  }
  
  private async checkPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = request({
        hostname: 'localhost',
        port: port,
        timeout: 1000,
        method: 'HEAD'
      }, () => {
        resolve(true);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        resolve(false);
      });
      
      req.end();
    });
  }
  
  private async identifyService(port: number): Promise<ServiceInfo> {
    const baseUrl = `http://localhost:${port}`;
    
    try {
      // Try to get service information from common endpoints
      const healthCheck = await this.performHealthCheck(baseUrl);
      
      // Identify service type based on port and response
      let serviceName = 'Unknown Service';
      if (port === 3457) {
        serviceName = 'Log Analysis Dashboard';
      } else if (port === 3000) {
        serviceName = 'AI Dev Portal';
      }
      
      return {
        name: serviceName,
        url: baseUrl,
        port: port,
        status: 'running',
        healthCheck: healthCheck
      };
    } catch (error) {
      return {
        name: `Service on port ${port}`,
        url: baseUrl,
        port: port,
        status: 'error',
        healthCheck: false
      };
    }
  }
  
  private async performHealthCheck(baseUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(baseUrl);
      const req = request({
        hostname: url.hostname,
        port: url.port,
        path: '/',
        timeout: 5000,
        method: 'GET'
      }, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        resolve(false);
      });
      
      req.end();
    });
  }
}
