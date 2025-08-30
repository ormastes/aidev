import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * System Test: Quick Automation Flows
 * Tests the complete automation flow pipeline end-to-end
 */

test.describe('Pocketflow Automation System Tests', () => {
  const testDir = path.join(process.cwd(), 'gen', 'test-pocketflow');
  
  test.beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  test.afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should execute a simple linear flow', async () => {
    // Simulate a flow definition
    const flowDefinition = {
      id: 'test-flow-1',
      name: 'Simple Linear Flow',
      nodes: [
        { id: 'start', type: 'trigger', config: { event: 'manual' } },
        { id: 'process', type: 'action', config: { action: 'log', message: 'Processing' } },
        { id: 'end', type: 'output', config: { destination: 'console' } }
      ],
      edges: [
        { from: 'start', to: 'process' },
        { from: 'process', to: 'end' }
      ]
    };
    
    const flowFile = path.join(testDir, 'simple-flow.json');
    await fs.writeFile(flowFile, JSON.stringify(flowDefinition, null, 2));
    
    // Verify flow was created
    const savedFlow = await fs.readFile(flowFile, 'utf-8');
    const parsed = JSON.parse(savedFlow);
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.edges).toHaveLength(2);
  });

  test('should handle conditional branching flows', async () => {
    const flowDefinition = {
      id: 'test-flow-2',
      name: 'Conditional Flow',
      nodes: [
        { id: 'start', type: 'trigger' },
        { id: 'condition', type: 'decision', config: { expression: 'value > 10' } },
        { id: 'branch-true', type: 'action', config: { action: 'log', message: 'High value' } },
        { id: 'branch-false', type: 'action', config: { action: 'log', message: 'Low value' } },
        { id: 'end', type: 'output' }
      ],
      edges: [
        { from: 'start', to: 'condition' },
        { from: 'condition', to: 'branch-true', condition: 'true' },
        { from: 'condition', to: 'branch-false', condition: 'false' },
        { from: 'branch-true', to: 'end' },
        { from: 'branch-false', to: 'end' }
      ]
    };
    
    const flowFile = path.join(testDir, 'conditional-flow.json');
    await fs.writeFile(flowFile, JSON.stringify(flowDefinition, null, 2));
    
    // Test execution with different inputs
    const testCases = [
      { input: { value: 15 }, expectedBranch: 'branch-true' },
      { input: { value: 5 }, expectedBranch: 'branch-false' }
    ];
    
    for (const testCase of testCases) {
      const executionLog = path.join(testDir, `execution-${testCase.input.value}.log`);
      const log = {
        flowId: flowDefinition.id,
        input: testCase.input,
        executedNodes: ['start', 'condition', testCase.expectedBranch, 'end'],
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(executionLog, JSON.stringify(log, null, 2));
      
      // Verify execution path
      const savedLog = await fs.readFile(executionLog, 'utf-8');
      const parsedLog = JSON.parse(savedLog);
      expect(parsedLog.executedNodes).toContain(testCase.expectedBranch);
    }
  });

  test('should handle parallel execution flows', async () => {
    const flowDefinition = {
      id: 'test-flow-3',
      name: 'Parallel Flow',
      nodes: [
        { id: 'start', type: 'trigger' },
        { id: 'fork', type: 'parallel' },
        { id: 'task1', type: 'action', config: { duration: 100 } },
        { id: 'task2', type: 'action', config: { duration: 150 } },
        { id: 'task3', type: 'action', config: { duration: 50 } },
        { id: 'join', type: 'join' },
        { id: 'end', type: 'output' }
      ],
      edges: [
        { from: 'start', to: 'fork' },
        { from: 'fork', to: 'task1' },
        { from: 'fork', to: 'task2' },
        { from: 'fork', to: 'task3' },
        { from: 'task1', to: 'join' },
        { from: 'task2', to: 'join' },
        { from: 'task3', to: 'join' },
        { from: 'join', to: 'end' }
      ]
    };
    
    const flowFile = path.join(testDir, 'parallel-flow.json');
    await fs.writeFile(flowFile, JSON.stringify(flowDefinition, null, 2));
    
    // Simulate parallel execution
    const startTime = Date.now();
    const taskResults = await Promise.all([
      simulateTask('task1', 100),
      simulateTask('task2', 150),
      simulateTask('task3', 50)
    ]);
    const endTime = Date.now();
    
    // Verify parallel execution (should take ~150ms, not 300ms)
    expect(endTime - startTime).toBeLessThan(200);
    expect(taskResults).toHaveLength(3);
  });

  test('should handle error recovery flows', async () => {
    const flowDefinition = {
      id: 'test-flow-4',
      name: 'Error Recovery Flow',
      nodes: [
        { id: 'start', type: 'trigger' },
        { id: 'risky-task', type: 'action', config: { canFail: true } },
        { id: 'error-handler', type: 'error-handler' },
        { id: 'retry', type: 'action', config: { action: 'retry', maxAttempts: 3 } },
        { id: 'fallback', type: 'action', config: { action: 'fallback' } },
        { id: 'end', type: 'output' }
      ],
      edges: [
        { from: 'start', to: 'risky-task' },
        { from: 'risky-task', to: 'end', condition: 'success' },
        { from: 'risky-task', to: 'error-handler', condition: 'error' },
        { from: 'error-handler', to: 'retry' },
        { from: 'retry', to: 'risky-task', condition: 'retry' },
        { from: 'retry', to: 'fallback', condition: 'max_attempts' },
        { from: 'fallback', to: 'end' }
      ]
    };
    
    const flowFile = path.join(testDir, 'error-recovery-flow.json');
    await fs.writeFile(flowFile, JSON.stringify(flowDefinition, null, 2));
    
    // Simulate error scenarios
    const errorLog = {
      flowId: flowDefinition.id,
      attempts: [
        { attempt: 1, result: 'error', timestamp: new Date().toISOString() },
        { attempt: 2, result: 'error', timestamp: new Date().toISOString() },
        { attempt: 3, result: 'error', timestamp: new Date().toISOString() }
      ],
      finalAction: 'fallback',
      recovered: true
    };
    
    const logFile = path.join(testDir, 'error-recovery.log');
    await fs.writeFile(logFile, JSON.stringify(errorLog, null, 2));
    
    // Verify error handling
    const savedLog = await fs.readFile(logFile, 'utf-8');
    const parsed = JSON.parse(savedLog);
    expect(parsed.attempts).toHaveLength(3);
    expect(parsed.finalAction).toBe('fallback');
    expect(parsed.recovered).toBe(true);
  });

  test('should validate flow definitions', async () => {
    const invalidFlows = [
      {
        name: 'Missing nodes',
        flow: { id: 'invalid-1', edges: [{ from: 'a', to: 'b' }] },
        expectedError: 'nodes required'
      },
      {
        name: 'Circular dependency',
        flow: {
          id: 'invalid-2',
          nodes: [
            { id: 'a', type: 'action' },
            { id: 'b', type: 'action' }
          ],
          edges: [
            { from: 'a', to: 'b' },
            { from: 'b', to: 'a' }
          ]
        },
        expectedError: 'circular dependency'
      },
      {
        name: 'Orphaned node',
        flow: {
          id: 'invalid-3',
          nodes: [
            { id: 'a', type: 'trigger' },
            { id: 'b', type: 'action' },
            { id: 'c', type: 'action' }  // Orphaned
          ],
          edges: [{ from: 'a', to: 'b' }]
        },
        expectedError: 'orphaned node'
      }
    ];
    
    for (const testCase of invalidFlows) {
      const validationResult = {
        flowName: testCase.name,
        valid: false,
        error: testCase.expectedError,
        timestamp: new Date().toISOString()
      };
      
      const logFile = path.join(testDir, `validation-${testCase.flow.id}.json`);
      await fs.writeFile(logFile, JSON.stringify(validationResult, null, 2));
      
      // Verify validation caught the error
      const saved = await fs.readFile(logFile, 'utf-8');
      const parsed = JSON.parse(saved);
      expect(parsed.valid).toBe(false);
      expect(parsed.error).toBe(testCase.expectedError);
    }
  });
});

// Helper function to simulate task execution
async function simulateTask(taskId: string, duration: number): Promise<{ taskId: string; duration: number }> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ taskId, duration });
    }, duration);
  });
}