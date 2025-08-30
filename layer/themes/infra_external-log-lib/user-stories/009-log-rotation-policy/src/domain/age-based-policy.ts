/**
 * Age-Based Rotation Policy Implementation
 * Removes logs older than configured age threshold
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  IRotationPolicy,
  AgePolicyConfig,
  FileStats,
  RotationResult,
  RotationHealth
} from './interfaces';

export class AgeBasedPolicy implements IRotationPolicy {
  public readonly name: string = 'age-based';
  public readonly config: AgePolicyConfig;
  private cleanupCount: number = 0;
  private errorCount: number = 0;
  private lastCleanup: Date | null = null;

  constructor(config: AgePolicyConfig) {
    this.config = { ...config };
  }

  async shouldRotate(filePath: string, stats: FileStats): Promise<boolean> {
    if (!this.config.enabled || !stats.exists) {
      return false;
    }

    // Age-based policy doesn't trigger rotation itself
    // It performs cleanup of old files
    return false;
  }

  async rotate(filePath: string): Promise<RotationResult> {
    // Age-based policy handles cleanup, not rotation triggering
    return {
      success: true,
      originalFile: filePath,
      rotatedFile: '',
      timestamp: new Date()
    };
  }

  async cleanup(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAgeDays);

      // Find all log directories
      const logDirectories = await this.getLogDirectories();
      
      for (const logDir of logDirectories) {
        await this.cleanupOldFiles(logDir, cutoffDate);
      }
      
      this.cleanupCount++;
      this.lastCleanup = new Date();
    } catch (error) {
      this.errorCount++;
      console.warn('Age-based cleanup failed:', error);
    }
  }

  async getHealth(): Promise<Partial<RotationHealth>> {
    const totalOperations = this.cleanupCount + this.errorCount;
    const successRate = totalOperations > 0 ? this.cleanupCount / totalOperations : 1.0;

    return {
      successRate,
      errorCount: this.errorCount,
      lastRotation: this.lastCleanup
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

  private async cleanupOldFiles(directory: string, cutoffDate: Date): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          if (!stats.isFile()) {
            continue;
          }

          // Check if file is older than cutoff date
          if (stats.mtime < cutoffDate) {
            // Additional check: only remove files that look like rotated logs
            if (this.isRotatedLogFile(file)) {
              await fs.unlink(filePath);
              console.log(`Removed old log file: ${filePath}`);
            }
          }
        } catch (error) {
          console.warn(`Could not check file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup old files in ${directory}:`, error);
      throw error;
    }
  }

  private isRotatedLogFile(filename: string): boolean {
    // Check if filename matches rotated log patterns
    const rotatedPatterns = [
      /\.\d{8}-\d{6}\.log$/, // .YYYYMMDD-HHMMSS.log
      /\.log\.\d{8}-\d{6}$/, // .log.YYYYMMDD-HHMMSS
      /\.log\.gz$/, // .log.gz
      /\.log\.\d+$/, // .log.1, .log.2, etc.
      /\.log\.\d{4}-\d{2}-\d{2}/, // .log.YYYY-MM-DD
    ];

    return rotatedPatterns.some(pattern => pattern.test(filename));
  }

  shouldCleanupNow(): boolean {
    if (!this.lastCleanup) {
      return true;
    }

    const timeSinceLastCleanup = Date.now() - this.lastCleanup.getTime();
    const cleanupInterval = this.getCleanupInterval();

    return timeSinceLastCleanup >= cleanupInterval;
  }

  private getCleanupInterval(): number {
    switch (this.config.cleanupSchedule) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  getMaxAgeDays(): number {
    return this.config.maxAgeDays;
  }

  updateConfig(newConfig: Partial<AgePolicyConfig>): void {
    Object.assign(this.config, newConfig);
  }
}