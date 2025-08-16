import { describe, test, expect, beforeEach } from '@jest/globals';

// External interfaces
interface FlowManagerInterface {
  updateFlow(flowId: string, updates: any): Promise<{ success: boolean; flow?: any; error?: string }>;
  deleteFlow(flowId: string): Promise<{ success: boolean; error?: string }>;
  toggleFlow(flowId: string, enabled: boolean): Promise<{ success: boolean; flow?: any; error?: string }>;
}

interface FlowStorageInterface {
  findById(flowId: string): Promise<any | null>;
  update(flowId: string, updates: any): Promise<any>;
  delete(flowId: string): Promise<void>;
  hasActiveExecutions(flowId: string): Promise<boolean>;
}

interface FlowValidatorInterface {
  validate(flowConfig: any): { isValid: boolean; errors?: string[] };
}

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

  async updateFlow(flowId: string, updates: any): Promise<{ success: boolean; flow?: any; error?: string }> {
    try {
      // Find existing flow
      const existingFlow = await this.storage.findById(flowId);
      if (!existingFlow) {
        return { "success": false, error: 'Flow not found' };
      }

      // Merge updates with existing flow
      const updatedConfig = { ...existingFlow, ...updates, updatedAt: new Date().toISOString() };

      // Validate updated configuration
      const validation = this.validator.validate(updatedConfig);
      if (!validation.isValid) {
        return { "success": false, error: validation.errors?.join(', ') || 'Validation failed' };
      }

      // Log update
      this.logger.log(`Updating flow: ${flowId}`);

      // Update in storage
      const updatedFlow = await this.storage.update(flowId, updatedConfig);

      this.logger.log(`Flow updated: ${flowId}`);

      return { "success": true, flow: updatedFlow };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  async deleteFlow(flowId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find flow
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        return { "success": false, error: 'Flow not found' };
      }

      // Check for active executions
      const hasActive = await this.storage.hasActiveExecutions(flowId);
      if (hasActive) {
        return { "success": false, error: 'Cannot delete flow with active executions' };
      }

      // Log deletion
      this.logger.log(`Deleting flow: ${flowId}`);

      // Delete from storage
      await this.storage.delete(flowId);

      this.logger.log(`Flow deleted: ${flowId}`);

      return { "success": true };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  async toggleFlow(flowId: string, enabled: boolean): Promise<{ success: boolean; flow?: any; error?: string }> {
    try {
      // Find flow
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        return { "success": false, error: 'Flow not found' };
      }

      // Log toggle
      this.logger.log(`Setting flow ${flowId} enabled: ${enabled}`);

      // Update enabled status
      const updatedFlow = await this.storage.update(flowId, { 
        enabled, 
        updatedAt: new Date().toISOString() 
      });

      this.logger.log(`Flow status updated: ${flowId}`);

      return { "success": true, flow: updatedFlow };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }
}

// Test implementations
class TestFlowStorage implements FlowStorageInterface {
  private flows: Map<string, any> = new Map();
  private activeExecutions: Set<string> = new Set();

  async findById(flowId: string): Promise<any | null> {
    return this.flows.get(flowId) || null;
  }

  async update(flowId: string, updates: any): Promise<any> {
    const existing = this.flows.get(flowId);
    if (!existing) {
      throw new Error('Flow not found');
    }
    
    const updated = { ...existing, ...updates };
    this.flows.set(flowId, updated);
    return updated;
  }

  async delete(flowId: string): Promise<void> {
    if (!this.flows.has(flowId)) {
      throw new Error('Flow not found');
    }
    this.flows.delete(flowId);
  }

  async hasActiveExecutions(flowId: string): Promise<boolean> {
    return this.activeExecutions.has(flowId);
  }

  // Helper methods for testing
  setFlow(id: string, flow: any) {
    this.flows.set(id, { ...flow, id });
  }

  setActiveExecution(flowId: string, active: boolean) {
    if (active) {
      this.activeExecutions.add(flowId);
    } else {
      this.activeExecutions.delete(flowId);
    }
  }

  getFlow(id: string) {
    return this.flows.get(id);
  }

  hasFlow(id: string) {
    return this.flows.has(id);
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
    }

    // Validate description
    if (!flowConfig.description || typeof flowConfig.description !== 'string') {
      errors.push('Flow description is required and must be a string');
    }

    // Validate actions
    if (!Array.isArray(flowConfig.actions)) {
      errors.push('Flow actions must be an array');
    } else if (flowConfig.actions.length === 0) {
      errors.push('Flow must have at least one action');
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

describe('FlowManager Update/Delete Operations External Test', () => {
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

  describe("updateFlow", () => {
    test('should update flow In Progress', async () => {
      // Arrange
      const originalFlow = {
        name: 'Original Flow',
        description: 'Original description',
        enabled: true,
        actions: [{ type: 'command', command: 'echo "original"' }]
      };
      storage.setFlow('flow-1', originalFlow);

      const updates = {
        name: 'Updated Flow',
        description: 'Updated description'
      };

      // Act
      const result = await flowManager.updateFlow('flow-1', updates);

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.name).toBe('Updated Flow');
      expect(result.flow?.description).toBe('Updated description');
      expect(result.flow?.enabled).toBe(true); // Should preserve existing values
      expect(result.flow?.updatedAt).toBeDefined();
      expect(result.error).toBeUndefined();

      // Verify logs
      expect(logger.logs).toContain(expect.stringContaining('Updating flow: flow-1'));
      expect(logger.logs).toContain(expect.stringContaining('Flow updated: flow-1'));
    });

    test('should fail to update non-existent flow', async () => {
      // Act
      const result = await flowManager.updateFlow('non-existent', { name: 'New Name' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flow not found');
      expect(result.flow).toBeUndefined();
    });

    test('should validate updated configuration', async () => {
      // Arrange
      const originalFlow = {
        name: 'Original Flow',
        description: 'Original description',
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-2', originalFlow);

      const invalidUpdates = {
        name: '', // Invalid empty name
        actions: [] // Invalid empty actions
      };

      // Act
      const result = await flowManager.updateFlow('flow-2', invalidUpdates);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Flow name cannot be empty');
      expect(result.error).toContain('Flow must have at least one action');
    });

    test('should preserve fields not being updated', async () => {
      // Arrange
      const originalFlow = {
        name: 'Original Flow',
        description: 'Original description',
        enabled: false,
        actions: [{ type: 'command' }],
        createdAt: '2023-01-01T00:00:00Z',
        customField: 'custom value'
      };
      storage.setFlow('flow-3', originalFlow);

      const updates = {
        description: 'New description'
      };

      // Act
      const result = await flowManager.updateFlow('flow-3', updates);

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.name).toBe('Original Flow'); // Preserved
      expect(result.flow?.description).toBe('New description'); // Updated
      expect(result.flow?.enabled).toBe(false); // Preserved
      expect(result.flow?.createdAt).toBe('2023-01-01T00:00:00Z'); // Preserved
      expect(result.flow?.customField).toBe('custom value'); // Preserved
    });

    test('should update multiple fields at once', async () => {
      // Arrange
      const originalFlow = {
        name: 'Original Flow',
        description: 'Original description',
        enabled: true,
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-4', originalFlow);

      const updates = {
        name: 'Multi-Update Flow',
        description: 'Multi-updated description',
        enabled: false,
        actions: [
          { type: 'command', command: 'echo "step 1"' },
          { type: 'script', script: 'test.sh' }
        ]
      };

      // Act
      const result = await flowManager.updateFlow('flow-4', updates);

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.name).toBe('Multi-Update Flow');
      expect(result.flow?.description).toBe('Multi-updated description');
      expect(result.flow?.enabled).toBe(false);
      expect(result.flow?.actions).toHaveLength(2);
    });
  });

  describe("deleteFlow", () => {
    test('should delete flow In Progress', async () => {
      // Arrange
      const flow = {
        name: 'Flow to Delete',
        description: 'This flow will be deleted',
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-5', flow);

      // Act
      const result = await flowManager.deleteFlow('flow-5');

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify flow was deleted
      expect(storage.hasFlow('flow-5')).toBe(false);

      // Verify logs
      expect(logger.logs).toContain(expect.stringContaining('Deleting flow: flow-5'));
      expect(logger.logs).toContain(expect.stringContaining('Flow deleted: flow-5'));
    });

    test('should fail to delete non-existent flow', async () => {
      // Act
      const result = await flowManager.deleteFlow('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flow not found');
    });

    test('should fail to delete flow with active executions', async () => {
      // Arrange
      const flow = {
        name: 'Active Flow',
        description: 'Flow with active executions',
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-6', flow);
      storage.setActiveExecution('flow-6', true);

      // Act
      const result = await flowManager.deleteFlow('flow-6');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete flow with active executions');

      // Verify flow was not deleted
      expect(storage.hasFlow('flow-6')).toBe(true);
    });

    test('should delete flow when no active executions', async () => {
      // Arrange
      const flow = {
        name: 'Inactive Flow',
        description: 'Flow without active executions',
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-7', flow);
      storage.setActiveExecution('flow-7', false);

      // Act
      const result = await flowManager.deleteFlow('flow-7');

      // Assert
      expect(result.success).toBe(true);
      expect(storage.hasFlow('flow-7')).toBe(false);
    });
  });

  describe("toggleFlow", () => {
    test('should enable flow', async () => {
      // Arrange
      const flow = {
        name: 'Disabled Flow',
        description: 'Initially disabled flow',
        enabled: false,
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-8', flow);

      // Act
      const result = await flowManager.toggleFlow('flow-8', true);

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.enabled).toBe(true);
      expect(result.flow?.updatedAt).toBeDefined();

      // Verify logs
      expect(logger.logs).toContain(expect.stringContaining('Setting flow flow-8 enabled: true'));
      expect(logger.logs).toContain(expect.stringContaining('Flow status updated: flow-8'));
    });

    test('should disable flow', async () => {
      // Arrange
      const flow = {
        name: 'Enabled Flow',
        description: 'Initially enabled flow',
        enabled: true,
        actions: [{ type: 'command' }]
      };
      storage.setFlow('flow-9', flow);

      // Act
      const result = await flowManager.toggleFlow('flow-9', false);

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.enabled).toBe(false);
      expect(result.flow?.updatedAt).toBeDefined();

      // Verify logs
      expect(logger.logs).toContain(expect.stringContaining('Setting flow flow-9 enabled: false'));
    });

    test('should fail to toggle non-existent flow', async () => {
      // Act
      const result = await flowManager.toggleFlow('non-existent', true);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flow not found');
      expect(result.flow).toBeUndefined();
    });

    test('should preserve other fields when toggling', async () => {
      // Arrange
      const flow = {
        name: 'Toggle Flow',
        description: 'Flow for toggle test',
        enabled: true,
        actions: [{ type: 'command' }],
        customField: 'should be preserved'
      };
      storage.setFlow('flow-10', flow);

      // Act
      const result = await flowManager.toggleFlow('flow-10', false);

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.name).toBe('Toggle Flow');
      expect(result.flow?.description).toBe('Flow for toggle test');
      expect(result.flow?.enabled).toBe(false);
      expect(result.flow?.customField).toBe('should be preserved');
    });
  });

  describe('error handling', () => {
    test('should handle storage errors during update', async () => {
      // Arrange
      const flow = { name: 'Test', description: 'Test', actions: [{ type: 'command' }] };
      storage.setFlow('flow-11', flow);

      // Mock storage error
      const originalUpdate = storage.update;
      storage.update = async () => {
        throw new Error('Storage error');
      };

      // Act
      const result = await flowManager.updateFlow('flow-11', { name: 'New Name' });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');

      // Restore original method
      storage.update = originalUpdate;
    });

    test('should handle storage errors during delete', async () => {
      // Arrange
      const flow = { name: 'Test', description: 'Test', actions: [{ type: 'command' }] };
      storage.setFlow('flow-12', flow);

      // Mock storage error
      const originalDelete = storage.delete;
      storage.delete = async () => {
        throw new Error('Delete error');
      };

      // Act
      const result = await flowManager.deleteFlow('flow-12');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete error');

      // Restore original method
      storage.delete = originalDelete;
    });
  });
});