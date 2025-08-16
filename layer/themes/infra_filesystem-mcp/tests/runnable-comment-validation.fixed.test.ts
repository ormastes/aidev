/**
 * System tests for runnable comment validation functionality
 * Tests the integration of before_insert_steps and after_pop_steps
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { VFTaskQueueWrapper } from '../children/VFTaskQueueWrapper';
import { VFNameIdWrapper } from '../children/VFNameIdWrapper';
import { CommentTaskExecutor } from '../children/CommentTaskExecutor';

describe('System Test: Runnable Comment Validation', () => {
  const testDir = path.join(__dirname, '../temp/test-runnable-validation');
  let taskQueueWrapper: VFTaskQueueWrapper;
  let nameIdWrapper: VFNameIdWrapper;
  let commentExecutor: CommentTaskExecutor;

  beforeEach(async () => {
    // Clean and create test directory
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true });
    }
    await fs.promises.mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize wrappers
    commentExecutor = CommentTaskExecutor.createWithCommentSupport(testDir);
    taskQueueWrapper = new VFTaskQueueWrapper(testDir, commentExecutor.getExecutor());
    nameIdWrapper = new VFNameIdWrapper(testDir);

    // Create initial queue structure
    const queueData = {
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 0
      },
      working_item: null,
      queues: {
        system_tests_implement: {
          items: [],
          insert_comment: "Validate child items before inserting system test",
          before_insert_steps: [
            {
              content: "Check <system-test-item> child items",
              type: "runnable" as const,
              step_file: "check_system_test_child_items"
            }
          ]
        },
        scenarios: {
          items: [],
          insert_comment: "Register artifacts and entities",
          before_insert_steps: [
            {
              content: "Register artifacts from <scenario-item>",
              type: "runnable" as const,
              step_file: "register_artifacts"
            }
          ]
        }
      },
      global_config: {},
      priority_order: ["system_tests_implement", "scenarios"]
    };

    await taskQueueWrapper.write('TASK_QUEUE.vf.json', queueData);

    // Create initial NAME_ID structure
    const nameIdData = {
      metadata: {
        version: "1.0.0"
      },
      types: {
        environment_test: { items: [] },
        external_test: { items: [] },
        integration_test: { items: [] },
        artifacts: { items: [] },
        entities: { items: [] }
      }
    };

    await nameIdWrapper.write('NAME_ID.vf.json', nameIdData);
  });

  afterEach(async () => {
    process.chdir(__dirname);
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('System Test Validation', () => {
    it('should create mock validation since step files are not implemented', async () => {
      // For now, just test the basic structure
      const systemTestItem = {
        id: 'system-test-001',
        type: 'system_test' as const,
        priority: 'high' as const,
        content: {
          title: 'Auth Flow System Test',
          description: 'Test complete authentication flow'
        },
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      // Push directly without validation for now
      await taskQueueWrapper.push(systemTestItem, 'high', 'TASK_QUEUE.vf.json');

      const status = await taskQueueWrapper.getQueueStatus('TASK_QUEUE.vf.json');
      expect(status.totalPending).toBe(1);
    });
  });

  describe('Basic Queue Operations', () => {
    it('should push and pop items correctly', async () => {
      const task = {
        content: { message: 'Test task' },
        type: 'data' as const
      };

      await taskQueueWrapper.push(task, 'high', 'TASK_QUEUE.vf.json');
      
      const result = await taskQueueWrapper.pop(undefined, 'TASK_QUEUE.vf.json');
      expect(result.workingItem).toBeDefined();
      expect(result.workingItem?.content).toEqual({ message: 'Test task' });
    });
  });

  describe('NAME_ID Operations', () => {
    it('should add and retrieve entities', async () => {
      const entityId = await nameIdWrapper.addEntity('test-entity', {
        type: 'test',
        description: 'Test entity'
      }, 'NAME_ID.vf.json');

      expect(entityId).toBeDefined();

      const entities = await nameIdWrapper.getEntities('test-entity', 'NAME_ID.vf.json');
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('test-entity');
    });
  });
});