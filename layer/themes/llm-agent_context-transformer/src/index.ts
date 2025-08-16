export { ContextAnalyzer, ContextMetrics, ContextSegment, AnalysisResult } from './core/ContextAnalyzer';
export { ContextOptimizer, OptimizationStrategy, OptimizationConfig, OptimizationResult } from './core/ContextOptimizer';
export { ContextCache, CacheEntry, CacheConfig, CacheStats } from './core/ContextCache';
export { ContextTransformer, TransformationConfig, TransformationResult, TransformationStats } from './core/ContextTransformer';

// Re-export main class as default
import { ContextTransformer } from './core/ContextTransformer';
export default ContextTransformer;