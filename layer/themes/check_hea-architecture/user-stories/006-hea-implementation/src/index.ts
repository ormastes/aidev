/**
 * Hierarchical Encapsulation Architecture (HEA) Implementation
 * 
 * This module provides the core implementation of HEA pattern
 * for the AI Development Platform.
 */

// Export interfaces
export * from './interfaces/layer';
export * from './interfaces/pipe';

// Export core implementations
export { LayerValidator } from './core/layer-validator';
export { createPipeBuilder, PipeValidationError } from './core/pipe-builder';
export { PipeRegistryImpl, globalPipeRegistry, RegisterPipe } from './core/pipe-registry';

// Export utilities
export * from './utils/dependency-graph';
export * from './utils/dependency-graph-advanced';
export * from './utils/module-analyzer';

// Re-export types for convenience
export type {
  LayerType,
  LayerConfig,
  LayerMetadata,
  ModuleInfo,
  PipeInfo,
  DependencyInfo,
  DependencyType,
} from './interfaces/layer';

export type {
  Pipe,
  PipeMetadata,
  PipeRegistry,
  PipeBuilder,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './interfaces/pipe';