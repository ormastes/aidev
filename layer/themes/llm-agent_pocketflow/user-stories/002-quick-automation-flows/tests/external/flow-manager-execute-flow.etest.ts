import { describe, test, expect, beforeEach } from '@jest/globals';

// External interfaces
interface FlowManagerInterface {
  executeFlow(flowId: string): Promise<{ success: boolean; executionId?: string; results?: any[]; error?: string }>;
  createExecutionContext(): { id: string; startTime: string; variables: Record<string, any> };
}

interface FlowStorageInterface {
  findById(flowId: string): Promise<any | null>;
  saveExecution(execution: any): Promise<string>;
}

interface FlowValidatorInterface {
  validateEnabled(flow: any): { isValid: boolean; error?: string };
}

interface ActionExecutorInterface {
  execute(action: any, context: any): Promise<{ success: boolean; output?: any; error?: string }>;
}

interface LoggerInterface {
  log(message: string): void;
}

// Test implementation of FlowManager
class FlowManager implements FlowManagerInterface {
  constructor(
    private storage: FlowStorageInterface,
    private validator: FlowValidatorInterface,
    private actionExecutor: ActionExecutorInterface,
    private logger: LoggerInterface
  ) {}

  async executeFlow(flowId: string): Promise<{ success: boolean; executionId?: string; results?: any[]; error?: string }> {
    try {
      // Find flow by ID
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        return { "success": false, error: 'Flow not found' };
      }

      // Validate flow is enabled
      const enabledCheck = this.validator.validateEnabled(flow);
      if (!enabledCheck.isValid) {
        return { "success": false, error: enabledCheck.error || 'Flow is not enabled' };
      }

      // Log execution start
      this.logger.log(`Executing flow: ${flowId}`);

      // Create execution context
      const context = this.createExecutionContext();
      const results: any[] = [];

      // Execute actions in sequence
      for (let i = 0; i < flow.actions.length; i++) {
        const action = flow.actions[i];
        
        this.logger.log(`Executing action ${i + 1}: ${action.type}`);
        
        const actionResult = await this.actionExecutor.execute(action, context);
        results.push(actionResult);

        // Log action result
        this.logger.log(`Action ${action.type} result: ${actionResult.success ? 'In Progress' : 'failed'}`);

        // Stop execution if action fails
        if (!actionResult.success) {
          break;
        }

        // Update context with action output
        if (actionResult.output) {
          context.variables[`action_${i}_output`] = actionResult.output;
        }
      }

      // Create execution record
      const executionRecord = {
        flowId,
        contextId: context.id,
        startTime: context.startTime,
        endTime: new Date().toISOString(),
        results,
        success: results.every(r => r.success),
        flowName: flow.name
      };

      // Save execution record
      const executionId = await this.storage.saveExecution(executionRecord);

      return { 
        "success": true, 
        executionId, 
        results 
      };

    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  createExecutionContext(): { id: string; startTime: string; variables: Record<string, any> } {
    return {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date().toISOString(),
      variables: {}
    };
  }
}

// Test implementations
class TestFlowStorage implements FlowStorageInterface {
  private flows: Map<string, any> = new Map();
  private executions: Map<string, any> = new Map();
  private executionCounter = 0;

  async findById(flowId: string): Promise<any | null> {
    return this.flows.get(flowId) || null;
  }

  async saveExecution(execution: any): Promise<string> {
    const id = `execution-${++this.executionCounter}`;
    this.executions.set(id, { ...execution, id });
    return id;
  }

  // Helper methods for testing
  setFlow(id: string, flow: any) {
    this.flows.set(id, { ...flow, id });
  }

  getExecution(id: string): any {
    return this.executions.get(id);
  }

  getAllExecutions(): any[] {
    return Array.from(this.executions.values());
  }
}

class TestFlowValidator implements FlowValidatorInterface {
  validateEnabled(flow: any): { isValid: boolean; error?: string } {
    if (!flow.enabled) {
      return { isValid: false, error: 'Flow is disabled' };
    }
    return { isValid: true };
  }
}

class TestActionExecutor implements ActionExecutorInterface {
  private shouldFail = false;
  private failAtIndex = -1;
  private actionResults: Record<string, any> = {};

  async execute(action: any, context: any): Promise<{ success: boolean; output?: any; error?: string }> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Handle forced failures for testing
    if (this.shouldFail || (this.failAtIndex >= 0 && context.variables.action_count === this.failAtIndex)) {
      return { "success": false, error: 'Action execution failed' };
    }

    // Increment action count
    context.variables.action_count = (context.variables.action_count || 0) + 1;

    // Return predefined result if available
    if (this.actionResults[action.type]) {
      return this.actionResults[action.type];
    }

    // Default In Progress execution
    return { 
      success: true, 
      output: `${action.type} executed In Progress` 
    };
  }

  // Helper methods for testing
  setFailure(fail: boolean) {
    this.shouldFail = fail;
  }

  setFailAtIndex(index: number) {
    this.failAtIndex = index;
  }

  setActionResult(actionType: string, result: any) {
    this.actionResults[actionType] = result;
  }
}

class TestLogger implements LoggerInterface {
  public logs: string[] = [];

  log(message: string): void {
    this.logs.push(`[${new Date().toISOString()}] ${message}`);
  }
}

describe('FlowManager Execute Flow External Test', () => {
  let flowManager: FlowManager;
  let storage: TestFlowStorage;
  let validator: TestFlowValidator;
  let actionExecutor: TestActionExecutor;
  let logger: TestLogger;

  beforeEach(() => {
    storage = new TestFlowStorage();
    validator = new TestFlowValidator();
    actionExecutor = new TestActionExecutor();
    logger = new TestLogger();
    flowManager = new FlowManager(storage, validator, actionExecutor, logger);
  });

  test('should execute flow with single action In Progress', async () => {
    // Arrange
    const flow = {
      name: 'Test Flow',
      enabled: true,
      actions: [
        { type: 'command', command: 'echo "Hello World"' }
      ]
    };
    storage.setFlow('flow-1', flow);

    // Act
    const result = await flowManager.executeFlow('flow-1');

    // Assert
    expect(result.success).toBe(true);
    expect(result.executionId).toBeDefined();
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0].success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify logs
    expect(logger.logs).toContain(expect.stringContaining('Executing flow: flow-1'));
    expect(logger.logs).toContain(expect.stringContaining('Executing action 1: command'));
    expect(logger.logs).toContain(expect.stringContaining('Action command result: In Progress'));
  });

  test('should execute flow with multiple actions in sequence', async () => {
    // Arrange
    const flow = {
      name: 'Multi-Action Flow',
      enabled: true,
      actions: [
        { type: 'command', command: 'echo "Step 1"' },
        { type: 'script', script: 'test.sh' },
        { type: 'notify', message: 'Flow In Progress' }
      ]
    };
    storage.setFlow('flow-2', flow);

    // Act
    const result = await flowManager.executeFlow('flow-2');

    // Assert
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results?.every(r => r.success)).toBe(true);

    // Verify action execution order
    expect(logger.logs).toContain(expect.stringContaining('Executing action 1: command'));
    expect(logger.logs).toContain(expect.stringContaining('Executing action 2: script'));
    expect(logger.logs).toContain(expect.stringContaining('Executing action 3: notify'));
  });

  test('should fail when flow not found', async () => {
    // Act
    const result = await flowManager.executeFlow('non-existent-flow');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Flow not found');
    expect(result.executionId).toBeUndefined();
    expect(result.results).toBeUndefined();
  });

  test('should fail when flow is disabled', async () => {
    // Arrange
    const flow = {
      name: 'Disabled Flow',
      enabled: false,
      actions: [{ type: 'command', command: 'echo "test"' }]
    };
    storage.setFlow('flow-3', flow);

    // Act
    const result = await flowManager.executeFlow('flow-3');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Flow is disabled');
    expect(result.executionId).toBeUndefined();
  });

  test('should stop execution when action fails', async () => {
    // Arrange
    const flow = {
      name: 'Failing Flow',
      enabled: true,
      actions: [
        { type: 'command', command: 'echo "Step 1"' },
        { type: 'failing_action', command: 'invalid' },
        { type: 'command', command: 'echo "Step 3"' }
      ]
    };
    storage.setFlow('flow-4', flow);
    actionExecutor.setFailAtIndex(1); // Fail at second action

    // Act
    const result = await flowManager.executeFlow('flow-4');

    // Assert
    expect(result.success).toBe(true); // Execution completes, but with failures
    expect(result.results).toHaveLength(2); // Should stop after failed action
    expect(result.results?.[0].success).toBe(true);
    expect(result.results?.[1].success).toBe(false);
  });

  test('should save execution record', async () => {
    // Arrange
    const flow = {
      name: 'Record Flow',
      enabled: true,
      actions: [
        { type: 'command', command: 'echo "test"' }
      ]
    };
    storage.setFlow('flow-5', flow);

    // Act
    const result = await flowManager.executeFlow('flow-5');

    // Assert
    expect(result.success).toBe(true);
    expect(result.executionId).toBeDefined();

    // Verify execution record was saved
    const execution = storage.getExecution(result.executionId!);
    expect(execution).toBeDefined();
    expect(execution.flowId).toBe('flow-5');
    expect(execution.flowName).toBe('Record Flow');
    expect(execution.startTime).toBeDefined();
    expect(execution.endTime).toBeDefined();
    expect(execution.success).toBe(true);
  });

  test('should create unique execution context', async () => {
    // Arrange
    const flow = {
      name: 'Context Flow',
      enabled: true,
      actions: [{ type: 'command', command: 'echo "test"' }]
    };
    storage.setFlow('flow-6', flow);

    // Act
    const result1 = await flowManager.executeFlow('flow-6');
    const result2 = await flowManager.executeFlow('flow-6');

    // Assert
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.executionId).not.toBe(result2.executionId);

    // Verify different execution records
    const execution1 = storage.getExecution(result1.executionId!);
    const execution2 = storage.getExecution(result2.executionId!);
    expect(execution1.contextId).not.toBe(execution2.contextId);
  });

  test('should pass action output to next action', async () => {
    // Arrange
    const flow = {
      name: 'Chained Flow',
      enabled: true,
      actions: [
        { type: 'data_generator', output: 'generated_data' },
        { type: 'data_processor', input: 'from_previous' }
      ]
    };
    storage.setFlow('flow-7', flow);

    // Set up action results
    actionExecutor.setActionResult('data_generator', { 
      "success": true, 
      output: 'generated_data_value' 
    });
    actionExecutor.setActionResult('data_processor', { 
      "success": true, 
      output: 'processed_data_value' 
    });

    // Act
    const result = await flowManager.executeFlow('flow-7');

    // Assert
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results?.[0].output).toBe('generated_data_value');
    expect(result.results?.[1].output).toBe('processed_data_value');
  });

  test('should handle empty actions array', async () => {
    // Arrange
    const flow = {
      name: 'Empty Flow',
      enabled: true,
      actions: []
    };
    storage.setFlow('flow-8', flow);

    // Act
    const result = await flowManager.executeFlow('flow-8');

    // Assert
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
    expect(result.executionId).toBeDefined();
  });

  test('should generate unique execution context IDs', () => {
    // Act
    const context1 = flowManager.createExecutionContext();
    const context2 = flowManager.createExecutionContext();

    // Assert
    expect(context1.id).not.toBe(context2.id);
    expect(context1.startTime).toBeDefined();
    expect(context2.startTime).toBeDefined();
    expect(context1.variables).toEqual({});
    expect(context2.variables).toEqual({});
  });

  test('should handle action executor errors gracefully', async () => {
    // Arrange
    const flow = {
      name: 'Error Flow',
      enabled: true,
      actions: [{ type: 'error_action', command: 'fail' }]
    };
    storage.setFlow('flow-9', flow);
    actionExecutor.setFailure(true);

    // Act
    const result = await flowManager.executeFlow('flow-9');

    // Assert
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0].success).toBe(false);
    expect(result.results?.[0].error).toBe('Action execution failed');
  });
});