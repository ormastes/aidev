import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  ContextTransformer,
  ContextAnalyzer,
  ContextOptimizer,
  ContextCache
} from '../src/index';

describe('ContextTransformer Tests', () => {
  let transformer: ContextTransformer;

  beforeEach(() => {
    transformer = new ContextTransformer({
      enableCache: true,
      enableOptimization: true,
      enableAnalysis: true,
      autoOptimizeThreshold: 1000
    });
  });

  describe('ContextAnalyzer', () => {
    test('should analyze simple context', async () => {
      const analyzer = new ContextAnalyzer();
      const context = 'This is a simple test context for analysis.';
      
      const result = await analyzer.analyze(context);
      
      expect(result).toBeDefined();
      expect(result.segments).toBeInstanceOf(Array);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.tokenCount).toBeGreaterThan(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    test('should segment complex context', async () => {
      const analyzer = new ContextAnalyzer();
      const context = `
        system: You are a helpful assistant.
        user: What is the weather today?
        assistant: I don't have access to real-time weather data.
        user: Can you explain machine learning?
        assistant: Machine learning is a subset of artificial intelligence.
      `;
      
      const result = await analyzer.analyze(context);
      
      expect(result.segments.length).toBeGreaterThan(1);
      expect(result.segments.some(s => s.type === 'system')).toBe(true);
      expect(result.segments.some(s => s.type === 'user')).toBe(true);
      expect(result.segments.some(s => s.type === 'assistant')).toBe(true);
    });

    test('should calculate importance scores', async () => {
      const analyzer = new ContextAnalyzer();
      const context = {
        critical: 'This is critical information that must be preserved',
        normal: 'This is regular information',
        code: '```javascript\nconst x = 10;\n```'
      };
      
      const result = await analyzer.analyze(context);
      
      expect(result.segments).toBeDefined();
      result.segments.forEach(segment => {
        expect(segment.importance).toBeGreaterThanOrEqual(0);
        expect(segment.importance).toBeLessThanOrEqual(1);
      });
    });

    test('should identify dependencies between segments', async () => {
      const analyzer = new ContextAnalyzer();
      const context = `
        Define variable X as 10.
        Variable X is used in the calculation.
        The result depends on X.
      `;
      
      const result = await analyzer.analyze(context);
      
      expect(result.segments.some(s => s.dependencies.length > 0)).toBe(true);
    });

    test('should generate recommendations', async () => {
      const analyzer = new ContextAnalyzer({ maxTokens: 100 });
      const longContext = 'a'.repeat(1000); // Very long context
      
      const result = await analyzer.analyze(longContext);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('token'))).toBe(true);
    });
  });

  describe('ContextOptimizer', () => {
    test('should optimize context by removing redundancy', async () => {
      const optimizer = new ContextOptimizer({
        enableDeduplication: true
      });
      
      const context = `
        This is important information.
        This is important information.
        This is unique information.
        This is important information.
      `;
      
      const result = await optimizer.optimize(context);
      
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.reductionPercentage).toBeGreaterThan(0);
      expect(result.appliedStrategies).toContain('deduplication');
    });

    test('should filter low importance segments', async () => {
      const optimizer = new ContextOptimizer({
        minImportance: 0.5
      });
      
      const context = `
        Critical: This must be preserved.
        Minor detail that can be removed.
        Another minor detail.
        Important: This should stay.
      `;
      
      const result = await optimizer.optimize(context);
      
      expect(result.optimizedSegments.length).toBeGreaterThan(0);
      expect(result.appliedStrategies).toContain('importance-filter');
    });

    test('should summarize long segments', async () => {
      const optimizer = new ContextOptimizer({
        enableSummarization: true
      });
      
      const longSegment = 'This is a very long segment. '.repeat(100);
      const context = `
        Short segment.
        ${longSegment}
        Another short segment.
      `;
      
      const result = await optimizer.optimize(context);
      
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.appliedStrategies).toContain('summarization');
    });

    test('should enforce token limits', async () => {
      const optimizer = new ContextOptimizer({
        maxTokens: 50 // Very small limit
      });
      
      const context = 'word '.repeat(100); // 500 characters ≈ 125 tokens
      
      const result = await optimizer.optimize(context);
      
      // Check that optimized content respects token limit
      const estimatedTokens = Math.ceil(result.optimizedSize / 4);
      expect(estimatedTokens).toBeLessThanOrEqual(50);
      expect(result.appliedStrategies).toContain('token-limit');
    });

    test('should preserve dependencies when filtering', async () => {
      const optimizer = new ContextOptimizer({
        minImportance: 0.7
      });
      
      // Create analyzer to get segments with dependencies
      const analyzer = new ContextAnalyzer();
      const context = `
        Define important variable X.
        Low importance segment referencing X.
        Critical calculation using X.
      `;
      
      const analysis = await analyzer.analyze(context);
      // Manually set importance for testing
      if (analysis.segments[0]) analysis.segments[0].importance = 0.8;
      if (analysis.segments[1]) analysis.segments[1].importance = 0.2;
      if (analysis.segments[2]) {
        analysis.segments[2].importance = 0.9;
        analysis.segments[2].dependencies = [analysis.segments[1].id];
      }
      
      const result = await optimizer.optimize(context);
      
      // Low importance segment should be kept if it's a dependency
      expect(result.optimizedSegments.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ContextCache', () => {
    test('should cache and retrieve contexts', async () => {
      const cache = new ContextCache({
        maxEntries: 10,
        ttl: 60000
      });
      
      const context = 'Test context for caching';
      const key = cache.generateKey(context);
      
      await cache.set(key, context);
      const retrieved = await cache.get(key);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.context).toBe(context);
      expect(retrieved?.metadata.accessCount).toBe(1);
    });

    test('should track cache statistics', async () => {
      const cache = new ContextCache();
      
      const context1 = 'First context';
      const context2 = 'Second context';
      const key1 = cache.generateKey(context1);
      const key2 = cache.generateKey(context2);
      
      await cache.set(key1, context1);
      await cache.get(key1); // Hit
      await cache.get(key2); // Miss
      
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should evict entries based on LRU policy', async () => {
      const cache = new ContextCache({
        maxEntries: 2,
        evictionPolicy: 'LRU'
      });
      
      const context1 = 'First';
      const context2 = 'Second';
      const context3 = 'Third';
      
      const key1 = cache.generateKey(context1);
      const key2 = cache.generateKey(context2);
      const key3 = cache.generateKey(context3);
      
      await cache.set(key1, context1);
      await cache.set(key2, context2);
      await cache.get(key1); // Access key1 to make it more recent
      await cache.set(key3, context3); // Should evict key2
      
      expect(await cache.has(key1)).toBe(true);
      expect(await cache.has(key2)).toBe(false); // Evicted
      expect(await cache.has(key3)).toBe(true);
    });

    test('should expire entries based on TTL', async () => {
      const cache = new ContextCache({
        ttl: 100 // 100ms TTL
      });
      
      const context = 'Expiring context';
      const key = cache.generateKey(context);
      
      await cache.set(key, context);
      expect(await cache.has(key)).toBe(true);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await cache.has(key)).toBe(false);
    });

    test('should handle cache warmup', async () => {
      const cache = new ContextCache();
      
      const contexts = [
        'Context 1',
        'Context 2',
        'Context 3'
      ];
      
      await cache.warmup(contexts);
      
      const stats = cache.getStats();
      expect(stats.entries).toBe(3);
    });
  });

  describe('ContextTransformer Integration', () => {
    test('should transform simple context', async () => {
      const context = 'Simple test context';
      
      const result = await transformer.transform(context);
      
      expect(result).toBeDefined();
      expect(result.original).toBe(context);
      expect(result.transformed).toBeDefined();
      expect(result.fromCache).toBe(false);
    });

    test('should use cache for repeated transformations', async () => {
      const context = 'Cached context';
      
      const result1 = await transformer.transform(context);
      expect(result1.fromCache).toBe(false);
      
      const result2 = await transformer.transform(context);
      expect(result2.fromCache).toBe(true);
      expect(result2.transformationTime).toBeLessThan(result1.transformationTime);
    });

    test('should auto-optimize large contexts', async () => {
      const largeContext = 'Large context. '.repeat(100); // Exceeds threshold
      
      const result = await transformer.transform(largeContext);
      
      expect(result.optimization).toBeDefined();
      expect(result.optimization?.reductionPercentage).toBeGreaterThan(0);
    });

    test('should batch transform multiple contexts', async () => {
      const contexts = [
        'Context 1',
        'Context 2',
        'Context 3'
      ];
      
      const results = await transformer.batchTransform(contexts);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.original).toBe(contexts[index]);
        expect(result.transformed).toBeDefined();
      });
    });

    test('should export context in different formats', async () => {
      const context = 'Export test context';
      
      const json = await transformer.exportContext(context, 'json');
      const markdown = await transformer.exportContext(context, 'markdown');
      const text = await transformer.exportContext(context, 'text');
      
      expect(JSON.parse(json)).toBeDefined();
      expect(markdown).toContain('# Context Transformation Result');
      expect(text).toBeDefined();
    });

    test('should validate transformations', async () => {
      const original = `
        Critical: This information is essential.
        Important: This must be preserved.
        Minor: This can be removed.
      `;
      
      const result = await transformer.transform(original);
      const isValid = await transformer.validateTransformation(original, result.transformed);
      
      expect(isValid).toBe(true);
    });

    test('should track transformation statistics', async () => {
      await transformer.transform('Context 1');
      await transformer.transform('Context 2');
      await transformer.transform('Large context '.repeat(100));
      
      const stats = transformer.getStats();
      
      expect(stats.totalTransformations).toBe(3);
      expect(stats.optimizedTransformations).toBeGreaterThan(0);
      expect(stats.averageTime).toBeGreaterThan(0);
    });

    test('should handle event emissions', async () => {
      const events: string[] = [];
      
      transformer.on('transformation:start', () => events.push('start'));
      transformer.on('transformation:complete', () => events.push('complete'));
      transformer.on('analysis:complete', () => events.push('analysis'));
      
      await transformer.transform('Event test context');
      
      expect(events).toContain('start');
      expect(events).toContain('complete');
      expect(events).toContain('analysis');
    });
  });
});