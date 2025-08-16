import { LogStream } from '../../src/external/log-stream';
import { LogEntry } from '../../src/domain/log-entry';
import { Readable } from 'stream';

describe('LogStream Real-time Log Processing Integration Test', () => {
  let logStream: LogStream;

  afterEach(() => {
    if (logStream) {
      logStream.cleanup();
    }
  });

  it('should process real-time JSON-like log streams with level detection', async () => {
    const parsedEntries: LogEntry[] = [];

    // Create mock streams with JSON-like log data containing level indicators
    const logData = [
      'INFO: {"timestamp":"2024-01-01T10:00:00.000Z","message":"JSON log 1","service":"test"}',
      'WARN: {"timestamp":"2024-01-01T10:00:01.000Z","message":"JSON log 2","service":"test"}',
      'ERROR: {"timestamp":"2024-01-01T10:00:02.000Z","message":"JSON log 3","service":"test","error":"test error"}',
      'DEBUG: {"timestamp":"2024-01-01T10:00:03.000Z","message":"JSON log 4","service":"test"}',
      'INFO: {"timestamp":"2024-01-01T10:00:04.000Z","message":"JSON log 5","service":"test"}'
    ];

    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });

    // Create LogStream
    logStream = new LogStream(stdout, stderr);

    // Set up event listeners
    logStream.on('log-entry', (entry: LogEntry) => {
      parsedEntries.push(entry);
    });

    // Simulate real-time data streaming
    let index = 0;
    const streamInterval = setInterval(() => {
      if (index < logData.length) {
        stdout.push(logData[index] + '\n');
        index++;
      } else {
        clearInterval(streamInterval);
        stdout.push(null); // End stream
      }
    }, 50);

    // Wait for processing to complete
    await new Promise((resolve) => {
      let completedCount = 0;
      logStream.on('log-entry', () => {
        completedCount++;
        if (completedCount >= logData.length) {
          resolve(undefined);
        }
      });
      
      setTimeout(() => resolve(undefined), 2000); // Fallback timeout
    });

    // Verify real-time processing results
    expect(parsedEntries).toHaveLength(logData.length);

    // Verify parsed content and level detection
    parsedEntries.forEach((entry, i) => {
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.level).toBeDefined();
      expect(entry.message).toContain(`JSON log ${i + 1}`);
      expect(entry.source).toBe('stdout');
    });

    // Verify different log levels were detected
    const levels = new Set(parsedEntries.map(entry => entry.level));
    expect(levels.has('info')).toBe(true);
    expect(levels.has('warn')).toBe(true);
    expect(levels.has('error')).toBe(true);
    expect(levels.has('debug')).toBe(true);
  });

  it('should handle real-time log streaming with fragmented chunks and buffering', async () => {
    const parsedEntries: LogEntry[] = [];

    // Create log data that will be sent in fragments
    const logLines = [
      'info: Key-value style log entry with service=test',
      'warn: Key-value style log entry with component=auth',
      'error: Key-value style log entry with error_code=E001',
      'debug: Key-value style log entry with module=parser',
      'info: Key-value style log entry with user_id=12345'
    ];

    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });

    logStream = new LogStream(stdout, stderr);

    // Set up event listeners
    logStream.on('log-entry', (entry: LogEntry) => {
      parsedEntries.push(entry);
    });

    // Simulate streaming with fragmented chunks to test buffering
    let dataIndex = 0;
    const streamData = () => {
      if (dataIndex < logLines.length) {
        const line = logLines[dataIndex] + '\n';
        // Sometimes send partial chunks to test buffering
        if (dataIndex % 2 === 0 && line.length > 10) {
          const midPoint = Math.floor(line.length / 2);
          stdout.push(line.substring(0, midPoint));
          setTimeout(() => {
            stdout.push(line.substring(midPoint));
            dataIndex++;
            setTimeout(streamData, 30);
          }, 20);
        } else {
          stdout.push(line);
          dataIndex++;
          setTimeout(streamData, 40);
        }
      } else {
        stdout.push(null);
      }
    };

    streamData();

    // Wait for processing
    await new Promise((resolve) => {
      let completedCount = 0;
      logStream.on('log-entry', () => {
        completedCount++;
        if (completedCount >= logLines.length) {
          resolve(undefined);
        }
      });
      
      setTimeout(() => resolve(undefined), 3000);
    });

    // Verify buffering and fragmented streaming handled correctly
    expect(parsedEntries).toHaveLength(logLines.length);

    // Verify parsed content with level detection
    parsedEntries.forEach((entry) => {
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.level).toBeDefined();
      expect(entry.message).toContain('Key-value style log');
      expect(entry.source).toBe('stdout');
    });

    // Verify different log levels were detected
    const levels = new Set(parsedEntries.map(entry => entry.level));
    expect(levels.has('info')).toBe(true);
    expect(levels.has('warn')).toBe(true);
    expect(levels.has('error')).toBe(true);
    expect(levels.has('debug')).toBe(true);
  });

  it('should handle mixed format log streams with consistent level detection', async () => {
    const parsedEntries: LogEntry[] = [];

    // Mixed format log data with level indicators
    const mixedLogData = [
      'INFO: JSON-style format log message',
      'warn: Key-value style format log message', 
      'ERROR: Structured text format log message',
      'debug: Plain text format log message',
      'info: Another mixed format log message'
    ];

    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });

    logStream = new LogStream(stdout, stderr);

    // Set up event listeners
    logStream.on('log-entry', (entry: LogEntry) => {
      parsedEntries.push(entry);
    });

    // Stream mixed format data
    let index = 0;
    const streamMixed = setInterval(() => {
      if (index < mixedLogData.length) {
        stdout.push(mixedLogData[index] + '\n');
        index++;
      } else {
        clearInterval(streamMixed);
        stdout.push(null);
      }
    }, 100);

    // Wait for processing
    await new Promise((resolve) => {
      let completedCount = 0;
      logStream.on('log-entry', () => {
        completedCount++;
        if (completedCount >= mixedLogData.length) {
          resolve(undefined);
        }
      });
      
      setTimeout(() => resolve(undefined), 2000);
    });

    // Verify mixed format handling
    expect(parsedEntries).toHaveLength(mixedLogData.length);

    // Verify different format styles were processed
    const upperCaseEntries = parsedEntries.filter(entry => 
      entry.message.includes('INFO:') || entry.message.includes('ERROR:')
    );
    const lowerCaseEntries = parsedEntries.filter(entry => 
      entry.message.includes('warn:') || entry.message.includes('debug:') || entry.message.includes('info:')
    );

    expect(upperCaseEntries.length).toBe(2);
    expect(lowerCaseEntries.length).toBe(3);

    // All entries should have valid timestamps and levels detected
    parsedEntries.forEach(entry => {
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.level).toBeDefined();
      expect(['info', 'warn', 'error', 'debug']).toContain(entry.level);
    });

    // Verify level detection across different formats
    const levels = new Set(parsedEntries.map(entry => entry.level));
    expect(levels.has('info')).toBe(true);
    expect(levels.has('warn')).toBe(true);
    expect(levels.has('error')).toBe(true);
    expect(levels.has('debug')).toBe(true);
  });

  it('should handle real-time log filtering with different LogStream instances', async () => {
    const allEntries: LogEntry[] = [];
    const filteredEntries: LogEntry[] = [];

    // Create log data with various levels
    const logData = [
      'debug: Debug message 1',
      'info: Info message 1', 
      'warn: Warning message 1',
      'error: Error message 1',
      'debug: Debug message 2',
      'info: Info message 2',
      'error: Error message 2'
    ];

    // Create two LogStream instances with different filters
    const stdout1 = new Readable({ read() {} });
    const stderr1 = new Readable({ read() {} });
    const stdout2 = new Readable({ read() {} });
    const stderr2 = new Readable({ read() {} });

    const allLogStream = new LogStream(stdout1, stderr1);
    const filteredLogStream = new LogStream(stdout2, stderr2);

    // Set up filtering - only error and warn levels
    filteredLogStream.setLogLevelFilter(['error', 'warn']);

    // Set up event listeners
    allLogStream.on('log-entry', (entry: LogEntry) => {
      allEntries.push(entry);
    });

    filteredLogStream.on('log-entry', (entry: LogEntry) => {
      filteredEntries.push(entry);
    });

    // Stream same data to both
    logData.forEach((line, index) => {
      setTimeout(() => {
        stdout1.push(line + '\n');
        stdout2.push(line + '\n');
        
        if (index === logData.length - 1) {
          setTimeout(() => {
            stdout1.push(null);
            stdout2.push(null);
          }, 50);
        }
      }, index * 30);
    });

    // Wait for processing
    await new Promise((resolve) => {
      let allcompleted = false;
      let filteredcompleted = false;
      
      const checkCompletion = () => {
        if (allcompleted && filteredcompleted) {
          resolve(undefined);
        }
      };
      
      let allCount = 0;
      allLogStream.on('log-entry', () => {
        allCount++;
        if (allCount >= logData.length) {
          allcompleted = true;
          checkCompletion();
        }
      });
      
      let filteredCount = 0;
      const expectedFilteredCount = logData.filter(line => 
        line.includes('error:') || line.includes('warn:')
      ).length;
      
      filteredLogStream.on('log-entry', () => {
        filteredCount++;
        if (filteredCount >= expectedFilteredCount) {
          filteredcompleted = true;
          checkCompletion();
        }
      });
      
      setTimeout(() => resolve(undefined), 3000);
    });

    // Verify filtering integration
    expect(allEntries.length).toBe(logData.length);
    expect(filteredEntries.length).toBeLessThan(allEntries.length);

    // Verify filter worked correctly
    const errorWarnCount = logData.filter(line => 
      line.includes('error:') || line.includes('warn:')
    ).length;
    expect(filteredEntries.length).toBe(errorWarnCount);

    // All filtered entries should be error or warn level
    filteredEntries.forEach(entry => {
      expect(['error', 'warn']).toContain(entry.level);
    });

    // All log stream should have all levels
    const allLevels = new Set(allEntries.map(entry => entry.level));
    expect(allLevels.has('debug')).toBe(true);
    expect(allLevels.has('info')).toBe(true);
    expect(allLevels.has('warn')).toBe(true);
    expect(allLevels.has('error')).toBe(true);

    // Clean up
    allLogStream.cleanup();
    filteredLogStream.cleanup();
  });

  it('should handle high-volume real-time streaming with buffering', async () => {
    const parsedEntries: LogEntry[] = [];
    const performanceMetrics = {
      startTime: Date.now(),
      totalLogs: 0
    };

    // Generate high-volume log data
    const generateLogEntry = (index: number) => {
      const level = index % 4 === 0 ? 'error' : index % 3 === 0 ? 'warn' : index % 2 === 0 ? 'debug' : 'info';
      return `${level}: High volume log ${index} with data ${new Array(20).fill('x').join('')}`;
    };

    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });

    logStream = new LogStream(stdout, stderr);

    // Set up event listeners
    logStream.on('log-entry', (entry: LogEntry) => {
      parsedEntries.push(entry);
    });

    // Stream high-volume data rapidly
    const totalLogs = 500; // Reduced for test environment
    let sentCount = 0;

    const rapidStream = setInterval(() => {
      // Send multiple logs per interval
      for (let i = 0; i < 5 && sentCount < totalLogs; i++) {
        stdout.push(generateLogEntry(sentCount + 1) + '\n');
        sentCount++;
        performanceMetrics.totalLogs++;
      }
      
      if (sentCount >= totalLogs) {
        clearInterval(rapidStream);
        stdout.push(null);
      }
    }, 10);

    // Wait for processing with timeout
    await new Promise((resolve) => {
      let processedCount = 0;
      logStream.on('log-entry', () => {
        processedCount++;
        if (processedCount >= totalLogs) {
          resolve(undefined);
        }
      });
      
      setTimeout(() => resolve(undefined), 5000); // 5 second timeout
    });

    const duration = Date.now() - performanceMetrics.startTime;

    // Verify high-volume processing
    expect(parsedEntries.length).toBeGreaterThan(400); // Should parse most logs
    expect(performanceMetrics.totalLogs).toBe(totalLogs);

    // Verify parsing accuracy under load
    const sampleEntry = parsedEntries[Math.floor(parsedEntries.length / 2)];
    expect(sampleEntry.timestamp).toBeInstanceOf(Date);
    expect(sampleEntry.level).toBeDefined();
    expect(sampleEntry.message).toContain('High volume log');

    // Verify different levels were processed
    const levels = new Set(parsedEntries.map(entry => entry.level));
    expect(levels.size).toBeGreaterThan(2);

    // Performance should be reasonable
    const throughput = parsedEntries.length / (duration / 1000);
    expect(throughput).toBeGreaterThan(30); // At least 30 logs/second

    console.log(`High-volume integration: ${parsedEntries.length} logs in ${duration}ms (${throughput.toFixed(1)} logs/sec)`);
  });

  it('should handle mixed valid and malformed log data gracefully', async () => {
    const parsedEntries: LogEntry[] = [];
    const streamErrors: any[] = [];

    // Mix of valid and malformed log data
    const mixedLogData = [
      'info: Valid log message 1',
      'invalid: malformed log without proper structure', // Still valid as text
      'warn: Valid log message 2',
      'incomplete log without level or structure', // Plain text, will get default level
      'error: Valid log message 3',
      'MALFORMED LOG LINE WITHOUT STRUCTURE', // Plain text, will get default level
      'debug: Valid log message 4'
    ];

    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });

    logStream = new LogStream(stdout, stderr);

    // Set up event listeners
    logStream.on('log-entry', (entry: LogEntry) => {
      parsedEntries.push(entry);
    });

    logStream.on('stream-error', (error: any) => {
      streamErrors.push(error);
    });

    // Stream mixed data
    let index = 0;
    const streamMixed = setInterval(() => {
      if (index < mixedLogData.length) {
        stdout.push(mixedLogData[index] + '\n');
        index++;
      } else {
        clearInterval(streamMixed);
        stdout.push(null);
      }
    }, 100);

    // Wait for processing
    await new Promise((resolve) => {
      let processedCount = 0;
      logStream.on('log-entry', () => {
        processedCount++;
        if (processedCount >= mixedLogData.length) {
          resolve(undefined);
        }
      });
      
      setTimeout(() => resolve(undefined), 2000);
    });

    // Verify graceful handling of mixed data
    expect(parsedEntries.length).toBe(mixedLogData.length); // Should process all lines
    expect(streamErrors.length).toBe(0); // Should not have stream errors

    // Verify that all entries were processed with timestamps and levels
    parsedEntries.forEach(entry => {
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.level).toBeDefined();
      expect(entry.message).toBeDefined();
      expect(entry.source).toBe('stdout');
    });

    // Verify level detection worked for valid entries
    const validLevelEntries = parsedEntries.filter(entry => 
      ['info', 'warn', 'error', 'debug'].includes(entry.level)
    );
    expect(validLevelEntries.length).toBeGreaterThan(4);

    // Verify specific valid entries
    const infoEntries = parsedEntries.filter(entry => 
      entry.message.includes('Valid log message 1')
    );
    expect(infoEntries.length).toBe(1);
    expect(infoEntries[0].level).toBe('info');

    const warnEntries = parsedEntries.filter(entry => 
      entry.message.includes('Valid log message 2')
    );
    expect(warnEntries.length).toBe(1);
    expect(warnEntries[0].level).toBe('warn');

    const errorEntries = parsedEntries.filter(entry => 
      entry.message.includes('Valid log message 3')
    );
    expect(errorEntries.length).toBe(1);
    expect(errorEntries[0].level).toBe('error');

    const debugEntries = parsedEntries.filter(entry => 
      entry.message.includes('Valid log message 4')
    );
    expect(debugEntries.length).toBe(1);
    expect(debugEntries[0].level).toBe('debug');
  });
});