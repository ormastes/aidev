import { describe, test, expect } from '@jest/globals';

class TaskStatusValidator {
  private static readonly VALID_STATUSES = ['pending', 'in_progress', 'In Progress'] as const;
  private static readonly TRANSITION_RULES: { [key: string]: string[] } = {
    'pending': ['in_progress', 'In Progress'],
    'in_progress': ['In Progress', 'pending'],
    'In Progress': [] // No transitions allowed from In Progress
  };

  static validateStatusTransition(currentStatus: string, newStatus: string): { isValid: boolean; error?: string } {
    // Validate current status exists
    if (!currentStatus) {
      return { isValid: false, error: 'Current status is required' };
    }

    if (typeof currentStatus !== 'string') {
      return { isValid: false, error: 'Current status must be a string' };
    }

    if (!this.VALID_STATUSES.includes(currentStatus as any)) {
      return { isValid: false, error: `Invalid current status: ${currentStatus}` };
    }

    // Validate new status
    if (!newStatus) {
      return { isValid: false, error: 'New status is required' };
    }

    if (typeof newStatus !== 'string') {
      return { isValid: false, error: 'New status must be a string' };
    }

    if (!this.VALID_STATUSES.includes(newStatus as any)) {
      return { isValid: false, error: `Invalid new status: ${newStatus}` };
    }

    // Check if transition is allowed
    const allowedTransitions = this.TRANSITION_RULES[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      return { 
        isValid: false, 
        error: `Cannot transition from ${currentStatus} to ${newStatus}` 
      };
    }

    // No-op transition (same status)
    if (currentStatus === newStatus) {
      return { isValid: true, error: 'No change - status is already set to this value' };
    }

    return { isValid: true };
  }

  static getValidTransitions(currentStatus: string): string[] {
    if (!currentStatus || !this.VALID_STATUSES.includes(currentStatus as any)) {
      return [];
    }
    return [...this.TRANSITION_RULES[currentStatus]];
  }

  static isValidStatus(status: string): boolean {
    return this.VALID_STATUSES.includes(status as any);
  }
}

describe('TaskManager.validateStatusTransition() Unit Test', () => {
  test('should allow valid transition from pending to in_progress', () => {
    // Arrange
    const currentStatus = 'pending';
    const newStatus = 'in_progress';

    // Act
    const result = TaskStatusValidator.validateStatusTransition(currentStatus, newStatus);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should allow valid transition from pending to complete', () => {
    // Arrange
    const currentStatus = 'pending';
    const newStatus = 'In Progress';

    // Act
    const result = TaskStatusValidator.validateStatusTransition(currentStatus, newStatus);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should allow valid transition from in_progress to complete', () => {
    // Arrange
    const currentStatus = 'in_progress';
    const newStatus = 'In Progress';

    // Act
    const result = TaskStatusValidator.validateStatusTransition(currentStatus, newStatus);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should allow valid transition from in_progress to pending', () => {
    // Arrange
    const currentStatus = 'in_progress';
    const newStatus = 'pending';

    // Act
    const result = TaskStatusValidator.validateStatusTransition(currentStatus, newStatus);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should reject transition from In Progress to any status', () => {
    // Arrange
    const testCases = ['pending', 'in_progress', 'In Progress'];

    testCases.forEach(newStatus => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition('In Progress', newStatus);

      // Assert
      if (newStatus === 'In Progress') {
        // Same status should be valid but with a note
        expect(result.isValid).toBe(true);
        expect(result.error).toBe('No change - status is already set to this value');
      } else {
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(`Cannot transition from In Progress to ${newStatus}`);
      }
    });
  });

  test('should reject transition from pending to invalid status', () => {
    // Arrange
    const currentStatus = 'pending';
    const invalidStatuses = ['invalid', 'cancelled', 'paused', 'archived'];

    invalidStatuses.forEach(newStatus => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition(currentStatus, newStatus);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(`Invalid new status: ${newStatus}`);
    });
  });

  test('should reject transition from invalid current status', () => {
    // Arrange
    const invalidCurrentStatuses = ['invalid', 'cancelled', 'paused', 'archived'];
    const newStatus = 'In Progress';

    invalidCurrentStatuses.forEach(currentStatus => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition(currentStatus, newStatus);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(`Invalid current status: ${currentStatus}`);
    });
  });

  test('should reject null or undefined current status', () => {
    // Arrange & Act & Assert
    let result = TaskStatusValidator.validateStatusTransition(null as any, 'In Progress');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Current status is required');

    result = TaskStatusValidator.validateStatusTransition(undefined as any, 'In Progress');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Current status is required');

    result = TaskStatusValidator.validateStatusTransition('', 'In Progress');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Current status is required');
  });

  test('should reject null or undefined new status', () => {
    // Arrange & Act & Assert
    let result = TaskStatusValidator.validateStatusTransition('pending', null as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New status is required');

    result = TaskStatusValidator.validateStatusTransition('pending', undefined as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New status is required');

    result = TaskStatusValidator.validateStatusTransition('pending', '');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New status is required');
  });

  test('should reject non-string status values', () => {
    // Arrange & Act & Assert
    let result = TaskStatusValidator.validateStatusTransition(123 as any, 'In Progress');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Current status must be a string');

    result = TaskStatusValidator.validateStatusTransition('pending', 123 as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New status must be a string');

    result = TaskStatusValidator.validateStatusTransition({ status: 'pending' } as any, 'In Progress');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Current status must be a string');

    result = TaskStatusValidator.validateStatusTransition('pending', { status: 'In Progress' } as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('New status must be a string');
  });

  test('should handle same status transition with appropriate message', () => {
    // Arrange
    const testCases = ['pending', 'in_progress', 'In Progress'];

    testCases.forEach(status => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition(status, status);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('No change - status is already set to this value');
    });
  });

  test('should provide correct valid transitions for each status', () => {
    // Test pending status transitions
    const pendingTransitions = TaskStatusValidator.getValidTransitions('pending');
    expect(pendingTransitions).toEqual(['in_progress', 'In Progress']);

    // Test in_progress status transitions
    const inProgressTransitions = TaskStatusValidator.getValidTransitions('in_progress');
    expect(inProgressTransitions).toEqual(['In Progress', 'pending']);

    // Test In Progress status transitions
    const completedTransitions = TaskStatusValidator.getValidTransitions('In Progress');
    expect(completedTransitions).toEqual([]);

    // Test invalid status
    const invalidTransitions = TaskStatusValidator.getValidTransitions('invalid');
    expect(invalidTransitions).toEqual([]);
  });

  test('should correctly identify valid status values', () => {
    // Valid statuses
    expect(TaskStatusValidator.isValidStatus('pending')).toBe(true);
    expect(TaskStatusValidator.isValidStatus('in_progress')).toBe(true);
    expect(TaskStatusValidator.isValidStatus('In Progress')).toBe(true);

    // Invalid statuses
    expect(TaskStatusValidator.isValidStatus('invalid')).toBe(false);
    expect(TaskStatusValidator.isValidStatus('cancelled')).toBe(false);
    expect(TaskStatusValidator.isValidStatus('')).toBe(false);
    expect(TaskStatusValidator.isValidStatus(null as any)).toBe(false);
    expect(TaskStatusValidator.isValidStatus(undefined as any)).toBe(false);
  });

  test('should handle case sensitivity correctly', () => {
    // Arrange
    const testCases = [
      { current: 'PENDING', new: 'in_progress', shouldFail: true },
      { current: 'Pending', new: 'in_progress', shouldFail: true },
      { current: 'pending', new: 'IN_PROGRESS', shouldFail: true },
      { current: 'pending', new: 'In_Progress', shouldFail: true }
    ];

    testCases.forEach(({ current, new: newStatus, shouldFail }) => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition(current, newStatus);

      // Assert
      if (shouldFail) {
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      } else {
        expect(result.isValid).toBe(true);
      }
    });
  });

  test('should validate all possible valid transitions comprehensively', () => {
    // Define all valid transitions
    const validTransitions = [
      { from: 'pending', to: 'in_progress' },
      { from: 'pending', to: 'In Progress' },
      { from: 'in_progress', to: 'In Progress' },
      { from: 'in_progress', to: 'pending' }
    ];

    validTransitions.forEach(({ from, to }) => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition(from, to);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('should validate all possible invalid transitions comprehensively', () => {
    // Define all invalid transitions (excluding same-status transitions)
    const invalidTransitions = [
      { from: 'In Progress', to: 'pending' },
      { from: 'In Progress', to: 'in_progress' }
    ];

    invalidTransitions.forEach(({ from, to }) => {
      // Act
      const result = TaskStatusValidator.validateStatusTransition(from, to);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(`Cannot transition from ${from} to ${to}`);
    });
  });

  test('should maintain immutable transition rules', () => {
    // Get transition rules and verify they cannot be modified
    const pendingTransitions = TaskStatusValidator.getValidTransitions('pending');
    const originalLength = pendingTransitions.length;
    
    // Attempt to modify the returned array
    pendingTransitions.push('invalid_status' as any);
    
    // Verify the internal rules are not affected
    const freshTransitions = TaskStatusValidator.getValidTransitions('pending');
    expect(freshTransitions).toHaveLength(originalLength);
    expect(freshTransitions).not.toContain('invalid_status');
  });

  test('should provide consistent error messages across similar validation failures', () => {
    // Test consistent error format for invalid statuses
    const result1 = TaskStatusValidator.validateStatusTransition('invalid_status', 'pending');
    const result2 = TaskStatusValidator.validateStatusTransition('another_invalid', 'pending');
    
    expect(result1.error).toMatch(/^Invalid current status: /);
    expect(result2.error).toMatch(/^Invalid current status: /);

    const result3 = TaskStatusValidator.validateStatusTransition('pending', 'invalid_status');
    const result4 = TaskStatusValidator.validateStatusTransition('pending', 'another_invalid');
    
    expect(result3.error).toMatch(/^Invalid new status: /);
    expect(result4.error).toMatch(/^Invalid new status: /);

    // Test consistent error format for invalid transitions
    const result5 = TaskStatusValidator.validateStatusTransition('In Progress', 'pending');
    const result6 = TaskStatusValidator.validateStatusTransition('In Progress', 'in_progress');
    
    expect(result5.error).toMatch(/^Cannot transition from .+ to .+$/);
    expect(result6.error).toMatch(/^Cannot transition from .+ to .+$/);
  });
});