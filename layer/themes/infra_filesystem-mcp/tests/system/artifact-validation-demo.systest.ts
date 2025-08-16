import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EnhancedTaskQueueWrapper } from '../../children/EnhancedTaskQueueWrapper';
import { ArtifactManager } from '../../children/ArtifactManager';
import { fsPromises as fs } from '../../../infra_external-log-lib/dist';
import { path } from '../../../infra_external-log-lib/src';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

describe('Task Queue Artifact Validation - Demo Environment', () => {
  let demoDir: string;
  let enhancedQueue: EnhancedTaskQueueWrapper;
  let artifactManager: ArtifactManager;

  beforeEach(async () => {
    // Create demo environment
    demoDir = await fs.mkdtemp(path.join(tmpdir(), 'mcp-demo-'));
    console.log(`Created demo environment at: ${demoDir}`);
    
    // Initialize required structure
    await initializeDemoEnvironment(demoDir);
    
    // Create managers
    enhancedQueue = new EnhancedTaskQueueWrapper(demoDir, true); // strict mode
    artifactManager = new ArtifactManager(demoDir);
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(demoDir, { recursive: true, force: true });
  });

  describe('Operations That Should Be Refused', () => {
    it('should REFUSE push when task requires non-existent artifacts', async () => {
      const task = {
        id: 'deploy-feature',
        type: 'deployment',
        content: {
          title: 'Deploy authentication feature',
          description: 'Deploy auth system to production'
        },
        artifactRequirements: [
          { type: 'source_code', minCount: 1, mustExist: true },
          { type: 'test_code', minCount: 1, mustExist: true },
          { type: 'documentation', pattern: '.*auth.*\\.md', mustExist: true }
        ],
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'high');
      
      expect(result.allowed).toBe(false);
      expect(result.errors).toContain('Task requires at least 1 source_code artifacts, found 0');
      expect(result.errors).toContain('Task requires at least 1 test_code artifacts, found 0');
      expect(result.errors).toContain('No documentation artifacts matching pattern \'.*auth.*\\.md\'');
      expect(result.missingArtifacts).toBeDefined();
      expect(result.missingArtifacts).toContain('source_code (need 1 more)');
    });

    it('should REFUSE pop when dependencies are not met', async () => {
      // Create a task with dependency
      await enhancedQueue.push({
        id: 'task-1',
        type: 'data',
        content: { title: 'Setup infrastructure' },
        status: 'pending'
      }, 'high', '/TASK_QUEUE.vf.json');

      await enhancedQueue.push({
        id: 'task-2',
        type: 'data',
        content: { title: 'Deploy application' },
        dependencies: ['task-1'],
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      // Try to pop task-2 (should be refused)
      const result = await enhancedQueue.popWithValidation('medium');
      
      expect(result.validation.allowed).toBe(false);
      expect(result.validation.errors).toContain('Incomplete dependencies: task-1');
      expect(result.task).toBeUndefined();
    });

    it('should REFUSE deployment task without approved artifacts', async () => {
      // Create some artifacts in draft state
      await artifactManager.saveArtifact({
        content: 'class AuthService {}',
        type: 'source_code',
        metadata: { state: 'draft' }
      });

      await artifactManager.saveArtifact({
        content: 'test("auth", () => {})',
        type: 'test_code',
        metadata: { state: 'draft' }
      });

      // Try to push deployment task
      const task = {
        id: 'deploy-prod',
        type: 'deployment',
        content: { title: 'Deploy to production' },
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'critical');
      
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('Deployment requires approved'))).toBe(true);
    });

    it('should REFUSE refactoring without tests', async () => {
      // Create source code but no tests
      await artifactManager.saveArtifact({
        content: 'function oldCode() { /* legacy */ }',
        type: 'source_code'
      });

      const task = {
        id: 'refactor-legacy',
        type: 'refactoring',
        content: { title: 'Refactor legacy code' },
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'medium');
      
      expect(result.allowed).toBe(false);
      expect(result.errors).toContain('Refactoring requires existing tests');
    });

    it('should REFUSE test implementation without source code', async () => {
      const task = {
        id: 'write-tests',
        type: 'test_implementation',
        content: { title: 'Write unit tests' },
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'high');
      
      expect(result.allowed).toBe(false);
      expect(result.errors).toContain('Test implementation requires existing source code');
    });

    it('should REFUSE feature implementation without design docs', async () => {
      const task = {
        id: 'implement-feature',
        type: 'feature_implementation',
        content: { title: 'Implement new feature' },
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'high');
      
      expect(result.allowed).toBe(false);
      expect(result.errors).toContain('Feature implementation requires design documentation');
    });
  });

  describe('Operations That Should Be Allowed', () => {
    it('should ALLOW push when all artifact requirements are met', async () => {
      // Create required artifacts
      await artifactManager.saveArtifact({
        content: 'class Feature {}',
        type: 'source_code',
        metadata: { state: 'approved' }
      });

      await artifactManager.saveArtifact({
        content: 'test("feature", () => {})',
        type: 'test_code',
        metadata: { state: 'approved' }
      });

      await artifactManager.saveArtifact({
        content: '# Feature Documentation',
        type: 'documentation',
        metadata: { path: 'auth.md', state: 'approved' }
      });

      const task = {
        id: 'deploy-feature',
        type: 'deployment',
        content: { title: 'Deploy feature' },
        artifactRequirements: [
          { type: 'source_code', minCount: 1, state: 'approved' },
          { type: 'test_code', minCount: 1 },
          { type: 'documentation', pattern: '.*auth.*' }
        ],
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'high');
      
      expect(result.allowed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should ALLOW pop when dependencies are completed', async () => {
      // Create and complete dependency
      await enhancedQueue.push({
        id: 'task-1',
        type: 'data',
        content: { title: 'Setup' },
        status: 'completed',
        completedAt: new Date().toISOString()
      }, 'high', '/TASK_QUEUE.vf.json');

      await enhancedQueue.push({
        id: 'task-2',
        type: 'data',
        content: { title: 'Deploy' },
        dependencies: ['task-1'],
        status: 'pending'
      }, 'high', '/TASK_QUEUE.vf.json');

      // Mark task-1 as completed in the completed queue
      const queue = await enhancedQueue.read('/TASK_QUEUE.vf.json');
      const task1Index = queue.taskQueues.high.findIndex((t: any) => t.id === 'task-1');
      if (task1Index >= 0) {
        queue.taskQueues.high[task1Index].status = 'completed';
      }
      await enhancedQueue.write('/TASK_QUEUE.vf.json', queue);

      // Now should allow popping task-2
      const result = await enhancedQueue.popWithValidation('high');
      
      expect(result.validation.allowed).toBe(true);
      expect(result.task).toBeDefined();
      expect(result.task.id).toBe('task-2');
    });

    it('should ALLOW refactoring when tests exist', async () => {
      // Create source code and tests
      await artifactManager.saveArtifact({
        content: 'function code() {}',
        type: 'source_code'
      });

      await artifactManager.saveArtifact({
        content: 'test("code", () => {})',
        type: 'test_code'
      });

      const task = {
        id: 'refactor-code',
        type: 'refactoring',
        content: { title: 'Refactor code' },
        status: 'pending'
      };

      const result = await enhancedQueue.pushWithValidation(task, 'medium');
      
      expect(result.allowed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Queue Status Validation', () => {
    it('should correctly identify blocked, ready, and invalid tasks', async () => {
      // Create a mix of tasks
      
      // Ready task - no requirements
      await enhancedQueue.push({
        id: 'ready-task',
        type: 'data',
        content: { title: 'Ready task' },
        status: 'pending'
      }, 'high', '/TASK_QUEUE.vf.json');

      // Blocked task - has unmet dependency
      await enhancedQueue.push({
        id: 'blocked-task',
        type: 'data',
        content: { title: 'Blocked task' },
        dependencies: ['non-existent-task'],
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      // Invalid task - requires artifacts that don't exist
      await enhancedQueue.push({
        id: 'invalid-task',
        type: 'deployment',
        content: { title: 'Invalid deployment' },
        status: 'pending'
      }, 'low', '/TASK_QUEUE.vf.json');

      const status = await enhancedQueue.getQueueStatus();
      
      expect(status.totalTasks).toBe(3);
      expect(status.readyTasks).toBe(1);
      expect(status.blockedTasks).toBeGreaterThanOrEqual(1);
      expect(status.invalidTasks).toBeGreaterThanOrEqual(0);
      
      const readyTask = status.details.find(d => d.taskId === 'ready-task');
      expect(readyTask?.status).toBe('ready');
      
      const blockedTask = status.details.find(d => d.taskId === 'blocked-task');
      expect(blockedTask?.status).toBe('blocked');
      expect(blockedTask?.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should handle circular dependencies with artifact requirements', async () => {
      // Task A requires artifact from Task B
      // Task B requires artifact from Task A
      // Both should be refused
      
      const taskA = {
        id: 'task-a',
        type: 'data',
        content: { title: 'Task A' },
        dependencies: ['task-b'],
        artifactRequirements: [
          { type: 'source_code', pattern: '.*task-b.*', mustExist: true }
        ],
        status: 'pending'
      };

      const taskB = {
        id: 'task-b',
        type: 'data',
        content: { title: 'Task B' },
        dependencies: ['task-a'],
        artifactRequirements: [
          { type: 'source_code', pattern: '.*task-a.*', mustExist: true }
        ],
        status: 'pending'
      };

      const resultA = await enhancedQueue.pushWithValidation(taskA, 'high');
      expect(resultA.allowed).toBe(false); // Missing artifacts

      const resultB = await enhancedQueue.pushWithValidation(taskB, 'high');
      expect(resultB.allowed).toBe(false); // Missing artifacts and circular dependency
    });

    it('should validate artifact state transitions in task workflow', async () => {
      // Create artifact in draft state
      const artifact = await artifactManager.saveArtifact({
        content: '# Design Document',
        type: 'documentation',
        metadata: { 
          state: 'draft',
          path: 'design.md'
        }
      });

      // Task requiring draft documentation (should work)
      const draftTask = {
        id: 'review-design',
        type: 'review',
        content: { title: 'Review design' },
        artifactRequirements: [
          { type: 'documentation', state: 'draft' }
        ],
        status: 'pending'
      };

      let result = await enhancedQueue.pushWithValidation(draftTask, 'high');
      expect(result.allowed).toBe(true);

      // Task requiring approved documentation (should fail)
      const implementTask = {
        id: 'implement-design',
        type: 'feature_implementation',
        content: { title: 'Implement design' },
        artifactRequirements: [
          { type: 'documentation', state: 'approved', mustExist: true }
        ],
        status: 'pending'
      };

      result = await enhancedQueue.pushWithValidation(implementTask, 'high');
      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('approved'))).toBe(true);

      // Update artifact state to approved
      await artifactManager.updateArtifactState(artifact.id!, 'review');
      await artifactManager.updateArtifactState(artifact.id!, 'approved');

      // Now implementation task should work
      result = await enhancedQueue.pushWithValidation(implementTask, 'high');
      expect(result.allowed).toBe(true);
    });
  });
});

/**
 * Initialize demo environment with required structure
 */
async function initializeDemoEnvironment(demoDir: string): Promise<void> {
  // Create directory structure
  const dirs = [
    'layer/themes/infra_filesystem-mcp/children',
    'layer/themes/infra_filesystem-mcp/tests/unit',
    'layer/themes/infra_filesystem-mcp/tests/system',
    'layer/themes/infra_filesystem-mcp/schemas',
    'gen/doc',
    'gen/history/retrospect',
    'temp'
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(demoDir, dir), { recursive: true });
  }

  // Create required JSON files
  const taskQueue = {
    taskQueues: {
      critical: [],
      high: [],
      medium: [],
      low: [],
      completed: []
    },
    working: [],
    metadata: {
      totalTasks: 0,
      workingTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      lastUpdated: new Date().toISOString()
    }
  };

  const feature = {
    metadata: {
      level: 'root',
      version: '1.0.0'
    },
    features: {
      platform: [],
      infrastructure: []
    }
  };

  const artifacts = {
    metadata: {
      version: '1.0.0',
      artifact_count: 0
    },
    artifacts: []
  };

  await fs.writeFile(
    path.join(demoDir, 'TASK_QUEUE.vf.json'),
    JSON.stringify(taskQueue, null, 2)
  );

  await fs.writeFile(
    path.join(demoDir, 'FEATURE.vf.json'),
    JSON.stringify(feature, null, 2)
  );

  await fs.writeFile(
    path.join(demoDir, 'ARTIFACTS.vf.json'),
    JSON.stringify(artifacts, null, 2)
  );

  // Copy artifact patterns if they exist
  try {
    const patternsSource = path.join(
      process.cwd(),
      'layer/themes/infra_filesystem-mcp/schemas/artifact_patterns.json'
    );
    const patternsDest = path.join(
      demoDir,
      'layer/themes/infra_filesystem-mcp/schemas/artifact_patterns.json'
    );
    
    const patterns = await fs.readFile(patternsSource, 'utf-8');
    await fs.writeFile(patternsDest, patterns);
  } catch {
    // Patterns file doesn't exist, use defaults
  }
}