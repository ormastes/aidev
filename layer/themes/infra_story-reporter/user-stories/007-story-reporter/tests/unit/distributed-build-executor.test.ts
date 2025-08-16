import { DistributedBuildExecutor } from '../../src/services/distributed-build-executor';
import { createHierarchicalBuildConfig, HierarchicalBuildConfig } from '../../src/domain/hierarchical-build-config';
import { createDefaultTestConfiguration } from '../../src/domain/test-configuration';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { ChildProcess } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    access: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('DistributedBuildExecutor', () => {
  let executor: DistributedBuildExecutor;
  let mockSpawn: jest.Mock;
  
  beforeEach(() => {
    executor = new DistributedBuildExecutor();
    mockSpawn = require('child_process').spawn as jest.Mock;
    mockSpawn.mockClear();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeBuild', () => {
    it('should execute a simple build without children', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      
      // Mock successful command execution
      const mockProcess = createMockChildProcess(0, 'Build successful');
      mockSpawn.mockReturnValue(mockProcess);
      
      const buildStartSpy = jest.fn();
      const buildCompleteSpy = jest.fn();
      executor.on('buildStart', buildStartSpy);
      executor.on('buildComplete', buildCompleteSpy);
      
      const result = await executor.executeBuild(config);
      
      expect(buildStartSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          buildId: 'test-build',
          buildType: 'theme'
        })
      );
      
      expect(buildCompleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          buildId: 'test-build',
          status: 'skipped' // No tests were run
        })
      );
      
      expect(result.buildId).toBe('test-build');
      expect(result.buildType).toBe('theme');
      expect(result.status).toBe('skipped');
    });

    it('should execute build with build command', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.buildSettings!.buildCommand = 'npm run build';
      
      const mockProcess = createMockChildProcess(0, 'Build output');
      mockSpawn.mockReturnValue(mockProcess);
      
      const commandStartSpy = jest.fn();
      const commandCompleteSpy = jest.fn();
      executor.on('commandStart', commandStartSpy);
      executor.on('commandComplete', commandCompleteSpy);
      
      await executor.executeBuild(config);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'npm run build',
        expect.objectContaining({
          shell: true,
          cwd: './'
        })
      );
      
      expect(commandStartSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'npm run build',
          type: 'build'
        })
      );
      
      expect(commandCompleteSpy).toHaveBeenCalled();
    });

    it('should execute test command and parse results', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.buildSettings!.testCommand = 'npm test';
      
      const testOutput = 'Tests: 5 passed, 1 failed, 0 skipped, 6 total';
      const mockProcess = createMockChildProcess(0, testOutput);
      mockSpawn.mockReturnValue(mockProcess);
      
      const result = await executor.executeBuild(config);
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'npm test',
        expect.anything()
      );
      
      expect(result.testResults).toEqual({
        total: 6,
        passed: 5,
        failed: 1,
        skipped: 0,
        errors: []
      });
      
      expect(result.status).toBe('failed'); // Has failed tests
    });

    it('should handle build command failure', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.buildSettings!.buildCommand = 'npm run build';
      
      const mockProcess = createMockChildProcess(1, '', 'Build error');
      mockSpawn.mockReturnValue(mockProcess);
      
      const buildErrorSpy = jest.fn();
      executor.on('buildError', buildErrorSpy);
      
      const result = await executor.executeBuild(config);
      
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('exit code 1');
      expect(result.error?.phase).toBe('build');
      
      expect(buildErrorSpy).toHaveBeenCalled();
    });

    it('should execute child builds sequentially when not parallelizable', async () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      parent.executionOrder!.parallelizable = false;
      
      const child1 = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('child1', ['child1.feature'], ['child1.ts']),
        'theme'
      );
      
      const child2 = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('child2', ['child2.feature'], ['child2.ts']),
        'theme'
      );
      
      parent.children = [child1, child2];
      
      const mockProcess = createMockChildProcess(0, 'Success');
      mockSpawn.mockReturnValue(mockProcess);
      
      const buildEvents: string[] = [];
      executor.on('buildStart', (event) => {
        buildEvents.push(`start-${event.buildId}`);
      });
      executor.on('buildComplete', (event) => {
        buildEvents.push(`complete-${event.buildId}`);
      });
      
      await executor.executeBuild(parent);
      
      // Verify sequential execution
      expect(buildEvents).toEqual([
        'start-parent',
        'start-child1',
        'complete-child1',
        'start-child2',
        'complete-child2',
        'complete-parent'
      ]);
    });

    it('should execute child builds in parallel when configured', async () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      parent.executionOrder!.parallelizable = true;
      parent.executionOrder!.maxParallelChildren = 2;
      
      const children = Array.from({ length: 3 }, (_, i) =>
        createHierarchicalBuildConfig(
          createDefaultTestConfiguration(`child${i}`, [`child${i}.feature`], [`child${i}.ts`]),
          'theme'
        )
      );
      
      parent.children = children;
      
      const mockProcess = createMockChildProcess(0, 'Success');
      mockSpawn.mockReturnValue(mockProcess);
      
      const concurrentBuilds = new Set<string>();
      let maxConcurrent = 0;
      
      executor.on('buildStart', (event) => {
        if (event.buildId !== 'parent') {
          concurrentBuilds.add(event.buildId);
          maxConcurrent = Math.max(maxConcurrent, concurrentBuilds.size);
        }
      });
      
      executor.on('buildComplete', (event) => {
        concurrentBuilds.delete(event.buildId);
      });
      
      await executor.executeBuild(parent);
      
      // Should respect max parallel limit
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should aggregate results from children', async () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      
      const child1 = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('child1', ['child1.feature'], ['child1.ts']),
        'theme'
      );
      child1.buildSettings!.testCommand = 'npm test';
      
      const child2 = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('child2', ['child2.feature'], ['child2.ts']),
        'theme'
      );
      child2.buildSettings!.testCommand = 'npm test';
      
      parent.children = [child1, child2];
      parent.aggregation!.aggregateTests = true;
      parent.aggregation!.aggregateCoverage = true;
      
      // Mock different test results for children
      let callCount = 0;
      mockSpawn.mockImplementation(() => {
        const output = callCount === 0 
          ? 'Tests: 10 passed, 0 failed, 0 skipped, 10 total'
          : 'Tests: 8 passed, 2 failed, 0 skipped, 10 total';
        callCount++;
        return createMockChildProcess(0, output);
      });
      
      const result = await executor.executeBuild(parent);
      
      expect(result.aggregated).toBeDefined();
      expect(result.aggregated?.testResults).toEqual({
        total: 20,
        passed: 18,
        failed: 2,
        skipped: 0
      });
      
      expect(result.status).toBe('failed'); // Has failed tests in children
    });

    it('should collect artifacts when configured', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.buildSettings!.artifacts = {
        paths: ['coverage/*.json', 'reports/*.html'],
        includeReports: true,
        includeCoverage: true,
        includeLogs: true
      };
      
      // Mock file system for artifact collection
      const fs = require('fs').promises;
      fs.readdir.mockImplementation((dir: string) => {
        if (dir.includes('coverage')) {
          return Promise.resolve(['coverage.json']);
        }
        if (dir.includes('reports')) {
          return Promise.resolve(['report.html']);
        }
        return Promise.resolve([]);
      });
      
      const mockProcess = createMockChildProcess(0, 'Success');
      mockSpawn.mockReturnValue(mockProcess);
      
      const artifactsSpy = jest.fn();
      executor.on('artifactsCollected', artifactsSpy);
      
      const result = await executor.executeBuild(config);
      
      expect(artifactsSpy).toHaveBeenCalled();
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.coverage).toContain(expect.stringContaining('coverage.json'));
      expect(result.artifacts?.reports).toContain(expect.stringContaining('report.html'));
    });

    it('should emit build logs', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.buildSettings!.buildCommand = 'echo "Building..."';
      
      const mockProcess = createMockChildProcess(0, 'Building...\nBuild complete');
      mockSpawn.mockReturnValue(mockProcess);
      
      const logs: any[] = [];
      executor.on('buildLog', (log) => logs.push(log));
      
      await executor.executeBuild(config);
      
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        buildId: 'test-build',
        level: 'info',
        message: 'Building...',
        source: 'build'
      });
    });

    it('should handle cancellation', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      config.buildSettings!.buildCommand = 'sleep 10';
      
      const mockProcess = createMockChildProcess(0, '', '', 5000); // 5 second delay
      mockProcess.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProcess);
      
      const cancelledSpy = jest.fn();
      executor.on('buildCancelled', cancelledSpy);
      
      // Start build and cancel after short delay
      const buildPromise = executor.executeBuild(config);
      
      setTimeout(() => executor.cancel(), 100);
      
      await buildPromise;
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(cancelledSpy).toHaveBeenCalled();
    });

    it('should determine correct build status based on failure handling', async () => {
      const parent = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('parent', ['parent.feature'], ['parent.ts']),
        'epic'
      );
      
      const failingChild = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('failing-child', ['fail.feature'], ['fail.ts']),
        'theme'
      );
      failingChild.buildSettings!.buildCommand = 'exit 1';
      
      parent.children = [failingChild];
      
      // Test with 'continue' failure handling
      parent.aggregation!.failureHandling = 'continue';
      
      const mockProcess = createMockChildProcess(1, '', 'Build failed');
      mockSpawn.mockReturnValue(mockProcess);
      
      let result = await executor.executeBuild(parent);
      expect(result.status).toBe('failed');
      
      // Test with 'ignore-children' failure handling
      parent.aggregation!.failureHandling = 'ignore-children';
      result = await executor.executeBuild(parent);
      expect(result.status).toBe('skipped'); // Parent has no tests
    });
  });

  describe('getBuildResult', () => {
    it('should retrieve build result by ID', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      
      const mockProcess = createMockChildProcess(0, 'Success');
      mockSpawn.mockReturnValue(mockProcess);
      
      await executor.executeBuild(config);
      
      const result = executor.getBuildResult('test-build');
      expect(result).toBeDefined();
      expect(result?.buildId).toBe('test-build');
    });

    it('should return undefined for non-existent build', () => {
      const result = executor.getBuildResult('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('clearResults', () => {
    it('should clear all build results', async () => {
      const config = createHierarchicalBuildConfig(
        createDefaultTestConfiguration('test-build', ['test.feature'], ['test.ts']),
        'theme'
      );
      
      const mockProcess = createMockChildProcess(0, 'Success');
      mockSpawn.mockReturnValue(mockProcess);
      
      await executor.executeBuild(config);
      
      expect(executor.getBuildResult('test-build')).toBeDefined();
      
      executor.clearResults();
      
      expect(executor.getBuildResult('test-build')).toBeUndefined();
    });
  });
});

// Helper function to create mock child process
function createMockChildProcess(
  exitCode: number,
  stdout: string,
  stderr: string = '',
  delay: number = 0
): any {
  const mockProcess = new EventEmitter() as any;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.kill = jest.fn();
  
  // Simulate process execution
  setTimeout(() => {
    if (stdout) {
      stdout.split('\n').forEach(line => {
        mockProcess.stdout.emit('data', Buffer.from(line + '\n'));
      });
    }
    
    if (stderr) {
      mockProcess.stderr.emit('data', Buffer.from(stderr));
    }
    
    mockProcess.emit('close', exitCode);
  }, delay);
  
  return mockProcess;
}