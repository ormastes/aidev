/**
 * Log Rotation Policy Pipe - HEA Gateway
 * Public API for log rotation system following Hierarchical Encapsulation Architecture
 */

// Re-export domain interfaces and types
export {
  // Core interfaces
  ILogRotationService,
  IRotationPolicy,
  IRotationIndex,
  ICompressionManager,
  IStorageMetrics,
  IRotationScheduler,
  
  // Configuration types
  RotationConfig,
  SizePolicyConfig,
  TimePolicyConfig,
  CountPolicyConfig,
  AgePolicyConfig,
  CompressionConfig,
  
  // Data types
  RotationResult,
  RotationMetadata,
  RotationIndex,
  RotationHealth,
  RotationQuery,
  ScheduledRotation,
  FileStats,
  CompressionResult,
  
  // Constants
  DEFAULT_ROTATION_CONFIG
} from '../domain/interfaces';

// Re-export main service classes
export { LogRotationService } from '../domain/log-rotation-service';
export { RotationIndex as RotationIndexImpl } from '../domain/rotation-index';

// Re-export policy implementations
export { SizeBasedPolicy } from '../domain/size-based-policy';
export { TimeBasedPolicy } from '../domain/time-based-policy';
export { CountBasedPolicy } from '../domain/count-based-policy';
export { AgeBasedPolicy } from '../domain/age-based-policy';

// Re-export external services
export { CompressionManager } from '../external/compression-manager';
export { StorageMetrics } from '../external/storage-metrics';

// Re-export application services
export { 
  RotationIntegration,
  createRotationIntegration,
  attachRotationToCentralizedLogService
} from '../application/rotation-integration';
export type { 
  RotationIntegrationConfig,
  LogFileInfo
} from '../application/rotation-integration';

// Factory functions for easy instantiation
import { LogRotationService } from '../domain/log-rotation-service';
import { RotationIndex } from '../domain/rotation-index';
import { CompressionManager } from '../external/compression-manager';
import { StorageMetrics } from '../external/storage-metrics';
import { 
  RotationConfig, 
  DEFAULT_ROTATION_CONFIG,
  ILogRotationService 
} from '../domain/interfaces';
import * as path from 'node:path';

/**
 * Create a new LogRotationService with default configuration
 */
export function createLogRotationService(config?: Partial<RotationConfig>): ILogRotationService {
  const fullConfig = { ...DEFAULT_ROTATION_CONFIG, ...config };
  const indexPath = path.join(process.cwd(), 'gen', 'logs', 'rotation-index.json');
  const rotationIndex = new RotationIndex(indexPath);
  
  return new LogRotationService(fullConfig, rotationIndex);
}

/**
 * Create a LogRotationService with custom index path
 */
export function createLogRotationServiceWithIndex(
  indexPath: string,
  config?: Partial<RotationConfig>
): ILogRotationService {
  const fullConfig = { ...DEFAULT_ROTATION_CONFIG, ...config };
  const rotationIndex = new RotationIndex(indexPath);
  
  return new LogRotationService(fullConfig, rotationIndex);
}

/**
 * Create a CompressionManager instance
 */
export function createCompressionManager(): CompressionManager {
  return new CompressionManager();
}

/**
 * Create a StorageMetrics instance
 */
export function createStorageMetrics(): StorageMetrics {
  return new StorageMetrics();
}

/**
 * Integration helper for centralized log service
 * This function integrates the rotation system with the existing centralized log service
 */
export async function integrateWithCentralizedLogService(
  centralizedLogService: any, // Import from ../008-centralized-log-service/src/pipe/index
  rotationConfig?: Partial<RotationConfig>
): Promise<ILogRotationService> {
  const rotationService = createLogRotationService(rotationConfig);
  
  // Set up automatic rotation checking for managed log files
  if (centralizedLogService && typeof centralizedLogService.onLogAdd === 'function') {
    centralizedLogService.onLogAdd(async (logEntry: any) => {
      // Extract file path from log entry if available
      if (logEntry.filePath) {
        const shouldRotate = await rotationService.checkRotation(logEntry.filePath);
        if (shouldRotate) {
          await rotationService.performRotation(logEntry.filePath);
        }
      }
    });
  }
  
  return rotationService;
}

/**
 * Enhanced integration helper using the RotationIntegration class
 * Provides better management and monitoring capabilities
 */
export async function createEnhancedLogRotationIntegration(
  centralizedLogService: any,
  integrationConfig?: RotationIntegrationConfig
): Promise<{ rotationService: ILogRotationService; integration: any }> {
  const { RotationIntegration } = require('../application/rotation-integration');
  const integration = new RotationIntegration(integrationConfig);
  
  // Set up callback with centralized log service
  if (centralizedLogService && typeof centralizedLogService.onLogAdd === 'function') {
    centralizedLogService.onLogAdd(async (logEntry: any) => {
      await integration.onLogAdd(logEntry);
    });
  }
  
  await integration.startAutoRotation();
  
  return {
    rotationService: integration['rotationService'], // Access private member for interface compatibility
    integration: integration
  };
}

/**
 * Utility function to get system log directories
 */
export function getSystemLogDirectories(): string[] {
  return [
    path.join(process.cwd(), 'gen', 'logs'),
    path.join(process.cwd(), 'logs'),
    '/var/log',
    '/tmp/logs'
  ];
}

/**
 * Utility function to create rotation configuration for common scenarios
 */
export const RotationConfigPresets = {
  /**
   * Configuration for development environment
   */
  development: (): RotationConfig => ({
    sizePolicy: {
      enabled: true,
      maxSizeMB: 50,
      enableCompression: true
    },
    timePolicy: {
      enabled: false,
      schedule: 'daily',
      rotationTime: '00:00'
    },
    countPolicy: {
      enabled: true,
      maxFiles: 20,
      cleanupOnRotation: true
    },
    agePolicy: {
      enabled: true,
      maxAgeDays: 7,
      cleanupSchedule: 'daily'
    },
    compression: {
      level: 6,
      enabled: true,
      verifyIntegrity: false // Disable for development speed
    }
  }),

  /**
   * Configuration for production environment
   */
  production: (): RotationConfig => ({
    sizePolicy: {
      enabled: true,
      maxSizeMB: 100,
      enableCompression: true
    },
    timePolicy: {
      enabled: true,
      schedule: 'daily',
      rotationTime: '02:00' // 2 AM rotation
    },
    countPolicy: {
      enabled: true,
      maxFiles: 30,
      cleanupOnRotation: true
    },
    agePolicy: {
      enabled: true,
      maxAgeDays: 90,
      cleanupSchedule: 'weekly'
    },
    compression: {
      level: 9, // Maximum compression for production
      enabled: true,
      verifyIntegrity: true
    }
  }),

  /**
   * Configuration for high-volume logging scenarios
   */
  highVolume: (): RotationConfig => ({
    sizePolicy: {
      enabled: true,
      maxSizeMB: 500, // Larger files before rotation
      enableCompression: true
    },
    timePolicy: {
      enabled: true,
      schedule: 'daily',
      rotationTime: '03:00'
    },
    countPolicy: {
      enabled: true,
      maxFiles: 50,
      cleanupOnRotation: true
    },
    agePolicy: {
      enabled: true,
      maxAgeDays: 30, // Shorter retention for high volume
      cleanupSchedule: 'daily'
    },
    compression: {
      level: 3, // Faster compression for high volume
      enabled: true,
      verifyIntegrity: false
    }
  }),

  /**
   * Configuration for testing environment
   */
  testing: (): RotationConfig => ({
    sizePolicy: {
      enabled: true,
      maxSizeMB: 1, // Small files for testing
      enableCompression: false
    },
    timePolicy: {
      enabled: false,
      schedule: 'daily',
      rotationTime: '00:00'
    },
    countPolicy: {
      enabled: true,
      maxFiles: 5,
      cleanupOnRotation: true
    },
    agePolicy: {
      enabled: true,
      maxAgeDays: 1, // Very short retention for tests
      cleanupSchedule: 'daily'
    },
    compression: {
      level: 1,
      enabled: false, // Disable for test speed
      verifyIntegrity: false
    }
  })
};

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Log rotation system metadata
 */
export const ROTATION_SYSTEM_INFO = {
  name: 'AI Development Platform Log Rotation System',
  version: VERSION,
  description: 'Comprehensive log rotation with size, time, count, and age-based policies',
  features: [
    'Size-based rotation',
    'Time-based rotation',
    'Count-based cleanup',
    'Age-based cleanup',
    'Gzip compression',
    'Searchable index',
    'Health monitoring',
    'HEA compliance'
  ]
} as const;