import { describe, test, expect, beforeEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// External interfaces
interface FlowStorageInterface {
  save(flow: any): Promise<string>;
  findById(flowId: string): Promise<any | null>;
  findAll(filter?: any): Promise<any[]>;
  update(flowId: string, updates: any): Promise<any>;
  delete(flowId: string): Promise<void>;
  saveExecution(execution: any): Promise<string>;
  findExecutions(flowId: string, limit?: number): Promise<any[]>;
  hasActiveExecutions(flowId: string): Promise<boolean>;
  searchFlows(query: string): Promise<any[]>;
  findByTrigger(triggerPattern: string): Promise<any[]>;
}

// Test implementation of FlowStorage
class FlowStorage implements FlowStorageInterface {
  private readonly flowsFile: string;
  private readonly executionsFile: string;
  private idCounter = 0;
  private execCounter = 0;

  constructor(dataDir: string) {
    this.flowsFile = path.join(dataDir, 'flows.json');
    this.executionsFile = path.join(dataDir, 'executions.json');
    this.ensureDirectoryExists(dataDir);
  }

  async save(flow: any): Promise<string> {
    // Validate required fields
    if (!flow.name || !flow.description || !flow.actions) {
      throw new Error('Missing required flow fields');
    }

    // Generate ID if not provided
    const flowId = flow.id || `flow-${++this.idCounter}`;
    
    // Add metadata
    const flowWithMetadata = {
      ...flow,
      id: flowId,
      createdAt: flow.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Load existing flows
    const flows = await this.loadFlows();
    
    // Add new flow
    flows.push(flowWithMetadata);
    
    // Save to file
    await this.saveFlows(flows);
    
    return flowId;
  }

  async findById(flowId: string): Promise<any | null> {
    const flows = await this.loadFlows();
    return flows.find(f => f.id === flowId) || null;
  }

  async findAll(filter?: any): Promise<any[]> {
    let flows = await this.loadFlows();
    
    if (!filter) {
      return flows;
    }

    return flows.filter(flow => {
      if (filter.enabled !== undefined && flow.enabled !== filter.enabled) {
        return false;
      }
      if (filter.name && !flow.name.toLowerCase().includes(filter.name.toLowerCase())) {
        return false;
      }
      if (filter.status) {
        const flowStatus = flow.enabled ? 'enabled' : 'disabled';
        if (flowStatus !== filter.status) {
          return false;
        }
      }
      return true;
    });
  }

  async update(flowId: string, updates: any): Promise<any> {
    const flows = await this.loadFlows();
    const flowIndex = flows.findIndex(f => f.id === flowId);
    
    if (flowIndex === -1) {
      throw new Error('Flow not found');
    }

    // Update flow
    flows[flowIndex] = {
      ...flows[flowIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save changes
    await this.saveFlows(flows);
    
    return flows[flowIndex];
  }

  async delete(flowId: string): Promise<void> {
    const flows = await this.loadFlows();
    const flowIndex = flows.findIndex(f => f.id === flowId);
    
    if (flowIndex === -1) {
      throw new Error('Flow not found');
    }

    // Remove flow
    flows.splice(flowIndex, 1);
    
    // Save changes
    await this.saveFlows(flows);
  }

  async saveExecution(execution: any): Promise<string> {
    const execId = `exec-${++this.execCounter}`;
    const execWithMetadata = {
      ...execution,
      id: execId,
      createdAt: new Date().toISOString()
    };

    // Load existing executions
    const executions = await this.loadExecutions();
    
    // Add new execution
    executions.push(execWithMetadata);
    
    // Save to file
    await this.saveExecutions(executions);
    
    return execId;
  }

  async findExecutions(flowId: string, limit = 10): Promise<any[]> {
    const executions = await this.loadExecutions();
    
    return executions
      .filter(e => e.flowId === flowId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  async hasActiveExecutions(flowId: string): Promise<boolean> {
    const executions = await this.loadExecutions();
    return executions.some(e => e.flowId === flowId && e.status === 'running');
  }

  async searchFlows(query: string): Promise<any[]> {
    const flows = await this.loadFlows();
    const lowerQuery = query.toLowerCase();
    
    return flows.filter(flow => {
      return flow.name.toLowerCase().includes(lowerQuery) ||
             flow.description.toLowerCase().includes(lowerQuery) ||
             flow.actions.some((action: any) => 
               action.type.toLowerCase().includes(lowerQuery) ||
               (action.command && action.command.toLowerCase().includes(lowerQuery))
             );
    });
  }

  async findByTrigger(triggerPattern: string): Promise<any[]> {
    const flows = await this.loadFlows();
    
    return flows.filter(flow => {
      if (!flow.trigger || !flow.enabled) {
        return false;
      }
      
      // Simple pattern matching
      if (flow.trigger.pattern) {
        return flow.trigger.pattern === triggerPattern ||
               triggerPattern.includes(flow.trigger.pattern);
      }
      
      return false;
    });
  }

  private async loadFlows(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.flowsFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.flowsFile, 'utf8');
      if (content.trim() === '') {
        return [];
      }
      
      const flows = JSON.parse(content);
      return Array.isArray(flows) ? flows : [];
    } catch (error) {
      throw new Error('Failed to load flows: ' + (error as Error).message);
    }
  }

  private async saveFlows(flows: any[]): Promise<void> {
    try {
      // Validate flows array
      if (!Array.isArray(flows)) {
        throw new Error('Flows must be an array');
      }

      // Ensure directory exists
      this.ensureDirectoryExists(path.dirname(this.flowsFile));

      // Write atomically
      const tempFile = this.flowsFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(flows, null, 2));
      fs.renameSync(tempFile, this.flowsFile);
    } catch (error) {
      throw new Error('Failed to save flows: ' + (error as Error).message);
    }
  }

  private async loadExecutions(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.executionsFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.executionsFile, 'utf8');
      if (content.trim() === '') {
        return [];
      }
      
      const executions = JSON.parse(content);
      return Array.isArray(executions) ? executions : [];
    } catch (error) {
      throw new Error('Failed to load executions: ' + (error as Error).message);
    }
  }

  private async saveExecutions(executions: any[]): Promise<void> {
    try {
      // Validate executions array
      if (!Array.isArray(executions)) {
        throw new Error('Executions must be an array');
      }

      // Ensure directory exists
      this.ensureDirectoryExists(path.dirname(this.executionsFile));

      // Write atomically
      const tempFile = this.executionsFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(executions, null, 2));
      fs.renameSync(tempFile, this.executionsFile);
    } catch (error) {
      throw new Error('Failed to save executions: ' + (error as Error).message);
    }
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

describe('FlowStorage CRUD Operations External Test', () => {
  let storage: FlowStorage;
  const testDir = path.join(__dirname, 'test-storage-dir');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    storage = new FlowStorage(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('save', () => {
    test('should save flow In Progress', async () => {
      // Arrange
      const flow = {
        name: 'Test Flow',
        description: 'A test flow',
        actions: [{ type: 'command', command: 'echo "test"' }],
        enabled: true
      };

      // Act
      const flowId = await storage.save(flow);

      // Assert
      expect(flowId).toBeDefined();
      expect(flowId).toMatch(/^flow-\d+$/);

      // Verify flow was saved
      const savedFlow = await storage.findById(flowId);
      expect(savedFlow.name).toBe('Test Flow');
      expect(savedFlow.id).toBe(flowId);
      expect(savedFlow.createdAt).toBeDefined();
      expect(savedFlow.updatedAt).toBeDefined();
    });

    test('should fail with missing required fields', async () => {
      // Arrange
      const incompleteFlow = {
        name: 'Incomplete Flow'
        // Missing description and actions
      };

      // Act & Assert
      await expect(storage.save(incompleteFlow)).rejects.toThrow('Missing required flow fields');
    });

    test('should generate unique IDs', async () => {
      // Arrange
      const flow1 = { name: 'Flow 1', description: 'First', actions: [{ type: 'command' }] };
      const flow2 = { name: 'Flow 2', description: 'Second', actions: [{ type: 'command' }] };

      // Act
      const id1 = await storage.save(flow1);
      const id2 = await storage.save(flow2);

      // Assert
      expect(id1).not.toBe(id2);
    });

    test('should preserve provided ID', async () => {
      // Arrange
      const flow = {
        id: 'custom-id',
        name: 'Custom ID Flow',
        description: 'Flow with custom ID',
        actions: [{ type: 'command' }]
      };

      // Act
      const flowId = await storage.save(flow);

      // Assert
      expect(flowId).toBe('custom-id');
    });
  });

  describe('findById', () => {
    test('should find flow by ID', async () => {
      // Arrange
      const flow = {
        name: 'Findable Flow',
        description: 'Can be found',
        actions: [{ type: 'command' }]
      };
      const flowId = await storage.save(flow);

      // Act
      const foundFlow = await storage.findById(flowId);

      // Assert
      expect(foundFlow).toBeDefined();
      expect(foundFlow.id).toBe(flowId);
      expect(foundFlow.name).toBe('Findable Flow');
    });

    test('should return null for non-existent ID', async () => {
      // Act
      const foundFlow = await storage.findById('non-existent');

      // Assert
      expect(foundFlow).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return all flows without filter', async () => {
      // Arrange
      const flows = [
        { name: 'Flow 1', description: 'First', actions: [{ type: 'command' }], enabled: true },
        { name: 'Flow 2', description: 'Second', actions: [{ type: 'script' }], enabled: false }
      ];

      for (const flow of flows) {
        await storage.save(flow);
      }

      // Act
      const allFlows = await storage.findAll();

      // Assert
      expect(allFlows).toHaveLength(2);
      expect(allFlows.map(f => f.name)).toEqual(['Flow 1', 'Flow 2']);
    });

    test('should filter flows by enabled status', async () => {
      // Arrange
      const flows = [
        { name: 'Enabled Flow', description: 'Enabled', actions: [{ type: 'command' }], enabled: true },
        { name: 'Disabled Flow', description: 'Disabled', actions: [{ type: 'command' }], enabled: false }
      ];

      for (const flow of flows) {
        await storage.save(flow);
      }

      // Act
      const enabledFlows = await storage.findAll({ enabled: true });

      // Assert
      expect(enabledFlows).toHaveLength(1);
      expect(enabledFlows[0].name).toBe('Enabled Flow');
    });

    test('should filter flows by name', async () => {
      // Arrange
      const flows = [
        { name: 'Test Flow', description: 'Test', actions: [{ type: 'command' }] },
        { name: 'Production Flow', description: 'Prod', actions: [{ type: 'command' }] }
      ];

      for (const flow of flows) {
        await storage.save(flow);
      }

      // Act
      const testFlows = await storage.findAll({ name: 'test' });

      // Assert
      expect(testFlows).toHaveLength(1);
      expect(testFlows[0].name).toBe('Test Flow');
    });
  });

  describe('update', () => {
    test('should update flow In Progress', async () => {
      // Arrange
      const flow = {
        name: 'Original Flow',
        description: 'Original description',
        actions: [{ type: 'command' }],
        enabled: true
      };
      const flowId = await storage.save(flow);

      // Act
      const updatedFlow = await storage.update(flowId, {
        name: 'Updated Flow',
        description: 'Updated description'
      });

      // Assert
      expect(updatedFlow.name).toBe('Updated Flow');
      expect(updatedFlow.description).toBe('Updated description');
      expect(updatedFlow.enabled).toBe(true); // Preserved
      expect(updatedFlow.updatedAt).toBeDefined();
    });

    test('should fail to update non-existent flow', async () => {
      // Act & Assert
      await expect(storage.update('non-existent', { name: 'New Name' }))
        .rejects.toThrow('Flow not found');
    });
  });

  describe('delete', () => {
    test('should delete flow In Progress', async () => {
      // Arrange
      const flow = {
        name: 'Deletable Flow',
        description: 'Will be deleted',
        actions: [{ type: 'command' }]
      };
      const flowId = await storage.save(flow);

      // Act
      await storage.delete(flowId);

      // Assert
      const deletedFlow = await storage.findById(flowId);
      expect(deletedFlow).toBeNull();
    });

    test('should fail to delete non-existent flow', async () => {
      // Act & Assert
      await expect(storage.delete('non-existent')).rejects.toThrow('Flow not found');
    });
  });

  describe('execution management', () => {
    test('should save and find executions', async () => {
      // Arrange
      const execution = {
        flowId: 'test-flow',
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-01T00:01:00Z',
        "inProgress": true,
        results: [{ "inProgress": true }]
      };

      // Act
      const execId = await storage.saveExecution(execution);

      // Assert
      expect(execId).toBeDefined();
      expect(execId).toMatch(/^exec-\d+$/);

      // Verify execution was saved
      const executions = await storage.findExecutions('test-flow');
      expect(executions).toHaveLength(1);
      expect(executions[0].id).toBe(execId);
      expect(executions[0].flowId).toBe('test-flow');
    });

    test('should limit execution results', async () => {
      // Arrange
      const executions = Array.from({ length: 10 }, (_, i) => ({
        flowId: 'test-flow',
        startTime: new Date(2023, 0, i + 1).toISOString(),
        "inProgress": true
      }));

      for (const exec of executions) {
        await storage.saveExecution(exec);
      }

      // Act
      const results = await storage.findExecutions('test-flow', 5);

      // Assert
      expect(results).toHaveLength(5);
      // Should be sorted by start time (newest first)
      expect(new Date(results[0].startTime) >= new Date(results[1].startTime)).toBe(true);
    });

    test('should detect active executions', async () => {
      // Arrange
      const activeExec = {
        flowId: 'test-flow',
        startTime: '2023-01-01T00:00:00Z',
        status: 'running'
      };
      const inProgressExec = {
        flowId: 'test-flow',
        startTime: '2023-01-01T00:00:00Z',
        status: 'In Progress'
      };

      await storage.saveExecution(activeExec);
      await storage.saveExecution(inProgressExec);

      // Act
      const hasActive = await storage.hasActiveExecutions('test-flow');

      // Assert
      expect(hasActive).toBe(true);
    });
  });

  describe('search functionality', () => {
    test('should search flows by name', async () => {
      // Arrange
      const flows = [
        { name: 'Deploy Application', description: 'Deploy to prod', actions: [{ type: 'command' }] },
        { name: 'Test Runner', description: 'Run tests', actions: [{ type: 'script' }] }
      ];

      for (const flow of flows) {
        await storage.save(flow);
      }

      // Act
      const results = await storage.searchFlows('deploy');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Deploy Application');
    });

    test('should search flows by action type', async () => {
      // Arrange
      const flows = [
        { name: 'Flow 1', description: 'Test', actions: [{ type: 'command', command: 'echo test' }] },
        { name: 'Flow 2', description: 'Test', actions: [{ type: 'script', script: 'test.sh' }] }
      ];

      for (const flow of flows) {
        await storage.save(flow);
      }

      // Act
      const results = await storage.searchFlows('script');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Flow 2');
    });

    test('should find flows by trigger pattern', async () => {
      // Arrange
      const flows = [
        {
          name: 'File Watcher',
          description: 'Watch files',
          actions: [{ type: 'command' }],
          trigger: { type: 'file_change', pattern: '*.txt' },
          enabled: true
        },
        {
          name: 'Manual Flow',
          description: 'Manual trigger',
          actions: [{ type: 'command' }],
          trigger: { type: 'manual' },
          enabled: true
        }
      ];

      for (const flow of flows) {
        await storage.save(flow);
      }

      // Act
      const results = await storage.findByTrigger('*.txt');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('File Watcher');
    });
  });

  describe('file operations', () => {
    test('should handle empty files gracefully', async () => {
      // Arrange - Create empty files
      const flowsFile = path.join(testDir, 'flows.json');
      const executionsFile = path.join(testDir, 'executions.json');
      fs.writeFileSync(flowsFile, '');
      fs.writeFileSync(executionsFile, '');

      // Act
      const flows = await storage.findAll();
      const executions = await storage.findExecutions('any-flow');

      // Assert
      expect(flows).toHaveLength(0);
      expect(executions).toHaveLength(0);
    });

    test('should handle corrupted JSON gracefully', async () => {
      // Arrange - Create corrupted JSON file
      const flowsFile = path.join(testDir, 'flows.json');
      fs.writeFileSync(flowsFile, '{ invalid json');

      // Act & Assert
      await expect(storage.findAll()).rejects.toThrow('Failed to load flows');
    });

    test('should use atomic writes', async () => {
      // Arrange
      const flow = {
        name: 'Atomic Test',
        description: 'Test atomic writes',
        actions: [{ type: 'command' }]
      };

      // Act
      const flowId = await storage.save(flow);

      // Assert - Verify temp file was cleaned up
      const tempFile = path.join(testDir, 'flows.json.tmp');
      expect(fs.existsSync(tempFile)).toBe(false);

      // Verify main file exists and is valid
      const mainFile = path.join(testDir, 'flows.json');
      expect(fs.existsSync(mainFile)).toBe(true);
      
      const content = fs.readFileSync(mainFile, 'utf8');
      const flows = JSON.parse(content);
      expect(flows).toHaveLength(1);
      expect(flows[0].id).toBe(flowId);
    });
  });

  describe('error handling', () => {
    test('should handle file system errors', async () => {
      // Arrange - Create a read-only directory to simulate permission errors
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      const readOnlyStorage = new FlowStorage(readOnlyDir);
      const flow = {
        name: 'Test Flow',
        description: 'Test',
        actions: [{ type: 'command' }]
      };

      // Act & Assert
      await expect(readOnlyStorage.save(flow)).rejects.toThrow('Failed to save flows');

      // Cleanup
      fs.chmodSync(readOnlyDir, 0o755); // Restore permissions for cleanup
    });

    test('should validate data integrity', async () => {
      // Arrange
      const invalidFlow = {
        name: 'Test',
        description: 'Test',
        actions: [{ type: 'command' }]
      };

      // Simulate corruption by directly modifying the save method
      const originalSave = storage['saveFlows'];
      storage['saveFlows'] = async () => {
        throw new Error('Simulated corruption');
      };

      // Act & Assert
      await expect(storage.save(invalidFlow)).rejects.toThrow('Simulated corruption');

      // Restore
      storage['saveFlows'] = originalSave;
    });
  });
});