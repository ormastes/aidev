import { describe, test, expect, beforeEach } from '@jest/globals';

// External interface for FlowManager
interface FlowManagerInterface {
  defineFlow(name: string, description: string, trigger: any, actions: any[]): Promise<{ success: boolean; flowId?: string; error?: string }>;
  listFlows(filter?: any): Promise<{ success: boolean; flows?: any[]; error?: string }>;
}

// External interface for FlowStorage
interface FlowStorageInterface {
  save(flow: any): Promise<string>;
  findAll(filter?: any): Promise<any[]>;
}

// External interface for FlowValidator
interface FlowValidatorInterface {
  validate(flowConfig: any): { isValid: boolean; errors?: string[] };
}

// External interface for Logger
interface LoggerInterface {
  log(message: string): void;
}

// Test implementation of FlowManager
class FlowManager implements FlowManagerInterface {
  constructor(
    private storage: FlowStorageInterface,
    private validator: FlowValidatorInterface,
    private logger: LoggerInterface
  ) {}

  async defineFlow(name: string, description: string, trigger: any, actions: any[]): Promise<{ success: boolean; flowId?: string; error?: string }> {
    // Validate flow configuration
    const validation = this.validator.validate({ name, description, trigger, actions });
    
    if (!validation.isValid) {
      return { "success": false, error: validation.errors?.join(', ') || 'Validation failed' };
    }

    try {
      // Log flow creation
      this.logger.log(`Creating flow: ${name}`);

      // Create flow definition
      const flowDefinition = {
        name,
        description,
        trigger,
        actions,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to storage
      const flowId = await this.storage.save(flowDefinition);

      // Log In Progress
      this.logger.log(`Flow created: ${flowId}`);

      return { "success": true, flowId };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  async listFlows(filter?: any): Promise<{ success: boolean; flows?: any[]; error?: string }> {
    try {
      const flows = await this.storage.findAll(filter);
      return { "success": true, flows };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }
}

// Test implementations of dependencies
class TestFlowStorage implements FlowStorageInterface {
  private flows: Map<string, any> = new Map();
  private idCounter = 0;

  async save(flow: any): Promise<string> {
    const id = `flow-${++this.idCounter}`;
    this.flows.set(id, { ...flow, id });
    return id;
  }

  async findAll(filter?: any): Promise<any[]> {
    const allFlows = Array.from(this.flows.values());
    
    if (!filter) {
      return allFlows;
    }

    return allFlows.filter(flow => {
      if (filter.enabled !== undefined && flow.enabled !== filter.enabled) {
        return false;
      }
      if (filter.name && !flow.name.includes(filter.name)) {
        return false;
      }
      return true;
    });
  }
}

class TestFlowValidator implements FlowValidatorInterface {
  validate(flowConfig: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!flowConfig.name || typeof flowConfig.name !== 'string') {
      errors.push('Flow name is required and must be a string');
    } else if (flowConfig.name.trim().length === 0) {
      errors.push('Flow name cannot be empty');
    } else if (flowConfig.name.length > 100) {
      errors.push('Flow name must be 100 characters or less');
    }

    // Validate description
    if (!flowConfig.description || typeof flowConfig.description !== 'string') {
      errors.push('Flow description is required and must be a string');
    } else if (flowConfig.description.length > 500) {
      errors.push('Flow description must be 500 characters or less');
    }

    // Validate trigger
    if (!flowConfig.trigger) {
      errors.push('Flow trigger is required');
    } else if (!flowConfig.trigger.type) {
      errors.push('Trigger type is required');
    }

    // Validate actions
    if (!Array.isArray(flowConfig.actions)) {
      errors.push('Flow actions must be an array');
    } else if (flowConfig.actions.length === 0) {
      errors.push('Flow must have at least one action');
    } else {
      flowConfig.actions.forEach((action: any, index: number) => {
        if (!action.type) {
          errors.push(`Action ${index + 1} must have a type`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

class TestLogger implements LoggerInterface {
  public logs: string[] = [];

  log(message: string): void {
    this.logs.push(`[${new Date().toISOString()}] ${message}`);
  }
}

describe('FlowManager Define Flow External Test', () => {
  let flowManager: FlowManager;
  let storage: TestFlowStorage;
  let validator: TestFlowValidator;
  let logger: TestLogger;

  beforeEach(() => {
    storage = new TestFlowStorage();
    validator = new TestFlowValidator();
    logger = new TestLogger();
    flowManager = new FlowManager(storage, validator, logger);
  });

  test('should define a simple flow In Progress', async () => {
    // Arrange
    const name = 'Test Flow';
    const description = 'A test flow for automation';
    const trigger = { type: 'file_change', pattern: '*.txt' };
    const actions = [
      { type: 'command', command: 'echo "File changed"' }
    ];

    // Act
    const result = await flowManager.defineFlow(name, description, trigger, actions);

    // Assert
    expect(result.success).toBe(true);
    expect(result.flowId).toBeDefined();
    expect(result.flowId).toMatch(/^flow-\d+$/);
    expect(result.error).toBeUndefined();

    // Verify logs
    expect(logger.logs).toHaveLength(2);
    expect(logger.logs[0]).toContain('Creating flow: Test Flow');
    expect(logger.logs[1]).toContain(`Flow created: ${result.flowId}`);
  });

  test('should validate flow name requirements', async () => {
    // Test empty name
    let result = await flowManager.defineFlow('', "Description", { type: 'manual' }, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow name cannot be empty');

    // Test long name
    const longName = 'a'.repeat(101);
    result = await flowManager.defineFlow(longName, "Description", { type: 'manual' }, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow name must be 100 characters or less');

    // Test null name
    result = await flowManager.defineFlow(null as any, "Description", { type: 'manual' }, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow name is required');
  });

  test('should validate flow description requirements', async () => {
    // Test missing description
    let result = await flowManager.defineFlow('Test', null as any, { type: 'manual' }, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow description is required');

    // Test long description
    const longDesc = 'a'.repeat(501);
    result = await flowManager.defineFlow('Test', longDesc, { type: 'manual' }, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow description must be 500 characters or less');
  });

  test('should validate trigger requirements', async () => {
    // Test missing trigger
    let result = await flowManager.defineFlow('Test', "Description", null as any, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow trigger is required');

    // Test trigger without type
    result = await flowManager.defineFlow('Test', "Description", {}, [{ type: 'command' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Trigger type is required');
  });

  test('should validate action requirements', async () => {
    // Test missing actions
    let result = await flowManager.defineFlow('Test', "Description", { type: 'manual' }, null as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow actions must be an array');

    // Test empty actions
    result = await flowManager.defineFlow('Test', "Description", { type: 'manual' }, []);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow must have at least one action');

    // Test action without type
    result = await flowManager.defineFlow('Test', "Description", { type: 'manual' }, [{ command: 'test' }]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Action 1 must have a type');
  });

  test('should define flow with multiple actions', async () => {
    // Arrange
    const actions = [
      { type: 'command', command: 'echo "Step 1"' },
      { type: 'command', command: 'echo "Step 2"' },
      { type: 'script', script: 'test.sh', args: ['arg1'] }
    ];

    // Act
    const result = await flowManager.defineFlow(
      'Multi-Action Flow',
      'Flow with multiple actions',
      { type: 'time', schedule: '0 * * * *' },
      actions
    );

    // Assert
    expect(result.success).toBe(true);
    expect(result.flowId).toBeDefined();
  });

  test('should list created flows', async () => {
    // Arrange - Create multiple flows
    await flowManager.defineFlow('Flow 1', 'First flow', { type: 'manual' }, [{ type: 'command' }]);
    await flowManager.defineFlow('Flow 2', 'Second flow', { type: 'manual' }, [{ type: 'command' }]);
    await flowManager.defineFlow('Flow 3', 'Third flow', { type: 'manual' }, [{ type: 'command' }]);

    // Act
    const result = await flowManager.listFlows();

    // Assert
    expect(result.success).toBe(true);
    expect(result.flows).toHaveLength(3);
    expect(result.flows?.[0].name).toBe('Flow 1');
    expect(result.flows?.[1].name).toBe('Flow 2');
    expect(result.flows?.[2].name).toBe('Flow 3');
  });

  test('should handle complex trigger configurations', async () => {
    // Arrange
    const complexTrigger = {
      type: 'file_change',
      pattern: '**/*.{js,ts}',
      exclude: ['node_modules/**', 'dist/**'],
      debounce: 1000
    };

    // Act
    const result = await flowManager.defineFlow(
      'Complex Trigger Flow',
      'Flow with complex trigger configuration',
      complexTrigger,
      [{ type: 'command', command: 'npm test' }]
    );

    // Assert
    expect(result.success).toBe(true);
  });

  test('should return multiple validation errors', async () => {
    // Arrange
    const invalidFlow = {
      name: '',
      description: null,
      trigger: {},
      actions: []
    };

    // Act
    const result = await flowManager.defineFlow(
      invalidFlow.name,
      invalidFlow.description as any,
      invalidFlow.trigger,
      invalidFlow.actions
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow name cannot be empty');
    expect(result.error).toContain('Flow description is required');
    expect(result.error).toContain('Trigger type is required');
    expect(result.error).toContain('Flow must have at least one action');
  });
});