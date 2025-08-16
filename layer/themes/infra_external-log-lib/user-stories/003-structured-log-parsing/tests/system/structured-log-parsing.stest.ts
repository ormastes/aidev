import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { StructuredLogParser } from '../../src/external/structured-log-parser';
import { LogSchema } from '../../src/external/schema-validator';

describe('Structured Log Parsing System Test', () => {
  let testAppPath: string;
  let parser: StructuredLogParser;

  beforeAll(async () => {
    // Create test Node.js app that outputs JSON logs
    testAppPath = path.join(__dirname, 'test-json-app.js');
    const testAppContent = `
const logEntry = (level, message, metadata = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };
  console.log(JSON.stringify(entry));
};

const logError = (message, error, metadata = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: error.message,
    stack: error.stack,
    ...metadata
  };
  console.error(JSON.stringify(entry));
};

// Normal JSON logs to stdout
logEntry('info', 'Application starting', { service: 'test-app', version: '1.0.0' });
logEntry('debug', 'Loading configuration', { config: { env: 'test', port: 3000 } });
logEntry('info', 'Database connected', { database: { host: 'localhost', port: 5432 } });
logEntry('warn', 'High memory usage detected', { memory: { used: 85, total: 100, unit: 'MB' } });

// Error logs to stderr
try {
  throw new Error('Database connection timeout');
} catch (error) {
  logError('Failed to connect to database', error, { retry: 3, timeout: 5000 });
}

try {
  throw new Error('Permission denied');
} catch (error) {
  logError('Access denied for user action', error, { user: { id: 123, role: 'user' }, action: 'admin_panel' });
}

// Mixed format logs (should be parsed as plain text)
console.log('This is a plain text log line');
console.log('level=info message="This is key-value format" service=test');

// Exit cleanly
process.exit(0);
    `;
    
    fs.writeFileSync(testAppPath, testAppContent);
  });

  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testAppPath)) {
      fs.unlinkSync(testAppPath);
    }
  });

  beforeEach(() => {
    parser = new StructuredLogParser();
  });

  it('should capture and parse JSON logs from Node.js application', async () => {
    const logs: any[] = [];
    const errors: any[] = [];

    const promise = new Promise<void>((resolve, reject) => {
      const child: ChildProcess = spawn('node', [testAppPath]);

      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = parser.parseLogLine(line, 'stdout');
          logs.push(parsed);
        });
      });

      child.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = parser.parseLogLine(line, 'stderr');
          errors.push(parsed);
        });
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Child process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Add timeout to prevent hanging
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    await promise;

    // Verify we captured logs
    expect(logs.length).toBeGreaterThan(0);
    expect(errors.length).toBeGreaterThan(0);

    // Verify JSON log parsing
    const jsonLogs = logs.filter(log => log.metadata && Object.keys(log.metadata).length > 0);
    expect(jsonLogs.length).toBeGreaterThanOrEqual(4); // At least 4 JSON logs

    // Verify specific log entries
    const startupLog = jsonLogs.find(log => log.message === 'Application starting');
    expect(startupLog).toBeDefined();
    expect(startupLog.level).toBe('info');
    expect(startupLog.metadata?.service).toBe('test-app');
    expect(startupLog.metadata?.version).toBe('1.0.0');
    expect(startupLog.timestamp).toBeInstanceOf(Date);

    const configLog = jsonLogs.find(log => log.message === 'Loading configuration');
    expect(configLog).toBeDefined();
    expect(configLog.level).toBe('debug');
    expect(configLog.metadata?.config).toEqual({ env: 'test', port: 3000 });

    const dbLog = jsonLogs.find(log => log.message === 'Database connected');
    expect(dbLog).toBeDefined();
    expect(dbLog.metadata?.database).toEqual({ host: 'localhost', port: 5432 });

    const memoryLog = jsonLogs.find(log => log.message === 'High memory usage detected');
    expect(memoryLog).toBeDefined();
    expect(memoryLog.level).toBe('warn');
    expect(memoryLog.metadata?.memory).toEqual({ used: 85, total: 100, unit: 'MB' });

    // Verify error logs
    const errorLogs = errors.filter(log => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThanOrEqual(2);

    const dbError = errorLogs.find(log => log.message === 'Failed to connect to database');
    expect(dbError).toBeDefined();
    expect(dbError.metadata?.error).toBe('Database connection timeout');
    expect(dbError.metadata?.retry).toBe(3);
    expect(dbError.metadata?.timeout).toBe(5000);
    expect(dbError.metadata?.stack).toContain('Error: Database connection timeout');

    const permissionError = errorLogs.find(log => log.message === 'Access denied for user action');
    expect(permissionError).toBeDefined();
    expect(permissionError.metadata?.error).toBe('Permission denied');
    expect(permissionError.metadata?.user).toEqual({ id: 123, role: 'user' });
    expect(permissionError.metadata?.action).toBe('admin_panel');

    // Verify mixed format handling
    const plainTextLog = logs.find(log => log.message === 'This is a plain text log line');
    expect(plainTextLog).toBeDefined();
    expect(plainTextLog.metadata).toEqual({});

    const keyValueLog = logs.find(log => log.message === 'This is key-value format');
    expect(keyValueLog).toBeDefined();
    expect(keyValueLog.metadata?.service).toBe('test');
  });

  it('should validate logs against JSON schema', async () => {
    const schema: LogSchema = {
      required: ['timestamp', 'level', 'message'],
      properties: {
        timestamp: { type: 'date' },
        level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
        message: { type: 'string', minLength: 1 },
        service: { type: 'string' },
        version: { type: 'string' }
      }
    };

    const validatingParser = new StructuredLogParser({ 
      format: 'json',
      schema,
      validateSchema: true 
    });

    const logs: any[] = [];
    const validationErrors: any[] = [];

    const promise = new Promise<void>((resolve, reject) => {
      const child: ChildProcess = spawn('node', [testAppPath]);

      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = validatingParser.parseLogLine(line, 'stdout');
          if ((parsed as any).source === 'validation') {
            validationErrors.push(parsed);
          } else {
            logs.push(parsed);
          }
        });
      });

      child.on('close', () => {
        resolve();
      });

      child.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    await promise;

    // Verify valid logs pass schema validation
    const validLogs = logs.filter(log => (log as any).source !== 'validation');
    expect(validLogs.length).toBeGreaterThan(0);

    // Check specific valid log
    const startupLog = validLogs.find(log => log.message === 'Application starting');
    expect(startupLog).toBeDefined();
    expect(startupLog.metadata?.service).toBe('test-app');
    expect(startupLog.metadata?.version).toBe('1.0.0');
  });

  it('should provide metadata querying capabilities', async () => {
    const logs: any[] = [];

    const promise = new Promise<void>((resolve, reject) => {
      const child: ChildProcess = spawn('node', [testAppPath]);

      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = parser.parseLogLine(line, 'stdout');
          logs.push(parsed);
        });
      });

      child.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = parser.parseLogLine(line, 'stderr');
          logs.push(parsed);
        });
      });

      child.on('close', () => {
        resolve();
      });

      child.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    await promise;

    // Test metadata filtering
    const serviceLogs = parser.filterByMetadata(logs, 'service', 'test-app');
    expect(serviceLogs.length).toBeGreaterThan(0);
    serviceLogs.forEach(log => {
      expect(log.metadata?.service).toBe('test-app');
    });

    // Test metadata field extraction
    const services = parser.extractMetadataField(logs, 'service');
    expect(services).toContain('test-app');
    expect(services).toContain('test');

    // Test grouping by metadata
    const groupedByService = parser.groupByMetadata(logs, 'service');
    expect(Object.keys(groupedByService).length).toBeGreaterThan(0);
    if (groupedByService['test-app']) {
      expect(groupedByService['test-app'].length).toBeGreaterThan(0);
    }

    // Test statistics
    const stats = parser.getStatistics(logs);
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byLevel.info).toBeGreaterThan(0);
    expect(stats.byLevel.error).toBeGreaterThan(0);
    expect(stats.withMetadata).toBeGreaterThan(0);
    expect(stats.uniqueMetadataKeys).toContain('service');
    expect(stats.uniqueMetadataKeys).toContain('version');
  });

  it('should handle format auto-detection correctly', async () => {
    const autoParser = new StructuredLogParser({ format: 'auto' });
    const logs: any[] = [];

    const promise = new Promise<void>((resolve, reject) => {
      const child: ChildProcess = spawn('node', [testAppPath]);

      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = autoParser.parseLogLine(line, 'stdout');
          logs.push(parsed);
        });
      });

      child.on('close', () => {
        resolve();
      });

      child.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    await promise;

    // Verify JSON logs were detected and parsed
    const jsonLogs = logs.filter(log => log.metadata && Object.keys(log.metadata).length > 0);
    expect(jsonLogs.length).toBeGreaterThan(0);

    // Verify JSON format detection worked
    const startupLog = jsonLogs.find(log => log.message === 'Application starting');
    expect(startupLog).toBeDefined();
    expect(startupLog.metadata?.service).toBe('test-app');

    // Verify key-value format detection worked
    const keyValueLog = logs.find(log => log.message === 'This is key-value format');
    expect(keyValueLog).toBeDefined();
    expect(keyValueLog.metadata?.service).toBe('test');

    // Verify plain text fallback worked
    const plainTextLog = logs.find(log => log.message === 'This is a plain text log line');
    expect(plainTextLog).toBeDefined();
    expect(Object.keys(plainTextLog.metadata || {})).toHaveLength(0);
  });

  it('should handle concurrent log streams correctly', async () => {
    const stdoutLogs: any[] = [];
    const stderrLogs: any[] = [];

    const promise = new Promise<void>((resolve, reject) => {
      const child: ChildProcess = spawn('node', [testAppPath]);

      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = parser.parseLogLine(line, 'stdout');
          stdoutLogs.push(parsed);
        });
      });

      child.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const parsed = parser.parseLogLine(line, 'stderr');
          stderrLogs.push(parsed);
        });
      });

      child.on('close', () => {
        resolve();
      });

      child.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    await promise;

    // Verify logs were correctly attributed to streams
    expect(stdoutLogs.length).toBeGreaterThan(0);
    expect(stderrLogs.length).toBeGreaterThan(0);

    stdoutLogs.forEach(log => {
      expect(log.source).toBe('stdout');
    });

    stderrLogs.forEach(log => {
      expect(log.source).toBe('stderr');
    });

    // Verify error logs are only in stderr
    const errorLogs = stderrLogs.filter(log => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);

    const stdoutErrorLogs = stdoutLogs.filter(log => log.level === 'error');
    expect(stdoutErrorLogs.length).toBe(0);
  });
});