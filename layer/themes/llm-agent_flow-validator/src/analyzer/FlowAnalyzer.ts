/**
 * Flow Analyzer
 * Provides deep analysis and insights for LLM agent workflows
 */

import { FlowDefinition, FlowStep, Variable } from '../core/FlowValidator';

export interface FlowMetrics {
  complexity: ComplexityMetrics;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  dependencies: DependencyMetrics;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  branchingFactor: number;
  parallelismDegree: number;
}

export interface PerformanceMetrics {
  estimatedDuration: number;
  criticalPath: string[];
  bottlenecks: BottleneckInfo[];
  parallelizableSteps: string[][];
  resourceIntensive: string[];
}

export interface QualityMetrics {
  testability: number;
  maintainability: number;
  reusability: number;
  documentation: number;
  errorHandlingCoverage: number;
}

export interface DependencyMetrics {
  externalDependencies: string[];
  internalDependencies: Map<string, string[]>;
  circularDependencies: string[][];
  unusedVariables: string[];
}

export interface BottleneckInfo {
  stepId: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export interface FlowPattern {
  name: string;
  description: string;
  steps: string[];
  confidence: number;
}

export interface OptimizationSuggestion {
  type: 'parallelization' | 'caching' | 'batching' | 'simplification' | 'removal';
  target: string | string[];
  description: string;
  estimatedImprovement: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export class FlowAnalyzer {
  /**
   * Analyze flow and generate comprehensive metrics
   */
  analyze(flow: FlowDefinition): FlowMetrics {
    return {
      complexity: this.analyzeComplexity(flow),
      performance: this.analyzePerformance(flow),
      quality: this.analyzeQuality(flow),
      dependencies: this.analyzeDependencies(flow)
    };
  }

  /**
   * Analyze flow complexity
   */
  private analyzeComplexity(flow: FlowDefinition): ComplexityMetrics {
    let cyclomaticComplexity = 1;
    let cognitiveComplexity = 0;
    let maxNesting = 0;
    let totalBranches = 0;
    let branchCount = 0;
    let parallelSteps = 0;

    const visited = new Set<string>();
    const analyzeStep = (stepId: string, depth: number = 0): void => {
      if (visited.has(stepId)) return;
      visited.add(stepId);

      const step = flow.steps.find(s => s.id === stepId);
      if (!step) return;

      maxNesting = Math.max(maxNesting, depth);

      switch (step.type) {
        case 'decision':
          cyclomaticComplexity += 1;
          cognitiveComplexity += depth + 1;
          if (step.next && Array.isArray(step.next)) {
            totalBranches += step.next.length;
            branchCount++;
            step.next.forEach(nextId => analyzeStep(nextId, depth + 1));
          }
          break;

        case 'loop':
          cyclomaticComplexity += 1;
          cognitiveComplexity += depth + 2;
          if (step.next) {
            const nextIds = Array.isArray(step.next) ? step.next : [step.next];
            nextIds.forEach(nextId => analyzeStep(nextId, depth + 1));
          }
          break;

        case 'parallel':
          parallelSteps++;
          if (step.next && Array.isArray(step.next)) {
            totalBranches += step.next.length;
            step.next.forEach(nextId => analyzeStep(nextId, depth));
          }
          break;

        default:
          if (step.next) {
            const nextIds = Array.isArray(step.next) ? step.next : [step.next];
            nextIds.forEach(nextId => analyzeStep(nextId, depth));
          }
      }
    };

    if (flow.steps.length > 0) {
      analyzeStep(flow.steps[0].id);
    }

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth: maxNesting,
      branchingFactor: branchCount > 0 ? totalBranches / branchCount : 0,
      parallelismDegree: parallelSteps
    };
  }

  /**
   * Analyze flow performance characteristics
   */
  private analyzePerformance(flow: FlowDefinition): PerformanceMetrics {
    const criticalPath = this.findCriticalPath(flow);
    const bottlenecks = this.identifyBottlenecks(flow);
    const parallelizable = this.findParallelizableSteps(flow);
    const resourceIntensive = this.identifyResourceIntensiveSteps(flow);

    // Estimate duration based on step types and timeouts
    let estimatedDuration = 0;
    criticalPath.forEach(stepId => {
      const step = flow.steps.find(s => s.id === stepId);
      if (step) {
        if (step.timeout) {
          estimatedDuration += step.timeout;
        } else {
          // Default estimates by type
          const defaultDurations: Record<string, number> = {
            action: 1000,
            decision: 100,
            parallel: 500,
            loop: 2000,
            wait: 5000,
            transform: 200
          };
          estimatedDuration += defaultDurations[step.type] || 500;
        }
      }
    });

    return {
      estimatedDuration,
      criticalPath,
      bottlenecks,
      parallelizableSteps: parallelizable,
      resourceIntensive
    };
  }

  /**
   * Find the critical path through the flow
   */
  private findCriticalPath(flow: FlowDefinition): string[] {
    if (flow.steps.length === 0) return [];

    const stepMap = new Map<string, FlowStep>();
    flow.steps.forEach(step => stepMap.set(step.id, step));

    const durations = new Map<string, number>();
    const paths = new Map<string, string[]>();

    // Calculate step durations
    flow.steps.forEach(step => {
      const duration = step.timeout || this.getDefaultDuration(step.type);
      durations.set(step.id, duration);
      paths.set(step.id, [step.id]);
    });

    // Find longest path using topological sort
    const visited = new Set<string>();
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();

    const dfs = (stepId: string): number => {
      if (distances.has(stepId)) {
        return distances.get(stepId)!;
      }

      const step = stepMap.get(stepId);
      if (!step || !step.next) {
        const duration = durations.get(stepId) || 0;
        distances.set(stepId, duration);
        return duration;
      }

      const nextIds = Array.isArray(step.next) ? step.next : [step.next];
      let maxDistance = 0;
      let maxNextId = '';

      for (const nextId of nextIds) {
        const distance = dfs(nextId);
        if (distance > maxDistance) {
          maxDistance = distance;
          maxNextId = nextId;
        }
      }

      const totalDistance = (durations.get(stepId) || 0) + maxDistance;
      distances.set(stepId, totalDistance);
      if (maxNextId) {
        predecessors.set(maxNextId, stepId);
      }

      return totalDistance;
    };

    // Start from first step
    dfs(flow.steps[0].id);

    // Reconstruct critical path
    const criticalPath: string[] = [];
    let current = flow.steps[0].id;
    criticalPath.push(current);

    while (true) {
      const step = stepMap.get(current);
      if (!step || !step.next) break;

      const nextIds = Array.isArray(step.next) ? step.next : [step.next];
      let maxDistance = 0;
      let nextStep = '';

      for (const nextId of nextIds) {
        const distance = distances.get(nextId) || 0;
        if (distance > maxDistance) {
          maxDistance = distance;
          nextStep = nextId;
        }
      }

      if (!nextStep) break;
      criticalPath.push(nextStep);
      current = nextStep;
    }

    return criticalPath;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(flow: FlowDefinition): BottleneckInfo[] {
    const bottlenecks: BottleneckInfo[] = [];

    flow.steps.forEach(step => {
      // Long-running steps without parallelization
      if (step.type === 'action' && step.timeout && step.timeout > 5000) {
        bottlenecks.push({
          stepId: step.id,
          reason: 'Long-running synchronous operation',
          impact: step.timeout > 10000 ? 'high' : 'medium',
          suggestions: [
            'Consider breaking into smaller steps',
            'Add progress reporting',
            'Implement caching if idempotent'
          ]
        });
      }

      // Sequential loops
      if (step.type === 'loop') {
        bottlenecks.push({
          stepId: step.id,
          reason: 'Sequential loop processing',
          impact: 'medium',
          suggestions: [
            'Consider parallel processing with batching',
            'Implement pagination for large datasets',
            'Add early exit conditions'
          ]
        });
      }

      // Large fan-out in parallel steps
      if (step.type === 'parallel' && step.next && Array.isArray(step.next) && step.next.length > 10) {
        bottlenecks.push({
          stepId: step.id,
          reason: `High parallelism degree (${step.next.length} branches)`,
          impact: 'medium',
          suggestions: [
            'Consider batching parallel operations',
            'Implement rate limiting',
            'Use a queue for better resource management'
          ]
        });
      }

      // Missing timeout on potentially long operations
      if ((step.type === 'action' || step.type === 'wait') && !step.timeout) {
        bottlenecks.push({
          stepId: step.id,
          reason: 'Missing timeout configuration',
          impact: 'low',
          suggestions: [
            'Add explicit timeout to prevent hanging',
            'Consider default timeout policy'
          ]
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Find steps that can be parallelized
   */
  private findParallelizableSteps(flow: FlowDefinition): string[][] {
    const parallelizable: string[][] = [];
    const dependencies = this.buildDependencyGraph(flow);

    // Find independent step groups
    const visited = new Set<string>();
    const groups: string[][] = [];

    flow.steps.forEach(step => {
      if (!visited.has(step.id)) {
        const group: string[] = [];
        const queue = [step.id];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;

          // Check if current can be parallelized with group
          let canParallelize = true;
          for (const groupStep of group) {
            if (dependencies.get(current)?.includes(groupStep) ||
                dependencies.get(groupStep)?.includes(current)) {
              canParallelize = false;
              break;
            }
          }

          if (canParallelize) {
            visited.add(current);
            group.push(current);
          }
        }

        if (group.length > 1) {
          parallelizable.push(group);
        }
      }
    });

    return parallelizable;
  }

  /**
   * Identify resource-intensive steps
   */
  private identifyResourceIntensiveSteps(flow: FlowDefinition): string[] {
    const intensive: string[] = [];

    flow.steps.forEach(step => {
      // Check for known resource-intensive patterns
      if (step.type === 'action' && step.action) {
        const resourcePatterns = [
          /database/i,
          /query/i,
          /fetch/i,
          /download/i,
          /upload/i,
          /process/i,
          /transform/i,
          /compute/i
        ];

        if (resourcePatterns.some(pattern => pattern.test(step.action!))) {
          intensive.push(step.id);
        }
      }

      // Parallel steps with many branches
      if (step.type === 'parallel' && step.next && Array.isArray(step.next) && step.next.length > 5) {
        intensive.push(step.id);
      }

      // Long timeouts indicate potentially intensive operations
      if (step.timeout && step.timeout > 10000) {
        intensive.push(step.id);
      }
    });

    return [...new Set(intensive)];
  }

  /**
   * Analyze flow quality metrics
   */
  private analyzeQuality(flow: FlowDefinition): QualityMetrics {
    let testability = 100;
    let maintainability = 100;
    let reusability = 100;
    let documentation = 100;
    let errorHandlingCoverage = 0;

    // Testability factors
    const complexity = this.analyzeComplexity(flow);
    testability -= Math.min(50, complexity.cyclomaticComplexity * 2);
    testability -= Math.min(20, complexity.nestingDepth * 5);

    // Maintainability factors
    if (!flow.description) maintainability -= 20;
    if (!flow.version) maintainability -= 10;
    
    flow.steps.forEach(step => {
      if (!step.name || step.name.length < 3) maintainability -= 2;
      if (step.type === 'action' && !step.action) maintainability -= 5;
    });

    // Reusability factors
    const duplicateLogic = this.findDuplicateLogic(flow);
    reusability -= Math.min(40, duplicateLogic.length * 10);

    // Documentation scoring
    if (!flow.description || flow.description.length < 10) documentation -= 30;
    if (!flow.metadata) documentation -= 20;
    
    let documentedSteps = 0;
    flow.steps.forEach(step => {
      if (step.name && step.name.length > 5) documentedSteps++;
    });
    const stepDocCoverage = (documentedSteps / flow.steps.length) * 50;
    documentation = Math.max(0, documentation - (50 - stepDocCoverage));

    // Error handling coverage
    let stepsWithErrorHandling = 0;
    flow.steps.forEach(step => {
      if (step.errorHandler || step.retryPolicy) {
        stepsWithErrorHandling++;
      }
    });
    errorHandlingCoverage = (stepsWithErrorHandling / flow.steps.length) * 100;

    return {
      testability: Math.max(0, testability),
      maintainability: Math.max(0, maintainability),
      reusability: Math.max(0, reusability),
      documentation: Math.max(0, documentation),
      errorHandlingCoverage
    };
  }

  /**
   * Analyze flow dependencies
   */
  private analyzeDependencies(flow: FlowDefinition): DependencyMetrics {
    const externalDependencies = this.findExternalDependencies(flow);
    const internalDependencies = this.buildDependencyGraph(flow);
    const circularDependencies = this.findCircularDependencies(flow);
    const unusedVariables = this.findUnusedVariables(flow);

    return {
      externalDependencies,
      internalDependencies,
      circularDependencies,
      unusedVariables
    };
  }

  /**
   * Find external dependencies
   */
  private findExternalDependencies(flow: FlowDefinition): string[] {
    const dependencies = new Set<string>();

    flow.steps.forEach(step => {
      if (step.type === 'action' && step.action) {
        // Extract potential external dependencies from action names
        const patterns = [
          /api\//i,
          /http/i,
          /database/i,
          /service\//i,
          /external\//i
        ];

        patterns.forEach(pattern => {
          if (pattern.test(step.action!)) {
            dependencies.add(step.action!);
          }
        });
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(flow: FlowDefinition): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    flow.steps.forEach(step => {
      const deps: string[] = [];

      // Check input dependencies
      if (step.inputs) {
        Object.values(step.inputs).forEach(value => {
          if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const ref = value.slice(2, -2).trim();
            const parts = ref.split('.');
            if (parts.length === 2) {
              deps.push(parts[0]); // Step ID
            }
          }
        });
      }

      dependencies.set(step.id, deps);
    });

    return dependencies;
  }

  /**
   * Find circular dependencies
   */
  private findCircularDependencies(flow: FlowDefinition): string[][] {
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
        const nextIds = Array.isArray(step.next) ? step.next : [step.next];
        for (const nextId of nextIds) {
          if (stack.has(nextId)) {
            const cycleStart = path.indexOf(nextId);
            cycles.push([...path.slice(cycleStart), nextId]);
          } else if (!visited.has(nextId)) {
            dfs(nextId, [...path]);
          }
        }
      }

      stack.delete(stepId);
    };

    flow.steps.forEach(step => {
      if (!visited.has(step.id)) {
        dfs(step.id, []);
      }
    });

    return cycles;
  }

  /**
   * Find unused variables
   */
  private findUnusedVariables(flow: FlowDefinition): string[] {
    if (!flow.variables) return [];

    const usedVariables = new Set<string>();

    flow.steps.forEach(step => {
      if (step.inputs) {
        Object.values(step.inputs).forEach(value => {
          if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const ref = value.slice(2, -2).trim();
            if (flow.variables && flow.variables[ref]) {
              usedVariables.add(ref);
            }
          }
        });
      }

      if (step.condition && typeof step.condition === 'string') {
        Object.keys(flow.variables).forEach(varName => {
          if (step.condition!.includes(varName)) {
            usedVariables.add(varName);
          }
        });
      }
    });

    const unused: string[] = [];
    Object.keys(flow.variables).forEach(varName => {
      if (!usedVariables.has(varName)) {
        unused.push(varName);
      }
    });

    return unused;
  }

  /**
   * Find duplicate logic patterns
   */
  private findDuplicateLogic(flow: FlowDefinition): FlowPattern[] {
    const patterns: FlowPattern[] = [];
    const stepSignatures = new Map<string, string[]>();

    // Create signatures for each step
    flow.steps.forEach(step => {
      const signature = `${step.type}-${step.action || ''}-${JSON.stringify(step.inputs || {})}`;
      if (!stepSignatures.has(signature)) {
        stepSignatures.set(signature, []);
      }
      stepSignatures.get(signature)!.push(step.id);
    });

    // Find duplicates
    stepSignatures.forEach((steps, signature) => {
      if (steps.length > 1) {
        patterns.push({
          name: 'Duplicate Logic',
          description: `Steps ${steps.join(', ')} have identical logic`,
          steps,
          confidence: 1.0
        });
      }
    });

    return patterns;
  }

  /**
   * Detect common workflow patterns
   */
  detectPatterns(flow: FlowDefinition): FlowPattern[] {
    const patterns: FlowPattern[] = [];

    // Retry pattern
    const retryPattern = this.detectRetryPattern(flow);
    if (retryPattern) patterns.push(retryPattern);

    // Fork-join pattern
    const forkJoinPattern = this.detectForkJoinPattern(flow);
    if (forkJoinPattern) patterns.push(forkJoinPattern);

    // Pipeline pattern
    const pipelinePattern = this.detectPipelinePattern(flow);
    if (pipelinePattern) patterns.push(pipelinePattern);

    // Circuit breaker pattern
    const circuitBreakerPattern = this.detectCircuitBreakerPattern(flow);
    if (circuitBreakerPattern) patterns.push(circuitBreakerPattern);

    return patterns;
  }

  /**
   * Detect retry pattern
   */
  private detectRetryPattern(flow: FlowDefinition): FlowPattern | null {
    const stepsWithRetry = flow.steps.filter(step => 
      step.retryPolicy && step.retryPolicy.maxAttempts > 1
    );

    if (stepsWithRetry.length > 0) {
      return {
        name: 'Retry Pattern',
        description: 'Steps with automatic retry on failure',
        steps: stepsWithRetry.map(s => s.id),
        confidence: 1.0
      };
    }

    return null;
  }

  /**
   * Detect fork-join pattern
   */
  private detectForkJoinPattern(flow: FlowDefinition): FlowPattern | null {
    const parallelSteps = flow.steps.filter(step => step.type === 'parallel');
    
    for (const parallel of parallelSteps) {
      if (parallel.next && Array.isArray(parallel.next) && parallel.next.length > 1) {
        // Check if branches converge
        const branches = parallel.next;
        const convergencePoints = new Set<string>();
        
        branches.forEach(branchId => {
          const branch = flow.steps.find(s => s.id === branchId);
          if (branch && branch.next) {
            const nextIds = Array.isArray(branch.next) ? branch.next : [branch.next];
            nextIds.forEach(id => convergencePoints.add(id));
          }
        });

        if (convergencePoints.size === 1) {
          return {
            name: 'Fork-Join Pattern',
            description: 'Parallel execution followed by synchronization',
            steps: [parallel.id, ...branches, ...Array.from(convergencePoints)],
            confidence: 0.9
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect pipeline pattern
   */
  private detectPipelinePattern(flow: FlowDefinition): FlowPattern | null {
    let longestChain: string[] = [];
    
    const findChain = (stepId: string, chain: string[]): void => {
      const step = flow.steps.find(s => s.id === stepId);
      if (!step) return;

      chain.push(stepId);

      if (step.next && !Array.isArray(step.next)) {
        findChain(step.next, chain);
      } else if (chain.length > longestChain.length) {
        longestChain = [...chain];
      }
    };

    if (flow.steps.length > 0) {
      findChain(flow.steps[0].id, []);
    }

    if (longestChain.length >= 3) {
      return {
        name: 'Pipeline Pattern',
        description: 'Sequential data transformation pipeline',
        steps: longestChain,
        confidence: 0.8
      };
    }

    return null;
  }

  /**
   * Detect circuit breaker pattern
   */
  private detectCircuitBreakerPattern(flow: FlowDefinition): FlowPattern | null {
    const stepsWithCircuitBreaker = flow.steps.filter(step =>
      step.errorHandler && 
      step.errorHandler.type === 'skip' &&
      step.retryPolicy &&
      step.retryPolicy.maxAttempts > 0
    );

    if (stepsWithCircuitBreaker.length > 0) {
      return {
        name: 'Circuit Breaker Pattern',
        description: 'Fault tolerance with fallback behavior',
        steps: stepsWithCircuitBreaker.map(s => s.id),
        confidence: 0.85
      };
    }

    return null;
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizations(flow: FlowDefinition): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for parallelization opportunities
    const parallelizable = this.findParallelizableSteps(flow);
    parallelizable.forEach(group => {
      if (group.length > 1) {
        suggestions.push({
          type: 'parallelization',
          target: group,
          description: `Steps ${group.join(', ')} can be executed in parallel`,
          estimatedImprovement: 30,
          difficulty: 'medium'
        });
      }
    });

    // Check for caching opportunities
    flow.steps.forEach(step => {
      if (step.type === 'action' && step.action && step.action.includes('fetch')) {
        suggestions.push({
          type: 'caching',
          target: step.id,
          description: `Consider caching results of step '${step.id}'`,
          estimatedImprovement: 20,
          difficulty: 'easy'
        });
      }
    });

    // Check for batching opportunities
    flow.steps.forEach(step => {
      if (step.type === 'loop') {
        suggestions.push({
          type: 'batching',
          target: step.id,
          description: `Process loop '${step.id}' in batches for better performance`,
          estimatedImprovement: 25,
          difficulty: 'medium'
        });
      }
    });

    // Check for simplification
    const complexity = this.analyzeComplexity(flow);
    if (complexity.cyclomaticComplexity > 10) {
      suggestions.push({
        type: 'simplification',
        target: flow.id,
        description: 'Consider breaking this flow into smaller sub-flows',
        estimatedImprovement: 15,
        difficulty: 'hard'
      });
    }

    // Check for removal of unused variables
    const unused = this.findUnusedVariables(flow);
    if (unused.length > 0) {
      suggestions.push({
        type: 'removal',
        target: unused,
        description: `Remove unused variables: ${unused.join(', ')}`,
        estimatedImprovement: 5,
        difficulty: 'easy'
      });
    }

    return suggestions;
  }

  /**
   * Get default duration for step type
   */
  private getDefaultDuration(type: string): number {
    const durations: Record<string, number> = {
      action: 1000,
      decision: 100,
      parallel: 500,
      loop: 2000,
      wait: 5000,
      transform: 200
    };
    return durations[type] || 500;
  }
}

// Export singleton instance
export const flowAnalyzer = new FlowAnalyzer();