/**
 * Tests for task queue processor with children and variable support
 */

import { TaskQueueProcessor, ProcessingResult } from '../../src/utils/task-queue-processor';
import { TaskQueueInputItem } from '../../src/types/task-queue-input';

describe('TaskQueueProcessor', () => {
  let processor: TaskQueueProcessor;

  beforeEach(() => {
    processor = new TaskQueueProcessor();
  });

  describe('Variable Generation', () => {
    test('should generate external_access from system sequence diagram', () => {
      const item: TaskQueueInputItem = {
        id: 'sys-test-1',
        type: 'system_tests_implement',
        content: 'Implement system test for user login',
        parent: 'scenario-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Generate <gen:external_access> of <system_sequence_diagram>'
      ];

      const result = processor.processItem(item, steps);

      expect(result.variables['gen:external_access']).toBeDefined();
      expect(result.variables['gen:external_access'].generated).toBe(true);
      expect(result.variables['gen:external_access'].value).toBeInstanceOf(Array);
    });

    test('should generate coverage_duplication item', () => {
      const item: TaskQueueInputItem = {
        id: 'sys-test-2',
        type: 'system_tests_implement',
        content: 'System test for data export',
        parent: 'scenario-2',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Insert <gen:coverage_duplication> item for <system_tests_implement>'
      ];

      const result = processor.processItem(item, steps);

      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0].type).toBe('coverage_duplication');
      expect(result.generatedItems[0].parent).toBe(item.id);
    });
  });

  describe('Child Item Generation', () => {
    test('should insert environment_test child items', () => {
      const item: TaskQueueInputItem = {
        id: 'sys-test-3',
        type: 'system_tests_implement',
        content: 'System test with external dependencies',
        parent: 'scenario-3',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Insert <environment_test> item for <system_tests_implement>'
      ];

      const result = processor.processItem(item, steps);

      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0].type).toBe('environment_test');
      expect(result.generatedItems[0].content).toContain('environment test for');
    });

    test('should handle multiple child insertions', () => {
      const item: TaskQueueInputItem = {
        id: 'sys-test-4',
        type: 'system_tests_implement',
        content: 'Complex system test',
        parent: 'scenario-4',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Insert <environment_test> item for <system_tests_implement>',
        'Insert <external_test> item for <system_tests_implement>',
        'Insert <integration_tests_implement> item for <system_tests_implement>'
      ];

      const result = processor.processItem(item, steps);

      expect(result.generatedItems).toHaveLength(3);
      expect(result.generatedItems.map(i => i.type)).toEqual([
        'environment_test',
        'external_test',
        'integration_tests_implement'
      ]);
    });
  });

  describe('Variable Dictionary Maintenance', () => {
    test('should maintain variables through multiple steps', () => {
      const item: TaskQueueInputItem = {
        id: 'sys-test-5',
        type: 'system_tests_implement',
        content: 'Test with variable flow',
        parent: 'scenario-5',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Generate <gen:external_access> of <system_sequence_diagram>',
        'Check child items <environment_test> are match to all <external_access>',
        'Insert <gen:coverage_duplication> item for <system_tests_implement>'
      ];

      const result = processor.processItem(item, steps);

      expect(result.variables['gen:external_access']).toBeDefined();
      expect(result.variables['gen:coverage_duplication']).toBeDefined();
      expect(result.processedItem.variables).toMatchObject(result.variables);
    });

    test('should inherit parent variables', () => {
      const parentVariables = {
        'user_story': {
          value: { id: 'story-1', name: 'User Story 1' },
          generated: false,
          source: 'parent'
        }
      };

      const item: TaskQueueInputItem = {
        id: 'sys-test-6',
        type: 'system_tests_implement',
        content: 'Test inheriting variables',
        parent: 'scenario-6',
        variables: parentVariables,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Generate <gen:external_access> of <system_sequence_diagram>'
      ];

      const result = processor.processItem(item, steps);

      expect(result.variables['user_story']).toBeDefined();
      expect(result.variables['gen:external_access']).toBeDefined();
    });
  });

  describe('Step Processing', () => {
    test('should convert steps to file names', () => {
      const item: TaskQueueInputItem = {
        id: 'test-7',
        type: 'scenarios',
        content: 'Test scenario',
        parent: 'story-7',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Check <scenarios> are match to all <system_sequence_diagram>',
        'Register <scenarios> on NAME_ID.vf.json'
      ];

      const result = processor.processItem(item, steps);

      expect(result.processedSteps).toHaveLength(2);
      expect(result.processedSteps[0]).toBe('check___scenarios___are_match_to_all___system_sequence_diagram__');
      expect(result.processedSteps[1]).toBe('register___scenarios___on_name_id_vf_json');
    });
  });

  describe('Complex Workflow', () => {
    test('should handle system_tests_implement full workflow', () => {
      const item: TaskQueueInputItem = {
        id: 'sys-test-8',
        type: 'system_tests_implement',
        content: 'Full workflow system test',
        parent: 'scenario-8',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const steps = [
        'Check <system_tests_implement> are match to all <system_sequence_diagram>',
        'Generate <gen:external_access> of <system_sequence_diagram>',
        'Check child items <environment_test> are match to all <external_access>',
        'Check child items <external_test> are match to all <external_access>',
        'Check child items <sequence_diagram> are match to all <integration_tests_implement>',
        'Check child items <integration_tests_implement> are match to all <system_tests_implement>',
        'Insert <gen:coverage_duplication> item for <system_tests_implement>',
        'Insert <environment_test> item for <system_tests_implement>',
        'Insert <external_test> item for <system_tests_implement>',
        'Insert <integration_tests_implement> item for <system_tests_implement>',
        'Register <external_access> on NAME_ID.vf.json',
        'Register <environment_test> on NAME_ID.vf.json',
        'Register <external_test> on NAME_ID.vf.json',
        'Register <integration_tests_implement> on NAME_ID.vf.json',
        'Register <system_tests_implement> on NAME_ID.vf.json'
      ];

      const result = processor.processItem(item, steps);

      // Should have generated variables
      expect(result.variables['gen:external_access']).toBeDefined();
      expect(result.variables['gen:coverage_duplication']).toBeDefined();

      // Should have generated items
      expect(result.generatedItems.length).toBeGreaterThan(0);
      
      // Should have various item types
      const generatedTypes = result.generatedItems.map(i => i.type);
      expect(generatedTypes).toContain('environment_test');
      expect(generatedTypes).toContain('external_test');
      expect(generatedTypes).toContain('integration_tests_implement');
      expect(generatedTypes).toContain('coverage_duplication');

      // Should have processed all steps
      expect(result.processedSteps).toHaveLength(steps.length);

      // Should attach children to item
      expect(result.processedItem.children).toBeDefined();
      expect(result.processedItem.children?.length).toBe(result.generatedItems.length);
    });
  });
});