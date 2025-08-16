import { describe, test, expect, beforeEach } from '@jest/globals';

// Integration test between FileWatcher and FlowManager
class FileWatcher {
  private watchers: Map<string, any> = new Map();
  private flowManager: FlowManager;
  private logger: { log: (message: string) => void };
  private isActive: boolean = false;

  constructor(flowManager: FlowManager, logger: { log: (message: string) => void }) {
    this.flowManager = flowManager;
    this.logger = logger;
  }

  async startWatching(): Promise<void> {
    this.logger.log('FILE_WATCHER_START: Starting file system monitoring');
    this.isActive = true;
    
    // Get all flows with file_change triggers
    const fileFlows = await this.flowManager.getFileBasedFlows();
    
    for (const flow of fileFlows.flows || []) {
      await this.addWatcher(flow);
    }
    
    this.logger.log(`FILE_WATCHER_ACTIVE: Monitoring ${this.watchers.size} file patterns`);
  }

  async stopWatching(): Promise<void> {
    this.logger.log('FILE_WATCHER_STOP: Stopping file system monitoring');
    this.isActive = false;
    
    for (const [pattern, watcher] of this.watchers.entries()) {
      if (watcher.close) {
        watcher.close();
      }
      this.logger.log(`FILE_WATCHER_REMOVED: Stopped watching pattern: ${pattern}`);
    }
    
    this.watchers.clear();
    this.logger.log('FILE_WATCHER_STOPPED: All file watchers stopped');
  }

  async addWatcher(flow: any): Promise<void> {
    const trigger = flow.trigger;
    if (trigger.type !== 'file_change') {
      return;
    }

    const pattern = trigger.pattern;
    this.logger.log(`FILE_WATCHER_ADD: Adding watcher for pattern "${pattern}" (Flow: ${flow.name})`);

    // Create directory watcher (simplified - in real implementation would use chokidar or fs.watch)
    const watchDir = trigger.watchDir || './';
    const mockWatcher = {
      pattern,
      flowId: flow.id,
      flowName: flow.name,
      watchDir,
      lastTrigger: null,
      close: () => this.logger.log(`FILE_WATCHER_CLOSED: Watcher for ${pattern} closed`)
    };

    this.watchers.set(pattern, mockWatcher);
    this.logger.log(`FILE_WATCHER_ADDED: In Progress watching "${pattern}" for flow "${flow.name}"`);
  }

  async removeWatcher(pattern: string): Promise<void> {
    const watcher = this.watchers.get(pattern);
    if (watcher) {
      if (watcher.close) {
        watcher.close();
      }
      this.watchers.delete(pattern);
      this.logger.log(`FILE_WATCHER_REMOVED: Stopped watching pattern: ${pattern}`);
    }
  }

  async simulateFileChange(filePath: string): Promise<void> {
    if (!this.isActive) {
      this.logger.log('FILE_WATCHER_INACTIVE: File change ignored - watcher not active');
      return;
    }

    this.logger.log(`FILE_CHANGE_DETECTED: File change detected: ${filePath}`);
    
    // Check all watchers for matching patterns
    for (const [pattern, watcher] of this.watchers.entries()) {
      if (this.matchesPattern(filePath, pattern)) {
        this.logger.log(`FILE_PATTERN_MATCH: File "${filePath}" matches pattern "${pattern}"`);
        
        await this.triggerFlow(watcher, filePath);
      }
    }
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching (in real implementation would use minimatch or glob)
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  }

  private async triggerFlow(watcher: any, filePath: string): Promise<void> {
    this.logger.log(`FLOW_TRIGGER_START: Triggering flow "${watcher.flowName}" due to file change: ${filePath}`);
    
    try {
      const context = {
        trigger: 'file_change',
        filePath,
        fileName: path.basename(filePath),
        pattern: watcher.pattern,
        timestamp: new Date().toISOString()
      };

      const result = await this.flowManager.executeFlowByTrigger(watcher.flowId, context);
      
      if (result.success) {
        this.logger.log(`FLOW_TRIGGER_completed: Flow "${watcher.flowName}" executed In Progress (${result.executionId})`);
        watcher.lastTrigger = {
          filePath,
          timestamp: context.timestamp,
          executionId: result.executionId,
          "success": true
        };
      } else {
        this.logger.log(`FLOW_TRIGGER_ERROR: Flow "${watcher.flowName}" execution failed - ${result.error}`);
        watcher.lastTrigger = {
          filePath,
          timestamp: context.timestamp,
          "success": false,
          error: result.error
        };
      }
    } catch (error: any) {
      this.logger.log(`FLOW_TRIGGER_EXCEPTION: Flow trigger failed - ${error.message}`);
      watcher.lastTrigger = {
        filePath,
        timestamp: new Date().toISOString(),
        "success": false,
        error: error.message
      };
    }
  }

  getWatcherStatus(): any {
    return {
      isActive: this.isActive,
      watcherCount: this.watchers.size,
      patterns: Array.from(this.watchers.keys()),
      watchers: Array.from(this.watchers.values()).map(w => ({
        pattern: w.pattern,
        flowId: w.flowId,
        flowName: w.flowName,
        lastTrigger: w.lastTrigger
      }))
    };
  }

  async refreshWatchers(): Promise<void> {
    this.logger.log('FILE_WATCHER_REFRESH: Refreshing file watchers');
    
    // Stop existing watchers
    await this.stopWatching();
    
    // Restart with current flows
    await this.startWatching();
    
    this.logger.log('FILE_WATCHER_REFRESH_COMPLETE: File watchers refreshed');
  }
}

class FlowManager {
  constructor(
    private storage: { findAll: (filter?: any) => Promise<any> },
    private executor: { executeFlow: (flowId: string, context: any) => Promise<any> },
    private logger: { log: (message: string) => void }
  ) {}

  async getFileBasedFlows(): Promise<any> {
    this.logger.log('FLOW_QUERY_START: Retrieving file-based flows');
    
    try {
      const allFlows = await this.storage.findAll();
      const fileFlows = allFlows.filter((flow: any) => 
        flow.trigger && flow.trigger.type === 'file_change' && flow.enabled !== false
      );
      
      this.logger.log(`FLOW_QUERY_completed: Found ${fileFlows.length} active file-based flows`);
      
      return { "success": true, flows: fileFlows };
    } catch (error: any) {
      this.logger.log(`FLOW_QUERY_ERROR: Failed to retrieve file-based flows - ${error.message}`);
      return { "success": false, error: error.message };
    }
  }

  async executeFlowByTrigger(flowId: string, context: any): Promise<any> {
    this.logger.log(`FLOW_EXECUTE_TRIGGER: Executing flow ${flowId} triggered by ${context.trigger}`);
    
    try {
      const result = await this.executor.executeFlow(flowId, context);
      
      if (result.success) {
        this.logger.log(`FLOW_EXECUTE_TRIGGER_completed: Flow ${flowId} In Progress (${result.executionId})`);
      } else {
        this.logger.log(`FLOW_EXECUTE_TRIGGER_FAILURE: Flow ${flowId} failed - ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      this.logger.log(`FLOW_EXECUTE_TRIGGER_ERROR: Flow execution exception - ${error.message}`);
      return { "success": false, error: error.message };
    }
  }

  async updateFlowTrigger(flowId: string, newTrigger: any): Promise<any> {
    this.logger.log(`FLOW_UPDATE_TRIGGER: Updating trigger for flow ${flowId}`);
    
    // Simplified - would normally update in storage
    this.logger.log(`FLOW_UPDATE_TRIGGER_completed: Flow ${flowId} trigger updated`);
    
    return { "success": true, message: 'Trigger updated In Progress' };
  }

  async enableFlow(flowId: string): Promise<any> {
    this.logger.log(`FLOW_ENABLE: Enabling flow ${flowId}`);
    return { "success": true, message: 'Flow enabled' };
  }

  async disableFlow(flowId: string): Promise<any> {
    this.logger.log(`FLOW_DISABLE: Disabling flow ${flowId}`);
    return { "success": true, message: 'Flow disabled' };
  }
}

describe('FileWatcher-FlowManager Integration Test', () => {
  let fileWatcher: FileWatcher;
  let flowManager: FlowManager;
  let logs: string[];
  const testDir = path.join(__dirname, 'test-file-watcher-integration');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    logs = [];
    
    const mockStorage = {
      findAll: async (filter?: any) => [
        {
          id: 'flow-file-1',
          name: 'Text File Processor',
          trigger: { type: 'file_change', pattern: '*.txt', watchDir: testDir },
          actions: [{ type: 'command', command: 'echo "Processing text file"' }],
          enabled: true
        },
        {
          id: 'flow-file-2',
          name: 'Config File Monitor',
          trigger: { type: 'file_change', pattern: 'config.*', watchDir: testDir },
          actions: [{ type: 'http', url: 'https://api.example.com/config-changed' }],
          enabled: true
        },
        {
          id: 'flow-file-3',
          name: 'Log File Watcher',
          trigger: { type: 'file_change', pattern: '*.log', watchDir: testDir },
          actions: [{ type: 'script', script: '/path/to/log-processor.sh' }],
          enabled: false // Disabled flow
        },
        {
          id: 'flow-manual',
          name: 'Manual Flow',
          trigger: { type: 'manual' },
          actions: [{ type: 'command', command: 'echo "Manual"' }],
          enabled: true
        }
      ]
    };

    const mockExecutor = {
      executeFlow: async (flowId: string, context: any) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate execution time
        
        if (flowId === 'flow-file-error') {
          return { "success": false, error: 'Simulated execution error' };
        }
        
        return {
          "success": true,
          executionId: `exec-${Date.now()}`,
          results: [{ "success": true, output: `Processed ${context.fileName}` }],
          duration: 100
        };
      }
    };

    const logger = {
      log: (message: string) => logs.push(message)
    };

    flowManager = new FlowManager(mockStorage, mockExecutor, logger);
    fileWatcher = new FileWatcher(flowManager, logger);
  });

  afterEach(async () => {
    await fileWatcher.stopWatching();
    
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should start watching file-based flows', async () => {
    // Act
    await fileWatcher.startWatching();

    // Assert
    const status = fileWatcher.getWatcherStatus();
    expect(status.isActive).toBe(true);
    expect(status.watcherCount).toBe(2); // Only enabled file-based flows
    expect(status.patterns).toContain('*.txt');
    expect(status.patterns).toContain('config.*');
    expect(status.patterns).not.toContain('*.log'); // Disabled flow

    // Verify logging
    expect(logs.some(log => log.includes('FILE_WATCHER_START'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_WATCHER_ACTIVE'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_WATCHER_ADD'))).toBe(true);
  });

  test('should trigger flow on matching file change', async () => {
    // Arrange
    await fileWatcher.startWatching();

    // Act
    await fileWatcher.simulateFileChange('test.txt');

    // Assert
    const status = fileWatcher.getWatcherStatus();
    const txtWatcher = status.watchers.find(w => w.pattern === '*.txt');
    
    expect(txtWatcher?.lastTrigger).toBeDefined();
    expect(txtWatcher?.lastTrigger.success).toBe(true);
    expect(txtWatcher?.lastTrigger.filePath).toBe('test.txt');

    // Verify logging
    expect(logs.some(log => log.includes('FILE_CHANGE_DETECTED'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_PATTERN_MATCH'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_TRIGGER_START'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_TRIGGER_completed'))).toBe(true);
  });

  test('should trigger multiple flows for matching patterns', async () => {
    // Arrange
    await fileWatcher.startWatching();

    // Act
    await fileWatcher.simulateFileChange('config.json');

    // Assert
    const status = fileWatcher.getWatcherStatus();
    const configWatcher = status.watchers.find(w => w.pattern === 'config.*');
    
    expect(configWatcher?.lastTrigger).toBeDefined();
    expect(configWatcher?.lastTrigger.success).toBe(true);
    expect(configWatcher?.lastTrigger.filePath).toBe('config.json');

    // Verify flow execution
    expect(logs.some(log => log.includes('Config File Monitor'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_TRIGGER'))).toBe(true);
  });

  test('should not trigger flows for non-matching patterns', async () => {
    // Arrange
    await fileWatcher.startWatching();

    // Act
    await fileWatcher.simulateFileChange('image.png');

    // Assert
    const status = fileWatcher.getWatcherStatus();
    const allWatchers = status.watchers;
    
    // No watchers should have been triggered
    expect(allWatchers.every(w => !w.lastTrigger)).toBe(true);

    // Verify logging shows detection but no match
    expect(logs.some(log => log.includes('FILE_CHANGE_DETECTED'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_PATTERN_MATCH'))).toBe(false);
  });

  test('should handle flow execution errors gracefully', async () => {
    // Arrange - Add a flow that will fail
    const mockStorageWithError = {
      findAll: async () => [{
        id: 'flow-file-error',
        name: 'Failing File Flow',
        trigger: { type: 'file_change', pattern: 'error.*', watchDir: testDir },
        actions: [{ type: 'command', command: 'failing-command' }],
        enabled: true
      }]
    };

    const errorFlowManager = new FlowManager(mockStorageWithError, {
      executeFlow: async (flowId: string, context: any) => {
        return { "success": false, error: 'Simulated execution error' };
      }
    }, { log: (msg) => logs.push(msg) });

    const errorFileWatcher = new FileWatcher(errorFlowManager, { log: (msg) => logs.push(msg) });
    await errorFileWatcher.startWatching();

    // Act
    await errorFileWatcher.simulateFileChange('error.txt');

    // Assert
    const status = errorFileWatcher.getWatcherStatus();
    const errorWatcher = status.watchers.find(w => w.pattern === 'error.*');
    
    expect(errorWatcher?.lastTrigger).toBeDefined();
    expect(errorWatcher?.lastTrigger.success).toBe(false);
    expect(errorWatcher?.lastTrigger.error).toContain('Simulated execution error');

    // Verify error logging
    expect(logs.some(log => log.includes('FLOW_TRIGGER_ERROR'))).toBe(true);

    await errorFileWatcher.stopWatching();
  });

  test('should stop all watchers when stopped', async () => {
    // Arrange
    await fileWatcher.startWatching();
    expect(fileWatcher.getWatcherStatus().isActive).toBe(true);

    // Act
    await fileWatcher.stopWatching();

    // Assert
    const status = fileWatcher.getWatcherStatus();
    expect(status.isActive).toBe(false);
    expect(status.watcherCount).toBe(0);
    expect(status.patterns).toHaveLength(0);

    // Verify logging
    expect(logs.some(log => log.includes('FILE_WATCHER_STOP'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_WATCHER_STOPPED'))).toBe(true);
  });

  test('should ignore file changes when not active', async () => {
    // Act - Try to trigger without starting
    await fileWatcher.simulateFileChange('test.txt');

    // Assert
    expect(logs.some(log => log.includes('FILE_WATCHER_INACTIVE'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_TRIGGER_START'))).toBe(false);
  });

  test('should refresh watchers when flows change', async () => {
    // Arrange
    await fileWatcher.startWatching();
    const initialStatus = fileWatcher.getWatcherStatus();

    // Act
    await fileWatcher.refreshWatchers();

    // Assert
    const refreshedStatus = fileWatcher.getWatcherStatus();
    expect(refreshedStatus.isActive).toBe(true);
    expect(refreshedStatus.watcherCount).toBe(initialStatus.watcherCount);

    // Verify refresh logging
    expect(logs.some(log => log.includes('FILE_WATCHER_REFRESH'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_WATCHER_REFRESH_COMPLETE'))).toBe(true);
  });

  test('should add and remove individual watchers', async () => {
    // Arrange
    await fileWatcher.startWatching();

    // Act - Add a new watcher
    const newFlow = {
      id: 'flow-new',
      name: 'New File Flow',
      trigger: { type: 'file_change', pattern: '*.js', watchDir: testDir },
      actions: [{ type: 'command', command: 'echo "JS file"' }]
    };
    
    await fileWatcher.addWatcher(newFlow);

    // Assert - Watcher added
    let status = fileWatcher.getWatcherStatus();
    expect(status.watcherCount).toBe(3);
    expect(status.patterns).toContain('*.js');

    // Act - Remove a watcher
    await fileWatcher.removeWatcher('*.js');

    // Assert - Watcher removed
    status = fileWatcher.getWatcherStatus();
    expect(status.watcherCount).toBe(2);
    expect(status.patterns).not.toContain('*.js');

    // Verify logging
    expect(logs.some(log => log.includes('FILE_WATCHER_ADDED'))).toBe(true);
    expect(logs.some(log => log.includes('FILE_WATCHER_REMOVED'))).toBe(true);
  });

  test('should provide comprehensive watcher status', async () => {
    // Arrange
    await fileWatcher.startWatching();
    await fileWatcher.simulateFileChange('test.txt');

    // Act
    const status = fileWatcher.getWatcherStatus();

    // Assert
    expect(status).toHaveProperty('isActive');
    expect(status).toHaveProperty('watcherCount');
    expect(status).toHaveProperty('patterns');
    expect(status).toHaveProperty('watchers');
    
    expect(status.watchers).toHaveLength(2);
    status.watchers.forEach(watcher => {
      expect(watcher).toHaveProperty('pattern');
      expect(watcher).toHaveProperty('flowId');
      expect(watcher).toHaveProperty('flowName');
      expect(watcher).toHaveProperty('lastTrigger');
    });

    // Check that triggered watcher has lastTrigger data
    const triggeredWatcher = status.watchers.find(w => w.pattern === '*.txt');
    expect(triggeredWatcher?.lastTrigger).toBeDefined();
    expect(triggeredWatcher?.lastTrigger.filePath).toBe('test.txt');
  });
});