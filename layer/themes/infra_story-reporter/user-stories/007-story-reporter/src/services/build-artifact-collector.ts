import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join, dirname, basename, extname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { HierarchicalBuildResult } from '../domain/hierarchical-build-config';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * Build Artifact Collector
 * 
 * Collects, organizes, and manages artifacts from distributed builds
 * including logs, coverage reports, test results, and custom artifacts.
 */
export class BuildArtifactCollector extends EventEmitter {
  private artifactRoot: string;
  private compressionEnabled: boolean;
  private retentionPolicy: RetentionPolicy;
  private artifactRegistry: Map<string, ArtifactMetadata[]> = new Map();

  constructor(options: ArtifactCollectorOptions = {}) {
    super();
    this.artifactRoot = options.artifactRoot || './build-artifacts';
    this.compressionEnabled = options.enableCompression ?? true;
    this.retentionPolicy = options.retentionPolicy || {
      maxAgeInDays: 30,
      maxSizeInMB: 1000,
      maxBuilds: 100
    };
  }

  /**
   * Initialize the artifact collector
   */
  async initialize(): Promise<void> {
    await fileAPI.createDirectory(this.artifactRoot);
    await this.loadArtifactRegistry();
    
    this.emit('initialized', {
      artifactRoot: this.artifactRoot,
      compressionEnabled: this.compressionEnabled,
      timestamp: new Date()
    });
  }

  /**
   * Collect artifacts from a hierarchical build
   */
  async collectArtifacts(
    buildResult: HierarchicalBuildResult,
    options: CollectionOptions = {}
  ): Promise<CollectedArtifacts> {
    const startTime = new Date();
    const buildPath = this.getBuildArtifactPath(buildResult);
    
    this.emit('collectionStart', {
      buildId: buildResult.buildId,
      buildType: buildResult.buildType,
      timestamp: startTime
    });
    
    try {
      // Create build directory structure
      await this.createBuildDirectories(buildPath);
      
      // Collect artifacts from this build
      const collected = await this.collectBuildArtifacts(buildResult, buildPath, options);
      
      // Collect artifacts from children recursively
      if (buildResult.children.length > 0 && options.includeChildren !== false) {
        for (const child of buildResult.children) {
          const childArtifacts = await this.collectArtifacts(child, options);
          this.mergeCollectedArtifacts(collected, childArtifacts);
        }
      }
      
      // Save build metadata
      await this.saveBuildMetadata(buildResult, buildPath, collected);
      
      // Update artifact registry
      await this.updateArtifactRegistry(buildResult.buildId, collected);
      
      // Apply retention policy
      if (options.applyRetention !== false) {
        await this.applyRetentionPolicy();
      }
      
      const endTime = new Date();
      
      this.emit('collectionComplete', {
        buildId: buildResult.buildId,
        artifactCount: collected.totalCount,
        totalSize: collected.totalSize,
        duration: endTime.getTime() - startTime.getTime(),
        timestamp: endTime
      });
      
      return collected;
      
    } catch (error) {
      this.emit('collectionError', {
        buildId: buildResult.buildId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Get build artifact path
   */
  private async getBuildArtifactPath(buildResult: HierarchicalBuildResult): string {
    const timestamp = (buildResult.startTime || new Date()).toISOString().split('T')[0];
    return join(
      this.artifactRoot,
      buildResult.buildType,
      timestamp,
      buildResult.buildId
    );
  }

  /**
   * Create build directory structure
   */
  private async createBuildDirectories(buildPath: string): Promise<void> {
    const directories = [
      buildPath,
      join(buildPath, 'logs'),
      join(buildPath, 'coverage'),
      join(buildPath, 'reports'),
      join(buildPath, 'screenshots'),
      join(buildPath, 'custom')
    ];
    
    for (const dir of directories) {
      await fileAPI.createDirectory(dir);
    }
  }

  /**
   * Collect artifacts from a single build
   */
  private async collectBuildArtifacts(
    buildResult: HierarchicalBuildResult,
    buildPath: string,
    options: CollectionOptions
  ): Promise<CollectedArtifacts> {
    const collected: CollectedArtifacts = {
      logs: [],
      coverage: [],
      reports: [],
      screenshots: [],
      custom: [],
      totalCount: 0,
      totalSize: 0,
      metadata: {
        buildId: buildResult.buildId,
        buildType: buildResult.buildType,
        collectionTime: new Date(),
        compressed: this.compressionEnabled
      }
    };
    
    // Collect logs
    if (options.includeLogs !== false && buildResult.logs) {
      const logFile = await this.saveLogsToFile(buildResult.logs, buildPath);
      collected.logs.push(logFile);
    }
    
    // Collect artifacts from build results
    if (buildResult.artifacts) {
      // Collect coverage files
      if (options.includeCoverage !== false) {
        for (const coverageFile of buildResult.artifacts.coverage) {
          const artifact = await this.collectFile(
            coverageFile,
            join(buildPath, 'coverage'),
            'coverage'
          );
          if (artifact) collected.coverage.push(artifact);
        }
      }
      
      // Collect report files
      if (options.includeReports !== false) {
        for (const reportFile of buildResult.artifacts.reports) {
          const artifact = await this.collectFile(
            reportFile,
            join(buildPath, 'reports'),
            'report'
          );
          if (artifact) collected.reports.push(artifact);
        }
      }
      
      // Collect other artifacts
      for (const otherFile of buildResult.artifacts.other) {
        const artifact = await this.collectFile(
          otherFile,
          join(buildPath, 'custom'),
          'custom'
        );
        if (artifact) collected.custom.push(artifact);
      }
    }
    
    // Calculate totals
    const allArtifacts = [
      ...collected.logs,
      ...collected.coverage,
      ...collected.reports,
      ...collected.screenshots,
      ...collected.custom
    ];
    
    collected.totalCount = allArtifacts.length;
    collected.totalSize = allArtifacts.reduce((sum, a) => sum + a.size, 0);
    
    return collected;
  }

  /**
   * Save logs to file
   */
  private async saveLogsToFile(
    logs: Array<{ timestamp: Date; level: string; message: string; source?: string }>,
    buildPath: string
  ): Promise<ArtifactInfo> {
    const logContent = logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.source ? `[${log.source}] ` : ''}${log.message}`
    ).join('\n');
    
    const logFileName = 'build.log';
    const logPath = join(buildPath, 'logs', logFileName);
    
    if (this.compressionEnabled) {
      const compressedPath = `${logPath}.gz`;
      await this.compressFile(Buffer.from(logContent), compressedPath);
      
      const stats = await fs.stat(compressedPath);
      return {
        name: `${logFileName}.gz`,
        path: compressedPath,
        type: 'log',
        size: stats.size,
        compressed: true,
        timestamp: new Date()
      };
    } else {
      await fileAPI.createFile(logPath, logContent);
      const stats = await fs.stat(logPath);
      
      return {
        name: logFileName, { type: FileType.TEMPORARY })
      };
    }
  }

  /**
   * Collect a file artifact
   */
  private async collectFile(
    sourcePath: string,
    destDir: string,
    type: ArtifactType
  ): Promise<ArtifactInfo | null> {
    try {
      const fileName = basename(sourcePath);
      const destPath = join(destDir, fileName);
      
      // Check if source exists
      await fs.access(sourcePath);
      
      if (this.compressionEnabled && this.shouldCompress(fileName)) {
        const compressedPath = `${destPath}.gz`;
        await this.compressFileFromPath(sourcePath, compressedPath);
        
        const stats = await fs.stat(compressedPath);
        return {
          name: `${fileName}.gz`,
          path: compressedPath,
          type,
          size: stats.size,
          compressed: true,
          originalPath: sourcePath,
          timestamp: new Date()
        };
      } else {
        await fs.copyFile(sourcePath, destPath);
        const stats = await fs.stat(destPath);
        
        return {
          name: fileName,
          path: destPath,
          type,
          size: stats.size,
          compressed: false,
          originalPath: sourcePath,
          timestamp: new Date()
        };
      }
    } catch (error) {
      this.emit('warning', {
        message: `Failed to collect artifact ${sourcePath}: ${error}`,
        timestamp: new Date()
      });
      return null;
    }
  }

  /**
   * Check if file should be compressed
   */
  private async shouldCompress(fileName: string): boolean {
    const ext = extname(fileName).toLowerCase();
    const compressibleExtensions = [
      '.log', '.txt', '.json', '.xml', '.html', '.css', '.js',
      '.lcov', '.csv', '.md', '.yml', '.yaml'
    ];
    return compressibleExtensions.includes(ext);
  }

  /**
   * Compress file content
   */
  private async compressFile(content: Buffer, destPath: string): Promise<void> {
    await fileAPI.createDirectory(dirname(destPath));
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(destPath);
      const gzip = createGzip({ level: 9 });
      
      gzip.pipe(writeStream);
      gzip.write(content);
      gzip.end();
      
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      gzip.on('error', reject);
    });
  }

  /**
   * Compress file from path
   */
  private async compressFileFromPath(sourcePath: string, destPath: string): Promise<void> {
    await fileAPI.createDirectory(dirname(destPath));
    
    const readStream = createReadStream(sourcePath);
    const writeStream = createWriteStream(destPath);
    const gzip = createGzip({ level: 9 });
    
    await pipeline(readStream, gzip, writeStream);
  }

  /**
   * Merge collected artifacts
   */
  private async mergeCollectedArtifacts(target: CollectedArtifacts, source: CollectedArtifacts): void {
    target.logs.push(...source.logs);
    target.coverage.push(...source.coverage);
    target.reports.push(...source.reports);
    target.screenshots.push(...source.screenshots);
    target.custom.push(...source.custom);
    target.totalCount += source.totalCount;
    target.totalSize += source.totalSize;
  }

  /**
   * Save build metadata
   */
  private async saveBuildMetadata(
    buildResult: HierarchicalBuildResult,
    buildPath: string,
    collected: CollectedArtifacts
  ): Promise<void> {
    const metadata = {
      buildId: buildResult.buildId,
      buildType: buildResult.buildType,
      status: buildResult.status,
      startTime: buildResult.startTime,
      endTime: buildResult.endTime,
      duration: buildResult.duration,
      testResults: buildResult.testResults,
      coverage: buildResult.coverage,
      artifacts: collected,
      collectionTime: new Date()
    };
    
    const metadataPath = join(buildPath, 'build-metadata.json');
    await fileAPI.createFile(metadataPath, JSON.stringify(metadata, { type: FileType.TEMPORARY }));
  }

  /**
   * Load artifact registry
   */
  private async loadArtifactRegistry(): Promise<void> {
    const registryPath = join(this.artifactRoot, 'artifact-registry.json');
    
    try {
      const content = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(content);
      
      for (const [buildId, artifacts] of Object.entries(registry)) {
        this.artifactRegistry.set(buildId, artifacts as ArtifactMetadata[]);
      }
    } catch (error) {
      // Registry doesn't exist yet, start with empty
      this.artifactRegistry.clear();
    }
  }

  /**
   * Update artifact registry
   */
  private async updateArtifactRegistry(
    buildId: string,
    collected: CollectedArtifacts
  ): Promise<void> {
    const metadata: ArtifactMetadata = {
      buildId,
      collectionTime: collected.metadata.collectionTime,
      artifactCount: collected.totalCount,
      totalSize: collected.totalSize,
      artifacts: [
        ...collected.logs,
        ...collected.coverage,
        ...collected.reports,
        ...collected.screenshots,
        ...collected.custom
      ]
    };
    
    const existing = this.artifactRegistry.get(buildId) || [];
    existing.push(metadata);
    this.artifactRegistry.set(buildId, existing);
    
    // Save registry
    const registryPath = join(this.artifactRoot, 'artifact-registry.json');
    const registryData: Record<string, ArtifactMetadata[]> = {};
    
    for (const [id, data] of this.artifactRegistry) {
      registryData[id] = data;
    }
    
    await fileAPI.createFile(registryPath, JSON.stringify(registryData, { type: FileType.TEMPORARY }));
  }

  /**
   * Apply retention policy
   */
  private async applyRetentionPolicy(): Promise<void> {
    const startTime = new Date();
    
    this.emit('retentionStart', {
      policy: this.retentionPolicy,
      timestamp: startTime
    });
    
    let deletedCount = 0;
    let freedSpace = 0;
    
    try {
      // Check age-based retention
      if (this.retentionPolicy.maxAgeInDays) {
        const result = await this.applyAgeRetention(this.retentionPolicy.maxAgeInDays);
        deletedCount += result.deletedCount;
        freedSpace += result.freedSpace;
      }
      
      // Check size-based retention
      if (this.retentionPolicy.maxSizeInMB) {
        const result = await this.applySizeRetention(this.retentionPolicy.maxSizeInMB);
        deletedCount += result.deletedCount;
        freedSpace += result.freedSpace;
      }
      
      // Check build count retention
      if (this.retentionPolicy.maxBuilds) {
        const result = await this.applyBuildCountRetention(this.retentionPolicy.maxBuilds);
        deletedCount += result.deletedCount;
        freedSpace += result.freedSpace;
      }
      
      const endTime = new Date();
      
      this.emit('retentionComplete', {
        deletedCount,
        freedSpace,
        duration: endTime.getTime() - startTime.getTime(),
        timestamp: endTime
      });
      
    } catch (error) {
      this.emit('retentionError', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Apply age-based retention
   */
  private async applyAgeRetention(maxAgeInDays: number): Promise<RetentionResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    
    let deletedCount = 0;
    let freedSpace = 0;
    
    for (const [buildId, metadataList] of this.artifactRegistry) {
      for (const metadata of metadataList) {
        if (metadata.collectionTime < cutoffDate) {
          // Delete artifacts
          for (const artifact of metadata.artifacts) {
            try {
              await fs.unlink(artifact.path);
              freedSpace += artifact.size;
              deletedCount++;
            } catch (error) {
              // File might already be deleted
            }
          }
        }
      }
    }
    
    return { deletedCount, freedSpace };
  }

  /**
   * Apply size-based retention
   */
  private async applySizeRetention(maxSizeInMB: number): Promise<RetentionResult> {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    let totalSize = 0;
    let deletedCount = 0;
    let freedSpace = 0;
    
    // Calculate total size
    for (const metadataList of this.artifactRegistry.values()) {
      for (const metadata of metadataList) {
        totalSize += metadata.totalSize;
      }
    }
    
    if (totalSize <= maxSizeInBytes) {
      return { deletedCount, freedSpace };
    }
    
    // Sort artifacts by age (oldest first)
    const allArtifacts: Array<{ buildId: string; metadata: ArtifactMetadata }> = [];
    for (const [buildId, metadataList] of this.artifactRegistry) {
      for (const metadata of metadataList) {
        allArtifacts.push({ buildId, metadata });
      }
    }
    
    allArtifacts.sort((a, b) => 
      a.metadata.collectionTime.getTime() - b.metadata.collectionTime.getTime()
    );
    
    // Delete oldest artifacts until under limit
    for (const { metadata } of allArtifacts) {
      if (totalSize <= maxSizeInBytes) break;
      
      for (const artifact of metadata.artifacts) {
        try {
          await fs.unlink(artifact.path);
          totalSize -= artifact.size;
          freedSpace += artifact.size;
          deletedCount++;
        } catch (error) {
          // File might already be deleted
        }
      }
    }
    
    return { deletedCount, freedSpace };
  }

  /**
   * Apply build count retention
   */
  private async applyBuildCountRetention(maxBuilds: number): Promise<RetentionResult> {
    let deletedCount = 0;
    let freedSpace = 0;
    
    if (this.artifactRegistry.size <= maxBuilds) {
      return { deletedCount, freedSpace };
    }
    
    // Sort builds by age
    const builds = Array.from(this.artifactRegistry.entries())
      .sort((a, b) => {
        const aTime = Math.min(...a[1].map(m => m.collectionTime.getTime()));
        const bTime = Math.min(...b[1].map(m => m.collectionTime.getTime()));
        return aTime - bTime;
      });
    
    // Delete oldest builds
    const buildsToDelete = builds.slice(0, builds.length - maxBuilds);
    
    for (const [buildId, metadataList] of buildsToDelete) {
      for (const metadata of metadataList) {
        for (const artifact of metadata.artifacts) {
          try {
            await fs.unlink(artifact.path);
            freedSpace += artifact.size;
            deletedCount++;
          } catch (error) {
            // File might already be deleted
          }
        }
      }
      
      this.artifactRegistry.delete(buildId);
    }
    
    return { deletedCount, freedSpace };
  }

  /**
   * Get artifacts for a build
   */
  async getArtifacts(buildId: string): Promise<CollectedArtifacts | null> {
    const metadata = this.artifactRegistry.get(buildId);
    if (!metadata || metadata.length === 0) {
      return null;
    }
    
    // Return the most recent collection
    const latest = metadata[metadata.length - 1];
    
    return {
      logs: latest.artifacts.filter(a => a.type === 'log'),
      coverage: latest.artifacts.filter(a => a.type === 'coverage'),
      reports: latest.artifacts.filter(a => a.type === 'report'),
      screenshots: latest.artifacts.filter(a => a.type === 'screenshot'),
      custom: latest.artifacts.filter(a => a.type === 'custom'),
      totalCount: latest.artifactCount,
      totalSize: latest.totalSize,
      metadata: {
        buildId,
        buildType: 'unknown', // Not stored in registry
        collectionTime: latest.collectionTime,
        compressed: true // Assume compressed if enabled
      }
    };
  }

  /**
   * Clean all artifacts
   */
  async cleanAll(): Promise<void> {
    await fs.rm(this.artifactRoot, { recursive: true, force: true });
    await fileAPI.createDirectory(this.artifactRoot);
    this.artifactRegistry.clear();
    
    this.emit('cleaned', {
      timestamp: new Date()
    });
  }
}

// Type definitions

interface ArtifactCollectorOptions {
  artifactRoot?: string;
  enableCompression?: boolean;
  retentionPolicy?: RetentionPolicy;
}

interface RetentionPolicy {
  maxAgeInDays?: number;
  maxSizeInMB?: number;
  maxBuilds?: number;
}

interface CollectionOptions {
  includeChildren?: boolean;
  includeLogs?: boolean;
  includeCoverage?: boolean;
  includeReports?: boolean;
  includeScreenshots?: boolean;
  applyRetention?: boolean;
}

interface CollectedArtifacts {
  logs: ArtifactInfo[];
  coverage: ArtifactInfo[];
  reports: ArtifactInfo[];
  screenshots: ArtifactInfo[];
  custom: ArtifactInfo[];
  totalCount: number;
  totalSize: number;
  metadata: {
    buildId: string;
    buildType: string;
    collectionTime: Date;
    compressed: boolean;
  };
}

interface ArtifactInfo {
  name: string;
  path: string;
  type: ArtifactType;
  size: number;
  compressed: boolean;
  originalPath?: string;
  timestamp: Date;
}

type ArtifactType = 'log' | 'coverage' | 'report' | 'screenshot' | 'custom';

interface ArtifactMetadata {
  buildId: string;
  collectionTime: Date;
  artifactCount: number;
  totalSize: number;
  artifacts: ArtifactInfo[];
}

interface RetentionResult {
  deletedCount: number;
  freedSpace: number;
}

export {
  BuildArtifactCollector,
  ArtifactCollectorOptions,
  CollectionOptions,
  CollectedArtifacts,
  ArtifactInfo
};