/**
 * Tests for insert-task-with-children script
 */

import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { TaskQueueManager } from '../../src/scripts/insert-task-with-children';
import { TaskQueueInputItem } from '../../src/types/task-queue-input';

// Mock fs module
jest.mock('fs');

describe("TaskQueueManager", () => {
  const mockQueue = {
    metadata: {
      version: '1.0.0',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      total_items: 0,
      description: 'Test queue'
    },
    working_item: null,
    queues: {
      system_tests_implement: {
        items: [],
        before_insert_steps: [
          'Check <system_tests_implement> are match to all <system_sequence_diagram>',
          'Generate <gen:external_access> of <system_sequence_diagram>',
          'Insert <environment_test> item for <system_tests_implement>',
          'Insert <external_test> item for <system_tests_implement>',
          'Insert <integration_tests_implement> item for <system_tests_implement>',
          'Insert <gen:coverage_duplication> item for <system_tests_implement>'
        ]
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
    },
    global_config: {
      seldom_display_default: 5,
      operation_counters: {}
    },
    priority_order: [
      'system_tests_implement',
      'environment_tests',
      'external_tests',
      'integration_tests_implement',
      'coverage_duplication'
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockQueue));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  describe("insertWithChildren", () => {
    test('should insert item with generated children', () => {
      const manager = new TaskQueueManager('test-queue.json');
      
      const item: TaskQueueInputItem = {
        id: 'sys-test-1',
        type: 'system_tests_implement',
        content: 'Implement system test for user authentication',
        parent: 'scenario-auth',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      manager.insertWithChildren(item);

      // Verify file was written
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Get the saved data
      const savedData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      );

      // Main item should be in system_tests_implement queue
      expect(savedData.queues.system_tests_implement.items).toHaveLength(1);
      expect(savedData.queues.system_tests_implement.items[0].id).toBe('sys-test-1');

      // Should have children
      const mainItem = savedData.queues.system_tests_implement.items[0];
      expect(mainItem.children).toBeDefined();
      expect(mainItem.children.length).toBeGreaterThan(0);

      // Should have variables
      expect(mainItem.variables).toBeDefined();
      expect(mainItem.variables['gen:external_access']).toBeDefined();
      expect(mainItem.variables['gen:coverage_duplication']).toBeDefined();

      // Children should be in their respective queues
      const childTypes = mainItem.children.map((c: any) => c.type);
      expect(childTypes).toContain('environment_test');
      expect(childTypes).toContain('external_test');
      expect(childTypes).toContain('integration_tests_implement');
      expect(childTypes).toContain('coverage_duplication');

      // Metadata should be updated
      expect(savedData.metadata.total_items).toBeGreaterThan(0);
      expect(savedData.metadata.updated_at).not.toBe(mockQueue.metadata.updated_at);
    });

    test('should process steps and generate variables', () => {
      const manager = new TaskQueueManager('test-queue.json');
      
      const item: TaskQueueInputItem = {
        id: 'sys-test-2',
        type: 'system_tests_implement',
        content: 'Test with variable generation',
        parent: 'scenario-2',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      manager.insertWithChildren(item);

      const savedData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      );

      const savedItem = savedData.queues.system_tests_implement.items[0];
      
      // Should have generated external_access variable
      expect(savedItem.variables['gen:external_access']).toBeDefined();
      expect(savedItem.variables['gen:external_access'].generated).toBe(true);
      expect(savedItem.variables['gen:external_access'].source).toBe('system_sequence_diagram');

      // Should have generated coverage_duplication variable
      expect(savedItem.variables['gen:coverage_duplication']).toBeDefined();
      expect(savedItem.variables['gen:coverage_duplication'].generated).toBe(true);
    });

    test('should maintain existing queue items', () => {
      // Add existing items to mock queue
      const queueWithItems = {
        ...mockQueue,
        queues: {
          ...mockQueue.queues,
          environment_tests: {
            items: [
              {
                id: 'existing-env-test',
                type: 'environment_tests',
                content: 'Existing environment test',
                parent: 'old-scenario'
              }
            ]
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(queueWithItems));
      
      const manager = new TaskQueueManager('test-queue.json');
      
      const item: TaskQueueInputItem = {
        id: 'sys-test-3',
        type: 'system_tests_implement',
        content: 'New system test',
        parent: 'scenario-3',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      manager.insertWithChildren(item);

      const savedData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      );

      // Should maintain existing items
      const envTests = savedData.queues.environment_tests.items;
      expect(envTests.find((i: any) => i.id === 'existing-env-test')).toBeDefined();
      
      // Should have new items in system_tests_implement
      const sysTests = savedData.queues.system_tests_implement.items;
      expect(sysTests).toHaveLength(1);
      expect(sysTests[0].children).toBeDefined();
      
      // New environment test should be in children and in queue
      const newEnvTests = envTests.filter((i: any) => i.id !== 'existing-env-test');
      expect(newEnvTests.length).toBeGreaterThan(0);
    });
  });

  describe('Variable Generation', () => {
    test('should extract external access from context', () => {
      const manager = new TaskQueueManager('test-queue.json');
      
      const item: TaskQueueInputItem = {
        id: 'sys-test-ext',
        type: 'system_tests_implement',
        content: 'Test external access extraction',
        parent: 'scenario-ext',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      manager.insertWithChildren(item);

      const savedData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      );

      const savedItem = savedData.queues.system_tests_implement.items[0];
      const externalAccess = savedItem.variables['gen:external_access'].value;

      expect(Array.isArray(externalAccess)).toBe(true);
      expect(externalAccess[0]).toMatchObject({
        type: 'external_access',
        access_type: 'api',
        endpoint: expect.any(String)
      });
    });
  });

  describe('Child Item Generation', () => {
    test('should generate proper child item IDs', () => {
      const manager = new TaskQueueManager('test-queue.json');
      
      const item: TaskQueueInputItem = {
        id: 'parent-1',
        type: 'system_tests_implement',
        content: 'Parent test',
        parent: 'scenario-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      manager.insertWithChildren(item);

      const savedData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      );

      const mainItem = savedData.queues.system_tests_implement.items[0];
      
      // All children should reference parent
      mainItem.children.forEach((child: any) => {
        expect(child.parent).toBe('parent-1');
        expect(child.id).toContain('parent-1');
      });
    });

    test('should set proper content for child items', () => {
      const manager = new TaskQueueManager('test-queue.json');
      
      const item: TaskQueueInputItem = {
        id: 'sys-test-content',
        type: 'system_tests_implement',
        content: 'User login system test',
        parent: 'scenario-login',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      manager.insertWithChildren(item);

      const savedData = JSON.parse(
        (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      );

      const mainItem = savedData.queues.system_tests_implement.items[0];
      
      // Check child content references parent
      const envTestChild = mainItem.children.find((c: any) => c.type === 'environment_test');
      expect(envTestChild.content).toContain('User login system test');
    });
  });
});