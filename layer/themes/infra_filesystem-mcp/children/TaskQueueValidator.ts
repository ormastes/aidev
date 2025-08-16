import { VFTaskQueueWrapper } from './VFTaskQueueWrapper';
import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  blockedBy: string[];
}

export interface TaskValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dependencies?: TaskDependency[];
  circularDependencies?: string[][];
  missingDependencies?: string[];
}

export interface TaskRequirement {
  id: string;
  type: 'file' | 'task' | 'feature' | 'artifact';
  required: boolean;
  path?: string;
  taskId?: string;
  featureId?: string;
  artifactId?: string;
}

export class TaskQueueValidator {
  private basePath: string;
  private taskQueueWrapper: VFTaskQueueWrapper;
  private taskDependencies: Map<string, TaskDependency> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.taskQueueWrapper = new VFTaskQueueWrapper(basePath);
  }

  /**
   * Validate a task before pushing to queue
   */
  async validateTaskPush(task: any): Promise<TaskValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!task.id) {
      errors.push('Task must have an ID');
    }
    
    if (!task.type) {
      errors.push('Task must have a type');
    }
    
    if (!task.content?.title) {
      errors.push('Task must have a title');
    }
    
    // Check dependencies
    if (task.dependencies && Array.isArray(task.dependencies)) {
      const missingDeps = await this.checkMissingDependencies(task.dependencies);
      if (missingDeps.length > 0) {
        errors.push(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
      
      // Check for circular dependencies
      const circular = this.detectCircularDependencies(task.id, task.dependencies);
      if (circular.length > 0) {
        errors.push(`Circular dependencies detected: ${circular.map(c => c.join(' -> ')).join(', ')}`);
      }
    }
    
    // Check requirements
    if (task.requirements && Array.isArray(task.requirements)) {
      const reqValidation = await this.validateRequirements(task.requirements);
      errors.push(...reqValidation.errors);
      warnings.push(...reqValidation.warnings);
    }
    
    // Check if task already exists
    const existingTask = await this.findTaskById(task.id);
    if (existingTask) {
      errors.push(`Task with ID ${task.id} already exists`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      dependencies: task.dependencies ? [{ 
        taskId: task.id, 
        dependsOn: task.dependencies,
        blockedBy: []
      }] : undefined
    };
  }

  /**
   * Validate a task before popping from queue
   */
  async validateTaskPop(taskId: string): Promise<TaskValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if task exists
    const task = await this.findTaskById(taskId);
    if (!task) {
      errors.push(`Task ${taskId} not found`);
      return { isValid: false, errors, warnings };
    }
    
    // Check if task is blocked by other tasks
    const blockedBy = await this.getBlockingTasks(taskId);
    if (blockedBy.length > 0) {
      errors.push(`Task is blocked by: ${blockedBy.join(', ')}`);
    }
    
    // Check if dependencies are completed
    const incompleteDeps = await this.getIncompleteDependencies(taskId);
    if (incompleteDeps.length > 0) {
      errors.push(`Incomplete dependencies: ${incompleteDeps.join(', ')}`);
    }
    
    // Check if task is already in progress
    if (task.status === 'in_progress') {
      warnings.push('Task is already in progress');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for missing dependencies
   */
  private async checkMissingDependencies(dependencies: string[]): Promise<string[]> {
    const missing: string[] = [];
    
    for (const dep of dependencies) {
      const exists = await this.findTaskById(dep);
      if (!exists) {
        missing.push(dep);
      }
    }
    
    return missing;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(
    taskId: string, 
    dependencies: string[], 
    visited: Set<string> = new Set(),
    path: string[] = []
  ): string[][] {
    const circles: string[][] = [];
    
    if (visited.has(taskId)) {
      // Found a circle
      const circleStart = path.indexOf(taskId);
      if (circleStart >= 0) {
        circles.push([...path.slice(circleStart), taskId]);
      }
      return circles;
    }
    
    visited.add(taskId);
    path.push(taskId);
    
    for (const dep of dependencies) {
      const depData = this.taskDependencies.get(dep);
      if (depData && depData.dependsOn) {
        const subCircles = this.detectCircularDependencies(
          dep, 
          depData.dependsOn, 
          new Set(visited),
          [...path]
        );
        circles.push(...subCircles);
      }
    }
    
    return circles;
  }

  /**
   * Validate task requirements
   */
  private async validateRequirements(requirements: TaskRequirement[]): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const req of requirements) {
      switch (req.type) {
        case 'file':
          if (req.path) {
            const fullPath = path.join(this.basePath, req.path);
            try {
              await fs.access(fullPath);
            } catch {
              if (req.required) {
                errors.push(`Required file does not exist: ${req.path}`);
              } else {
                warnings.push(`Optional file does not exist: ${req.path}`);
              }
            }
          }
          break;
          
        case 'task':
          if (req.taskId) {
            const task = await this.findTaskById(req.taskId);
            if (!task) {
              if (req.required) {
                errors.push(`Required task does not exist: ${req.taskId}`);
              } else {
                warnings.push(`Optional task does not exist: ${req.taskId}`);
              }
            } else if (task.status !== 'completed') {
              if (req.required) {
                errors.push(`Required task not completed: ${req.taskId}`);
              } else {
                warnings.push(`Optional task not completed: ${req.taskId}`);
              }
            }
          }
          break;
          
        case 'feature':
          // Check feature status
          if (req.featureId) {
            const featureExists = await this.checkFeatureExists(req.featureId);
            if (!featureExists) {
              if (req.required) {
                errors.push(`Required feature does not exist: ${req.featureId}`);
              } else {
                warnings.push(`Optional feature does not exist: ${req.featureId}`);
              }
            }
          }
          break;
          
        case 'artifact':
          // Check artifact exists
          if (req.artifactId) {
            const artifactExists = await this.checkArtifactExists(req.artifactId);
            if (!artifactExists) {
              if (req.required) {
                errors.push(`Required artifact does not exist: ${req.artifactId}`);
              } else {
                warnings.push(`Optional artifact does not exist: ${req.artifactId}`);
              }
            }
          }
          break;
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Find task by ID in all queues
   */
  private async findTaskById(taskId: string): Promise<any | null> {
    const taskQueue = await this.taskQueueWrapper.read('/TASK_QUEUE.vf.json');
    
    // Search in all priority queues
    for (const [priority, queue] of Object.entries(taskQueue.taskQueues || {})) {
      if (Array.isArray(queue)) {
        const task = queue.find((t: any) => t.id === taskId);
        if (task) {
          return task;
        }
      }
    }
    
    // Search in working tasks
    if (taskQueue.working && Array.isArray(taskQueue.working)) {
      const task = taskQueue.working.find((t: any) => t.id === taskId);
      if (task) {
        return task;
      }
    }
    
    // Search in completed tasks
    if (taskQueue.completed && Array.isArray(taskQueue.completed)) {
      const task = taskQueue.completed.find((t: any) => t.id === taskId);
      if (task) {
        return task;
      }
    }
    
    return null;
  }

  /**
   * Get tasks that are blocking the given task
   */
  private async getBlockingTasks(taskId: string): Promise<string[]> {
    const blocking: string[] = [];
    const taskQueue = await this.taskQueueWrapper.read('/TASK_QUEUE.vf.json');
    
    // Check all tasks for ones that depend on this task
    for (const [priority, queue] of Object.entries(taskQueue.taskQueues || {})) {
      if (Array.isArray(queue)) {
        for (const task of queue) {
          if (task.blockedBy && task.blockedBy.includes(taskId)) {
            blocking.push(task.id);
          }
        }
      }
    }
    
    return blocking;
  }

  /**
   * Get incomplete dependencies for a task
   */
  private async getIncompleteDependencies(taskId: string): Promise<string[]> {
    const task = await this.findTaskById(taskId);
    if (!task || !task.dependencies) {
      return [];
    }
    
    const incomplete: string[] = [];
    
    for (const depId of task.dependencies) {
      const depTask = await this.findTaskById(depId);
      if (!depTask || depTask.status !== 'completed') {
        incomplete.push(depId);
      }
    }
    
    return incomplete;
  }

  /**
   * Check if a feature exists
   */
  private async checkFeatureExists(featureId: string): Promise<boolean> {
    try {
      const featurePath = path.join(this.basePath, 'FEATURE.vf.json');
      const featureContent = await fs.readFile(featurePath, 'utf-8');
      const features = JSON.parse(featureContent);
      
      // Search in all feature categories
      for (const category of Object.values(features.features || {})) {
        if (Array.isArray(category)) {
          const found = category.find((f: any) => f.id === featureId);
          if (found) {
            return true;
          }
        }
      }
    } catch {
      // Feature file doesn't exist or is invalid
    }
    
    return false;
  }

  /**
   * Check if an artifact exists
   */
  private async checkArtifactExists(artifactId: string): Promise<boolean> {
    try {
      const artifactPath = path.join(this.basePath, 'ARTIFACTS.vf.json');
      const artifactContent = await fs.readFile(artifactPath, 'utf-8');
      const artifacts = JSON.parse(artifactContent);
      
      return artifacts.artifacts?.some((a: any) => a.id === artifactId) || false;
    } catch {
      // Artifact manifest doesn't exist
    }
    
    return false;
  }

  /**
   * Validate entire task queue for consistency
   */
  async validateTaskQueue(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    stats: {
      totalTasks: number;
      validTasks: number;
      invalidTasks: number;
      circularDependencies: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalTasks = 0;
    let validTasks = 0;
    let invalidTasks = 0;
    const allCircularDeps: string[][] = [];
    
    const taskQueue = await this.taskQueueWrapper.read('/TASK_QUEUE.vf.json');
    
    // Build dependency map
    for (const [priority, queue] of Object.entries(taskQueue.taskQueues || {})) {
      if (Array.isArray(queue)) {
        for (const task of queue) {
          totalTasks++;
          
          if (task.dependencies) {
            this.taskDependencies.set(task.id, {
              taskId: task.id,
              dependsOn: task.dependencies,
              blockedBy: task.blockedBy || []
            });
          }
          
          // Validate individual task
          const validation = await this.validateTaskPush(task);
          if (validation.isValid) {
            validTasks++;
          } else {
            invalidTasks++;
            errors.push(`Task ${task.id}: ${validation.errors.join(', ')}`);
          }
          
          if (validation.warnings.length > 0) {
            warnings.push(`Task ${task.id}: ${validation.warnings.join(', ')}`);
          }
        }
      }
    }
    
    // Check for circular dependencies across all tasks
    for (const [taskId, deps] of this.taskDependencies.entries()) {
      const circles = this.detectCircularDependencies(taskId, deps.dependsOn);
      allCircularDeps.push(...circles);
    }
    
    // Remove duplicate circular dependency paths
    const uniqueCircles = Array.from(
      new Set(allCircularDeps.map(c => c.sort().join('-')))
    ).map(s => s.split('-'));
    
    if (uniqueCircles.length > 0) {
      errors.push(`Found ${uniqueCircles.length} circular dependency chains`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalTasks,
        validTasks,
        invalidTasks,
        circularDependencies: uniqueCircles.length
      }
    };
  }

  /**
   * Get task execution order respecting dependencies
   */
  async getExecutionOrder(): Promise<string[]> {
    const taskQueue = await this.taskQueueWrapper.read('/TASK_QUEUE.vf.json');
    const allTasks: Map<string, any> = new Map();
    const dependencies: Map<string, string[]> = new Map();
    
    // Collect all tasks and their dependencies
    for (const [priority, queue] of Object.entries(taskQueue.taskQueues || {})) {
      if (Array.isArray(queue)) {
        for (const task of queue) {
          if (task.status !== 'completed') {
            allTasks.set(task.id, task);
            dependencies.set(task.id, task.dependencies || []);
          }
        }
      }
    }
    
    // Topological sort
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (taskId: string): boolean => {
      if (visited.has(taskId)) {
        return true;
      }
      
      if (visiting.has(taskId)) {
        // Circular dependency
        return false;
      }
      
      visiting.add(taskId);
      
      const deps = dependencies.get(taskId) || [];
      for (const dep of deps) {
        if (allTasks.has(dep)) {
          if (!visit(dep)) {
            return false;
          }
        }
      }
      
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(taskId);
      
      return true;
    };
    
    // Visit all tasks
    for (const taskId of allTasks.keys()) {
      if (!visited.has(taskId)) {
        if (!visit(taskId)) {
          throw new Error(`Circular dependency detected involving task ${taskId}`);
        }
      }
    }
    
    return sorted;
  }
}

// Export factory function
export function createTaskQueueValidator(basePath?: string): TaskQueueValidator {
  return new TaskQueueValidator(basePath);
}