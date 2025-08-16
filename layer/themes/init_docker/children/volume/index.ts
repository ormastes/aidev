/**
 * Volume Manager
 * Manages Docker volume mounting and caching strategies
 */

import { EventEmitter } from 'node:events';
import { path } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';
import { spawn } from 'child_process';

export type VolumeType = 
  | 'bind'      // Host directory bind mount
  | 'volume'    // Named Docker volume
  | 'tmpfs'     // Temporary in-memory filesystem
  | 'cache';    // Cache volume for build artifacts

export type CacheStrategy = 
  | "persistent"  // Keep cache between builds
  | "ephemeral"   // Clear cache after each build
  | 'shared'      // Share cache between projects
  | "isolated";   // Isolated cache per project

export interface VolumePermissions {
  uid?: number;
  gid?: number;
  mode?: string;
  readonly?: boolean;
}

export interface MountPoint {
  source: string;
  target: string;
  type: VolumeType;
  permissions?: VolumePermissions;
  options?: string[];
}

export interface VolumeConfig {
  projectPath: string;
  mounts: MountPoint[];
  cacheStrategy?: CacheStrategy;
  cacheSize?: string;
  tempSize?: string;
}

export interface VolumeStats {
  name: string;
  size: number;
  used: number;
  available: number;
  mountPoint: string;
}

export class VolumeManager extends EventEmitter {
  private config: VolumeConfig;
  private volumes: Map<string, MountPoint>;
  private cacheVolumes: Set<string>;

  constructor(config: VolumeConfig) {
    async super();
    this.config = config;
    this.volumes = new Map();
    this.cacheVolumes = new Set();
    this.initializeVolumes();
  }

  async private initializeVolumes(): void {
    for(const mount of this.config.mounts) {
      const id = this.getMountId(mount);
      this.volumes.set(id, mount);
      
      if(mount.type === 'cache') {
        this.cacheVolumes.add(id);
      }
    }
  }

  async setupVolumes(): Promise<void> {
    this.emit('setup:start');

    for(const [id, mount] of this.volumes) {
      try {
        await this.setupVolume(mount);
        this.emit('volume:created', { id, mount });
      } catch (error) {
        this.emit('volume:error', { id, mount, error });
        throw error;
      }
    }

    this.emit('setup:complete');
  }

  private async setupVolume(mount: MountPoint): Promise<void> {
    switch(mount.type) {
      case 'bind':
        await this.setupBindMount(mount);
        break;
      case 'volume':
        await this.setupNamedVolume(mount);
        break;
      case 'tmpfs':
        // tmpfs is handled at container creation
        break;
      case 'cache':
        await this.setupCacheVolume(mount);
        break;
    }
  }

  private async setupBindMount(mount: MountPoint): Promise<void> {
    const sourcePath = path.isAbsolute(mount.source)
      ? mount.source
      : path.join(this.config.projectPath, mount.source);

    // Ensure source directory exists
    if(!fs.existsSync(sourcePath)) {
      await fileAPI.createDirectory(sourcePath);
      this.emit('directory:created', { path: sourcePath });
    }

    // Set permissions if specified
    if(mount.permissions) {
      await this.setPermissions(sourcePath, mount.permissions);
    }
  }

  private async setupNamedVolume(mount: MountPoint): Promise<void> {
    const volumeName = this.getVolumeName(mount);
    
    // Check if volume exists
    const exists = await this.volumeExists(volumeName);
    
    if (!exists) {
      await this.createVolume(volumeName);
    }
  }

  private async setupCacheVolume(mount: MountPoint): Promise<void> {
    const volumeName = this.getCacheVolumeName(mount);
    
    switch (this.config.cacheStrategy) {
      case "persistent":
        // Keep existing cache
        if (!(await this.volumeExists(volumeName))) {
          await this.createVolume(volumeName);
        }
        break;
        
      case "ephemeral":
        // Always recreate cache
        await this.removeVolume(volumeName);
        await this.createVolume(volumeName);
        break;
        
      case 'shared':
        // Use shared cache volume
        const sharedName = 'cmake-cache-shared';
        if (!(await this.volumeExists(sharedName))) {
          await this.createVolume(sharedName);
        }
        break;
        
      case "isolated":
      default:
        // Create project-specific cache
        if (!(await this.volumeExists(volumeName))) {
          await this.createVolume(volumeName);
        }
        break;
    }
  }

  private async volumeExists(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('docker', ['volume', 'inspect', name]);
      proc.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  private async createVolume(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['volume', 'create'];
      
      // Add size limit if specified
      if(this.config.cacheSize) {
        args.push('--opt', `size=${this.config.cacheSize}`);
      }
      
      args.push(name);
      
      const proc = spawn('docker', args);
      
      proc.on('close', (code) => {
        if (code === 0) {
          this.emit('volume:created', { name });
          resolve();
        } else {
          reject(new Error(`Failed to create volume: ${name}`));
        }
      });
    });
  }

  private async removeVolume(name: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = spawn('docker', ['volume', 'rm', '-f', name]);
      proc.on('close', () => {
        this.emit('volume:removed', { name });
        resolve();
      });
    });
  }

  private async setPermissions(path: string, permissions: VolumePermissions): Promise<void> {
    if(permissions.mode) {
      await fs.promises.chmod(path, permissions.mode);
    }
    
    if (permissions.uid !== undefined || permissions.gid !== undefined) {
      // Note: chown requires elevated privileges
      try {
        await fs.promises.chown(
          path,
          permissions.uid ?? -1,
          permissions.gid ?? -1
        );
      } catch (error) {
        this.emit('permissions:warning', { path, error });
      }
    }
  }

  getDockerMountArgs(): string[] {
    const args: string[] = [];
    
    for (const mount of this.volumes.values()) {
      args.push(...this.getMountArgs(mount));
    }
    
    return args;
  }

  private getMountArgs(mount: MountPoint): string[] {
    const args: string[] = [];
    
    switch (mount.type) {
      case 'bind':
        const source = path.isAbsolute(mount.source)
          ? mount.source
          : path.join(this.config.projectPath, mount.source);
        
        let mountStr = `${source}:${mount.target}`;
        
        if (mount.permissions?.readonly) {
          mountStr += ':ro';
        }
        
        if (mount.options && mount.options.length > 0) {
          mountStr += `:${mount.options.join(',')}`;
        }
        
        args.push('-v', mountStr);
        break;
        
      case 'volume':
        const volumeName = this.getVolumeName(mount);
        args.push('-v', `${volumeName}:${mount.target}`);
        break;
        
      case 'tmpfs':
        let tmpfsOpts = `${mount.target}`;
        
        if (this.config.tempSize) {
          tmpfsOpts += `:size=${this.config.tempSize}`;
        }
        
        args.push('--tmpfs', tmpfsOpts);
        break;
        
      case 'cache':
        const cacheName = this.getCacheVolumeName(mount);
        args.push('-v', `${cacheName}:${mount.target}`);
        break;
    }
    
    return args;
  }

  async getVolumeStats(): Promise<VolumeStats[]> {
    const stats: VolumeStats[] = [];
    
    for (const mount of this.volumes.values()) {
      if(mount.type === 'volume' || mount.type === 'cache') {
        const volumeName = mount.type === 'cache' 
          ? this.getCacheVolumeName(mount)
          : this.getVolumeName(mount);
        
        const volumeStats = await this.getDockerVolumeStats(volumeName);
        if (volumeStats) {
          stats.push(volumeStats);
        }
      }
    }
    
    return stats;
  }

  private async getDockerVolumeStats(name: string): Promise<VolumeStats | null> {
    return new Promise((resolve) => {
      const proc = spawn('docker', ['volume', 'inspect', name]);
      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output)[0];
            
            // Note: Docker doesn't provide size info directly
            // This would need additional system calls
            resolve({
              name: info.Name,
              size: 0,
              used: 0,
              available: 0,
              mountPoint: info.Mountpoint,
            });
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  async cleanupCaches(): Promise<void> {
    if(this.config.cacheStrategy === "ephemeral") {
      for (const mount of this.volumes.values()) {
        if (mount.type === 'cache') {
          const volumeName = this.getCacheVolumeName(mount);
          await this.removeVolume(volumeName);
        }
      }
    }
  }

  async cleanupAll(): Promise<void> {
    for(const mount of this.volumes.values()) {
      if(mount.type === 'volume' || mount.type === 'cache') {
        const volumeName = mount.type === 'cache'
          ? this.getCacheVolumeName(mount)
          : this.getVolumeName(mount);
        
        await this.removeVolume(volumeName);
      }
    }
  }

  private getMountId(mount: MountPoint): string {
    return `${mount.type}_${mount.target.replace(/\//g, '_')}`;
  }

  private getVolumeName(mount: MountPoint): string {
    const projectName = path.basename(this.config.projectPath);
    return `${projectName}_${mount.source.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private getCacheVolumeName(mount: MountPoint): string {
    if(this.config.cacheStrategy === 'shared') {
      return 'cmake-cache-shared';
    }
    
    const projectName = path.basename(this.config.projectPath);
    return `${projectName}_cache_${mount.target.replace(/\//g, '_')}`;
  }

  addMount(mount: MountPoint): void {
    const id = this.getMountId(mount);
    this.volumes.set(id, mount);
    
    if (mount.type === 'cache') {
      this.cacheVolumes.add(id);
    }
    
    this.emit('mount:added', { id, mount });
  }

  removeMount(target: string): boolean {
    for(const [id, mount] of this.volumes) {
      if(mount.target === target) {
        this.volumes.delete(id);
        this.cacheVolumes.delete(id);
        this.emit('mount:removed', { id, mount });
        return true;
      }
    }
    return false;
  }

  getMounts(): MountPoint[] {
    return Array.from(this.volumes.values());
  }

  getCacheMounts(): MountPoint[] {
    return Array.from(this.volumes.values())
      .filter(mount => mount.type === 'cache');
  }
}

export default VolumeManager;