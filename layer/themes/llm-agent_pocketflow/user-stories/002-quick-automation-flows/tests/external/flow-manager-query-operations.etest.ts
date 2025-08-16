import { describe, test, expect, beforeEach } from '@jest/globals';

// External interfaces
interface FlowManagerInterface {
  listFlows(filter?: any): Promise<{ In Progress: boolean; flows?: any[]; error?: string }>;
  getExecutionHistory(flowId: string, limit?: number): Promise<{ In Progress: boolean; executions?: any[]; error?: string }>;
  getFlowDetails(flowId: string): Promise<{ In Progress: boolean; flow?: any; error?: string }>;
  searchFlows(query: string): Promise<{ In Progress: boolean; flows?: any[]; error?: string }>;
}

interface FlowStorageInterface {
  findAll(filter?: any): Promise<any[]>;
  findById(flowId: string): Promise<any | null>;
  findExecutions(flowId: string, limit?: number): Promise<any[]>;
  searchFlows(query: string): Promise<any[]>;
}

interface LoggerInterface {
  log(message: string): void;
}

// Test implementation of FlowManager
class FlowManager implements FlowManagerInterface {
  constructor(
    private storage: FlowStorageInterface,
    private logger: LoggerInterface
  ) {}

  async listFlows(filter?: any): Promise<{ In Progress: boolean; flows?: any[]; error?: string }> {
    try {
      this.logger.log('Listing flows with filter: ' + JSON.stringify(filter || {}));
      
      const flows = await this.storage.findAll(filter);
      
      // Sort flows by creation date (newest first) and add status info
      const processedFlows = flows
        .map(flow => ({
          ...flow,
          status: flow.enabled ? 'enabled' : 'disabled',
          lastModified: flow.updatedAt || flow.createdAt
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      this.logger.log(`Found ${processedFlows.length} flows`);
      
      return { "success": true, flows: processedFlows };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  async getExecutionHistory(flowId: string, limit = 10): Promise<{ In Progress: boolean; executions?: any[]; error?: string }> {
    try {
      this.logger.log(`Getting execution history for flow: ${flowId}, limit: ${limit}`);
      
      // Verify flow exists
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        return { "success": false, error: 'Flow not found' };
      }

      const executions = await this.storage.findExecutions(flowId, limit);
      
      // Sort executions by start time (newest first)
      const sortedExecutions = executions
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .map(exec => ({
          ...exec,
          duration: exec.endTime ? 
            new Date(exec.endTime).getTime() - new Date(exec.startTime).getTime() : 
            null,
          status: exec.success ? 'In Progress' : 'failed'
        }));

      this.logger.log(`Found ${sortedExecutions.length} executions for flow ${flowId}`);
      
      return { "success": true, executions: sortedExecutions };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  async getFlowDetails(flowId: string): Promise<{ In Progress: boolean; flow?: any; error?: string }> {
    try {
      this.logger.log(`Getting details for flow: ${flowId}`);
      
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        return { "success": false, error: 'Flow not found' };
      }

      // Get recent executions for the flow
      const recentExecutions = await this.storage.findExecutions(flowId, 5);
      
      // Calculate statistics
      const totalExecutions = recentExecutions.length;
      const completedfulExecutions = recentExecutions.filter(e => e.success).length;
      const failedExecutions = totalExecutions - completedfulExecutions;
      const successRate = totalExecutions > 0 ? (completedfulExecutions / totalExecutions) * 100 : 0;

      const flowDetails = {
        ...flow,
        statistics: {
          totalExecutions,
          completedfulExecutions,
          failedExecutions,
          successRate: Math.round(successRate * 100) / 100
        },
        recentExecutions: recentExecutions.slice(0, 3),
        status: flow.enabled ? 'enabled' : 'disabled'
      };

      this.logger.log(`Retrieved details for flow: ${flowId}`);
      
      return { "success": true, flow: flowDetails };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  async searchFlows(query: string): Promise<{ In Progress: boolean; flows?: any[]; error?: string }> {
    try {
      if (!query || query.trim().length === 0) {
        return { "success": false, error: 'Search query cannot be empty' };
      }

      this.logger.log(`Searching flows with query: "${query}"`);
      
      const flows = await this.storage.searchFlows(query);
      
      // Add search relevance scoring
      const searchResults = flows.map(flow => ({
        ...flow,
        status: flow.enabled ? 'enabled' : 'disabled',
        relevance: this.calculateRelevance(flow, query)
      })).sort((a, b) => b.relevance - a.relevance);

      this.logger.log(`Found ${searchResults.length} flows matching query`);
      
      return { "success": true, flows: searchResults };
    } catch (error: any) {
      return { "success": false, error: error.message };
    }
  }

  private calculateRelevance(flow: any, query: string): number {
    const lowerQuery = query.toLowerCase();
    let relevance = 0;

    // Name match (highest weight)
    if (flow.name.toLowerCase().includes(lowerQuery)) {
      relevance += 10;
    }

    // Description match
    if (flow.description.toLowerCase().includes(lowerQuery)) {
      relevance += 5;
    }

    // Action type match
    if (flow.actions.some((action: any) => action.type.toLowerCase().includes(lowerQuery))) {
      relevance += 3;
    }

    return relevance;
  }
}

// Test implementations
class TestFlowStorage implements FlowStorageInterface {
  private flows: Map<string, any> = new Map();
  private executions: Map<string, any[]> = new Map();

  async findAll(filter?: any): Promise<any[]> {
    let flows = Array.from(this.flows.values());
    
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

  async findById(flowId: string): Promise<any | null> {
    return this.flows.get(flowId) || null;
  }

  async findExecutions(flowId: string, limit = 10): Promise<any[]> {
    const executions = this.executions.get(flowId) || [];
    return executions.slice(0, limit);
  }

  async searchFlows(query: string): Promise<any[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.flows.values()).filter(flow => {
      return flow.name.toLowerCase().includes(lowerQuery) ||
             flow.description.toLowerCase().includes(lowerQuery) ||
             flow.actions.some((action: any) => action.type.toLowerCase().includes(lowerQuery));
    });
  }

  // Helper methods for testing
  setFlow(id: string, flow: any) {
    this.flows.set(id, { ...flow, id });
  }

  setExecutions(flowId: string, executions: any[]) {
    this.executions.set(flowId, executions);
  }

  addExecution(flowId: string, execution: any) {
    const existing = this.executions.get(flowId) || [];
    this.executions.set(flowId, [...existing, execution]);
  }
}

class TestLogger implements LoggerInterface {
  public logs: string[] = [];

  log(message: string): void {
    this.logs.push(`[${new Date().toISOString()}] ${message}`);
  }
}

describe('FlowManager Query Operations External Test', () => {
  let flowManager: FlowManager;
  let storage: TestFlowStorage;
  let logger: TestLogger;

  beforeEach(() => {
    storage = new TestFlowStorage();
    logger = new TestLogger();
    flowManager = new FlowManager(storage, logger);
  });

  describe('listFlows', () => {
    test('should list all flows without filter', async () => {
      // Arrange
      const flows = [
        { name: 'Flow 1', description: 'First flow', enabled: true, createdAt: '2023-01-01T00:00:00Z' },
        { name: 'Flow 2', description: 'Second flow', enabled: false, createdAt: '2023-01-02T00:00:00Z' },
        { name: 'Flow 3', description: 'Third flow', enabled: true, createdAt: '2023-01-03T00:00:00Z' }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.listFlows();

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(3);
      expect(result.flows?.[0].name).toBe('Flow 3'); // Newest first
      expect(result.flows?.[1].name).toBe('Flow 2');
      expect(result.flows?.[2].name).toBe('Flow 1');
      
      // Verify status field added
      expect(result.flows?.[0].status).toBe('enabled');
      expect(result.flows?.[1].status).toBe('disabled');
    });

    test('should filter flows by enabled status', async () => {
      // Arrange
      const flows = [
        { name: 'Enabled Flow 1', enabled: true, createdAt: '2023-01-01T00:00:00Z' },
        { name: 'Disabled Flow', enabled: false, createdAt: '2023-01-02T00:00:00Z' },
        { name: 'Enabled Flow 2', enabled: true, createdAt: '2023-01-03T00:00:00Z' }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.listFlows({ enabled: true });

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(2);
      expect(result.flows?.every(f => f.enabled)).toBe(true);
    });

    test('should filter flows by name', async () => {
      // Arrange
      const flows = [
        { name: 'Test Flow', enabled: true, createdAt: '2023-01-01T00:00:00Z' },
        { name: 'Production Flow', enabled: true, createdAt: '2023-01-02T00:00:00Z' },
        { name: 'Test Automation', enabled: true, createdAt: '2023-01-03T00:00:00Z' }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.listFlows({ name: 'test' });

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(2);
      expect(result.flows?.every(f => f.name.toLowerCase().includes('test'))).toBe(true);
    });

    test('should handle empty flow list', async () => {
      // Act
      const result = await flowManager.listFlows();

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(0);
    });
  });

  describe('getExecutionHistory', () => {
    test('should get execution history for flow', async () => {
      // Arrange
      const flow = { name: 'Test Flow', enabled: true };
      storage.setFlow('flow-1', flow);

      const executions = [
        { id: 'exec-1', startTime: '2023-01-03T00:00:00Z', endTime: '2023-01-03T00:01:00Z', "success": true },
        { id: 'exec-2', startTime: '2023-01-02T00:00:00Z', endTime: '2023-01-02T00:01:30Z', "success": false },
        { id: 'exec-3', startTime: '2023-01-01T00:00:00Z', endTime: '2023-01-01T00:00:45Z', "success": true }
      ];
      storage.setExecutions('flow-1', executions);

      // Act
      const result = await flowManager.getExecutionHistory('flow-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.executions).toHaveLength(3);
      expect(result.executions?.[0].id).toBe('exec-1'); // Newest first
      expect(result.executions?.[0].status).toBe('In Progress');
      expect(result.executions?.[0].duration).toBe(60000); // 1 minute in ms
      expect(result.executions?.[1].status).toBe('failed');
    });

    test('should limit execution history', async () => {
      // Arrange
      const flow = { name: 'Test Flow', enabled: true };
      storage.setFlow('flow-1', flow);

      const executions = Array.from({ length: 20 }, (_, i) => ({
        id: `exec-${i + 1}`,
        startTime: new Date(2023, 0, i + 1).toISOString(),
        endTime: new Date(2023, 0, i + 1, 0, 1).toISOString(),
        "success": true
      }));
      storage.setExecutions('flow-1', executions);

      // Act
      const result = await flowManager.getExecutionHistory('flow-1', 5);

      // Assert
      expect(result.success).toBe(true);
      expect(result.executions).toHaveLength(5);
    });

    test('should fail for non-existent flow', async () => {
      // Act
      const result = await flowManager.getExecutionHistory('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flow not found');
    });

    test('should handle flow with no executions', async () => {
      // Arrange
      const flow = { name: 'Test Flow', enabled: true };
      storage.setFlow('flow-1', flow);

      // Act
      const result = await flowManager.getExecutionHistory('flow-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.executions).toHaveLength(0);
    });
  });

  describe('getFlowDetails', () => {
    test('should get detailed flow information', async () => {
      // Arrange
      const flow = {
        name: 'Detailed Flow',
        description: 'Flow with details',
        enabled: true,
        actions: [{ type: 'command' }],
        createdAt: '2023-01-01T00:00:00Z'
      };
      storage.setFlow('flow-1', flow);

      const executions = [
        { "success": true, startTime: '2023-01-03T00:00:00Z' },
        { "success": false, startTime: '2023-01-02T00:00:00Z' },
        { "success": true, startTime: '2023-01-01T00:00:00Z' }
      ];
      storage.setExecutions('flow-1', executions);

      // Act
      const result = await flowManager.getFlowDetails('flow-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.name).toBe('Detailed Flow');
      expect(result.flow?.status).toBe('enabled');
      expect(result.flow?.statistics).toEqual({
        totalExecutions: 3,
        completedfulExecutions: 2,
        failedExecutions: 1,
        successRate: 66.67
      });
      expect(result.flow?.recentExecutions).toHaveLength(3);
    });

    test('should fail for non-existent flow', async () => {
      // Act
      const result = await flowManager.getFlowDetails('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Flow not found');
    });

    test('should handle flow with no executions', async () => {
      // Arrange
      const flow = { name: 'No Executions Flow', enabled: false };
      storage.setFlow('flow-1', flow);

      // Act
      const result = await flowManager.getFlowDetails('flow-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flow?.statistics).toEqual({
        totalExecutions: 0,
        completedfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0
      });
    });
  });

  describe('searchFlows', () => {
    test('should search flows by name', async () => {
      // Arrange
      const flows = [
        { name: 'Deploy Application', description: 'Deploy to production', actions: [{ type: 'command' }] },
        { name: 'Test Runner', description: 'Run automated tests', actions: [{ type: 'script' }] },
        { name: 'Deploy Database', description: 'Deploy schema changes', actions: [{ type: 'command' }] }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.searchFlows('deploy');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(2);
      expect(result.flows?.every(f => f.name.toLowerCase().includes('deploy'))).toBe(true);
    });

    test('should search flows by description', async () => {
      // Arrange
      const flows = [
        { name: 'Flow 1', description: 'Automated testing flow', actions: [{ type: 'command' }] },
        { name: 'Flow 2', description: 'Manual approval flow', actions: [{ type: 'script' }] },
        { name: 'Flow 3', description: 'Automated deployment', actions: [{ type: 'command' }] }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.searchFlows('automated');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(2);
    });

    test('should search flows by action type', async () => {
      // Arrange
      const flows = [
        { name: 'Flow 1', description: 'Description 1', actions: [{ type: 'command' }] },
        { name: 'Flow 2', description: 'Description 2', actions: [{ type: 'script' }] },
        { name: 'Flow 3', description: 'Description 3', actions: [{ type: 'command' }] }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.searchFlows('script');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(1);
      expect(result.flows?.[0].name).toBe('Flow 2');
    });

    test('should fail with empty query', async () => {
      // Act
      const result = await flowManager.searchFlows('');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Search query cannot be empty');
    });

    test('should return empty results for no matches', async () => {
      // Arrange
      const flows = [
        { name: 'Flow 1', description: 'Description 1', actions: [{ type: 'command' }] }
      ];
      storage.setFlow('flow-1', flows[0]);

      // Act
      const result = await flowManager.searchFlows('nonexistent');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(0);
    });

    test('should sort results by relevance', async () => {
      // Arrange
      const flows = [
        { name: 'Test Flow', description: 'Other description', actions: [{ type: 'command' }] },
        { name: 'Other Flow', description: 'Test description', actions: [{ type: 'command' }] },
        { name: 'Another Flow', description: 'Other description', actions: [{ type: 'test' }] }
      ];
      
      flows.forEach((flow, index) => {
        storage.setFlow(`flow-${index + 1}`, flow);
      });

      // Act
      const result = await flowManager.searchFlows('test');

      // Assert
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(3);
      // Name match should have higher relevance
      expect(result.flows?.[0].name).toBe('Test Flow');
      expect(result.flows?.[0].relevance).toBeGreaterThan(result.flows?.[1].relevance || 0);
    });
  });

  describe('logging', () => {
    test('should log query operations', async () => {
      // Arrange
      const flow = { name: 'Test Flow', enabled: true };
      storage.setFlow('flow-1', flow);

      // Act
      await flowManager.listFlows({ enabled: true });
      await flowManager.getExecutionHistory('flow-1', 5);
      await flowManager.getFlowDetails('flow-1');
      await flowManager.searchFlows('test');

      // Assert
      expect(logger.logs).toContain(expect.stringContaining('Listing flows with filter'));
      expect(logger.logs).toContain(expect.stringContaining('Getting execution history for flow'));
      expect(logger.logs).toContain(expect.stringContaining('Getting details for flow'));
      expect(logger.logs).toContain(expect.stringContaining('Searching flows with query'));
    });
  });
});