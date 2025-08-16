import { fileAPI } from '../utils/file-api';
import { VFTaskQueueWrapper } from './VFTaskQueueWrapper';
import { TaskQueueValidator } from './TaskQueueValidator';
import { ArtifactManager } from './ArtifactManager';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

export interface TaskArtifactRequirement {
  type: 'source_code' | 'test_code' | "documentation" | 'sequence_diagram' | 'schema';
  pattern?: string;
  minCount?: number;
  mustExist?: boolean;
  state?: 'draft' | 'review' | "approved" | "deployed";
}

export interface EnhancedTask {
  id: string;
  type: string;
  content: any;
  artifactRequirements?: TaskArtifactRequirement[];
  artifactsToCreate?: string[];
  dependencies?: string[];
  status: string;
}

export interface ValidationResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
  missingArtifacts?: string[];
  invalidArtifacts?: string[];
}

export class EnhancedTaskQueueWrapper extends VFTaskQueueWrapper {
  private validator: TaskQueueValidator;
  private artifactManager: ArtifactManager;
  private strictMode: boolean;

  constructor(basePath: string = process.cwd(), strictMode: boolean = true) {
    super(basePath);
    this.validator = new TaskQueueValidator(basePath);
    this.artifactManager = new ArtifactManager(basePath);
    this.strictMode = strictMode;
  }

  /**
   * Push task with artifact validation
   */
  async pushWithValidation(
    task: EnhancedTask,
    priority: string = 'medium',
    filePath: string = '/TASK_QUEUE.vf.json'
  ): Promise<ValidationResult> {
    // First validate basic task requirements
    const basicValidation = await this.validator.validateTaskPush(task);
    
    if (!basicValidation.isValid) {
      return {
        allowed: false,
        errors: basicValidation.errors,
        warnings: basicValidation.warnings
      };
    }

    // Check artifact requirements
    const artifactValidation = await this.validateArtifactRequirements(task);
    
    if (!artifactValidation.allowed) {
      return artifactValidation;
    }

    // Check if task creates required artifacts
    if (task.artifactsToCreate && task.artifactsToCreate.length > 0) {
      const creationValidation = await this.validateArtifactCreation(task);
      if (!creationValidation.allowed) {
        return creationValidation;
      }
    }

    // All validations passed, push the task
    await super.push(task as any, priority, filePath);
    
    return {
      allowed: true,
      errors: [],
      warnings: artifactValidation.warnings
    };
  }

  /**
   * Pop task with artifact validation
   */
  async popWithValidation(
    priority?: string,
    filePath: string = '/TASK_QUEUE.vf.json'
  ): Promise<{ task?: any; validation: ValidationResult }> {
    // Get the next task without removing it
    const taskQueue = await this.read(filePath);
    let nextTask: EnhancedTask | null = null;
    
    if (priority) {
      const queue = taskQueue.taskQueues?.[priority];
      if (queue && Array.isArray(queue) && queue.length > 0) {
        nextTask = queue[0];
      }
    } else {
      // Find highest priority task
      for (const p of ["critical", 'high', 'medium', 'low']) {
        const queue = taskQueue.taskQueues?.[p];
        if (queue && Array.isArray(queue) && queue.length > 0) {
          nextTask = queue[0];
          priority = p;
          break;
        }
      }
    }

    if (!nextTask) {
      return {
        validation: {
          allowed: false,
          errors: ['No tasks available in queue'],
          warnings: []
        }
      };
    }

    // Validate the task can be popped
    const popValidation = await this.validator.validateTaskPop(nextTask.id);
    
    if (!popValidation.isValid) {
      return {
        validation: {
          allowed: false,
          errors: popValidation.errors,
          warnings: popValidation.warnings
        }
      };
    }

    // Check artifact requirements are still met
    const artifactValidation = await this.validateArtifactRequirements(nextTask);
    
    if (!artifactValidation.allowed && this.strictMode) {
      return {
        validation: artifactValidation
      };
    }

    // Check if previous tasks created required artifacts
    const createdArtifacts = await this.checkCreatedArtifacts(nextTask);
    
    if (!createdArtifacts.allowed && this.strictMode) {
      return {
        validation: createdArtifacts
      };
    }

    // All validations passed, pop the task
    const poppedTask = await super.pop(priority, filePath);
    
    return {
      task: poppedTask,
      validation: {
        allowed: true,
        errors: [],
        warnings: [...artifactValidation.warnings, ...createdArtifacts.warnings]
      }
    };
  }

  /**
   * Validate artifact requirements for a task
   */
  private async validateArtifactRequirements(task: EnhancedTask): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingArtifacts: string[] = [];
    const invalidArtifacts: string[] = [];

    if (!task.artifactRequirements || task.artifactRequirements.length === 0) {
      return { allowed: true, errors: [], warnings: [] };
    }

    for (const req of task.artifactRequirements) {
      const artifacts = await this.artifactManager.listArtifactsByType(req.type);
      
      // Check minimum count
      if (req.minCount && artifacts.length < req.minCount) {
        errors.push(`Task requires at least ${req.minCount} ${req.type} artifacts, found ${artifacts.length}`);
        missingArtifacts.push(`${req.type} (need ${req.minCount - artifacts.length} more)`);
      }

      // Check pattern matching
      if (req.pattern) {
        const regex = new RegExp(req.pattern);
        const matching = artifacts.filter(a => regex.test(a.path));
        
        if (req.mustExist && matching.length === 0) {
          errors.push(`No ${req.type} artifacts matching pattern '${req.pattern}'`);
          missingArtifacts.push(`${req.type} matching ${req.pattern}`);
        }
      }

      // Check artifact state
      if (req.state) {
        const validStateArtifacts = artifacts.filter(a => a.state === req.state);
        
        if (req.mustExist && validStateArtifacts.length === 0) {
          errors.push(`No ${req.type} artifacts in '${req.state}' state`);
          invalidArtifacts.push(`${req.type} not in ${req.state} state`);
        }
      }
    }

    // Additional validations for specific task types
    const additionalValidation = await this.validateTaskTypeSpecificRequirements(task);
    errors.push(...additionalValidation.errors);
    warnings.push(...additionalValidation.warnings);

    return {
      allowed: errors.length === 0,
      errors,
      warnings,
      missingArtifacts: missingArtifacts.length > 0 ? missingArtifacts : undefined,
      invalidArtifacts: invalidArtifacts.length > 0 ? invalidArtifacts : undefined
    };
  }

  /**
   * Validate artifact creation requirements
   */
  private async validateArtifactCreation(task: EnhancedTask): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!task.artifactsToCreate) {
      return { allowed: true, errors: [], warnings: [] };
    }

    for (const artifactType of task.artifactsToCreate) {
      // Check if artifact type is valid
      const validTypes = [
        'source_code', 'test_code', "documentation", 
        'sequence_diagram', "configuration", 'schema', 'adhoc'
      ];
      
      if (!validTypes.includes(artifactType)) {
        errors.push(`Invalid artifact type to create: ${artifactType}`);
      }

      // Check if required dependencies exist for creating this artifact
      if (artifactType === 'test_code') {
        const sourceCode = await this.artifactManager.listArtifactsByType('source_code');
        if (sourceCode.length === 0) {
          warnings.push('Creating test_code without existing source_code');
        }
      }

      if (artifactType === "documentation") {
        const hasFeature = await this.checkFeatureExists(task);
        if (!hasFeature) {
          warnings.push('Creating documentation without associated feature');
        }
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if previously completed tasks created required artifacts
   */
  private async checkCreatedArtifacts(task: EnhancedTask): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!task.dependencies) {
      return { allowed: true, errors: [], warnings: [] };
    }

    for (const depId of task.dependencies) {
      // Check if dependency task was supposed to create artifacts
      const depTask = await this.findTaskById(depId);
      
      if (depTask && depTask.artifactsToCreate) {
        for (const artifactType of depTask.artifactsToCreate) {
          const artifacts = await this.artifactManager.listArtifactsByType(artifactType);
          
          // Check if any artifact references the dependency task
          const relatedArtifacts = artifacts.filter(a => 
            a.related_artifacts?.includes(depId) ||
            a.purpose?.includes(depId)
          );
          
          if (relatedArtifacts.length === 0) {
            warnings.push(`Dependency task ${depId} was supposed to create ${artifactType} but none found`);
          }
        }
      }
    }

    return {
      allowed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate task type specific requirements
   */
  private async validateTaskTypeSpecificRequirements(task: EnhancedTask): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (task.type) {
      case 'feature_implementation':
        // Must have design documentation
        const designDocs = await this.artifactManager.searchArtifacts('design.*\\.md');
        if (designDocs.length === 0) {
          errors.push('Feature implementation requires design documentation');
        }
        break;

      case 'test_implementation':
        // Must have source code to test
        const sourceCode = await this.artifactManager.listArtifactsByType('source_code');
        if (sourceCode.length === 0) {
          errors.push('Test implementation requires existing source code');
        }
        break;

      case "deployment":
        // All artifacts must be in approved or deployed state
        const allArtifacts = await this.artifactManager.validateAllArtifacts();
        if (allArtifacts.invalid > 0) {
          errors.push(`Cannot deploy with ${allArtifacts.invalid} invalid artifacts`);
        }
        
        // Check for required artifacts
        const requiredForDeployment = ['source_code', 'test_code', "documentation"];
        for (const type of requiredForDeployment) {
          const artifacts = await this.artifactManager.listArtifactsByType(type);
          const approved = artifacts.filter(a => 
            a.state === "approved" || a.state === "deployed"
          );
          
          if (approved.length === 0) {
            errors.push(`Deployment requires approved ${type} artifacts`);
          }
        }
        break;

      case "documentation":
        // Should have source code to document
        const codeArtifacts = await this.artifactManager.listArtifactsByType('source_code');
        if (codeArtifacts.length === 0) {
          warnings.push('Documentation task without source code artifacts');
        }
        break;

      case "refactoring":
        // Must have tests before refactoring
        const tests = await this.artifactManager.listArtifactsByType('test_code');
        if (tests.length === 0) {
          errors.push('Refactoring requires existing tests');
        }
        break;

      case 'review':
        // Check for artifacts in review state
        const artifacts = await this.artifactManager.searchArtifacts('.*');
        const inReview = artifacts.filter(a => a.state === 'review');
        if (inReview.length === 0) {
          warnings.push('Review task but no artifacts in review state');
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Find task by ID
   */
  private async findTaskById(taskId: string): Promise<EnhancedTask | null> {
    const taskQueue = await this.read('/TASK_QUEUE.vf.json');
    
    for (const [priority, queue] of Object.entries(taskQueue.taskQueues || {})) {
      if (Array.isArray(queue)) {
        const task = queue.find((t: any) => t.id === taskId);
        if (task) {
          return task as EnhancedTask;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if feature exists for task
   */
  private async checkFeatureExists(task: EnhancedTask): Promise<boolean> {
    try {
      const featurePath = path.join(this.basePath, 'FEATURE.vf.json');
      const featureContent = await fileAPI.readFile(featurePath, 'utf-8');
      const features = JSON.parse(featureContent);
      
      // Check if task references a feature
      const featureId = task.content?.featureId || task.content?.epic;
      if (!featureId) {
        return false;
      }
      
      for (const category of Object.values(features.features || {})) {
        if (Array.isArray(category)) {
          const found = category.find((f: any) => 
            f.id === featureId || f.name === featureId
          );
          if (found) {
            return true;
          }
        }
      }
    } catch {
      // Feature file doesn't exist
    }
    
    return false;
  }

  /**
   * Get enhanced queue status with artifact validation
   */
  async getEnhancedQueueStatus(): Promise<{
    totalTasks: number;
    blockedTasks: number;
    readyTasks: number;
    invalidTasks: number;
    details: Array<{
      taskId: string;
      status: 'ready' | 'blocked' | 'invalid';
      issues: string[];
    }>;
  }> {
    const taskQueue = await this.read('/TASK_QUEUE.vf.json');
    let totalTasks = 0;
    let blockedTasks = 0;
    let readyTasks = 0;
    let invalidTasks = 0;
    const details: any[] = [];

    for (const [priority, queue] of Object.entries(taskQueue.taskQueues || {})) {
      if (Array.isArray(queue)) {
        for (const task of queue) {
          totalTasks++;
          
          // Check if task can be executed
          const validation = await this.validateArtifactRequirements(task);
          const popValidation = await this.validator.validateTaskPop(task.id);
          
          const issues: string[] = [
            ...validation.errors,
            ...popValidation.errors
          ];
          
          let status: 'ready' | 'blocked' | 'invalid';
          
          if (issues.length === 0) {
            status = 'ready';
            readyTasks++;
          } else if (validation.missingArtifacts || popValidation.errors.some(e => e.includes('blocked'))) {
            status = 'blocked';
            blockedTasks++;
          } else {
            status = 'invalid';
            invalidTasks++;
          }
          
          details.push({
            taskId: task.id,
            status,
            issues
          });
        }
      }
    }

    return {
      totalTasks,
      blockedTasks,
      readyTasks,
      invalidTasks,
      details
    };
  }
}

// Export factory function
export function createEnhancedTaskQueueWrapper(
  basePath?: string,
  strictMode?: boolean
): EnhancedTaskQueueWrapper {
  return new EnhancedTaskQueueWrapper(basePath, strictMode);
}