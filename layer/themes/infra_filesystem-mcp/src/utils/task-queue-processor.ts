/**
 * Task queue processor with support for children and variable dictionary
 */

import { TaskQueueInputItem, VariableDictionary, TaskQueueItemType } from '../types/task-queue-input';
import { convertContentToFilename } from './content-converter';

export interface ProcessingContext {
  variables: VariableDictionary;
  processedSteps: string[];
  generatedItems: TaskQueueInputItem[];
}

export class TaskQueueProcessor {
  private context: ProcessingContext = {
    variables: {},
    processedSteps: [],
    generatedItems: []
  };

  /**
   * Process a step and extract/generate variables
   */
  processStep(step: string, currentItem: TaskQueueInputItem): void {
    // Generate step file name
    const stepFile = convertContentToFilename(step);
    this.context.processedSteps.push(stepFile);

    // Check for variable references
    const varMatches = step.matchAll(/<([^>]+)>/g);
    for (const match of varMatches) {
      const varName = match[1];
      this.resolveVariable(varName, currentItem);
    }

    // Handle generation directives
    if (step.includes('Generate <gen:')) {
      this.handleGeneration(step, currentItem);
    }

    // Handle insertion directives
    if (step.includes('Insert <')) {
      this.handleInsertion(step, currentItem);
    }

    // Handle registration directives
    if (step.includes('Register <')) {
      this.handleRegistration(step, currentItem);
    }
  }

  /**
   * Resolve a variable reference
   */
  private resolveVariable(varName: string, context: TaskQueueInputItem): any {
    // Check if it's already in the variable dictionary
    if (this.context.variables[varName]) {
      return this.context.variables[varName].value;
    }

    // Check if it's a context reference
    if (varName === context.type) {
      return context;
    }

    // Check parent variables
    if (context.variables && context.variables[varName]) {
      return context.variables[varName].value;
    }

    return null;
  }

  /**
   * Handle generation directives like "Generate <gen:external_access>"
   */
  private handleGeneration(step: string, context: TaskQueueInputItem): void {
    const genMatch = step.match(/Generate <gen:([^>]+)>/);
    if (!genMatch) return;

    const genType = genMatch[1];
    let generated: any;

    switch (genType) {
      case 'external_access':
        generated = this.generateExternalAccess(context);
        break;
      case 'coverage_duplication':
        generated = this.generateCoverageDuplication(context);
        break;
      default:
        console.warn(`Unknown generation type: ${genType}`);
        return;
    }

    // Store in variable dictionary
    this.context.variables[`gen:${genType}`] = {
      value: generated,
      generated: true,
      source: step
    };
  }

  /**
   * Handle insertion directives like "Insert <environment_test> item"
   */
  private handleInsertion(step: string, context: TaskQueueInputItem): void {
    const insertMatch = step.match(/Insert <([^>]+)> item/);
    if (!insertMatch) return;

    const itemType = insertMatch[1];
    
    // Check if it's a generated item
    if (itemType.startsWith('gen:')) {
      // First generate it if not exists
      const genType = itemType.substring(4); // Remove 'gen:' prefix
      if (!this.context.variables[itemType]) {
        this.handleGeneration(`Generate <${itemType}>`, context);
      }
      
      const genValue = this.context.variables[itemType];
      if (genValue && genValue.value) {
        this.context.generatedItems.push(genValue.value);
      }
    } else {
      // Create new item
      const newItem = this.createChildItem(itemType, context);
      this.context.generatedItems.push(newItem);
    }
  }

  /**
   * Handle registration directives
   */
  private handleRegistration(step: string, context: TaskQueueInputItem): void {
    const regMatch = step.match(/Register <([^>]+)> on NAME_ID\.vf\.json/);
    if (!regMatch) return;

    const itemToRegister = regMatch[1];
    // This would interact with NAME_ID.vf.json
    console.log(`Registering ${itemToRegister} in NAME_ID.vf.json`);
  }

  /**
   * Generate external access items from system sequence diagram
   */
  private generateExternalAccess(context: TaskQueueInputItem): any[] {
    // This would analyze the system sequence diagram
    // For now, return mock data
    return [{
      id: `ext-${context.id}-api`,
      type: 'external_access',
      name: 'API External Access',
      access_type: 'api',
      endpoint: '/api/v1/resource',
      parent_id: context.id
    }];
  }

  /**
   * Generate coverage duplication item
   */
  private generateCoverageDuplication(context: TaskQueueInputItem): TaskQueueInputItem {
    return {
      id: `coverage-${context.id}`,
      type: 'coverage_duplication',
      content: `Coverage and duplication check for ${context.content}`,
      parent: context.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Create a child item
   */
  private createChildItem(itemType: string, parent: TaskQueueInputItem): TaskQueueInputItem {
    return {
      id: `${itemType}-${parent.id}-${Date.now()}`,
      type: itemType as TaskQueueItemType,
      content: `${itemType.replace(/_/g, ' ')} for ${parent.content}`,
      parent: parent.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      variables: { ...this.context.variables }
    };
  }

  /**
   * Process an item with all its steps
   */
  processItem(item: TaskQueueInputItem, steps: string[]): ProcessingResult {
    // Reset context for new item
    this.context = {
      variables: item.variables || {},
      processedSteps: [],
      generatedItems: []
    };

    // Process each step
    for (const step of steps) {
      this.processStep(step, item);
    }

    // Attach generated items as children
    if (this.context.generatedItems.length > 0) {
      item.children = [...(item.children || []), ...this.context.generatedItems];
    }

    // Update item variables
    item.variables = { ...item.variables, ...this.context.variables };

    return {
      processedItem: item,
      generatedItems: this.context.generatedItems,
      variables: this.context.variables,
      processedSteps: this.context.processedSteps
    };
  }
}

export interface ProcessingResult {
  processedItem: TaskQueueInputItem;
  generatedItems: TaskQueueInputItem[];
  variables: VariableDictionary;
  processedSteps: string[];
}

// Export singleton instance
export const taskQueueProcessor = new TaskQueueProcessor();