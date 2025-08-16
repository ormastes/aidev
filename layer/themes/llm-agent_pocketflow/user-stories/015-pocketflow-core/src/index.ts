/**
 * PocketFlow - Minimalist LLM Framework
 * Zero bloat, zero dependencies, zero vendor lock-in
 */

export * from './types';
export * from './core';
export * from './nodes';

// Re-export main class for convenience
export { PocketFlow } from './core';

// Version info
export const VERSION = '1.0.0';
export const PHILOSOPHY = 'Zero bloat, zero dependencies, zero vendor lock-in';