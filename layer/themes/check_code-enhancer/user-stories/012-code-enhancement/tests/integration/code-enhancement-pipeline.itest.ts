/**
 * Integration tests for Code Enhancement Pipeline
 */

import { CodeEnhancer } from '../../src/code-enhancer';
import { CodeAnalyzer } from '../../src/code-analyzer';
import { RefactoringEngine } from '../../src/refactoring-engine';
import { QualityChecker } from '../../src/quality-checker';
import { OptimizationEngine } from '../../src/optimization-engine';
import { 
  EnhancementConfig, 
  CodeFile, 
  EnhancementResult,
  RefactoringType,
  OptimizationLevel 
} from '../../src/types';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Code Enhancement Pipeline Integration', () => {
  let codeEnhancer: CodeEnhancer;
  let codeAnalyzer: CodeAnalyzer;
  let refactoringEngine: RefactoringEngine;
  let qualityChecker: QualityChecker;
  let optimizationEngine: OptimizationEngine;
  let testProjectDir: string;

  beforeEach(async () => {
    // Setup test project directory
    testProjectDir = `/tmp/code-enhancement-test-${Date.now()}`;
    await fs.mkdir(testProjectDir, { recursive: true });

    // Initialize components
    codeAnalyzer = new CodeAnalyzer();
    refactoringEngine = new RefactoringEngine();
    qualityChecker = new QualityChecker();
    optimizationEngine = new OptimizationEngine();

    codeEnhancer = new CodeEnhancer({
      analyzer: codeAnalyzer,
      refactorer: refactoringEngine,
      qualityChecker,
      optimizer: optimizationEngine,
      workingDir: testProjectDir
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  describe('Complete Enhancement Pipeline', () => {
    it('should enhance JavaScript code through full pipeline', async () => {
      const originalCode = `
        function calculate(x, y, z) {
          var result = x + y;
          result = result * z;
          console.log("Result: " + result);
          return result;
        }
        
        function doSomething() {
          var a = 10;
          var b = 20;
          var c = 2;
          return calculate(a, b, c);
        }
      `;

      const config: EnhancementConfig = {
        language: 'javascript',
        refactorings: [
          RefactoringType.MODERNIZE_SYNTAX,
          RefactoringType.EXTRACT_CONSTANTS,
          RefactoringType.IMPROVE_NAMING
        ],
        optimizations: {
          level: OptimizationLevel.MODERATE,
          preserveReadability: true
        },
        qualityTargets: {
          minScore: 80,
          maxComplexity: 5
        }
      };

      const result = await codeEnhancer.enhance(originalCode, config);

      expect(result.success).toBe(true);
      expect(result.enhancedCode).toContain('const');
      expect(result.enhancedCode).not.toContain('var');
      expect(result.enhancedCode).toContain('`Result: ${result}`');
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    it('should enhance TypeScript code with type improvements', async () => {
      const originalCode = `
        function processData(data: any): any {
          if (data.items) {
            return data.items.map((item: any) => {
              return {
                id: item.id,
                name: item.name.toUpperCase()
              };
            });
          }
          return [];
        }
      `;

      const config: EnhancementConfig = {
        language: 'typescript',
        refactorings: [
          RefactoringType.IMPROVE_TYPES,
          RefactoringType.ADD_TYPE_GUARDS
        ],
        enableTypeInference: true
      };

      const result = await codeEnhancer.enhance(originalCode, config);

      expect(result.enhancedCode).not.toContain(': any');
      expect(result.enhancedCode).toContain('interface');
      expect(result.enhancedCode).toContain('type guard');
      expect(result.improvements).toContain('Replaced any types with specific interfaces');
    });
  });

  describe('Analysis Integration', () => {
    it('should analyze code quality before and after enhancement', async () => {
      const code = `
        function complexFunction(a, b, c, d, e) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                if (d > 0) {
                  if (e > 0) {
                    return a + b + c + d + e;
                  }
                }
              }
            }
          }
          return 0;
        }
      `;

      const beforeAnalysis = await codeAnalyzer.analyze(code);
      expect(beforeAnalysis.complexity).toBeGreaterThan(5);
      expect(beforeAnalysis.issues).toContainEqual(
        expect.objectContaining({ type: 'high-complexity' })
      );

      const config: EnhancementConfig = {
        language: 'javascript',
        refactorings: [RefactoringType.REDUCE_COMPLEXITY]
      };

      const result = await codeEnhancer.enhance(code, config);
      const afterAnalysis = await codeAnalyzer.analyze(result.enhancedCode);

      expect(afterAnalysis.complexity).toBeLessThan(beforeAnalysis.complexity);
      expect(afterAnalysis.maintainabilityIndex).toBeGreaterThan(
        beforeAnalysis.maintainabilityIndex
      );
    });
  });

  describe('Refactoring Integration', () => {
    it('should apply multiple refactorings in correct order', async () => {
      const code = `
        function getUserData(userId) {
          var userData = null;
          // Get user from database
          userData = db.getUser(userId);
          if (userData != null) {
            var fullName = userData.firstName + " " + userData.lastName;
            userData.fullName = fullName;
          }
          return userData;
        }
      `;

      const config: EnhancementConfig = {
        language: 'javascript',
        refactorings: [
          RefactoringType.MODERNIZE_SYNTAX,
          RefactoringType.IMPROVE_NULL_CHECKS,
          RefactoringType.EXTRACT_METHOD,
          RefactoringType.ADD_DOCUMENTATION
        ]
      };

      const result = await codeEnhancer.enhance(code, config);

      expect(result.enhancedCode).toContain('const');
      expect(result.enhancedCode).toContain('??');
      expect(result.enhancedCode).toContain('function getFullName');
      expect(result.enhancedCode).toContain('/**');
      expect(result.refactoringsApplied).toHaveLength(4);
    });

    it('should handle refactoring conflicts gracefully', async () => {
      const code = `
        const value = condition ? longCalculation() : anotherLongCalculation();
      `;

      const config: EnhancementConfig = {
        language: 'javascript',
        refactorings: [
          RefactoringType.EXTRACT_VARIABLE,
          RefactoringType.INLINE_VARIABLE
        ]
      };

      const result = await codeEnhancer.enhance(code, config);

      expect(result.success).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Conflicting refactorings')
      );
    });
  });

  describe('Optimization Integration', () => {
    it('should optimize performance while maintaining readability', async () => {
      const code = `
        function findDuplicates(array) {
          const duplicates = [];
          for (let i = 0; i < array.length; i++) {
            for (let j = i + 1; j < array.length; j++) {
              if (array[i] === array[j] && !duplicates.includes(array[i])) {
                duplicates.push(array[i]);
              }
            }
          }
          return duplicates;
        }
      `;

      const config: EnhancementConfig = {
        language: 'javascript',
        optimizations: {
          level: OptimizationLevel.AGGRESSIVE,
          preserveReadability: true,
          targetMetrics: ['time-complexity', 'space-complexity']
        }
      };

      const result = await codeEnhancer.enhance(code, config);

      expect(result.enhancedCode).toContain('Set');
      expect(result.performanceImprovement).toBeGreaterThan(0);
      expect(result.metrics.timeComplexity).toBe('O(n)');
      expect(result.metrics.originalTimeComplexity).toBe('O(n²)');
    });
  });

  describe('Multi-file Enhancement', () => {
    it('should enhance entire project maintaining consistency', async () => {
      // Create test project files
      await fs.writeFile(
        path.join(testProjectDir, 'utils.js'),
        `
          function formatDate(date) {
            return date.toLocaleDateString();
          }
          
          module.exports = { formatDate };
        `
      );

      await fs.writeFile(
        path.join(testProjectDir, 'main.js'),
        `
          const utils = require('./utils');
          
          function processOrder(order) {
            var date = new Date(order.date);
            var formatted = utils.formatDate(date);
            console.log("Order date: " + formatted);
          }
        `
      );

      const config: EnhancementConfig = {
        language: 'javascript',
        projectMode: true,
        refactorings: [
          RefactoringType.MODERNIZE_SYNTAX,
          RefactoringType.CONVERT_TO_ES_MODULES
        ]
      };

      const result = await codeEnhancer.enhanceProject(testProjectDir, config);

      expect(result.filesEnhanced).toBe(2);
      
      const enhancedUtils = await fs.readFile(
        path.join(testProjectDir, 'enhanced', 'utils.js'),
        'utf-8'
      );
      const enhancedMain = await fs.readFile(
        path.join(testProjectDir, 'enhanced', 'main.js'),
        'utf-8'
      );

      expect(enhancedUtils).toContain('export');
      expect(enhancedMain).toContain('import');
      expect(enhancedMain).toContain('const');
      expect(enhancedMain).toContain('`Order date: ${formatted}`');
    });
  });

  describe('Quality Assurance', () => {
    it('should ensure enhanced code meets quality targets', async () => {
      const poorQualityCode = `
        function x(a,b,c){var d=a+b;if(d>c){return d*c}else{return c-d}}
      `;

      const config: EnhancementConfig = {
        language: 'javascript',
        qualityTargets: {
          minScore: 85,
          maxComplexity: 3,
          minTestCoverage: 80
        },
        generateTests: true
      };

      const result = await codeEnhancer.enhance(poorQualityCode, config);

      const qualityReport = await qualityChecker.check(result.enhancedCode);

      expect(qualityReport.score).toBeGreaterThanOrEqual(85);
      expect(qualityReport.complexity).toBeLessThanOrEqual(3);
      expect(result.generatedTests).toBeDefined();
      expect(result.generatedTests.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should handle syntax errors gracefully', async () => {
      const invalidCode = `
        function broken(
          console.log("missing closing paren"
        }
      `;

      const config: EnhancementConfig = {
        language: 'javascript',
        attemptAutoFix: true
      };

      const result = await codeEnhancer.enhance(invalidCode, config);

      expect(result.success).toBe(true);
      expect(result.autoFixed).toBe(true);
      expect(result.enhancedCode).toContain('function broken()');
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Syntax errors auto-fixed')
      );
    });

    it('should rollback on enhancement failure', async () => {
      const code = 'const validCode = 42;';
      
      // Force a failure by requesting impossible refactoring
      const config: EnhancementConfig = {
        language: 'javascript',
        refactorings: ['INVALID_REFACTORING' as RefactoringType],
        rollbackOnFailure: true
      };

      const result = await codeEnhancer.enhance(code, config);

      expect(result.success).toBe(false);
      expect(result.enhancedCode).toBe(code); // Original code returned
      expect(result.errors).toContainEqual(
        expect.stringContaining('Unknown refactoring type')
      );
    });
  });

  describe('Custom Rules and Plugins', () => {
    it('should apply custom enhancement rules', async () => {
      // Register custom rule
      codeEnhancer.registerRule({
        name: 'company-naming-convention',
        apply: (code: string) => {
          return code.replace(/function (\w+)/g, (match, name) => {
            return `function company_${name}`;
          });
        }
      });

      const code = 'function processData() { return 42; }';
      
      const config: EnhancementConfig = {
        language: 'javascript',
        customRules: ['company-naming-convention']
      };

      const result = await codeEnhancer.enhance(code, config);

      expect(result.enhancedCode).toContain('function company_processData');
    });
  });
});