/**
 * Storage Metrics Implementation
 * Monitors disk usage and storage health
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  IStorageMetrics,
  RotationMetadata
} from '../domain/interfaces';

export class StorageMetrics implements IStorageMetrics {
  async getDiskUsage(targetPath: string): Promise<{ used: number; available: number; total: number }> {
    try {
      // Get filesystem statistics
      const stats = await fs.statfs ? fs.statfs(targetPath) : await this.getStatsFallback(targetPath);
      
      if (stats) {
        const blockSize = stats.bavail ? stats.bsize || 4096 : 4096;
        const total = (stats.blocks || 0) * blockSize;
        const available = (stats.bavail || 0) * blockSize;
        const used = total - available;
        
        return { used, available, total };
      }
      
      return { used: 0, available: 0, total: 0 };
    } catch (error) {
      console.warn(`Could not get disk usage for ${targetPath}:`, error);
      return { used: 0, available: 0, total: 0 };
    }
  }

  calculateCompressionSavings(rotatedFiles: RotationMetadata[]): number {
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let compressedFileCount = 0;

    for (const file of rotatedFiles) {
      totalOriginalSize += file.originalSize;
      
      if (file.compressedSize !== undefined) {
        totalCompressedSize += file.compressedSize;
        compressedFileCount++;
      } else {
        totalCompressedSize += file.originalSize; // Uncompressed files
      }
    }

    if (totalOriginalSize === 0) {
      return 0;
    }

    const savings = totalOriginalSize - totalCompressedSize;
    return Math.max(0, savings);
  }

  async monitorStorageHealth(): Promise<{ status: string; metrics: any }> {
    try {
      // Check common log directories
      const logDirectories = await this.getLogDirectories();
      const metrics: any = {
        directories: {},
        totalLogSize: 0,
        compressionEfficiency: 0,
        oldestFile: null,
        newestFile: null
      };

      let totalSize = 0;
      let oldestTime = Number.MAX_SAFE_INTEGER;
      let newestTime = 0;
      let totalOriginal = 0;
      let totalCompressed = 0;

      for (const dir of logDirectories) {
        try {
          const dirMetrics = await this.analyzeDirectory(dir);
          metrics.directories[dir] = dirMetrics;
          
          totalSize += dirMetrics.totalSize;
          totalOriginal += dirMetrics.originalSize;
          totalCompressed += dirMetrics.compressedSize;
          
          if (dirMetrics.oldestFile && dirMetrics.oldestFile < oldestTime) {
            oldestTime = dirMetrics.oldestFile;
            metrics.oldestFile = new Date(oldestTime);
          }
          
          if (dirMetrics.newestFile && dirMetrics.newestFile > newestTime) {
            newestTime = dirMetrics.newestFile;
            metrics.newestFile = new Date(newestTime);
          }
        } catch (error) {
          console.warn(`Could not analyze directory ${dir}:`, error);
          metrics.directories[dir] = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }

      metrics.totalLogSize = totalSize;
      metrics.compressionEfficiency = totalOriginal > 0 ? (totalOriginal - totalCompressed) / totalOriginal : 0;

      // Determine health status
      let status = 'healthy';
      if (totalSize > 10 * 1024 * 1024 * 1024) { // > 10GB
        status = 'warning';
      }
      if (totalSize > 50 * 1024 * 1024 * 1024) { // > 50GB
        status = 'critical';
      }

      return { status, metrics };
    } catch (error) {
      return {
        status: 'error',
        metrics: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async getLogDirectories(): Promise<string[]> {
    const commonPaths = [
      path.join(process.cwd(), 'gen', 'logs'),
      path.join(process.cwd(), 'logs'),
      '/var/log',
      '/tmp/logs'
    ];

    const existingPaths: string[] = [];
    
    for (const logPath of commonPaths) {
      try {
        await fs.access(logPath);
        existingPaths.push(logPath);
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return existingPaths;
  }

  private async analyzeDirectory(directory: string): Promise<any> {
    const analysis = {
      totalSize: 0,
      originalSize: 0,
      compressedSize: 0,
      fileCount: 0,
      compressedCount: 0,
      oldestFile: null as number | null,
      newestFile: null as number | null,
      largestFile: { name: '', size: 0 },
      compressionRatio: 0
    };

    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          if (!stats.isFile()) {
            continue;
          }

          analysis.totalSize += stats.size;
          analysis.fileCount++;

          // Track oldest and newest files
          const mtime = stats.mtime.getTime();
          if (analysis.oldestFile === null || mtime < analysis.oldestFile) {
            analysis.oldestFile = mtime;
          }
          if (analysis.newestFile === null || mtime > analysis.newestFile) {
            analysis.newestFile = mtime;
          }

          // Track largest file
          if (stats.size > analysis.largestFile.size) {
            analysis.largestFile = { name: file, size: stats.size };
          }

          // Estimate original vs compressed size
          if (this.isCompressedFile(file)) {
            analysis.compressedCount++;
            analysis.compressedSize += stats.size;
            // Estimate original size (assume 5:1 compression ratio)
            analysis.originalSize += stats.size * 5;
          } else {
            analysis.originalSize += stats.size;
          }
        } catch (error) {
          console.warn(`Could not analyze file ${filePath}:`, error);
        }
      }

      if (analysis.originalSize > 0) {
        analysis.compressionRatio = (analysis.originalSize - analysis.compressedSize) / analysis.originalSize;
      }

      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getStatsFallback(targetPath: string): Promise<any | null> {
    // Fallback implementation for environments without fs.statfs
    try {
      // Try to use a subprocess to get disk usage
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const command = process.platform === 'win32' 
        ? `dir "${targetPath}" /-c`
        : `df "${targetPath}"`;
      
      const { stdout } = await execAsync(command);
      
      if (process.platform !== 'win32') {
        // Parse df output
        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 4) {
            const blockSize = 1024; // df uses 1K blocks by default
            return {
              blocks: parseInt(parts[1]) / (blockSize / 1024),
              bavail: parseInt(parts[3]) / (blockSize / 1024),
              bsize: blockSize
            };
          }
        }
      }
    } catch (error) {
      console.warn('Could not get disk usage via subprocess:', error);
    }
    
    return null;
  }

  private isCompressedFile(filename: string): boolean {
    const compressedExtensions = ['.gz', '.bz2', '.zip', '.7z', '.xz'];
    const ext = path.extname(filename).toLowerCase();
    return compressedExtensions.includes(ext);
  }

  /**
   * Get storage recommendations based on current usage
   */
  async getStorageRecommendations(rotatedFiles: RotationMetadata[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const health = await this.monitorStorageHealth();
      const savings = this.calculateCompressionSavings(rotatedFiles);
      
      // Check compression efficiency
      const efficiency = health.metrics.compressionEfficiency;
      if (efficiency < 0.5) {
        recommendations.push('Consider enabling compression for better storage efficiency');
      }
      
      // Check old files
      if (health.metrics.oldestFile) {
        const ageInDays = (Date.now() - health.metrics.oldestFile.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > 90) {
          recommendations.push(`Consider cleaning up files older than ${Math.round(ageInDays)} days`);
        }
      }
      
      // Check total size
      const totalSizeGB = health.metrics.totalLogSize / (1024 * 1024 * 1024);
      if (totalSizeGB > 5) {
        recommendations.push(`Total log size is ${totalSizeGB.toFixed(2)}GB - consider implementing stricter retention policies`);
      }
      
      // Check savings potential
      if (savings > 100 * 1024 * 1024) { // > 100MB
        const savingsMB = savings / (1024 * 1024);
        recommendations.push(`Compression is saving ${savingsMB.toFixed(2)}MB of disk space`);
      }
      
      return recommendations;
    } catch (error) {
      console.warn('Could not generate storage recommendations:', error);
      return ['Unable to analyze storage - check system permissions'];
    }
  }
}