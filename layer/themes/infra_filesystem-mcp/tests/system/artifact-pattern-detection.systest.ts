import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ArtifactManager } from '../../children/ArtifactManager';
import { TaskQueueValidator } from '../../children/TaskQueueValidator';
import { VFTaskQueueWrapper } from '../../children/VFTaskQueueWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { tmpdir } from 'os';

describe('Artifact Pattern Detection System Tests', () => {
  let tempDir: string;
  let artifactManager: ArtifactManager;
  let taskValidator: TaskQueueValidator;
  let taskQueueWrapper: VFTaskQueueWrapper;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'artifact-test-'));
    
    // Initialize required files
    await fs.writeFile(
      path.join(tempDir, 'TASK_QUEUE.vf.json'),
      JSON.stringify({
        taskQueues: { critical: [], high: [], medium: [], low: [] },
        metadata: { totalTasks: 0 }
      })
    );
    
    await fs.writeFile(
      path.join(tempDir, 'FEATURE.vf.json'),
      JSON.stringify({
        features: { platform: [], infrastructure: [] },
        metadata: {}
      })
    );

    // Create directory structure
    await fs.mkdir(path.join(tempDir, 'layer/themes/infra_filesystem-mcp/schemas'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'layer/themes/infra_filesystem-mcp/children'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'layer/themes/infra_filesystem-mcp/tests/unit'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'gen/history/retrospect'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'temp'), { recursive: true });
    
    // Initialize managers
    artifactManager = new ArtifactManager(tempDir);
    taskValidator = new TaskQueueValidator(tempDir);
    taskQueueWrapper = new VFTaskQueueWrapper(tempDir);
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Pattern Detection', () => {
    it('should detect and categorize test files correctly', async () => {
      // Create test files with different patterns
      const testFiles = [
        'layer/themes/infra_filesystem-mcp/tests/unit/example.test.ts',
        'layer/themes/infra_filesystem-mcp/tests/integration/example.itest.ts',
        'layer/themes/infra_filesystem-mcp/tests/system/example.systest.ts',
        'layer/themes/infra_filesystem-mcp/tests/external/example.etest.ts',
        'layer/themes/infra_filesystem-mcp/tests/environment/example.envtest.ts'
      ];

      for (const file of testFiles) {
        const fullPath = path.join(tempDir, file);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, '// Test file');
      }

      // Save artifacts and verify they're categorized correctly
      const result = await artifactManager.saveArtifact({
        content: 'describe("test", () => {});',
        type: 'test_code',
        variables: {
          epic: 'infra',
          theme: 'filesystem-mcp',
          ext: 'test.ts'
        }
      });

      expect(result.success).toBe(true);
      expect(result.path).toMatch(/tests\/(unit|integration|system)/);
    });

    it('should detect theme naming pattern correctly', async () => {
      const themes = [
        'init_container-environment',
        'check_code-enhancer',
        'infra_filesystem-mcp',
        'portal_security',
        'tool_coverage-aggregator'
      ];

      for (const theme of themes) {
        const [epic, name] = theme.split('_');
        
        const result = await artifactManager.saveArtifact({
          content: 'export class Test {}',
          type: 'source_code',
          variables: {
            epic,
            theme: name,
            ext: 'ts'
          }
        });

        expect(result.success).toBe(true);
        expect(result.path).toContain(`${epic}_${name}`);
      }
    });

    it('should detect retrospect file pattern', async () => {
      const result = await artifactManager.saveArtifact({
        content: '# Retrospective\n\n## Lessons Learned\n\n## Improvements',
        type: "documentation",
        variables: {
          user_story: 'login-feature'
        },
        metadata: {
          purpose: 'Feature retrospective'
        }
      });

      expect(result.success).toBe(true);
      
      // Should suggest retrospect path
      const artifacts = await artifactManager.listArtifactsByType("documentation");
      expect(artifacts.length).toBeGreaterThan(0);
    });

    it('should detect research file pattern', async () => {
      const result = await artifactManager.saveArtifact({
        content: '# Research: OAuth Implementation\n\n## Analysis',
        type: "documentation",
        variables: {
          epic: 'portal',
          theme: "security",
          user_story: 'oauth'
        },
        metadata: {
          purpose: 'OAuth research'
        }
      });

      expect(result.success).toBe(true);
      expect(result.validation.suggestedPath).toMatch(/research/);
    });

    it('should detect sequence diagram patterns', async () => {
      const diagrams = [
        { type: 'system', content: 'sequenceDiagram\n  participant User' },
        { type: 'user_story', content: 'sequenceDiagram\n  actor User' }
      ];

      for (const diagram of diagrams) {
        const result = await artifactManager.saveArtifact({
          content: diagram.content,
          type: 'sequence_diagram',
          variables: {
            epic: 'portal',
            theme: "security",
            user_story: 'login',
            story: '001-login'
          }
        });

        expect(result.success).toBe(true);
        expect(result.path).toContain('sequence.mmd');
      }
    });
  });

  describe('Task Queue Dependency Validation', () => {
    it('should reject task with missing dependencies', async () => {
      const task = {
        id: 'task-2',
        type: 'data',
        content: { title: 'Task 2' },
        dependencies: ['task-1'], // task-1 doesn't exist
        status: 'pending'
      };

      const validation = await taskValidator.validateTaskPush(task);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing dependencies: task-1');
    });

    it('should detect circular dependencies', async () => {
      // Create tasks with circular dependency
      await taskQueueWrapper.push({
        id: 'task-a',
        type: 'data',
        content: { title: 'Task A' },
        dependencies: ['task-b'],
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      await taskQueueWrapper.push({
        id: 'task-b',
        type: 'data',
        content: { title: 'Task B' },
        dependencies: ['task-c'],
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      const taskC = {
        id: 'task-c',
        type: 'data',
        content: { title: 'Task C' },
        dependencies: ['task-a'], // Creates circle: a -> b -> c -> a
        status: 'pending'
      };

      const validation = await taskValidator.validateTaskPush(taskC);
      
      expect(validation.errors.some(e => e.includes("Circular"))).toBe(true);
    });

    it('should validate task requirements', async () => {
      // Create required files
      await fs.writeFile(path.join(tempDir, 'config.json'), '{}');
      
      const task = {
        id: 'task-1',
        type: 'data',
        content: { title: 'Task with requirements' },
        requirements: [
          { id: 'req-1', type: 'file', path: 'config.json', required: true },
          { id: 'req-2', type: 'file', path: 'missing.txt', required: false }
        ],
        status: 'pending'
      };

      const validation = await taskValidator.validateTaskPush(task);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Optional file does not exist: missing.txt');
    });

    it('should prevent popping blocked tasks', async () => {
      // Create two tasks where one blocks the other
      await taskQueueWrapper.push({
        id: 'blocking-task',
        type: 'data',
        content: { title: 'Blocking Task' },
        status: 'pending'
      }, 'high', '/TASK_QUEUE.vf.json');

      await taskQueueWrapper.push({
        id: 'blocked-task',
        type: 'data',
        content: { title: 'Blocked Task' },
        dependencies: ['blocking-task'],
        status: 'pending'
      }, 'medium', '/TASK_QUEUE.vf.json');

      const validation = await taskValidator.validateTaskPop('blocked-task');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('Incomplete dependencies'))).toBe(true);
    });

    it('should calculate correct execution order', async () => {
      // Create tasks with dependencies
      const tasks = [
        { id: 'setup', dependencies: [] },
        { id: 'build', dependencies: ['setup'] },
        { id: 'test', dependencies: ['build'] },
        { id: 'deploy', dependencies: ['test', 'build'] }
      ];

      for (const task of tasks) {
        await taskQueueWrapper.push({
          ...task,
          type: 'data',
          content: { title: task.id },
          status: 'pending'
        }, 'medium', '/TASK_QUEUE.vf.json');
      }

      const order = await taskValidator.getExecutionOrder();
      
      // Setup should come before build
      expect(order.indexOf('setup')).toBeLessThan(order.indexOf('build'));
      // Build should come before test
      expect(order.indexOf('build')).toBeLessThan(order.indexOf('test'));
      // Test should come before deploy
      expect(order.indexOf('test')).toBeLessThan(order.indexOf('deploy'));
    });
  });

  describe('Artifact Lifecycle Management', () => {
    it('should track artifact state transitions', async () => {
      const result = await artifactManager.saveArtifact({
        content: 'class Example {}',
        type: 'source_code',
        metadata: {
          purpose: 'Example class'
        }
      });

      expect(result.success).toBe(true);
      const artifactId = result.id!;

      // Transition: draft -> review
      await artifactManager.updateArtifactState(artifactId, 'review');
      let artifact = await artifactManager.getArtifact(artifactId);
      expect(artifact?.state).toBe('review');

      // Transition: review -> approved
      await artifactManager.updateArtifactState(artifactId, "approved");
      artifact = await artifactManager.getArtifact(artifactId);
      expect(artifact?.state).toBe("approved");

      // Invalid transition: approved -> draft (should fail)
      await expect(
        artifactManager.updateArtifactState(artifactId, 'draft')
      ).rejects.toThrow('Invalid state transition');
    });

    it('should enforce adhoc artifact justification', async () => {
      // Without justification - should fail
      const result1 = await artifactManager.saveArtifact({
        content: 'temporary content',
        type: 'adhoc'
      });

      expect(result1.success).toBe(false);
      expect(result1.validation.errors).toContain('Ad-hoc artifacts require justification');

      // With justification - should succeed
      const result2 = await artifactManager.saveArtifact({
        content: 'temporary content',
        type: 'adhoc',
        adhoc_reason: 'Temporary POC for testing new API'
      });

      expect(result2.success).toBe(true);
    });

    it('should create test stubs for source code', async () => {
      const result = await artifactManager.saveArtifact({
        content: 'export class Calculator {}',
        type: 'source_code',
        variables: {
          epic: 'tool',
          theme: "calculator",
          ext: 'ts'
        }
      });

      expect(result.success).toBe(true);
      
      // Check if test stubs were suggested
      expect(result.validation.requiredTests).toBeDefined();
      expect(result.validation.requiredTests).toContain('unit');
      expect(result.validation.requiredTests).toContain("integration");
    });

    it('should validate artifact patterns against rules', async () => {
      // Save multiple artifacts
      const artifacts = [
        { type: 'source_code', content: 'class A {}', path: 'src/a.ts' },
        { type: 'test_code', content: 'test("a", () => {})', path: 'tests/a.test.ts' },
        { type: "documentation", content: '# Docs', path: 'docs/readme.md' }
      ];

      for (const artifact of artifacts) {
        await artifactManager.saveArtifact({
          content: artifact.content,
          type: artifact.type,
          metadata: {
            path: artifact.path,
            purpose: 'Test artifact'
          }
        });
      }

      // Validate all artifacts
      const validation = await artifactManager.validateAllArtifacts();
      
      expect(validation.valid).toBeGreaterThanOrEqual(0);
      expect(validation.invalid).toBeGreaterThanOrEqual(0);
      expect(validation.valid + validation.invalid).toBe(artifacts.length);
    });

    it('should handle expired artifacts', async () => {
      // Create artifact with expiry date in the past
      const result = await artifactManager.saveArtifact({
        content: 'temporary file',
        type: 'adhoc',
        adhoc_reason: 'Temporary test',
        metadata: {
          expires_at: new Date(Date.now() - 1000).toISOString() // Expired
        }
      });

      expect(result.success).toBe(true);

      // Run cleanup
      const cleaned = await artifactManager.cleanupExpiredArtifacts();
      
      expect(cleaned).toBeGreaterThan(0);
      
      // Check artifact is archived
      const artifact = await artifactManager.getArtifact(result.id!);
      expect(artifact?.state).toBe("archived");
    });
  });

  describe('Integration Tests', () => {
    it('should integrate artifact creation with task queue', async () => {
      // Create a task that requires artifact creation
      const task = {
        id: 'create-component',
        type: 'data',
        content: { 
          title: 'Create authentication component',
          artifacts_to_create: ['source_code', 'test_code', "documentation"]
        },
        status: 'pending'
      };

      await taskQueueWrapper.push(task, 'high', '/TASK_QUEUE.vf.json');
      
      // Simulate task execution creating artifacts
      for (const artifactType of task.content.artifacts_to_create) {
        const result = await artifactManager.saveArtifact({
          content: `// Generated for task ${task.id}`,
          type: artifactType,
          metadata: {
            purpose: task.content.title,
            related_artifacts: [task.id]
          }
        });
        
        expect(result.success).toBe(true);
      }
      
      // Verify artifacts were created
      const sourceArtifacts = await artifactManager.listArtifactsByType('source_code');
      const testArtifacts = await artifactManager.listArtifactsByType('test_code');
      const docArtifacts = await artifactManager.listArtifactsByType("documentation");
      
      expect(sourceArtifacts.length).toBeGreaterThan(0);
      expect(testArtifacts.length).toBeGreaterThan(0);
      expect(docArtifacts.length).toBeGreaterThan(0);
    });

    it('should validate file structure patterns', async () => {
      const validPaths = [
        'layer/themes/infra_filesystem-mcp/children/Component.ts',
        'layer/themes/portal_security/tests/unit/auth.test.ts',
        'gen/history/retrospect/login-feature.md',
        'layer/themes/tool_coverage/research/coverage-analysis.research.md'
      ];

      const invalidPaths = [
        'random/path/file.ts', // Not in allowed structure
        'layer/themes/InvalidTheme/file.ts', // Invalid theme name
        'tests/wrong.test.ts' // Tests should be under themes
      ];

      // Test valid paths
      for (const path of validPaths) {
        const dir = path.substring(0, path.lastIndexOf('/'));
        await fs.mkdir(dir, { recursive: true });
        
        const parts = path.split('/');
        let artifactType = 'source_code';
        if (path.includes('.test.')) artifactType = 'test_code';
        if (path.includes('.md')) artifactType = "documentation";
        
        const result = await artifactManager.saveArtifact({
          content: '// Content',
          type: artifactType,
          metadata: { path }
        });
        
        expect(result.validation.errors.length).toBe(0);
      }

      // Test invalid paths should get warnings
      for (const path of invalidPaths) {
        const result = await artifactManager.saveArtifact({
          content: '// Content',
          type: 'adhoc',
          adhoc_reason: 'Testing invalid path',
          metadata: { path }
        });
        
        // Adhoc should allow but with warnings
        expect(result.success).toBe(true);
      }
    });
  });
});