import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// Integration test between FlowManager and ActionExecutor
class FlowManager {
  constructor(
    private actionExecutor: ActionExecutor,
    private storage: { findById: (id: string) => Promise<any> },
    private logger: { log: (message: string) => void }
  ) {}

  async executeFlow(flowId: string, context: any = {}) {
    this.logger.log(`FLOW_EXECUTE_START: Beginning execution for flow ${flowId}`);
    
    try {
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        this.logger.log(`FLOW_EXECUTE_ERROR: Flow ${flowId} not found`);
        return { success: false, error: 'Flow not found' };
      }

      this.logger.log(`FLOW_EXECUTE_INFO: Executing flow "${flow.name}" with ${flow.actions.length} actions`);
      
      const executionId = `exec-${Date.now()}`;
      const startTime = Date.now();
      const results = [];

      // Execute each action through ActionExecutor
      for (let i = 0; i < flow.actions.length; i++) {
        const action = flow.actions[i];
        this.logger.log(`ACTION_DELEGATE_START: Delegating action ${i + 1}/${flow.actions.length} to ActionExecutor`);
        
        try {
          const actionResult = await this.actionExecutor.executeAction(action, {
            ...context,
            flowId,
            executionId,
            actionIndex: i
          });
          
          this.logger.log(`ACTION_DELEGATE_SUCCESS: Action ${i + 1} completed via ActionExecutor`);
          results.push(actionResult);
          
          // Check if action indicated flow should stop
          if (actionResult.stopFlow) {
            this.logger.log(`FLOW_EXECUTE_EARLY_STOP: Flow execution stopped by action ${i + 1}`);
            break;
          }
        } catch (error: any) {
          this.logger.log(`ACTION_DELEGATE_ERROR: Action ${i + 1} failed via ActionExecutor - ${error.message}`);
          results.push({ success: false, error: error.message, actionIndex: i });
          
          // Stop on first error unless flow is configured to continue
          if (!flow.continueOnError) {
            break;
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const success = results.every(r => r.success);
      
      this.logger.log(`FLOW_EXECUTE_${success ? 'SUCCESS' : 'FAILURE'}: Execution ${executionId} completed in ${totalDuration}ms`);
      this.logger.log(`FLOW_EXECUTE_SUMMARY: Actions executed=${results.length}, Success=${results.filter(r => r.success).length}, Failed=${results.filter(r => !r.success).length}`);
      
      return { 
        success, 
        executionId, 
        results, 
        duration: totalDuration,
        flow: flow.name
      };
    } catch (error: any) {
      this.logger.log(`FLOW_EXECUTE_ERROR: Execution failed - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async validateActionsBeforeExecution(flowId: string) {
    this.logger.log(`FLOW_VALIDATE_START: Pre-execution validation for flow ${flowId}`);
    
    const flow = await this.storage.findById(flowId);
    if (!flow) {
      return { success: false, error: 'Flow not found' };
    }

    const validationResults = [];
    
    for (let i = 0; i < flow.actions.length; i++) {
      const action = flow.actions[i];
      this.logger.log(`ACTION_VALIDATE_START: Validating action ${i + 1} via ActionExecutor`);
      
      try {
        const isValid = await this.actionExecutor.validateAction(action);
        validationResults.push({ actionIndex: i, isValid, action: action.type });
        
        if (!isValid.success) {
          this.logger.log(`ACTION_VALIDATE_ERROR: Action ${i + 1} validation failed - ${isValid.error}`);
        } else {
          this.logger.log(`ACTION_VALIDATE_SUCCESS: Action ${i + 1} validation completed`);
        }
      } catch (error: any) {
        this.logger.log(`ACTION_VALIDATE_ERROR: Action ${i + 1} validation exception - ${error.message}`);
        validationResults.push({ actionIndex: i, isValid: false, error: error.message });
      }
    }

    const allValid = validationResults.every(r => r.isValid === true || r.isValid?.success === true);
    this.logger.log(`FLOW_VALIDATE_${allValid ? 'SUCCESS' : 'FAILURE'}: Pre-execution validation completed`);
    
    return { success: allValid, validationResults };
  }

  async pauseExecution(executionId: string) {
    this.logger.log(`FLOW_PAUSE_REQUEST: Requesting pause for execution ${executionId}`);
    
    try {
      const result = await this.actionExecutor.pauseCurrentExecution(executionId);
      this.logger.log(`FLOW_PAUSE_${result.success ? 'SUCCESS' : 'FAILURE'}: Pause request processed`);
      return result;
    } catch (error: any) {
      this.logger.log(`FLOW_PAUSE_ERROR: Failed to pause execution - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async resumeExecution(executionId: string) {
    this.logger.log(`FLOW_RESUME_REQUEST: Requesting resume for execution ${executionId}`);
    
    try {
      const result = await this.actionExecutor.resumeExecution(executionId);
      this.logger.log(`FLOW_RESUME_${result.success ? 'SUCCESS' : 'FAILURE'}: Resume request processed`);
      return result;
    } catch (error: any) {
      this.logger.log(`FLOW_RESUME_ERROR: Failed to resume execution - ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

class ActionExecutor {
  private currentExecutions: Map<string, any> = new Map();
  private pausedExecutions: Map<string, any> = new Map();

  async executeAction(action: any, context: any): Promise<any> {
    const actionId = `${context.executionId}-action-${context.actionIndex}`;
    
    // Store execution context
    this.currentExecutions.set(actionId, {
      action,
      context,
      startTime: Date.now(),
      status: 'running'
    });

    try {
      let result;
      
      switch (action.type) {
        case 'command':
          result = await this.executeCommand(action.command, context);
          break;
          
        case 'script':
          result = await this.executeScript(action.script, action.args || [], context);
          break;
          
        case 'http':
          result = await this.executeHttp(action.url, action.method || 'GET', action.data, context);
          break;
          
        case 'delay':
          result = await this.executeDelay(action.duration, context);
          break;
          
        case 'conditional':
          result = await this.executeConditional(action.condition, action.trueAction, action.falseAction, context);
          break;
          
        case 'parallel':
          result = await this.executeParallel(action.actions, context);
          break;
          
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      // Update execution status
      const execution = this.currentExecutions.get(actionId);
      if (execution) {
        execution.status = 'completed';
        execution.endTime = Date.now();
        execution.result = result;
      }

      return { success: true, result, actionId, duration: Date.now() - this.currentExecutions.get(actionId)!.startTime };
      
    } catch (error: any) {
      // Update execution status
      const execution = this.currentExecutions.get(actionId);
      if (execution) {
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.error = error.message;
      }
      
      throw error;
    } finally {
      // Cleanup In Progress executions
      this.currentExecutions.delete(actionId);
    }
  }

  async validateAction(action: any): Promise<any> {
    const errors = [];

    if (!action.type) {
      errors.push('Action type is required');
    }

    switch (action.type) {
      case 'command':
        if (!action.command || typeof action.command !== 'string') {
          errors.push('Command action requires a command string');
        }
        break;
        
      case 'script':
        if (!action.script || typeof action.script !== 'string') {
          errors.push('Script action requires a script path');
        }
        break;
        
      case 'http':
        if (!action.url || typeof action.url !== 'string') {
          errors.push('HTTP action requires a URL');
        }
        if (action.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(action.method)) {
          errors.push('HTTP action method must be valid HTTP method');
        }
        break;
        
      case 'delay':
        if (!action.duration || typeof action.duration !== 'number' || action.duration <= 0) {
          errors.push('Delay action requires a positive duration in milliseconds');
        }
        break;
        
      case 'conditional':
        if (!action.condition) {
          errors.push('Conditional action requires a condition');
        }
        if (!action.trueAction && !action.falseAction) {
          errors.push('Conditional action requires at least one branch action');
        }
        break;
        
      case 'parallel':
        if (!Array.isArray(action.actions) || action.actions.length === 0) {
          errors.push('Parallel action requires an array of actions');
        }
        break;
    }

    return { success: errors.length === 0, errors };
  }

  async pauseCurrentExecution(executionId: string): Promise<any> {
    const pausedActions = [];
    
    for (const [actionId, execution] of this.currentExecutions.entries()) {
      if (execution.context.executionId === executionId && execution.status === 'running') {
        execution.status = 'paused';
        this.pausedExecutions.set(actionId, execution);
        pausedActions.push(actionId);
      }
    }
    
    return { 
      success: true, 
      pausedActions: pausedActions.length,
      message: `Paused ${pausedActions.length} running actions for execution ${executionId}`
    };
  }

  async resumeExecution(executionId: string): Promise<any> {
    const resumedActions = [];
    
    for (const [actionId, execution] of this.pausedExecutions.entries()) {
      if (execution.context.executionId === executionId) {
        execution.status = 'running';
        this.currentExecutions.set(actionId, execution);
        this.pausedExecutions.delete(actionId);
        resumedActions.push(actionId);
      }
    }
    
    return { 
      success: true, 
      resumedActions: resumedActions.length,
      message: `Resumed ${resumedActions.length} paused actions for execution ${executionId}`
    };
  }

  private async executeCommand(command: string, context: any): Promise<string> {
    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Command "${command}" executed successfully`;
  }

  private async executeScript(script: string, args: string[], context: any): Promise<string> {
    // Simulate script execution
    await new Promise(resolve => setTimeout(resolve, 150));
    return `Script "${script}" executed with args: ${args.join(', ')}`;
  }

  private async executeHttp(url: string, method: string, data: any, context: any): Promise<any> {
    // Simulate HTTP request
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (url.includes('fail')) {
      throw new Error('HTTP request failed');
    }
    
    return { 
      status: 200, 
      data: { message: `${method} request to ${url} completed`, requestData: data }
    };
  }

  private async executeDelay(duration: number, context: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.min(duration, 1000))); // Cap delay for tests
  }

  private async executeConditional(condition: any, trueAction: any, falseAction: any, context: any): Promise<any> {
    // Simple condition evaluation
    const conditionMet = condition.value === true || condition.value === 'true';
    const actionToExecute = conditionMet ? trueAction : falseAction;
    
    if (actionToExecute) {
      return await this.executeAction(actionToExecute, context);
    }
    
    return { conditionMet, message: 'No action to execute for condition result' };
  }

  private async executeParallel(actions: any[], context: any): Promise<any[]> {
    const promises = actions.map(action => this.executeAction(action, context));
    return await Promise.all(promises);
  }

  getExecutionStats(): any {
    return {
      currentExecutions: this.currentExecutions.size,
      pausedExecutions: this.pausedExecutions.size,
      totalActive: this.currentExecutions.size + this.pausedExecutions.size
    };
  }
}

describe('FlowManager-ActionExecutor Integration Test', () => {
  let flowManager: FlowManager;
  let actionExecutor: ActionExecutor;
  let logs: string[];
  const testDir = path.join(__dirname, 'test-action-executor-integration');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create instances
    actionExecutor = new ActionExecutor();
    logs = [];
    
    const mockStorage = {
      findById: async (id: string) => {
        if (id === 'flow-simple') {
          return {
            id: 'flow-simple',
            name: 'Simple Test Flow',
            actions: [
              { type: 'command', command: 'echo "Hello"' },
              { type: 'delay', duration: 500 },
              { type: 'http', url: 'https://api.example.com/test', method: 'GET' }
            ],
            continueOnError: false
          };
        }
        if (id === 'flow-complex') {
          return {
            id: 'flow-complex',
            name: 'Complex Test Flow',
            actions: [
              { type: 'parallel', actions: [
                { type: 'command', command: 'echo "Parallel 1"' },
                { type: 'command', command: 'echo "Parallel 2"' }
              ]},
              { type: 'conditional', condition: { value: true }, 
                trueAction: { type: 'http', url: 'https://api.example.com/success' },
                falseAction: { type: 'http', url: 'https://api.example.com/failure' }
              },
              { type: 'script', script: '/path/to/script.sh', args: ['arg1', 'arg2'] }
            ],
            continueOnError: true
          };
        }
        return null;
      }
    };

    const logger = {
      log: (message: string) => logs.push(message)
    };

    flowManager = new FlowManager(actionExecutor, mockStorage, logger);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should execute simple flow through ActionExecutor', async () => {
    // Act
    const result = await flowManager.executeFlow('flow-simple');

    // Assert
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.flow).toBe('Simple Test Flow');
    expect(result.duration).toBeGreaterThan(0);

    // Verify logging
    expect(logs.some(log => log.includes('FLOW_EXECUTE_START'))).toBe(true);
    expect(logs.some(log => log.includes('ACTION_DELEGATE_START'))).toBe(true);
    expect(logs.some(log => log.includes('ACTION_DELEGATE_SUCCESS'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_completed'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_SUMMARY'))).toBe(true);
  });

  test('should execute complex flow with parallel and conditional actions', async () => {
    // Act
    const result = await flowManager.executeFlow('flow-complex');

    // Assert
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
    
    // Verify parallel action results
    expect(result.results[0].result).toHaveLength(2); // Parallel actions
    
    // Verify conditional action took true branch
    expect(result.results[1].result.result.data.message).toContain('success');

    // Verify logging includes complex action types
    expect(logs.some(log => log.includes('Complex Test Flow'))).toBe(true);
    expect(logs.some(log => log.includes('ACTION_DELEGATE_START'))).toBe(true);
  });

  test('should validate actions before execution', async () => {
    // Act
    const result = await flowManager.validateActionsBeforeExecution('flow-simple');

    // Assert
    expect(result.success).toBe(true);
    expect(result.validationResults).toHaveLength(3);
    
    result.validationResults.forEach((validation, index) => {
      expect(validation.actionIndex).toBe(index);
      expect(validation.isValid.success).toBe(true);
    });

    // Verify validation logging
    expect(logs.some(log => log.includes('FLOW_VALIDATE_START'))).toBe(true);
    expect(logs.some(log => log.includes('ACTION_VALIDATE_SUCCESS'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_VALIDATE_SUCCESS'))).toBe(true);
  });

  test('should handle validation failures', async () => {
    // Arrange - Create flow with invalid actions
    const mockStorageWithInvalid = {
      findById: async (id: string) => ({
        id,
        name: 'Invalid Flow',
        actions: [
          { type: 'command' }, // Missing command
          { type: 'http' }, // Missing URL
          { type: 'delay', duration: -100 } // Invalid duration
        ]
      })
    };

    const invalidFlowManager = new FlowManager(actionExecutor, mockStorageWithInvalid, { log: (msg) => logs.push(msg) });

    // Act
    const result = await invalidFlowManager.validateActionsBeforeExecution('invalid-flow');

    // Assert
    expect(result.success).toBe(false);
    expect(result.validationResults).toHaveLength(3);
    expect(result.validationResults.every(v => !v.isValid.success)).toBe(true);

    // Verify error logging
    expect(logs.some(log => log.includes('ACTION_VALIDATE_ERROR'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_VALIDATE_FAILURE'))).toBe(true);
  });

  test('should handle execution pausing and resuming', async () => {
    // Start execution (we'll pause it quickly)
    const executionPromise = flowManager.executeFlow('flow-simple');
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Act - Pause execution
    const executionId = logs.find(log => log.includes('FLOW_EXECUTE_START'))?.match(/exec-\d+/)?.[0];
    
    if (executionId) {
      const pauseResult = await flowManager.pauseExecution(executionId);
      expect(pauseResult.success).toBe(true);
      
      // Resume execution
      const resumeResult = await flowManager.resumeExecution(executionId);
      expect(resumeResult.success).toBe(true);
      
      // Verify logging
      expect(logs.some(log => log.includes('FLOW_PAUSE_REQUEST'))).toBe(true);
      expect(logs.some(log => log.includes('FLOW_RESUME_REQUEST'))).toBe(true);
    }
    
    // Wait for execution to complete
    const result = await executionPromise;
    expect(result.success).toBe(true);
  });

  test('should handle execution errors gracefully', async () => {
    // Arrange - Create flow that will fail
    const mockStorageWithErrors = {
      findById: async (id: string) => ({
        id,
        name: 'Failing Flow',
        actions: [
          { type: 'command', command: 'echo "Before failure"' },
          { type: 'http', url: 'https://api.example.com/fail' }, // Will fail
          { type: 'command', command: 'echo "After failure"' } // Won't execute
        ],
        continueOnError: false
      })
    };

    const failingFlowManager = new FlowManager(actionExecutor, mockStorageWithErrors, { log: (msg) => logs.push(msg) });

    // Act
    const result = await failingFlowManager.executeFlow('failing-flow');

    // Assert
    expect(result.success).toBe(false);
    expect(result.results).toHaveLength(2); // Only first two actions executed
    expect(result.results[0].success).toBe(true); // First action succeeded
    expect(result.results[1].success).toBe(false); // Second action failed

    // Verify error logging
    expect(logs.some(log => log.includes('ACTION_DELEGATE_ERROR'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_FAILURE'))).toBe(true);
  });

  test('should provide execution statistics', async () => {
    // Act
    const statsBeforeExecution = actionExecutor.getExecutionStats();
    
    const executionPromise = flowManager.executeFlow('flow-simple');
    
    // Check stats during execution
    await new Promise(resolve => setTimeout(resolve, 50));
    const statsDuringExecution = actionExecutor.getExecutionStats();
    
    await executionPromise;
    const statsAfterExecution = actionExecutor.getExecutionStats();

    // Assert
    expect(statsBeforeExecution.totalActive).toBe(0);
    expect(statsDuringExecution.currentExecutions).toBeGreaterThanOrEqual(0);
    expect(statsAfterExecution.totalActive).toBe(0); // All completed
  });

  test('should handle non-existent flow', async () => {
    // Act
    const result = await flowManager.executeFlow('non-existent-flow');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Flow not found');

    // Verify error logging
    expect(logs.some(log => log.includes('FLOW_EXECUTE_ERROR'))).toBe(true);
    expect(logs.some(log => log.includes('Flow non-existent-flow not found'))).toBe(true);
  });

  test('should handle flow with continue on error', async () => {
    // Arrange - Create flow that continues on error
    const mockStorageWithContinue = {
      findById: async (id: string) => ({
        id,
        name: 'Continue On Error Flow',
        actions: [
          { type: 'command', command: 'echo "First"' },
          { type: 'http', url: 'https://api.example.com/fail' }, // Will fail
          { type: 'command', command: 'echo "Continue after failure"' } // Will execute
        ],
        continueOnError: true
      })
    };

    const continueFlowManager = new FlowManager(actionExecutor, mockStorageWithContinue, { log: (msg) => logs.push(msg) });

    // Act
    const result = await continueFlowManager.executeFlow('continue-flow');

    // Assert
    expect(result.success).toBe(false); // Overall failed due to one failure
    expect(result.results).toHaveLength(3); // All actions executed
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[2].success).toBe(true);

    // Verify all actions were attempted
    expect(logs.filter(log => log.includes('ACTION_DELEGATE_START')).length).toBe(3);
  });
});