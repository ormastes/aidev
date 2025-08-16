/**
 * Centralized log directory configuration for external-log-lib
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Get the default log directory based on environment
 * In production, uses gen/logs
 * In development/test, uses temp directory
 */
export function getDefaultLogDirectory(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  
  if (isTest) {
    // Use temp directory for tests to avoid polluting project
    return path.join(os.tmpdir(), 'external-log-lib', 'logs');
  }
  
  // Use gen/logs for production and development
  // This ensures logs are centralized and organized
  return path.join(process.cwd(), 'gen', 'logs');
}

/**
 * Log configuration interface
 */
export interface LogConfig {
  baseLogDir: string;
  enableRotation: boolean;
  maxLogSize: number; // in MB
  maxLogAge: number; // in days
  compressionEnabled: boolean;
}

/**
 * Default log configuration
 */
export const DEFAULT_LOG_CONFIG: LogConfig = {
  baseLogDir: getDefaultLogDirectory(),
  enableRotation: true,
  maxLogSize: 10, // 10MB
  maxLogAge: 30, // 30 days
  compressionEnabled: true
};

/**
 * Get log subdirectory for specific log type
 */
export function getLogSubdirectory(logType: 'events' | 'violations' | 'audit' | 'security' | 'general'): string {
  const baseDir = getDefaultLogDirectory();
  
  switch (logType) {
    case 'events':
      return path.join(baseDir, 'events');
    case 'violations':
      return path.join(baseDir, 'violations');
    case 'audit':
      return path.join(baseDir, 'audit');
    case 'security':
      return path.join(baseDir, 'security');
    case 'general':
    default:
      return baseDir;
  }
}

/**
 * Environment-specific log file naming
 */
export function getLogFileName(prefix: string, extension: string = 'log'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const env = process.env.NODE_ENV || 'development';
  
  return `${prefix}-${env}-${timestamp}.${extension}`;
}