/**
 * Test Suite: Runnable Comment Validation
 * 
 * This test suite verifies that runnable comments in task queue
 * properly validate artifacts, entities, and child items.
 */

import { VFTaskQueueWrapper } from '../children/VFTaskQueueWrapper';
import { VFNameIdWrapper } from '../children/VFNameIdWrapper';
import { CommentTaskExecutor } from '../children/CommentTaskExecutor';
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

describe('Runnable Comment Validation Tests', () => {
  const testDir = path.join(__dirname, 'test-runnable-comments');
  const taskQueuePath = path.join(testDir, 'TASK_QUEUE.vf.json');
  const nameIdPath = path.join(testDir, 'NAME_ID.vf.json');
  
  let taskQueueWrapper: VFTaskQueueWrapper;
  let nameIdWrapper: VFNameIdWrapper;
  let commentExecutor: CommentTaskExecutor;

  beforeEach(async () => {
    // Create test directory
    await fs.promises.mkdir(testDir, { recursive: true });
    
    // Initialize wrappers
    commentExecutor = CommentTaskExecutor.createWithCommentSupport(testDir);
    taskQueueWrapper = new VFTaskQueueWrapper(testDir, commentExecutor.getExecutor());
    nameIdWrapper = new VFNameIdWrapper(testDir);
    
    // Create initial NAME_ID.vf.json
    const nameIdData = {
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 0
      },
      types: {}
    };
    await nameIdWrapper.write('NAME_ID.vf.json', nameIdData);
    
    // Create initial TASK_QUEUE.vf.json with runnable comments
    const taskQueueData = {
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 0
      },
      working_item: null,
      queues: {
        adhoc_temp_user_request: { items: [] },
        user_story: { items: [] },
        scenarios: { items: [] },
        environment_tests: { items: [] },
        external_tests: { items: [] },
        system_tests_implement: {
          items: [],
          before_insert_steps: [
            {
              content: "Check <system-test-impl-item> child items Environment Test for each external access",
              type: "runnable",
              step_file: "check_system_test_child_items"
            },
            {
              content: "Register <system-test-impl-item> on NAME_ID.vf.json",
              type: "runnable",
              step_file: "register_system_test_impl_item"
            }
          ]
        },
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
        "user_story"
      ]
    };
    await taskQueueWrapper.write(taskQueuePath, taskQueueData);
  });

  afterEach(async () => {
    // Clean up
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('System Test Child Item Validation', () => {
    it('should validate that system test has required child items', async () => {
      // First, register some related items in NAME_ID
      await nameIdWrapper.addEntity({
        id: 'env-test-001',
        type: 'environment_test',
        name: 'external-api-test',
        namespace: 'tests/env',
        tags: ['system-test-001', 'external-api']
      });
      
      await nameIdWrapper.addEntity({
        id: 'ext-test-001',
        type: 'external_test',
        name: 'api-interface-test',
        namespace: 'tests/external',
        tags: ['system-test-001', 'external-api']
      });
      
      await nameIdWrapper.addEntity({
        id: 'int-test-001',
        type: 'integration_test',
        name: 'system-integration-test',
        namespace: 'tests/integration',
        tags: ['system-test-001']
      });
      
      // Try to insert a system test that references these items
      const systemTestItem = {
        id: 'system-test-001',
        type: 'system_tests_implement',
        content: 'Test: User authentication flow with external API',
        parent: 'scenario-auth-flow',
        metadata: {
          external_access: ['external-api'],
          required_tests: {
            environment: ['env-test-001'],
            external: ['ext-test-001'],
            integration: ['int-test-001']
          }
        }
      };
      
      // The before_insert_steps should validate these relationships
      const insertResult = await taskQueueWrapper.push(systemTestItem);
      
      expect(insertResult.success).toBe(true);
      expect(insertResult.message).toContain('validation passed');
    });

    it('should reject system test without required child items', async () => {
      // Try to insert a system test without child items
      const systemTestItem = {
        id: 'system-test-002',
        type: 'system_tests_implement',
        content: 'Test: Payment processing with external gateway',
        parent: 'scenario-payment',
        metadata: {
          external_access: ['payment-gateway'],
          required_tests: {
            environment: [],
            external: [],
            integration: []
          }
        }
      };
      
      const insertResult = await taskQueueWrapper.push(systemTestItem);
      
      expect(insertResult.success).toBe(false);
      expect(insertResult.error).toContain('missing required child items');
    });
  });

  describe('Artifact and Entity Registration', () => {
    it('should register artifacts in NAME_ID when inserting items', async () => {
      // Register a scenario item with runnable comment
      const scenarioItem = {
        id: 'scenario-001',
        type: 'scenarios',
        content: 'Scenario: User uploads file and processes it',
        parent: 'user-story-file-processing',
        metadata: {
          artifacts: ['uploaded-file', 'processed-result'],
          entities: ['file-processor', 'storage-service']
        }
      };
      
      // The before_insert_steps should register these in NAME_ID
      const insertResult = await taskQueueWrapper.push(scenarioItem);
      
      expect(insertResult.success).toBe(true);
      
      // Check if artifacts were registered
      const artifacts = await nameIdWrapper.getEntitiesByType('artifacts');
      expect(artifacts).toHaveLength(2);
      expect(artifacts.map(a => a.name)).toContain('uploaded-file');
      expect(artifacts.map(a => a.name)).toContain('processed-result');
      
      // Check if entities were registered
      const entities = await nameIdWrapper.getEntitiesByType('entities');
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.name)).toContain('file-processor');
      expect(entities.map(e => e.name)).toContain('storage-service');
    });

    it('should validate entity dependencies before insertion', async () => {
      // Try to insert an integration test that depends on non-existent entities
      const integrationTestItem = {
        id: 'int-test-002',
        type: 'integration_tests_implement',
        content: 'Test: FileProcessor integrates with StorageService',
        parent: 'scenario-file-processing',
        metadata: {
          required_entities: ['file-processor', 'storage-service'],
          required_artifacts: ['test-file']
        }
      };
      
      const insertResult = await taskQueueWrapper.push(integrationTestItem);
      
      expect(insertResult.success).toBe(false);
      expect(insertResult.error).toContain('required entities not found');
    });
  });

  describe('Before Insert Steps Execution', () => {
    it('should execute all before_insert_steps in order', async () => {
      // Create a queue with multiple before_insert_steps
      const queueData = await taskQueueWrapper.read(taskQueuePath);
      queueData.queues.user_story.before_insert_steps = [
        {
          content: "Check FEATURE.md for user story",
          type: "runnable",
          step_file: "check_feature_md"
        },
        {
          content: "Validate user story format",
          type: "runnable", 
          step_file: "validate_user_story_format"
        },
        {
          content: "Register user story in NAME_ID",
          type: "runnable",
          step_file: "register_user_story"
        }
      ];
      await taskQueueWrapper.write(taskQueuePath, queueData);
      
      // Track execution order
      const executionOrder: string[] = [];
      
      // Mock the step executors
      commentExecutor.registerFunction('check_feature_md', async () => {
        executionOrder.push('check_feature_md');
        return { success: true };
      });
      
      commentExecutor.registerFunction('validate_user_story_format', async () => {
        executionOrder.push('validate_user_story_format');
        return { success: true };
      });
      
      commentExecutor.registerFunction('register_user_story', async () => {
        executionOrder.push('register_user_story');
        return { success: true };
      });
      
      // Insert a user story
      const userStoryItem = {
        id: 'story-001',
        type: 'user_story',
        content: 'As a developer, I want runnable comments to validate artifacts',
        parent: 'epic-validation'
      };
      
      await taskQueueWrapper.push(userStoryItem);
      
      // Verify execution order
      expect(executionOrder).toEqual([
        'check_feature_md',
        'validate_user_story_format',
        'register_user_story'
      ]);
    });

    it('should stop execution if a step fails', async () => {
      // Mock step executors with one failing
      commentExecutor.registerFunction('check_feature_md', async () => {
        return { success: true };
      });
      
      commentExecutor.registerFunction('validate_user_story_format', async () => {
        return { success: false, error: 'Invalid format' };
      });
      
      commentExecutor.registerFunction('register_user_story', async () => {
        throw new Error('Should not be called');
      });
      
      const userStoryItem = {
        id: 'story-002',
        type: 'user_story',
        content: 'Invalid user story',
        parent: 'epic-test'
      };
      
      const result = await taskQueueWrapper.push(userStoryItem);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid format');
    });
  });

  describe('After Pop Steps Display', () => {
    it('should display messages based on configuration', async () => {
      // Create queue with after_pop_steps
      const queueData = await taskQueueWrapper.read(taskQueuePath);
      queueData.queues.scenarios.items = [{
        id: 'scenario-002',
        type: 'scenarios',
        content: 'Scenario: Test message display',
        parent: 'story-test'
      }];
      
      queueData.queues.scenarios.after_pop_steps = [
        {
          content: "Always display this message",
          type: "message",
          display: "always"
        },
        {
          content: "Display seldom (every 5 ops)",
          type: "message",
          display: "seldom"
        },
        {
          content: "Display after 3 operations",
          type: "message",
          display: "count",
          display_count: 3
        }
      ];
      
      await taskQueueWrapper.write(taskQueuePath, queueData);
      
      // Pop the item and check messages
      const popResult = await taskQueueWrapper.popNextTask();
      
      expect(popResult.workingItem).toBeDefined();
      expect(popResult.messages).toBeDefined();
      expect(popResult.messages.always).toContain("Always display this message");
      
      // Check seldom message (should display on 5th operation)
      const counters = queueData.global_config.operation_counters;
      if (counters.scenarios % 5 === 0) {
        expect(popResult.messages.seldom).toContain("Display seldom");
      }
    });
  });

  describe('Complex Runnable Comment Scenarios', () => {
    it('should handle parameterized runnable comments', async () => {
      // Test runnable comments with parameters
      const queueData = await taskQueueWrapper.read(taskQueuePath);
      queueData.queues.environment_tests.before_insert_steps = [
        {
          content: "Check external dependencies for <test-name> in <environment>",
          type: "runnable",
          step_file: "check_dependencies_parameterized",
          parameters: ["redis-test", "development"]
        }
      ];
      await taskQueueWrapper.write(taskQueuePath, queueData);
      
      // Mock parameterized executor
      commentExecutor.registerFunction('check_dependencies_parameterized', 
        async (testName: string, environment: string) => {
          expect(testName).toBe('redis-test');
          expect(environment).toBe('development');
          return { success: true };
        }
      );
      
      const envTestItem = {
        id: 'env-test-002',
        type: 'environment_tests',
        content: 'Test: Redis connection in development',
        parent: 'scenario-caching'
      };
      
      const result = await taskQueueWrapper.push(envTestItem);
      expect(result.success).toBe(true);
    });

    it('should validate cross-queue dependencies', async () => {
      // System test should check for matching integration test
      await nameIdWrapper.addEntity({
        id: 'system-test-003',
        type: 'system_test',
        name: 'auth-flow-system-test',
        namespace: 'tests/system',
        tags: ['auth', 'e2e']
      });
      
      // Try to insert integration test verify without matching integration test implement
      const verifyItem = {
        id: 'int-verify-001',
        type: 'integration_tests_verify',
        content: 'Verify: Auth integration test passes',
        parent: 'int-test-auth',
        metadata: {
          implements_test: 'int-test-auth',
          system_test: 'system-test-003'
        }
      };
      
      // Should fail because integration test implementation doesn't exist
      const result = await taskQueueWrapper.push(verifyItem);
      expect(result.success).toBe(false);
      expect(result.error).toContain('implementation not found');
    });
  });
});