import { EventEmitter } from 'node:events';
import { ContextAnalyzer, ContextSegment, AnalysisResult } from './ContextAnalyzer';

export interface OptimizationStrategy {
  name: string;
  priority: number;
  apply(segments: ContextSegment[]): ContextSegment[];
}

export interface OptimizationConfig {
  maxTokens: number;
  minImportance: number;
  preserveStructure: boolean;
  strategies: OptimizationStrategy[];
  enableSummarization: boolean;
  enableDeduplication: boolean;
  enableReordering: boolean;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
  optimizedSegments: ContextSegment[];
  appliedStrategies: string[];
  optimizationTime: number;
}

export class ContextOptimizer extends EventEmitter {
  private analyzer: ContextAnalyzer;
  private config: OptimizationConfig;
  private strategies: Map<string, OptimizationStrategy>;

  constructor(config: Partial<OptimizationConfig> = {}) {
    super();
    
    this.config = {
      maxTokens: config.maxTokens || 50000,
      minImportance: config.minImportance || 0.3,
      preserveStructure: config.preserveStructure ?? true,
      strategies: config.strategies || [],
      enableSummarization: config.enableSummarization ?? true,
      enableDeduplication: config.enableDeduplication ?? true,
      enableReordering: config.enableReordering ?? true
    };

    this.analyzer = new ContextAnalyzer({
      maxTokens: this.config.maxTokens
    });

    this.strategies = new Map();
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    // Deduplication strategy
    if (this.config.enableDeduplication) {
      this.registerStrategy({
        name: "deduplication",
        priority: 1,
        apply: (segments) => this.deduplicateSegments(segments)
      });
    }

    // Remove low importance segments
    this.registerStrategy({
      name: 'importance-filter',
      priority: 2,
      apply: (segments) => this.filterByImportance(segments)
    });

    // Summarization strategy
    if (this.config.enableSummarization) {
      this.registerStrategy({
        name: "summarization",
        priority: 3,
        apply: (segments) => this.summarizeSegments(segments)
      });
    }

    // Reordering strategy
    if (this.config.enableReordering) {
      this.registerStrategy({
        name: "reordering",
        priority: 4,
        apply: (segments) => this.reorderSegments(segments)
      });
    }

    // Token limit enforcement
    this.registerStrategy({
      name: 'token-limit',
      priority: 5,
      apply: (segments) => this.enforceTokenLimit(segments)
    });
  }

  registerStrategy(strategy: OptimizationStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.emit('strategy:registered', strategy);
  }

  async optimize(context: string | Record<string, any>): Promise<OptimizationResult> {
    const startTime = Date.now();
    this.emit('optimization:start', { context });

    // Analyze the context first
    const analysis = await this.analyzer.analyze(context);
    const originalSize = this.calculateSize(analysis.segments);

    // Apply optimization strategies
    let optimizedSegments = [...analysis.segments];
    const appliedStrategies: string[] = [];

    // Sort strategies by priority
    const sortedStrategies = Array.from(this.strategies.values())
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      this.emit('strategy:apply', { name: strategy.name });
      
      const before = optimizedSegments.length;
      optimizedSegments = strategy.apply(optimizedSegments);
      const after = optimizedSegments.length;
      
      if (before !== after) {
        appliedStrategies.push(strategy.name);
        this.emit('strategy:applied', { 
          name: strategy.name, 
          segmentsBefore: before, 
          segmentsAfter: after 
        });
      }
    }

    const optimizedSize = this.calculateSize(optimizedSegments);
    const reductionPercentage = ((originalSize - optimizedSize) / originalSize) * 100;

    const result: OptimizationResult = {
      originalSize,
      optimizedSize,
      reductionPercentage,
      optimizedSegments,
      appliedStrategies,
      optimizationTime: Date.now() - startTime
    };

    this.emit('optimization:complete', result);
    return result;
  }

  private calculateSize(segments: ContextSegment[]): number {
    return segments.reduce((total, seg) => total + seg.content.length, 0);
  }

  private deduplicateSegments(segments: ContextSegment[]): ContextSegment[] {
    const seen = new Map<string, ContextSegment>();
    const deduplicated: ContextSegment[] = [];

    for (const segment of segments) {
      const contentHash = this.hashContent(segment.content);
      
      if (!seen.has(contentHash)) {
        seen.set(contentHash, segment);
        deduplicated.push(segment);
      } else {
        // Merge metadata and dependencies
        const existing = seen.get(contentHash)!;
        existing.dependencies = [...new Set([...existing.dependencies, ...segment.dependencies])];
        existing.importance = Math.max(existing.importance, segment.importance);
      }
    }

    return deduplicated;
  }

  private hashContent(content: string): string {
    // Simple hash for deduplication - normalize whitespace and case
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private filterByImportance(segments: ContextSegment[]): ContextSegment[] {
    // Keep segments above minimum importance threshold
    const filtered = segments.filter(seg => seg.importance >= this.config.minImportance);
    
    // Ensure we keep segments that are dependencies of important segments
    const requiredIds = new Set<string>();
    for (const segment of filtered) {
      segment.dependencies.forEach(dep => requiredIds.add(dep));
    }

    // Add back required dependencies
    for (const segment of segments) {
      if (requiredIds.has(segment.id) && !filtered.includes(segment)) {
        filtered.push(segment);
      }
    }

    return filtered;
  }

  private summarizeSegments(segments: ContextSegment[]): ContextSegment[] {
    return segments.map(segment => {
      // Only summarize long, low-importance segments
      if (segment.content.length > 1000 && segment.importance < 0.5) {
        return {
          ...segment,
          content: this.summarizeContent(segment.content),
          metadata: {
            ...segment.metadata,
            summarized: true,
            originalLength: segment.content.length
          }
        };
      }
      return segment;
    });
  }

  private summarizeContent(content: string): string {
    // Simple extractive summarization - take first and last parts
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 5) {
      return content;
    }

    const summary: string[] = [];
    
    // Take first 2 lines
    summary.push(...lines.slice(0, 2));
    
    // Add ellipsis indicator
    summary.push('... [content summarized] ...');
    
    // Take last 2 lines
    summary.push(...lines.slice(-2));
    
    return summary.join('\n');
  }

  private reorderSegments(segments: ContextSegment[]): ContextSegment[] {
    if (!this.config.enableReordering || this.config.preserveStructure) {
      return segments;
    }

    // Topological sort based on dependencies
    const sorted: ContextSegment[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (segment: ContextSegment): void => {
      if (visited.has(segment.id)) return;
      if (visiting.has(segment.id)) {
        // Circular dependency detected - skip reordering
        return;
      }

      visiting.add(segment.id);

      // Visit dependencies first
      for (const depId of segment.dependencies) {
        const dep = segments.find(s => s.id === depId);
        if (dep) visit(dep);
      }

      visiting.delete(segment.id);
      visited.add(segment.id);
      sorted.push(segment);
    };

    // Visit all segments
    for (const segment of segments) {
      visit(segment);
    }

    // Group by type while preserving dependency order
    const typeOrder = ['system', 'context', 'user', "assistant", 'tool'];
    return sorted.sort((a, b) => {
      // First sort by importance (descending)
      const importanceDiff = b.importance - a.importance;
      if (Math.abs(importanceDiff) > 0.1) {
        return importanceDiff;
      }
      
      // Then by type order
      const aTypeIndex = typeOrder.indexOf(a.type);
      const bTypeIndex = typeOrder.indexOf(b.type);
      return aTypeIndex - bTypeIndex;
    });
  }

  private enforceTokenLimit(segments: ContextSegment[]): ContextSegment[] {
    let totalTokens = 0;
    const limited: ContextSegment[] = [];

    // Sort by importance descending
    const sorted = [...segments].sort((a, b) => b.importance - a.importance);

    for (const segment of sorted) {
      const segmentTokens = Math.ceil(segment.content.length / 4);
      
      if (totalTokens + segmentTokens <= this.config.maxTokens) {
        limited.push(segment);
        totalTokens += segmentTokens;
      } else if (totalTokens < this.config.maxTokens) {
        // Truncate the segment to fit
        const remainingTokens = this.config.maxTokens - totalTokens;
        const maxChars = remainingTokens * 4;
        
        limited.push({
          ...segment,
          content: segment.content.substring(0, maxChars) + '... [truncated]',
          metadata: {
            ...segment.metadata,
            truncated: true,
            originalLength: segment.content.length
          }
        });
        break;
      }
    }

    return limited;
  }

  async analyzeOptimizationPotential(context: string | Record<string, any>): Promise<number> {
    const analysis = await this.analyzer.analyze(context);
    return analysis.optimizationPotential;
  }

  getRegisteredStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  removeStrategy(name: string): boolean {
    const deleted = this.strategies.delete(name);
    if (deleted) {
      this.emit('strategy:removed', { name });
    }
    return deleted;
  }
}