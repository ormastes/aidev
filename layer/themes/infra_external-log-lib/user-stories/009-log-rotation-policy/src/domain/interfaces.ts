/**
 * Domain interfaces for log rotation policy system
 */

export interface RotationConfig {
  sizePolicy: SizePolicyConfig;
  timePolicy: TimePolicyConfig;
  countPolicy: CountPolicyConfig;
  agePolicy: AgePolicyConfig;
  compression: CompressionConfig;
}

export interface SizePolicyConfig {
  enabled: boolean;
  maxSizeMB: number;
  enableCompression: boolean;
}

export interface TimePolicyConfig {
  enabled: boolean;
  schedule: 'daily' | 'weekly' | 'monthly';
  rotationTime: string; // HH:MM format
  timezone?: string;
}

export interface CountPolicyConfig {
  enabled: boolean;
  maxFiles: number;
  cleanupOnRotation: boolean;
}

export interface AgePolicyConfig {
  enabled: boolean;
  maxAgeDays: number;
  cleanupSchedule: 'daily' | 'weekly';
}

export interface CompressionConfig {
  level: number; // 1-9
  enabled: boolean;
  verifyIntegrity: boolean;
}

export interface RotationResult {
  success: boolean;
  originalFile: string;
  rotatedFile: string;
  compressedFile?: string;
  compressionRatio?: number;
  timestamp: Date;
  error?: string;
}

export interface RotationMetadata {
  id: string;
  originalFile: string;
  rotatedFile: string;
  compressedFile?: string;
  rotationTimestamp: Date;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  logDateRange: {
    start: Date;
    end: Date;
  };
  policyApplied: string[];
  metadata: Record<string, any>;
}

export interface RotationIndex {
  indexVersion: string;
  lastUpdated: Date;
  rotatedFiles: RotationMetadata[];
  statistics: {
    totalFiles: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
  };
}

export interface RotationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastRotation: Date | null;
  successRate: number;
  errorCount: number;
  policiesActive: string[];
  storageMetrics: {
    usedSpace: number;
    availableSpace: number;
    compressionSavings: number;
  };
}

export interface IRotationPolicy {
  readonly name: string;
  readonly config: any;
  
  shouldRotate(filePath: string, stats: FileStats): Promise<boolean>;
  rotate(filePath: string): Promise<RotationResult>;
  cleanup(): Promise<void>;
  getHealth(): Promise<Partial<RotationHealth>>;
}

export interface ILogRotationService {
  addPolicy(policy: IRotationPolicy): void;
  removePolicy(policyName: string): void;
  checkRotation(filePath: string): Promise<boolean>;
  performRotation(filePath: string): Promise<RotationResult>;
  scheduleRotation(filePath: string, schedule: string): Promise<void>;
  getRotationHistory(filePath: string): Promise<RotationMetadata[]>;
  getHealth(): Promise<RotationHealth>;
  cleanup(): Promise<void>;
}

export interface IRotationIndex {
  addRotation(metadata: RotationMetadata): Promise<void>;
  removeRotation(id: string): Promise<void>;
  findRotations(query: RotationQuery): Promise<RotationMetadata[]>;
  getStatistics(): Promise<RotationIndex['statistics']>;
  getIndex(): Promise<RotationIndex>;
  updateIndex(index: RotationIndex): Promise<void>;
}

export interface RotationQuery {
  originalFile?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  policies?: string[];
  compressed?: boolean;
  limit?: number;
  offset?: number;
}

export interface FileStats {
  size: number;
  mtime: Date;
  ctime: Date;
  exists: boolean;
}

export interface ICompressionManager {
  compress(inputPath: string, outputPath: string, level?: number): Promise<CompressionResult>;
  decompress(inputPath: string, outputPath: string): Promise<void>;
  verifyIntegrity(compressedPath: string, originalChecksum?: string): Promise<boolean>;
  getCompressionRatio(originalSize: number, compressedSize: number): number;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  checksum: string;
}

export interface IStorageMetrics {
  getDiskUsage(path: string): Promise<{ used: number; available: number; total: number }>;
  calculateCompressionSavings(rotatedFiles: RotationMetadata[]): number;
  monitorStorageHealth(): Promise<{ status: string; metrics: any }>;
}

export interface ScheduledRotation {
  id: string;
  filePath: string;
  schedule: string;
  nextRotation: Date;
  policy: string;
  active: boolean;
}

export interface IRotationScheduler {
  scheduleRotation(rotation: Omit<ScheduledRotation, 'id'>): Promise<string>;
  cancelRotation(id: string): Promise<void>;
  getScheduledRotations(): Promise<ScheduledRotation[]>;
  processScheduledRotations(): Promise<RotationResult[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  sizePolicy: {
    enabled: true,
    maxSizeMB: 100,
    enableCompression: true
  },
  timePolicy: {
    enabled: false,
    schedule: 'daily',
    rotationTime: '00:00',
    timezone: 'UTC'
  },
  countPolicy: {
    enabled: true,
    maxFiles: 10,
    cleanupOnRotation: true
  },
  agePolicy: {
    enabled: true,
    maxAgeDays: 30,
    cleanupSchedule: 'daily'
  },
  compression: {
    level: 6,
    enabled: true,
    verifyIntegrity: true
  }
};