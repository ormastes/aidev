/**
 * PocketFlow Workflow Patterns
 * High-level patterns for multi-agent coordination
 */

export * from './types';
export * from './base-pattern';
export * from './patterns';
export * from './registry';

// Re-export for convenience
export { PatternRegistry } from './registry';

// Pattern list
export const PATTERNS = {
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  MAP_REDUCE: 'map-reduce',
  SUPERVISOR: 'supervisor',
  RAG: 'rag',
  DEBATE: 'debate',
  REFLECTION: 'reflection'
} as const;

export type PatternName = typeof PATTERNS[keyof typeof PATTERNS];