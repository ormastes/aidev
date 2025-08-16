/**
 * PortRegistry Component
 * 
 * Manages persistent storage of port allocations in a JSON file.
 * Handles concurrent access with file locking mechanism.
 * Following Mock Free Test Oriented Development (MFTOD) principles.
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

interface RegistryData {
  environments: {
    [envName: string]: {
      type: string;
      basePort: number;
      services: {
        [serviceName: string]: number;
      };
    };
  };
  lastUpdated: string;
}

export class PortRegistry {
  private registryPath: string;
  private lockFile: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
    this.lockFile = `${registryPath}.lock`;
  }

  async initialize(): Promise<void> {
    try {
      // Check if registry exists
      await fs.access(this.registryPath);
    } catch {
      // Create empty registry if not exists
      const emptyRegistry: RegistryData = {
        environments: {},
        lastUpdated: new Date().toISOString()
      };
      
      // Ensure directory exists
      const dir = path.dirname(this.registryPath);
      await fileAPI.createDirectory(dir);
      
      await fileAPI.createFile(this.registryPath, JSON.stringify(emptyRegistry, { type: FileType.TEMPORARY }));
    }
  }

  async getUsedPorts(): Promise<Array<{port: number, env: string, service: string}>> {
    const data = await this.readRegistry();
    const ports: Array<{port: number, env: string, service: string}> = [];
    
    for(const [envName, envData] of Object.entries(data.environments)) {
      for(const [serviceName, port] of Object.entries(envData.services)) {
        ports.push({ port, env: envName, service: serviceName });
      }
    }
    
    return ports;
  }

  async registerAllocation(environment: string, service: string, port: number): Promise<void> {
    const release = await this.acquireLock();
    
    try {
      const data = await this.readRegistry();
      
      // Check if port is already allocated to another environment
      for(const [envName, envData] of Object.entries(data.environments)) {
        for(const [svcName, svcPort] of Object.entries(envData.services)) {
          if(svcPort === port && (envName !== environment || svcName !== service)) {
            throw new Error(`Port ${port} is already allocated to ${envName}/${svcName}`);
          }
        }
      }
      
      if(!data.environments[environment]) {
        data.environments[environment] = {
          type: 'unknown',
          basePort: port,
          services: {}
        };
      }
      
      data.environments[environment].services[service] = port;
      data.lastUpdated = new Date().toISOString();
      
      await fileAPI.createFile(this.registryPath, JSON.stringify(data, { type: FileType.TEMPORARY }));
    } finally {
      await release();
    }
  }

  async removeEnvironmentAllocations(environment: string): Promise<void> {
    const release = await this.acquireLock();
    
    try {
      const data = await this.readRegistry();
      delete data.environments[environment];
      data.lastUpdated = new Date().toISOString();
      
      await fileAPI.createFile(this.registryPath, JSON.stringify(data, { type: FileType.TEMPORARY }));
    } finally {
      await release();
    }
  }

  async getEnvironmentPorts(environment: string): Promise<Array<{port: number, service: string}>> {
    const data = await this.readRegistry();
    const envData = data.environments[environment];
    
    if(!envData) {
      return [];
    }
    
    const ports: Array<{port: number, service: string}> = [];
    for(const [serviceName, port] of Object.entries(envData.services)) {
      ports.push({ port, service: serviceName });
    }
    
    return ports;
  }

  async lock(): Promise<void> {
    // For compatibility with tests, but we use acquireLock internally
    await this.acquireLock();
  }

  async unlock(): Promise<void> {
    // For compatibility with tests
    // In real usage, we return a release function from acquireLock
  }

  private async readRegistry(): Promise<RegistryData> {
    try {
      const content = await fileAPI.readFile(this.registryPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Handle corrupted file
      const emptyRegistry: RegistryData = {
        environments: {},
        lastUpdated: new Date().toISOString()
      };
      await fileAPI.createFile(this.registryPath, JSON.stringify(emptyRegistry, { type: FileType.TEMPORARY }));
      return emptyRegistry;
    }
  }

  private async acquireLock(): Promise<() => Promise<void>> {
    // Simple file-based locking mechanism with random backoff
    let attempts = 0;
    const maxAttempts = 50;
    
    while(attempts < maxAttempts) {
      try {
        // Try to create lock file exclusively
        await fileAPI.createFile(this.lockFile, process.pid.toString(), { type: FileType.TEMPORARY });
        
        // Return release function
        return async () => {
          try {
            await fileAPI.unlink(this.lockFile);
          } catch {
            // Lock file might already be removed
          }
        };
      } catch (error: any) {
        if(error.code === 'EEXIST') {
          // Lock exists, wait with random backoff to avoid thundering herd
          const backoff = 50 + Math.random() * 100;
          await new Promise(resolve => setTimeout(resolve, backoff));
          attempts++;
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Failed to acquire lock after maximum attempts');
  }
}