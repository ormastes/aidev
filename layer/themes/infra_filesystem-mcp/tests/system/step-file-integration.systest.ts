import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { StepFileExecutor } from '../../children/StepFileExecutor';

describe('System Test: Step File Integration', () => {
  const testDir = path.join(__dirname, '../../temp/test-step-integration');
  let executor: StepFileExecutor;
  
  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    executor = new StepFileExecutor();
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Step File Execution', () => {
    it('should execute step_file scripts by name', async () => {
      // Given: The system is in a valid state
      // When: execute step_file scripts by name
      // Then: The expected behavior occurs
      // Create TASK_QUEUE.vf.json for the test
      const taskQueue = {
        metadata: { version: "1.0.0" },
        queues: {
          test_queue: { items: [] }
        }
      };
      fs.writeFileSync('TASK_QUEUE.vf.json', JSON.stringify(taskQueue, null, 2));

      // Test executing check_all_other_queues_empty
      const result = await executor.executeStep({
        content: "Check if all other queues are empty",
        type: "runnable",
        step_file: "check_all_other_queues_empty"
      }, ['test_queue']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('All other queues are empty');
    });

    it('should execute register scripts with parameters', async () => {
      // Given: The system is in a valid state
      // When: execute register scripts with parameters
      // Then: The expected behavior occurs
      // Create NAME_ID.vf.json
      const nameId = {
        metadata: { version: "1.0.0" },
        types: {}
      };
      fs.writeFileSync('NAME_ID.vf.json', JSON.stringify(nameId, null, 2));

      // Test registering a user story
      const result = await executor.executeStep({
        content: "Register user story item",
        type: "runnable",
        step_file: "register_user_story_item"
      }, ['US-001', 'User Authentication', 'Allow users to login']);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Registered user story item: US-001');

      // Verify it was saved
      const savedData = JSON.parse(fs.readFileSync('NAME_ID.vf.json', 'utf8'));
      expect(savedData.types.user_story.items).toHaveLength(1);
      expect(savedData.types.user_story.items[0].id).toBe('US-001');
    });

    it('should handle missing step_file gracefully', async () => {
      // Given: The system is in a valid state
      // When: handle missing step_file gracefully
      // Then: The expected behavior occurs
      const result = await executor.executeStep({
        content: "Non-existent step",
        type: "runnable",
        step_file: "non_existent_script"
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step file not found: non_existent_script');
    });

    it('should execute message type steps', async () => {
      // Given: The system is in a valid state
      // When: execute message type steps
      // Then: The expected behavior occurs
      const result = await executor.executeStep({
        content: "This is just a message",
        type: "message",
        display: "always"
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe("This is just a message");
    });
  });

  describe('Multiple Step Execution', () => {
    it('should execute multiple steps in sequence', async () => {
      // Given: The system is in a valid state
      // When: execute multiple steps in sequence
      // Then: The expected behavior occurs
      // Create required files
      fs.writeFileSync('TASK_QUEUE.vf.json', JSON.stringify({
        metadata: { version: "1.0.0" },
        queues: {}
      }, null, 2));
      
      fs.writeFileSync('NAME_ID.vf.json', JSON.stringify({
        metadata: { version: "1.0.0" },
        types: {}
      }, null, 2));

      const steps = [
        {
          content: "First, display this message",
          type: "message" as const
        },
        {
          content: "Register user story",
          type: "runnable" as const,
          step_file: "register_user_story_item"
        }
      ];

      const results = await executor.executeSteps(steps, ['US-002', 'User Profile']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].output).toContain("First, display this message");
      expect(results[1].success).toBe(true);
      expect(results[1].output).toContain("Registered user story item");
    });

    it('should stop on first runnable failure', async () => {
      // Given: The system is in a valid state
      // When: stop on first runnable failure
      // Then: The expected behavior occurs
      const steps = [
        {
          content: "This will fail",
          type: "runnable" as const,
          step_file: "non_existent"
        },
        {
          content: "This should not execute",
          type: "runnable" as const,
          step_file: "also_non_existent"
        }
      ];

      const results = await executor.executeSteps(steps);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('Script Validation', () => {
    it('should check if step files exist', () => {
      // Given: The system is in a valid state
      // When: check if step files exist
      // Then: The expected behavior occurs
      expect(executor.stepFileExists('check_all_other_queues_empty')).toBe(true);
      expect(executor.stepFileExists('register_user_story_item')).toBe(true);
      expect(executor.stepFileExists('non_existent_script')).toBe(false);
    });
  });
});