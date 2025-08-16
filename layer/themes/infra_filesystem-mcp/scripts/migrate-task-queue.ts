#!/usr/bin/env ts-node

/**
 * Migration script to convert between priority-based and test-driven task queue formats
 * 
 * Supports bidirectional conversion:
 * - Priority format (taskQueues) -> Test-driven format (queues)
 * - Test-driven format (queues) -> Priority format (taskQueues)
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

interface PriorityTaskItem {
  id: string;
  type?: string;
  priority?: string;
  epic?: string;
  content: any;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

interface TestDrivenTaskItem {
  id: string;
  type: string;
  content: string;
  parent: string;
  priority?: "critical" | 'high' | 'medium' | 'low';
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface PriorityBasedQueue {
  taskQueues: {
    critical?: PriorityTaskItem[];
    high?: PriorityTaskItem[];
    medium?: PriorityTaskItem[];
    low?: PriorityTaskItem[];
    completed?: PriorityTaskItem[];
  };
}

interface TestDrivenQueue {
  metadata: any;
  working_item: TestDrivenTaskItem | null;
  queues: {
    [queueName: string]: {
      items: TestDrivenTaskItem[];
      [key: string]: any;
    };
  };
  global_config: any;
  priority_order: string[];
}

/**
 * Map priority-based task types to test-driven queue types
 */
const typeToQueueMap: Record<string, string> = {
  'test_implementation': 'system_tests_implement',
  'system_testing': 'system_tests_implement',
  'integration_testing': 'integration_tests_implement',
  'unit_testing': 'unit_tests',
  'feature_implementation': 'user_story',
  'bug_fix': 'adhoc_temp_user_request',
  'environment_test': 'environment_tests',
  'external_test': 'external_tests',
  'coverage_check': 'coverage_duplication',
  "retrospective": "retrospective"
};

/**
 * Convert priority-based format to test-driven format
 */
async function convertToTestDriven(priorityQueue: PriorityBasedQueue): TestDrivenQueue {
  const testDrivenQueue: TestDrivenQueue = {
    metadata: {
      version: "1.0.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_items: 0,
      description: "Migrated from priority-based format"
    },
    working_item: null,
    queues: {
      adhoc_temp_user_request: { items: [] },
      user_story: { items: [] },
      scenarios: { items: [] },
      environment_tests: { items: [] },
      external_tests: { items: [] },
      system_tests_implement: { items: [] },
      integration_tests_implement: { items: [] },
      unit_tests: { items: [] },
      integration_tests_verify: { items: [] },
      system_tests_verify: { items: [] },
      coverage_duplication: { items: [] },
      retrospective: { items: [] }
    },
    global_config: {
      seldom_display_default: 5,
      operation_counters: {}
    },
    priority_order: [
      "adhoc_temp_user_request",
      "environment_tests",
      "external_tests",
      "system_tests_implement",
      "integration_tests_implement",
      "unit_tests",
      "integration_tests_verify",
      "system_tests_verify",
      "scenarios",
      "user_story",
      "coverage_duplication",
      "retrospective"
    ]
  };

  let totalItems = 0;

  // Process all priority levels
  const priorityLevels: Array<keyof typeof priorityQueue.taskQueues> = ["critical", 'high', 'medium', 'low'];
  
  for (const priorityLevel of priorityLevels) {
    const tasks = priorityQueue.taskQueues[priorityLevel] || [];
    
    for (const task of tasks) {
      if (task.status === "completed") continue; // Skip completed tasks
      
      const queueType = determineQueueType(task);
      const convertedItem: TestDrivenTaskItem = {
        id: task.id,
        type: queueType,
        content: formatTaskContent(task),
        parent: task.epic || 'system',
        priority: priorityLevel as any,
        created_at: task.createdAt,
        updated_at: task.updatedAt
      };

      // Add to appropriate queue
      if (testDrivenQueue.queues[queueType]) {
        testDrivenQueue.queues[queueType].items.push(convertedItem);
        totalItems++;
      }
    }
  }

  testDrivenQueue.metadata.total_items = totalItems;
  return testDrivenQueue;
}

/**
 * Convert test-driven format to priority-based format
 */
async function convertToPriorityBased(testDrivenQueue: TestDrivenQueue): PriorityBasedQueue {
  const priorityQueue: PriorityBasedQueue = {
    taskQueues: {
      critical: [],
      high: [],
      medium: [],
      low: [],
      completed: []
    }
  };

  // Process all queues
  for (const [queueName, queue] of Object.entries(testDrivenQueue.queues)) {
    for (const item of queue.items) {
      const priority = item.priority || determinePriority(queueName);
      const priorityLevel = priority as keyof typeof priorityQueue.taskQueues;
      
      const convertedTask: PriorityTaskItem = {
        id: item.id,
        type: mapQueueTypeToTaskType(queueName),
        priority: priority,
        epic: item.parent !== 'system' ? item.parent : undefined,
        content: {
          title: extractTitle(item.content),
          description: item.content,
          queue_section: queueName,
          original_text: item.content
        },
        status: 'pending',
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };

      priorityQueue.taskQueues[priorityLevel]?.push(convertedTask);
    }
  }

  return priorityQueue;
}

/**
 * Determine queue type from task
 */
async function determineQueueType(task: PriorityTaskItem): string {
  // Check task type
  if (task.type && typeToQueueMap[task.type]) {
    return typeToQueueMap[task.type];
  }

  // Analyze content for clues
  const content = JSON.stringify(task.content).toLowerCase();
  
  if (content.includes('test') && content.includes('system')) {
    return 'system_tests_implement';
  } else if (content.includes('test') && content.includes("integration")) {
    return 'integration_tests_implement';
  } else if (content.includes('test') && content.includes('unit')) {
    return 'unit_tests';
  } else if (content.includes('feature')) {
    return 'user_story';
  } else if (content.includes("scenario")) {
    return "scenarios";
  } else if (content.includes("coverage")) {
    return 'coverage_duplication';
  }

  return 'adhoc_temp_user_request';
}

/**
 * Format task content for test-driven format
 */
async function formatTaskContent(task: PriorityTaskItem): string {
  if (typeof task.content === 'string') {
    return task.content;
  } else if (task.content?.title) {
    return task.content.title;
  } else if (task.content?.description) {
    return task.content.description;
  }
  return JSON.stringify(task.content);
}

/**
 * Determine priority based on queue type
 */
async function determinePriority(queueName: string): string {
  const highPriorityQueues = ['adhoc_temp_user_request', 'environment_tests', 'external_tests'];
  const mediumPriorityQueues = ['system_tests_implement', 'integration_tests_implement', 'unit_tests'];
  
  if (highPriorityQueues.includes(queueName)) return 'high';
  if (mediumPriorityQueues.includes(queueName)) return 'medium';
  return 'low';
}

/**
 * Map queue type to task type
 */
async function mapQueueTypeToTaskType(queueName: string): string {
  const reverseMap: Record<string, string> = {
    'system_tests_implement': 'test_implementation',
    'integration_tests_implement': 'integration_testing',
    'unit_tests': 'unit_testing',
    'user_story': 'feature_implementation',
    'adhoc_temp_user_request': 'bug_fix',
    'environment_tests': 'environment_test',
    'external_tests': 'external_test',
    'coverage_duplication': 'coverage_check',
    "retrospective": "retrospective"
  };
  return reverseMap[queueName] || queueName;
}

/**
 * Extract title from content
 */
async function extractTitle(content: string): string {
  // Try to extract first line or first 60 characters
  const lines = content.split('\n');
  if (lines[0]) {
    return lines[0].substring(0, 100);
  }
  return content.substring(0, 100);
}

/**
 * Main migration function
 */
async function migrate(inputFile: string, outputFile: string, direction: "toTestDriven" | "toPriority" = "toTestDriven") {
  try {
    // Read input file
    const inputData = JSON.parse(fileAPI.readFileSync(inputFile, 'utf-8'));
    
    let outputData: any;
    
    // Detect format and convert
    if (direction === "toTestDriven") {
      if (inputData.taskQueues) {
        outputData = convertToTestDriven(inputData);
        console.log('✓ Converted from priority-based to test-driven format');
      } else {
        console.log('Input already in test-driven format');
        return;
      }
    } else {
      if (inputData.queues) {
        outputData = convertToPriorityBased(inputData);
        console.log('✓ Converted from test-driven to priority-based format');
      } else {
        console.log('Input already in priority-based format');
        return;
      }
    }
    
    // Write output file
    await fileAPI.createFile(outputFile, JSON.stringify(outputData, { type: FileType.TEMPORARY }));
    console.log(`✓ Output written to: ${outputFile}`);
    
    // Summary
    if (direction === "toTestDriven") {
      const testDriven = outputData as TestDrivenQueue;
      console.log(`\nMigration Summary:`);
      console.log(`- Total items: ${testDriven.metadata.total_items}`);
      for (const [queue, data] of Object.entries(testDriven.queues)) {
        if (data.items.length > 0) {
          console.log(`  ${queue}: ${data.items.length} items`);
        }
      }
    } else {
      const priority = outputData as PriorityBasedQueue;
      console.log(`\nMigration Summary:`);
      console.log(`- Critical: ${priority.taskQueues.critical?.length || 0} tasks`);
      console.log(`- High: ${priority.taskQueues.high?.length || 0} tasks`);
      console.log(`- Medium: ${priority.taskQueues.medium?.length || 0} tasks`);
      console.log(`- Low: ${priority.taskQueues.low?.length || 0} tasks`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: migrate-task-queue.ts <input-file> <output-file> [--to-priority | --to-test-driven]');
    console.log('');
    console.log('Examples:');
    console.log('  migrate-task-queue.ts TASK_QUEUE.vf.json migrated.json --to-test-driven');
    console.log('  migrate-task-queue.ts old-queue.json new-queue.json --to-priority');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  const direction = args[2] === '--to-priority' ? "toPriority" : "toTestDriven";
  
  migrate(inputFile, outputFile, direction);
}

export { migrate, convertToTestDriven, convertToPriorityBased };