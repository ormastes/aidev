/**
 * Time-Based Rotation Policy Implementation
 * Rotates logs on configurable schedule (daily/weekly/monthly)
 */

import {
  IRotationPolicy,
  TimePolicyConfig,
  FileStats,
  RotationResult,
  RotationHealth
} from './interfaces';

export class TimeBasedPolicy implements IRotationPolicy {
  public readonly name: string = 'time-based';
  public readonly config: TimePolicyConfig;
  private rotationCount: number = 0;
  private errorCount: number = 0;
  private lastRotationTime: Date | null = null;

  constructor(config: TimePolicyConfig) {
    this.config = { ...config };
  }

  async shouldRotate(filePath: string, stats: FileStats): Promise<boolean> {
    if (!this.config.enabled || !stats.exists) {
      return false;
    }

    const now = new Date();
    const shouldRotateTime = this.calculateNextRotationTime(this.lastRotationTime || stats.ctime);
    
    return now >= shouldRotateTime;
  }

  async rotate(filePath: string): Promise<RotationResult> {
    try {
      this.rotationCount++;
      this.lastRotationTime = new Date();
      
      return {
        success: true,
        originalFile: filePath,
        rotatedFile: '',
        timestamp: new Date()
      };
    } catch (error) {
      this.errorCount++;
      
      return {
        success: false,
        originalFile: filePath,
        rotatedFile: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Time-based rotation failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    // Time-based policy doesn't need cleanup
  }

  async getHealth(): Promise<Partial<RotationHealth>> {
    const totalOperations = this.rotationCount + this.errorCount;
    const successRate = totalOperations > 0 ? this.rotationCount / totalOperations : 1.0;

    return {
      successRate,
      errorCount: this.errorCount,
      lastRotation: this.lastRotationTime
    };
  }

  private calculateNextRotationTime(baseTime: Date): Date {
    const next = new Date(baseTime);
    const [hours, minutes] = this.config.rotationTime.split(':').map(Number);

    switch (this.config.schedule) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    next.setHours(hours, minutes, 0, 0);
    return next;
  }

  getNextRotationTime(): Date | null {
    if (!this.lastRotationTime) {
      return null;
    }
    return this.calculateNextRotationTime(this.lastRotationTime);
  }
}