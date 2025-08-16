import { EventEmitter } from '../../../infra_external-log-lib/src';
import { ContextAnalyzer, AnalysisResult, ContextSegment } from './ContextAnalyzer';
import { ContextOptimizer, OptimizationResult, OptimizationConfig } from './ContextOptimizer';
import { ContextCache, CacheConfig } from './ContextCache';

export interface TransformationConfig {
  enableCache: boolean;
  enableOptimization: boolean;
  enableAnalysis: boolean;
  cacheConfig?: Partial<CacheConfig>;
  optimizationConfig?: Partial<OptimizationConfig>;
  autoOptimizeThreshold: number; // Optimize if context exceeds this size
}

export interface TransformationResult {
  original: string | Record<string, any>;
  transformed: string;
  analysis?: AnalysisResult;
  optimization?: OptimizationResult;
  fromCache: boolean;
  transformationTime: number;
}

export interface TransformationStats {
  totalTransformations: number;
  cachedTransformations: number;
  optimizedTransformations: number;
  averageReduction: number;
  averageTime: number;
}

export class ContextTransformer extends EventEmitter {
  private analyzer: ContextAnalyzer;
  private optimizer: ContextOptimizer;
  private cache: ContextCache;
  private config: TransformationConfig;
  private stats: TransformationStats;

  constructor(config: Partial<TransformationConfig> = {}) {
    super();
    
    this.config = {
      enableCache: config.enableCache ?? true,
      enableOptimization: config.enableOptimization ?? true,
      enableAnalysis: config.enableAnalysis ?? true,
      cacheConfig: config.cacheConfig,
      optimizationConfig: config.optimizationConfig,
      autoOptimizeThreshold: config.autoOptimizeThreshold || 50000
    };

    this.analyzer = new ContextAnalyzer();
    this.optimizer = new ContextOptimizer(this.config.optimizationConfig);
    this.cache = new ContextCache(this.config.cacheConfig);

    this.stats = {
      totalTransformations: 0,
      cachedTransformations: 0,
      optimizedTransformations: 0,
      averageReduction: 0,
      averageTime: 0
    };

    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    // Forward events from sub-components
    this.analyzer.on('analysis:complete', (result) => {
      this.emit('analysis:complete', result);
    });

    this.optimizer.on('optimization:complete', (result) => {
      this.emit('optimization:complete', result);
    });

    this.cache.on('cache:hit', (data) => {
      this.emit('cache:hit', data);
    });

    this.cache.on('cache:miss', (data) => {
      this.emit('cache:miss', data);
    });
  }

  async transform(context: string | Record<string, any>): Promise<TransformationResult> {
    const startTime = Date.now();
    this.emit('transformation:start', { context });
    
    this.stats.totalTransformations++;

    // Generate cache key
    const cacheKey = this.cache.generateKey(context);

    // Check cache first
    if (this.config.enableCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.stats.cachedTransformations++;
        
        const result: TransformationResult = {
          original: context,
          transformed: this.segmentsToString(cached.optimizedSegments || []),
          analysis: undefined,
          optimization: cached.optimizationResult,
          fromCache: true,
          transformationTime: Date.now() - startTime
        };
        
        this.updateStats(result);
        this.emit('transformation:complete', result);
        return result;
      }
    }

    // Perform analysis if enabled
    let analysis: AnalysisResult | undefined;
    if (this.config.enableAnalysis) {
      analysis = await this.analyzer.analyze(context);
    }

    // Determine if optimization is needed
    const contextSize = this.calculateContextSize(context);
    const needsOptimization = this.config.enableOptimization && 
                             (contextSize > this.config.autoOptimizeThreshold ||
                              (analysis && analysis.optimizationPotential > 0.3));

    let transformed: string;
    let optimization: OptimizationResult | undefined;

    if (needsOptimization) {
      optimization = await this.optimizer.optimize(context);
      transformed = this.segmentsToString(optimization.optimizedSegments);
      this.stats.optimizedTransformations++;
      
      // Cache the optimized result
      if (this.config.enableCache) {
        await this.cache.set(cacheKey, context, optimization.optimizedSegments, optimization);
      }
    } else {
      // Just convert to string without optimization
      transformed = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
      
      // Cache the unoptimized result
      if (this.config.enableCache && analysis) {
        await this.cache.set(cacheKey, context, analysis.segments);
      }
    }

    const result: TransformationResult = {
      original: context,
      transformed,
      analysis,
      optimization,
      fromCache: false,
      transformationTime: Date.now() - startTime
    };

    this.updateStats(result);
    this.emit('transformation:complete', result);
    return result;
  }

  async batchTransform(contexts: Array<string | Record<string, any>>): Promise<TransformationResult[]> {
    this.emit('batch:start', { count: contexts.length });
    
    const results: TransformationResult[] = [];
    
    for (let i = 0; i < contexts.length; i++) {
      const result = await this.transform(contexts[i]);
      results.push(result);
      
      this.emit('batch:progress', { 
        current: i + 1, 
        total: contexts.length,
        percentage: ((i + 1) / contexts.length) * 100
      });
    }
    
    this.emit('batch:complete', { count: contexts.length });
    return results;
  }

  async analyzeContext(context: string | Record<string, any>): Promise<AnalysisResult> {
    return this.analyzer.analyze(context);
  }

  async optimizeContext(context: string | Record<string, any>): Promise<OptimizationResult> {
    return this.optimizer.optimize(context);
  }

  private segmentsToString(segments: ContextSegment[]): string {
    return segments
      .map(seg => {
        const typePrefix = seg.type !== 'context' ? `[${seg.type}] ` : '';
        return `${typePrefix}${seg.content}`;
      })
      .join('\n\n');
  }

  private calculateContextSize(context: string | Record<string, any>): number {
    const content = typeof context === 'string' ? context : JSON.stringify(context);
    return content.length;
  }

  private updateStats(result: TransformationResult): void {
    // Update average reduction
    if (result.optimization) {
      const currentAvg = this.stats.averageReduction;
      const newReduction = result.optimization.reductionPercentage;
      const count = this.stats.optimizedTransformations;
      
      this.stats.averageReduction = (currentAvg * (count - 1) + newReduction) / count;
    }

    // Update average time
    const currentAvgTime = this.stats.averageTime;
    const count = this.stats.totalTransformations;
    this.stats.averageTime = (currentAvgTime * (count - 1) + result.transformationTime) / count;
  }

  getStats(): TransformationStats {
    return { ...this.stats };
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.emit('cache:cleared');
  }

  async warmupCache(contexts: Array<string | Record<string, any>>): Promise<void> {
    this.emit('warmup:start', { count: contexts.length });
    
    for (const context of contexts) {
      await this.transform(context);
    }
    
    this.emit('warmup:complete', { count: contexts.length });
  }

  registerOptimizationStrategy(strategy: any): void {
    this.optimizer.registerStrategy(strategy);
  }

  async exportContext(context: string | Record<string, any>, format: 'json' | 'markdown' | 'text' = 'text'): Promise<string> {
    const result = await this.transform(context);
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          original: result.original,
          transformed: result.transformed,
          analysis: result.analysis,
          optimization: result.optimization
        }, null, 2);
        
      case 'markdown':
        return this.toMarkdown(result);
        
      case 'text':
      default:
        return result.transformed;
    }
  }

  private toMarkdown(result: TransformationResult): string {
    const lines: string[] = [];
    
    lines.push('# Context Transformation Result\n');
    
    if (result.analysis) {
      lines.push('## Analysis\n');
      lines.push(`- Token Count: ${result.analysis.metrics.tokenCount}`);
      lines.push(`- Relevance Score: ${(result.analysis.metrics.relevanceScore * 100).toFixed(1)}%`);
      lines.push(`- Redundancy Score: ${(result.analysis.metrics.redundancyScore * 100).toFixed(1)}%`);
      lines.push(`- Information Density: ${(result.analysis.metrics.informationDensity * 100).toFixed(1)}%\n`);
    }
    
    if (result.optimization) {
      lines.push('## Optimization\n');
      lines.push(`- Original Size: ${result.optimization.originalSize} bytes`);
      lines.push(`- Optimized Size: ${result.optimization.optimizedSize} bytes`);
      lines.push(`- Reduction: ${result.optimization.reductionPercentage.toFixed(1)}%`);
      lines.push(`- Applied Strategies: ${result.optimization.appliedStrategies.join(', ')}\n`);
    }
    
    lines.push('## Transformed Context\n');
    lines.push('```');
    lines.push(result.transformed);
    lines.push('```');
    
    return lines.join('\n');
  }

  async validateTransformation(original: string | Record<string, any>, transformed: string): Promise<boolean> {
    // Validate that important information is preserved
    const originalAnalysis = await this.analyzer.analyze(original);
    const transformedAnalysis = await this.analyzer.analyze(transformed);
    
    // Check that high-importance segments are preserved
    const originalImportant = originalAnalysis.segments.filter(s => s.importance > 0.7);
    const transformedImportant = transformedAnalysis.segments.filter(s => s.importance > 0.7);
    
    // Basic validation: at least 80% of important segments should be preserved
    const preservationRate = transformedImportant.length / Math.max(originalImportant.length, 1);
    
    return preservationRate >= 0.8;
  }
}