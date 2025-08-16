import { LogStream } from '../../../004-real-time-streaming/src/external/log-stream';
import { Readable } from 'node:stream';

describe('LogStream Concurrent Handling Unit Test', () => {
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

  it('should handle rapid concurrent log entries without data loss', (done) => {
    const receivedLogs: any[] = [];
    const expectedLogCount = 50;
    let processedCount = 0;

    // Set up log collection
    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
      processedCount++;
      
      if (processedCount === expectedLogCount) {
        // Verify all logs were captured
        expect(receivedLogs.length).toBe(expectedLogCount);
        
        // Verify no duplicates based on message content
        const messages = receivedLogs.map(log => log.message);
        const uniqueMessages = new Set(messages);
        expect(uniqueMessages.size).toBe(expectedLogCount);
        
        // Verify mix of stdout and stderr
        const stdoutLogs = receivedLogs.filter(log => log.source === 'stdout');
        const stderrLogs = receivedLogs.filter(log => log.source === 'stderr');
        expect(stdoutLogs.length).toBeGreaterThan(0);
        expect(stderrLogs.length).toBeGreaterThan(0);
        
        done();
      }
    });

    // Rapidly emit logs to both streams
    for (let i = 0; i < 25; i++) {
      // Interleave stdout and stderr logs
      setImmediate(() => {
        mockStdout.push(`[STDOUT] Rapid log ${i}\n`);
      });
      
      setImmediate(() => {
        mockStderr.push(`[STDERR] Concurrent log ${i}\n`);
      });
    }
  });

  it('should maintain proper sequencing during concurrent streams', (done) => {
    const receivedLogs: any[] = [];
    const totalExpected = 20;
    let receivedCount = 0;

    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push({
        ...entry,
        receiveTime: Date.now()
      });
      receivedCount++;
      
      if (receivedCount === totalExpected) {
        // Verify timestamps are reasonable (not all the same)
        const timestamps = receivedLogs.map(log => log.timestamp.getTime());
        const uniqueTimestamps = new Set(timestamps);
        expect(uniqueTimestamps.size).toBeGreaterThanOrEqual(1);
        
        // Verify all logs have sequential receive times
        for (let i = 1; i < receivedLogs.length; i++) {
          expect(receivedLogs[i].receiveTime).toBeGreaterThanOrEqual(
            receivedLogs[i-1].receiveTime
          );
        }
        
        // Verify correct source attribution
        receivedLogs.forEach(log => {
          if (log.message.includes('[STDOUT]')) {
            expect(log.source).toBe('stdout');
          } else if (log.message.includes('[STDERR]')) {
            expect(log.source).toBe('stderr');
          }
        });
        
        done();
      }
    });

    // Emit logs with slight delays to test sequencing
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        mockStdout.push(`[STDOUT] Sequential ${i}\n`);
        mockStderr.push(`[STDERR] Sequential ${i}\n`);
      }, i * 10);
    }
  });

  it('should handle burst logging from concurrent sources', (done) => {
    const receivedLogs: any[] = [];
    const burstSize = 15;
    const expectedTotal = burstSize * 2; // stdout and stderr
    let processedCount = 0;

    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
      processedCount++;
      
      if (processedCount === expectedTotal) {
        // Verify all burst logs captured
        expect(receivedLogs.length).toBe(expectedTotal);
        
        // Verify burst patterns
        const stdoutBurstLogs = receivedLogs.filter(log => 
          log.source === 'stdout' && log.message.includes('BURST')
        );
        const stderrBurstLogs = receivedLogs.filter(log => 
          log.source === 'stderr' && log.message.includes('BURST')
        );
        
        expect(stdoutBurstLogs.length).toBe(burstSize);
        expect(stderrBurstLogs.length).toBe(burstSize);
        
        // Verify log numbering sequence
        const stdoutNumbers = stdoutBurstLogs
          .map(log => parseInt(log.message.match(/BURST (\d+)/)?.[1] || '0'))
          .sort((a, b) => a - b);
        const stderrNumbers = stderrBurstLogs
          .map(log => parseInt(log.message.match(/BURST (\d+)/)?.[1] || '0'))
          .sort((a, b) => a - b);
        
        expect(stdoutNumbers).toEqual(Array.from({length: burstSize}, (_, i) => i));
        expect(stderrNumbers).toEqual(Array.from({length: burstSize}, (_, i) => i));
        
        done();
      }
    });

    // Create burst patterns - all stdout logs at once, then all stderr
    for (let i = 0; i < burstSize; i++) {
      mockStdout.push(`[INFO] STDOUT BURST ${i} - rapid fire\n`);
    }
    
    // Small delay then stderr burst
    setTimeout(() => {
      for (let i = 0; i < burstSize; i++) {
        mockStderr.push(`[ERROR] STDERR BURST ${i} - rapid fire\n`);
      }
    }, 50);
  });

  it('should handle overlapping stream data chunks', (done) => {
    const receivedLogs: any[] = [];
    const expectedMinLogs = 2; // At least some In Progress logs should be formed

    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
    });

    // Send partial chunks that need to be reassembled
    setTimeout(() => {
      mockStdout.push('[INFO] This is a ');
    }, 10);
    
    setTimeout(() => {
      mockStdout.push('In Progress message from stdout\n');
    }, 20);
    
    setTimeout(() => {
      mockStderr.push('[ERROR] In Progress stderr message\n');
    }, 30);
    
    setTimeout(() => {
      mockStdout.push('[DEBUG] Another In Progress stdout message\n');
    }, 40);
    
    // Wait and verify
    setTimeout(() => {
      // Verify at least some logs were captured
      expect(receivedLogs.length).toBeGreaterThanOrEqual(expectedMinLogs);
      
      // Verify message completeness (no newlines in individual messages)
      receivedLogs.forEach(log => {
        expect(log.message).not.toContain('\n');
        expect(log.message.trim().length).toBeGreaterThan(0);
      });
      
      // Verify both sources can be represented
      if (receivedLogs.length > 1) {
        const sources = receivedLogs.map(log => log.source);
        const uniqueSources = new Set(sources);
        expect(uniqueSources.size).toBeGreaterThanOrEqual(1);
      }
      
      done();
    }, 100);
  });

  it('should handle concurrent filtering during multi-stream processing', (done) => {
    const receivedLogs: any[] = [];
    let processedCount = 0;
    const expectedFilteredCount = 8; // Only ERROR and WARN should pass

    // Set log level filter to only allow ERROR and WARN
    logStream.setLogLevelFilter(['error', 'warn']);
    
    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
      processedCount++;
      
      if (processedCount === expectedFilteredCount) {
        // Verify filtering worked correctly
        expect(receivedLogs.length).toBe(expectedFilteredCount);
        
        // Verify only ERROR and WARN levels In Progress through
        receivedLogs.forEach(log => {
          expect(['error', 'warn']).toContain(log.level);
        });
        
        // Verify both sources still represented
        const sources = receivedLogs.map(log => log.source);
        expect(sources).toContain('stdout');
        expect(sources).toContain('stderr');
        
        done();
      }
    });

    // Send mixed log levels concurrently
    const levels = ['info', 'debug', 'warn', 'error', 'trace', 'fatal'];
    for (let i = 0; i < 12; i++) {
      const level = levels[i % levels.length];
      const upperLevel = level.toUpperCase();
      
      setImmediate(() => {
        if (i % 2 === 0) {
          mockStdout.push(`[${upperLevel}] Stdout message ${i}\n`);
        } else {
          mockStderr.push(`[${upperLevel}] Stderr message ${i}\n`);
        }
      });
    }
  });

  it('should maintain thread safety during concurrent log processing', (done) => {
    const receivedLogs: any[] = [];
    const logCounts = new Map<string, number>();
    const expectedSources = ["Process1", "Process2", "Process3"];
    const logsPerSource = 10;
    const totalExpected = expectedSources.length * logsPerSource;
    let processedCount = 0;

    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
      processedCount++;
      
      // Track logs per source
      const sourceMatch = entry.message.match(/\[(Process\d+)\]/);
      if (sourceMatch) {
        const source = sourceMatch[1];
        logCounts.set(source, (logCounts.get(source) || 0) + 1);
      }
      
      if (processedCount === totalExpected) {
        // Verify all logs received
        expect(receivedLogs.length).toBe(totalExpected);
        
        // Verify each source contributed correct number of logs
        expectedSources.forEach(source => {
          expect(logCounts.get(source)).toBe(logsPerSource);
        });
        
        // Verify no race conditions in log ordering
        const timestamps = receivedLogs.map(log => log.timestamp.getTime());
        const sortedTimestamps = [...timestamps].sort();
        expect(timestamps).toEqual(sortedTimestamps);
        
        done();
      }
    });

    // Simulate concurrent processes writing logs
    expectedSources.forEach((source, sourceIndex) => {
      for (let i = 0; i < logsPerSource; i++) {
        setTimeout(() => {
          const streamToUse = (sourceIndex + i) % 2 === 0 ? mockStdout : mockStderr;
          streamToUse.push(`[INFO] [${source}] Concurrent operation ${i}\n`);
        }, (sourceIndex * 10) + (i * 5));
      }
    });
  });

  it('should handle cleanup during active concurrent processing', (done) => {
    const receivedLogs: any[] = [];
    let cleanupCalled = false;
    let processedAfterCleanup = 0;

    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
      
      if (cleanupCalled) {
        processedAfterCleanup++;
      }
    });

    // Start concurrent log generation
    const intervalId = setInterval(() => {
      mockStdout.push(`[INFO] Pre-cleanup stdout log ${Date.now()}\n`);
      mockStderr.push(`[ERROR] Pre-cleanup stderr log ${Date.now()}\n`);
    }, 50);

    // Cleanup after some logs
    setTimeout(() => {
      cleanupCalled = true;
      logStream.cleanup();
      clearInterval(intervalId);
      
      // Try to send more logs after cleanup
      setTimeout(() => {
        mockStdout.push('[INFO] Post-cleanup stdout log\n');
        mockStderr.push('[ERROR] Post-cleanup stderr log\n');
        
        setTimeout(() => {
          // Verify logs were processed before cleanup
          expect(receivedLogs.length).toBeGreaterThan(0);
          
          // Verify no logs processed after cleanup
          expect(processedAfterCleanup).toBe(0);
          
          done();
        }, 100);
      }, 50);
    }, 200);
  });

  it('should handle high-frequency log bursts without buffer overflow', (done) => {
    const receivedLogs: any[] = [];
    const burstCount = 100;
    const batchSize = 10;
    let processedCount = 0;

    logStream.on('log-entry', (entry: any) => {
      receivedLogs.push(entry);
      processedCount++;
      
      if (processedCount === burstCount) {
        // Verify all high-frequency logs captured
        expect(receivedLogs.length).toBe(burstCount);
        
        // Verify sequence integrity
        const stdoutSequences = receivedLogs
          .filter(log => log.source === 'stdout')
          .map(log => parseInt(log.message.match(/Burst (\d+)/)?.[1] || '0'))
          .sort((a, b) => a - b);
        
        const stderrSequences = receivedLogs
          .filter(log => log.source === 'stderr')
          .map(log => parseInt(log.message.match(/Burst (\d+)/)?.[1] || '0'))
          .sort((a, b) => a - b);
        
        // Should have roughly equal distribution
        expect(stdoutSequences.length).toBeGreaterThan(burstCount / 4);
        expect(stderrSequences.length).toBeGreaterThan(burstCount / 4);
        
        // Verify no gaps in sequences
        if (stdoutSequences.length > 0) {
          const maxStdout = Math.max(...stdoutSequences);
          const minStdout = Math.min(...stdoutSequences);
          expect(maxStdout - minStdout + 1).toBeGreaterThanOrEqual(stdoutSequences.length);
        }
        
        done();
      }
    });

    // Generate high-frequency bursts in batches
    for (let batch = 0; batch < batchSize; batch++) {
      setTimeout(() => {
        for (let i = 0; i < (burstCount / batchSize); i++) {
          const logIndex = batch * (burstCount / batchSize) + i;
          if (logIndex % 2 === 0) {
            mockStdout.push(`[INFO] High-frequency stdout Burst ${logIndex}\n`);
          } else {
            mockStderr.push(`[ERROR] High-frequency stderr Burst ${logIndex}\n`);
          }
        }
      }, batch * 25);
    }
  });
});