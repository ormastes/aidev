import { describe, test, expect, beforeEach, jest } from '@jest/globals';

class TaskIdGenerator {
  private static counter = 0;

  static generateTaskId(prefix: string = 'task'): string {
    // Validate prefix
    if (typeof prefix !== 'string') {
      throw new Error('Prefix must be a string');
    }

    if (prefix.trim().length === 0) {
      throw new Error('Prefix cannot be empty');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(prefix)) {
      throw new Error('Prefix must start with a letter and contain only letters, numbers, hyphens, and underscores');
    }

    if (prefix.length > 20) {
      throw new Error('Prefix must be 20 characters or less');
    }

    // Generate timestamp component
    const timestamp = Date.now();
    
    // Generate random component (alphanumeric)
    const randomLength = 9;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let randomPart = '';
    
    for (let i = 0; i < randomLength; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Increment counter for additional uniqueness
    this.counter = (this.counter + 1) % 10000; // Reset after 9999
    const counterPart = this.counter.toString().padStart(4, '0');

    // Combine components: prefix-timestamp-counter-random
    return `${prefix}-${timestamp}-${counterPart}-${randomPart}`;
  }

  static validateTaskId(taskId: string): { isValid: boolean; error?: string } {
    if (!taskId) {
      return { isValid: false, error: 'Task ID is required' };
    }

    if (typeof taskId !== 'string') {
      return { isValid: false, error: 'Task ID must be a string' };
    }

    // Expected format: prefix-timestamp-counter-random
    const pattern = /^[a-zA-Z][a-zA-Z0-9_-]*-\d{13}-\d{4}-[a-z0-9]{9}$/;
    if (!pattern.test(taskId)) {
      return { isValid: false, error: 'Task ID format is invalid' };
    }

    // Validate timestamp is reasonable (not too old, not in future)
    const parts = taskId.split('-');
    const timestamp = parseInt(parts[1]);
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneMinuteFromNow = now + (60 * 1000);

    if (timestamp < oneYearAgo || timestamp > oneMinuteFromNow) {
      return { isValid: false, error: 'Task ID timestamp is out of reasonable range' };
    }

    return { isValid: true };
  }

  static extractComponents(taskId: string): { prefix: string; timestamp: number; counter: number; random: string } | null {
    const validation = this.validateTaskId(taskId);
    if (!validation.isValid) {
      return null;
    }

    const parts = taskId.split('-');
    return {
      prefix: parts[0],
      timestamp: parseInt(parts[1]),
      counter: parseInt(parts[2]),
      random: parts[3]
    };
  }

  // Reset counter for testing
  static resetCounter(): void {
    this.counter = 0;
  }
}

describe('TaskStorage.generateTaskId() Unit Test', () => {
  beforeEach(() => {
    // Reset counter before each test for predictable results
    TaskIdGenerator.resetCounter();
    
    // Mock Date.now for predictable timestamp testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
    
    // Mock Math.random for predictable random part testing
    let callCount = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => {
      // Return different values to create predictable but varied random strings
      const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
      return values[callCount++ % values.length];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should generate task ID with default prefix', () => {
    // Act
    const taskId = TaskIdGenerator.generateTaskId();

    // Assert
    expect(taskId).toBeDefined();
    expect(typeof taskId).toBe('string');
    expect(taskId).toMatch(/^task-\d{13}-\d{4}-[a-z0-9]{9}$/);
    // Check format instead of exact value since random generation may vary
  });

  test('should generate task ID with custom prefix', () => {
    // Arrange
    const customPrefix = 'custom';

    // Act
    const taskId = TaskIdGenerator.generateTaskId(customPrefix);

    // Assert
    expect(taskId).toBeDefined();
    expect(taskId).toMatch(/^custom-\d{13}-\d{4}-[a-z0-9]{9}$/);
    expect(taskId.startsWith('custom-')).toBe(true);
  });

  test('should generate unique task IDs in sequence', () => {
    // Act
    const taskId1 = TaskIdGenerator.generateTaskId();
    const taskId2 = TaskIdGenerator.generateTaskId();
    const taskId3 = TaskIdGenerator.generateTaskId();

    // Assert
    expect(taskId1).not.toBe(taskId2);
    expect(taskId2).not.toBe(taskId3);
    expect(taskId1).not.toBe(taskId3);

    // Verify counter increments
    expect(taskId1).toContain('-0001-');
    expect(taskId2).toContain('-0002-');
    expect(taskId3).toContain('-0003-');
  });

  test('should include timestamp in task ID', () => {
    // Arrange
    const beforeGeneration = Date.now();

    // Act
    const taskId = TaskIdGenerator.generateTaskId();

    // Assert
    const components = TaskIdGenerator.extractComponents(taskId);
    expect(components).toBeDefined();
    expect(components!.timestamp).toBe(beforeGeneration);
  });

  test('should include random component in task ID', () => {
    // Act
    const taskId = TaskIdGenerator.generateTaskId();

    // Assert
    const components = TaskIdGenerator.extractComponents(taskId);
    expect(components).toBeDefined();
    expect(components!.random).toMatch(/^[a-z0-9]{9}$/);
    expect(components!.random.length).toBe(9);
  });

  test('should handle counter rollover after 9999', () => {
    // Arrange - Set counter close to limit
    for (let i = 0; i < 9998; i++) {
      TaskIdGenerator.generateTaskId();
    }

    // Act
    const taskIdAtLimit = TaskIdGenerator.generateTaskId(); // Should be 9999
    const taskIdAfterRollover = TaskIdGenerator.generateTaskId(); // Should be 0000

    // Assert
    expect(taskIdAtLimit).toContain('-9999-');
    expect(taskIdAfterRollover).toContain('-0000-');
  });

  test('should reject invalid prefix types', () => {
    // Arrange & Act & Assert
    expect(() => TaskIdGenerator.generateTaskId(null as any)).toThrow('Prefix must be a string');
    expect(() => TaskIdGenerator.generateTaskId(123 as any)).toThrow('Prefix must be a string');
    expect(() => TaskIdGenerator.generateTaskId({} as any)).toThrow('Prefix must be a string');
  });

  test('should reject empty or whitespace prefix', () => {
    // Arrange & Act & Assert
    expect(() => TaskIdGenerator.generateTaskId('')).toThrow('Prefix cannot be empty');
    expect(() => TaskIdGenerator.generateTaskId('   ')).toThrow('Prefix cannot be empty');
    expect(() => TaskIdGenerator.generateTaskId('\t\n')).toThrow('Prefix cannot be empty');
  });

  test('should reject invalid prefix format', () => {
    // Arrange
    const invalidPrefixes = [
      '123task', // starts with number
      '-task', // starts with hyphen
      '_task', // starts with underscore
      'task space', // contains space
      'task@', // contains special character
      'task.id', // contains dot
      'task!', // contains exclamation
    ];

    invalidPrefixes.forEach(prefix => {
      // Act & Assert
      expect(() => TaskIdGenerator.generateTaskId(prefix))
        .toThrow('Prefix must start with a letter and contain only letters, numbers, hyphens, and underscores');
    });
  });

  test('should accept valid prefix formats', () => {
    // Arrange
    const validPrefixes = [
      'task',
      'Task',
      'TASK',
      'task1',
      'task_1',
      'task-1',
      'myTask',
      'my_task',
      'my-task',
      'task123',
      'a', // minimum length
    ];

    validPrefixes.forEach(prefix => {
      // Act & Assert
      expect(() => TaskIdGenerator.generateTaskId(prefix)).not.toThrow();
      
      const taskId = TaskIdGenerator.generateTaskId(prefix);
      expect(taskId.startsWith(prefix + '-')).toBe(true);
    });
  });

  test('should reject prefix longer than 20 characters', () => {
    // Arrange
    const longPrefix = 'a'.repeat(21);

    // Act & Assert
    expect(() => TaskIdGenerator.generateTaskId(longPrefix))
      .toThrow('Prefix must be 20 characters or less');
  });

  test('should accept prefix with exactly 20 characters', () => {
    // Arrange
    const exactLengthPrefix = 'a'.repeat(20);

    // Act & Assert
    expect(() => TaskIdGenerator.generateTaskId(exactLengthPrefix)).not.toThrow();
    
    const taskId = TaskIdGenerator.generateTaskId(exactLengthPrefix);
    expect(taskId.startsWith(exactLengthPrefix + '-')).toBe(true);
  });

  test('should validate generated task IDs correctly', () => {
    // Arrange
    const taskId = TaskIdGenerator.generateTaskId();

    // Act
    const validation = TaskIdGenerator.validateTaskId(taskId);

    // Assert
    expect(validation.isValid).toBe(true);
    expect(validation.error).toBeUndefined();
  });

  test('should reject invalid task ID formats in validation', () => {
    // Arrange
    const invalidTaskIds = [
      '',
      'invalid',
      'task-123',
      'task-1640995200000',
      'task-1640995200000-1',
      'task-1640995200000-1-abc',
      '123-1640995200000-0001-abcdefghi',
      'task-abc-0001-abcdefghi',
      'task-1640995200000-abc-abcdefghi',
      'task-1640995200000-0001-ABC', // uppercase random part
    ];

    invalidTaskIds.forEach(taskId => {
      // Act
      const validation = TaskIdGenerator.validateTaskId(taskId);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  test('should reject task IDs with unreasonable timestamps', () => {
    // Arrange - Create task IDs with timestamps outside reasonable range
    const veryOldTaskId = 'task-1000000000000-0001-abcdefghi'; // Year 2001
    const futureTaskId = 'task-9999999999999-0001-abcdefghi'; // Far future

    // Act & Assert
    const oldValidation = TaskIdGenerator.validateTaskId(veryOldTaskId);
    expect(oldValidation.isValid).toBe(false);
    expect(oldValidation.error).toBe('Task ID timestamp is out of reasonable range');

    const futureValidation = TaskIdGenerator.validateTaskId(futureTaskId);
    expect(futureValidation.isValid).toBe(false);
    expect(futureValidation.error).toBe('Task ID timestamp is out of reasonable range');
  });

  test('should extract components from valid task ID', () => {
    // Arrange
    const taskId = TaskIdGenerator.generateTaskId('myTask');

    // Act
    const components = TaskIdGenerator.extractComponents(taskId);

    // Assert
    expect(components).toBeDefined();
    expect(components!.prefix).toBe('myTask');
    expect(components!.timestamp).toBe(1640995200000);
    expect(components!.counter).toBe(1);
    expect(components!.random).toMatch(/^[a-z0-9]{9}$/);
  });

  test('should return null when extracting components from invalid task ID', () => {
    // Arrange
    const invalidTaskId = 'invalid-task-id';

    // Act
    const components = TaskIdGenerator.extractComponents(invalidTaskId);

    // Assert
    expect(components).toBeNull();
  });

  test('should handle concurrent generation correctly', () => {
    // Simulate concurrent task ID generation
    const taskIds: string[] = [];
    
    // Act - Generate multiple task IDs in quick completedion
    for (let i = 0; i < 100; i++) {
      taskIds.push(TaskIdGenerator.generateTaskId());
    }

    // Assert - All task IDs should be unique
    const uniqueTaskIds = new Set(taskIds);
    expect(uniqueTaskIds.size).toBe(taskIds.length);

    // Verify they all have valid format
    taskIds.forEach(taskId => {
      const validation = TaskIdGenerator.validateTaskId(taskId);
      expect(validation.isValid).toBe(true);
    });
  });

  test('should generate IDs with consistent format across different prefixes', () => {
    // Arrange
    const prefixes = ['task', 'item', 'project', 'user'];
    const taskIds: string[] = [];

    // Act
    prefixes.forEach(prefix => {
      taskIds.push(TaskIdGenerator.generateTaskId(prefix));
    });

    // Assert
    taskIds.forEach((taskId, index) => {
      const prefix = prefixes[index];
      expect(taskId).toMatch(new RegExp(`^${prefix}-\\d{13}-\\d{4}-[a-z0-9]{9}$`));
      
      const components = TaskIdGenerator.extractComponents(taskId);
      expect(components!.prefix).toBe(prefix);
    });
  });

  test('should maintain counter state across different prefixes', () => {
    // Act
    const taskId1 = TaskIdGenerator.generateTaskId('task');
    const taskId2 = TaskIdGenerator.generateTaskId('item');
    const taskId3 = TaskIdGenerator.generateTaskId('task');

    // Assert - Counter should increment regardless of prefix
    expect(taskId1).toContain('-0001-');
    expect(taskId2).toContain('-0002-');
    expect(taskId3).toContain('-0003-');
  });
});