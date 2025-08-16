/**
 * Flow Validator Tests
 * Comprehensive test suite for the Flow Validator implementation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  FlowValidator, 
  FlowDefinition, 
  FlowStep,
  ValidationResult,
  ValidationOptions 
} from '../src/core/FlowValidator';
import { ValidationRulesEngine } from '../src/rules/ValidationRulesEngine';
import { FlowAnalyzer } from '../src/analyzer/FlowAnalyzer';

describe('Flow Validator', () => {
  let validator: FlowValidator;
  let rulesEngine: ValidationRulesEngine;
  let analyzer: FlowAnalyzer;

  beforeEach(() => {
    validator = new FlowValidator();
    rulesEngine = new ValidationRulesEngine();
    analyzer = new FlowAnalyzer();
  });

  describe('Basic Validation', () => {
    it('should validate a simple flow', async () => {
      const flow: FlowDefinition = {
        id: 'simple-flow',
        name: 'Simple Flow',
        version: '1.0.0',
        description: 'A simple test flow',
        steps: [
          {
            id: 'start',
            name: 'Start',
            type: 'action',
            action: "initialize",
            next: 'process'
          },
          {
            id: 'process',
            name: 'Process Data',
            type: "transform",
            next: 'end'
          },
          {
            id: 'end',
            name: 'End',
            type: 'action',
            action: "finalize"
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalSteps).toBe(3);
      expect(result.stats.unreachableSteps).toBe(0);
    });

    it('should detect missing required fields', async () => {
      const flow: FlowDefinition = {
        id: '',
        name: '',
        version: '',
        steps: []
      };

      const result = await validator.validate(flow);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_VERSION')).toBe(true);
      expect(result.errors.some(e => e.code === 'NO_STEPS')).toBe(true);
    });

    it('should detect unreachable steps', async () => {
      const flow: FlowDefinition = {
        id: 'unreachable-flow',
        name: 'Unreachable Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'start',
            name: 'Start',
            type: 'action',
            action: "initialize",
            next: 'middle'
          },
          {
            id: 'middle',
            name: 'Middle',
            type: 'action',
            action: 'process'
          },
          {
            id: 'orphan',
            name: 'Orphan Step',
            type: 'action',
            action: "orphaned"
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'UNREACHABLE_STEP')).toBe(true);
      expect(result.stats.unreachableSteps).toBe(1);
    });

    it('should detect cycles in flow', async () => {
      const flow: FlowDefinition = {
        id: 'cyclic-flow',
        name: 'Cyclic Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'action',
            action: 'action1',
            next: 'step2'
          },
          {
            id: 'step2',
            name: 'Step 2',
            type: 'action',
            action: 'action2',
            next: 'step3'
          },
          {
            id: 'step3',
            name: 'Step 3',
            type: 'action',
            action: 'action3',
            next: 'step1' // Creates a cycle
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.warnings.some(w => w.code === 'CYCLE_DETECTED')).toBe(true);
    });

    it('should detect duplicate step IDs', async () => {
      const flow: FlowDefinition = {
        id: 'duplicate-flow',
        name: 'Duplicate Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'First Step',
            type: 'action',
            action: 'action1'
          },
          {
            id: 'step1', // Duplicate ID
            name: 'Second Step',
            type: 'action',
            action: 'action2'
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(true);
    });
  });

  describe('Complex Flow Validation', () => {
    it('should validate decision branches', async () => {
      const flow: FlowDefinition = {
        id: 'decision-flow',
        name: 'Decision Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'check',
            name: 'Check Condition',
            type: "decision",
            condition: 'value > 10',
            next: ['true-branch', 'false-branch']
          },
          {
            id: 'true-branch',
            name: 'True Branch',
            type: 'action',
            action: "handleTrue"
          },
          {
            id: 'false-branch',
            name: 'False Branch',
            type: 'action',
            action: "handleFalse"
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.valid).toBe(true);
      expect(result.stats.complexity).toBeGreaterThan(1);
    });

    it('should validate parallel execution', async () => {
      const flow: FlowDefinition = {
        id: 'parallel-flow',
        name: 'Parallel Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'fork',
            name: 'Fork',
            type: "parallel",
            next: ['task1', 'task2', 'task3']
          },
          {
            id: 'task1',
            name: 'Task 1',
            type: 'action',
            action: "executeTask1",
            next: 'join'
          },
          {
            id: 'task2',
            name: 'Task 2',
            type: 'action',
            action: "executeTask2",
            next: 'join'
          },
          {
            id: 'task3',
            name: 'Task 3',
            type: 'action',
            action: "executeTask3",
            next: 'join'
          },
          {
            id: 'join',
            name: 'Join',
            type: 'action',
            action: "mergeResults"
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.valid).toBe(true);
      expect(result.stats.totalConnections).toBe(4);
    });

    it('should validate loop steps', async () => {
      const flow: FlowDefinition = {
        id: 'loop-flow',
        name: 'Loop Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'loop',
            name: 'Process Items',
            type: 'loop',
            condition: 'items.length > 0',
            next: 'process'
          },
          {
            id: 'process',
            name: 'Process Item',
            type: 'action',
            action: "processItem",
            next: 'loop'
          }
        ]
      };

      const result = await validator.validate(flow);
      expect(result.warnings.some(w => w.code === 'CYCLE_DETECTED')).toBe(true);
    });
  });

  describe('Validation Rules Engine', () => {
    it('should apply built-in rules', () => {
      const flow: FlowDefinition = {
        id: 'rules-test',
        name: 'Rules Test',
        version: '1.0.0',
        steps: [
          {
            id: "decision",
            name: 'Make Decision',
            type: "decision",
            condition: 'true',
            next: 'single' // Should have multiple branches
          },
          {
            id: 'single',
            name: 'Single Branch',
            type: 'action',
            action: 'execute'
          }
        ]
      };

      const results = rulesEngine.evaluate(flow);
      const decisionRule = results.get('decision-has-branches');
      expect(decisionRule).toBeDefined();
      expect(decisionRule![0].passed).toBe(false);
    });

    it('should check for error handling', () => {
      const flow: FlowDefinition = {
        id: 'error-test',
        name: 'Error Test',
        version: '1.0.0',
        steps: [
          {
            id: "critical",
            name: 'Critical Operation',
            type: 'action',
            action: "criticalAction"
            // Missing error handler
          }
        ]
      };

      const results = rulesEngine.evaluate(flow);
      const errorRule = results.get('error-handling');
      expect(errorRule).toBeDefined();
      expect(errorRule![0].passed).toBe(false);
    });

    it('should detect sensitive data', () => {
      const flow: FlowDefinition = {
        id: 'security-test',
        name: 'Security Test',
        version: '1.0.0',
        steps: [
          {
            id: 'auth',
            name: "Authenticate",
            type: 'action',
            action: "authenticate",
            inputs: {
              username: 'user',
              password: "PLACEHOLDER" // Sensitive data
            }
          }
        ]
      };

      const results = rulesEngine.evaluate(flow);
      const securityRule = results.get('no-sensitive-data');
      expect(securityRule).toBeDefined();
      expect(securityRule![0].passed).toBe(false);
    });

    it('should convert rule results to validation results', () => {
      const flow: FlowDefinition = {
        id: 'convert-test',
        name: 'Convert Test',
        version: '1.0.0',
        steps: [
          {
            id: 'loop',
            name: 'Loop',
            type: 'loop'
            // Missing exit condition
          }
        ]
      };

      const ruleResults = rulesEngine.evaluate(flow);
      const { errors, warnings } = rulesEngine.toValidationResults(ruleResults);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.code === 'LOOP_HAS_EXIT')).toBe(true);
    });
  });

  describe('Flow Analyzer', () => {
    it('should analyze flow complexity', () => {
      const flow: FlowDefinition = {
        id: 'complex-flow',
        name: 'Complex Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'start',
            name: 'Start',
            type: 'action',
            action: 'init',
            next: "decision1"
          },
          {
            id: "decision1",
            name: 'Decision 1',
            type: "decision",
            condition: "condition1",
            next: ['branch1', 'branch2']
          },
          {
            id: 'branch1',
            name: 'Branch 1',
            type: 'action',
            action: 'action1',
            next: "decision2"
          },
          {
            id: 'branch2',
            name: 'Branch 2',
            type: 'action',
            action: 'action2',
            next: "decision2"
          },
          {
            id: "decision2",
            name: 'Decision 2',
            type: "decision",
            condition: "condition2",
            next: ['end1', 'end2']
          },
          {
            id: 'end1',
            name: 'End 1',
            type: 'action',
            action: 'finish1'
          },
          {
            id: 'end2',
            name: 'End 2',
            type: 'action',
            action: 'finish2'
          }
        ]
      };

      const metrics = analyzer.analyze(flow);
      
      expect(metrics.complexity.cyclomaticComplexity).toBeGreaterThan(1);
      expect(metrics.complexity.nestingDepth).toBeGreaterThan(0);
      expect(metrics.performance.criticalPath.length).toBeGreaterThan(0);
      expect(metrics.quality.testability).toBeLessThan(100);
    });

    it('should identify bottlenecks', () => {
      const flow: FlowDefinition = {
        id: 'bottleneck-flow',
        name: 'Bottleneck Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'slow',
            name: 'Slow Operation',
            type: 'action',
            action: "slowAction",
            timeout: 15000 // 15 seconds
          },
          {
            id: 'loop',
            name: 'Sequential Loop',
            type: 'loop',
            condition: 'hasMore'
          }
        ]
      };

      const metrics = analyzer.analyze(flow);
      
      expect(metrics.performance.bottlenecks.length).toBeGreaterThan(0);
      expect(metrics.performance.bottlenecks.some(b => b.stepId === 'slow')).toBe(true);
      expect(metrics.performance.bottlenecks.some(b => b.stepId === 'loop')).toBe(true);
    });

    it('should detect workflow patterns', () => {
      const flow: FlowDefinition = {
        id: 'pattern-flow',
        name: 'Pattern Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'start',
            name: 'Start',
            type: 'action',
            action: 'init',
            next: 'fork'
          },
          {
            id: 'fork',
            name: 'Fork',
            type: "parallel",
            next: ['task1', 'task2']
          },
          {
            id: 'task1',
            name: 'Task 1',
            type: 'action',
            action: "execute1",
            next: 'join'
          },
          {
            id: 'task2',
            name: 'Task 2',
            type: 'action',
            action: "execute2",
            next: 'join'
          },
          {
            id: 'join',
            name: 'Join',
            type: 'action',
            action: 'merge'
          }
        ]
      };

      const patterns = analyzer.detectPatterns(flow);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.name === 'Fork-Join Pattern')).toBe(true);
    });

    it('should generate optimization suggestions', () => {
      const flow: FlowDefinition = {
        id: 'optimize-flow',
        name: 'Optimize Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'fetch1',
            name: 'Fetch Data 1',
            type: 'action',
            action: "fetchData1",
            next: 'fetch2'
          },
          {
            id: 'fetch2',
            name: 'Fetch Data 2',
            type: 'action',
            action: "fetchData2",
            next: 'process'
          },
          {
            id: 'process',
            name: 'Process',
            type: 'action',
            action: "processData"
          }
        ],
        variables: {
          unused1: {
            name: 'unused1',
            type: 'string',
            defaultValue: 'test'
          }
        }
      };

      const suggestions = analyzer.generateOptimizations(flow);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'caching')).toBe(true);
      expect(suggestions.some(s => s.type === 'removal')).toBe(true);
    });

    it('should calculate quality metrics', () => {
      const flow: FlowDefinition = {
        id: 'quality-flow',
        name: 'Q',  // Poor naming
        version: '1.0.0',
        // No description
        steps: [
          {
            id: 's1',  // Poor naming
            name: 'S',  // Poor naming
            type: 'action',
            action: "doSomething",
            errorHandler: {
              type: 'retry',
              message: 'Retry on failure'
            }
          }
        ]
      };

      const metrics = analyzer.analyze(flow);
      
      expect(metrics.quality.documentation).toBeLessThan(100);
      expect(metrics.quality.maintainability).toBeLessThan(100);
      expect(metrics.quality.errorHandlingCoverage).toBeGreaterThan(0);
    });
  });

  describe('Custom Validators', () => {
    it('should register and execute custom validators', async () => {
      const customValidator = jest.fn((flow: FlowDefinition) => {
        if (flow.steps.length > 5) {
          return [{
            code: 'TOO_MANY_STEPS',
            message: 'Flow has too many steps',
            path: 'flow.steps',
            severity: 'error' as const
          }];
        }
        return [];
      });

      validator.registerValidator("maxSteps", customValidator);

      const flow: FlowDefinition = {
        id: 'large-flow',
        name: 'Large Flow',
        version: '1.0.0',
        steps: Array.from({ length: 6 }, (_, i) => ({
          id: `step${i}`,
          name: `Step ${i}`,
          type: 'action' as const,
          action: `action${i}`
        }))
      };

      const result = await validator.validate(flow);
      
      expect(customValidator).toHaveBeenCalledWith(flow);
      expect(result.errors.some(e => e.code === 'TOO_MANY_STEPS')).toBe(true);
    });

    it('should handle custom validator errors gracefully', async () => {
      const faultyValidator = jest.fn(() => {
        throw new Error('Validator error');
      });

      validator.registerValidator('faulty', faultyValidator);

      const flow: FlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        version: '1.0.0',
        steps: [{
          id: 'step1',
          name: 'Step 1',
          type: 'action',
          action: 'action1'
        }]
      };

      const result = await validator.validate(flow);
      
      expect(result.errors.some(e => e.code === 'CUSTOM_VALIDATOR_ERROR')).toBe(true);
    });
  });

  describe('Validation Options', () => {
    it('should respect strict mode', async () => {
      const strictValidator = new FlowValidator({ strictMode: true });
      const lenientValidator = new FlowValidator({ strictMode: false });

      const flow: FlowDefinition = {
        id: 'warning-flow',
        name: 'Warning Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'action',
            action: 'action1',
            next: 'step2'
          },
          {
            id: 'step2',
            name: 'Step 2',
            type: 'loop',
            condition: 'hasMore',
            next: 'step1' // Creates a cycle (warning)
          }
        ]
      };

      const strictResult = await strictValidator.validate(flow);
      const lenientResult = await lenientValidator.validate(flow);

      expect(strictResult.valid).toBe(false); // Warnings cause failure in strict mode
      expect(lenientResult.valid).toBe(true); // Warnings don't cause failure in lenient mode
    });

    it('should skip optional checks when disabled', async () => {
      const validator = new FlowValidator({
        checkUnreachable: false,
        checkCycles: false,
        checkDuplicates: false
      });

      const flow: FlowDefinition = {
        id: 'skip-checks',
        name: 'Skip Checks',
        version: '1.0.0',
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            type: 'action',
            action: 'action1',
            next: 'step1' // Self-cycle
          },
          {
            id: 'step1', // Duplicate ID
            name: "Duplicate",
            type: 'action',
            action: 'action2'
          },
          {
            id: "unreachable",
            name: "Unreachable",
            type: 'action',
            action: "unreachable"
          }
        ]
      };

      const result = await validator.validate(flow);
      
      // These errors should not be present since checks are disabled
      expect(result.errors.some(e => e.code === 'UNREACHABLE_STEP')).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_ID')).toBe(false);
      expect(result.warnings.some(w => w.code === 'CYCLE_DETECTED')).toBe(false);
    });
  });
});