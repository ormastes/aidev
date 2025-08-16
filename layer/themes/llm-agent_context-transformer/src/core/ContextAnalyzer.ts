import { EventEmitter } from '../../../infra_external-log-lib/src';

export interface ContextMetrics {
  tokenCount: number;
  relevanceScore: number;
  redundancyScore: number;
  coherenceScore: number;
  informationDensity: number;
  semanticSimilarity: number;
}

export interface ContextSegment {
  id: string;
  content: string;
  type: 'system' | 'user' | 'assistant' | 'tool' | 'context';
  importance: number;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface AnalysisResult {
  segments: ContextSegment[];
  metrics: ContextMetrics;
  recommendations: string[];
  optimizationPotential: number;
}

export class ContextAnalyzer extends EventEmitter {
  private readonly maxTokens: number;
  private readonly minRelevance: number;

  constructor(config: { maxTokens?: number; minRelevance?: number } = {}) {
    super();
    this.maxTokens = config.maxTokens || 100000;
    this.minRelevance = config.minRelevance || 0.5;
  }

  async analyze(context: string | Record<string, any>): Promise<AnalysisResult> {
    this.emit('analysis:start', { context });

    const segments = await this.segmentContext(context);
    const metrics = await this.calculateMetrics(segments);
    const recommendations = this.generateRecommendations(metrics, segments);
    const optimizationPotential = this.calculateOptimizationPotential(metrics);

    const result: AnalysisResult = {
      segments,
      metrics,
      recommendations,
      optimizationPotential
    };

    this.emit('analysis:complete', result);
    return result;
  }

  private async segmentContext(context: string | Record<string, any>): Promise<ContextSegment[]> {
    const segments: ContextSegment[] = [];
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);
    
    // Parse context into logical segments
    const lines = contextStr.split('\n');
    let currentSegment: ContextSegment | null = null;
    let segmentContent: string[] = [];

    for (const line of lines) {
      const segmentType = this.detectSegmentType(line);
      
      if (segmentType && currentSegment && segmentType !== currentSegment.type) {
        // Save current segment
        currentSegment.content = segmentContent.join('\n');
        currentSegment.importance = this.calculateImportance(currentSegment.content);
        segments.push(currentSegment);
        
        // Start new segment
        currentSegment = {
          id: `seg_${segments.length + 1}`,
          content: '',
          type: segmentType,
          importance: 0,
          dependencies: [],
          metadata: {}
        };
        segmentContent = [line];
      } else {
        if (!currentSegment) {
          currentSegment = {
            id: `seg_${segments.length + 1}`,
            content: '',
            type: segmentType || 'context',
            importance: 0,
            dependencies: [],
            metadata: {}
          };
        }
        segmentContent.push(line);
      }
    }

    // Add final segment
    if (currentSegment && segmentContent.length > 0) {
      currentSegment.content = segmentContent.join('\n');
      currentSegment.importance = this.calculateImportance(currentSegment.content);
      segments.push(currentSegment);
    }

    // Identify dependencies between segments
    this.identifyDependencies(segments);

    return segments;
  }

  private detectSegmentType(line: string): ContextSegment['type'] | null {
    if (line.includes('system:') || line.includes('<system>')) return 'system';
    if (line.includes('user:') || line.includes('<user>')) return 'user';
    if (line.includes('assistant:') || line.includes('<assistant>')) return 'assistant';
    if (line.includes('tool:') || line.includes('<tool>')) return 'tool';
    return null;
  }

  private calculateImportance(content: string): number {
    // Simple importance scoring based on content characteristics
    let score = 0.5; // Base score

    // Adjust based on content length (normalized)
    const lengthScore = Math.min(content.length / 1000, 1) * 0.2;
    score += lengthScore;

    // Check for keywords that indicate importance
    const importantKeywords = ['error', 'critical', 'important', 'must', 'required', 'primary'];
    const keywordCount = importantKeywords.filter(kw => 
      content.toLowerCase().includes(kw)
    ).length;
    score += keywordCount * 0.1;

    // Check for code blocks (usually important)
    if (content.includes('```')) score += 0.2;

    // Check for structured data
    if (content.includes('{') && content.includes('}')) score += 0.1;

    return Math.min(score, 1);
  }

  private identifyDependencies(segments: ContextSegment[]): void {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Look for references to other segments
      for (let j = 0; j < segments.length; j++) {
        if (i === j) continue;
        
        const otherSegment = segments[j];
        
        // Check if this segment references another
        if (this.hasReference(segment.content, otherSegment)) {
          segment.dependencies.push(otherSegment.id);
        }
      }
    }
  }

  private hasReference(content: string, targetSegment: ContextSegment): boolean {
    // Simple reference detection - can be enhanced
    const keywords = targetSegment.content.split(/\s+/).slice(0, 5);
    const significantKeywords = keywords.filter(k => k.length > 4);
    
    return significantKeywords.some(keyword => 
      content.includes(keyword)
    );
  }

  private async calculateMetrics(segments: ContextSegment[]): Promise<ContextMetrics> {
    const allContent = segments.map(s => s.content).join('\n');
    
    return {
      tokenCount: this.estimateTokenCount(allContent),
      relevanceScore: this.calculateRelevance(segments),
      redundancyScore: this.calculateRedundancy(segments),
      coherenceScore: this.calculateCoherence(segments),
      informationDensity: this.calculateInformationDensity(allContent),
      semanticSimilarity: this.calculateSemanticSimilarity(segments)
    };
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateRelevance(segments: ContextSegment[]): number {
    // Average importance across all segments
    const totalImportance = segments.reduce((sum, seg) => sum + seg.importance, 0);
    return segments.length > 0 ? totalImportance / segments.length : 0;
  }

  private calculateRedundancy(segments: ContextSegment[]): number {
    let redundancy = 0;
    let comparisons = 0;

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const similarity = this.calculateTextSimilarity(
          segments[i].content,
          segments[j].content
        );
        redundancy += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? redundancy / comparisons : 0;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateCoherence(segments: ContextSegment[]): number {
    // Check how well segments flow together
    let coherenceScore = 0;
    
    for (let i = 1; i < segments.length; i++) {
      const prevSegment = segments[i - 1];
      const currSegment = segments[i];
      
      // Check if current segment has dependencies on previous ones
      if (currSegment.dependencies.includes(prevSegment.id)) {
        coherenceScore += 1;
      }
      
      // Check type transitions
      if (this.isCoherentTransition(prevSegment.type, currSegment.type)) {
        coherenceScore += 0.5;
      }
    }
    
    return segments.length > 1 ? coherenceScore / (segments.length - 1) : 1;
  }

  private isCoherentTransition(from: ContextSegment['type'], to: ContextSegment['type']): boolean {
    const coherentTransitions: Record<string, string[]> = {
      'user': ['assistant', 'tool', 'system'],
      'assistant': ['user', 'tool', 'system'],
      'tool': ['assistant', 'user'],
      'system': ['user', 'assistant'],
      'context': ['user', 'assistant', 'system', 'tool']
    };
    
    return coherentTransitions[from]?.includes(to) ?? false;
  }

  private calculateInformationDensity(content: string): number {
    // Ratio of unique words to total words
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    
    return words.length > 0 ? uniqueWords.size / words.length : 0;
  }

  private calculateSemanticSimilarity(segments: ContextSegment[]): number {
    // Calculate average semantic similarity between segments
    let totalSimilarity = 0;
    let pairs = 0;
    
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        if (segments[i].type === segments[j].type) {
          totalSimilarity += this.calculateTextSimilarity(
            segments[i].content,
            segments[j].content
          );
          pairs++;
        }
      }
    }
    
    return pairs > 0 ? totalSimilarity / pairs : 0;
  }

  private generateRecommendations(metrics: ContextMetrics, segments: ContextSegment[]): string[] {
    const recommendations: string[] = [];

    if (metrics.tokenCount > this.maxTokens) {
      recommendations.push(`Reduce context size by ${metrics.tokenCount - this.maxTokens} tokens`);
    }

    if (metrics.relevanceScore < this.minRelevance) {
      recommendations.push('Remove low-importance segments to improve relevance');
    }

    if (metrics.redundancyScore > 0.3) {
      recommendations.push('High redundancy detected - consider deduplication');
    }

    if (metrics.coherenceScore < 0.5) {
      recommendations.push('Improve context flow by reordering segments');
    }

    if (metrics.informationDensity < 0.3) {
      recommendations.push('Low information density - consider summarization');
    }

    // Segment-specific recommendations
    const lowImportanceSegments = segments.filter(s => s.importance < 0.3);
    if (lowImportanceSegments.length > 0) {
      recommendations.push(`Consider removing ${lowImportanceSegments.length} low-importance segments`);
    }

    return recommendations;
  }

  private calculateOptimizationPotential(metrics: ContextMetrics): number {
    let potential = 0;

    // Token reduction potential
    if (metrics.tokenCount > this.maxTokens) {
      potential += 0.3;
    }

    // Redundancy reduction potential
    potential += metrics.redundancyScore * 0.3;

    // Relevance improvement potential
    potential += (1 - metrics.relevanceScore) * 0.2;

    // Coherence improvement potential
    potential += (1 - metrics.coherenceScore) * 0.1;

    // Information density improvement potential
    potential += (1 - metrics.informationDensity) * 0.1;

    return Math.min(potential, 1);
  }
}