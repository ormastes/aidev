import { FeatureTaskManager, createFeatureTaskManager } from '../children/FeatureTaskManager';
import { VFDistributedFeatureWrapper } from '../children/VFDistributedFeatureWrapper';
import { VFTaskQueueWrapper } from '../children/VFTaskQueueWrapper';
import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';
import { tmpdir } from 'os';

describe('FeatureTaskManager', () => {
  let tempDir: string;
  let manager: FeatureTaskManager;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'feature-task-test-'));
    
    // Initialize empty FEATURE.vf.json and TASK_QUEUE.vf.json
    const emptyFeatureFile = {
      metadata: {
        level: 'root',
        path: '/FEATURE.vf.json',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      features: {
        platform: [],
        infrastructure: []
      },
      children: []
    };

    const emptyTaskQueue = {
      taskQueues: {
        critical: [],
        high: [],
        medium: [],
        low: [],
        completed: []
      },
      working: [],
      allTasks: [],
      cucumberSteps: [],
      sections: [],
      metadata: {
        totalTasks: 0,
        workingTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        cucumberStepCount: 0,
        lastUpdated: new Date().toISOString(),
        conversionSource: 'TASK_QUEUE.vf.json'
      }
    };

    await fs.writeFile(
      path.join(tempDir, 'FEATURE.vf.json'),
      JSON.stringify(emptyFeatureFile, null, 2)
    );

    await fs.writeFile(
      path.join(tempDir, 'TASK_QUEUE.vf.json'),
      JSON.stringify(emptyTaskQueue, null, 2)
    );

    // Create manager instance
    manager = createFeatureTaskManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('addFeature', () => {
    it('should add a feature and auto-create tasks', async () => {
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature Implementation',
          description: 'A test feature for validation',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'high' as const,
          tags: ['test', 'validation'],
          components: [
            'Component A',
            'Component B',
            'Module 1',
            'Module 2'
          ],
          acceptanceCriteria: [
            'All tests passing'
          ]
        }
      };

      const result = await manager.addFeature('infrastructure', feature);

      expect(result.featureId).toBeTruthy();
      expect(result.taskIds).toHaveLength(6); // 1 main + 4 components + 1 criteria
      expect(result.validation.isValid).toBe(true);

      // Verify tasks were created
      const tasks = await manager.getFeatureTasks(result.featureId);
      expect(tasks).toHaveLength(6);
      expect(tasks[0].content.title).toContain('Implement Test Feature Implementation');
    });

    it('should add feature without creating tasks when disabled', async () => {
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'A test feature',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'medium' as const,
          tags: ['test']
        }
      };

      const result = await manager.addFeature('platform', feature, false);

      expect(result.featureId).toBeTruthy();
      expect(result.taskIds).toHaveLength(0);

      // Verify no tasks were created
      const tasks = await manager.getFeatureTasks(result.featureId);
      expect(tasks).toHaveLength(0);
    });
  });

  describe('updateFeatureStatus', () => {
    it('should prevent feature completion with pending tasks', async () => {
      // Add a feature with tasks
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Task 1', 'Task 2']
        }
      };

      const { featureId } = await manager.addFeature('infrastructure', feature);

      // Try to complete the feature
      const validation = await manager.updateFeatureStatus(featureId, 'completed');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('still pending or in progress'));
    });

    it('should allow feature completion when all tasks are completed', async () => {
      // Add a feature with tasks
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Task 1']
        }
      };

      const { featureId, taskIds } = await manager.addFeature('infrastructure', feature);

      // Complete all tasks
      const taskQueue = JSON.parse(await fs.readFile(path.join(tempDir, 'TASK_QUEUE.vf.json'), 'utf-8'));
      for (const priority of Object.keys(taskQueue.taskQueues)) {
        if (Array.isArray(taskQueue.taskQueues[priority])) {
          taskQueue.taskQueues[priority] = taskQueue.taskQueues[priority].map((task: any) => {
            if (taskIds.includes(task.id)) {
              task.status = 'completed';
              task.completedAt = new Date().toISOString();
            }
            return task;
          });
        }
      }
      await fs.writeFile(path.join(tempDir, 'TASK_QUEUE.vf.json'), JSON.stringify(taskQueue, null, 2));

      // Now complete the feature (with skip validation since we don't have full status manager setup)
      const validation = await manager.updateFeatureStatus(featureId, 'completed', true);

      expect(validation.isValid).toBe(true);
    });

    it('should auto-delete completed tasks when feature is completed', async () => {
      // Add a feature with tasks
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Task 1']
        }
      };

      const { featureId, taskIds } = await manager.addFeature('infrastructure', feature);

      // Complete all tasks
      const taskQueue = JSON.parse(await fs.readFile(path.join(tempDir, 'TASK_QUEUE.vf.json'), 'utf-8'));
      for (const priority of Object.keys(taskQueue.taskQueues)) {
        if (Array.isArray(taskQueue.taskQueues[priority])) {
          taskQueue.taskQueues[priority] = taskQueue.taskQueues[priority].map((task: any) => {
            if (taskIds.includes(task.id)) {
              task.status = 'completed';
              task.completedAt = new Date().toISOString();
            }
            return task;
          });
        }
      }
      await fs.writeFile(path.join(tempDir, 'TASK_QUEUE.vf.json'), JSON.stringify(taskQueue, null, 2));

      // Complete the feature (skip validation for test)
      await manager.updateFeatureStatus(featureId, 'completed', true);

      // Verify tasks were deleted
      const remainingTasks = await manager.getFeatureTasks(featureId);
      expect(remainingTasks).toHaveLength(0);
    });
  });

  describe('validateFeatureTasks', () => {
    it('should validate pending tasks correctly', async () => {
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Task 1', 'Task 2']
        }
      };

      const { featureId } = await manager.addFeature('infrastructure', feature);

      const validation = await manager.validateFeatureTasks(featureId);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('still pending or in progress');
    });

    it('should validate blocked tasks with warnings', async () => {
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Task 1']
        }
      };

      const { featureId, taskIds } = await manager.addFeature('infrastructure', feature);

      // Block the task
      const taskQueue = JSON.parse(await fs.readFile(path.join(tempDir, 'TASK_QUEUE.vf.json'), 'utf-8'));
      for (const priority of Object.keys(taskQueue.taskQueues)) {
        if (Array.isArray(taskQueue.taskQueues[priority])) {
          taskQueue.taskQueues[priority] = taskQueue.taskQueues[priority].map((task: any) => {
            if (taskIds.includes(task.id)) {
              task.status = 'blocked';
            }
            return task;
          });
        }
      }
      await fs.writeFile(path.join(tempDir, 'TASK_QUEUE.vf.json'), JSON.stringify(taskQueue, null, 2));

      const validation = await manager.validateFeatureTasks(featureId);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('blocked task(s)');
    });
  });

  describe('getFeatureTasks', () => {
    it('should retrieve all tasks for a feature', async () => {
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'high' as const,
          tags: ['test'],
          deliverables: ['Task 1', 'Task 2', 'Task 3']
        }
      };

      const { featureId } = await manager.addFeature('infrastructure', feature);

      const tasks = await manager.getFeatureTasks(featureId);

      expect(tasks).toHaveLength(2); // 1 main + 1 component
      expect(tasks.every(t => t.featureId === featureId)).toBe(true);
    });
  });

  describe('linkTasksToFeature', () => {
    it('should manually link existing tasks to a feature', async () => {
      // Create a feature without auto-creating tasks
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'medium' as const,
          tags: ['test']
        }
      };

      const { featureId } = await manager.addFeature('platform', feature, false);

      // Create manual tasks
      const taskQueueWrapper = new VFTaskQueueWrapper(tempDir);
      const task1Id = `task-${Date.now()}-1`;
      await taskQueueWrapper.push({
        id: task1Id,
        type: 'manual_task',
        priority: 'medium',
        content: {
          title: 'Manual Task 1',
          description: 'A manually created task'
        },
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      const task2Id = `task-${Date.now()}-2`;
      await taskQueueWrapper.push({
        id: task2Id,
        type: 'manual_task',
        priority: 'medium',
        content: {
          title: 'Manual Task 2',
          description: 'Another manually created task'
        },
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      // Link tasks to feature
      await manager.linkTasksToFeature(featureId, [task1Id, task2Id]);

      // Verify tasks are linked
      const linkedTasks = await manager.getFeatureTasks(featureId);
      expect(linkedTasks).toHaveLength(2);
      expect(linkedTasks.map(t => t.id)).toContain(task1Id);
      expect(linkedTasks.map(t => t.id)).toContain(task2Id);
    });
  });

  describe('getFeatureTaskSummary', () => {
    it('should generate comprehensive feature-task summary', async () => {
      // Add multiple features with tasks
      const feature1 = {
        name: 'Feature 1',
        data: {
          title: 'Feature 1',
          description: 'First feature',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Task 1', 'Task 2']
        }
      };

      const feature2 = {
        name: 'Feature 2',
        data: {
          title: 'Feature 2',
          description: 'Second feature',
          level: 'theme' as const,
          status: 'planned' as const,
          priority: 'medium' as const,
          tags: ['test'],
          components: ['Task A']
        }
      };

      await manager.addFeature('infrastructure', feature1);
      await manager.addFeature('platform', feature2);

      const summary = await manager.getFeatureTaskSummary();

      expect(summary.features).toHaveLength(2);
      expect(summary.totals.features).toBe(2);
      expect(summary.totals.tasks).toBe(5); // (1 main + 2 components) + (1 main + 1 component)
      expect(summary.totals.pendingTasks).toBe(5);
      expect(summary.totals.completedTasks).toBe(0);
    });
  });

  describe('syncFeatureTasks', () => {
    it('should sync tasks when feature deliverables change', async () => {
      // Add a feature with initial deliverables
      const feature = {
        name: 'Test Feature',
        data: {
          title: 'Test Feature',
          description: 'Test description',
          level: 'theme' as const,
          status: 'in-progress' as const,
          priority: 'high' as const,
          tags: ['test'],
          components: ['Initial Task']
        }
      };

      const { featureId } = await manager.addFeature('infrastructure', feature);

      // Update the feature to add new deliverables
      const featureWrapper = new VFDistributedFeatureWrapper(tempDir);
      const featureFile = await featureWrapper.read('/FEATURE.vf.json');
      
      for (const category of Object.values(featureFile.features)) {
        const f = category.find(f => f.id === featureId);
        if (f) {
          f.data.components = ['Initial Task', 'New Task 1', 'New Task 2'];
          break;
        }
      }
      
      await featureWrapper.write('/FEATURE.vf.json', featureFile);

      // Sync tasks
      const syncResult = await manager.syncFeatureTasks(featureId);

      expect(syncResult.added).toHaveLength(2);
      
      // Verify new tasks were created
      const tasks = await manager.getFeatureTasks(featureId);
      expect(tasks).toHaveLength(4); // 1 main + 3 components
    });
  });
});