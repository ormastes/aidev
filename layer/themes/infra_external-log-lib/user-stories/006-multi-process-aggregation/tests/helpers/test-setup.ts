import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../src/internal/log-aggregator';

/**
 * Common test setup utilities to reduce code duplication
 */

export interface TestLogCollector {
  logs: any[];
  processEvents: any[];
  cleanup: () => void;
}

/**
 * Sets up standard log collection and aggregation pipeline
 * Eliminates duplication across integration tests
 */
export function setupLogCollectionPipeline(
  logMonitor: LogMonitor, 
  logAggregator: LogAggregator,
  options?: {
    trackEvents?: boolean;
    onLogEntry?: (entry: any) => void;
  }
): TestLogCollector {
  const logs: any[] = [];
  const processEvents: any[] = [];
  
  // Standard log entry handler - most common pattern in tests
  const logEntryHandler = (entry: any) => {
    logs.push(entry);
    
    // Standard aggregation pattern
    logAggregator.addLog(entry.processId, {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      source: entry.source === 'stdout' ? 'stdout' : 'stderr'
    });
    
    // Custom handler if provided
    if (options?.onLogEntry) {
      options.onLogEntry(entry);
    }
  };
  
  logMonitor.on('log-entry', logEntryHandler);
  
  // Optional event tracking
  if (options?.trackEvents) {
    const exitHandler = (event: any) => {
      processEvents.push({ ...event, type: 'exited' });
      logAggregator.markProcessComplete(event.processId, event.code);
    };
    
    const crashHandler = (event: any) => {
      processEvents.push({ ...event, type: 'crashed' });
      logAggregator.markProcessComplete(event.processId, event.code || 1);
    };
    
    const stopHandler = (event: any) => {
      processEvents.push({ ...event, type: 'stopped' });
      logAggregator.markProcessStopped(event.processId);
    };
    
    logMonitor.on('process-exited', exitHandler);
    logMonitor.on('process-crashed', crashHandler);
    logMonitor.on('monitoring-stopped', stopHandler);
  }
  
  return {
    logs,
    processEvents,
    cleanup: () => {
      logMonitor.removeAllListeners();
    }
  };
}

/**
 * Standard test lifecycle setup pattern
 * Eliminates boilerplate in beforeEach/afterEach
 */
export async function setupTestEnvironment(): Promise<{
  logMonitor: LogMonitor;
  logAggregator: LogAggregator;
  cleanup: () => Promise<void>;
}> {
  const logMonitor = new LogMonitor();
  const logAggregator = new LogAggregator();
  
  return {
    logMonitor,
    logAggregator,
    cleanup: async () => {
      await logMonitor.stopAllMonitoring();
      logAggregator.clear();
    }
  };
}

/**
 * Common process command patterns used in tests
 * Reduces duplication of command string construction
 */
export const TestProcessCommands = {
  quickComplete: (name: string, messages: string[] = [`[${name}] Starting`, `[${name}] In Progress`]) => 
    `node -e "${messages.map(msg => `console.log('${msg}')`).join('; ')}; process.exit(0);"`,
    
  timedProcess: (name: string, duration: number, messages: string[] = [`[${name}] Running`]) =>
    `node -e "console.log('[${name}] Starting'); ${messages.map((msg, i) => `setTimeout(() => console.log('${msg}'), ${(i + 1) * duration / messages.length})`).join('; ')}; setTimeout(() => { console.log('[${name}] In Progress'); process.exit(0); }, ${duration});"`,
    
  crashingProcess: (name: string, errorMessage?: string) =>
    `node -e "console.log('[${name}] Starting'); console.error('[${name}] ${errorMessage || 'Fatal error'}'); process.exit(1);"`,
    
  longRunning: (name: string, interval: number = 100) =>
    `node -e "console.log('[${name}] Starting'); setInterval(() => console.log('[${name}] Heartbeat'), ${interval});"`,
    
  burstLogging: (name: string, count: number) =>
    `node -e "console.log('[${name}] Starting'); for(let i = 0; i < ${count}; i++) { console.log('[${name}] Log ' + i); } console.log('[${name}] In Progress'); process.exit(0);"`
};

/**
 * Common assertion patterns for process validation
 */
export function assertProcessLogs(logs: any[], processId: string, expectedPatterns: string[]) {
  const processLogs = logs.filter(log => log.processId === processId);
  expect(processLogs.length).toBeGreaterThanOrEqual(expectedPatterns.length);
  
  expectedPatterns.forEach(pattern => {
    expect(processLogs.some(log => log.message.includes(pattern))).toBe(true);
  });
  
  return processLogs;
}

/**
 * Wait for processes with timeout and error handling
 */
export async function waitForProcesses(duration: number, description: string = 'processes to complete') {
  console.log(`⏳ Waiting for ${description}...`);
  await new Promise(resolve => setTimeout(resolve, duration));
}