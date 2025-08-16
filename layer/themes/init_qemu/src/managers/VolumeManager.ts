/**
 * QEMU Volume Manager
 * Manages persistent volumes for QEMU containers with Docker-like functionality
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface VolumeConfig {
  name?: string;
  driver?: 'local' | 'nfs' | 'ceph' | 'glusterfs';
  driverOpts?: Record<string, string>;
  labels?: Record<string, string>;
  size?: string;
  mountOptions?: string[];
}

export interface Volume {
  id: string;
  name: string;
  driver: string;
  mountpoint: string;
  created: Date;
  status: 'created' | 'mounted' | 'unmounted' | 'error';
  size: number;
  used: number;
  available: number;
  labels: Record<string, string>;
  scope: 'local' | 'global';
  options: Record<string, string>;
  refCount: number;
  containers: string[];
}

export interface MountOptions {
  readonly?: boolean;
  propagation?: 'private' | 'rprivate' | 'shared' | 'rshared' | 'slave' | 'rslave';
  consistency?: 'consistent' | 'cached' | 'delegated';
  volumeOptions?: {
    noCopy?: boolean;
    labels?: Record<string, string>;
    driverConfig?: {
      name: string;
      options: Record<string, string>;
    };
  };
}

export interface VolumeStats {
  totalVolumes: number;
  totalSize: number;
  totalUsed: number;
  volumesByDriver: Record<string, number>;
  mountedVolumes: number;
}

export class VolumeManager extends EventEmitter {
  private volumes: Map<string, Volume> = new Map();
  private dataDir: string;
  private mountDir: string;
  private drivers: Map<string, VolumeDriver> = new Map();

  constructor(options?: {
    dataDir?: string;
    mountDir?: string;
  }) {
    super();
    this.dataDir = options?.dataDir || '/var/lib/qemu-containers/volumes';
    this.mountDir = options?.mountDir || '/mnt/qemu-volumes';
    
    // Register built-in drivers
    this.registerDriver('local', new LocalVolumeDriver(this.dataDir));
    this.registerDriver('nfs', new NFSVolumeDriver());
    this.registerDriver('ceph', new CephVolumeDriver());
    this.registerDriver('glusterfs', new GlusterFSVolumeDriver());
  }

  /**
   * Initialize volume manager
   */
  async initialize(): Promise<void> {
    await fileAPI.createDirectory(this.dataDir);
    await fileAPI.createDirectory(this.mountDir);
    await this.loadVolumes();
    
    // Initialize drivers
    for (const driver of this.drivers.values()) {
      await driver.initialize();
    }
    
    this.emit('initialized');
  }

  /**
   * Create a new volume
   */
  async create(config: VolumeConfig): Promise<Volume> {
    const id = uuidv4();
    const name = config.name || `volume-${id.slice(0, 8)}`;
    const driver = config.driver || 'local';
    
    // Check if volume name already exists
    const existing = this.getByName(name);
    if (existing) {
      throw new Error(`Volume '${name}' already exists`);
    }
    
    // Get driver
    const volumeDriver = this.drivers.get(driver);
    if (!volumeDriver) {
      throw new Error(`Unknown volume driver: ${driver}`);
    }
    
    // Create volume with driver
    const mountpoint = await volumeDriver.create(id, config);
    
    // Get initial stats
    const stats = await volumeDriver.getStats(id);
    
    // Create volume object
    const volume: Volume = {
      id,
      name,
      driver,
      mountpoint,
      created: new Date(),
      status: 'created',
      size: stats.size,
      used: stats.used,
      available: stats.available,
      labels: config.labels || {},
      scope: driver === 'local' ? 'local' : 'global',
      options: config.driverOpts || {},
      refCount: 0,
      containers: []
    };
    
    // Save volume
    await this.saveVolume(volume);
    this.volumes.set(id, volume);
    
    this.emit('created', volume);
    return volume;
  }

  /**
   * Remove a volume
   */
  async remove(volumeIdOrName: string, force: boolean = false): Promise<void> {
    const volume = this.get(volumeIdOrName);
    if (!volume) {
      throw new Error(`Volume '${volumeIdOrName}' not found`);
    }
    
    // Check if volume is in use
    if (volume.refCount > 0 && !force) {
      throw new Error(`Volume '${volume.name}' is in use by ${volume.refCount} container(s)`);
    }
    
    // Get driver
    const driver = this.drivers.get(volume.driver);
    if (!driver) {
      throw new Error(`Volume driver '${volume.driver}' not found`);
    }
    
    // Remove with driver
    await driver.remove(volume.id);
    
    // Remove from registry
    this.volumes.delete(volume.id);
    await this.deleteVolumeFile(volume.id);
    
    this.emit('removed', volume);
  }

  /**
   * Mount a volume
   */
  async mount(
    volumeIdOrName: string,
    containerId: string,
    containerPath: string,
    options?: MountOptions
  ): Promise<string> {
    const volume = this.get(volumeIdOrName);
    if (!volume) {
      throw new Error(`Volume '${volumeIdOrName}' not found`);
    }
    
    // Get driver
    const driver = this.drivers.get(volume.driver);
    if (!driver) {
      throw new Error(`Volume driver '${volume.driver}' not found`);
    }
    
    // Create mount point
    const mountPoint = path.join(this.mountDir, containerId, containerPath);
    await fileAPI.createDirectory(mountPoint);
    
    // Mount with driver
    await driver.mount(volume.id, mountPoint, options);
    
    // Update volume
    volume.status = 'mounted';
    volume.refCount++;
    volume.containers.push(containerId);
    await this.saveVolume(volume);
    
    this.emit('mounted', volume, containerId, mountPoint);
    return mountPoint;
  }

  /**
   * Unmount a volume
   */
  async unmount(volumeIdOrName: string, containerId: string): Promise<void> {
    const volume = this.get(volumeIdOrName);
    if (!volume) {
      throw new Error(`Volume '${volumeIdOrName}' not found`);
    }
    
    // Get driver
    const driver = this.drivers.get(volume.driver);
    if (!driver) {
      throw new Error(`Volume driver '${volume.driver}' not found`);
    }
    
    // Find mount points for container
    const mountPoints = await this.getMountPoints(volume.id, containerId);
    
    // Unmount each mount point
    for (const mountPoint of mountPoints) {
      await driver.unmount(mountPoint);
    }
    
    // Update volume
    volume.refCount--;
    volume.containers = volume.containers.filter(id => id !== containerId);
    
    if (volume.refCount === 0) {
      volume.status = 'unmounted';
    }
    
    await this.saveVolume(volume);
    
    this.emit('unmounted', volume, containerId);
  }

  /**
   * List volumes
   */
  async list(filters?: {
    name?: string;
    driver?: string;
    label?: Record<string, string>;
    dangling?: boolean;
  }): Volume[] {
    let volumes = Array.from(this.volumes.values());
    
    if (filters) {
      if (filters.name) {
        volumes = volumes.filter(v => v.name.includes(filters.name));
      }
      if (filters.driver) {
        volumes = volumes.filter(v => v.driver === filters.driver);
      }
      if (filters.label) {
        volumes = volumes.filter(v => {
          return Object.entries(filters.label!).every(([key, value]) =>
            v.labels[key] === value
          );
        });
      }
      if (filters.dangling !== undefined) {
        volumes = volumes.filter(v => (v.refCount === 0) === filters.dangling);
      }
    }
    
    return volumes;
  }

  /**
   * Get volume by ID or name
   */
  async get(volumeIdOrName: string): Volume | undefined {
    // Try ID first
    let volume = this.volumes.get(volumeIdOrName);
    
    // Try name if not found by ID
    if (!volume) {
      volume = this.getByName(volumeIdOrName);
    }
    
    return volume;
  }

  /**
   * Get volume by name
   */
  private async getByName(name: string): Volume | undefined {
    return Array.from(this.volumes.values())
      .find(v => v.name === name);
  }

  /**
   * Inspect volume
   */
  async inspect(volumeIdOrName: string): Promise<Volume & { usage: VolumeUsage }> {
    const volume = this.get(volumeIdOrName);
    if (!volume) {
      throw new Error(`Volume '${volumeIdOrName}' not found`);
    }
    
    // Get driver
    const driver = this.drivers.get(volume.driver);
    if (!driver) {
      throw new Error(`Volume driver '${volume.driver}' not found`);
    }
    
    // Get current stats
    const stats = await driver.getStats(volume.id);
    
    // Get usage details
    const usage = await this.getVolumeUsage(volume);
    
    // Update volume stats
    volume.size = stats.size;
    volume.used = stats.used;
    volume.available = stats.available;
    
    return { ...volume, usage };
  }

  /**
   * Prune unused volumes
   */
  async prune(): Promise<{ volumesDeleted: string[]; spaceReclaimed: number }> {
    const deleted: string[] = [];
    let spaceReclaimed = 0;
    
    const volumes = this.list({ dangling: true });
    
    for (const volume of volumes) {
      try {
        spaceReclaimed += volume.used;
        await this.remove(volume.id);
        deleted.push(volume.name);
      } catch (error) {
        // Skip volumes that can't be removed
      }
    }
    
    return { volumesDeleted: deleted, spaceReclaimed };
  }

  /**
   * Copy data between volumes
   */
  async copy(
    sourceVolume: string,
    destVolume: string,
    options?: {
      overwrite?: boolean;
      excludePatterns?: string[];
    }
  ): Promise<void> {
    const source = this.get(sourceVolume);
    const dest = this.get(destVolume);
    
    if (!source) {
      throw new Error(`Source volume '${sourceVolume}' not found`);
    }
    if (!dest) {
      throw new Error(`Destination volume '${destVolume}' not found`);
    }
    
    // Use rsync or cp for copying
    await this.copyDirectory(source.mountpoint, dest.mountpoint, options);
    
    this.emit('copied', source, dest);
  }

  /**
   * Backup volume
   */
  async backup(volumeIdOrName: string, backupPath: string): Promise<string> {
    const volume = this.get(volumeIdOrName);
    if (!volume) {
      throw new Error(`Volume '${volumeIdOrName}' not found`);
    }
    
    const backupFile = path.join(backupPath, `${volume.name}-${Date.now()}.tar.gz`);
    
    // Create tar archive
    await this.createTarArchive(volume.mountpoint, backupFile);
    
    this.emit('backed-up', volume, backupFile);
    return backupFile;
  }

  /**
   * Restore volume from backup
   */
  async restore(backupFile: string, volumeName?: string): Promise<Volume> {
    // Create new volume
    const volume = await this.create({
      name: volumeName || `restored-${Date.now()}`
    });
    
    // Extract backup
    await this.extractTarArchive(backupFile, volume.mountpoint);
    
    this.emit('restored', volume, backupFile);
    return volume;
  }

  /**
   * Get volume statistics
   */
  async getStats(): Promise<VolumeStats> {
    const volumes = Array.from(this.volumes.values());
    
    const stats: VolumeStats = {
      totalVolumes: volumes.length,
      totalSize: volumes.reduce((sum, v) => sum + v.size, 0),
      totalUsed: volumes.reduce((sum, v) => sum + v.used, 0),
      volumesByDriver: {},
      mountedVolumes: volumes.filter(v => v.status === 'mounted').length
    };
    
    // Count by driver
    for (const volume of volumes) {
      stats.volumesByDriver[volume.driver] = 
        (stats.volumesByDriver[volume.driver] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Register volume driver
   */
  async registerDriver(name: string, driver: VolumeDriver): void {
    this.drivers.set(name, driver);
    this.emit('driverRegistered', name);
  }

  /**
   * Get mount points for container
   */
  private async getMountPoints(volumeId: string, containerId: string): Promise<string[]> {
    const mountPoints: string[] = [];
    const containerMountDir = path.join(this.mountDir, containerId);
    
    try {
      const entries = await fs.readdir(containerMountDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          mountPoints.push(path.join(containerMountDir, entry.name));
        }
      }
    } catch {
      // No mounts for container
    }
    
    return mountPoints;
  }

  /**
   * Get volume usage details
   */
  private async getVolumeUsage(volume: Volume): Promise<VolumeUsage> {
    const usage: VolumeUsage = {
      refCount: volume.refCount,
      size: volume.size,
      used: volume.used,
      available: volume.available,
      containers: [],
      lastAccessed: new Date()
    };
    
    // Get container details
    for (const containerId of volume.containers) {
      usage.containers.push({
        id: containerId,
        mountPoints: await this.getMountPoints(volume.id, containerId)
      });
    }
    
    return usage;
  }

  /**
   * Copy directory
   */
  private async copyDirectory(source: string, dest: string, options?: any): Promise<void> {
    await fileAPI.createDirectory(dest);
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);
      
      // Check exclusions
      if (options?.excludePatterns) {
        const shouldExclude = options.excludePatterns.some((pattern: string) =>
          entry.name.match(new RegExp(pattern))
        );
        if (shouldExclude) continue;
      }
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath, options);
      } else {
        if (!options?.overwrite) {
          try {
            await fs.access(destPath);
            continue; // Skip if exists and not overwriting
          } catch {
            // File doesn't exist, proceed with copy
          }
        }
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Create tar archive
   */
  private async createTarArchive(source: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', dest, '-C', source, '.']);
      
      tar.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tar failed with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }

  /**
   * Extract tar archive
   */
  private async extractTarArchive(source: string, dest: string): Promise<void> {
    await fileAPI.createDirectory(dest);
    
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', source, '-C', dest]);
      
      tar.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tar extraction failed with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }

  /**
   * Load volumes from disk
   */
  private async loadVolumes(): Promise<void> {
    try {
      const files = await fs.readdir(this.dataDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const volumePath = path.join(this.dataDir, file);
          const data = await fs.readFile(volumePath, 'utf-8');
          const volume = JSON.parse(data);
          
          // Convert dates
          volume.created = new Date(volume.created);
          
          this.volumes.set(volume.id, volume);
        }
      }
    } catch {
      // No volumes yet
    }
  }

  /**
   * Save volume to disk
   */
  private async saveVolume(volume: Volume): Promise<void> {
    const volumePath = path.join(this.dataDir, `${volume.id}.json`);
    await fileAPI.createFile(volumePath, JSON.stringify(volume, { type: FileType.TEMPORARY }));
  }

  /**
   * Delete volume file
   */
  private async deleteVolumeFile(volumeId: string): Promise<void> {
    const volumePath = path.join(this.dataDir, `${volumeId}.json`);
    await fs.unlink(volumePath).catch(() => {});
  }
}

/**
 * Volume driver interface
 */
interface VolumeDriver {
  async initialize(): Promise<void>;
  create(id: string, config: VolumeConfig): Promise<string>;
  remove(id: string): Promise<void>;
  mount(id: string, mountPoint: string, options?: MountOptions): Promise<void>;
  unmount(mountPoint: string): Promise<void>;
  getStats(id: string): Promise<{ size: number; used: number; available: number }>;
}

/**
 * Volume usage details
 */
interface VolumeUsage {
  refCount: number;
  size: number;
  used: number;
  available: number;
  containers: Array<{
    id: string;
    mountPoints: string[];
  }>;
  lastAccessed: Date;
}

/**
 * Local volume driver
 */
class LocalVolumeDriver implements VolumeDriver {
  constructor(private dataDir: string) {}

  async initialize(): Promise<void> {
    await fileAPI.createDirectory(this.dataDir);
  }

  async create(id: string, config: VolumeConfig): Promise<string> {
    const volumePath = path.join(this.dataDir, id);
    await fileAPI.createDirectory(volumePath);
    
    // Set size limit if specified
    if (config.size) {
      // Would use quota or filesystem limits
    }
    
    return volumePath;
  }

  async remove(id: string): Promise<void> {
    const volumePath = path.join(this.dataDir, id);
    await fs.rm(volumePath, { recursive: true, force: true });
  }

  async mount(id: string, mountPoint: string, options?: MountOptions): Promise<void> {
    const volumePath = path.join(this.dataDir, id);
    
    // Bind mount (simplified - would use actual mount command)
    await fs.symlink(volumePath, mountPoint);
  }

  async unmount(mountPoint: string): Promise<void> {
    await fs.unlink(mountPoint).catch(() => {});
  }

  async getStats(id: string): Promise<{ size: number; used: number; available: number }> {
    const volumePath = path.join(this.dataDir, id);
    
    // Get disk usage (simplified)
    return {
      size: 1024 * 1024 * 1024, // 1GB default
      used: 0,
      available: 1024 * 1024 * 1024
    };
  }
}

/**
 * NFS volume driver
 */
class NFSVolumeDriver implements VolumeDriver {
  async initialize(): Promise<void> {}
  
  async create(id: string, config: VolumeConfig): Promise<string> {
    // NFS volume creation
    return `/mnt/nfs/${id}`;
  }
  
  async remove(id: string): Promise<void> {
    // NFS volume removal
  }
  
  async mount(id: string, mountPoint: string, options?: MountOptions): Promise<void> {
    // NFS mount
  }
  
  async unmount(mountPoint: string): Promise<void> {
    // NFS unmount
  }
  
  async getStats(id: string): Promise<{ size: number; used: number; available: number }> {
    return { size: 0, used: 0, available: 0 };
  }
}

/**
 * Ceph volume driver
 */
class CephVolumeDriver implements VolumeDriver {
  async initialize(): Promise<void> {}
  
  async create(id: string, config: VolumeConfig): Promise<string> {
    // Ceph RBD volume creation
    return `/mnt/ceph/${id}`;
  }
  
  async remove(id: string): Promise<void> {
    // Ceph volume removal
  }
  
  async mount(id: string, mountPoint: string, options?: MountOptions): Promise<void> {
    // Ceph mount
  }
  
  async unmount(mountPoint: string): Promise<void> {
    // Ceph unmount
  }
  
  async getStats(id: string): Promise<{ size: number; used: number; available: number }> {
    return { size: 0, used: 0, available: 0 };
  }
}

/**
 * GlusterFS volume driver
 */
class GlusterFSVolumeDriver implements VolumeDriver {
  async initialize(): Promise<void> {}
  
  async create(id: string, config: VolumeConfig): Promise<string> {
    // GlusterFS volume creation
    return `/mnt/gluster/${id}`;
  }
  
  async remove(id: string): Promise<void> {
    // GlusterFS volume removal
  }
  
  async mount(id: string, mountPoint: string, options?: MountOptions): Promise<void> {
    // GlusterFS mount
  }
  
  async unmount(mountPoint: string): Promise<void> {
    // GlusterFS unmount
  }
  
  async getStats(id: string): Promise<{ size: number; used: number; available: number }> {
    return { size: 0, used: 0, available: 0 };
  }
}

// Export singleton instance
export const volumeManager = new VolumeManager();