/**
 * Main Log Rotation Service Implementation
 * Orchestrates rotation policies and manages log file rotation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  ILogRotationService,
  IRotationPolicy,
  IRotationIndex,
  RotationConfig,
  RotationResult,
  RotationMetadata,
  RotationHealth,
  FileStats,
  DEFAULT_ROTATION_CONFIG
} from './interfaces';

export class LogRotationService implements ILogRotationService {
  private readonly config: RotationConfig;
  private readonly policies: Map<string, IRotationPolicy> = new Map();
  private readonly rotationIndex: IRotationIndex;
  private rotationCount: number = 0;
  private errorCount: number = 0;
  private lastRotation: Date | null = null;
  private readonly startTime: Date = new Date();

  constructor(
    config: RotationConfig = DEFAULT_ROTATION_CONFIG,
    rotationIndex?: IRotationIndex
  ) {
    this.config = { ...config };
    this.rotationIndex = rotationIndex || this.createDefaultIndex();
    this.initializePolicies();
  }

  private createDefaultIndex(): IRotationIndex {
    // Import here to avoid circular dependency
    const { RotationIndex } = require('./rotation-index');
    const indexPath = path.join(process.cwd(), 'gen', 'logs', 'rotation-index.json');
    return new RotationIndex(indexPath);
  }

  private initializePolicies(): void {
    this.policies.clear();

    if (this.config.sizePolicy.enabled) {
      const { SizeBasedPolicy } = require('./size-based-policy');
      const policy = new SizeBasedPolicy(this.config.sizePolicy);
      this.policies.set('size', policy);
    }

    if (this.config.timePolicy.enabled) {
      const { TimeBasedPolicy } = require('./time-based-policy');
      const policy = new TimeBasedPolicy(this.config.timePolicy);
      this.policies.set('time', policy);
    }

    if (this.config.countPolicy.enabled) {
      const { CountBasedPolicy } = require('./count-based-policy');
      const policy = new CountBasedPolicy(this.config.countPolicy);
      this.policies.set('count', policy);
    }

    if (this.config.agePolicy.enabled) {
      const { AgeBasedPolicy } = require('./age-based-policy');
      const policy = new AgeBasedPolicy(this.config.agePolicy);
      this.policies.set('age', policy);
    }
  }

  addPolicy(policy: IRotationPolicy): void {
    this.policies.set(policy.name, policy);
  }

  removePolicy(policyName: string): void {
    this.policies.delete(policyName);
  }

  getActivePolicies(): string[] {
    return Array.from(this.policies.keys());
  }

  getConfig(): RotationConfig {
    return { ...this.config };
  }

  async updateConfiguration(newConfig: RotationConfig): Promise<void> {
    Object.assign(this.config, newConfig);
    this.initializePolicies();
  }

  async checkRotation(filePath: string): Promise<boolean> {
    try {
      const stats = await this.getFileStats(filePath);
      if (!stats.exists) {
        return false;
      }

      // Check if any policy requires rotation
      for (const policy of this.policies.values()) {
        if (await policy.shouldRotate(filePath, stats)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn(`Error checking rotation for ${filePath}:`, error);
      return false;
    }
  }

  async performRotation(filePath: string): Promise<RotationResult> {
    const startTime = Date.now();

    try {
      const stats = await this.getFileStats(filePath);
      if (!stats.exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Generate rotation filename with timestamp
      const timestamp = new Date();
      const rotatedFile = this.generateRotatedFilename(filePath, timestamp);

      // Perform atomic rotation by renaming the file
      await fs.rename(filePath, rotatedFile);

      let compressedFile: string | undefined;
      let compressionRatio: number | undefined;

      // Apply compression if enabled
      if (this.config.compression.enabled) {
        const { CompressionManager } = require('../external/compression-manager');
        const compressionManager = new CompressionManager();
        
        compressedFile = `${rotatedFile}.gz`;
        const compressionResult = await compressionManager.compress(
          rotatedFile,
          compressedFile,
          this.config.compression.level
        );

        compressionRatio = compressionResult.compressionRatio;

        // Remove uncompressed file after successful compression
        await fs.unlink(rotatedFile);
      }

      // Create new empty log file
      await fs.writeFile(filePath, '');

      // Record rotation in index
      const metadata: RotationMetadata = {
        id: this.generateRotationId(filePath, timestamp),
        originalFile: filePath,
        rotatedFile: compressedFile || rotatedFile,
        compressedFile: compressedFile,
        rotationTimestamp: timestamp,
        originalSize: stats.size,
        compressedSize: compressionRatio ? Math.round(stats.size * compressionRatio) : undefined,
        compressionRatio,
        logDateRange: {
          start: stats.ctime,
          end: timestamp
        },
        policyApplied: this.getActivePolicies(),
        metadata: {}
      };

      await this.rotationIndex.addRotation(metadata);

      const result: RotationResult = {
        success: true,
        originalFile: filePath,
        rotatedFile: compressedFile || rotatedFile,
        compressedFile,
        compressionRatio,
        timestamp
      };

      this.rotationCount++;
      this.lastRotation = timestamp;

      return result;

    } catch (error) {
      this.errorCount++;
      
      return {
        success: false,
        originalFile: filePath,
        rotatedFile: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scheduleRotation(filePath: string, schedule: string): Promise<void> {
    // Implementation would integrate with a scheduler service
    // For now, this is a placeholder
    console.log(`Scheduling rotation for ${filePath} with schedule: ${schedule}`);
  }

  async getRotationHistory(filePath: string): Promise<RotationMetadata[]> {
    return await this.rotationIndex.findRotations({ originalFile: filePath });
  }

  async getHealth(): Promise<RotationHealth> {
    const uptime = Date.now() - this.startTime.getTime();
    const totalOperations = this.rotationCount + this.errorCount;
    const successRate = totalOperations > 0 ? this.rotationCount / totalOperations : 0;

    // Get storage metrics
    let storageMetrics = {
      usedSpace: 0,
      availableSpace: 0,
      compressionSavings: 0
    };

    try {
      const { StorageMetrics } = require('../external/storage-metrics');
      const storage = new StorageMetrics();
      const indexData = await this.rotationIndex.getIndex();
      
      storageMetrics.compressionSavings = storage.calculateCompressionSavings(indexData.rotatedFiles);
    } catch (error) {
      console.warn('Could not get storage metrics:', error);
    }

    return {
      status: this.determineHealthStatus(successRate, this.errorCount),
      lastRotation: this.lastRotation,
      successRate,
      errorCount: this.errorCount,
      policiesActive: this.getActivePolicies(),
      storageMetrics
    };
  }

  async cleanup(): Promise<void> {
    // Run cleanup on all policies
    const cleanupPromises = Array.from(this.policies.values()).map(policy => 
      policy.cleanup().catch(error => console.warn(`Cleanup error for ${policy.name}:`, error))
    );

    await Promise.all(cleanupPromises);
  }

  private async getFileStats(filePath: string): Promise<FileStats> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        exists: true
      };
    } catch (error) {
      return {
        size: 0,
        mtime: new Date(0),
        ctime: new Date(0),
        exists: false
      };
    }
  }

  private generateRotatedFilename(filePath: string, timestamp: Date): string {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    
    const timestampStr = timestamp.toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '-')
      .split('.')[0]; // Remove milliseconds

    return path.join(dir, `${base}.${timestampStr}${ext}`);
  }

  private generateRotationId(filePath: string, timestamp: Date): string {
    const base = path.basename(filePath);
    return `${base}-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineHealthStatus(successRate: number, errorCount: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorCount > 10 || successRate < 0.5) {
      return 'unhealthy';
    }
    if (errorCount > 5 || successRate < 0.8) {
      return 'degraded';
    }
    return 'healthy';
  }
}