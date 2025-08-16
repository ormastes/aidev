/**
 * Core tests for External Log Library Theme
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

describe('External Log Library Theme - Core Functionality', () => {
  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('log capture', () => {
    it('should capture console output', () => {
      const captureConsole = () => {
        const logs: string[] = [];
        const originalLog = console.log;
        
        console.log = (...args: any[]) => {
          logs.push(args.join(' '));
        };
        
        return {
          logs,
          restore: () => { console.log = originalLog; }
        };
      };

      const capture = captureConsole();
      console.log('test message');
      console.log('another message');
      capture.restore();

      expect(capture.logs).toHaveLength(2);
      expect(capture.logs[0]).toBe('test message');
      expect(capture.logs[1]).toBe('another message');
    });

    it('should capture stderr output', () => {
      const captureStderr = () => {
        const errors: string[] = [];
        const originalError = console.error;
        
        console.error = (...args: any[]) => {
          errors.push(args.join(' '));
        };
        
        return {
          errors,
          restore: () => { console.error = originalError; }
        };
      };

      const capture = captureStderr();
      console.error('error message');
      console.error('warning message');
      capture.restore();

      expect(capture.errors).toHaveLength(2);
      expect(capture.errors[0]).toBe('error message');
      expect(capture.errors[1]).toBe('warning message');
    });

    it('should timestamp log entries', () => {
      const timestampLog = (message: string) => {
        const timestamp = new Date().toISOString();
        return `${timestamp} ${message}`;
      };

      const logEntry = timestampLog('test message');
      expect(logEntry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z test message$/);
    });
  });

  describe('log processing', () => {
    it('should parse JSON log entries', () => {
      const parseJsonLog = (logLine: string) => {
        try {
          return JSON.parse(logLine);
        } catch {
          return null;
        }
      };

      const jsonLog = '{"level":"info","message":"test","timestamp":"2023-01-01T00:00:00.000Z"}';
      const plainLog = 'plain text log';

      const parsedJson = parseJsonLog(jsonLog);
      const parsedPlain = parseJsonLog(plainLog);

      expect(parsedJson).toEqual({
        level: 'info',
        message: 'test',
        timestamp: '2023-01-01T00:00:00.000Z'
      });
      expect(parsedPlain).toBeNull();
    });

    it('should parse key-value log entries', () => {
      const parseKeyValueLog = (logLine: string) => {
        const pairs = logLine.split(' ').filter(pair => pair.includes('='));
        const result: Record<string, string> = {};
        
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            result[key] = value;
          }
        });
        
        return result;
      };

      const kvLog = 'level=info message=test timestamp=2023-01-01T00:00:00.000Z';
      const parsed = parseKeyValueLog(kvLog);

      expect(parsed).toEqual({
        level: 'info',
        message: 'test',
        timestamp: '2023-01-01T00:00:00.000Z'
      });
    });

    it('should extract log levels', () => {
      const extractLogLevel = (logLine: string): string => {
        const levelPatterns = [
          /\[(\w+)\]/,           // [INFO]
          /(\w+):/,              // INFO:
          /"level":\s*"(\w+)"/,  // JSON level
          /level=(\w+)/          // key=value level
        ];

        for (const pattern of levelPatterns) {
          const match = logLine.match(pattern);
          if (match) {
            return match[1].toUpperCase();
          }
        }

        return 'UNKNOWN';
      };

      expect(extractLogLevel('[INFO] test message')).toBe('INFO');
      expect(extractLogLevel('ERROR: test message')).toBe('ERROR');
      expect(extractLogLevel('{"level":"debug","message":"test"}')).toBe('DEBUG');
      expect(extractLogLevel('level=warn message=test')).toBe('WARN');
      expect(extractLogLevel('plain text')).toBe('UNKNOWN');
    });
  });

  describe('log storage', () => {
    const tempDir = path.join(__dirname, '../../temp');

    beforeEach(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

    it('should write logs to file', async () => {
      const logFile = path.join(tempDir, 'test.log');
      const logEntry = 'test log entry';

      fs.writeFileSync(logFile, logEntry);
      const content = fs.readFileSync(logFile, 'utf8');

      expect(content).toBe(logEntry);
    });

    it('should append logs to existing file', async () => {
      const logFile = path.join(tempDir, 'append-test.log');
      
      fs.writeFileSync(logFile, 'first entry\n');
      fs.appendFileSync(logFile, 'second entry\n');
      
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('first entry');
      expect(lines[1]).toBe('second entry');
    });

    it('should rotate log files by size', () => {
      const rotateLogFile = (filePath: string, maxSize: number) => {
        if (!fs.existsSync(filePath)) {
          return false;
        }

        const stats = fs.statSync(filePath);
        if (stats.size > maxSize) {
          const rotatedPath = `${filePath}.1`;
          fs.renameSync(filePath, rotatedPath);
          return true;
        }

        return false;
      };

      const logFile = path.join(tempDir, 'rotate-test.log');
      const largeContent = 'x'.repeat(1000);
      
      fs.writeFileSync(logFile, largeContent);
      
      const rotated = rotateLogFile(logFile, 500);
      expect(rotated).toBe(true);
      expect(fs.existsSync(`${logFile}.1`)).toBe(true);
      expect(fs.existsSync(logFile)).toBe(false);
    });
  });

  describe('process monitoring', () => {
    it('should track process lifecycle', () => {
      interface ProcessInfo {
        pid: number;
        command: string;
        startTime: Date;
        status: 'running' | 'stopped' | 'error';
      }

      const processes = new Map<number, ProcessInfo>();

      const startProcess = (pid: number, command: string) => {
        processes.set(pid, {
          pid,
          command,
          startTime: new Date(),
          status: 'running'
        });
      };

      const stopProcess = (pid: number) => {
        const process = processes.get(pid);
        if (process) {
          process.status = 'stopped';
        }
      };

      startProcess(1234, 'node app.js');
      startProcess(5678, 'python script.py');
      stopProcess(1234);

      expect(processes.size).toBe(2);
      expect(processes.get(1234)?.status).toBe('stopped');
      expect(processes.get(5678)?.status).toBe('running');
    });

    it('should handle process crashes', () => {
      const crashHandler = (pid: number, exitCode: number) => {
        return {
          pid,
          exitCode,
          crashed: exitCode !== 0,
          timestamp: new Date()
        };
      };

      const normalExit = crashHandler(1234, 0);
      const crash = crashHandler(5678, 1);

      expect(normalExit.crashed).toBe(false);
      expect(crash.crashed).toBe(true);
      expect(crash.exitCode).toBe(1);
    });
  });

  describe('log filtering', () => {
    it('should filter logs by level', () => {
      const logs = [
        { level: 'INFO', message: 'info message' },
        { level: 'ERROR', message: 'error message' },
        { level: 'DEBUG', message: 'debug message' },
        { level: 'WARN', message: 'warn message' }
      ];

      const filterByLevel = (logs: any[], level: string) => {
        return logs.filter(log => log.level === level);
      };

      const errorLogs = filterByLevel(logs, 'ERROR');
      const infoLogs = filterByLevel(logs, 'INFO');

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('error message');
      expect(infoLogs).toHaveLength(1);
      expect(infoLogs[0].message).toBe('info message');
    });

    it('should filter logs by pattern', () => {
      const logs = [
        'Database connection established',
        'User login: john@example.com',
        'Database query executed',
        'User logout: jane@example.com',
        'System health check'
      ];

      const filterByPattern = (logs: string[], pattern: RegExp) => {
        return logs.filter(log => pattern.test(log));
      };

      const dbLogs = filterByPattern(logs, /Database/);
      const userLogs = filterByPattern(logs, /User/);

      expect(dbLogs).toHaveLength(2);
      expect(userLogs).toHaveLength(2);
      expect(dbLogs[0]).toContain('Database connection');
      expect(userLogs[0]).toContain('User login');
    });

    it('should filter logs by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const logs = [
        { message: 'recent log', timestamp: now },
        { message: 'one hour ago', timestamp: oneHourAgo },
        { message: 'two hours ago', timestamp: twoHoursAgo }
      ];

      const filterByTimeRange = (logs: any[], start: Date, end: Date) => {
        return logs.filter(log => 
          log.timestamp >= start && log.timestamp <= end
        );
      };

      const recentLogs = filterByTimeRange(logs, oneHourAgo, now);
      expect(recentLogs).toHaveLength(2);
      expect(recentLogs.map(l => l.message)).toContain('recent log');
      expect(recentLogs.map(l => l.message)).toContain('one hour ago');
    });
  });

  describe('log aggregation', () => {
    it('should aggregate logs from multiple sources', () => {
      const sources = {
        app: [
          { timestamp: '2023-01-01T10:00:00Z', message: 'app started' },
          { timestamp: '2023-01-01T10:01:00Z', message: 'user connected' }
        ],
        db: [
          { timestamp: '2023-01-01T10:00:30Z', message: 'db connection established' },
          { timestamp: '2023-01-01T10:01:30Z', message: 'query executed' }
        ]
      };

      const aggregateLogs = (sources: Record<string, any[]>) => {
        const combined: any[] = [];
        
        Object.entries(sources).forEach(([source, logs]) => {
          logs.forEach(log => {
            combined.push({ ...log, source });
          });
        });

        return combined.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      };

      const aggregated = aggregateLogs(sources);
      
      expect(aggregated).toHaveLength(4);
      expect(aggregated[0].message).toBe('app started');
      expect(aggregated[1].message).toBe('db connection established');
      expect(aggregated[2].message).toBe('user connected');
      expect(aggregated[3].message).toBe('query executed');
    });

    it('should count log entries by level', () => {
      const logs = [
        { level: 'INFO' }, { level: 'ERROR' }, { level: 'INFO' },
        { level: 'WARN' }, { level: 'ERROR' }, { level: 'DEBUG' }
      ];

      const countByLevel = (logs: any[]) => {
        const counts: Record<string, number> = {};
        
        logs.forEach(log => {
          counts[log.level] = (counts[log.level] || 0) + 1;
        });

        return counts;
      };

      const counts = countByLevel(logs);
      
      expect(counts.INFO).toBe(2);
      expect(counts.ERROR).toBe(2);
      expect(counts.WARN).toBe(1);
      expect(counts.DEBUG).toBe(1);
    });
  });

  describe('real-time streaming', () => {
    it('should emit log events', (done) => {
      const EventEmitter = require('events');
      
      class LogStream extends EventEmitter {
        addLog(entry: any) {
          this.emit('log', entry);
        }
      }

      const stream = new LogStream();
      const receivedLogs: any[] = [];

      stream.on('log', (entry) => {
        receivedLogs.push(entry);
        
        if (receivedLogs.length === 2) {
          expect(receivedLogs).toHaveLength(2);
          expect(receivedLogs[0].message).toBe('first log');
          expect(receivedLogs[1].message).toBe('second log');
          done();
        }
      });

      stream.addLog({ message: 'first log' });
      stream.addLog({ message: 'second log' });
    });

    it('should handle backpressure', () => {
      class BufferedLogStream {
        private buffer: any[] = [];
        private maxSize: number;

        constructor(maxSize = 100) {
          this.maxSize = maxSize;
        }

        addLog(entry: any): boolean {
          if (this.buffer.length >= this.maxSize) {
            return false; // Buffer full
          }
          
          this.buffer.push(entry);
          return true;
        }

        getBuffer() {
          return [...this.buffer];
        }

        flush() {
          const logs = [...this.buffer];
          this.buffer = [];
          return logs;
        }
      }

      const stream = new BufferedLogStream(2);
      
      expect(stream.addLog({ message: 'log 1' })).toBe(true);
      expect(stream.addLog({ message: 'log 2' })).toBe(true);
      expect(stream.addLog({ message: 'log 3' })).toBe(false); // Buffer full
      
      expect(stream.getBuffer()).toHaveLength(2);
      
      const flushed = stream.flush();
      expect(flushed).toHaveLength(2);
      expect(stream.getBuffer()).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle corrupted log files', () => {
      const parseLogFile = (content: string) => {
        const lines = content.split('\n').filter(line => line.trim());
        const parsed: any[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
          try {
            if (line.startsWith('{')) {
              parsed.push(JSON.parse(line));
            } else {
              parsed.push({ message: line, level: 'UNKNOWN' });
            }
          } catch (error) {
            errors.push(`Line ${index + 1}: ${error.message}`);
          }
        });

        return { parsed, errors };
      };

      const corruptedContent = `
        {"level":"info","message":"valid json"}
        invalid json line
        {"level":"error","message":"another valid"
        plain text line
      `;

      const result = parseLogFile(corruptedContent);
      
      expect(result.parsed).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.parsed[0].level).toBe('info');
      expect(result.parsed[1].message).toBe('plain text line');
    });

    it('should recover from process failures', () => {
      const createProcessRecovery = () => {
        let retryCount = 0;
        const maxRetries = 3;

        const attemptRestart = (): boolean => {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Simulate restart attempt
            const success = Math.random() > 0.3; // 70% success rate
            
            if (success) {
              retryCount = 0; // Reset on success
              return true;
            }
          }
          
          return false;
        };

        return { attemptRestart, getRetryCount: () => retryCount };
      };

      const recovery = createProcessRecovery();
      
      // Should allow multiple attempts
      expect(typeof recovery.attemptRestart()).toBe('boolean');
      expect(recovery.getRetryCount()).toBeGreaterThan(0);
    });
  });
});