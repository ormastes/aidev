/**
 * Type definitions for task queue input format with children support
 */

export interface TaskQueueInputItem {
  id: string;
  type: TaskQueueItemType;
  content: string;
  parent: string;
  priority?: 'high' | 'medium' | 'low';
  points?: number;
  cucumber_steps?: string[];
  messages?: {
    always_print?: string[];
    operation_print?: string[];
  };
  children?: TaskQueueInputItem[];
  variables?: Record<string, {
    value: any;
    generated?: boolean;
    source?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export type TaskQueueItemType = 
  | 'adhoc_temp_user_request'
  | 'user_story'
  | "scenarios"
  | 'environment_tests'
  | 'external_tests'
  | 'system_tests_implement'
  | 'integration_tests_implement'
  | 'unit_tests'
  | 'integration_tests_verify'
  | 'system_tests_verify'
  | 'coverage_duplication'
  | "retrospective"
  | 'empty';

export interface GeneratedVariable {
  type: string;
  value: any;
  source: string;
  generated_at: string;
}

export interface VariableDictionary {
  [key: string]: {
    value: any;
    generated?: boolean;
    source?: string;
  };
}

export interface TaskQueueInsertOperation {
  queue: TaskQueueItemType;
  item: TaskQueueInputItem;
  variables?: VariableDictionary;
}

export interface TaskQueueBatchInsert {
  operations: TaskQueueInsertOperation[];
  maintain_variables?: boolean;
}

// Helper function to create a task queue item
export function createTaskQueueItem(
  type: TaskQueueItemType,
  content: string,
  parent: string,
  options?: Partial<TaskQueueInputItem>
): TaskQueueInputItem {
  const now = new Date().toISOString();
  return {
    id: options?.id || `${type}-${Date.now()}`,
    type,
    content,
    parent,
    created_at: now,
    updated_at: now,
    ...options
  };
}

// Helper to create generated variables
export function createGeneratedVariable(
  type: string,
  value: any,
  source: string
): GeneratedVariable {
  return {
    type,
    value,
    source,
    generated_at: new Date().toISOString()
  };
}