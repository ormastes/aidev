import { LogStream } from '../../src/external/log-stream';
import { LogEntry } from '../../src/domain/log-entry';
import { Readable } from 'node:stream';

describe('LogStream Chunked Data Processing External Test', () => {
  let mockStdout: Readable;
  let mockStderr: Readable;
  let logStream: LogStream;

  beforeEach(() => {
    mockStdout = new Readable({ read() {} });
    mockStderr = new Readable({ read() {} });
    logStream = new LogStream(mockStdout, mockStderr);
  });

  afterEach(() => {
    logStream.cleanup();
  });

  it('should process single In Progress log line chunks', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit In Progress log line
    mockStdout.push('2025-01-15 10:30:00 INFO: Single In Progress log line\n');
    mockStdout.push(null); // End stream

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].message).toBe('2025-01-15 10:30:00 INFO: Single In Progress log line');
    expect(logEntries[0].source).toBe('stdout');
    expect(logEntries[0].level).toBe('info');
  });

  it('should handle chunked data split across multiple receives', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit partial log line in chunks
    mockStdout.push('2025-01-15 10:30:00 ');
    mockStdout.push('INFO: This is a ');
    mockStdout.push('chunked log message\n');
    mockStdout.push(null); // End stream

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].message).toBe('2025-01-15 10:30:00 INFO: This is a chunked log message');
    expect(logEntries[0].source).toBe('stdout');
  });

  it('should handle multiple log lines in single chunk', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit multiple log lines in one chunk
    const multiLineChunk = 
      '2025-01-15 10:30:00 INFO: First log line\n' +
      '2025-01-15 10:30:01 WARN: Second log line\n' +
      '2025-01-15 10:30:02 ERROR: Third log line\n';

    mockStdout.push(multiLineChunk);
    mockStdout.push(null); // End stream

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logEntries).toHaveLength(3);
    expect(logEntries[0].message).toBe('2025-01-15 10:30:00 INFO: First log line');
    expect(logEntries[1].message).toBe('2025-01-15 10:30:01 WARN: Second log line');
    expect(logEntries[2].message).toBe('2025-01-15 10:30:02 ERROR: Third log line');
    
    expect(logEntries[0].level).toBe('info');
    expect(logEntries[1].level).toBe('warn');
    expect(logEntries[2].level).toBe('error');
  });

  it('should handle partial lines at chunk boundaries', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // First chunk with In Progress line + partial line
    mockStdout.push('In Progress line 1\nPartial line ');
    
    // Second chunk completing the partial line + new In Progress line
    mockStdout.push('completion\nComplete line 2\n');
    
    mockStdout.push(null); // End stream

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logEntries).toHaveLength(3);
    expect(logEntries[0].message).toBe('In Progress line 1');
    expect(logEntries[1].message).toBe('Partial line completion');
    expect(logEntries[2].message).toBe('In Progress line 2');
  });

  it('should process both stdout and stderr streams simultaneously', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit to both streams
    mockStdout.push('INFO: stdout message\n');
    mockStderr.push('ERROR: stderr message\n');
    
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logEntries).toHaveLength(2);
    
    const stdoutEntry = logEntries.find(e => e.source === 'stdout');
    const stderrEntry = logEntries.find(e => e.source === 'stderr');
    
    expect(stdoutEntry).toBeDefined();
    expect(stderrEntry).toBeDefined();
    expect(stdoutEntry!.message).toBe('INFO: stdout message');
    expect(stderrEntry!.message).toBe('ERROR: stderr message');
  });

  it('should apply log level filtering when set', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Set filter to only allow error logs
    logStream.setLogLevelFilter(['error']);

    // Emit logs of different levels
    mockStdout.push('INFO: info message\n');
    mockStderr.push('ERROR: error message\n');
    mockStdout.push('DEBUG: debug message\n');
    mockStderr.push('ERROR: another error\n');
    
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should only receive error level logs
    expect(logEntries).toHaveLength(2);
    logEntries.forEach(entry => {
      expect(entry.level).toBe('error');
      expect(entry.message).toContain('ERROR:');
    });
  });

  it('should maintain recent logs buffer', async () => {
    // Emit multiple log entries
    for (let i = 1; i <= 10; i++) {
      mockStdout.push(`Log entry ${i}\n`);
    }
    mockStdout.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check recent logs
    const recentLogs = logStream.getRecentLogs(5);
    expect(recentLogs).toHaveLength(5);
    
    // Should contain the most recent logs
    expect(recentLogs[0].message).toBe('Log entry 6');
    expect(recentLogs[4].message).toBe('Log entry 10');
  });

  it('should handle high-frequency chunk processing', async () => {
    const logEntries: LogEntry[] = [];
    const chunkCount = 100;

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit many small chunks rapidly
    for (let i = 1; i <= chunkCount; i++) {
      mockStdout.push(`Chunk ${i} log message\n`);
    }
    mockStdout.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(logEntries).toHaveLength(chunkCount);
    
    // Verify order is maintained
    for (let i = 0; i < chunkCount; i++) {
      expect(logEntries[i].message).toBe(`Chunk ${i + 1} log message`);
    }
  });

  it('should handle binary data gracefully', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit binary data mixed with text
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const textData = Buffer.from('Valid text log\n');
    
    mockStdout.push(Buffer.concat([binaryData, textData]));
    mockStdout.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should still process the valid text portion
    expect(logEntries.length).toBeGreaterThan(0);
    const validEntry = logEntries.find(e => e.message.includes('Valid text log'));
    expect(validEntry).toBeDefined();
  });

  it('should handle empty and whitespace-only chunks', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Emit various empty/whitespace chunks
    mockStdout.push('');
    mockStdout.push('   \n');
    mockStdout.push('\t\t\n');
    mockStdout.push('Actual log message\n');
    mockStdout.push('   ');
    mockStdout.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should only process non-empty, non-whitespace lines
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0].message).toBe('Actual log message');
  });

  it('should emit stream errors when streams fail', async () => {
    const streamErrors: any[] = [];

    logStream.on('stream-error', (error) => {
      streamErrors.push(error);
    });

    // Emit errors on both streams
    mockStdout.emit('error', new Error('stdout error'));
    mockStderr.emit('error', new Error('stderr error'));

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(streamErrors).toHaveLength(2);
    expect(streamErrors[0].source).toBe('stdout');
    expect(streamErrors[0].error).toBe('stdout error');
    expect(streamErrors[1].source).toBe('stderr');
    expect(streamErrors[1].error).toBe('stderr error');
  });

  it('should properly detect log levels from content', async () => {
    const logEntries: LogEntry[] = [];

    logStream.on('log-entry', (entry: LogEntry) => {
      logEntries.push(entry);
    });

    // Test various log level patterns
    mockStdout.push('This is a debug message\n');
    mockStdout.push('Warning: something happened\n');
    mockStdout.push('INFO: information message\n');
    mockStderr.push('Fatal error occurred\n');
    mockStdout.push('Regular message\n');
    
    mockStdout.push(null);
    mockStderr.push(null);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(logEntries).toHaveLength(5);
    
    // Check level detection - order may vary due to async processing
    const debugEntry = logEntries.find(e => e.message.includes('debug'));
    const warnEntry = logEntries.find(e => e.message.includes('Warning'));
    const infoEntry = logEntries.find(e => e.message.includes('INFO:'));
    const errorEntry = logEntries.find(e => e.message.includes('Fatal error'));
    const regularEntry = logEntries.find(e => e.message === 'Regular message');
    
    expect(debugEntry?.level).toBe('debug');
    expect(warnEntry?.level).toBe('warn');
    expect(infoEntry?.level).toBe('info');
    expect(errorEntry?.level).toBe('error');
    expect(regularEntry?.level).toBe('info');
  });
});