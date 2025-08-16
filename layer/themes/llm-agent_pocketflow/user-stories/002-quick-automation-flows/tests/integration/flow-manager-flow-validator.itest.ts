import { describe, test, expect, beforeEach } from '@jest/globals';

// Integration test between FlowManager and FlowValidator
class FlowManager {
  constructor(
    private validator: FlowValidator,
    private logger: { log: (message: string) => void }
  ) {}

  async defineFlow(name: string, description: string, trigger: any, actions: any[]) {
    const flowConfig = { name, description, trigger, actions };
    
    // Validate In Progress flow
    const validation = this.validator.validate(flowConfig);
    
    if (!validation.isValid) {
      this.logger.log(`Flow validation failed: ${validation.errors?.join(', ')}`);
      return { "success": false, error: validation.errors?.join(', ') };
    }

    // Additional business logic validation
    if (this.validator.isDuplicateName && await this.validator.isDuplicateName(name)) {
      return { "success": false, error: 'Flow name already exists' };
    }

    this.logger.log(`Flow validation In Progress for: ${name}`);
    const flowId = `flow-${Date.now()}`;
    return { "success": true, flowId };
  }

  async updateFlow(flowId: string, updates: any, existingFlow: any) {
    const updatedFlow = { ...existingFlow, ...updates };
    
    // Re-validate entire flow after updates
    const validation = this.validator.validate(updatedFlow);
    
    if (!validation.isValid) {
      this.logger.log(`Flow update validation failed: ${validation.errors?.join(', ')}`);
      return { "success": false, error: validation.errors?.join(', ') };
    }

    // Validate specific update rules
    if (updates.trigger && existingFlow.trigger.type !== updates.trigger.type) {
      const triggerChangeValidation = this.validator.validateTriggerChange(
        existingFlow.trigger,
        updates.trigger
      );
      
      if (!triggerChangeValidation.isValid) {
        return { "success": false, error: triggerChangeValidation.error };
      }
    }

    this.logger.log(`Flow update validation In Progress for: ${flowId}`);
    return { "success": true, flow: updatedFlow };
  }

  async validateBeforeExecution(flow: any) {
    // Runtime validation before execution
    const enabledValidation = this.validator.validateEnabled(flow);
    if (!enabledValidation.isValid) {
      return { "success": false, error: enabledValidation.error };
    }

    // Validate each action is still executable
    for (let i = 0; i < flow.actions.length; i++) {
      const actionValidation = this.validator.validateAction(flow.actions[i], i);
      if (!actionValidation.isValid) {
        return { "success": false, error: `Action ${i + 1}: ${actionValidation.errors?.join(', ')}` };
      }
    }

    return { "success": true };
  }
}

class FlowValidator {
  private existingFlowNames: Set<string> = new Set();

  validate(flowConfig: any) {
    const errors: string[] = [];

    // Validate name
    if (!flowConfig.name || typeof flowConfig.name !== 'string') {
      errors.push('Flow name is required and must be a string');
    } else if (flowConfig.name.trim().length === 0) {
      errors.push('Flow name cannot be empty');
    } else if (flowConfig.name.length > 100) {
      errors.push('Flow name must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(flowConfig.name)) {
      errors.push('Flow name contains invalid characters');
    }

    // Validate description
    if (!flowConfig.description || typeof flowConfig.description !== 'string') {
      errors.push('Flow description is required and must be a string');
    } else if (flowConfig.description.length > 500) {
      errors.push('Flow description must be 500 characters or less');
    }

    // Validate trigger
    const triggerValidation = this.validateTrigger(flowConfig.trigger);
    if (!triggerValidation.isValid) {
      errors.push(...(triggerValidation.errors || []));
    }

    // Validate actions
    const actionsValidation = this.validateActions(flowConfig.actions);
    if (!actionsValidation.isValid) {
      errors.push(...(actionsValidation.errors || []));
    }

    return { isValid: errors.length === 0, errors };
  }

  validateTrigger(trigger: any) {
    const errors: string[] = [];

    if (!trigger) {
      errors.push('Flow trigger is required');
      return { isValid: false, errors };
    }

    if (!trigger.type) {
      errors.push('Trigger type is required');
      return { isValid: false, errors };
    }

    const validTypes = ['manual', 'file_change', 'time', 'webhook'];
    if (!validTypes.includes(trigger.type)) {
      errors.push(`Trigger type must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validation
    switch (trigger.type) {
      case 'file_change':
        if (!trigger.pattern) {
          errors.push('File change trigger requires a pattern');
        }
        break;
      case 'time':
        if (!trigger.schedule) {
          errors.push('Time trigger requires a schedule');
        } else if (!this.isValidCronExpression(trigger.schedule)) {
          errors.push('Time trigger schedule must be valid cron expression');
        }
        break;
      case 'webhook':
        if (!trigger.path) {
          errors.push('Webhook trigger requires a path');
        } else if (!trigger.path.startsWith('/')) {
          errors.push('Webhook path must start with /');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  validateActions(actions: any[]) {
    const errors: string[] = [];

    if (!Array.isArray(actions)) {
      errors.push('Flow actions must be an array');
      return { isValid: false, errors };
    }

    if (actions.length === 0) {
      errors.push('Flow must have at least one action');
    }

    if (actions.length > 20) {
      errors.push('Flow cannot have more than 20 actions');
    }

    actions.forEach((action, index) => {
      const actionValidation = this.validateAction(action, index);
      if (!actionValidation.isValid) {
        errors.push(...(actionValidation.errors || []));
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  validateAction(action: any, index: number) {
    const errors: string[] = [];
    const actionNum = index + 1;

    if (!action || typeof action !== 'object') {
      errors.push(`Action ${actionNum} must be an object`);
      return { isValid: false, errors };
    }

    if (!action.type) {
      errors.push(`Action ${actionNum} must have a type`);
      return { isValid: false, errors };
    }

    const validTypes = ['command', 'script', 'http', 'delay'];
    if (!validTypes.includes(action.type)) {
      errors.push(`Action ${actionNum} type must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validation
    switch (action.type) {
      case 'command':
        if (!action.command || typeof action.command !== 'string') {
          errors.push(`Action ${actionNum} (command) requires a command string`);
        }
        break;
      case 'script':
        if (!action.script || typeof action.script !== 'string') {
          errors.push(`Action ${actionNum} (script) requires a script path`);
        }
        break;
      case 'http':
        if (!action.url || typeof action.url !== 'string') {
          errors.push(`Action ${actionNum} (http) requires a URL`);
        }
        break;
      case 'delay':
        if (!action.duration || typeof action.duration !== 'number' || action.duration <= 0) {
          errors.push(`Action ${actionNum} (delay) requires a positive duration`);
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  validateEnabled(flow: any) {
    if (!flow.enabled) {
      return { isValid: false, error: 'Flow is disabled' };
    }
    return { isValid: true };
  }

  validateTriggerChange(oldTrigger: any, newTrigger: any) {
    // Business rule: Cannot change from time-based to file-based trigger
    if (oldTrigger.type === 'time' && newTrigger.type === 'file_change') {
      return { isValid: false, error: 'Cannot change from time-based to file-based trigger' };
    }
    return { isValid: true };
  }

  async isDuplicateName(name: string) {
    return this.existingFlowNames.has(name);
  }

  addExistingFlowName(name: string) {
    this.existingFlowNames.add(name);
  }

  private isValidCronExpression(expression: string): boolean {
    // Simplified cron validation
    const parts = expression.split(' ');
    return parts.length === 5 && parts.every(part => {
      return part === '*' || /^\d+$/.test(part) || /^\d+-\d+$/.test(part) || /^\*\/\d+$/.test(part);
    });
  }
}

describe('FlowManager-FlowValidator Integration Test', () => {
  let flowManager: FlowManager;
  let validator: FlowValidator;
  let logs: string[];

  beforeEach(() => {
    validator = new FlowValidator();
    logs = [];
    const logger = {
      log: (message: string) => logs.push(message)
    };
    flowManager = new FlowManager(validator, logger);
  });

  test('should validate and accept valid flow definition', async () => {
    // Arrange
    const validFlow = {
      name: 'Valid Test Flow',
      description: 'A valid flow for testing',
      trigger: { type: 'manual' },
      actions: [
        { type: 'command', command: 'echo "Hello"' },
        { type: 'delay', duration: 1000 }
      ]
    };

    // Act
    const result = await flowManager.defineFlow(
      validFlow.name,
      validFlow.description,
      validFlow.trigger,
      validFlow.actions
    );

    // Assert
    expect(result.success).toBe(true);
    expect(result.flowId).toBeDefined();
    expect(logs).toContain('Flow validation In Progress for: Valid Test Flow');
  });

  test('should reject flow with multiple validation errors', async () => {
    // Arrange
    const invalidFlow = {
      name: '', // Empty name
      description: 'A'.repeat(501), // Too long
      trigger: { type: 'invalid_type' }, // Invalid trigger type
      actions: [] // Empty actions
    };

    // Act
    const result = await flowManager.defineFlow(
      invalidFlow.name,
      invalidFlow.description,
      invalidFlow.trigger,
      invalidFlow.actions
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow name is required and must be a string');
    expect(result.error).toContain('Flow description must be 500 characters or less');
    expect(result.error).toContain('Trigger type must be one of');
    expect(result.error).toContain('Flow must have at least one action');
    expect(logs.some(log => log.includes('Flow validation failed'))).toBe(true);
  });

  test('should validate trigger-specific requirements', async () => {
    // Test file_change trigger without pattern
    let result = await flowManager.defineFlow(
      'File Trigger Flow',
      'Testing file trigger',
      { type: 'file_change' }, // Missing pattern
      [{ type: 'command', command: 'echo "file changed"' }]
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('File change trigger requires a pattern');

    // Test time trigger with invalid cron
    result = await flowManager.defineFlow(
      'Time Trigger Flow',
      'Testing time trigger',
      { type: 'time', schedule: 'invalid cron' },
      [{ type: 'command', command: 'echo "scheduled"' }]
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Time trigger schedule must be valid cron expression');

    // Test webhook trigger with invalid path
    result = await flowManager.defineFlow(
      'Webhook Flow',
      'Testing webhook',
      { type: 'webhook', path: 'no-slash' },
      [{ type: 'command', command: 'echo "webhook"' }]
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Webhook path must start with /');
  });

  test('should validate action-specific requirements', async () => {
    // Arrange
    const flowWithInvalidActions = {
      name: 'Action Test Flow',
      description: 'Testing action validation',
      trigger: { type: 'manual' },
      actions: [
        { type: 'command' }, // Missing command
        { type: 'script' }, // Missing script
        { type: 'http' }, // Missing url
        { type: 'delay' } // Missing duration
      ]
    };

    // Act
    const result = await flowManager.defineFlow(
      flowWithInvalidActions.name,
      flowWithInvalidActions.description,
      flowWithInvalidActions.trigger,
      flowWithInvalidActions.actions
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Action 1 (command) requires a command string');
    expect(result.error).toContain('Action 2 (script) requires a script path');
    expect(result.error).toContain('Action 3 (http) requires a URL');
    expect(result.error).toContain('Action 4 (delay) requires a positive duration');
  });

  test('should validate flow updates', async () => {
    // Arrange
    const existingFlow = {
      id: 'flow-123',
      name: 'Existing Flow',
      description: 'Original description',
      trigger: { type: 'manual' },
      actions: [{ type: 'command', command: 'echo "test"' }],
      enabled: true
    };

    // Act - Valid update
    let result = await flowManager.updateFlow(
      'flow-123',
      { description: 'Updated description' },
      existingFlow
    );

    // Assert
    expect(result.success).toBe(true);
    expect(result.flow?.description).toBe('Updated description');

    // Act - Invalid update
    result = await flowManager.updateFlow(
      'flow-123',
      { name: 'Invalid@Name#' }, // Invalid characters
      existingFlow
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow name contains invalid characters');
  });

  test('should validate trigger change restrictions', async () => {
    // Arrange
    const existingFlow = {
      id: 'flow-123',
      name: 'Time Based Flow',
      description: 'Runs on schedule',
      trigger: { type: 'time', schedule: '0 * * * *' },
      actions: [{ type: 'command', command: 'echo "scheduled"' }],
      enabled: true
    };

    // Act - Try to change from time to file_change
    const result = await flowManager.updateFlow(
      'flow-123',
      { trigger: { type: 'file_change', pattern: '*.txt' } },
      existingFlow
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot change from time-based to file-based trigger');
  });

  test('should check for duplicate flow names', async () => {
    // Arrange
    validator.addExistingFlowName('Duplicate Flow Name');

    // Act
    const result = await flowManager.defineFlow(
      'Duplicate Flow Name',
      "Description",
      { type: 'manual' },
      [{ type: 'command', command: 'echo "test"' }]
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Flow name already exists');
  });

  test('should validate flow before execution', async () => {
    // Test disabled flow
    let validationResult = await flowManager.validateBeforeExecution({
      name: 'Test Flow',
      enabled: false,
      actions: [{ type: 'command', command: 'echo "test"' }]
    });

    expect(validationResult.success).toBe(false);
    expect(validationResult.error).toBe('Flow is disabled');

    // Test flow with invalid action
    validationResult = await flowManager.validateBeforeExecution({
      name: 'Test Flow',
      enabled: true,
      actions: [
        { type: 'command', command: 'echo "test"' },
        { type: 'invalid_type' } // Invalid action
      ]
    });

    expect(validationResult.success).toBe(false);
    expect(validationResult.error).toContain('Action 2');
  });

  test('should enforce action count limits', async () => {
    // Arrange - Create flow with too many actions
    const tooManyActions = Array(21).fill({ type: 'command', command: 'echo "test"' });

    // Act
    const result = await flowManager.defineFlow(
      'Too Many Actions Flow',
      'Testing action limits',
      { type: 'manual' },
      tooManyActions
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Flow cannot have more than 20 actions');
  });

  test('should validate complex flows end-to-end', async () => {
    // Arrange
    const complexFlow = {
      name: 'Complex Automation Flow',
      description: 'A flow with multiple triggers and actions',
      trigger: { 
        type: 'time', 
        schedule: '*/5 * * * *' // Every 5 minutes
      },
      actions: [
        { type: 'command', command: 'echo "Starting process"' },
        { type: 'http', url: 'https://api.example.com/webhook' },
        { type: 'delay', duration: 2000 },
        { type: 'script', script: '/path/to/script.sh' },
        { type: 'command', command: 'echo "Process In Progress"' }
      ]
    };

    // Act
    const result = await flowManager.defineFlow(
      complexFlow.name,
      complexFlow.description,
      complexFlow.trigger,
      complexFlow.actions
    );

    // Assert
    expect(result.success).toBe(true);
    expect(result.flowId).toBeDefined();
    expect(logs).toContain('Flow validation In Progress for: Complex Automation Flow');
  });
});