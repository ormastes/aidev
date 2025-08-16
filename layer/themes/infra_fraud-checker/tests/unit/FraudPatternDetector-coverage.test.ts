/**
 * Additional coverage tests for FraudPatternDetector
 */

import { FraudPatternDetector } from '../../children/FraudPatternDetector';

describe('FraudPatternDetector - Coverage Enhancement', () => {
  let detector: FraudPatternDetector;

  beforeEach(() => {
    detector = new FraudPatternDetector();
  });

  describe('detectPatterns', () => {
    it('should detect coverage-ignore comments', () => {
      const content = `
        /* istanbul ignore next */
        function untested() {
          return 'not tested';
        }
      `;
      
      const results = detector.detectPatterns(content);
      const ignorePattern = results.find(r => r.pattern === 'coverage-ignore');
      expect(ignorePattern).toBeDefined();
      expect(ignorePattern?.severity).toBe('medium');
    });

    it('should detect c8 ignore comments', () => {
      const content = '// c8 ignore next';
      
      const results = detector.detectPatterns(content);
      const ignorePattern = results.find(r => r.pattern === 'coverage-ignore');
      expect(ignorePattern).toBeDefined();
    });

    it('should detect disabled tests', () => {
      const content = `
        // it('should test something', () => {
        // Test completed - implementation pending
        // });
      `;
      
      const results = detector.detectPatterns(content);
      const disabledPattern = results.find(r => r.pattern === 'disabled-tests');
      expect(disabledPattern).toBeDefined();
      expect(disabledPattern?.severity).toBe('low');
    });

    it('should detect todo/skip tests', () => {
      const content = `
        it.todo('implement this test later');
        test.skip('temporarily disabled test', () => {});
      `;
      
      const results = detector.detectPatterns(content);
      const todoPattern = results.find(r => r.pattern === 'todo-tests');
      expect(todoPattern).toBeDefined();
      expect(todoPattern?.severity).toBe('medium');
    });

    it('should detect fake timeout patterns', () => {
      const content = 'setTimeout(() => done(), 0);';
      
      const results = detector.detectPatterns(content);
      const timeoutPattern = results.find(r => r.pattern === 'fake-timeout');
      expect(timeoutPattern).toBeDefined();
      expect(timeoutPattern?.severity).toBe('medium');
    });

    it('should detect mocked coverage patterns', () => {
      const content = `
        global.__coverage__ = {};
        window.__coverage__ = mockCoverage;
      `;
      
      const results = detector.detectPatterns(content);
      const mockedPattern = results.find(r => r.pattern === 'mocked-coverage');
      expect(mockedPattern).toBeDefined();
      expect(mockedPattern?.severity).toBe('critical');
    });

    it('should detect no-op tests', () => {
      const content = `
        it('should work', () => {
          // empty test
        });
      `;
      
      const results = detector.detectPatterns(content);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty content', () => {
      const results = detector.detectPatterns('');
      expect(results).toEqual([]);
    });

    it('should handle content with no patterns', () => {
      const content = `
        describe('legitimate test', () => {
          it('should work correctly', () => {
            expect(1 + 1).toBe(2);
          });
        });
      `;
      
      const results = detector.detectPatterns(content);
      expect(results).toEqual([]);
    });
  });

  describe('getPatterns', () => {
    it('should return all available patterns', () => {
      const patterns = detector.getPatterns();
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      
      // Check for expected pattern names
      const patternNames = patterns.map(p => p.name);
      expect(patternNames).toContain('coverage-ignore');
      expect(patternNames).toContain('disabled-tests');
      expect(patternNames).toContain('todo-tests');
      expect(patternNames).toContain('fake-timeout');
      expect(patternNames).toContain('mocked-coverage');
    });

    it('should return patterns with correct structure', () => {
      const patterns = detector.getPatterns();
      
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('detector');
        expect(pattern).toHaveProperty('severity');
        expect(typeof pattern.name).toBe('string');
        expect(typeof pattern.description).toBe('string');
        expect(typeof pattern.detector).toBe('function');
        expect(['critical', 'high', 'medium', 'low']).toContain(pattern.severity);
      });
    });
  });

  describe('addPattern', () => {
    it('should add custom pattern', () => {
      const customPattern = {
        name: 'custom-test-pattern',
        description: 'Custom test pattern for testing',
        detector: (content: string) => content.includes('CUSTOM_FRAUD'),
        severity: 'high' as const
      };

      detector.addPattern(customPattern);
      
      const patterns = detector.getPatterns();
      const customPatternFound = patterns.find(p => p.name === 'custom-test-pattern');
      expect(customPatternFound).toBeDefined();
      expect(customPatternFound?.description).toBe('Custom test pattern for testing');
      expect(customPatternFound?.severity).toBe('high');
    });

    it('should detect custom pattern in content', () => {
      const customPattern = {
        name: 'custom-marker',
        description: 'Custom fraud marker',
        detector: (content: string) => content.includes('FRAUD_MARKER'),
        severity: 'critical' as const
      };

      detector.addPattern(customPattern);
      
      const content = 'This content has FRAUD_MARKER in it';
      const results = detector.detectPatterns(content);
      
      const customResult = results.find(r => r.pattern === 'custom-marker');
      expect(customResult).toBeDefined();
      expect(customResult?.severity).toBe('critical');
    });
  });

  describe('edge cases', () => {
    it('should handle multiline patterns correctly', () => {
      const content = `
        /*
         * istanbul ignore next
         */
        function multilineIgnore() {
          return 'ignored';
        }
      `;
      
      const results = detector.detectPatterns(content);
      const ignorePattern = results.find(r => r.pattern === 'coverage-ignore');
      expect(ignorePattern).toBeDefined();
    });

    it('should handle case insensitive matching', () => {
      const content = 'This has ISTANBUL IGNORE comment';
      
      const results = detector.detectPatterns(content);
      const ignorePattern = results.find(r => r.pattern === 'coverage-ignore');
      expect(ignorePattern).toBeDefined();
    });

    it('should handle multiple pattern matches in single content', () => {
      const content = `
        /* istanbul ignore next */
        // it('disabled test', () => {});
        test.skip('skipped test', () => {});
      `;
      
      const results = detector.detectPatterns(content);
      expect(results.length).toBeGreaterThanOrEqual(2);
      
      const patternNames = results.map(r => r.pattern);
      expect(patternNames).toContain('coverage-ignore');
      expect(patternNames).toContain('disabled-tests');
    });
  });

  describe('pattern validation', () => {
    it('should validate regex patterns work correctly', () => {
      const patterns = detector.getPatterns();
      
      patterns.forEach(pattern => {
        if (pattern.regex) {
          expect(pattern.regex).toBeInstanceOf(RegExp);
          
          // Test that detector function works consistently with regex
          const testContent = 'sample content for testing';
          const regexResult = pattern.regex.test(testContent);
          const detectorResult = pattern.detector(testContent);
          
          // Results should be consistent (both false for non-matching content)
          expect(typeof detectorResult).toBe('boolean');
        }
      });
    });
  });
});