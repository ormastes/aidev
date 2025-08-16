/**
 * Batch Processing Module
 * Export all batch processing components
 */

export { BatchProcessor } from './BatchProcessor';
export { ProgressReporter } from './ProgressReporter';
export { ErrorHandler } from './ErrorHandler';
export { PartialGenerator } from './PartialGenerator';

// Export types
export type {
  BatchOptions,
  BatchProgress,
  BatchError,
  BatchResult,
  ThemeResult
} from './BatchProcessor';

export type {
  ProgressUpdate,
  ProgressStatistics,
  ReporterOptions
} from './ProgressReporter';

export type {
  ProcessingError,
  ErrorHandlingOptions,
  ErrorStatistics,
  RecoveryStrategy
} from './ErrorHandler';

export type {
  PartialGenerationOptions,
  PartialGenerationResult,
  DiffResult,
  UpdateStrategy
} from './PartialGenerator';