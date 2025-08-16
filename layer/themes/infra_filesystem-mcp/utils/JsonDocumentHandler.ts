import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import Ajv, { ValidateFunction } from 'ajv';
import { JSONPath } from 'jsonpath-plus';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


/**
 * JSON Document Handler for safe JSON modifications
 * Uses JSON parsing, JSONPath for precise targeting, and schema validation
 */
export class JsonDocumentHandler {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      strict: false,
      validateFormats: true
    });
  }

  /**
   * Register a JSON schema for validation
   * @param schemaId Unique identifier for the schema
   * @param schema JSON schema object
   */
  async registerSchema(schemaId: string, schema: any): void {
    const validator = this.ajv.compile(schema);
    this.validators.set(schemaId, validator);
  }

  /**
   * Read and parse JSON file
   * @param filePath Path to JSON file
   * @returns Parsed JSON content
   */
  async readJson(filePath: string): Promise<any> {
    try {
      const content = await fileAPI.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write JSON to file with proper formatting
   * @param filePath Path to JSON file
   * @param data JSON data to write
   * @param schemaId Optional schema ID for validation
   */
  async writeJson(filePath: string, data: any, schemaId?: string): Promise<void> {
    // Validate against schema if provided
    if (schemaId) {
      const validator = this.validators.get(schemaId);
      if (!validator) {
        throw new Error(`Schema '${schemaId}' not registered`);
      }
      
      const valid = validator(data);
      if (!valid) {
        throw new Error(`Validation failed: ${JSON.stringify(validator.errors, null, 2)}`);
      }
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fileAPI.createDirectory(dir);

    // Write with proper formatting
    const jsonContent = JSON.stringify(data, null, 2);
    await fileAPI.createFile(filePath, jsonContent, { type: FileType.TEMPORARY }) => boolean }>,
    schemaId?: string
  ): Promise<void> {
    const data = await this.readJson(filePath);
    
    for (const update of updates) {
      const results = JSONPath({
        path: update.path,
        json: data,
        resultType: 'all'
      });

      for (const result of results) {
        // Apply condition if provided
        if (!update.condition || update.condition(result.value)) {
          // Update the value
          JSONPath({
            path: result.path,
            json: data,
            value: update.value,
            resultType: 'value'
          });
        }
      }
    }

    await this.writeJson(filePath, data, schemaId);
  }

  /**
   * Update task status by ID (specific for task queue scenarios)
   * @param filePath Path to JSON file
   * @param taskId Task ID to update
   * @param newStatus New status value
   * @param schemaId Optional schema ID for validation
   */
  async updateTaskStatus(
    filePath: string, 
    taskId: string, 
    newStatus: string,
    schemaId?: string
  ): Promise<void> {
    const data = await this.readJson(filePath);
    
    // Find and update task by ID in common structures
    let updated = false;
    
    // Check in queues structure
    if (data.queues) {
      for (const queue of Object.values(data.queues)) {
        if (Array.isArray(queue)) {
          const task = queue.find((t: any) => t.id === taskId);
          if (task) {
            task.status = newStatus;
            task.updatedAt = new Date().toISOString();
            updated = true;
            break;
          }
        }
      }
    }
    
    // Check in working item
    if (data.working && data.working.id === taskId) {
      data.working.status = newStatus;
      data.working.updatedAt = new Date().toISOString();
      updated = true;
    }
    
    // Check in workingItem (VF format)
    if (data.workingItem && data.workingItem.id === taskId) {
      data.workingItem.status = newStatus;
      data.workingItem.updated_at = new Date().toISOString();
      updated = true;
    }
    
    // Check in items array (flat structure)
    if (data.items && Array.isArray(data.items)) {
      const task = data.items.find((t: any) => t.id === taskId);
      if (task) {
        task.status = newStatus;
        task.updatedAt = new Date().toISOString();
        updated = true;
      }
    }
    
    if (!updated) {
      throw new Error(`Task with ID '${taskId}' not found in ${filePath}`);
    }
    
    await this.writeJson(filePath, data, schemaId);
  }

  /**
   * Update all tasks matching a condition
   * @param filePath Path to JSON file
   * @param condition Function to test if task should be updated
   * @param updates Object with field updates
   * @param schemaId Optional schema ID for validation
   */
  async updateTasksWhere(
    filePath: string,
    condition: (task: any) => boolean,
    updates: { [key: string]: any },
    schemaId?: string
  ): Promise<number> {
    const data = await this.readJson(filePath);
    let updateCount = 0;
    
    // Helper to update task
    const updateTask = (task: any) => {
      if (condition(task)) {
        Object.assign(task, updates);
        if (!updates.updatedAt && !updates.updated_at) {
          task.updatedAt = task.updatedAt || task.updated_at;
          if (task.updatedAt) {
            task.updatedAt = new Date().toISOString();
          } else if (task.updated_at) {
            task.updated_at = new Date().toISOString();
          }
        }
        updateCount++;
      }
    };
    
    // Update in queues
    if (data.queues) {
      for (const queue of Object.values(data.queues)) {
        if (Array.isArray(queue)) {
          queue.forEach(updateTask);
        }
      }
    }
    
    // Update working/workingItem
    if (data.working) updateTask(data.working);
    if (data.workingItem) updateTask(data.workingItem);
    
    // Update items array
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(updateTask);
    }
    
    await this.writeJson(filePath, data, schemaId);
    return updateCount;
  }

  /**
   * Safely merge updates into existing JSON
   * @param filePath Path to JSON file
   * @param updates Updates to merge
   * @param options Merge options
   */
  async mergeUpdate(
    filePath: string,
    updates: any,
    options: {
      deep?: boolean;
      arrayMerge?: 'replace' | 'concat' | 'unique';
      schemaId?: string;
    } = {}
  ): Promise<void> {
    const data = await this.readJson(filePath);
    
    const merged = this.deepMerge(data, updates, options);
    
    await this.writeJson(filePath, merged, options.schemaId);
  }

  /**
   * Deep merge helper
   */
  private async deepMerge(target: any, source: any, options: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = options.deep !== false 
              ? this.deepMerge(target[key], source[key], options)
              : source[key];
          }
        } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
          output[key] = this.mergeArrays(target[key], source[key], options.arrayMerge);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Array merge helper
   */
  private async mergeArrays(target: any[], source: any[], mode?: string): any[] {
    switch (mode) {
      case 'concat':
        return [...target, ...source];
      case 'unique':
        return [...new Set([...target, ...source])];
      case 'replace':
      default:
        return source;
    }
  }

  /**
   * Check if value is plain object
   */
  private async isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

// Export singleton instance
export const jsonHandler = new JsonDocumentHandler();