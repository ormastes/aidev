import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock interfaces for testing FlowManager methods
interface FlowStorageInterface {
  save(flow: any): Promise<string>;
  findById(id: string): Promise<any | null>;
  findAll(filter?: any): Promise<any[]>;
  update(id: string, updates: any): Promise<any>;
  delete(id: string): Promise<void>;
  saveExecution(execution: any): Promise<string>;
}

interface FlowValidatorInterface {
  validate(flowConfig: any): { isValid: boolean; errors?: string[] };
}

interface LoggerInterface {
  log(message: string): void;
}

// FlowManager implementation for unit testing
class FlowManager {
  constructor(
    private storage: FlowStorageInterface,
    private validator: FlowValidatorInterface,
    private logger: LoggerInterface
  ) {}

  // Method under test: createFlowDefinition
  createFlowDefinition(name: string, description: string, trigger: any, actions: any[]): any {
    this.logger.log(`Creating flow definition for: ${name}`);
    
    const flowDefinition = {
      name: name.trim(),
      description: description.trim(),
      trigger: this.normalizeTrigger(trigger),
      actions: this.normalizeActions(actions),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      metadata: {
        actionCount: actions.length,
        triggerType: trigger?.type || 'unknown',
        creator: 'pocketflow-system'
      }
    };

    this.logger.log(`Flow definition created with ${actions.length} actions`);
    return flowDefinition;
  }

  // Method under test: mergeUpdates
  mergeUpdates(existingFlow: any, updates: any): any {
    this.logger.log(`Merging updates for flow: ${existingFlow.id || existingFlow.name}`);
    
    // Don't allow updates to certain protected fields
    const protectedFields = ['id', "createdAt", 'version'];
    const filteredUpdates = { ...updates };
    
    protectedFields.forEach(field => {
      delete filteredUpdates[field];
    });

    // Normalize trigger and actions if they're being updated
    if (filteredUpdates.trigger) {
      filteredUpdates.trigger = this.normalizeTrigger(filteredUpdates.trigger);
    }
    
    if (filteredUpdates.actions) {
      filteredUpdates.actions = this.normalizeActions(filteredUpdates.actions);
      filteredUpdates.metadata = {
        ...existingFlow.metadata,
        actionCount: filteredUpdates.actions.length
      };
    }

    const mergedFlow = {
      ...existingFlow,
      ...filteredUpdates,
      updatedAt: new Date().toISOString(),
      version: (existingFlow.version || 1) + 1
    };

    this.logger.log(`Flow updates merged, new version: ${mergedFlow.version}`);
    return mergedFlow;
  }

  // Method under test: createExecutionRecord
  createExecutionRecord(execution: any, flow: any): any {
    this.logger.log(`Creating execution record for flow: ${flow.name}`);
    
    const executionRecord = {
      id: execution.id || `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      flowId: flow.id,
      flowName: flow.name,
      flowVersion: flow.version || 1,
      startTime: execution.startTime || new Date().toISOString(),
      endTime: execution.endTime || null,
      status: execution.status || 'pending',
      context: execution.context || {},
      results: execution.results || [],
      error: execution.error || null,
      triggeredBy: execution.triggeredBy || 'manual',
      executionMetadata: {
        totalActions: flow.actions?.length || 0,
        completedActions: execution.results?.length || 0,
        duration: execution.endTime && execution.startTime 
          ? new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()
          : null,
        triggerType: flow.trigger?.type || 'unknown'
      },
      createdAt: new Date().toISOString()
    };

    this.logger.log(`Execution record created: ${executionRecord.id}`);
    return executionRecord;
  }

  // Helper method: normalizeTrigger
  private normalizeTrigger(trigger: any): any {
    if (!trigger) {
      return { type: 'manual' };
    }

    const normalized = {
      type: trigger.type || 'manual',
      ...trigger
    };

    // Normalize specific trigger types
    switch (normalized.type) {
      case 'file_change':
        normalized.pattern = normalized.pattern || '*';
        normalized.watchDir = normalized.watchDir || './';
        break;
      case 'time':
        normalized.schedule = normalized.schedule || '0 * * * *';
        break;
      case 'webhook':
        normalized.path = normalized.path || '/webhook';
        normalized.method = normalized.method || 'POST';
        break;
    }

    return normalized;
  }

  // Helper method: normalizeActions
  private normalizeActions(actions: any[]): any[] {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions.map((action, index) => {
      const normalized = {
        id: action.id || `action-${index + 1}`,
        type: action.type || 'command',
        order: index + 1,
        ...action
      };

      // Add default parameters based on action type
      switch (normalized.type) {
        case 'command':
          normalized.timeout = normalized.timeout || 30000;
          normalized.workingDir = normalized.workingDir || './';
          break;
        case 'http':
          normalized.method = normalized.method || 'GET';
          normalized.timeout = normalized.timeout || 10000;
          break;
        case 'delay':
          normalized.duration = Math.max(normalized.duration || 1000, 0);
          break;
        case 'script':
          normalized.timeout = normalized.timeout || 60000;
          normalized.args = normalized.args || [];
          break;
      }

      return normalized;
    });
  }

  // Helper method for testing: validateFlowDefinition
  validateFlowDefinition(flowDefinition: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!flowDefinition.name || flowDefinition.name.trim().length === 0) {
      errors.push('Flow name is required');
    }

    if (!flowDefinition.description || flowDefinition.description.trim().length === 0) {
      errors.push('Flow description is required');
    }

    if (!flowDefinition.trigger) {
      errors.push('Flow trigger is required');
    }

    if (!Array.isArray(flowDefinition.actions) || flowDefinition.actions.length === 0) {
      errors.push('Flow must have at least one action');
    }

    return { isValid: errors.length === 0, errors };
  }
}

describe('FlowManager Methods Unit Tests', () => {
  let flowManager: FlowManager;
  let mockStorage: FlowStorageInterface;
  let mockValidator: FlowValidatorInterface;
  let logs: string[];

  beforeEach(() => {
    logs = [];
    
    mockStorage = {
      save: jest.fn().mockResolvedValue('flow-123'),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      saveExecution: jest.fn().mockResolvedValue('exec-456')
    };

    mockValidator = {
      validate: jest.fn().mockReturnValue({ isValid: true, errors: [] })
    };

    const mockLogger = {
      log: (message: string) => logs.push(message)
    };

    flowManager = new FlowManager(mockStorage, mockValidator, mockLogger);
  });

  describe('createFlowDefinition Method', () => {
    test('should create basic flow definition with required fields', () => {
      // Arrange
      const name = 'Test Flow';
      const description = 'A test flow for unit testing';
      const trigger = { type: 'manual' };
      const actions = [{ type: 'command', command: 'echo "test"' }];

      // Act
      const result = flowManager.createFlowDefinition(name, description, trigger, actions);

      // Assert
      expect(result).toMatchObject({
        name: 'Test Flow',
        description: 'A test flow for unit testing',
        trigger: { type: 'manual' },
        enabled: true,
        version: 1
      });
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.metadata.actionCount).toBe(1);
      expect(result.metadata.triggerType).toBe('manual');
    });

    test('should trim whitespace from name and description', () => {
      // Arrange
      const name = '  Whitespace Flow  ';
      const description = '  Description with spaces  ';
      const trigger = { type: 'manual' };
      const actions = [{ type: 'delay', duration: 1000 }];

      // Act
      const result = flowManager.createFlowDefinition(name, description, trigger, actions);

      // Assert
      expect(result.name).toBe('Whitespace Flow');
      expect(result.description).toBe('Description with spaces');
    });

    test('should normalize trigger configuration', () => {
      // Arrange
      const trigger = { type: 'file_change', pattern: '*.txt' };
      const actions = [{ type: 'command', command: 'process-file' }];

      // Act
      const result = flowManager.createFlowDefinition('File Flow', 'Processes files', trigger, actions);

      // Assert
      expect(result.trigger).toMatchObject({
        type: 'file_change',
        pattern: '*.txt',
        watchDir: './'
      });
      expect(result.metadata.triggerType).toBe('file_change');
    });

    test('should normalize actions with default values', () => {
      // Arrange
      const actions = [
        { type: 'command', command: 'ls' },
        { type: 'http', url: 'https://api.example.com' },
        { type: 'delay', duration: 500 },
        { type: 'script', script: '/path/to/script.sh' }
      ];

      // Act
      const result = flowManager.createFlowDefinition('Multi Action Flow', 'Multiple actions', { type: 'manual' }, actions);

      // Assert
      expect(result.actions).toHaveLength(4);
      
      // Command action
      expect(result.actions[0]).toMatchObject({
        type: 'command',
        command: 'ls',
        timeout: 30000,
        workingDir: './',
        order: 1
      });

      // HTTP action
      expect(result.actions[1]).toMatchObject({
        type: 'http',
        url: 'https://api.example.com',
        method: 'GET',
        timeout: 10000,
        order: 2
      });

      // Delay action
      expect(result.actions[2]).toMatchObject({
        type: 'delay',
        duration: 500,
        order: 3
      });

      // Script action
      expect(result.actions[3]).toMatchObject({
        type: 'script',
        script: '/path/to/script.sh',
        timeout: 60000,
        args: [],
        order: 4
      });
    });

    test('should handle empty or invalid trigger', () => {
      // Arrange
      const actions = [{ type: 'command', command: 'echo "test"' }];

      // Act
      const result1 = flowManager.createFlowDefinition('Flow 1', "Description", null, actions);
      const result2 = flowManager.createFlowDefinition('Flow 2', "Description", undefined, actions);
      const result3 = flowManager.createFlowDefinition('Flow 3', "Description", {}, actions);

      // Assert
      expect(result1.trigger).toEqual({ type: 'manual' });
      expect(result2.trigger).toEqual({ type: 'manual' });
      expect(result3.trigger).toEqual({ type: 'manual' });
    });

    test('should handle empty actions array', () => {
      // Act
      const result = flowManager.createFlowDefinition('Empty Flow', 'No actions', { type: 'manual' }, []);

      // Assert
      expect(result.actions).toEqual([]);
      expect(result.metadata.actionCount).toBe(0);
    });

    test('should log flow definition creation', () => {
      // Act
      flowManager.createFlowDefinition('Logged Flow', 'Test logging', { type: 'manual' }, [{ type: 'delay' }]);

      // Assert
      expect(logs).toContain('Creating flow definition for: Logged Flow');
      expect(logs).toContain('Flow definition created with 1 actions');
    });
  });

  describe('mergeUpdates Method', () => {
    test('should merge basic updates into existing flow', () => {
      // Arrange
      const existingFlow = {
        id: 'flow-123',
        name: 'Original Flow',
        description: 'Original description',
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        enabled: true
      };

      const updates = {
        name: 'Updated Flow',
        description: 'Updated description',
        enabled: false
      };

      // Act
      const result = flowManager.mergeUpdates(existingFlow, updates);

      // Assert
      expect(result).toMatchObject({
        id: 'flow-123',
        name: 'Updated Flow',
        description: 'Updated description',
        enabled: false,
        version: 2,
        createdAt: '2023-01-01T00:00:00.000Z'
      });
      expect(result.updatedAt).toBeDefined();
      expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
    });

    test('should protect certain fields from being updated', () => {
      // Arrange
      const existingFlow = {
        id: 'flow-123',
        name: 'Protected Flow',
        version: 3,
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      const maliciousUpdates = {
        id: 'hacked-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        version: 999,
        name: 'Legitimate Update'
      };

      // Act
      const result = flowManager.mergeUpdates(existingFlow, maliciousUpdates);

      // Assert
      expect(result.id).toBe('flow-123'); // Protected
      expect(result.createdAt).toBe('2023-01-01T00:00:00.000Z'); // Protected
      expect(result.version).toBe(4); // Auto-incremented, not set to 999
      expect(result.name).toBe('Legitimate Update'); // Allowed update
    });

    test('should normalize trigger updates', () => {
      // Arrange
      const existingFlow = {
        id: 'flow-123',
        trigger: { type: 'manual' },
        version: 1
      };

      const updates = {
        trigger: { type: 'time', schedule: '0 */6 * * *' }
      };

      // Act
      const result = flowManager.mergeUpdates(existingFlow, updates);

      // Assert
      expect(result.trigger).toMatchObject({
        type: 'time',
        schedule: '0 */6 * * *'
      });
    });

    test('should normalize and update actions', () => {
      // Arrange
      const existingFlow = {
        id: 'flow-123',
        actions: [{ type: 'command', command: 'old-command' }],
        metadata: { actionCount: 1 },
        version: 1
      };

      const updates = {
        actions: [
          { type: 'http', url: 'https://new-api.com' },
          { type: 'delay', duration: 2000 }
        ]
      };

      // Act
      const result = flowManager.mergeUpdates(existingFlow, updates);

      // Assert
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0]).toMatchObject({
        type: 'http',
        url: 'https://new-api.com',
        method: 'GET',
        timeout: 10000,
        order: 1
      });
      expect(result.metadata.actionCount).toBe(2);
    });

    test('should increment version number', () => {
      // Arrange
      const existingFlow = { version: 5 };
      const updates = { description: 'Minor update' };

      // Act
      const result = flowManager.mergeUpdates(existingFlow, updates);

      // Assert
      expect(result.version).toBe(6);
    });

    test('should handle missing version field', () => {
      // Arrange
      const existingFlow = { name: 'No Version Flow' };
      const updates = { description: 'Added description' };

      // Act
      const result = flowManager.mergeUpdates(existingFlow, updates);

      // Assert
      expect(result.version).toBe(2); // Default 1 + 1
    });

    test('should log merge operations', () => {
      // Arrange
      const existingFlow = { id: 'flow-123', name: 'Test Flow', version: 1 };
      const updates = { description: 'Updated' };

      // Act
      flowManager.mergeUpdates(existingFlow, updates);

      // Assert
      expect(logs).toContain('Merging updates for flow: flow-123');
      expect(logs).toContain('Flow updates merged, new version: 2');
    });
  });

  describe('createExecutionRecord Method', () => {
    test('should create basic execution record', () => {
      // Arrange
      const execution = {
        startTime: '2023-01-01T12:00:00.000Z',
        status: 'running',
        context: { userId: 'user-123' }
      };

      const flow = {
        id: 'flow-456',
        name: 'Test Flow',
        version: 2,
        actions: [{ type: 'command' }, { type: 'delay' }]
      };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(result).toMatchObject({
        flowId: 'flow-456',
        flowName: 'Test Flow',
        flowVersion: 2,
        startTime: '2023-01-01T12:00:00.000Z',
        status: 'running',
        context: { userId: 'user-123' },
        triggeredBy: 'manual'
      });
      expect(result.id).toMatch(/^exec-\d+-[a-z0-9]+$/);
      expect(result.executionMetadata.totalActions).toBe(2);
    });

    test('should generate execution ID when not provided', () => {
      // Arrange
      const execution = { status: 'pending' };
      const flow = { id: 'flow-123', name: 'Test Flow' };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^exec-\d+-[a-z0-9]+$/);
    });

    test('should calculate execution duration when endTime provided', () => {
      // Arrange
      const execution = {
        startTime: '2023-01-01T12:00:00.000Z',
        endTime: '2023-01-01T12:05:30.000Z',
        status: "completed"
      };

      const flow = { id: 'flow-123', name: 'Completed Flow' };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(result.executionMetadata.duration).toBe(330000); // 5.5 minutes in ms
    });

    test('should handle missing execution metadata gracefully', () => {
      // Arrange
      const execution = {}; // Minimal execution data
      const flow = { id: 'flow-123', name: 'Minimal Flow' };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(result.status).toBe('pending');
      expect(result.context).toEqual({});
      expect(result.results).toEqual([]);
      expect(result.error).toBeNull();
      expect(result.startTime).toBeDefined();
      expect(result.executionMetadata.totalActions).toBe(0);
    });

    test('should preserve execution results and error information', () => {
      // Arrange
      const execution = {
        results: [
          { "success": true, output: 'Step 1 completed' },
          { "success": false, error: 'Step 2 failed' }
        ],
        error: 'Execution failed at step 2'
      };

      const flow = { id: 'flow-123', name: 'Failed Flow' };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ "success": true, output: 'Step 1 completed' });
      expect(result.error).toBe('Execution failed at step 2');
      expect(result.executionMetadata.completedActions).toBe(2);
    });

    test('should include trigger information in metadata', () => {
      // Arrange
      const execution = { triggeredBy: 'file_change' };
      const flow = {
        id: 'flow-123',
        name: 'File Triggered Flow',
        trigger: { type: 'file_change', pattern: '*.log' }
      };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(result.triggeredBy).toBe('file_change');
      expect(result.executionMetadata.triggerType).toBe('file_change');
    });

    test('should log execution record creation', () => {
      // Arrange
      const execution = { status: 'pending' };
      const flow = { id: 'flow-123', name: 'Logged Flow' };

      // Act
      const result = flowManager.createExecutionRecord(execution, flow);

      // Assert
      expect(logs).toContain('Creating execution record for flow: Logged Flow');
      expect(logs).toContain(`Execution record created: ${result.id}`);
    });
  });

  describe('Helper Methods', () => {
    test('should validate flow definition correctly', () => {
      // Arrange
      const validFlow = {
        name: 'Valid Flow',
        description: 'A valid flow definition',
        trigger: { type: 'manual' },
        actions: [{ type: 'command', command: 'echo "test"' }]
      };

      const invalidFlow = {
        name: '',
        description: '',
        trigger: null,
        actions: []
      };

      // Act
      const validResult = flowManager.validateFlowDefinition(validFlow);
      const invalidResult = flowManager.validateFlowDefinition(invalidFlow);

      // Assert
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Flow name is required');
      expect(invalidResult.errors).toContain('Flow description is required');
      expect(invalidResult.errors).toContain('Flow trigger is required');
      expect(invalidResult.errors).toContain('Flow must have at least one action');
    });

    test('should normalize different trigger types correctly', () => {
      // Arrange & Act
      const manualTrigger = flowManager["normalizeTrigger"]({ type: 'manual' });
      const fileTrigger = flowManager["normalizeTrigger"]({ type: 'file_change' });
      const timeTrigger = flowManager["normalizeTrigger"]({ type: 'time' });
      const webhookTrigger = flowManager["normalizeTrigger"]({ type: 'webhook' });

      // Assert
      expect(manualTrigger).toEqual({ type: 'manual' });
      expect(fileTrigger).toEqual({ type: 'file_change', pattern: '*', watchDir: './' });
      expect(timeTrigger).toEqual({ type: 'time', schedule: '0 * * * *' });
      expect(webhookTrigger).toEqual({ type: 'webhook', path: '/webhook', method: 'POST' });
    });

    test('should normalize actions with proper ordering and defaults', () => {
      // Arrange
      const actions = [
        { type: 'command', command: 'ls' },
        { type: 'delay' }, // Missing duration
        { type: 'http', url: 'https://api.com', method: 'PUT' }
      ];

      // Act
      const result = flowManager["normalizeActions"](actions);

      // Assert
      expect(result).toHaveLength(3);
      
      expect(result[0]).toMatchObject({
        type: 'command',
        command: 'ls',
        order: 1,
        timeout: 30000
      });

      expect(result[1]).toMatchObject({
        type: 'delay',
        duration: 1000, // Default
        order: 2
      });

      expect(result[2]).toMatchObject({
        type: 'http',
        url: 'https://api.com',
        method: 'PUT', // Preserved
        order: 3,
        timeout: 10000
      });
    });

    test('should handle invalid actions input', () => {
      // Act
      const result1 = flowManager["normalizeActions"](null as any);
      const result2 = flowManager["normalizeActions"](undefined as any);
      const result3 = flowManager["normalizeActions"]('invalid' as any);

      // Assert
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
    });
  });

  describe('Integration Scenarios', () => {
    test('should create In Progress flow workflow', () => {
      // Arrange
      const name = 'Complete Workflow';
      const description = 'End-to-end workflow creation';
      const trigger = { type: 'time', schedule: '0 9 * * 1-5' };
      const actions = [
        { type: 'command', command: 'backup.sh' },
        { type: 'http', url: 'https://notify.example.com', method: 'POST' }
      ];

      // Act
      const flowDefinition = flowManager.createFlowDefinition(name, description, trigger, actions);
      const validation = flowManager.validateFlowDefinition(flowDefinition);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(flowDefinition.name).toBe('Complete Workflow');
      expect(flowDefinition.trigger.schedule).toBe('0 9 * * 1-5');
      expect(flowDefinition.actions).toHaveLength(2);
      expect(flowDefinition.metadata.actionCount).toBe(2);
    });

    test('should handle flow updates and execution tracking', () => {
      // Arrange
      const originalFlow = flowManager.createFlowDefinition(
        'Original Flow',
        'Original description',
        { type: 'manual' },
        [{ type: 'delay', duration: 1000 }]
      );

      const updates = {
        description: 'Updated description',
        actions: [
          { type: 'command', command: 'updated-command' },
          { type: 'delay', duration: 2000 }
        ]
      };

      const execution = {
        startTime: new Date().toISOString(),
        status: 'running',
        results: [{ "success": true, output: 'Command executed' }]
      };

      // Act
      const updatedFlow = flowManager.mergeUpdates(originalFlow, updates);
      const executionRecord = flowManager.createExecutionRecord(execution, updatedFlow);

      // Assert
      expect(updatedFlow.version).toBe(2);
      expect(updatedFlow.actions).toHaveLength(2);
      expect(updatedFlow.metadata.actionCount).toBe(2);
      
      expect(executionRecord.flowVersion).toBe(2);
      expect(executionRecord.executionMetadata.totalActions).toBe(2);
      expect(executionRecord.executionMetadata.completedActions).toBe(1);
    });
  });
});