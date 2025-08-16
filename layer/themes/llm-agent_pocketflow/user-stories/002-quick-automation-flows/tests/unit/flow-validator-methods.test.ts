import { describe, test, expect, beforeEach } from '@jest/globals';

// FlowValidator implementation for unit testing
class FlowValidator {
  private reservedNames: Set<string> = new Set([
    'system', 'admin', 'root', 'default', 'test', 'example'
  ]);

  // Method under test: validateName
  validateName(name: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if name exists
    if (name === undefined || name === null) {
      errors.push('Flow name is required');
      return { isValid: false, errors };
    }

    // Check if name is string
    if (typeof name !== 'string') {
      errors.push('Flow name must be a string');
      return { isValid: false, errors };
    }

    // Check if name is empty after trimming
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      errors.push('Flow name cannot be empty');
      return { isValid: false, errors };
    }

    // Check minimum length
    if (trimmedName.length < 3) {
      errors.push('Flow name must be at least 3 characters long');
    }

    // Check maximum length
    if (trimmedName.length > 100) {
      errors.push('Flow name must be 100 characters or less');
    }

    // Check for valid characters (alphanumeric, spaces, hyphens, underscores, dots)
    const validNamePattern = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validNamePattern.test(trimmedName)) {
      errors.push('Flow name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, and dots are allowed');
    }

    // Check if name starts and ends with alphanumeric character
    const startsEndsAlphanumeric = /^[a-zA-Z0-9].*[a-zA-Z0-9]$/;
    if (trimmedName.length > 1 && !startsEndsAlphanumeric.test(trimmedName)) {
      errors.push('Flow name must start and end with a letter or number');
    }

    // Check for reserved names
    if (this.reservedNames.has(trimmedName.toLowerCase())) {
      errors.push('Flow name is reserved and cannot be used');
    }

    // Check for consecutive special characters
    if (/[\s\-_.]{2,}/.test(trimmedName)) {
      errors.push('Flow name cannot contain consecutive special characters');
    }

    // Check for profanity or inappropriate content (basic check)
    const inappropriateWords = ['delete', 'remove', 'destroy', 'kill', 'hack'];
    const lowerName = trimmedName.toLowerCase();
    if (inappropriateWords.some(word => lowerName.includes(word))) {
      errors.push('Flow name contains inappropriate content');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Method under test: validateDescription
  validateDescription(description: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if description exists
    if (description === undefined || description === null) {
      errors.push('Flow description is required');
      return { isValid: false, errors };
    }

    // Check if description is string
    if (typeof description !== 'string') {
      errors.push('Flow description must be a string');
      return { isValid: false, errors };
    }

    // Check if description is empty after trimming
    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      errors.push('Flow description cannot be empty');
      return { isValid: false, errors };
    }

    // Check minimum length
    if (trimmedDescription.length < 10) {
      errors.push('Flow description must be at least 10 characters long');
    }

    // Check maximum length
    if (trimmedDescription.length > 500) {
      errors.push('Flow description must be 500 characters or less');
    }

    // Check for meaningful content (not just repeated characters)
    const repeatedCharPattern = /(.)\1{9,}/; // 10 or more repeated characters
    if (repeatedCharPattern.test(trimmedDescription)) {
      errors.push('Flow description must contain meaningful content');
    }

    // Check for minimum word count
    const words = trimmedDescription.split(/\s+/).filter(word => word.length > 0);
    if (words.length < 3) {
      errors.push('Flow description must contain at least 3 words');
    }

    // Check for placeholder text
    const placeholderPatterns = [
      /lorem ipsum/i,
      /placeholder/i,
      /todo/i,
      /xxx/i,
      /test.*test.*test/i
    ];

    if (placeholderPatterns.some(pattern => pattern.test(trimmedDescription))) {
      errors.push('Flow description appears to contain placeholder text');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Method under test: validateTrigger
  validateTrigger(trigger: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if trigger exists
    if (!trigger) {
      errors.push('Flow trigger is required');
      return { isValid: false, errors };
    }

    // Check if trigger is object
    if (typeof trigger !== 'object' || Array.isArray(trigger)) {
      errors.push('Flow trigger must be an object');
      return { isValid: false, errors };
    }

    // Check if trigger has type
    if (!trigger.type) {
      errors.push('Trigger type is required');
      return { isValid: false, errors };
    }

    // Validate trigger type
    const validTypes = ['manual', 'file_change', 'time', 'webhook', 'event'];
    if (!validTypes.includes(trigger.type)) {
      errors.push(`Trigger type must be one of: ${validTypes.join(', ')}`);
      return { isValid: false, errors };
    }

    // Type-specific validation
    switch (trigger.type) {
      case 'file_change':
        this.validateFileChangeTrigger(trigger, errors);
        break;
      case 'time':
        this.validateTimeTrigger(trigger, errors);
        break;
      case 'webhook':
        this.validateWebhookTrigger(trigger, errors);
        break;
      case 'event':
        this.validateEventTrigger(trigger, errors);
        break;
      case 'manual':
        // Manual triggers don't need additional validation
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  // Method under test: validateActions
  validateActions(actions: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if actions exists
    if (!actions) {
      errors.push('Flow actions are required');
      return { isValid: false, errors };
    }

    // Check if actions is array
    if (!Array.isArray(actions)) {
      errors.push('Flow actions must be an array');
      return { isValid: false, errors };
    }

    // Check minimum actions
    if (actions.length === 0) {
      errors.push('Flow must have at least one action');
    }

    // Check maximum actions
    if (actions.length > 50) {
      errors.push('Flow cannot have more than 50 actions');
    }

    // Validate each action
    actions.forEach((action, index) => {
      const actionErrors = this.validateAction(action, index);
      errors.push(...actionErrors.errors);
    });

    // Check for circular dependencies
    const circularCheck = this.checkCircularDependencies(actions);
    if (!circularCheck.isValid) {
      errors.push(...circularCheck.errors);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Method under test: validateAction
  validateAction(action: any, index: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const actionNum = index + 1;

    // Check if action exists and is object
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      errors.push(`Action ${actionNum} must be an object`);
      return { isValid: false, errors };
    }

    // Check if action has type
    if (!action.type) {
      errors.push(`Action ${actionNum} must have a type`);
      return { isValid: false, errors };
    }

    // Validate action type
    const validTypes = ['command', 'script', 'http', 'delay', "condition", "parallel", 'loop'];
    if (!validTypes.includes(action.type)) {
      errors.push(`Action ${actionNum} type must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validation
    switch (action.type) {
      case 'command':
        this.validateCommandAction(action, actionNum, errors);
        break;
      case 'script':
        this.validateScriptAction(action, actionNum, errors);
        break;
      case 'http':
        this.validateHttpAction(action, actionNum, errors);
        break;
      case 'delay':
        this.validateDelayAction(action, actionNum, errors);
        break;
      case "condition":
        this.validateConditionAction(action, actionNum, errors);
        break;
      case "parallel":
        this.validateParallelAction(action, actionNum, errors);
        break;
      case 'loop':
        this.validateLoopAction(action, actionNum, errors);
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  // Method under test: isValidCronExpression
  isValidCronExpression(expression: string): boolean {
    if (typeof expression !== 'string') {
      return false;
    }

    const trimmed = expression.trim();
    if (trimmed.length === 0) {
      return false;
    }

    // Split into parts
    const parts = trimmed.split(/\s+/);
    
    // Standard cron has 5 parts: minute hour day month dayOfWeek
    // Extended cron can have 6 parts: second minute hour day month dayOfWeek
    if (parts.length !== 5 && parts.length !== 6) {
      return false;
    }

    // Define valid ranges for each field
    const ranges = parts.length === 5 
      ? [
          { min: 0, max: 59 },  // minute
          { min: 0, max: 23 },  // hour
          { min: 1, max: 31 },  // day
          { min: 1, max: 12 },  // month
          { min: 0, max: 7 }    // day of week (0 and 7 are Sunday)
        ]
      : [
          { min: 0, max: 59 },  // second
          { min: 0, max: 59 },  // minute
          { min: 0, max: 23 },  // hour
          { min: 1, max: 31 },  // day
          { min: 1, max: 12 },  // month
          { min: 0, max: 7 }    // day of week
        ];

    // Validate each part
    for (let i = 0; i < parts.length; i++) {
      if (!this.isValidCronField(parts[i], ranges[i])) {
        return false;
      }
    }

    return true;
  }

  // Method under test: validateTriggerChange
  validateTriggerChange(oldTrigger: any, newTrigger: any): { isValid: boolean; error?: string } {
    // Allow changing from manual to any other type
    if (oldTrigger.type === 'manual') {
      return { isValid: true };
    }

    // Allow changing to manual from any type
    if (newTrigger.type === 'manual') {
      return { isValid: true };
    }

    // Restrict certain trigger type changes
    const restrictedChanges = [
      { from: 'time', to: 'file_change', reason: 'Cannot change from scheduled to file-based trigger due to different execution patterns' },
      { from: 'webhook', to: 'time', reason: 'Cannot change from webhook to scheduled trigger due to security implications' },
      { from: 'event', to: 'file_change', reason: 'Cannot change from event-based to file-based trigger due to different monitoring requirements' }
    ];

    const restriction = restrictedChanges.find(r => r.from === oldTrigger.type && r.to === newTrigger.type);
    if (restriction) {
      return { isValid: false, error: restriction.reason };
    }

    // Allow all other trigger changes
    return { isValid: true };
  }

  // Helper methods for trigger validation
  private validateFileChangeTrigger(trigger: any, errors: string[]): void {
    if (!trigger.pattern) {
      errors.push('File change trigger requires a pattern');
    } else if (typeof trigger.pattern !== 'string') {
      errors.push('File change pattern must be a string');
    }

    if (trigger.watchDir && typeof trigger.watchDir !== 'string') {
      errors.push('File change watchDir must be a string');
    }

    if (trigger.recursive !== undefined && typeof trigger.recursive !== 'boolean') {
      errors.push('File change recursive must be a boolean');
    }
  }

  private validateTimeTrigger(trigger: any, errors: string[]): void {
    if (!trigger.schedule) {
      errors.push('Time trigger requires a schedule');
    } else if (!this.isValidCronExpression(trigger.schedule)) {
      errors.push('Time trigger schedule must be a valid cron expression');
    }

    if (trigger.timezone && typeof trigger.timezone !== 'string') {
      errors.push('Time trigger timezone must be a string');
    }
  }

  private validateWebhookTrigger(trigger: any, errors: string[]): void {
    if (!trigger.path) {
      errors.push('Webhook trigger requires a path');
    } else if (!trigger.path.startsWith('/')) {
      errors.push('Webhook path must start with /');
    }

    if (trigger.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(trigger.method)) {
      errors.push('Webhook method must be a valid HTTP method');
    }

    if (trigger.auth && typeof trigger.auth !== 'object') {
      errors.push('Webhook auth must be an object');
    }
  }

  private validateEventTrigger(trigger: any, errors: string[]): void {
    if (!trigger.eventType) {
      errors.push('Event trigger requires an eventType');
    }

    if (trigger.filter && typeof trigger.filter !== 'object') {
      errors.push('Event trigger filter must be an object');
    }
  }

  // Helper methods for action validation
  private validateCommandAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.command || typeof action.command !== 'string') {
      errors.push(`Action ${actionNum} (command) requires a command string`);
    }

    if (action.timeout && (typeof action.timeout !== 'number' || action.timeout <= 0)) {
      errors.push(`Action ${actionNum} (command) timeout must be a positive number`);
    }

    if (action.workingDir && typeof action.workingDir !== 'string') {
      errors.push(`Action ${actionNum} (command) workingDir must be a string`);
    }
  }

  private validateScriptAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.script || typeof action.script !== 'string') {
      errors.push(`Action ${actionNum} (script) requires a script path`);
    }

    if (action.args && !Array.isArray(action.args)) {
      errors.push(`Action ${actionNum} (script) args must be an array`);
    }
  }

  private validateHttpAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.url || typeof action.url !== 'string') {
      errors.push(`Action ${actionNum} (http) requires a URL`);
    } else {
      try {
        new URL(action.url);
      } catch {
        errors.push(`Action ${actionNum} (http) URL is not valid`);
      }
    }

    if (action.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(action.method)) {
      errors.push(`Action ${actionNum} (http) method must be a valid HTTP method`);
    }
  }

  private validateDelayAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.duration || typeof action.duration !== 'number' || action.duration <= 0) {
      errors.push(`Action ${actionNum} (delay) requires a positive duration in milliseconds`);
    }

    if (action.duration > 3600000) { // 1 hour
      errors.push(`Action ${actionNum} (delay) duration cannot exceed 1 hour`);
    }
  }

  private validateConditionAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.condition) {
      errors.push(`Action ${actionNum} (condition) requires a condition`);
    }

    if (!action.trueActions && !action.falseActions) {
      errors.push(`Action ${actionNum} (condition) requires at least one branch (trueActions or falseActions)`);
    }
  }

  private validateParallelAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.actions || !Array.isArray(action.actions) || action.actions.length === 0) {
      errors.push(`Action ${actionNum} (parallel) requires an array of actions`);
    }
  }

  private validateLoopAction(action: any, actionNum: number, errors: string[]): void {
    if (!action.iterations || typeof action.iterations !== 'number' || action.iterations <= 0) {
      errors.push(`Action ${actionNum} (loop) requires a positive number of iterations`);
    }

    if (action.iterations > 1000) {
      errors.push(`Action ${actionNum} (loop) cannot have more than 1000 iterations`);
    }

    if (!action.actions || !Array.isArray(action.actions)) {
      errors.push(`Action ${actionNum} (loop) requires an array of actions`);
    }
  }

  // Helper method to validate cron field
  private isValidCronField(field: string, range: { min: number; max: number }): boolean {
    // Handle wildcards
    if (field === '*') {
      return true;
    }

    // Handle step values (*/5, 1-10/2, etc.)
    if (field.includes('/')) {
      const [rangePart, stepPart] = field.split('/');
      const step = parseInt(stepPart, 10);
      if (isNaN(step) || step <= 0) {
        return false;
      }
      return this.isValidCronField(rangePart, range);
    }

    // Handle ranges (1-5, 10-20, etc.)
    if (field.includes('-')) {
      const [start, end] = field.split('-');
      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);
      if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
        return false;
      }
      return startNum >= range.min && endNum <= range.max;
    }

    // Handle lists (1,3,5,7, etc.)
    if (field.includes(',')) {
      const values = field.split(',');
      return values.every(value => this.isValidCronField(value.trim(), range));
    }

    // Handle single values
    const num = parseInt(field, 10);
    if (isNaN(num)) {
      return false;
    }

    return num >= range.min && num <= range.max;
  }

  // Helper method to check circular dependencies
  private checkCircularDependencies(actions: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Simple check for self-referencing actions
    actions.forEach((action, index) => {
      if (action.nextAction === index) {
        errors.push(`Action ${index + 1} cannot reference itself`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}

describe('FlowValidator Methods Unit Tests', () => {
  let validator: FlowValidator;

  beforeEach(() => {
    validator = new FlowValidator();
  });

  describe('validateName Method', () => {
    test('should accept valid flow names', () => {
      const validNames = [
        'Valid Flow Name',
        'Production-Deployment',
        'backup_script_v2',
        'API.Monitor.Service',
        "Simple123",
        'Test-Flow_1.0'
      ];

      validNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject null or undefined names', () => {
      const result1 = validator.validateName(null);
      const result2 = validator.validateName(undefined);

      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Flow name is required');
      
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Flow name is required');
    });

    test('should reject non-string names', () => {
      const invalidNames = [123, true, [], {}, Symbol('test')];

      invalidNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name must be a string');
      });
    });

    test('should reject empty or whitespace-only names', () => {
      const emptyNames = ['', '   ', '\t\n', '  \t  '];

      emptyNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name cannot be empty');
      });
    });

    test('should reject names that are too short', () => {
      const shortNames = ['a', 'ab', 'X'];

      shortNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name must be at least 3 characters long');
      });
    });

    test('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      const result = validator.validateName(longName);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow name must be 100 characters or less');
    });

    test('should reject names with invalid characters', () => {
      const invalidNames = [
        'Flow@Name',
        'Flow#Name',
        'Flow$Name',
        'Flow%Name',
        'Flow&Name',
        'Flow*Name',
        'Flow(Name)',
        'Flow[Name]',
        'Flow{Name}'
      ];

      invalidNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toMatch(/invalid|characters|allowed/);
      });
    });

    test('should reject names that don\'t start and end with alphanumeric', () => {
      const invalidNames = [
        '-Flow Name',
        'Flow Name-',
        '_Flow Name',
        'Flow Name_',
        '.Flow Name',
        'Flow Name.'
      ];

      invalidNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name must start and end with a letter or number');
      });
    });

    test('should reject reserved names', () => {
      const reservedNames = ['system', 'admin', 'root', 'default', 'test', 'example'];

      reservedNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name is reserved and cannot be used');
      });
    });

    test('should reject names with consecutive special characters', () => {
      const invalidNames = [
        'Flow--Name',
        'Flow  Name',
        'Flow__Name',
        'Flow..Name',
        'Flow-_Name'
      ];

      invalidNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name cannot contain consecutive special characters');
      });
    });

    test('should reject names with inappropriate content', () => {
      const inappropriateNames = [
        'Delete All Files',
        'Remove Everything',
        'Destroy System',
        'Kill Process',
        'Hack Database'
      ];

      inappropriateNames.forEach(name => {
        const result = validator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow name contains inappropriate content');
      });
    });
  });

  describe('validateDescription Method', () => {
    test('should accept valid descriptions', () => {
      const validDescriptions = [
        'This is a valid flow description that explains what the flow does',
        'A comprehensive backup process that runs daily at midnight and archives important files',
        'Automated deployment pipeline for production environments with rollback capabilities'
      ];

      validDescriptions.forEach(description => {
        const result = validator.validateDescription(description);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject null or undefined descriptions', () => {
      const result1 = validator.validateDescription(null);
      const result2 = validator.validateDescription(undefined);

      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Flow description is required');
      
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Flow description is required');
    });

    test('should reject non-string descriptions', () => {
      const invalidDescriptions = [123, true, [], {}];

      invalidDescriptions.forEach(description => {
        const result = validator.validateDescription(description);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow description must be a string');
      });
    });

    test('should reject empty descriptions', () => {
      const emptyDescriptions = ['', '   ', '\t\n'];

      emptyDescriptions.forEach(description => {
        const result = validator.validateDescription(description);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow description cannot be empty');
      });
    });

    test('should reject descriptions that are too short', () => {
      const shortDescriptions = ['Short', 'Too brief', 'Not enough'];

      shortDescriptions.forEach(description => {
        const result = validator.validateDescription(description);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow description must contain at least 3 words');
      });
    });

    test('should reject descriptions that are too long', () => {
      const longDescription = 'a'.repeat(501);
      const result = validator.validateDescription(longDescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow description must be 500 characters or less');
    });

    test('should reject descriptions with repeated characters', () => {
      const repeatedDescription = 'This is aaaaaaaaaa description';
      const result = validator.validateDescription(repeatedDescription);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow description must contain meaningful content');
    });

    test('should reject descriptions with insufficient words', () => {
      const insufficientDescriptions = [
        'Only two',
        'Single',
        'Two words'
      ];

      insufficientDescriptions.forEach(description => {
        const result = validator.validateDescription(description);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow description must contain at least 3 words');
      });
    });

    test('should reject placeholder descriptions', () => {
      const placeholderDescriptions = [
        'Lorem ipsum dolor sit amet',
        'This is a placeholder description',
        'TODO: Add description here',
        'XXX description goes here',
        'test test test description'
      ];

      placeholderDescriptions.forEach(description => {
        const result = validator.validateDescription(description);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow description appears to contain placeholder text');
      });
    });
  });

  describe('validateTrigger Method', () => {
    test('should accept valid manual trigger', () => {
      const trigger = { type: 'manual' };
      const result = validator.validateTrigger(trigger);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept valid file change trigger', () => {
      const trigger = {
        type: 'file_change',
        pattern: '*.txt',
        watchDir: '/home/user/docs',
        recursive: true
      };
      const result = validator.validateTrigger(trigger);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept valid time trigger', () => {
      const trigger = {
        type: 'time',
        schedule: '0 9 * * 1-5',
        timezone: 'UTC'
      };
      const result = validator.validateTrigger(trigger);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept valid webhook trigger', () => {
      const trigger = {
        type: 'webhook',
        path: '/api/webhook',
        method: 'POST',
        auth: { type: 'bearer' }
      };
      const result = validator.validateTrigger(trigger);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject null or undefined trigger', () => {
      const result1 = validator.validateTrigger(null);
      const result2 = validator.validateTrigger(undefined);

      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Flow trigger is required');
      
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Flow trigger is required');
    });

    test('should reject non-object triggers', () => {
      const invalidTriggers = ['string', 123, true, []];

      invalidTriggers.forEach(trigger => {
        const result = validator.validateTrigger(trigger);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow trigger must be an object');
      });
    });

    test('should reject triggers without type', () => {
      const trigger = { pattern: '*.txt' };
      const result = validator.validateTrigger(trigger);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trigger type is required');
    });

    test('should reject invalid trigger types', () => {
      const trigger = { type: 'invalid_type' };
      const result = validator.validateTrigger(trigger);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Trigger type must be one of: manual, file_change, time, webhook, event');
    });

    test('should validate file change trigger requirements', () => {
      const invalidTrigger = { type: 'file_change' };
      const result = validator.validateTrigger(invalidTrigger);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File change trigger requires a pattern');
    });

    test('should validate time trigger requirements', () => {
      const invalidTrigger = { type: 'time' };
      const result = validator.validateTrigger(invalidTrigger);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time trigger requires a schedule');
    });

    test('should validate webhook trigger requirements', () => {
      const invalidTrigger = { type: 'webhook' };
      const result = validator.validateTrigger(invalidTrigger);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Webhook trigger requires a path');
    });
  });

  describe('validateActions Method', () => {
    test('should accept valid actions array', () => {
      const actions = [
        { type: 'command', command: 'ls -la' },
        { type: 'delay', duration: 1000 },
        { type: 'http', url: 'https://api.example.com' }
      ];
      const result = validator.validateActions(actions);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject null or undefined actions', () => {
      const result1 = validator.validateActions(null);
      const result2 = validator.validateActions(undefined);

      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Flow actions are required');
      
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Flow actions are required');
    });

    test('should reject non-array actions', () => {
      const invalidActions = ['string', 123, true, {}];

      invalidActions.forEach(actions => {
        const result = validator.validateActions(actions);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Flow actions must be an array');
      });
    });

    test('should reject empty actions array', () => {
      const result = validator.validateActions([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow must have at least one action');
    });

    test('should reject too many actions', () => {
      const tooManyActions = Array(51).fill({ type: 'delay', duration: 100 });
      const result = validator.validateActions(tooManyActions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow cannot have more than 50 actions');
    });
  });

  describe('isValidCronExpression Method', () => {
    test('should accept valid 5-part cron expressions', () => {
      const validExpressions = [
        '0 9 * * 1-5',
        '*/15 * * * *',
        '0 0,12 * * *',
        '0 9-17 * * 1-5',
        '30 8 1 * *'
      ];

      validExpressions.forEach(expression => {
        expect(validator.isValidCronExpression(expression)).toBe(true);
      });
    });

    test('should accept valid 6-part cron expressions', () => {
      const validExpressions = [
        '0 0 9 * * 1-5',
        '*/30 */15 * * * *',
        '0 0 0,12 * * *'
      ];

      validExpressions.forEach(expression => {
        expect(validator.isValidCronExpression(expression)).toBe(true);
      });
    });

    test('should reject invalid cron expressions', () => {
      const invalidExpressions = [
        '',
        '0 9 * *', // Too few parts
        '0 9 * * * * *', // Too many parts
        '60 9 * * *', // Invalid minute
        '0 25 * * *', // Invalid hour
        '0 9 32 * *', // Invalid day
        '0 9 * 13 *', // Invalid month
        '0 9 * * 8' // Invalid day of week
      ];

      invalidExpressions.forEach(expression => {
        expect(validator.isValidCronExpression(expression)).toBe(false);
      });
    });

    test('should reject non-string expressions', () => {
      const nonStrings = [123, true, null, undefined, [], {}];

      nonStrings.forEach(expression => {
        expect(validator.isValidCronExpression(expression as any)).toBe(false);
      });
    });
  });

  describe('validateTriggerChange Method', () => {
    test('should allow changes from manual trigger', () => {
      const oldTrigger = { type: 'manual' };
      const newTriggers = [
        { type: 'time', schedule: '0 9 * * *' },
        { type: 'file_change', pattern: '*.txt' },
        { type: 'webhook', path: '/api/hook' }
      ];

      newTriggers.forEach(newTrigger => {
        const result = validator.validateTriggerChange(oldTrigger, newTrigger);
        expect(result.isValid).toBe(true);
      });
    });

    test('should allow changes to manual trigger', () => {
      const oldTriggers = [
        { type: 'time', schedule: '0 9 * * *' },
        { type: 'file_change', pattern: '*.txt' },
        { type: 'webhook', path: '/api/hook' }
      ];
      const newTrigger = { type: 'manual' };

      oldTriggers.forEach(oldTrigger => {
        const result = validator.validateTriggerChange(oldTrigger, newTrigger);
        expect(result.isValid).toBe(true);
      });
    });

    test('should restrict certain trigger changes', () => {
      const restrictedChanges = [
        { from: { type: 'time' }, to: { type: 'file_change' } },
        { from: { type: 'webhook' }, to: { type: 'time' } },
        { from: { type: 'event' }, to: { type: 'file_change' } }
      ];

      restrictedChanges.forEach(({ from, to }) => {
        const result = validator.validateTriggerChange(from, to);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should allow other trigger changes', () => {
      const allowedChanges = [
        { from: { type: 'file_change' }, to: { type: 'time' } },
        { from: { type: 'time' }, to: { type: 'webhook' } },
        { from: { type: 'webhook' }, to: { type: 'file_change' } }
      ];

      allowedChanges.forEach(({ from, to }) => {
        const result = validator.validateTriggerChange(from, to);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should validate In Progress flow configuration', () => {
      const flowConfig = {
        name: 'Production Deployment',
        description: 'Automated deployment process for production environment with comprehensive testing and rollback capabilities',
        trigger: {
          type: 'time',
          schedule: '0 2 * * 0',
          timezone: 'UTC'
        },
        actions: [
          { type: 'command', command: 'npm run build', timeout: 300000 },
          { type: 'http', url: 'https://api.example.com/deploy', method: 'POST' },
          { type: 'delay', duration: 5000 },
          { type: 'script', script: '/scripts/verify-deployment.sh', args: ["production"] }
        ]
      };

      const nameResult = validator.validateName(flowConfig.name);
      const descResult = validator.validateDescription(flowConfig.description);
      const triggerResult = validator.validateTrigger(flowConfig.trigger);
      const actionsResult = validator.validateActions(flowConfig.actions);

      expect(nameResult.isValid).toBe(true);
      expect(descResult.isValid).toBe(true);
      expect(triggerResult.isValid).toBe(true);
      expect(actionsResult.isValid).toBe(true);
    });

    test('should collect all validation errors', () => {
      const invalidConfig = {
        name: 'x', // Too short
        description: 'short', // Too short and not enough words
        trigger: { type: 'invalid' }, // Invalid type
        actions: [
          { type: 'command' }, // Missing command
          { type: 'http' }, // Missing URL
          { type: 'delay' } // Missing duration
        ]
      };

      const nameResult = validator.validateName(invalidConfig.name);
      const descResult = validator.validateDescription(invalidConfig.description);
      const triggerResult = validator.validateTrigger(invalidConfig.trigger);
      const actionsResult = validator.validateActions(invalidConfig.actions);

      expect(nameResult.isValid).toBe(false);
      expect(descResult.isValid).toBe(false);
      expect(triggerResult.isValid).toBe(false);
      expect(actionsResult.isValid).toBe(false);

      const allErrors = [
        ...nameResult.errors,
        ...descResult.errors,
        ...triggerResult.errors,
        ...actionsResult.errors
      ];

      expect(allErrors.length).toBeGreaterThan(5);
    });
  });
});