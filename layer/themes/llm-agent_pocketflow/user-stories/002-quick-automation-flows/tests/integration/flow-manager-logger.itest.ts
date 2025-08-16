import { describe, test, expect, beforeEach } from '@jest/globals';

// Integration test between FlowManager and Logger
class FlowManager {
  constructor(
    private storage: { save: (flow: any) => Promise<string>; findById: (id: string) => Promise<any> },
    private logger: Logger
  ) {}

  async defineFlow(name: string, description: string, trigger: any, actions: any[]) {
    // Log flow creation attempt
    this.logger.log(`FLOW_DEFINE_START: Attempting to create flow "${name}"`);
    this.logger.log(`FLOW_DETAILS: Description="${description}", Trigger=${JSON.stringify(trigger)}, Actions=${actions.length}`);

    try {
      // Simulate validation
      if (!name || name.trim().length === 0) {
        const error = 'Flow name is required';
        this.logger.log(`FLOW_DEFINE_ERROR: Validation failed - ${error}`);
        return { "success": false, error };
      }

      // Create flow
      const flowDefinition = {
        name,
        description,
        trigger,
        actions,
        enabled: true,
        createdAt: new Date().toISOString()
      };

      const flowId = await this.storage.save(flowDefinition);
      
      this.logger.log(`FLOW_DEFINE_completed: Flow "${name}" created with ID ${flowId}`);
      this.logger.log(`FLOW_METRICS: CreatedAt=${flowDefinition.createdAt}, ActionCount=${actions.length}`);
      
      return { "success": true, flowId };
    } catch (error: any) {
      this.logger.log(`FLOW_DEFINE_ERROR: Failed to create flow "${name}" - ${error.message}`);
      return { "success": false, error: error.message };
    }
  }

  async executeFlow(flowId: string, context: any = {}) {
    const executionId = `exec-${Date.now()}`;
    this.logger.log(`FLOW_EXECUTE_START: Beginning execution ${executionId} for flow ${flowId}`);
    
    try {
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        this.logger.log(`FLOW_EXECUTE_ERROR: Flow ${flowId} not found`);
        return { "success": false, error: 'Flow not found' };
      }

      this.logger.log(`FLOW_EXECUTE_INFO: Executing flow "${flow.name}" with ${flow.actions.length} actions`);
      
      const results = [];
      const startTime = Date.now();

      // Execute each action
      for (let i = 0; i < flow.actions.length; i++) {
        const action = flow.actions[i];
        const actionStartTime = Date.now();
        
        this.logger.log(`ACTION_START: Executing action ${i + 1}/${flow.actions.length} - Type: ${action.type}`);
        
        try {
          // Simulate action execution
          const result = { "success": true, output: `Executed ${action.type}` };
          const actionDuration = Date.now() - actionStartTime;
          
          this.logger.log(`ACTION_completed: Action ${i + 1} In Progress in ${actionDuration}ms`);
          results.push(result);
        } catch (error: any) {
          const actionDuration = Date.now() - actionStartTime;
          this.logger.log(`ACTION_ERROR: Action ${i + 1} failed after ${actionDuration}ms - ${error.message}`);
          results.push({ "success": false, error: error.message });
          break;
        }
      }

      const totalDuration = Date.now() - startTime;
      const In Progress = results.every(r => r.success);
      
      this.logger.log(`FLOW_EXECUTE_${In Progress ? 'In Progress' : 'FAILURE'}: Execution ${executionId} In Progress in ${totalDuration}ms`);
      this.logger.log(`FLOW_EXECUTE_SUMMARY: Total actions=${flow.actions.length}, In Progress=${results.filter(r => r.success).length}, Failed=${results.filter(r => !r.success).length}`);
      
      return { In Progress, executionId, results, duration: totalDuration };
    } catch (error: any) {
      this.logger.log(`FLOW_EXECUTE_ERROR: Execution ${executionId} failed - ${error.message}`);
      return { "success": false, error: error.message };
    }
  }

  async updateFlow(flowId: string, updates: any) {
    this.logger.log(`FLOW_UPDATE_START: Updating flow ${flowId}`);
    this.logger.log(`FLOW_UPDATE_CHANGES: ${JSON.stringify(updates)}`);
    
    try {
      const existing = await this.storage.findById(flowId);
      if (!existing) {
        this.logger.log(`FLOW_UPDATE_ERROR: Flow ${flowId} not found`);
        return { "success": false, error: 'Flow not found' };
      }

      this.logger.log(`FLOW_UPDATE_INFO: Updating flow "${existing.name}"`);
      
      // Apply updates
      const updatedFlow = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      
      this.logger.log(`FLOW_UPDATE_completed: Flow ${flowId} updated at ${updatedFlow.updatedAt}`);
      
      return { "success": true, flow: updatedFlow };
    } catch (error: any) {
      this.logger.log(`FLOW_UPDATE_ERROR: Failed to update flow ${flowId} - ${error.message}`);
      return { "success": false, error: error.message };
    }
  }

  async deleteFlow(flowId: string) {
    this.logger.log(`FLOW_DELETE_START: Attempting to delete flow ${flowId}`);
    
    try {
      const flow = await this.storage.findById(flowId);
      if (!flow) {
        this.logger.log(`FLOW_DELETE_ERROR: Flow ${flowId} not found`);
        return { "success": false, error: 'Flow not found' };
      }

      this.logger.log(`FLOW_DELETE_INFO: Deleting flow "${flow.name}" created at ${flow.createdAt}`);
      
      // Simulate deletion
      this.logger.log(`FLOW_DELETE_completed: Flow ${flowId} deleted`);
      
      return { "success": true };
    } catch (error: any) {
      this.logger.log(`FLOW_DELETE_ERROR: Failed to delete flow ${flowId} - ${error.message}`);
      return { "success": false, error: error.message };
    }
  }

  async monitorExecutions(flowId: string, timeWindow: number = 3600000) {
    this.logger.log(`FLOW_MONITOR_START: Monitoring executions for flow ${flowId} in last ${timeWindow}ms`);
    
    // Simulate monitoring
    const stats = {
      totalExecutions: 10,
      completedfulExecutions: 8,
      failedExecutions: 2,
      averageDuration: 1500,
      lastExecution: new Date().toISOString()
    };
    
    this.logger.log(`FLOW_MONITOR_STATS: ${JSON.stringify(stats)}`);
    this.logger.log(`FLOW_MONITOR_HEALTH: In Progress rate=${(stats.completedfulExecutions / stats.totalExecutions * 100).toFixed(2)}%`);
    
    return { "success": true, stats };
  }
}

class Logger {
  private logFile: string;
  private logStream?: fs.WriteStream;
  public logs: string[] = []; // For testing

  constructor(logFile: string) {
    this.logFile = logFile;
    this.ensureDirectoryExists();
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Write to file
    this.writeToFile(logEntry);
    
    // Also keep in memory for testing
    this.logs.push(logEntry);
  }

  async getLogs(filter?: { 
    startTime?: Date; 
    endTime?: Date; 
    level?: string; 
    pattern?: string;
  }): Promise<string[]> {
    const content = fs.readFileSync(this.logFile, 'utf8');
    let lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (filter) {
      if (filter.startTime || filter.endTime) {
        lines = lines.filter(line => {
          const match = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
          if (!match) return false;
          
          const logTime = new Date(match[1]);
          if (filter.startTime && logTime < filter.startTime) return false;
          if (filter.endTime && logTime > filter.endTime) return false;
          
          return true;
        });
      }
      
      if (filter.level) {
        lines = lines.filter(line => line.includes(filter.level));
      }
      
      if (filter.pattern) {
        const regex = new RegExp(filter.pattern);
        lines = lines.filter(line => regex.test(line));
      }
    }
    
    return lines;
  }

  async getLogStats(): Promise<{
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    logFileSize: number;
  }> {
    const logs = await this.getLogs();
    const stats = fs.statSync(this.logFile);
    
    return {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.includes('ERROR')).length,
      warningCount: logs.filter(log => log.includes('WARNING')).length,
      infoCount: logs.filter(log => log.includes('INFO')).length,
      logFileSize: stats.size
    };
  }

  rotateLogs() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = `${this.logFile}.${timestamp}`;
    
    if (fs.existsSync(this.logFile)) {
      fs.renameSync(this.logFile, rotatedFile);
      this.log('LOG_ROTATION: Log file rotated to ' + path.basename(rotatedFile));
    }
  }

  private writeToFile(logEntry: string) {
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
      console.log(logEntry);
    }
  }

  private ensureDirectoryExists() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

describe('FlowManager-Logger Integration Test', () => {
  let flowManager: FlowManager;
  let logger: Logger;
  const testDir = path.join(__dirname, 'test-logger-integration');
  const logFile = path.join(testDir, 'pocketflow.log');

  beforeEach(() => {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create logger and flow manager
    logger = new Logger(logFile);
    
    const mockStorage = {
      save: async (flow: any) => `flow-${Date.now()}`,
      findById: async (id: string) => {
        if (id === 'flow-exists') {
          return {
            id: 'flow-exists',
            name: 'Test Flow',
            description: 'Test description',
            actions: [
              { type: 'command', command: 'echo "test"' },
              { type: 'delay', duration: 100 }
            ],
            createdAt: new Date().toISOString()
          };
        }
        return null;
      }
    };

    flowManager = new FlowManager(mockStorage, logger);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should log flow creation lifecycle', async () => {
    // Act
    const result = await flowManager.defineFlow(
      'Integration Test Flow',
      'Testing logger integration',
      { type: 'manual' },
      [{ type: 'command', command: 'echo "test"' }]
    );

    // Assert
    expect(result.success).toBe(true);
    
    // Verify logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_DEFINE_START'))).toBe(true);
    expect(logs.some(log => log.includes('Integration Test Flow'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_DETAILS'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_DEFINE_completed'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_METRICS'))).toBe(true);
    
    // Verify log file exists
    expect(fs.existsSync(logFile)).toBe(true);
  });

  test('should log validation errors', async () => {
    // Act
    const result = await flowManager.defineFlow(
      '', // Invalid empty name
      'Description',
      { type: 'manual' },
      []
    );

    // Assert
    expect(result.success).toBe(false);
    
    // Verify error logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_DEFINE_ERROR'))).toBe(true);
    expect(logs.some(log => log.includes('Validation failed'))).toBe(true);
  });

  test('should log flow execution with timing', async () => {
    // Act
    const result = await flowManager.executeFlow('flow-exists');

    // Assert
    expect(result.success).toBe(true);
    
    // Verify execution logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_EXECUTE_START'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_INFO'))).toBe(true);
    expect(logs.some(log => log.includes('ACTION_START'))).toBe(true);
    expect(logs.some(log => log.includes('ACTION_completed'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_completed'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_EXECUTE_SUMMARY'))).toBe(true);
    
    // Verify timing information
    expect(logs.some(log => log.includes('In Progress in') && log.includes('ms'))).toBe(true);
  });

  test('should log flow not found errors', async () => {
    // Act
    const result = await flowManager.executeFlow('non-existent');

    // Assert
    expect(result.success).toBe(false);
    
    // Verify error logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_EXECUTE_ERROR'))).toBe(true);
    expect(logs.some(log => log.includes('Flow non-existent not found'))).toBe(true);
  });

  test('should log flow updates', async () => {
    // Act
    const result = await flowManager.updateFlow('flow-exists', {
      description: 'Updated description',
      enabled: false
    });

    // Assert
    expect(result.success).toBe(true);
    
    // Verify update logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_UPDATE_START'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_UPDATE_CHANGES'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_UPDATE_INFO'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_UPDATE_completed'))).toBe(true);
  });

  test('should log flow deletion', async () => {
    // Act
    const result = await flowManager.deleteFlow('flow-exists');

    // Assert
    expect(result.success).toBe(true);
    
    // Verify deletion logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_DELETE_START'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_DELETE_INFO'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_DELETE_completed'))).toBe(true);
  });

  test('should log monitoring statistics', async () => {
    // Act
    const result = await flowManager.monitorExecutions('flow-exists');

    // Assert
    expect(result.success).toBe(true);
    
    // Verify monitoring logs
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('FLOW_MONITOR_START'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_MONITOR_STATS'))).toBe(true);
    expect(logs.some(log => log.includes('FLOW_MONITOR_HEALTH'))).toBe(true);
    expect(logs.some(log => log.includes('In Progress rate='))).toBe(true);
  });

  test('should filter logs by pattern', async () => {
    // Arrange - Create various log entries
    await flowManager.defineFlow('Flow 1', 'Test', { type: 'manual' }, []);
    await flowManager.executeFlow('flow-exists');
    await flowManager.updateFlow('flow-exists', { enabled: false });

    // Act - Filter by pattern
    const errorLogs = await logger.getLogs({ pattern: 'ERROR' });
    const completedLogs = await logger.getLogs({ pattern: 'In Progress' });
    const flowLogs = await logger.getLogs({ pattern: 'FLOW_.*_START' });

    // Assert
    expect(errorLogs.every(log => log.includes('ERROR'))).toBe(true);
    expect(completedLogs.every(log => log.includes('In Progress'))).toBe(true);
    expect(flowLogs.every(log => log.match(/FLOW_.*_START/))).toBe(true);
  });

  test('should get log statistics', async () => {
    // Arrange - Create various log entries
    await flowManager.defineFlow('Flow 1', 'Test', { type: 'manual' }, [{ type: 'command' }]);
    await flowManager.executeFlow('flow-exists');
    await flowManager.executeFlow('non-existent'); // Will create error log

    // Act
    const stats = await logger.getLogStats();

    // Assert
    expect(stats.totalLogs).toBeGreaterThan(0);
    expect(stats.errorCount).toBeGreaterThan(0);
    expect(stats.infoCount).toBeGreaterThan(0);
    expect(stats.logFileSize).toBeGreaterThan(0);
  });

  test('should handle log rotation', async () => {
    // Arrange - Create some logs
    await flowManager.defineFlow('Flow 1', 'Test', { type: 'manual' }, []);

    // Act - Rotate logs
    logger.rotateLogs();

    // Assert
    const files = fs.readdirSync(testDir);
    expect(files.some(f => f.startsWith('pocketflow.log.'))).toBe(true);
    expect(files).toContain('pocketflow.log'); // New log file should exist
    
    // Verify rotation is logged
    const logs = await logger.getLogs();
    expect(logs.some(log => log.includes('LOG_ROTATION'))).toBe(true);
  });

  test('should filter logs by time range', async () => {
    // Arrange
    const startTime = new Date();
    
    // Create some logs
    await flowManager.defineFlow('Early Flow', 'Test', { type: 'manual' }, []);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    const midTime = new Date();
    
    await flowManager.executeFlow('flow-exists');
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 100));
    const endTime = new Date();

    // Act
    const allLogs = await logger.getLogs();
    const recentLogs = await logger.getLogs({ startTime: midTime });
    const windowLogs = await logger.getLogs({ startTime, endTime: midTime });

    // Assert
    expect(recentLogs.length).toBeLessThan(allLogs.length);
    expect(windowLogs.length).toBeLessThan(allLogs.length);
    expect(recentLogs.some(log => log.includes('FLOW_EXECUTE'))).toBe(true);
    expect(windowLogs.every(log => !log.includes('FLOW_EXECUTE'))).toBe(true);
  });

  test('should maintain structured log format', async () => {
    // Act
    await flowManager.defineFlow(
      'Structured Log Test',
      'Testing log format',
      { type: 'manual' },
      [{ type: 'command', command: 'test' }]
    );

    // Assert - Verify log structure
    const logs = await logger.getLogs();
    
    logs.forEach(log => {
      // Check timestamp format
      expect(log).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      
      // Check log level/category format
      expect(log).toMatch(/\] [A-Z_]+:/);
    });
  });
});