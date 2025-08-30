/**
 * Count-Based Rotation Policy Implementation
 * Maintains maximum number of rotated log files
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  IRotationPolicy,
  CountPolicyConfig,
  FileStats,
  RotationResult,
  RotationHealth
} from './interfaces';

export class CountBasedPolicy implements IRotationPolicy {
  public readonly name: string = 'count-based';
  public readonly config: CountPolicyConfig;
  private cleanupCount: number = 0;
  private errorCount: number = 0;

  constructor(config: CountPolicyConfig) {
    this.config = { ...config };
  }

  async shouldRotate(filePath: string, stats: FileStats): Promise<boolean> {
    if (!this.config.enabled || !stats.exists) {
      return false;
    }

    // Count-based policy doesn't trigger rotation itself
    // It performs cleanup after rotation
    return false;
  }

  async rotate(filePath: string): Promise<RotationResult> {
    // Count-based policy handles cleanup, not rotation triggering
    return {
      success: true,
      originalFile: filePath,
      rotatedFile: '',
      timestamp: new Date()
    };
  }

  async cleanup(): Promise<void> {
    if (!this.config.enabled || !this.config.cleanupOnRotation) {
      return;
    }

    try {
      // Find all rotated files in common log directories
      const logDirectories = await this.getLogDirectories();
      
      for (const logDir of logDirectories) {
        await this.cleanupDirectory(logDir);
      }
      
      this.cleanupCount++;
    } catch (error) {
      this.errorCount++;
      console.warn('Count-based cleanup failed:', error);
    }
  }

  async getHealth(): Promise<Partial<RotationHealth>> {
    const totalOperations = this.cleanupCount + this.errorCount;
    const successRate = totalOperations > 0 ? this.cleanupCount / totalOperations : 1.0;

    return {
      successRate,
      errorCount: this.errorCount
    };
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

  private async cleanupDirectory(directory: string): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      
      // Group files by base name to handle rotated versions
      const fileGroups = new Map<string, Array<{ name: string; stats: any }>>();
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath).catch(() => null);
        
        if (!stats || !stats.isFile()) {
          continue;
        }

        // Extract base name (remove rotation timestamp and compression extension)
        const baseName = this.extractBaseName(file);
        
        if (!fileGroups.has(baseName)) {
          fileGroups.set(baseName, []);
        }
        
        fileGroups.get(baseName)!.push({ name: file, stats });
      }

      // Clean up each file group
      for (const [baseName, groupFiles] of fileGroups) {
        if (groupFiles.length > this.config.maxFiles) {
          // Sort by modification time (oldest first)
          groupFiles.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());
          
          // Remove excess files
          const filesToRemove = groupFiles.slice(0, groupFiles.length - this.config.maxFiles);
          
          for (const fileToRemove of filesToRemove) {
            const filePath = path.join(directory, fileToRemove.name);
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup directory ${directory}:`, error);
      throw error;
    }
  }

  private extractBaseName(filename: string): string {
    // Remove rotation timestamp pattern and compression extensions
    return filename
      .replace(/\.\d{8}-\d{6}/, '') // Remove .YYYYMMDD-HHMMSS pattern
      .replace(/\.gz$/, '') // Remove .gz extension
      .replace(/\.bz2$/, '') // Remove .bz2 extension
      .replace(/\.zip$/, ''); // Remove .zip extension
  }

  getMaxFiles(): number {
    return this.config.maxFiles;
  }

  updateConfig(newConfig: Partial<CountPolicyConfig>): void {
    Object.assign(this.config, newConfig);
  }
}