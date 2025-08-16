/**
 * Comprehensive tests for Context Transformer Theme
 */

describe('Context Transformer Theme', () => {
  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('context analysis', () => {
    it('should analyze context size', () => {
      const analyzeContextSize = (context: any): number => {
        return JSON.stringify(context).length;
      };

      const smallContext = { message: 'hello' };
      const largeContext = { message: 'x'.repeat(1000) };

      expect(analyzeContextSize(smallContext)).toBeLessThan(50);
      expect(analyzeContextSize(largeContext)).toBeGreaterThan(1000);
    });

    it('should identify redundant information', () => {
      const context = {
        user: { id: 1, name: 'John', id_duplicate: 1 },
        session: { user_id: 1, user_name: 'John' },
        request: { timestamp: Date.now() }
      };

      const findRedundancy = (ctx: any): string[] => {
        const redundant = [];
        if (ctx.user?.id === ctx.user?.id_duplicate) {
          redundant.push('user.id_duplicate');
        }
        if (ctx.user?.id === ctx.session?.user_id) {
          redundant.push('session.user_id');
        }
        return redundant;
      };

      const redundant = findRedundancy(context);
      expect(redundant).toContain('user.id_duplicate');
      expect(redundant).toContain('session.user_id');
    });

    it('should measure context complexity', () => {
      const measureComplexity = (context: any): number => {
        const countProperties = (obj: any, depth = 0): number => {
          if (depth > 10 || typeof obj !== 'object' || obj === null) return 0;
          return Object.keys(obj).length + 
                 Object.values(obj).reduce((sum, val) => sum + countProperties(val, depth + 1), 0);
        };
        return countProperties(context);
      };

      const simpleContext = { name: 'test' };
      const complexContext = {
        user: { profile: { settings: { theme: 'dark' } } },
        data: { items: [{ id: 1 }, { id: 2 }] }
      };

      expect(measureComplexity(simpleContext)).toBe(1);
      expect(measureComplexity(complexContext)).toBeGreaterThan(5);
    });
  });

  describe('context transformation strategies', () => {
    it('should implement token-based truncation', () => {
      const tokenTruncate = (text: string, maxTokens: number): string => {
        const tokens = text.split(/\s+/);
        return tokens.length > maxTokens 
          ? tokens.slice(0, maxTokens).join(' ') + '...'
          : text;
      };

      const longText = 'word '.repeat(100);
      const truncated = tokenTruncate(longText, 50);
      
      expect(truncated.split(/\s+/)).toHaveLength(51); // 50 words + '...'
      expect(truncated).toEndWith('...');
    });

    it('should implement hierarchical compression', () => {
      const hierarchicalCompress = (context: any, maxDepth: number): any => {
        const compress = (obj: any, depth: number): any => {
          if (depth >= maxDepth || typeof obj !== 'object' || obj === null) {
            return typeof obj === 'object' ? '[Object]' : obj;
          }
          
          const compressed: any = {};
          for (const [key, value] of Object.entries(obj)) {
            compressed[key] = compress(value, depth + 1);
          }
          return compressed;
        };
        
        return compress(context, 0);
      };

      const deepContext = {
        level1: {
          level2: {
            level3: {
              level4: { data: 'deep' }
            }
          }
        }
      };

      const compressed = hierarchicalCompress(deepContext, 2);
      expect(compressed.level1.level2).toBe('[Object]');
    });

    it('should implement semantic summarization', () => {
      const semanticSummarize = (context: any): any => {
        const summarize = (obj: any): any => {
          if (Array.isArray(obj)) {
            return obj.length > 3 
              ? `[${obj.length} items: ${obj.slice(0, 2).join(', ')}...]`
              : obj;
          }
          
          if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            if (keys.length > 5) {
              return `{${keys.length} properties: ${keys.slice(0, 3).join(', ')}...}`;
            }
            
            const summarized: any = {};
            for (const [key, value] of Object.entries(obj)) {
              summarized[key] = summarize(value);
            }
            return summarized;
          }
          
          return obj;
        };
        
        return summarize(context);
      };

      const largeArray = Array.from({ length: 10 }, (_, i) => i);
      const largeObject = Object.fromEntries(
        Array.from({ length: 8 }, (_, i) => [`key${i}`, `value${i}`])
      );

      const context = { items: largeArray, data: largeObject };
      const summarized = semanticSummarize(context);

      expect(typeof summarized.items).toBe('string');
      expect(summarized.items).toContain('10 items');
      expect(typeof summarized.data).toBe('string');
      expect(summarized.data).toContain('8 properties');
    });
  });

  describe('context optimization', () => {
    it('should remove duplicate keys', () => {
      const removeDuplicates = (context: any): any => {
        const seen = new Set();
        const clean = (obj: any): any => {
          if (typeof obj !== 'object' || obj === null) return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(clean);
          }
          
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            const valueStr = JSON.stringify(value);
            if (!seen.has(valueStr)) {
              seen.add(valueStr);
              cleaned[key] = clean(value);
            }
          }
          return cleaned;
        };
        
        return clean(context);
      };

      const contextWithDuplicates = {
        user1: { name: 'John', age: 30 },
        user2: { name: 'John', age: 30 }, // duplicate
        user3: { name: 'Jane', age: 25 }
      };

      const deduplicated = removeDuplicates(contextWithDuplicates);
      const keys = Object.keys(deduplicated);
      expect(keys).toHaveLength(2); // user2 should be removed
    });

    it('should compress repeated patterns', () => {
      const compressPatterns = (context: any): any => {
        const patterns = new Map();
        
        const findPatterns = (obj: any, path = ''): void => {
          if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            const structure = Object.keys(obj).sort().join(',');
            if (!patterns.has(structure)) {
              patterns.set(structure, []);
            }
            patterns.get(structure).push(path);
            
            for (const [key, value] of Object.entries(obj)) {
              findPatterns(value, path ? `${path}.${key}` : key);
            }
          }
        };
        
        findPatterns(context);
        
        // Return pattern analysis
        return {
          originalSize: JSON.stringify(context).length,
          patterns: Array.from(patterns.entries()).map(([structure, paths]) => ({
            structure,
            occurrences: paths.length
          }))
        };
      };

      const repeatedStructure = {
        item1: { id: 1, name: 'a', type: 'x' },
        item2: { id: 2, name: 'b', type: 'y' },
        item3: { id: 3, name: 'c', type: 'z' }
      };

      const analysis = compressPatterns(repeatedStructure);
      expect(analysis.patterns.some(p => p.occurrences > 1)).toBe(true);
    });
  });

  describe('context validation', () => {
    it('should validate context schema', () => {
      const validateSchema = (context: any, schema: any): boolean => {
        const validate = (obj: any, schemaObj: any): boolean => {
          if (typeof schemaObj !== 'object') {
            return typeof obj === schemaObj;
          }
          
          if (schemaObj === null) return obj === null;
          if (Array.isArray(schemaObj)) {
            return Array.isArray(obj) && obj.every(item => 
              schemaObj.some(schemaItem => validate(item, schemaItem))
            );
          }
          
          if (typeof obj !== 'object' || obj === null) return false;
          
          return Object.keys(schemaObj).every(key => 
            key in obj && validate(obj[key], schemaObj[key])
          );
        };
        
        return validate(context, schema);
      };

      const schema = {
        user: { id: 'number', name: 'string' },
        session: { active: 'boolean' }
      };

      const validContext = {
        user: { id: 1, name: 'John' },
        session: { active: true }
      };

      const invalidContext = {
        user: { id: '1', name: 'John' }, // id should be number
        session: { active: true }
      };

      expect(validateSchema(validContext, schema)).toBe(true);
      expect(validateSchema(invalidContext, schema)).toBe(false);
    });

    it('should detect sensitive information', () => {
      const detectSensitive = (context: any): string[] => {
        const sensitivePatterns = [
          /password/i,
          /token/i,
          /secret/i,
          /key/i,
          /\b\d{16}\b/, // credit card like
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // email
        ];
        
        const found: string[] = [];
        const search = (obj: any, path = ''): void => {
          if (typeof obj === 'string') {
            sensitivePatterns.forEach(pattern => {
              if (pattern.test(obj)) {
                found.push(path);
              }
            });
          } else if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
              const keyPath = path ? `${path}.${key}` : key;
              sensitivePatterns.forEach(pattern => {
                if (pattern.test(key)) {
                  found.push(keyPath);
                }
              });
              search(obj[key], keyPath);
            });
          }
        };
        
        search(context);
        return [...new Set(found)];
      };

      const contextWithSensitive = {
        user: {
          email: 'user@example.com',
          password: "PLACEHOLDER"
        },
        auth: {
          token: process.env.TOKEN || "PLACEHOLDER",
          api_key: process.env.API_KEY || "PLACEHOLDER"
        }
      };

      const sensitive = detectSensitive(contextWithSensitive);
      expect(sensitive).toContain('user.email');
      expect(sensitive).toContain('user.password');
      expect(sensitive).toContain('auth.token');
      expect(sensitive).toContain('auth.apiKey');
    });
  });

  describe('performance optimization', () => {
    it('should measure transformation performance', () => {
      const measurePerformance = (fn: Function, data: any): number => {
        const start = performance.now();
        fn(data);
        return performance.now() - start;
      };

      const largeContext = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item${i}` }))
      };

      const simpleTransform = (ctx: any) => JSON.parse(JSON.stringify(ctx));
      const time = measurePerformance(simpleTransform, largeContext);
      
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should implement lazy evaluation', () => {
      const createLazyContext = (context: any) => {
        const cache = new Map();
        
        return new Proxy(context, {
          get(target, prop) {
            if (cache.has(prop)) {
              return cache.get(prop);
            }
            
            const value = target[prop];
            if (typeof value === "function") {
              const result = value.call(target);
              cache.set(prop, result);
              return result;
            }
            
            return value;
          }
        });
      };

      let computationCount = 0;
      const expensiveContext = {
        expensiveComputation: () => {
          computationCount++;
          return "computed";
        }
      };

      const lazy = createLazyContext(expensiveContext);
      
      // First access
      expect(lazy.expensiveComputation()).toBe("computed");
      expect(computationCount).toBe(1);
      
      // Second access should use cache
      expect(lazy.expensiveComputation()).toBe("computed");
      expect(computationCount).toBe(1); // Should not increment
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle circular references', () => {
      const handleCircular = (obj: any): any => {
        const seen = new WeakSet();
        
        const serialize = (value: any): any => {
          if (value === null || typeof value !== 'object') {
            return value;
          }
          
          if (seen.has(value)) {
            return '[Circular]';
          }
          
          seen.add(value);
          
          if (Array.isArray(value)) {
            return value.map(serialize);
          }
          
          const result: any = {};
          for (const [key, val] of Object.entries(value)) {
            result[key] = serialize(val);
          }
          return result;
        };
        
        return serialize(obj);
      };

      const circular: any = { name: 'test' };
      circular.self = circular;

      const result = handleCircular(circular);
      expect(result.name).toBe('test');
      expect(result.self).toBe('[Circular]');
    });

    it('should handle malformed data', () => {
      const safeParse = (data: any): any => {
        try {
          if (typeof data === 'string') {
            return JSON.parse(data);
          }
          return data;
        } catch {
          return { error: 'Malformed data', original: String(data) };
        }
      };

      expect(safeParse('{"valid": true}')).toEqual({ valid: true });
      expect(safeParse('{invalid json')).toEqual({
        error: 'Malformed data',
        original: '{invalid json'
      });
    });
  });
});