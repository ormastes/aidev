import { describe, test, expect, jest } from '@jest/globals';
import { TaskManager } from '../../src/domain/task-manager';

// Create a helper class that exposes the private validateInput method for testing
class TaskManagerValidator {
  private taskManager: any;

  constructor() {
    // Create a minimal TaskManager instance to access its validateInput method
    const mockStorage = { 
      save: jest.fn(), 
      findById: jest.fn(), 
      findAll: jest.fn(), 
      update: jest.fn(), 
      delete: jest.fn() 
    };
    const mockLogger = { log: jest.fn() };
    this.taskManager = new TaskManager(mockStorage as any, mockLogger as any);
  }

  static validateInput(title: string, description: string): { isValid: boolean; error?: string } {
    const validator = new TaskManagerValidator();
    // Access the private method through the prototype
    return validator.taskManager.validateInput(title, description);
  }
}

describe('TaskManager.validateInput() Unit Test', () => {
  test('should validate correct title and description', () => {
    // Arrange
    const title = 'Valid Task Title';
    const description = 'This is a valid task description that provides clear information about what needs to be In Progress.';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject null title', () => {
    // Arrange
    const title = null as any;
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title is required');
  });

  test('should reject undefined title', () => {
    // Arrange
    const title = undefined as any;
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title is required');
  });

  test('should reject empty string title', () => {
    // Arrange
    const title = '';
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title cannot be empty or whitespace only');
  });

  test('should reject whitespace-only title', () => {
    // Arrange
    const title = '   \t\n  ';
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title cannot be empty or whitespace only');
  });

  test('should reject non-string title', () => {
    // Arrange
    const title = 123 as any;
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title must be a string');
  });

  test('should reject title longer than 100 characters', () => {
    // Arrange
    const title = 'a'.repeat(101);
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Title must be 100 characters or less');
  });

  test('should accept title with exactly 100 characters', () => {
    // Arrange
    const title = 'a'.repeat(100);
    const description = 'Valid description';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject null description', () => {
    // Arrange
    const title = 'Valid title';
    const description = null as any;

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description is required');
  });

  test('should reject undefined description', () => {
    // Arrange
    const title = 'Valid title';
    const description = undefined as any;

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description is required');
  });

  test('should reject empty string description', () => {
    // Arrange
    const title = 'Valid title';
    const description = '';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description cannot be empty or whitespace only');
  });

  test('should reject whitespace-only description', () => {
    // Arrange
    const title = 'Valid title';
    const description = '   \t\n  ';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description cannot be empty or whitespace only');
  });

  test('should reject non-string description', () => {
    // Arrange
    const title = 'Valid title';
    const description = { text: 'description' } as any;

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description must be a string');
  });

  test('should reject description longer than 500 characters', () => {
    // Arrange
    const title = 'Valid title';
    const description = 'a'.repeat(501);

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Description must be 500 characters or less');
  });

  test('should accept description with exactly 500 characters', () => {
    // Arrange
    const title = 'Valid title';
    const description = 'a'.repeat(500);

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject title with forbidden characters', () => {
    // Arrange
    const testCases = [
      { title: 'Title with <tag>', expected: 'Title contains forbidden characters' },
      { title: 'Title with >tag', expected: 'Title contains forbidden characters' },
      { title: 'Title with {brace}', expected: 'Title contains forbidden characters' },
      { title: 'Title with }brace', expected: 'Title contains forbidden characters' }
    ];

    testCases.forEach(({ title, expected }) => {
      // Act
      const result = TaskManagerValidator.validateInput(title, 'Valid description');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(expected);
    });
  });

  test('should reject description with forbidden characters', () => {
    // Arrange
    const testCases = [
      { description: 'Description with <tag>', expected: 'Description contains forbidden characters' },
      { description: 'Description with >tag', expected: 'Description contains forbidden characters' },
      { description: 'Description with {brace}', expected: 'Description contains forbidden characters' },
      { description: 'Description with }brace', expected: 'Description contains forbidden characters' }
    ];

    testCases.forEach(({ description, expected }) => {
      // Act
      const result = TaskManagerValidator.validateInput('Valid title', description);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(expected);
    });
  });

  test('should accept title and description with allowed special characters', () => {
    // Arrange
    const title = 'Task: Review & Update (Phase 1) - Priority #1';
    const description = 'In Progress review of the system & update documentation. Include @mentions and %progress indicators!';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should handle edge case with minimum valid length', () => {
    // Arrange
    const title = 'A'; // Minimum 1 character after trim
    const description = 'B'; // Minimum 1 character after trim

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should handle unicode characters correctly', () => {
    // Arrange
    const title = 'Task with émojis 🚀 and ñiño characters';
    const description = 'Description with various unicode: café, naïve, Zürich, 北京';

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should handle mixed whitespace correctly', () => {
    // Arrange
    const title = '  Valid Title  '; // Leading/trailing whitespace
    const description = '  Valid Description  '; // Leading/trailing whitespace

    // Act
    const result = TaskManagerValidator.validateInput(title, description);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should validate both parameters independently', () => {
    // Test that validation doesn't short-circuit incorrectly
    
    // Valid title, invalid description
    let result = TaskManagerValidator.validateInput('Valid title', '');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Description');

    // Invalid title, valid description  
    result = TaskManagerValidator.validateInput('', 'Valid description');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Title');

    // Both invalid - should report title error first
    result = TaskManagerValidator.validateInput('', '');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Title');
  });

  test('should maintain consistent error messages', () => {
    // Verify error messages are consistent and helpful
    const testCases = [
      { title: null, description: 'Valid', expectedError: 'Title is required' },
      { title: 123, description: 'Valid', expectedError: 'Title must be a string' },
      { title: '', description: 'Valid', expectedError: 'Title cannot be empty or whitespace only' },
      { title: 'a'.repeat(101), description: 'Valid', expectedError: 'Title must be 100 characters or less' },
      { title: 'Valid', description: null, expectedError: 'Description is required' },
      { title: 'Valid', description: 123, expectedError: 'Description must be a string' },
      { title: 'Valid', description: '', expectedError: 'Description cannot be empty or whitespace only' },
      { title: 'Valid', description: 'a'.repeat(501), expectedError: 'Description must be 500 characters or less' }
    ];

    testCases.forEach(({ title, description, expectedError }) => {
      const result = TaskManagerValidator.validateInput(title as any, description as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(expectedError);
    });
  });
});