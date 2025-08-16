/**
 * Unit tests for Context Analyzer
 */

import { ContextAnalyzer } from '../../src/analyzers/context-analyzer';
import { ContextMetrics, ContextType, AnalysisResult } from '../../src/types';

describe('ContextAnalyzer', () => {
  let analyzer: ContextAnalyzer;

  beforeEach(() => {
    analyzer = new ContextAnalyzer();
  });

  describe('analyzeContext', () => {
    it('should analyze simple code context', () => {
      const context = `
        function calculate(a: number, b: number): number {
          return a + b;
        }
      `;

      const result = analyzer.analyzeContext(context);

      expect(result.type).toBe(ContextType.CODE);
      expect(result.metrics.tokenCount).toBeGreaterThan(0);
      expect(result.metrics.complexity).toBeDefined();
      expect(result.metrics.duplicateRatio).toBe(0);
    });

    it('should detect high complexity code', () => {
      const complexCode = `
        function complex(a, b, c) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                return a + b + c;
              } else {
                return a + b;
              }
            } else {
              return a;
            }
          } else {
            if (b > 0) {
              return b + c;
            } else {
              return c;
            }
          }
        }
      `;

      const result = analyzer.analyzeContext(complexCode);

      expect(result.metrics.complexity).toBeGreaterThan(5);
      expect(result.recommendations).toContain('Consider refactoring to reduce complexity');
    });

    it('should detect documentation context', () => {
      const docContext = `
        # API Documentation
        
        ## Overview
        This API provides user management functionality.
        
        ## Endpoints
        - GET /users - List all users
        - POST /users - Create a new user
      `;

      const result = analyzer.analyzeContext(docContext);

      expect(result.type).toBe(ContextType.DOCUMENTATION);
      expect(result.metrics.readabilityScore).toBeGreaterThan(0);
    });

    it('should detect mixed context', () => {
      const mixedContext = `
        # User Service
        
        This service handles user operations.
        
        \`\`\`typescript
        class UserService {
          async getUser(id: string) {
            return await this.db.findUser(id);
          }
        }
        \`\`\`
      `;

      const result = analyzer.analyzeContext(mixedContext);

      expect(result.type).toBe(ContextType.MIXED);
      expect(result.subContexts).toHaveLength(2);
      expect(result.subContexts).toContainEqual(
        expect.objectContaining({ type: ContextType.DOCUMENTATION })
      );
      expect(result.subContexts).toContainEqual(
        expect.objectContaining({ type: ContextType.CODE })
      );
    });

    it('should detect duplicate content', () => {
      const duplicateContext = `
        const userSchema = { name: String, email: String };
        const userSchema = { name: String, email: String };
        const productSchema = { title: String, price: Number };
        const productSchema = { title: String, price: Number };
      `;

      const result = analyzer.analyzeContext(duplicateContext);

      expect(result.metrics.duplicateRatio).toBeGreaterThan(0.4);
      expect(result.recommendations).toContain('Remove duplicate definitions');
    });
  });

  describe('extractRelevantContext', () => {
    it('should extract relevant parts based on query', () => {
      const fullContext = `
        class UserService {
          async createUser(data) { /* ... */ }
          async updateUser(id, data) { /* ... */ }
          async deleteUser(id) { /* ... */ }
          async getUser(id) { /* ... */ }
        }
        
        class ProductService {
          async createProduct(data) { /* ... */ }
          async updateProduct(id, data) { /* ... */ }
        }
      `;

      const query = 'update user functionality';
      const relevant = analyzer.extractRelevantContext(fullContext, query);

      expect(relevant).toContain('updateUser');
      expect(relevant).toContain('UserService');
      expect(relevant).not.toContain('ProductService');
    });

    it('should handle empty query', () => {
      const context = 'Some context';
      const relevant = analyzer.extractRelevantContext(context, '');

      expect(relevant).toBe(context);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate token count', () => {
      const context = 'The quick brown fox jumps over the lazy dog';
      const metrics = analyzer.calculateMetrics(context);

      expect(metrics.tokenCount).toBe(9);
    });

    it('should calculate complexity for code', () => {
      const code = `
        if (a) {
          while (b) {
            for (let i = 0; i < n; i++) {
              switch (x) {
                case 1: break;
                case 2: break;
              }
            }
          }
        }
      `;

      const metrics = analyzer.calculateMetrics(code);

      expect(metrics.complexity).toBeGreaterThan(4);
    });

    it('should calculate readability score', () => {
      const easyText = 'This is a simple sentence. It is easy to read.';
      const hardText = 'The implementation utilizes sophisticated algorithmic paradigms to facilitate optimized computational efficiency.';

      const easyMetrics = analyzer.calculateMetrics(easyText);
      const hardMetrics = analyzer.calculateMetrics(hardText);

      expect(easyMetrics.readabilityScore).toBeGreaterThan(hardMetrics.readabilityScore);
    });
  });

  describe('optimizeContext', () => {
    it('should remove comments when specified', () => {
      const context = `
        // This is a comment
        function test() {
          /* Multi-line
             comment */
          return true;
        }
      `;

      const optimized = analyzer.optimizeContext(context, {
        removeComments: true
      });

      expect(optimized).not.toContain('This is a comment');
      expect(optimized).not.toContain('Multi-line');
      expect(optimized).toContain('function test()');
    });

    it('should compress whitespace', () => {
      const context = `
        function   test()   {
          
          
          return    true;
        }
      `;

      const optimized = analyzer.optimizeContext(context, {
        compressWhitespace: true
      });

      expect(optimized).not.toMatch(/\s{3,}/);
      expect(optimized).toContain('function test()');
    });

    it('should extract code blocks from markdown', () => {
      const context = `
        # Documentation
        
        Here's an example:
        
        \`\`\`javascript
        function example() {
          return 42;
        }
        \`\`\`
        
        More text here.
      `;

      const optimized = analyzer.optimizeContext(context, {
        extractCodeBlocks: true
      });

      expect(optimized).toContain('function example()');
      expect(optimized).not.toContain('# Documentation');
    });
  });

  describe('suggestOptimizations', () => {
    it('should suggest removing duplicates', () => {
      const analysis: AnalysisResult = {
        type: ContextType.CODE,
        metrics: {
          tokenCount: 100,
          complexity: 3,
          duplicateRatio: 0.6,
          readabilityScore: 70
        },
        recommendations: []
      };

      const suggestions = analyzer.suggestOptimizations(analysis);

      expect(suggestions).toContain('Remove duplicate code segments');
    });

    it('should suggest complexity reduction', () => {
      const analysis: AnalysisResult = {
        type: ContextType.CODE,
        metrics: {
          tokenCount: 100,
          complexity: 15,
          duplicateRatio: 0.1,
          readabilityScore: 70
        },
        recommendations: []
      };

      const suggestions = analyzer.suggestOptimizations(analysis);

      expect(suggestions).toContain('Refactor complex functions');
    });

    it('should suggest token reduction for large contexts', () => {
      const analysis: AnalysisResult = {
        type: ContextType.MIXED,
        metrics: {
          tokenCount: 10000,
          complexity: 5,
          duplicateRatio: 0.1,
          readabilityScore: 70
        },
        recommendations: []
      };

      const suggestions = analyzer.suggestOptimizations(analysis);

      expect(suggestions).toContain('Consider splitting into smaller contexts');
    });
  });
});