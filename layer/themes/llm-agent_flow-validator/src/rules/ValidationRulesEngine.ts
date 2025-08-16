/**
 * Validation Rules Engine
 * Provides a flexible rule-based validation system for flow definitions
 */

import { FlowDefinition, FlowStep, ValidationError, ValidationWarning } from '../core/FlowValidator';

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'logic' | 'performance' | 'security' | 'best-practice';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  evaluate: (flow: FlowDefinition, context: RuleContext) => RuleResult[];
}

export interface RuleContext {
  previousFlows?: FlowDefinition[];
  metadata?: Record<string, any>;
  environment?: 'development' | 'staging' | 'production';
  strict?: boolean;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  message?: string;
  path?: string;
  suggestion?: string;
  data?: any;
}

export class ValidationRulesEngine {
  private rules: Map<string, RuleDefinition> = new Map();
  private ruleCategories: Map<string, Set<string>> = new Map();
  
  constructor() {
    this.registerBuiltInRules();
  }

  /**
   * Register built-in validation rules
   */
  private registerBuiltInRules(): void {
    // Structure Rules
    this.registerRule({
      id: 'no-orphan-steps',
      name: 'No Orphan Steps',
      description: 'Ensures all steps are connected to the flow',
      category: 'structure',
      severity: 'error',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const connected = new Set<string>();
        
        // Mark entry points as connected
        if (flow.steps.length > 0) {
          connected.add(flow.steps[0].id);
        }
        
        // Find all connections
        flow.steps.forEach(step => {
          if (step.next) {
            const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
            nextSteps.forEach(id => connected.add(id));
          }
        });
        
        // Check for orphans
        flow.steps.forEach(step => {
          if (!connected.has(step.id) && step !== flow.steps[0]) {
            results.push({
              ruleId: 'no-orphan-steps',
              passed: false,
              message: `Step '${step.id}' is orphaned and not connected to the flow`,
              path: `steps.${step.id}`,
              suggestion: 'Connect this step to the flow or remove it'
            });
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'no-orphan-steps', passed: true }] : results;
      }
    });

    this.registerRule({
      id: 'unique-step-names',
      name: 'Unique Step Names',
      description: 'Ensures all step names are unique for clarity',
      category: 'best-practice',
      severity: 'warning',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const names = new Map<string, string[]>();
        
        flow.steps.forEach(step => {
          const existing = names.get(step.name) || [];
          existing.push(step.id);
          names.set(step.name, existing);
        });
        
        names.forEach((ids, name) => {
          if (ids.length > 1) {
            results.push({
              ruleId: 'unique-step-names',
              passed: false,
              message: `Step name '${name}' is used by multiple steps: ${ids.join(', ')}`,
              suggestion: 'Use unique, descriptive names for each step'
            });
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'unique-step-names', passed: true }] : results;
      }
    });

    // Logic Rules
    this.registerRule({
      id: 'decision-has-branches',
      name: 'Decision Has Branches',
      description: 'Ensures decision steps have multiple branches',
      category: 'logic',
      severity: 'error',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        
        flow.steps.forEach(step => {
          if (step.type === 'decision') {
            if (!step.next || (Array.isArray(step.next) && step.next.length < 2)) {
              results.push({
                ruleId: 'decision-has-branches',
                passed: false,
                message: `Decision step '${step.id}' must have at least 2 branches`,
                path: `steps.${step.id}.next`,
                suggestion: 'Add both true and false branches to the decision'
              });
            }
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'decision-has-branches', passed: true }] : results;
      }
    });

    this.registerRule({
      id: 'loop-has-exit',
      name: 'Loop Has Exit Condition',
      description: 'Ensures loop steps have exit conditions',
      category: 'logic',
      severity: 'error',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        
        flow.steps.forEach(step => {
          if (step.type === 'loop') {
            if (!step.condition) {
              results.push({
                ruleId: 'loop-has-exit',
                passed: false,
                message: `Loop step '${step.id}' must have an exit condition`,
                path: `steps.${step.id}.condition`,
                suggestion: 'Add a condition to prevent infinite loops'
              });
            }
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'loop-has-exit', passed: true }] : results;
      }
    });

    // Performance Rules
    this.registerRule({
      id: 'parallel-step-limit',
      name: 'Parallel Step Limit',
      description: 'Warns when parallel steps exceed recommended limit',
      category: 'performance',
      severity: 'warning',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const MAX_PARALLEL = 10;
        
        flow.steps.forEach(step => {
          if (step.type === 'parallel' && step.next && Array.isArray(step.next)) {
            if (step.next.length > MAX_PARALLEL) {
              results.push({
                ruleId: 'parallel-step-limit',
                passed: false,
                message: `Parallel step '${step.id}' has ${step.next.length} branches (max recommended: ${MAX_PARALLEL})`,
                path: `steps.${step.id}.next`,
                suggestion: 'Consider batching or queuing for better performance'
              });
            }
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'parallel-step-limit', passed: true }] : results;
      }
    });

    this.registerRule({
      id: 'timeout-configured',
      name: 'Timeout Configuration',
      description: 'Ensures long-running steps have timeouts',
      category: 'performance',
      severity: 'warning',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const LONG_RUNNING_TYPES = ['action', 'wait'];
        
        flow.steps.forEach(step => {
          if (LONG_RUNNING_TYPES.includes(step.type) && !step.timeout) {
            results.push({
              ruleId: 'timeout-configured',
              passed: false,
              message: `Step '${step.id}' should have a timeout configured`,
              path: `steps.${step.id}.timeout`,
              suggestion: 'Add a timeout to prevent hanging operations'
            });
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'timeout-configured', passed: true }] : results;
      }
    });

    // Security Rules
    this.registerRule({
      id: 'no-sensitive-data',
      name: 'No Sensitive Data',
      description: 'Checks for potential sensitive data in flow',
      category: 'security',
      severity: 'error',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const SENSITIVE_PATTERNS = [
          /password/i,
          /secret/i,
          /api[_-]?key/i,
          /token/i,
          /credential/i
        ];
        
        const checkValue = (value: any, path: string): void => {
          if (typeof value === 'string') {
            SENSITIVE_PATTERNS.forEach(pattern => {
              if (pattern.test(value)) {
                results.push({
                  ruleId: 'no-sensitive-data',
                  passed: false,
                  message: `Potential sensitive data found at ${path}`,
                  path,
                  suggestion: 'Use secure variable storage or environment variables'
                });
              }
            });
          }
        };
        
        // Check step inputs
        flow.steps.forEach(step => {
          if (step.inputs) {
            Object.entries(step.inputs).forEach(([key, value]) => {
              checkValue(value, `steps.${step.id}.inputs.${key}`);
            });
          }
        });
        
        // Check variables
        if (flow.variables) {
          Object.entries(flow.variables).forEach(([name, variable]) => {
            if (variable.defaultValue) {
              checkValue(variable.defaultValue, `variables.${name}.defaultValue`);
            }
          });
        }
        
        return results.length === 0 ? [{ ruleId: 'no-sensitive-data', passed: true }] : results;
      }
    });

    // Best Practice Rules
    this.registerRule({
      id: 'error-handling',
      name: 'Error Handling',
      description: 'Ensures critical steps have error handlers',
      category: 'best-practice',
      severity: 'warning',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const CRITICAL_TYPES = ['action', 'transform'];
        
        flow.steps.forEach(step => {
          if (CRITICAL_TYPES.includes(step.type) && !step.errorHandler) {
            results.push({
              ruleId: 'error-handling',
              passed: false,
              message: `Critical step '${step.id}' should have error handling`,
              path: `steps.${step.id}.errorHandler`,
              suggestion: 'Add error handling to manage failures gracefully'
            });
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'error-handling', passed: true }] : results;
      }
    });

    this.registerRule({
      id: 'descriptive-naming',
      name: 'Descriptive Naming',
      description: 'Checks for descriptive step and variable names',
      category: 'best-practice',
      severity: 'info',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        const MIN_NAME_LENGTH = 3;
        const GENERIC_NAMES = ['step', 'var', 'temp', 'test', 'data'];
        
        flow.steps.forEach(step => {
          if (step.name.length < MIN_NAME_LENGTH) {
            results.push({
              ruleId: 'descriptive-naming',
              passed: false,
              message: `Step '${step.id}' has a very short name '${step.name}'`,
              path: `steps.${step.id}.name`,
              suggestion: 'Use descriptive names that explain the step\'s purpose'
            });
          }
          
          const lowerName = step.name.toLowerCase();
          if (GENERIC_NAMES.some(generic => lowerName.includes(generic))) {
            results.push({
              ruleId: 'descriptive-naming',
              passed: false,
              message: `Step '${step.id}' has a generic name '${step.name}'`,
              path: `steps.${step.id}.name`,
              suggestion: 'Use specific, meaningful names'
            });
          }
        });
        
        return results.length === 0 ? [{ ruleId: 'descriptive-naming', passed: true }] : results;
      }
    });

    this.registerRule({
      id: 'flow-documentation',
      name: 'Flow Documentation',
      description: 'Ensures flow has adequate documentation',
      category: 'best-practice',
      severity: 'info',
      enabled: true,
      evaluate: (flow) => {
        const results: RuleResult[] = [];
        
        if (!flow.description || flow.description.length < 10) {
          results.push({
            ruleId: 'flow-documentation',
            passed: false,
            message: 'Flow lacks adequate description',
            path: 'description',
            suggestion: 'Add a comprehensive description of the flow\'s purpose and behavior'
          });
        }
        
        return results.length === 0 ? [{ ruleId: 'flow-documentation', passed: true }] : results;
      }
    });
  }

  /**
   * Register a custom rule
   */
  registerRule(rule: RuleDefinition): void {
    this.rules.set(rule.id, rule);
    
    // Update category index
    if (!this.ruleCategories.has(rule.category)) {
      this.ruleCategories.set(rule.category, new Set());
    }
    this.ruleCategories.get(rule.category)!.add(rule.id);
  }

  /**
   * Unregister a rule
   */
  unregisterRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      this.ruleCategories.get(rule.category)?.delete(ruleId);
    }
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Run all enabled rules
   */
  evaluate(flow: FlowDefinition, context?: RuleContext): Map<string, RuleResult[]> {
    const results = new Map<string, RuleResult[]>();
    
    for (const [ruleId, rule] of this.rules) {
      if (rule.enabled) {
        try {
          const ruleResults = rule.evaluate(flow, context || {});
          results.set(ruleId, ruleResults);
        } catch (error) {
          results.set(ruleId, [{
            ruleId,
            passed: false,
            message: `Rule evaluation failed: ${error}`,
            data: { error }
          }]);
        }
      }
    }
    
    return results;
  }

  /**
   * Run rules by category
   */
  evaluateCategory(flow: FlowDefinition, category: string, context?: RuleContext): Map<string, RuleResult[]> {
    const results = new Map<string, RuleResult[]>();
    const ruleIds = this.ruleCategories.get(category);
    
    if (ruleIds) {
      for (const ruleId of ruleIds) {
        const rule = this.rules.get(ruleId);
        if (rule && rule.enabled) {
          try {
            const ruleResults = rule.evaluate(flow, context || {});
            results.set(ruleId, ruleResults);
          } catch (error) {
            results.set(ruleId, [{
              ruleId,
              passed: false,
              message: `Rule evaluation failed: ${error}`,
              data: { error }
            }]);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Get all rules
   */
  getRules(): RuleDefinition[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): RuleDefinition[] {
    const ruleIds = this.ruleCategories.get(category);
    if (!ruleIds) return [];
    
    return Array.from(ruleIds)
      .map(id => this.rules.get(id))
      .filter(rule => rule !== undefined) as RuleDefinition[];
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): RuleDefinition | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Convert rule results to validation errors/warnings
   */
  toValidationResults(ruleResults: Map<string, RuleResult[]>): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const [ruleId, results] of ruleResults) {
      const rule = this.rules.get(ruleId);
      if (!rule) continue;
      
      for (const result of results) {
        if (!result.passed && result.message) {
          if (rule.severity === 'error') {
            errors.push({
              code: ruleId.toUpperCase().replace(/-/g, '_'),
              message: result.message,
              path: result.path || '',
              severity: 'error',
              suggestion: result.suggestion
            });
          } else if (rule.severity === 'warning' || rule.severity === 'info') {
            warnings.push({
              code: ruleId.toUpperCase().replace(/-/g, '_'),
              message: result.message,
              path: result.path || '',
              suggestion: result.suggestion
            });
          }
        }
      }
    }
    
    return { errors, warnings };
  }
}

// Export singleton instance
export const rulesEngine = new ValidationRulesEngine();