import { describe, test, expect, beforeEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// FlowStorage implementation for unit testing
class FlowStorage {
  private readonly flowsFile: string;
  private readonly executionsFile: string;
  private idCounter = 0;
  private execCounter = 0;

  constructor(dataDir: string) {
    this.flowsFile = path.join(dataDir, 'flows.json');
    this.executionsFile = path.join(dataDir, 'executions.json');
    this.ensureDirectoryExists(dataDir);
  }

  // Method under test: generateFlowId
  generateFlowId(flow?: any): string {
    const timestamp = Date.now();
    const counter = ++this.idCounter;
    
    // Use flow name for more descriptive IDs
    const nameSlug = flow?.name 
      ? flow.name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20)
      : 'flow';
    
    // Generate unique ID with format: [name-slug]-[timestamp]-[counter]
    const flowId = `${nameSlug}-${timestamp}-${counter}`;
    
    return flowId;
  }

  // Method under test: loadFlows
  async loadFlows(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.flowsFile)) {
        // Create empty flows file
        await this.saveFlows([]);
        return [];
      }

      const content = fs.readFileSync(this.flowsFile, 'utf8');
      
      // Handle empty file
      if (content.trim() === '') {
        return [];
      }

      const flows = JSON.parse(content);
      
      // Validate flows format
      if (!Array.isArray(flows)) {
        throw new Error('Invalid flows file format: expected array');
      }

      // Sort flows by creation date (newest first)
      return flows.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

    } catch (error: any) {
      if (error.message.includes('JSON')) {
        throw new Error(`Failed to parse flows file: ${error.message}`);
      }
      throw new Error(`Failed to load flows: ${error.message}`);
    }
  }

  // Method under test: saveFlows
  async saveFlows(flows: any[]): Promise<void> {
    try {
      // Validate input
      if (!Array.isArray(flows)) {
        throw new Error('Flows must be an array');
      }

      // Validate each flow has required fields
      flows.forEach((flow, index) => {
        if (!flow.id) {
          throw new Error(`Flow at index ${index} missing required field: id`);
        }
        if (!flow.name) {
          throw new Error(`Flow at index ${index} missing required field: name`);
        }
      });

      // Ensure directory exists
      this.ensureDirectoryExists(path.dirname(this.flowsFile));

      // Write to temporary file first (atomic operation)
      const tempFile = `${this.flowsFile}.tmp`;
      const content = JSON.stringify(flows, null, 2);
      
      fs.writeFileSync(tempFile, content, 'utf8');
      
      // Atomic rename
      fs.renameSync(tempFile, this.flowsFile);

    } catch (error: any) {
      throw new Error(`Failed to save flows: ${error.message}`);
    }
  }

  // Method under test: findFlowIndex
  findFlowIndex(flows: any[], flowId: string): number {
    if (!Array.isArray(flows)) {
      throw new Error('Invalid flows parameter: expected array');
    }

    if (!flowId || typeof flowId !== 'string') {
      throw new Error('Invalid flowId parameter: expected non-empty string');
    }

    const index = flows.findIndex(flow => flow.id === flowId);
    
    return index; // Returns -1 if not found
  }

  // Method under test: applyFilter
  applyFilter(flows: any[], filter: any): any[] {
    if (!Array.isArray(flows)) {
      throw new Error('Invalid flows parameter: expected array');
    }

    if (!filter) {
      return flows;
    }

    return flows.filter(flow => {
      // Enabled filter
      if (filter.enabled !== undefined && flow.enabled !== filter.enabled) {
        return false;
      }

      // Name filter (case-insensitive partial match)
      if (filter.name) {
        const flowName = (flow.name || '').toLowerCase();
        const filterName = filter.name.toLowerCase();
        if (!flowName.includes(filterName)) {
          return false;
        }
      }

      // Status filter
      if (filter.status && flow.status !== filter.status) {
        return false;
      }

      // Trigger type filter
      if (filter.triggerType) {
        const triggerType = flow.trigger?.type;
        if (triggerType !== filter.triggerType) {
          return false;
        }
      }

      // Tags filter (if flow has tags array)
      if (filter.tags && Array.isArray(filter.tags)) {
        const flowTags = flow.tags || [];
        const hasAllTags = filter.tags.every((tag: string) => 
          flowTags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Date range filter
      if (filter.createdAfter) {
        const flowDate = new Date(flow.createdAt || 0);
        const filterDate = new Date(filter.createdAfter);
        if (flowDate < filterDate) {
          return false;
        }
      }

      if (filter.createdBefore) {
        const flowDate = new Date(flow.createdAt || 0);
        const filterDate = new Date(filter.createdBefore);
        if (flowDate > filterDate) {
          return false;
        }
      }

      // Action count filter
      if (filter.minActions !== undefined) {
        const actionCount = flow.actions?.length || 0;
        if (actionCount < filter.minActions) {
          return false;
        }
      }

      if (filter.maxActions !== undefined) {
        const actionCount = flow.actions?.length || 0;
        if (actionCount > filter.maxActions) {
          return false;
        }
      }

      return true;
    });
  }

  // Method under test: generateExecutionId
  generateExecutionId(execution?: any): string {
    const timestamp = Date.now();
    const counter = ++this.execCounter;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    // Include flow information in execution ID if available
    const flowPrefix = execution?.flowId 
      ? execution.flowId.split('-')[0] 
      : 'exec';
    
    const executionId = `${flowPrefix}-exec-${timestamp}-${counter}-${randomSuffix}`;
    
    return executionId;
  }

  // Helper method for testing
  async validateFlowsFile(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const flows = await this.loadFlows();
      
      // Check for duplicate IDs
      const ids = flows.map(f => f.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        errors.push(`Duplicate flow IDs found: ${duplicateIds.join(', ')}`);
      }

      // Check for missing required fields
      flows.forEach((flow, index) => {
        if (!flow.id) errors.push(`Flow at index ${index} missing id`);
        if (!flow.name) errors.push(`Flow at index ${index} missing name`);
        if (!flow.createdAt) errors.push(`Flow at index ${index} missing createdAt`);
      });

    } catch (error: any) {
      errors.push(`Validation failed: ${error.message}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Helper method
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Helper methods for testing
  getFlowsFilePath(): string {
    return this.flowsFile;
  }

  getExecutionsFilePath(): string {
    return this.executionsFile;
  }

  resetCounters(): void {
    this.idCounter = 0;
    this.execCounter = 0;
  }
}

describe('FlowStorage Methods Unit Tests', () => {
  let flowStorage: FlowStorage;
  const testDir = path.join(__dirname, 'test-storage-methods');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    flowStorage = new FlowStorage(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('generateFlowId Method', () => {
    test('should generate unique flow IDs', () => {
      // Act
      const id1 = flowStorage.generateFlowId();
      const id2 = flowStorage.generateFlowId();
      const id3 = flowStorage.generateFlowId();

      // Assert
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id3).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    test('should include flow name in ID when provided', () => {
      // Arrange
      const flow = { name: 'Test Flow Name' };

      // Act
      const flowId = flowStorage.generateFlowId(flow);

      // Assert
      expect(flowId).toContain('test-flow-name');
      expect(flowId).toMatch(/^test-flow-name-\d+-\d+$/);
    });

    test('should handle special characters in flow name', () => {
      // Arrange
      const flow = { name: 'Test@Flow#With$Special%Characters!' };

      // Act
      const flowId = flowStorage.generateFlowId(flow);

      // Assert
      expect(flowId).toContain('test-flow-with-speci');
      expect(flowId).not.toContain('@');
      expect(flowId).not.toContain('#');
      expect(flowId).not.toContain('$');
    });

    test('should truncate long flow names', () => {
      // Arrange
      const flow = { name: 'This is a very long flow name that should be truncated to a reasonable length' };

      // Act
      const flowId = flowStorage.generateFlowId(flow);

      // Assert
      const nameSlug = flowId.split('-')[0];
      expect(nameSlug.length).toBeLessThanOrEqual(20);
    });

    test('should use default prefix when no flow name provided', () => {
      // Act
      const flowId1 = flowStorage.generateFlowId(null);
      const flowId2 = flowStorage.generateFlowId({});
      const flowId3 = flowStorage.generateFlowId({ name: '' });

      // Assert
      expect(flowId1).toMatch(/^flow-\d+-\d+$/);
      expect(flowId2).toMatch(/^flow-\d+-\d+$/);
      expect(flowId3).toMatch(/^flow-\d+-\d+$/);
    });

    test('should include timestamp and counter for uniqueness', () => {
      // Arrange
      const flow = { name: 'Test Flow' };

      // Act
      const id1 = flowStorage.generateFlowId(flow);
      const id2 = flowStorage.generateFlowId(flow);

      // Assert
      const parts1 = id1.split('-');
      const parts2 = id2.split('-');
      
      expect(parts1).toHaveLength(4); // name-timestamp-counter
      expect(parts2).toHaveLength(4);
      
      // Counters should be different
      expect(parts1[3]).not.toBe(parts2[3]);
    });
  });

  describe('loadFlows Method', () => {
    test('should create empty flows file when none exists', async () => {
      // Act
      const flows = await flowStorage.loadFlows();

      // Assert
      expect(flows).toEqual([]);
      expect(fs.existsSync(flowStorage.getFlowsFilePath())).toBe(true);
    });

    test('should load flows from existing file', async () => {
      // Arrange
      const testFlows = [
        { id: 'flow-1', name: 'Flow 1', createdAt: '2023-01-01T00:00:00.000Z' },
        { id: 'flow-2', name: 'Flow 2', createdAt: '2023-01-02T00:00:00.000Z' }
      ];
      
      await flowStorage.saveFlows(testFlows);

      // Act
      const loadedFlows = await flowStorage.loadFlows();

      // Assert
      expect(loadedFlows).toHaveLength(2);
      expect(loadedFlows[0].name).toBe('Flow 2'); // Newest first due to sorting
      expect(loadedFlows[1].name).toBe('Flow 1');
    });

    test('should sort flows by creation date (newest first)', async () => {
      // Arrange
      const testFlows = [
        { id: 'flow-1', name: 'Oldest', createdAt: '2023-01-01T00:00:00.000Z' },
        { id: 'flow-2', name: 'Newest', createdAt: '2023-01-03T00:00:00.000Z' },
        { id: 'flow-3', name: 'Middle', createdAt: '2023-01-02T00:00:00.000Z' }
      ];
      
      await flowStorage.saveFlows(testFlows);

      // Act
      const loadedFlows = await flowStorage.loadFlows();

      // Assert
      expect(loadedFlows[0].name).toBe('Newest');
      expect(loadedFlows[1].name).toBe('Middle');
      expect(loadedFlows[2].name).toBe('Oldest');
    });

    test('should handle empty flows file', async () => {
      // Arrange
      fs.writeFileSync(flowStorage.getFlowsFilePath(), '', 'utf8');

      // Act
      const flows = await flowStorage.loadFlows();

      // Assert
      expect(flows).toEqual([]);
    });

    test('should handle malformed JSON', async () => {
      // Arrange
      fs.writeFileSync(flowStorage.getFlowsFilePath(), '{ invalid json }', 'utf8');

      // Act & Assert
      await expect(flowStorage.loadFlows()).rejects.toThrow('Failed to parse flows file');
    });

    test('should handle non-array JSON', async () => {
      // Arrange
      fs.writeFileSync(flowStorage.getFlowsFilePath(), '{"not": "array"}', 'utf8');

      // Act & Assert
      await expect(flowStorage.loadFlows()).rejects.toThrow('Invalid flows file format: expected array');
    });

    test('should handle flows without creation date', async () => {
      // Arrange
      const testFlows = [
        { id: 'flow-1', name: 'No Date 1' },
        { id: 'flow-2', name: 'With Date', createdAt: '2023-01-01T00:00:00.000Z' },
        { id: 'flow-3', name: 'No Date 2' }
      ];
      
      await flowStorage.saveFlows(testFlows);

      // Act
      const loadedFlows = await flowStorage.loadFlows();

      // Assert
      expect(loadedFlows).toHaveLength(3);
      // Should not throw error
    });
  });

  describe('saveFlows Method', () => {
    test('should save flows to file', async () => {
      // Arrange
      const testFlows = [
        { id: 'flow-1', name: 'Test Flow 1' },
        { id: 'flow-2', name: 'Test Flow 2' }
      ];

      // Act
      await flowStorage.saveFlows(testFlows);

      // Assert
      expect(fs.existsSync(flowStorage.getFlowsFilePath())).toBe(true);
      
      const content = fs.readFileSync(flowStorage.getFlowsFilePath(), 'utf8');
      const savedFlows = JSON.parse(content);
      
      expect(savedFlows).toHaveLength(2);
      expect(savedFlows[0].name).toBe('Test Flow 1');
      expect(savedFlows[1].name).toBe('Test Flow 2');
    });

    test('should use atomic write operation', async () => {
      // Arrange
      const testFlows = [{ id: 'flow-1', name: 'Atomic Test' }];
      const tempFile = `${flowStorage.getFlowsFilePath()}.tmp`;

      // Act
      await flowStorage.saveFlows(testFlows);

      // Assert
      expect(fs.existsSync(flowStorage.getFlowsFilePath())).toBe(true);
      expect(fs.existsSync(tempFile)).toBe(false); // Temp file should be cleaned up
    });

    test('should validate flows array input', async () => {
      // Act & Assert
      await expect(flowStorage.saveFlows(null as any)).rejects.toThrow('Flows must be an array');
      await expect(flowStorage.saveFlows('invalid' as any)).rejects.toThrow('Flows must be an array');
      await expect(flowStorage.saveFlows({} as any)).rejects.toThrow('Flows must be an array');
    });

    test('should validate required flow fields', async () => {
      // Arrange
      const invalidFlows = [
        { name: 'Missing ID' }, // Missing id
        { id: 'flow-1' } // Missing name
      ];

      // Act & Assert
      await expect(flowStorage.saveFlows(invalidFlows)).rejects.toThrow('missing required field');
    });

    test('should format JSON with proper indentation', async () => {
      // Arrange
      const testFlows = [{ id: 'flow-1', name: 'Formatted Flow' }];

      // Act
      await flowStorage.saveFlows(testFlows);

      // Assert
      const content = fs.readFileSync(flowStorage.getFlowsFilePath(), 'utf8');
      expect(content).toContain('  '); // Should have indentation
      expect(content).toContain('\n'); // Should have newlines
    });

    test('should create directory if it does not exist', async () => {
      // Arrange
      const deepDir = path.join(testDir, 'nested', 'deep', 'storage');
      const deepStorage = new FlowStorage(deepDir);
      const testFlows = [{ id: 'flow-1', name: 'Deep Flow' }];

      // Act
      await deepStorage.saveFlows(testFlows);

      // Assert
      expect(fs.existsSync(deepDir)).toBe(true);
      expect(fs.existsSync(deepStorage.getFlowsFilePath())).toBe(true);
    });
  });

  describe('findFlowIndex Method', () => {
    test('should find correct flow index', () => {
      // Arrange
      const flows = [
        { id: 'flow-1', name: 'First' },
        { id: 'flow-2', name: 'Second' },
        { id: 'flow-3', name: 'Third' }
      ];

      // Act
      const index1 = flowStorage.findFlowIndex(flows, 'flow-1');
      const index2 = flowStorage.findFlowIndex(flows, 'flow-2');
      const index3 = flowStorage.findFlowIndex(flows, 'flow-3');

      // Assert
      expect(index1).toBe(0);
      expect(index2).toBe(1);
      expect(index3).toBe(2);
    });

    test('should return -1 for non-existent flow', () => {
      // Arrange
      const flows = [
        { id: 'flow-1', name: 'First' },
        { id: 'flow-2', name: 'Second' }
      ];

      // Act
      const index = flowStorage.findFlowIndex(flows, 'non-existent');

      // Assert
      expect(index).toBe(-1);
    });

    test('should handle empty flows array', () => {
      // Act
      const index = flowStorage.findFlowIndex([], 'any-id');

      // Assert
      expect(index).toBe(-1);
    });

    test('should validate input parameters', () => {
      // Act & Assert
      expect(() => flowStorage.findFlowIndex(null as any, 'flow-1')).toThrow('Invalid flows parameter');
      expect(() => flowStorage.findFlowIndex('invalid' as any, 'flow-1')).toThrow('Invalid flows parameter');
      expect(() => flowStorage.findFlowIndex([], null as any)).toThrow('Invalid flowId parameter');
      expect(() => flowStorage.findFlowIndex([], '')).toThrow('Invalid flowId parameter');
    });
  });

  describe('applyFilter Method', () => {
    const sampleFlows = [
      {
        id: 'flow-1',
        name: 'Active Flow',
        enabled: true,
        status: 'running',
        trigger: { type: 'manual' },
        actions: [{ type: 'command' }],
        tags: ["production", "important"],
        createdAt: '2023-01-01T00:00:00.000Z'
      },
      {
        id: 'flow-2',
        name: 'Disabled Flow',
        enabled: false,
        status: 'stopped',
        trigger: { type: 'time' },
        actions: [{ type: 'http' }, { type: 'delay' }],
        tags: ["development"],
        createdAt: '2023-01-02T00:00:00.000Z'
      },
      {
        id: 'flow-3',
        name: 'Test Flow',
        enabled: true,
        status: 'pending',
        trigger: { type: 'file_change' },
        actions: [{ type: 'script' }, { type: 'command' }, { type: 'http' }],
        tags: ['testing', "important"],
        createdAt: '2023-01-03T00:00:00.000Z'
      }
    ];

    test('should return all flows when no filter provided', () => {
      // Act
      const result = flowStorage.applyFilter(sampleFlows, null);

      // Assert
      expect(result).toEqual(sampleFlows);
    });

    test('should filter by enabled status', () => {
      // Act
      const enabledFlows = flowStorage.applyFilter(sampleFlows, { enabled: true });
      const disabledFlows = flowStorage.applyFilter(sampleFlows, { enabled: false });

      // Assert
      expect(enabledFlows).toHaveLength(2);
      expect(enabledFlows.every(f => f.enabled)).toBe(true);
      
      expect(disabledFlows).toHaveLength(1);
      expect(disabledFlows[0].name).toBe('Disabled Flow');
    });

    test('should filter by name (case-insensitive partial match)', () => {
      // Act
      const testFlows = flowStorage.applyFilter(sampleFlows, { name: 'test' });
      const flowFlows = flowStorage.applyFilter(sampleFlows, { name: 'Flow' });

      // Assert
      expect(testFlows).toHaveLength(1);
      expect(testFlows[0].name).toBe('Test Flow');
      
      expect(flowFlows).toHaveLength(3); // All contain "Flow"
    });

    test('should filter by status', () => {
      // Act
      const runningFlows = flowStorage.applyFilter(sampleFlows, { status: 'running' });
      const pendingFlows = flowStorage.applyFilter(sampleFlows, { status: 'pending' });

      // Assert
      expect(runningFlows).toHaveLength(1);
      expect(runningFlows[0].name).toBe('Active Flow');
      
      expect(pendingFlows).toHaveLength(1);
      expect(pendingFlows[0].name).toBe('Test Flow');
    });

    test('should filter by trigger type', () => {
      // Act
      const manualFlows = flowStorage.applyFilter(sampleFlows, { triggerType: 'manual' });
      const timeFlows = flowStorage.applyFilter(sampleFlows, { triggerType: 'time' });

      // Assert
      expect(manualFlows).toHaveLength(1);
      expect(manualFlows[0].trigger.type).toBe('manual');
      
      expect(timeFlows).toHaveLength(1);
      expect(timeFlows[0].trigger.type).toBe('time');
    });

    test('should filter by tags', () => {
      // Act
      const importantFlows = flowStorage.applyFilter(sampleFlows, { tags: ["important"] });
      const productionFlows = flowStorage.applyFilter(sampleFlows, { tags: ["production"] });
      const multiTagFlows = flowStorage.applyFilter(sampleFlows, { tags: ["production", "important"] });

      // Assert
      expect(importantFlows).toHaveLength(2);
      expect(productionFlows).toHaveLength(1);
      expect(multiTagFlows).toHaveLength(1); // Must have ALL tags
    });

    test('should filter by date range', () => {
      // Act
      const afterFlows = flowStorage.applyFilter(sampleFlows, { createdAfter: '2023-01-02T00:00:00.000Z' });
      const beforeFlows = flowStorage.applyFilter(sampleFlows, { createdBefore: '2023-01-02T00:00:00.000Z' });

      // Assert
      expect(afterFlows).toHaveLength(2); // flow-2 and flow-3
      expect(beforeFlows).toHaveLength(2); // flow-1 and flow-2
    });

    test('should filter by action count', () => {
      // Act
      const minActions = flowStorage.applyFilter(sampleFlows, { minActions: 2 });
      const maxActions = flowStorage.applyFilter(sampleFlows, { maxActions: 1 });
      const exactActions = flowStorage.applyFilter(sampleFlows, { minActions: 2, maxActions: 2 });

      // Assert
      expect(minActions).toHaveLength(2); // flow-2 (2 actions) and flow-3 (3 actions)
      expect(maxActions).toHaveLength(1); // flow-1 (1 action)
      expect(exactActions).toHaveLength(1); // flow-2 (exactly 2 actions)
    });

    test('should combine multiple filters', () => {
      // Act
      const complexFilter = flowStorage.applyFilter(sampleFlows, {
        enabled: true,
        tags: ["important"],
        minActions: 2
      });

      // Assert
      expect(complexFilter).toHaveLength(1);
      expect(complexFilter[0].name).toBe('Test Flow');
    });

    test('should validate input parameters', () => {
      // Act & Assert
      expect(() => flowStorage.applyFilter(null as any, {})).toThrow('Invalid flows parameter');
      expect(() => flowStorage.applyFilter('invalid' as any, {})).toThrow('Invalid flows parameter');
    });

    test('should handle flows without optional fields', () => {
      // Arrange
      const minimalFlows = [
        { id: 'flow-1', name: 'Minimal Flow' } // Missing most optional fields
      ];

      // Act
      const result = flowStorage.applyFilter(minimalFlows, {
        enabled: true,
        tags: ['test'],
        triggerType: 'manual'
      });

      // Assert
      expect(result).toHaveLength(0); // Should not match due to missing fields
    });
  });

  describe('generateExecutionId Method', () => {
    test('should generate unique execution IDs', () => {
      // Act
      const id1 = flowStorage.generateExecutionId();
      const id2 = flowStorage.generateExecutionId();
      const id3 = flowStorage.generateExecutionId();

      // Assert
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id3).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    test('should include flow information when provided', () => {
      // Arrange
      const execution = { flowId: 'my-flow-123' };

      // Act
      const executionId = flowStorage.generateExecutionId(execution);

      // Assert
      expect(executionId).toContain('my');
      expect(executionId).toContain('exec');
    });

    test('should use default prefix when no flow info provided', () => {
      // Act
      const id1 = flowStorage.generateExecutionId();
      const id2 = flowStorage.generateExecutionId({});

      // Assert
      expect(id1).toContain('exec-exec');
      expect(id2).toContain('exec-exec');
    });

    test('should include timestamp, counter, and random suffix', () => {
      // Act
      const executionId = flowStorage.generateExecutionId();

      // Assert
      const parts = executionId.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(5); // prefix-exec-timestamp-counter-random
      expect(parts).toContain('exec');
    });
  });

  describe('Integration and File Operations', () => {
    test('should handle In Progress save and load cycle', async () => {
      // Arrange
      const originalFlows = [
        { id: 'flow-1', name: 'Test Flow 1', enabled: true },
        { id: 'flow-2', name: 'Test Flow 2', enabled: false }
      ];

      // Act
      await flowStorage.saveFlows(originalFlows);
      const loadedFlows = await flowStorage.loadFlows();

      // Assert
      expect(loadedFlows).toHaveLength(2);
      expect(loadedFlows).toEqual(expect.arrayContaining(originalFlows));
    });

    test('should validate flows file integrity', async () => {
      // Arrange
      const testFlows = [
        { id: 'flow-1', name: 'Valid Flow 1', createdAt: new Date().toISOString() },
        { id: 'flow-2', name: 'Valid Flow 2', createdAt: new Date().toISOString() }
      ];

      await flowStorage.saveFlows(testFlows);

      // Act
      const validation = await flowStorage.validateFlowsFile();

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect duplicate IDs in flows file', async () => {
      // Arrange
      const duplicateFlows = [
        { id: 'flow-1', name: 'Flow 1', createdAt: new Date().toISOString() },
        { id: 'flow-1', name: 'Duplicate Flow', createdAt: new Date().toISOString() }
      ];

      await flowStorage.saveFlows(duplicateFlows);

      // Act
      const validation = await flowStorage.validateFlowsFile();

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toMatch(/Duplicate flow IDs/);
    });

    test('should reset counters', () => {
      // Arrange
      flowStorage.generateFlowId();
      flowStorage.generateExecutionId();

      // Act
      flowStorage.resetCounters();
      const newFlowId = flowStorage.generateFlowId();
      const newExecId = flowStorage.generateExecutionId();

      // Assert
      expect(newFlowId).toContain('-1'); // Counter reset to 1
      expect(newExecId).toContain('-1'); // Counter reset to 1
    });
  });
});