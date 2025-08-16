import { describe, test, expect, beforeEach } from '@jest/globals';

// External interfaces
interface FlowValidatorInterface {
  validate(flowConfig: any): { isValid: boolean; errors?: string[] };
  validateEnabled(flow: any): { isValid: boolean; error?: string };
  validateTrigger(trigger: any): { isValid: boolean; errors?: string[] };
  validateActions(actions: any[]): { isValid: boolean; errors?: string[] };
  validateAction(action: any, index: number): { isValid: boolean; errors?: string[] };
}

// Test implementation of FlowValidator
class FlowValidator implements FlowValidatorInterface {
  validate(flowConfig: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate basic structure
    if (!flowConfig || typeof flowConfig !== 'object') {
      errors.push('Flow configuration must be an object');
      return { isValid: false, errors };
    }

    // Validate name
    const nameValidation = this.validateName(flowConfig.name);
    if (!nameValidation.isValid) {
      errors.push(...(nameValidation.errors || []));
    }

    // Validate description
    const descValidation = this.validateDescription(flowConfig.description);
    if (!descValidation.isValid) {
      errors.push(...(descValidation.errors || []));
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

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  validateEnabled(flow: any): { isValid: boolean; error?: string } {
    if (!flow) {
      return { isValid: false, error: 'Flow is required' };
    }

    if (flow.enabled === undefined) {
      return { isValid: false, error: 'Flow enabled status is required' };
    }

    if (typeof flow.enabled !== 'boolean') {
      return { isValid: false, error: 'Flow enabled status must be a boolean' };
    }

    if (!flow.enabled) {
      return { isValid: false, error: 'Flow is disabled' };
    }

    return { isValid: true };
  }

  validateTrigger(trigger: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!trigger) {
      errors.push('Flow trigger is required');
      return { isValid: false, errors };
    }

    if (typeof trigger !== 'object') {
      errors.push('Trigger must be an object');
      return { isValid: false, errors };
    }

    // Validate trigger type
    if (!trigger.type || typeof trigger.type !== 'string') {
      errors.push('Trigger type is required and must be a string');
    } else {
      const validTypes = ['manual', 'file_change', 'time', 'webhook', 'event'];
      if (!validTypes.includes(trigger.type)) {
        errors.push(`Trigger type must be one of: ${validTypes.join(', ')}`);
      }
    }

    // Validate specific trigger configurations
    if (trigger.type === 'file_change') {
      if (!trigger.pattern || typeof trigger.pattern !== 'string') {
        errors.push('File change trigger requires a pattern');
      } else if (trigger.pattern.length === 0) {
        errors.push('File change pattern cannot be empty');
      }
    }

    if (trigger.type === 'time') {
      if (!trigger.schedule || typeof trigger.schedule !== 'string') {
        errors.push('Time trigger requires a schedule');
      } else if (!/^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/.test(trigger.schedule)) {
        errors.push('Time trigger schedule must be in cron format');
      }
    } else if (trigger.type === 'time' && errors.length === 0) {
      // Additional validation for valid cron but without schedule property check
      return { isValid: true };
    }

    if (trigger.type === 'webhook') {
      if (!trigger.path || typeof trigger.path !== 'string') {
        errors.push('Webhook trigger requires a path');
      } else if (!trigger.path.startsWith('/')) {
        errors.push('Webhook path must start with /');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  validateActions(actions: any[]): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(actions)) {
      errors.push('Flow actions must be an array');
      return { isValid: false, errors };
    }

    if (actions.length === 0) {
      errors.push('Flow must have at least one action');
      return { isValid: false, errors };
    }

    if (actions.length > 20) {
      errors.push('Flow cannot have more than 20 actions');
    }

    // Validate each action
    actions.forEach((action, index) => {
      const actionValidation = this.validateAction(action, index);
      if (!actionValidation.isValid) {
        errors.push(...(actionValidation.errors || []));
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  validateAction(action: any, index: number): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const actionNum = index + 1;

    if (!action || typeof action !== 'object') {
      errors.push(`Action ${actionNum} must be an object`);
      return { isValid: false, errors };
    }

    // Validate action type
    if (!action.type || typeof action.type !== 'string') {
      errors.push(`Action ${actionNum} must have a type`);
      return { isValid: false, errors };
    }

    const validTypes = ['command', 'script', 'http', 'email', 'delay', "condition"];
    if (!validTypes.includes(action.type)) {
      errors.push(`Action ${actionNum} type must be one of: ${validTypes.join(', ')}`);
    }

    // Validate specific action configurations
    switch (action.type) {
      case 'command':
        if (!action.command || typeof action.command !== 'string') {
          errors.push(`Action ${actionNum} (command) requires a command`);
        } else if (action.command.trim().length === 0) {
          errors.push(`Action ${actionNum} (command) cannot be empty`);
        }
        if (action.timeout && (typeof action.timeout !== 'number' || action.timeout <= 0)) {
          errors.push(`Action ${actionNum} (command) timeout must be a positive number`);
        }
        break;

      case 'script':
        if (!action.script || typeof action.script !== 'string') {
          errors.push(`Action ${actionNum} (script) requires a script path`);
        }
        if (action.args && !Array.isArray(action.args)) {
          errors.push(`Action ${actionNum} (script) args must be an array`);
        }
        break;

      case 'http':
        if (!action.url || typeof action.url !== 'string') {
          errors.push(`Action ${actionNum} (http) requires a URL`);
        } else if (!/^https?:\/\//.test(action.url)) {
          errors.push(`Action ${actionNum} (http) URL must start with http:// or https://`);
        }
        if (action.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(action.method)) {
          errors.push(`Action ${actionNum} (http) method must be GET, POST, PUT, DELETE, or PATCH`);
        }
        break;

      case 'email':
        if (!action.to || typeof action.to !== 'string') {
          errors.push(`Action ${actionNum} (email) requires a recipient`);
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(action.to)) {
          errors.push(`Action ${actionNum} (email) recipient must be a valid email`);
        }
        if (!action.subject || typeof action.subject !== 'string') {
          errors.push(`Action ${actionNum} (email) requires a subject`);
        }
        break;

      case 'delay':
        if (!action.duration || typeof action.duration !== 'number' || action.duration <= 0) {
          errors.push(`Action ${actionNum} (delay) requires a positive duration in milliseconds`);
        }
        if (action.duration > 300000) { // 5 minutes max
          errors.push(`Action ${actionNum} (delay) duration cannot exceed 5 minutes`);
        }
        break;

      case "condition":
        if (!action.condition || typeof action.condition !== 'string') {
          errors.push(`Action ${actionNum} (condition) requires a condition expression`);
        }
        if (!action.onTrue && !action.onFalse) {
          errors.push(`Action ${actionNum} (condition) requires at least onTrue or onFalse`);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private validateName(name: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!name || (typeof name === 'string' && name.trim().length === 0)) {
      errors.push('Flow name cannot be empty or whitespace only');
    } else if (typeof name !== 'string') {
      errors.push('Flow name must be a string');
    } else if (name.length > 100) {
      errors.push('Flow name must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(name)) {
      errors.push('Flow name can only contain letters, numbers, spaces, hyphens, underscores, and dots');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private validateDescription(description: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!description) {
      errors.push('Flow description is required');
    } else if (typeof description !== 'string') {
      errors.push('Flow description must be a string');
    } else if (description.trim().length === 0) {
      errors.push('Flow description cannot be empty or whitespace only');
    } else if (description.length > 500) {
      errors.push('Flow description must be 500 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

describe('FlowValidator Validation Rules External Test', () => {
  let validator: FlowValidator;

  beforeEach(() => {
    validator = new FlowValidator();
  });

  describe('validate (In Progress flow)', () => {
    test('should validate In Progress valid flow', () => {
      // Arrange
      const validFlow = {
        name: 'Valid Flow',
        description: 'A valid flow configuration',
        trigger: { type: 'manual' },
        actions: [
          { type: 'command', command: 'echo "Hello World"' }
        ]
      };

      // Act
      const result = validator.validate(validFlow);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should fail validation with multiple errors', () => {
      // Arrange
      const invalidFlow = {
        name: '',
        description: null,
        trigger: {},
        actions: []
      };

      // Act
      const result = validator.validate(invalidFlow);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow name cannot be empty or whitespace only');
      expect(result.errors).toContain('Flow description is required');
      expect(result.errors).toContain('Trigger type is required and must be a string');
      expect(result.errors).toContain('Flow must have at least one action');
    });

    test('should fail with non-object configuration', () => {
      // Act
      const result = validator.validate('invalid');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow configuration must be an object');
    });
  });

  describe("validateEnabled", () => {
    test('should validate enabled flow', () => {
      // Arrange
      const flow = { enabled: true };

      // Act
      const result = validator.validateEnabled(flow);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should fail for disabled flow', () => {
      // Arrange
      const flow = { enabled: false };

      // Act
      const result = validator.validateEnabled(flow);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Flow is disabled');
    });

    test('should fail for missing enabled property', () => {
      // Arrange
      const flow = {};

      // Act
      const result = validator.validateEnabled(flow);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Flow enabled status is required');
    });

    test('should fail for non-boolean enabled property', () => {
      // Arrange
      const flow = { enabled: 'true' };

      // Act
      const result = validator.validateEnabled(flow);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Flow enabled status must be a boolean');
    });
  });

  describe("validateTrigger", () => {
    test('should validate manual trigger', () => {
      // Arrange
      const trigger = { type: 'manual' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should validate file change trigger', () => {
      // Arrange
      const trigger = { type: 'file_change', pattern: '*.txt' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail file change trigger without pattern', () => {
      // Arrange
      const trigger = { type: 'file_change' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File change trigger requires a pattern');
    });

    test('should validate time trigger', () => {
      // Arrange
      const trigger = { type: 'time', schedule: '0 */6 * * *' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail time trigger with invalid schedule', () => {
      // Arrange
      const trigger = { type: 'time', schedule: 'invalid cron' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time trigger schedule must be in cron format');
    });

    test('should validate webhook trigger', () => {
      // Arrange
      const trigger = { type: 'webhook', path: '/webhook/endpoint' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail webhook trigger with invalid path', () => {
      // Arrange
      const trigger = { type: 'webhook', path: 'invalid-path' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Webhook path must start with /');
    });

    test('should fail with invalid trigger type', () => {
      // Arrange
      const trigger = { type: 'invalid_type' };

      // Act
      const result = validator.validateTrigger(trigger);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trigger type must be one of: manual, file_change, time, webhook, event');
    });
  });

  describe("validateActions", () => {
    test('should validate action array', () => {
      // Arrange
      const actions = [
        { type: 'command', command: 'echo "test"' },
        { type: 'script', script: 'test.sh' }
      ];

      // Act
      const result = validator.validateActions(actions);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail with non-array actions', () => {
      // Act
      const result = validator.validateActions('not an array' as any);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow actions must be an array');
    });

    test('should fail with empty actions array', () => {
      // Act
      const result = validator.validateActions([]);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow must have at least one action');
    });

    test('should fail with too many actions', () => {
      // Arrange
      const actions = Array.from({ length: 21 }, () => ({ type: 'command', command: 'echo "test"' }));

      // Act
      const result = validator.validateActions(actions);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow cannot have more than 20 actions');
    });
  });

  describe("validateAction", () => {
    test('should validate command action', () => {
      // Arrange
      const action = { type: 'command', command: 'echo "Hello World"', timeout: 5000 };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail command action without command', () => {
      // Arrange
      const action = { type: 'command' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 (command) requires a command');
    });

    test('should validate script action', () => {
      // Arrange
      const action = { type: 'script', script: 'test.sh', args: ['arg1', 'arg2'] };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail script action with invalid args', () => {
      // Arrange
      const action = { type: 'script', script: 'test.sh', args: 'invalid' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 (script) args must be an array');
    });

    test('should validate http action', () => {
      // Arrange
      const action = { type: 'http', url: 'https://api.example.com/endpoint', method: 'POST' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail http action with invalid URL', () => {
      // Arrange
      const action = { type: 'http', url: 'invalid-url' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 (http) URL must start with http:// or https://');
    });

    test('should validate email action', () => {
      // Arrange
      const action = { type: 'email', to: 'user@example.com', subject: 'Test Subject' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail email action with invalid email', () => {
      // Arrange
      const action = { type: 'email', to: 'invalid-email', subject: 'Test' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 (email) recipient must be a valid email');
    });

    test('should validate delay action', () => {
      // Arrange
      const action = { type: 'delay', duration: 5000 };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail delay action with excessive duration', () => {
      // Arrange
      const action = { type: 'delay', duration: 400000 }; // > 5 minutes

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 (delay) duration cannot exceed 5 minutes');
    });

    test('should validate condition action', () => {
      // Arrange
      const action = { type: "condition", condition: 'x > 5', onTrue: "continue", onFalse: 'stop' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(true);
    });

    test('should fail condition action without condition', () => {
      // Arrange
      const action = { type: "condition", onTrue: "continue" };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 (condition) requires a condition expression');
    });

    test('should fail with invalid action type', () => {
      // Arrange
      const action = { type: 'invalid_type' };

      // Act
      const result = validator.validateAction(action, 0);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action 1 type must be one of: command, script, http, email, delay, condition');
    });
  });

  describe('name validation', () => {
    test('should validate valid names', () => {
      // Arrange
      const validNames = [
        'Simple Flow',
        'Flow-with-hyphens',
        'Flow_with_underscores',
        'Flow.with.dots',
        'Flow123',
        'A'.repeat(100) // Exactly 100 characters
      ];

      validNames.forEach(name => {
        const flow = {
          name,
          description: 'Test description',
          trigger: { type: 'manual' },
          actions: [{ type: 'command', command: 'echo "test"' }]
        };

        // Act
        const result = validator.validate(flow);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    test('should fail invalid names', () => {
      // Arrange
      const invalidNames = [
        '', // Empty
        '   ', // Whitespace only
        'A'.repeat(101), // Too long
        'Invalid@Name', // Invalid characters
        'Invalid#Name', // Invalid characters
        null, // Null
        123 // Not a string
      ];

      invalidNames.forEach(name => {
        const flow = {
          name,
          description: 'Test description',
          trigger: { type: 'manual' },
          actions: [{ type: 'command', command: 'echo "test"' }]
        };

        // Act
        const result = validator.validate(flow);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors?.some(e => e.includes('Flow name'))).toBe(true);
      });
    });
  });

  describe('description validation', () => {
    test('should validate valid descriptions', () => {
      // Arrange
      const validDescriptions = [
        'Simple description',
        'Description with special chars: !@#$%^&*()[]{}|;:,.<>?',
        'A'.repeat(500) // Exactly 500 characters
      ];

      validDescriptions.forEach(description => {
        const flow = {
          name: 'Test Flow',
          description,
          trigger: { type: 'manual' },
          actions: [{ type: 'command', command: 'echo "test"' }]
        };

        // Act
        const result = validator.validate(flow);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    test('should fail invalid descriptions', () => {
      // Arrange
      const invalidDescriptions = [
        '', // Empty
        '   ', // Whitespace only
        'A'.repeat(501), // Too long
        null, // Null
        123 // Not a string
      ];

      invalidDescriptions.forEach(description => {
        const flow = {
          name: 'Test Flow',
          description,
          trigger: { type: 'manual' },
          actions: [{ type: 'command', command: 'echo "test"' }]
        };

        // Act
        const result = validator.validate(flow);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors?.some(e => e.includes('Flow description'))).toBe(true);
      });
    });
  });
});