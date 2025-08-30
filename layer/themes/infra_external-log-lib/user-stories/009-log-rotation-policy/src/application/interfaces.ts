/**
 * Application layer interfaces for log rotation system
 */

import { 
  RotationConfig,
  RotationHealth,
  RotationMetadata,
  RotationResult
} from '../domain/interfaces';

export interface RotationSchedulerConfig {
  checkInterval: number; // milliseconds
  maxConcurrentRotations: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface RotationConfigManagerConfig {
  configPath?: string;
  autoReload?: boolean;
  reloadInterval?: number; // milliseconds
}

export interface RotationHealthMonitorConfig {
  alertThresholds: {
    errorRate: number; // 0.0 to 1.0
    diskUsagePercent: number; // 0 to 100
    rotationLatency: number; // milliseconds
  };
  notificationConfig?: {
    webhookUrl?: string;
    emailConfig?: {
      smtp: string;
      port: number;
      username: string;
      password: string;
      to: string[];
    };
  };
}

export interface ScheduledRotationJob {
  id: string;
  filePath: string;
  schedule: string; // cron-like expression
  policyNames: string[];
  nextExecution: Date;
  lastExecution?: Date;
  lastResult?: RotationResult;
  enabled: boolean;
  retryCount: number;
}

export interface RotationAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'rotation_failed' | 'disk_full' | 'config_error' | 'performance' | 'cleanup_needed';
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
}

export interface RotationMetrics {
  timestamp: Date;
  totalRotations: number;
  successfulRotations: number;
  failedRotations: number;
  averageRotationTime: number;
  totalSpaceSaved: number;
  activeFiles: number;
  rotationsByPolicy: Record<string, number>;
  compressionEfficiency: number;
  healthStatus: string;
}

export interface IRotationScheduler {
  /**
   * Schedule a rotation job
   */
  scheduleJob(job: Omit<ScheduledRotationJob, 'id' | 'retryCount'>): Promise<string>;
  
  /**
   * Cancel a scheduled job
   */
  cancelJob(jobId: string): Promise<void>;
  
  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): Promise<ScheduledRotationJob[]>;
  
  /**
   * Get a specific job by ID
   */
  getJob(jobId: string): Promise<ScheduledRotationJob | null>;
  
  /**
   * Update an existing job
   */
  updateJob(jobId: string, updates: Partial<ScheduledRotationJob>): Promise<void>;
  
  /**
   * Process all scheduled jobs (called by scheduler)
   */
  processScheduledJobs(): Promise<RotationResult[]>;
  
  /**
   * Start the scheduler
   */
  start(): Promise<void>;
  
  /**
   * Stop the scheduler
   */
  stop(): Promise<void>;
  
  /**
   * Check if scheduler is running
   */
  isRunning(): boolean;
}

export interface IRotationConfigManager {
  /**
   * Get current configuration
   */
  getConfiguration(): Promise<RotationConfig>;
  
  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<RotationConfig>): Promise<void>;
  
  /**
   * Save configuration to file
   */
  saveConfiguration(): Promise<void>;
  
  /**
   * Load configuration from file
   */
  loadConfiguration(): Promise<void>;
  
  /**
   * Validate configuration
   */
  validateConfiguration(config: RotationConfig): Promise<string[]>;
  
  /**
   * Get configuration history
   */
  getConfigurationHistory(): Promise<{ timestamp: Date; config: RotationConfig }[]>;
  
  /**
   * Rollback to previous configuration
   */
  rollbackConfiguration(steps?: number): Promise<void>;
  
  /**
   * Subscribe to configuration changes
   */
  onConfigurationChange(callback: (config: RotationConfig) => void): void;
}

export interface IRotationHealthMonitor {
  /**
   * Get current health status
   */
  getHealth(): Promise<RotationHealth>;
  
  /**
   * Get health metrics
   */
  getMetrics(): Promise<RotationMetrics>;
  
  /**
   * Get alerts
   */
  getAlerts(since?: Date): Promise<RotationAlert[]>;
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): Promise<void>;
  
  /**
   * Clear acknowledged alerts
   */
  clearAcknowledgedAlerts(): Promise<void>;
  
  /**
   * Record a rotation event
   */
  recordRotation(result: RotationResult, metadata?: RotationMetadata): Promise<void>;
  
  /**
   * Start health monitoring
   */
  startMonitoring(): Promise<void>;
  
  /**
   * Stop health monitoring
   */
  stopMonitoring(): Promise<void>;
  
  /**
   * Check system resources
   */
  checkSystemResources(): Promise<{
    diskUsage: { used: number; available: number; total: number; percentage: number };
    memoryUsage: { used: number; total: number; percentage: number };
    cpuUsage: number;
  }>;
}

export const DEFAULT_SCHEDULER_CONFIG: RotationSchedulerConfig = {
  checkInterval: 60000, // 1 minute
  maxConcurrentRotations: 5,
  retryAttempts: 3,
  retryDelay: 30000 // 30 seconds
};

export const DEFAULT_CONFIG_MANAGER_CONFIG: RotationConfigManagerConfig = {
  configPath: undefined, // Will use default path
  autoReload: false,
  reloadInterval: 300000 // 5 minutes
};

export const DEFAULT_HEALTH_MONITOR_CONFIG: RotationHealthMonitorConfig = {
  alertThresholds: {
    errorRate: 0.1, // 10% error rate
    diskUsagePercent: 85, // 85% disk usage
    rotationLatency: 30000 // 30 seconds
  }
};