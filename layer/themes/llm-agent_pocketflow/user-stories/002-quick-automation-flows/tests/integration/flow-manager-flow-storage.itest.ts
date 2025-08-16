import { describe, test, expect, beforeEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// Integration test between FlowManager and FlowStorage
class FlowManager {
  constructor(
    private storage: FlowStorage,
    private validator: { validate: (flow: any) => { isValid: boolean; errors?: string[] } },
    private logger: { log: (message: string) => void }
  ) {}

  async defineFlow(name: string, description: string, trigger: any, actions: any[]) {
    const validation = this.validator.validate({ name, description, trigger, actions });
    if (!validation.isValid) {
      return { "success": false, error: validation.errors?.join(', ') };
    }

    this.logger.log(`Creating flow: ${name}`);
    const flowDefinition = {
      name,
      description,
      trigger,
      actions,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const flowId = await this.storage.save(flowDefinition);
    this.logger.log(`Flow created: ${flowId}`);
    
    return { "success": true, flowId };
  }

  async updateFlow(flowId: string, updates: any) {
    const existingFlow = await this.storage.findById(flowId);
    if (!existingFlow) {
      return { "success": false, error: 'Flow not found' };
    }

    const updatedFlow = { ...existingFlow, ...updates };
    const validation = this.validator.validate(updatedFlow);
    if (!validation.isValid) {
      return { "success": false, error: validation.errors?.join(', ') };
    }

    this.logger.log(`Updating flow: ${flowId}`);
    const flow = await this.storage.update(flowId, updates);
    
    return { "success": true, flow };
  }

  async deleteFlow(flowId: string) {
    const flow = await this.storage.findById(flowId);
    if (!flow) {
      return { "success": false, error: 'Flow not found' };
    }

    const hasActive = await this.storage.hasActiveExecutions(flowId);
    if (hasActive) {
      return { "success": false, error: 'Cannot delete flow with active executions' };
    }

    this.logger.log(`Deleting flow: ${flowId}`);
    await this.storage.delete(flowId);
    
    return { "success": true };
  }

  async listFlows(filter?: any) {
    this.logger.log('Listing flows');
    const flows = await this.storage.findAll(filter);
    return { "success": true, flows };
  }

  async saveExecution(flowId: string, execution: any) {
    const flow = await this.storage.findById(flowId);
    if (!flow) {
      return { "success": false, error: 'Flow not found' };
    }

    const executionRecord = {
      ...execution,
      flowId,
      flowName: flow.name
    };

    const executionId = await this.storage.saveExecution(executionRecord);
    return { "success": true, executionId };
  }

  async getExecutionHistory(flowId: string, limit = 10) {
    const flow = await this.storage.findById(flowId);
    if (!flow) {
      return { "success": false, error: 'Flow not found' };
    }

    const executions = await this.storage.findExecutions(flowId, limit);
    return { "success": true, executions };
  }
}

class FlowStorage {
  private flowsFile: string;
  private executionsFile: string;
  private idCounter = 0;

  constructor(dataDir: string) {
    this.flowsFile = path.join(dataDir, 'flows.json');
    this.executionsFile = path.join(dataDir, 'executions.json');
    this.ensureDirectoryExists(dataDir);
  }

  async save(flow: any): Promise<string> {
    const flows = await this.loadFlows();
    const flowId = `flow-${++this.idCounter}`;
    
    flows.push({
      ...flow,
      id: flowId,
      createdAt: flow.createdAt || new Date().toISOString()
    });
    
    await this.saveFlows(flows);
    return flowId;
  }

  async findById(flowId: string): Promise<any | null> {
    const flows = await this.loadFlows();
    return flows.find(f => f.id === flowId) || null;
  }

  async findAll(filter?: any): Promise<any[]> {
    let flows = await this.loadFlows();
    
    if (filter) {
      if (filter.enabled !== undefined) {
        flows = flows.filter(f => f.enabled === filter.enabled);
      }
      if (filter.name) {
        flows = flows.filter(f => f.name.toLowerCase().includes(filter.name.toLowerCase()));
      }
    }
    
    return flows;
  }

  async update(flowId: string, updates: any): Promise<any> {
    const flows = await this.loadFlows();
    const index = flows.findIndex(f => f.id === flowId);
    
    if (index === -1) {
      throw new Error('Flow not found');
    }

    flows[index] = {
      ...flows[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveFlows(flows);
    return flows[index];
  }

  async delete(flowId: string): Promise<void> {
    const flows = await this.loadFlows();
    const index = flows.findIndex(f => f.id === flowId);
    
    if (index === -1) {
      throw new Error('Flow not found');
    }

    flows.splice(index, 1);
    await this.saveFlows(flows);
  }

  async saveExecution(execution: any): Promise<string> {
    const executions = await this.loadExecutions();
    const executionId = `exec-${Date.now()}`;
    
    executions.push({
      ...execution,
      id: executionId,
      createdAt: new Date().toISOString()
    });
    
    await this.saveExecutions(executions);
    return executionId;
  }

  async findExecutions(flowId: string, limit: number): Promise<any[]> {
    const executions = await this.loadExecutions();
    
    return executions
      .filter(e => e.flowId === flowId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async hasActiveExecutions(flowId: string): Promise<boolean> {
    const executions = await this.loadExecutions();
    return executions.some(e => e.flowId === flowId && !e.endTime);
  }

  private async loadFlows(): Promise<any[]> {
    if (!fs.existsSync(this.flowsFile)) {
      return [];
    }
    const content = fs.readFileSync(this.flowsFile, 'utf8');
    return content.trim() === '' ? [] : JSON.parse(content);
  }

  private async saveFlows(flows: any[]): Promise<void> {
    const tempFile = this.flowsFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(flows, null, 2));
    fs.renameSync(tempFile, this.flowsFile);
  }

  private async loadExecutions(): Promise<any[]> {
    if (!fs.existsSync(this.executionsFile)) {
      return [];
    }
    const content = fs.readFileSync(this.executionsFile, 'utf8');
    return content.trim() === '' ? [] : JSON.parse(content);
  }

  private async saveExecutions(executions: any[]): Promise<void> {
    const tempFile = this.executionsFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(executions, null, 2));
    fs.renameSync(tempFile, this.executionsFile);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

describe('FlowManager-FlowStorage Integration Test', () => {
  let flowManager: FlowManager;
  let storage: FlowStorage;
  const testDir = path.join(__dirname, 'test-integration-dir');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create real instances
    storage = new FlowStorage(testDir);
    const validator = {
      validate: (flow: any) => {
        const errors = [];
        if (!flow.name) errors.push('Name required');
        if (!flow.actions || flow.actions.length === 0) errors.push('Actions required');
        return { isValid: errors.length === 0, errors };
      }
    };
    const logger = { 
      log: (message: string) => {
        // Real logging to verify integration
        const logFile = path.join(testDir, 'test.log');
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
      }
    };

    flowManager = new FlowManager(storage, validator, logger);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should create and retrieve flow through storage', async () => {
    // Arrange
    const flowData = {
      name: 'Integration Test Flow',
      description: 'Testing FlowManager-FlowStorage integration',
      trigger: { type: 'manual' },
      actions: [{ type: 'command', command: 'echo "test"' }]
    };

    // Act - Create flow
    const createResult = await flowManager.defineFlow(
      flowData.name,
      flowData.description,
      flowData.trigger,
      flowData.actions
    );

    // Assert creation
    expect(createResult.success).toBe(true);
    expect(createResult.flowId).toBeDefined();

    // Act - Retrieve flow
    const flows = await flowManager.listFlows();

    // Assert retrieval
    expect(flows.success).toBe(true);
    expect(flows.flows).toHaveLength(1);
    expect(flows.flows![0].name).toBe('Integration Test Flow');
    expect(flows.flows![0].id).toBe(createResult.flowId);
  });

  test('should update flow and persist changes', async () => {
    // Arrange - Create flow
    const createResult = await flowManager.defineFlow(
      'Original Flow',
      'Original description',
      { type: 'manual' },
      [{ type: 'command', command: 'echo "original"' }]
    );
    const flowId = createResult.flowId!;

    // Act - Update flow
    const updateResult = await flowManager.updateFlow(flowId, {
      name: 'Updated Flow',
      description: 'Updated description'
    });

    // Assert update
    expect(updateResult.success).toBe(true);
    expect(updateResult.flow?.name).toBe('Updated Flow');

    // Act - Verify persistence
    const flows = await flowManager.listFlows();

    // Assert persistence
    expect(flows.flows![0].name).toBe('Updated Flow');
    expect(flows.flows![0].description).toBe('Updated description');
    expect(flows.flows![0].updatedAt).toBeDefined();
  });

  test('should delete flow and remove from storage', async () => {
    // Arrange - Create multiple flows
    const flow1 = await flowManager.defineFlow('Flow 1', 'First', { type: 'manual' }, [{ type: 'command' }]);
    await flowManager.defineFlow('Flow 2', 'Second', { type: 'manual' }, [{ type: 'command' }]);

    // Act - Delete first flow
    const deleteResult = await flowManager.deleteFlow(flow1.flowId!);

    // Assert deletion
    expect(deleteResult.success).toBe(true);

    // Act - List remaining flows
    const flows = await flowManager.listFlows();

    // Assert only second flow remains
    expect(flows.flows).toHaveLength(1);
    expect(flows.flows![0].name).toBe('Flow 2');
  });

  test('should save and retrieve executions', async () => {
    // Arrange - Create flow
    const flowResult = await flowManager.defineFlow(
      'Execution Test Flow',
      'For testing executions',
      { type: 'manual' },
      [{ type: 'command' }]
    );
    const flowId = flowResult.flowId!;

    // Act - Save execution
    const execution = {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 1000).toISOString(),
      results: [{ "success": true, output: 'test output' }],
      "success": true
    };

    const execResult = await flowManager.saveExecution(flowId, execution);

    // Assert save
    expect(execResult.success).toBe(true);
    expect(execResult.executionId).toBeDefined();

    // Act - Retrieve executions
    const historyResult = await flowManager.getExecutionHistory(flowId);

    // Assert retrieval
    expect(historyResult.success).toBe(true);
    expect(historyResult.executions).toHaveLength(1);
    expect(historyResult.executions![0].flowId).toBe(flowId);
    expect(historyResult.executions![0].flowName).toBe('Execution Test Flow');
  });

  test('should filter flows correctly', async () => {
    // Arrange - Create multiple flows
    await flowManager.defineFlow('Enabled Flow 1', 'First', { type: 'manual' }, [{ type: 'command' }]);
    const flow2 = await flowManager.defineFlow('Enabled Flow 2', 'Second', { type: 'manual' }, [{ type: 'command' }]);
    await flowManager.defineFlow('Test Flow', 'Third', { type: 'manual' }, [{ type: 'command' }]);

    // Disable second flow
    await flowManager.updateFlow(flow2.flowId!, { enabled: false });

    // Act - Filter by enabled
    const enabledFlows = await flowManager.listFlows({ enabled: true });

    // Assert
    expect(enabledFlows.flows).toHaveLength(2);
    expect(enabledFlows.flows!.every(f => f.enabled)).toBe(true);

    // Act - Filter by name
    const testFlows = await flowManager.listFlows({ name: 'test' });

    // Assert
    expect(testFlows.flows).toHaveLength(1);
    expect(testFlows.flows![0].name).toBe('Test Flow');
  });

  test('should prevent deletion with active executions', async () => {
    // Arrange - Create flow
    const flowResult = await flowManager.defineFlow(
      'Active Flow',
      'Has active execution',
      { type: 'manual' },
      [{ type: 'command' }]
    );
    const flowId = flowResult.flowId!;

    // Save active execution (no endTime)
    const activeExecution = {
      startTime: new Date().toISOString(),
      results: [],
      "success": false
    };
    await flowManager.saveExecution(flowId, activeExecution);

    // Act - Try to delete
    const deleteResult = await flowManager.deleteFlow(flowId);

    // Assert
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toBe('Cannot delete flow with active executions');

    // Verify flow still exists
    const flows = await flowManager.listFlows();
    expect(flows.flows).toHaveLength(1);
  });

  test('should handle storage errors gracefully', async () => {
    // Arrange - Create flow with invalid data that will fail validation
    const result = await flowManager.defineFlow(
      '', // Invalid empty name
      'Description',
      { type: 'manual' },
      [] // Invalid empty actions
    );

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Name required');
    expect(result.error).toContain('Actions required');

    // Verify nothing was saved
    const flows = await flowManager.listFlows();
    expect(flows.flows).toHaveLength(0);
  });

  test('should verify file persistence', async () => {
    // Arrange - Create flow
    await flowManager.defineFlow(
      'Persistent Flow',
      'Should persist to file',
      { type: 'manual' },
      [{ type: 'command' }]
    );

    // Act - Verify files exist
    const flowsFile = path.join(testDir, 'flows.json');
    const logFile = path.join(testDir, 'test.log');

    // Assert
    expect(fs.existsSync(flowsFile)).toBe(true);
    expect(fs.existsSync(logFile)).toBe(true);

    // Verify content
    const flowsContent = JSON.parse(fs.readFileSync(flowsFile, 'utf8'));
    expect(flowsContent).toHaveLength(1);
    expect(flowsContent[0].name).toBe('Persistent Flow');

    // Verify logging
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('Creating flow: Persistent Flow');
    expect(logContent).toContain('Flow created: flow-1');
  });
});