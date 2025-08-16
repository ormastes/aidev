import { fileAPI } from '../utils/file-api';
import { LSPClient } from './LSPClient';
import { EventEmitter } from 'node:events';
import { path } from '../../infra_external-log-lib/src';

export interface LSPInstance {
  id: string;
  name: string;
  rootPath: string;
  client: LSPClient;
  active: boolean;
  lastUsed: Date;
}

export interface LSPInstanceConfig {
  id?: string;
  name: string;
  rootPath: string;
  tsServerPath?: string;
}

export class LSPManager extends EventEmitter {
  private instances: Map<string, LSPInstance> = new Map();
  private defaultInstanceId: string | null = null;
  private activeInstanceId: string | null = null;
  
  constructor() {
    super();
  }
  
  /**
   * Create a new LSP instance
   */
  async createInstance(config: LSPInstanceConfig): Promise<string> {
    const id = config.id || this.generateInstanceId(config.name);
    
    // Check if instance already exists
    if (this.instances.has(id)) {
      throw new Error(`LSP instance with id '${id}' already exists`);
    }
    
    // Create new client
    const client = new LSPClient(config.tsServerPath);
    
    // Create instance
    const instance: LSPInstance = {
      id,
      name: config.name,
      rootPath: path.resolve(config.rootPath),
      client,
      active: false,
      lastUsed: new Date()
    };
    
    // Store instance
    this.instances.set(id, instance);
    
    // Set as default if first instance
    if (this.instances.size === 1) {
      this.defaultInstanceId = id;
      this.activeInstanceId = id;
    }
    
    this.emit("instanceCreated", { id, name: config.name, rootPath: config.rootPath });
    
    // Initialize in background
    this.initializeInstanceInBackground(id);
    
    return id;
  }
  
  /**
   * Get an LSP instance by ID
   */
  getInstance(id?: string): LSPInstance | null {
    const targetId = id || this.activeInstanceId || this.defaultInstanceId;
    if (!targetId) return null;
    
    return this.instances.get(targetId) || null;
  }
  
  /**
   * Get active LSP client
   */
  getActiveClient(): LSPClient | null {
    const instance = this.getInstance();
    return instance ? instance.client : null;
  }
  
  /**
   * Set active instance
   */
  setActiveInstance(id: string): void {
    if (!this.instances.has(id)) {
      throw new Error(`LSP instance '${id}' not found`);
    }
    
    this.activeInstanceId = id;
    const instance = this.instances.get(id)!;
    instance.lastUsed = new Date();
    
    this.emit("activeInstanceChanged", { id, name: instance.name });
  }
  
  /**
   * Set default instance
   */
  setDefaultInstance(id: string): void {
    if (!this.instances.has(id)) {
      throw new Error(`LSP instance '${id}' not found`);
    }
    
    this.defaultInstanceId = id;
    this.emit("defaultInstanceChanged", { id });
  }
  
  /**
   * List all instances
   */
  listInstances(): Array<{
    id: string;
    name: string;
    rootPath: string;
    active: boolean;
    isDefault: boolean;
    isActive: boolean;
    lastUsed: Date;
  }> {
    return Array.from(this.instances.entries()).map(([id, instance]) => ({
      id,
      name: instance.name,
      rootPath: instance.rootPath,
      active: instance.active,
      isDefault: id === this.defaultInstanceId,
      isActive: id === this.activeInstanceId,
      lastUsed: instance.lastUsed
    }));
  }
  
  /**
   * Remove an instance
   */
  async removeInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new Error(`LSP instance '${id}' not found`);
    }
    
    // Shutdown client
    try {
      await instance.client.shutdown();
    } catch (error) {
      console.error(`Error shutting down LSP instance ${id}:`, error);
    }
    
    // Remove from map
    this.instances.delete(id);
    
    // Update default/active if needed
    if (id === this.defaultInstanceId) {
      this.defaultInstanceId = this.instances.size > 0 ? 
        Array.from(this.instances.keys())[0] : null;
    }
    
    if (id === this.activeInstanceId) {
      this.activeInstanceId = this.defaultInstanceId;
    }
    
    this.emit("instanceRemoved", { id, name: instance.name });
  }
  
  /**
   * Shutdown all instances
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];
    
    for (const [id, instance] of this.instances) {
      shutdownPromises.push(
        instance.client.shutdown()
          .catch(error => console.error(`Error shutting down instance ${id}:`, error))
      );
    }
    
    await Promise.all(shutdownPromises);
    
    this.instances.clear();
    this.defaultInstanceId = null;
    this.activeInstanceId = null;
    
    this.emit("allInstancesShutdown");
  }
  
  /**
   * Initialize instance in background
   */
  private async initializeInstanceInBackground(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) return;
    
    try {
      // Open workspace first
      await instance.client.openWorkspace(instance.rootPath);
      
      // Initialize client
      await instance.client.initialize();
      
      instance.active = true;
      this.emit("instanceInitialized", { id, name: instance.name });
    } catch (error) {
      console.error(`Failed to initialize LSP instance ${id}:`, error);
      this.emit("instanceInitializationFailed", { id, error });
    }
  }
  
  /**
   * Generate unique instance ID
   */
  private generateInstanceId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = base;
    let counter = 1;
    
    while (this.instances.has(id)) {
      id = `${base}-${counter}`;
      counter++;
    }
    
    return id;
  }
  
  /**
   * Get instance by workspace path
   */
  getInstanceByPath(workspacePath: string): LSPInstance | null {
    const normalizedPath = path.resolve(workspacePath);
    
    for (const instance of this.instances.values()) {
      if (instance.rootPath === normalizedPath) {
        return instance;
      }
    }
    
    return null;
  }
  
  /**
   * Ensure instance for workspace
   */
  async ensureInstanceForWorkspace(workspacePath: string, name?: string): Promise<string> {
    // Check if instance already exists
    const existingInstance = this.getInstanceByPath(workspacePath);
    if (existingInstance) {
      return existingInstance.id;
    }
    
    // Create new instance
    const instanceName = name || path.basename(workspacePath);
    return this.createInstance({
      name: instanceName,
      rootPath: workspacePath
    });
  }
  
  /**
   * Get or create instance for file
   */
  async getOrCreateInstanceForFile(filePath: string): Promise<string> {
    // Find workspace root by looking for common project files
    const workspaceRoot = await this.findWorkspaceRoot(filePath);
    
    // Ensure instance exists for workspace
    return this.ensureInstanceForWorkspace(workspaceRoot);
  }
  
  /**
   * Find workspace root for a file
   */
  private async findWorkspaceRoot(filePath: string): Promise<string> {
    // Simple implementation - look for package.json, tsconfig.json, etc.
    let currentDir = path.dirname(filePath);
    const rootDir = path.parse(currentDir).root;
    
    const projectFiles = ['package.json', 'tsconfig.json', '.git', 'lerna.json'];
    
    while (currentDir !== rootDir) {
      // Check for project files
      for (const file of projectFiles) {
        const fs = await import('fs/promises');
        try {
          await fs.access(path.join(currentDir, file));
          return currentDir;
        } catch {
          // File doesn't exist, continue
        }
      }
      
      // Move up one directory
      currentDir = path.dirname(currentDir);
    }
    
    // Default to file's directory
    return path.dirname(filePath);
  }
}