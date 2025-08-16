#!/usr/bin/env node
/**
 * Script to insert tasks with children into the task queue
 * Supports the new workflow with variable dictionary and generated items
 */

import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { TaskQueueInputItem, VariableDictionary, createGeneratedVariable } from '../types/task-queue-input';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface TaskQueue {
  metadata: any;
  working_item: any | null;
  queues: Record<string, {
    items: any[];
    before_insert_steps?: string[];
    after_pop_steps?: string[];
  }>;
  global_config: any;
  priority_order: string[];
}

class TaskQueueManager {
  private queuePath: string;
  private queue: TaskQueue;
  private variableDict: VariableDictionary = {};

  constructor(queuePath: string) {
    this.queuePath = queuePath;
    this.queue = this.loadQueue();
  }

  private async loadQueue(): TaskQueue {
    const content = fs.readFileSync(this.queuePath, 'utf-8');
    return JSON.parse(content);
  }

  private async saveQueue(): void {
    await fileAPI.createFile(this.queuePath, JSON.stringify(this.queue, { type: FileType.TEMPORARY }));
  }

  // Process step variables and generate items
  private async processStep(step: string, context: TaskQueueInputItem): void {
    // Handle generated variables
    const genMatch = step.match(/Generate <gen:(\w+)>/);
    if (genMatch) {
      const varName = genMatch[1];
      this.generateVariable(varName, context);
    }

    // Handle insertions
    const insertMatch = step.match(/Insert <([^>]+)> item/);
    if (insertMatch) {
      const itemType = insertMatch[1];
      
      // Check if it's a generated item
      if (itemType.startsWith('gen:')) {
        // First generate if not exists
        const genType = itemType.substring(4); // Remove 'gen:' prefix
        if (!this.variableDict[itemType]) {
          this.generateVariable(genType, context);
        }
        
        // Use the generated variable value as child
        const genValue = this.variableDict[itemType];
        if (genValue && genValue.value) {
          if (!context.children) {
            context.children = [];
          }
          context.children.push(genValue.value);
        }
      } else {
        this.generateChildItem(itemType, context);
      }
    }
  }

  private async generateVariable(varName: string, context: TaskQueueInputItem): void {
    // Generate based on variable type
    switch (varName) {
      case 'external_access':
        // Extract external access from system sequence diagram
        const externalAccess = this.extractExternalAccess(context);
        this.variableDict[`gen:${varName}`] = {
          value: externalAccess,
          generated: true,
          source: 'system_sequence_diagram'
        };
        break;
      
      case 'coverage_duplication':
        // Generate coverage duplication item
        const coverageItem = {
          id: `coverage-${context.id}`,
          type: 'coverage_duplication',
          content: `Coverage and duplication check for ${context.content}`,
          parent: context.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.variableDict[`gen:${varName}`] = {
          value: coverageItem,
          generated: true,
          source: 'system_tests_implement'
        };
        break;
    }
  }

  private async extractExternalAccess(context: TaskQueueInputItem): any[] {
    // Mock implementation - would analyze system sequence diagram
    return [
      {
        id: `ext-access-${context.id}-1`,
        type: 'external_access',
        access_type: 'api',
        endpoint: '/api/v1/data'
      }
    ];
  }

  private async generateChildItem(itemType: string, parent: TaskQueueInputItem): void {
    const child: TaskQueueInputItem = {
      id: `${itemType}-${parent.id}-${Date.now()}`,
      type: itemType as any,
      content: `${itemType.replace(/_/g, ' ')} for ${parent.content}`,
      parent: parent.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to parent's children
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(child);
  }

  // Insert item with children
  public async insertWithChildren(item: TaskQueueInputItem): void {
    // Process before_insert_steps
    const queueConfig = this.queue.queues[item.type];
    if (queueConfig?.before_insert_steps) {
      for (const step of queueConfig.before_insert_steps) {
        this.processStep(step, item);
      }
    }

    // Add variables to item
    if (Object.keys(this.variableDict).length > 0) {
      item.variables = { ...this.variableDict };
    }

    // Insert main item
    queueConfig.items.push(item);

    // Insert children into their respective queues
    if (item.children) {
      for (const child of item.children) {
        // Map child type to queue name (some have 's' suffix)
        const queueName = this.getQueueNameForType(child.type);
        const childQueue = this.queue.queues[queueName];
        if (childQueue) {
          childQueue.items.push(child);
        }
      }
    }

    // Update metadata
    this.queue.metadata.updated_at = new Date().toISOString();
    this.queue.metadata.total_items = this.countTotalItems();

    // Save queue
    this.saveQueue();
  }

  private async countTotalItems(): number {
    let total = 0;
    for (const queueName in this.queue.queues) {
      total += this.queue.queues[queueName].items.length;
    }
    return total;
  }

  private async getQueueNameForType(type: string): string {
    // Map type to queue name - some have 's' suffix
    const typeToQueueMap: Record<string, string> = {
      'environment_test': 'environment_tests',
      'external_test': 'external_tests',
      'integration_test_implement': 'integration_tests_implement',
      'unit_test': 'unit_tests',
      'integration_test_verify': 'integration_tests_verify',
      'system_test_verify': 'system_tests_verify'
    };
    
    return typeToQueueMap[type] || type;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: insert-task-with-children.ts <queue-path> <input-json>');
    console.error('Example: insert-task-with-children.ts TASK_QUEUE.vf.json \'{"id":"test-1","type":"system_tests_implement","content":"Test system","parent":"scenario-1"}\'');
    process.exit(1);
  }

  const queuePath = args[0];
  const inputJson = args[1];

  try {
    const item: TaskQueueInputItem = JSON.parse(inputJson);
    const manager = new TaskQueueManager(queuePath);
    manager.insertWithChildren(item);
    console.log(`Successfully inserted item ${item.id} with children`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

export { TaskQueueManager };