/**
 * Flow Validator Core Implementation
 * Validates and analyzes LLM agent workflow definitions and execution flows
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';

export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: FlowStep[];
  triggers?: FlowTrigger[];
  variables?: Record<string, Variable>;
  metadata?: Record<string, any>;
}

export interface FlowStep {
  id: string;
  name: string;
  type: 'action' | 'decision' | 'parallel' | 'loop' | 'wait' | 'transform';
  action?: string;
  condition?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  next?: string | string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  errorHandler?: ErrorHandler;
}

export interface FlowTrigger {
  id: string;
  type: 'manual' | 'scheduled' | 'event' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  required?: boolean;
  validation?: ValidationRule;
}

export interface ValidationRule {
  type: 'regex' | 'range' | 'enum' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'linear' | 'exponential';
  delayMs: number;
  maxDelayMs?: number;
}

export interface ErrorHandler {
  type: 'retry' | 'skip' | 'fail' | 'goto';
  target?: string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: ValidationStats;
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'critical';
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion?: string;
}

export interface ValidationStats {
  totalSteps: number;
  totalConnections: number;
  complexity: number;
  cyclomaticComplexity: number;
  maxDepth: number;
  unreachableSteps: number;
  duplicateIds: number;
}

export interface ValidationOptions {
  strictMode?: boolean;
  checkUnreachable?: boolean;
  checkCycles?: boolean;
  checkDuplicates?: boolean;
  checkTypes?: boolean;
  maxComplexity?: number;
  maxDepth?: number;
  customRules?: ValidationRule[];
}

export class FlowValidator extends EventEmitter {
  private options: Required<ValidationOptions>;
  private customValidators: Map<string, (flow: FlowDefinition) => ValidationError[]> = new Map();

  constructor(options?: ValidationOptions) {
    super();
    this.options = {
      strictMode: true,
      checkUnreachable: true,
      checkCycles: true,
      checkDuplicates: true,
      checkTypes: true,
      maxComplexity: 100,
      maxDepth: 10,
      customRules: [],
      ...options
    };
  }

  /**
   * Validate a flow definition
   */
  async validate(flow: FlowDefinition): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic structure validation
    errors.push(...this.validateStructure(flow));
    
    // Validate step connections
    if (this.options.checkUnreachable) {
      const unreachable = this.findUnreachableSteps(flow);
      errors.push(...unreachable);
    }
    
    // Check for cycles
    if (this.options.checkCycles) {
      const cycles = this.detectCycles(flow);
      if (cycles.length > 0) {
        warnings.push(...cycles.map(cycle => ({
          code: 'CYCLE_DETECTED',
          message: `Cycle detected in flow: ${cycle.join(' -> ')}`,
          path: `steps.${cycle[0]}`,
          suggestion: 'Consider adding exit conditions to avoid infinite loops'
        })));
      }
    }
    
    // Check for duplicate IDs
    if (this.options.checkDuplicates) {
      errors.push(...this.checkDuplicateIds(flow));
    }
    
    // Type validation
    if (this.options.checkTypes) {
      errors.push(...this.validateTypes(flow));
    }
    
    // Run custom validators
    for (const [name, validator] of this.customValidators) {
      try {
        const customErrors = validator(flow);
        errors.push(...customErrors);
      } catch (error) {
        errors.push({
          code: 'CUSTOM_VALIDATOR_ERROR',
          message: `Custom validator '${name}' failed: ${error}`,
          path: 'flow',
          severity: 'error'
        });
      }
    }
    
    // Calculate statistics
    const stats = this.calculateStats(flow);
    
    // Check complexity
    if (stats.complexity > this.options.maxComplexity) {
      warnings.push({
        code: 'HIGH_COMPLEXITY',
        message: `Flow complexity (${stats.complexity}) exceeds maximum (${this.options.maxComplexity})`,
        path: 'flow',
        suggestion: 'Consider breaking the flow into smaller sub-flows'
      });
    }
    
    // Check depth
    if (stats.maxDepth > this.options.maxDepth) {
      warnings.push({
        code: 'EXCESSIVE_DEPTH',
        message: `Flow depth (${stats.maxDepth}) exceeds maximum (${this.options.maxDepth})`,
        path: 'flow',
        suggestion: 'Consider flattening the flow structure'
      });
    }
    
    const valid = errors.length === 0 && (!this.options.strictMode || warnings.length === 0);
    
    const result: ValidationResult = {
      valid,
      errors,
      warnings,
      stats
    };
    
    this.emit('validation', result);
    return result;
  }

  /**
   * Validate basic flow structure
   */
  private validateStructure(flow: FlowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!flow.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Flow must have an ID',
        path: 'flow.id',
        severity: 'error'
      });
    }
    
    if (!flow.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Flow must have a name',
        path: 'flow.name',
        severity: 'error'
      });
    }
    
    if (!flow.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Flow must have a version',
        path: 'flow.version',
        severity: 'error'
      });
    }
    
    if (!flow.steps || flow.steps.length === 0) {
      errors.push({
        code: 'NO_STEPS',
        message: 'Flow must have at least one step',
        path: 'flow.steps',
        severity: 'critical'
      });
      return errors;
    }
    
    // Validate each step
    flow.steps.forEach((step, index) => {
      if (!step.id) {
        errors.push({
          code: 'MISSING_STEP_ID',
          message: `Step at index ${index} is missing an ID`,
          path: `flow.steps[${index}].id`,
          severity: 'error'
        });
      }
      
      if (!step.name) {
        errors.push({
          code: 'MISSING_STEP_NAME',
          message: `Step '${step.id}' is missing a name`,
          path: `flow.steps.${step.id}.name`,
          severity: 'error'
        });
      }
      
      if (!step.type) {
        errors.push({
          code: 'MISSING_STEP_TYPE',
          message: `Step '${step.id}' is missing a type`,
          path: `flow.steps.${step.id}.type`,
          severity: 'error'
        });
      }
      
      // Validate step-specific requirements
      if (step.type === 'action' && !step.action) {
        errors.push({
          code: 'MISSING_ACTION',
          message: `Action step '${step.id}' must specify an action`,
          path: `flow.steps.${step.id}.action`,
          severity: 'error'
        });
      }
      
      if (step.type === 'decision' && !step.condition) {
        errors.push({
          code: 'MISSING_CONDITION',
          message: `Decision step '${step.id}' must specify a condition`,
          path: `flow.steps.${step.id}.condition`,
          severity: 'error'
        });
      }
    });
    
    return errors;
  }

  /**
   * Find unreachable steps in the flow
   */
  private findUnreachableSteps(flow: FlowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const reachable = new Set<string>();
    const queue: string[] = [];
    
    // Start from the first step or trigger targets
    if (flow.steps.length > 0) {
      queue.push(flow.steps[0].id);
    }
    
    if (flow.triggers) {
      flow.triggers.forEach(trigger => {
        if (trigger.config.startStep) {
          queue.push(trigger.config.startStep);
        }
      });
    }
    
    // BFS to find all reachable steps
    while (queue.length > 0) {
      const stepId = queue.shift()!;
      if (reachable.has(stepId)) continue;
      
      reachable.add(stepId);
      
      const step = flow.steps.find(s => s.id === stepId);
      if (!step) continue;
      
      if (step.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        queue.push(...nextSteps.filter(id => !reachable.has(id)));
      }
    }
    
    // Find unreachable steps
    flow.steps.forEach(step => {
      if (!reachable.has(step.id)) {
        errors.push({
          code: 'UNREACHABLE_STEP',
          message: `Step '${step.id}' is unreachable`,
          path: `flow.steps.${step.id}`,
          severity: 'error',
          suggestion: 'Ensure all steps are connected to the flow'
        });
      }
    });
    
    return errors;
  }

  /**
   * Detect cycles in the flow
   */
  private detectCycles(flow: FlowDefinition): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    
    const dfs = (stepId: string, path: string[]): void => {
      visited.add(stepId);
      stack.add(stepId);
      path.push(stepId);
      
      const step = flow.steps.find(s => s.id === stepId);
      if (!step) return;
      
      if (step.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        
        for (const nextId of nextSteps) {
          if (stack.has(nextId)) {
            // Cycle detected
            const cycleStart = path.indexOf(nextId);
            cycles.push([...path.slice(cycleStart), nextId]);
          } else if (!visited.has(nextId)) {
            dfs(nextId, [...path]);
          }
        }
      }
      
      stack.delete(stepId);
    };
    
    // Check from each unvisited step
    flow.steps.forEach(step => {
      if (!visited.has(step.id)) {
        dfs(step.id, []);
      }
    });
    
    return cycles;
  }

  /**
   * Check for duplicate IDs
   */
  private checkDuplicateIds(flow: FlowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const ids = new Map<string, number>();
    
    flow.steps.forEach(step => {
      const count = ids.get(step.id) || 0;
      ids.set(step.id, count + 1);
    });
    
    ids.forEach((count, id) => {
      if (count > 1) {
        errors.push({
          code: 'DUPLICATE_ID',
          message: `Step ID '${id}' is used ${count} times`,
          path: `flow.steps.${id}`,
          severity: 'critical'
        });
      }
    });
    
    return errors;
  }

  /**
   * Validate types and data flow
   */
  private validateTypes(flow: FlowDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate variable definitions
    if (flow.variables) {
      Object.entries(flow.variables).forEach(([name, variable]) => {
        if (!['string', 'number', 'boolean', 'object', 'array'].includes(variable.type)) {
          errors.push({
            code: 'INVALID_VARIABLE_TYPE',
            message: `Variable '${name}' has invalid type '${variable.type}'`,
            path: `flow.variables.${name}.type`,
            severity: 'error'
          });
        }
        
        // Validate default value matches type
        if (variable.defaultValue !== undefined) {
          const actualType = Array.isArray(variable.defaultValue) ? 'array' : typeof variable.defaultValue;
          if (actualType !== variable.type) {
            errors.push({
              code: 'TYPE_MISMATCH',
              message: `Variable '${name}' default value type '${actualType}' doesn't match declared type '${variable.type}'`,
              path: `flow.variables.${name}.defaultValue`,
              severity: 'error'
            });
          }
        }
      });
    }
    
    // Validate step input/output references
    flow.steps.forEach(step => {
      if (step.inputs) {
        Object.entries(step.inputs).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const ref = value.slice(2, -2).trim();
            if (!this.isValidReference(ref, flow)) {
              errors.push({
                code: 'INVALID_REFERENCE',
                message: `Step '${step.id}' input '${key}' references unknown variable '${ref}'`,
                path: `flow.steps.${step.id}.inputs.${key}`,
                severity: 'error'
              });
            }
          }
        });
      }
    });
    
    return errors;
  }

  /**
   * Check if a reference is valid
   */
  private isValidReference(ref: string, flow: FlowDefinition): boolean {
    // Check if it's a variable reference
    if (flow.variables && flow.variables[ref]) {
      return true;
    }
    
    // Check if it's a step output reference (e.g., stepId.outputKey)
    const parts = ref.split('.');
    if (parts.length === 2) {
      const [stepId, outputKey] = parts;
      const step = flow.steps.find(s => s.id === stepId);
      return !!(step && step.outputs && outputKey in step.outputs);
    }
    
    return false;
  }

  /**
   * Calculate flow statistics
   */
  private calculateStats(flow: FlowDefinition): ValidationStats {
    const stepMap = new Map<string, FlowStep>();
    flow.steps.forEach(step => stepMap.set(step.id, step));
    
    // Calculate connections
    let totalConnections = 0;
    flow.steps.forEach(step => {
      if (step.next) {
        const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
        totalConnections += nextSteps.length;
      }
    });
    
    // Calculate complexity (simplified McCabe complexity)
    let complexity = 1; // Base complexity
    flow.steps.forEach(step => {
      if (step.type === 'decision') {
        complexity += 1; // Each decision adds a path
      } else if (step.type === 'parallel') {
        const branches = Array.isArray(step.next) ? step.next.length : 1;
        complexity += branches - 1;
      } else if (step.type === 'loop') {
        complexity += 1; // Loop adds a path
      }
    });
    
    // Calculate max depth
    const maxDepth = this.calculateMaxDepth(flow);
    
    // Count unreachable steps
    const unreachableSteps = this.findUnreachableSteps(flow).length;
    
    // Count duplicate IDs
    const duplicateIds = this.checkDuplicateIds(flow).length;
    
    return {
      totalSteps: flow.steps.length,
      totalConnections,
      complexity,
      cyclomaticComplexity: complexity,
      maxDepth,
      unreachableSteps,
      duplicateIds
    };
  }

  /**
   * Calculate maximum depth of the flow
   */
  private calculateMaxDepth(flow: FlowDefinition): number {
    let maxDepth = 0;
    const visited = new Set<string>();
    
    const dfs = (stepId: string, depth: number): void => {
      if (visited.has(stepId)) return;
      visited.add(stepId);
      
      maxDepth = Math.max(maxDepth, depth);
      
      const step = flow.steps.find(s => s.id === stepId);
      if (!step || !step.next) return;
      
      const nextSteps = Array.isArray(step.next) ? step.next : [step.next];
      nextSteps.forEach(nextId => dfs(nextId, depth + 1));
    };
    
    if (flow.steps.length > 0) {
      dfs(flow.steps[0].id, 1);
    }
    
    return maxDepth;
  }

  /**
   * Register a custom validator
   */
  registerValidator(name: string, validator: (flow: FlowDefinition) => ValidationError[]): void {
    this.customValidators.set(name, validator);
    this.emit('validatorRegistered', name);
  }

  /**
   * Unregister a custom validator
   */
  unregisterValidator(name: string): void {
    this.customValidators.delete(name);
    this.emit('validatorUnregistered', name);
  }

  /**
   * Get validation options
   */
  getOptions(): ValidationOptions {
    return { ...this.options };
  }

  /**
   * Update validation options
   */
  setOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
    this.emit('optionsUpdated', this.options);
  }
}

// Export singleton instance
export const flowValidator = new FlowValidator();