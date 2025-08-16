import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { VFTaskQueueWrapper } from '../../children/VFTaskQueueWrapper';
import { StepFileExecutor } from '../../children/StepFileExecutor';
import { CommentTaskExecutor } from '../../children/CommentTaskExecutor';

describe('🚨 Story: System Test: Complete Queue Workflow with Runnable Comments', () => {
  const testDir = path.join(__dirname, '../../temp/test-complete-workflow');
  let taskQueueWrapper: VFTaskQueueWrapper;
  let stepExecutor: StepFileExecutor;
  
  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    const commentExecutor = CommentTaskExecutor.createWithCommentSupport(testDir);
    taskQueueWrapper = new VFTaskQueueWrapper(testDir, commentExecutor.getExecutor());
    stepExecutor = new StepFileExecutor();
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should enforce adhoc queue validation with runnable comment', async () => {
    // Given: The system is in a valid state
    // When: enforce adhoc queue validation with runnable comment
    // Then: The expected behavior occurs
    // Create initial queue with items in other queues
    const queueData = {
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 1
      },
      working_item: null,
      queues: {
        adhoc_temp_user_request: {
          items: [],
          insert_comment: "Check if all other queues are empty before inserting adhoc request",
          pop_comment: "Starting adhoc temp user request task",
          before_insert_steps: [
            {
              content: "Check if all other queues are empty before inserting adhoc request",
              type: "runnable" as const,
              step_file: "check_all_other_queues_empty"
            }
          ],
          after_pop_steps: []
        },
        integration_tests: {
          items: [
            {
              id: "test-001",
              type: "integration_test",
              content: "Test integration",
              status: "pending",
              created_at: new Date().toISOString()
            }
          ]
        }
      },
      global_config: {},
      priority_order: ["adhoc_temp_user_request", "integration_tests"]
    };

    await taskQueueWrapper.write('TASK_QUEUE.vf.json', queueData);

    // Try to execute before_insert_steps for adhoc queue
    const beforeSteps = queueData.queues.adhoc_temp_user_request.before_insert_steps;
    const results = await stepExecutor.executeSteps(beforeSteps, ['adhoc_temp_user_request']);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].output).toContain("Cannot insert adhoc_temp_user_request");
    expect(results[0].output).toContain("integration_tests: 1 items");
  });

  it('should successfully register items with queue workflows', async () => {
    // Given: The system is in a valid state
    // When: successfully register items with queue workflows
    // Then: The expected behavior occurs
    // Create empty queue structure
    const queueData = {
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_items: 0
      },
      working_item: null,
      queues: {
        user_story: {
          items: [],
          insert_comment: "Register user story item",
          pop_comment: "Create scenarios from user story",
          before_insert_steps: [
            {
              content: "Register <user-story-item> on NAME_ID.vf.json",
              type: "runnable" as const,
              step_file: "register_user_story_item"
            }
          ],
          after_pop_steps: [
            {
              content: "Do research and make scenarios",
              type: "message" as const,
              display: "always"
            }
          ]
        },
        scenarios: {
          items: [],
          insert_comment: "Register scenario items",
          pop_comment: "Create system sequence diagrams",
          before_insert_steps: [
            {
              content: "Register the <scenario-items> on NAME_ID.vf.json",
              type: "runnable" as const,
              step_file: "register_scenario_items"
            }
          ],
          after_pop_steps: []
        }
      },
      global_config: {},
      priority_order: ["user_story", "scenarios"]
    };

    await taskQueueWrapper.write('TASK_QUEUE.vf.json', queueData);

    // Create NAME_ID.vf.json
    await fs.promises.writeFile('NAME_ID.vf.json', JSON.stringify({
      metadata: { version: "1.0.0" },
      types: {}
    }, null, 2));

    // Execute user story registration
    const userStorySteps = queueData.queues.user_story.before_insert_steps;
    const userStoryResults = await stepExecutor.executeSteps(
      userStorySteps, 
      ['US-AUTH-001', 'User Authentication', 'Enable secure user login']
    );

    expect(userStoryResults[0].success).toBe(true);
    expect(userStoryResults[0].output).toContain('Registered user story item');

    // Execute scenario registration
    const scenarioSteps = queueData.queues.scenarios.before_insert_steps;
    const scenarioResults = await stepExecutor.executeSteps(
      scenarioSteps,
      ['SCENARIO-LOGIN-001', 'Login with Email', 'US-AUTH-001']
    );

    expect(scenarioResults[0].success).toBe(true);
    expect(scenarioResults[0].output).toContain('Registered scenario item');

    // Verify NAME_ID.vf.json was updated correctly
    const nameIdData = JSON.parse(await fs.promises.readFile('NAME_ID.vf.json', 'utf8'));
    expect(nameIdData.types.user_story.items).toHaveLength(1);
    expect(nameIdData.types.scenario.items).toHaveLength(1);
    expect(nameIdData.types.scenario.items[0].user_story_id).toBe('US-AUTH-001');
  });

  it('should handle system test validation workflow', async () => {
    // Given: The system is in a valid state
    // When: handle system test validation workflow
    // Then: The expected behavior occurs
    // Create queue with system test requirements
    const queueData = {
      metadata: { version: "1.0.0" },
      working_item: null,
      queues: {
        system_tests_implement: {
          items: [],
          insert_comment: "Validate system test requirements",
          pop_comment: "Write system test",
          before_insert_steps: [
            {
              content: "Check <system-test-impl-item> child items",
              type: "runnable" as const,
              step_file: "check_system_test_child_items"
            }
          ],
          after_pop_steps: []
        },
        environment_tests: {
          items: []
        },
        external_tests: {
          items: []
        },
        integration_tests_implement: {
          items: []
        },
        coverage_duplication: {
          items: []
        }
      }
    };

    await taskQueueWrapper.write('TASK_QUEUE.vf.json', queueData);

    // Create NAME_ID.vf.json with external access
    await fs.promises.writeFile('NAME_ID.vf.json', JSON.stringify({
      metadata: { version: "1.0.0" },
      types: {
        external_access: {
          items: [
            {
              id: "EXT-001",
              system_test_id: "SYS-TEST-001",
              service: "redis"
            },
            {
              id: "EXT-002", 
              system_test_id: "SYS-TEST-001",
              service: "postgresql"
            }
          ]
        }
      }
    }, null, 2));

    // Execute validation - should fail due to missing child items
    const validationSteps = queueData.queues.system_tests_implement.before_insert_steps;
    const results = await stepExecutor.executeSteps(validationSteps, ['SYS-TEST-001']);

    expect(results[0].success).toBe(false);
    expect(results[0].output).toContain('System test');
    expect(results[0].output).toContain('missing required child items');
    expect(results[0].output).toContain('environment tests');
    expect(results[0].output).toContain('external tests');
    expect(results[0].output).toContain('integration test');
  });

  it('should display after_pop_steps messages', async () => {
    // Given: The system is in a valid state
    // When: display after_pop_steps messages
    // Then: The expected behavior occurs
    const steps = [
      {
        content: "Step 1: Research the domain",
        type: "message" as const,
        display: "always"
      },
      {
        content: "Step 2: Create design documents", 
        type: "message" as const,
        display: "always"
      },
      {
        content: "Step 3: Generate test scenarios",
        type: "message" as const,
        display: "seldom"
      }
    ];

    const results = await stepExecutor.executeSteps(steps);

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.output).toContain(`Step ${index + 1}`);
    });
  });
});