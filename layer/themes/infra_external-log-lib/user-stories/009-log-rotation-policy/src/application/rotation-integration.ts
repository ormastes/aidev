/**
 * Integration between Log Rotation System and Centralized Log Service
 * Provides seamless rotation management for centralized logging
 */

import { 
  ILogRotationService,
  RotationConfig,
  RotationResult,
  RotationHealth
} from '../domain/interfaces';
import { LogRotationService } from '../domain/log-rotation-service';
import { RotationIndex } from '../domain/rotation-index';

export interface RotationIntegrationConfig {
  rotationConfig?: Partial<RotationConfig>;
  indexPath?: string;
  autoRotationEnabled?: boolean;
  rotationCheckInterval?: number; // milliseconds
}

export interface LogFileInfo {
  filePath: string;
  lastChecked: Date;
  size: number;
  rotationRequired: boolean;
}

export class RotationIntegration {
  private readonly rotationService: ILogRotationService;
  private readonly config: Required<RotationIntegrationConfig>;
  private readonly managedFiles: Map<string, LogFileInfo> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: RotationIntegrationConfig = {}) {
    this.config = {
      rotationConfig: config.rotationConfig || {},
      indexPath: config.indexPath || this.getDefaultIndexPath(),
      autoRotationEnabled: config.autoRotationEnabled ?? true,
      rotationCheckInterval: config.rotationCheckInterval || 60000 // 1 minute
    };

    // Initialize rotation service
    const rotationIndex = new RotationIndex(this.config.indexPath);
    this.rotationService = new LogRotationService(
      this.config.rotationConfig as RotationConfig,
      rotationIndex
    );
  }

  /**
   * Register a log file for rotation monitoring
   */
  async registerLogFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(filePath);
      
      const logFileInfo: LogFileInfo = {
        filePath,
        lastChecked: new Date(),
        size: stats.size,
        rotationRequired: await this.rotationService.checkRotation(filePath)
      };

      this.managedFiles.set(filePath, logFileInfo);
    } catch (error) {
      console.warn(`Could not register log file ${filePath}:`, error);
    }
  }

  /**
   * Unregister a log file from rotation monitoring
   */
  unregisterLogFile(filePath: string): void {
    this.managedFiles.delete(filePath);
  }

  /**
   * Get list of registered log files
   */
  getRegisteredFiles(): string[] {
    return Array.from(this.managedFiles.keys());
  }

  /**
   * Check if rotation is required for a specific file
   */
  async checkFileRotation(filePath: string): Promise<boolean> {
    return await this.rotationService.checkRotation(filePath);
  }

  /**
   * Manually trigger rotation for a specific file
   */
  async rotateFile(filePath: string): Promise<RotationResult> {
    const result = await this.rotationService.performRotation(filePath);
    
    // Update managed file info if it exists
    if (this.managedFiles.has(filePath)) {
      const fileInfo = this.managedFiles.get(filePath)!;
      fileInfo.lastChecked = new Date();
      fileInfo.rotationRequired = false;
      fileInfo.size = 0; // File should be empty after rotation
    }
    
    return result;
  }

  /**
   * Start automatic rotation monitoring
   */
  async startAutoRotation(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    if (this.config.autoRotationEnabled) {
      this.intervalId = setInterval(async () => {
        await this.performScheduledRotationCheck();
      }, this.config.rotationCheckInterval);
    }
  }

  /**
   * Stop automatic rotation monitoring
   */
  async stopAutoRotation(): Promise<void> {
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get rotation health status
   */
  async getRotationHealth(): Promise<RotationHealth> {
    return await this.rotationService.getHealth();
  }

  /**
   * Get rotation history for a file
   */
  async getFileRotationHistory(filePath: string) {
    return await this.rotationService.getRotationHistory(filePath);
  }

  /**
   * Update rotation configuration at runtime
   */
  async updateRotationConfig(newConfig: Partial<RotationConfig>): Promise<void> {
    await this.rotationService.updateConfiguration({
      ...this.config.rotationConfig,
      ...newConfig
    } as RotationConfig);
    
    Object.assign(this.config.rotationConfig, newConfig);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stopAutoRotation();
    await this.rotationService.cleanup();
    this.managedFiles.clear();
  }

  /**
   * Integration callback for centralized log service
   * Call this when logs are added to check if rotation is needed
   */
  async onLogAdd(logEntry: any): Promise<void> {
    if (!logEntry.filePath) {
      return;
    }

    const filePath = logEntry.filePath;
    
    // Register file if not already managed
    if (!this.managedFiles.has(filePath)) {
      await this.registerLogFile(filePath);
    }

    // Update file info
    const fileInfo = this.managedFiles.get(filePath);
    if (fileInfo) {
      fileInfo.lastChecked = new Date();
      
      // Check if rotation is needed
      const rotationRequired = await this.rotationService.checkRotation(filePath);
      fileInfo.rotationRequired = rotationRequired;
      
      // Perform rotation if needed and auto-rotation is enabled
      if (rotationRequired && this.config.autoRotationEnabled) {
        await this.rotateFile(filePath);
      }
    }
  }

  /**
   * Get statistics about managed files
   */
  async getManagedFilesStats(): Promise<{
    totalFiles: number;
    filesRequiringRotation: number;
    totalSize: number;
    lastCheckTime: Date | null;
  }> {
    const stats = {
      totalFiles: this.managedFiles.size,
      filesRequiringRotation: 0,
      totalSize: 0,
      lastCheckTime: null as Date | null
    };

    let latestCheck: Date | null = null;
    
    for (const [filePath, fileInfo] of this.managedFiles) {
      if (fileInfo.rotationRequired) {
        stats.filesRequiringRotation++;
      }
      
      stats.totalSize += fileInfo.size;
      
      if (!latestCheck || fileInfo.lastChecked > latestCheck) {
        latestCheck = fileInfo.lastChecked;
      }
    }
    
    stats.lastCheckTime = latestCheck;
    return stats;
  }

  private async performScheduledRotationCheck(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const promises: Promise<void>[] = [];
      
      for (const [filePath, fileInfo] of this.managedFiles) {
        promises.push(this.checkAndRotateFile(filePath, fileInfo));
      }
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error during scheduled rotation check:', error);
    }
  }

  private async checkAndRotateFile(filePath: string, fileInfo: LogFileInfo): Promise<void> {
    try {
      const rotationRequired = await this.rotationService.checkRotation(filePath);
      fileInfo.lastChecked = new Date();
      fileInfo.rotationRequired = rotationRequired;
      
      if (rotationRequired) {
        await this.rotateFile(filePath);
      }
      
      // Update file size
      const fs = require('fs').promises;
      try {
        const stats = await fs.stat(filePath);
        fileInfo.size = stats.size;
      } catch {
        // File might not exist, set size to 0
        fileInfo.size = 0;
      }
    } catch (error) {
      console.warn(`Error checking rotation for ${filePath}:`, error);
    }
  }

  private getDefaultIndexPath(): string {
    const path = require('path');
    return path.join(process.cwd(), 'gen', 'logs', 'rotation-index.json');
  }
}

/**
 * Factory function to create rotation integration with centralized log service
 */
export function createRotationIntegration(
  config?: RotationIntegrationConfig
): RotationIntegration {
  return new RotationIntegration(config);
}

/**
 * Helper function to integrate with an existing centralized log service
 */
export async function attachRotationToCentralizedLogService(
  centralizedLogService: any,
  rotationConfig?: RotationIntegrationConfig
): Promise<RotationIntegration> {
  const integration = createRotationIntegration(rotationConfig);
  
  // Try to attach the onLogAdd callback if the service supports it
  if (centralizedLogService && typeof centralizedLogService.addLogCallback === 'function') {
    centralizedLogService.addLogCallback((logEntry: any) => {
      integration.onLogAdd(logEntry).catch(error => {
        console.warn('Rotation integration callback error:', error);
      });
    });
  }
  
  await integration.startAutoRotation();
  return integration;
}