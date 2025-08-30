/**
 * Size-Based Rotation Policy Implementation
 * Rotates logs when file size exceeds configured threshold
 */

import {
  IRotationPolicy,
  SizePolicyConfig,
  FileStats,
  RotationResult,
  RotationHealth
} from './interfaces';

export class SizeBasedPolicy implements IRotationPolicy {
  public readonly name: string = 'size-based';
  public readonly config: SizePolicyConfig;
  private rotationCount: number = 0;
  private errorCount: number = 0;

  constructor(config: SizePolicyConfig) {
    this.config = { ...config };
  }

  async shouldRotate(filePath: string, stats: FileStats): Promise<boolean> {
    if (!this.config.enabled || !stats.exists) {
      return false;
    }

    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    return stats.size >= maxSizeBytes;
  }

  async rotate(filePath: string): Promise<RotationResult> {
    try {
      // Size-based policy doesn't directly rotate files
      // It's used by the main LogRotationService to determine if rotation is needed
      // This method is for policy-specific rotation logic if needed
      
      this.rotationCount++;
      
      return {
        success: true,
        originalFile: filePath,
        rotatedFile: '', // Will be set by the main service
        timestamp: new Date()
      };
    } catch (error) {
      this.errorCount++;
      
      return {
        success: false,
        originalFile: filePath,
        rotatedFile: '',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Size-based rotation failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    // Size-based policy doesn't need cleanup
    // Cleanup is handled by count and age-based policies
  }

  async getHealth(): Promise<Partial<RotationHealth>> {
    const totalOperations = this.rotationCount + this.errorCount;
    const successRate = totalOperations > 0 ? this.rotationCount / totalOperations : 1.0;

    return {
      successRate,
      errorCount: this.errorCount
    };
  }

  /**
   * Get the maximum file size in bytes
   */
  getMaxSizeBytes(): number {
    return this.config.maxSizeMB * 1024 * 1024;
  }

  /**
   * Check if compression is enabled for this policy
   */
  isCompressionEnabled(): boolean {
    return this.config.enableCompression;
  }

  /**
   * Update policy configuration
   */
  updateConfig(newConfig: Partial<SizePolicyConfig>): void {
    Object.assign(this.config, newConfig);
  }
}