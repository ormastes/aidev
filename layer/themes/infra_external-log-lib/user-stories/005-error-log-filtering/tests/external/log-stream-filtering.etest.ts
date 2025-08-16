import { LogStream } from '../../../004-real-time-streaming/src/external/log-stream';
import { Readable } from 'stream';

describe('LogStream Filtering External Test', () => {
  let logStream: LogStream;
  let mockStdout: Readable;
  let mockStderr: Readable;

  beforeEach(() => {
    mockStdout = new Readable({ read() {} });
    mockStderr = new Readable({ read() {} });
    logStream = new LogStream(mockStdout, mockStderr);
  });

  afterEach(() => {
    logStream.cleanup();
    mockStdout.destroy();
    mockStderr.destroy();
  });

  it('should filter logs by level through external interface', async () => {
    const logEntries: any[] = [];
    
    logStream.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Set filter to only allow error level logs
    logStream.setLogLevelFilter(['error']);

    // Simulate mixed log data
    mockStdout.push('INFO: Application started\n');
    mockStderr.push('ERROR: Database connection failed\n');
    mockStdout.push('DEBUG: Processing request\n');
    mockStderr.push('ERROR: Authentication failed\n');
    mockStdout.push('INFO: Request In Progress\n');
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify only error logs In Progress through
    expect(logEntries.length).toBeGreaterThan(0);
    
    const errorLogs = logEntries.filter(log => log.level === 'error');
    const infoLogs = logEntries.filter(log => log.level === 'info');
    const debugLogs = logEntries.filter(log => log.level === 'debug');

    expect(errorLogs.length).toBeGreaterThan(0);
    expect(infoLogs.length).toBe(0);
    expect(debugLogs.length).toBe(0);

    // Verify all remaining logs are error level
    logEntries.forEach(entry => {
      expect(entry.level).toBe('error');
    });
  });

  it('should support multiple log levels in filter', async () => {
    const logEntries: any[] = [];
    
    logStream.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Set filter to allow error and debug levels
    logStream.setLogLevelFilter(['error', 'debug']);

    // Simulate mixed log data
    mockStdout.push('INFO: Application started\n');
    mockStderr.push('ERROR: Database connection failed\n');
    mockStdout.push('DEBUG: Processing request\n');
    mockStderr.push('ERROR: Network timeout\n');
    mockStdout.push('INFO: Request In Progress\n');
    mockStdout.push('DEBUG: Another debug message\n');
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify error and debug logs In Progress through
    expect(logEntries.length).toBeGreaterThan(0);
    
    const errorLogs = logEntries.filter(log => log.level === 'error');
    const debugLogs = logEntries.filter(log => log.level === 'debug');
    const infoLogs = logEntries.filter(log => log.level === 'info');

    expect(errorLogs.length).toBeGreaterThan(0);
    expect(debugLogs.length).toBeGreaterThan(0);
    expect(infoLogs.length).toBe(0);

    // Verify all logs are error or debug level
    logEntries.forEach(entry => {
      expect(['error', 'debug']).toContain(entry.level);
    });
  });

  it('should handle dynamic filter updates', async () => {
    const phase1Logs: any[] = [];
    const phase2Logs: any[] = [];
    let isPhase2 = false;
    
    logStream.on('log-entry', (entry: any) => {
      if (isPhase2) {
        phase2Logs.push(entry);
      } else {
        phase1Logs.push(entry);
      }
    });

    // Phase 1: Only allow error logs
    logStream.setLogLevelFilter(['error']);

    // Send some logs
    mockStdout.push('INFO: Phase 1 info\n');
    mockStderr.push('ERROR: Phase 1 error\n');
    mockStdout.push('DEBUG: Phase 1 debug\n');

    // Wait for phase 1 processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Phase 2: Update filter to allow info and error
    isPhase2 = true;
    logStream.setLogLevelFilter(['info', 'error']);

    // Send more logs
    mockStdout.push('INFO: Phase 2 info\n');
    mockStderr.push('ERROR: Phase 2 error\n');
    mockStdout.push('DEBUG: Phase 2 debug\n');
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for phase 2 processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify phase 1 filtering (only errors)
    expect(phase1Logs.length).toBeGreaterThan(0);
    phase1Logs.forEach(entry => {
      expect(entry.level).toBe('error');
    });

    // Verify phase 2 filtering (info and error)
    expect(phase2Logs.length).toBeGreaterThan(0);
    const phase2Levels = phase2Logs.map(entry => entry.level);
    expect(phase2Levels).toContain('error');
    expect(phase2Levels).toContain('info');
    expect(phase2Levels).not.toContain('debug');
  });

  it('should handle empty filter arrays (allow all)', async () => {
    const logEntries: any[] = [];
    
    logStream.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Set empty filter (should allow all logs)
    logStream.setLogLevelFilter([]);

    // Simulate mixed log data
    mockStdout.push('INFO: Application started\n');
    mockStderr.push('ERROR: Database connection failed\n');
    mockStdout.push('DEBUG: Processing request\n');
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify all log levels are captured
    expect(logEntries.length).toBeGreaterThan(0);
    
    const levels = logEntries.map(entry => entry.level);
    expect(levels).toContain('info');
    expect(levels).toContain('error');
    expect(levels).toContain('debug');
  });

  it('should handle log filtering with individual entries', async () => {
    const logEntries: any[] = [];
    
    logStream.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Set filter for errors only
    logStream.setLogLevelFilter(['error']);

    // Send multiple logs quickly
    for (let i = 0; i < 5; i++) {
      mockStdout.push(`INFO: Info log ${i}\n`);
      mockStderr.push(`ERROR: Error log ${i}\n`);
      mockStdout.push(`DEBUG: Debug log ${i}\n`);
    }
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify only filtered logs are captured
    expect(logEntries.length).toBeGreaterThan(0);
    
    // All captured entries should be error level
    logEntries.forEach(entry => {
      expect(entry.level).toBe('error');
    });

    // Should have filtered out info and debug logs
    expect(logEntries.length).toBeLessThan(15); // Less than total (15 logs sent)
    expect(logEntries.length).toBeGreaterThan(0); // But some errors should pass
  });

  it('should handle malformed log entries during filtering', async () => {
    const logEntries: any[] = [];
    const errorEvents: any[] = [];
    
    logStream.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });
    
    logStream.on('parse-error', (error: any) => {
      errorEvents.push(error);
    });

    // Set error filter
    logStream.setLogLevelFilter(['error']);

    // Send mix of valid and malformed logs
    mockStdout.push('INFO: Valid info log\n');
    mockStderr.push('ERROR: Valid error log\n');
    mockStdout.push('Invalid log without level\n');
    mockStderr.push('ERROR: Another valid error\n');
    mockStdout.push('DEBUG: Valid debug log\n');
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should have captured error logs and handled malformed ones gracefully
    expect(logEntries.length).toBeGreaterThan(0);
    
    // All captured logs should be error level
    logEntries.forEach(entry => {
      expect(entry.level).toBe('error');
    });

    // Should have at least 2 error logs from the test data
    const errorLogs = logEntries.filter(log => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThanOrEqual(2);
  });

  it('should preserve log entry metadata during filtering', async () => {
    const logEntries: any[] = [];
    
    logStream.on('log-entry', (entry: any) => {
      logEntries.push(entry);
    });

    // Set filter for error logs
    logStream.setLogLevelFilter(['error']);

    // Send error logs that should have metadata preserved
    mockStderr.push('ERROR: Database connection failed\n');
    mockStderr.push('ERROR: Network timeout occurred\n');
    
    // End streams
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify metadata is preserved for filtered logs
    expect(logEntries.length).toBeGreaterThan(0);
    
    logEntries.forEach(entry => {
      expect(entry.level).toBe('error');
      expect(entry.message).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.source).toBe('stderr'); // Error logs should come from stderr
    });
  });
});