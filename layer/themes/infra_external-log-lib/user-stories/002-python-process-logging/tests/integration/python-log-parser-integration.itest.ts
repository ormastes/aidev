import { spawn } from 'child_process';
import { pythonExternalLogLib } from '../../src/external/python-external-log-lib';
import { LogEntry } from '../../../001-basic-log-capture/src/external/external-log-lib';

describe('Python Logging Format Integration Test', () => {
  it('should integrate Python log parser with LogCapturer for real process output', async () => {
    // Create a Python process that outputs various log formats
    const pythonCode = `
import sys
import time

# Standard Python logging format
print("2025-01-15 10:30:45,123 - app.module - INFO - Starting application", file=sys.stderr)
print("2025-01-15 10:30:45,234 - app.module - DEBUG - Debug information", file=sys.stderr)
print("2025-01-15 10:30:45,345 - app.module - WARNING - Warning message", file=sys.stderr)
print("2025-01-15 10:30:45,456 - app.module - ERROR - Error occurred", file=sys.stderr)

# Simple format
print("INFO: Simple info message", file=sys.stderr)
print("ERROR - Another error format", file=sys.stderr)

# Plain text (should default based on stream)
print("Plain stdout message", file=sys.stdout)
print("Plain stderr message", file=sys.stderr)

# Ensure all output is flushed
sys.stdout.flush()
sys.stderr.flush()
`;

    const process = spawn('python3', ['-c', pythonCode]);
    const capturer = pythonExternalLogLib.createCapturer(process);
    
    const capturedLogs: LogEntry[] = [];
    capturer.onLog((entry) => {
      capturedLogs.push(entry);
    });
    
    capturer.start();
    
    // Wait for process to complete
    await new Promise<void>((resolve) => {
      process.on('close', () => {
        capturer.stop();
        resolve();
      });
    });
    
    // Verify integration captured and parsed all formats correctly
    expect(capturedLogs.length).toBeGreaterThanOrEqual(8);
    
    // Check Python logging format parsing
    const infoLog = capturedLogs.find(log => log.message === 'Starting application');
    expect(infoLog).toBeDefined();
    expect(infoLog?.level).toBe('info');
    expect(infoLog?.timestamp).toBeInstanceOf(Date);
    
    const debugLog = capturedLogs.find(log => log.message === 'Debug information');
    expect(debugLog?.level).toBe('debug');
    
    const warnLog = capturedLogs.find(log => log.message === 'Warning message');
    expect(warnLog?.level).toBe('warn');
    
    const errorLog = capturedLogs.find(log => log.message === 'Error occurred');
    expect(errorLog?.level).toBe('error');
    
    // Check simple format parsing
    const simpleInfo = capturedLogs.find(log => log.message === 'Simple info message');
    expect(simpleInfo?.level).toBe('info');
    
    const simpleError = capturedLogs.find(log => log.message === 'Another error format');
    expect(simpleError?.level).toBe('error');
    
    // Check plain text handling
    const plainStdout = capturedLogs.find(log => log.message === 'Plain stdout message');
    expect(plainStdout?.level).toBe('info');
    expect(plainStdout?.source).toBe('stdout');
    
    const plainStderr = capturedLogs.find(log => log.message === 'Plain stderr message');
    expect(plainStderr?.level).toBe('error');
    expect(plainStderr?.source).toBe('stderr');
  });

  it('should handle streaming Python logs with parser integration', async () => {
    const pythonCode = `
import sys
import time

for i in range(3):
    print(f"2025-01-15 10:30:4{i},000 - streamer - INFO - Progress {i+1}/3", file=sys.stderr)
    sys.stderr.flush()
    time.sleep(0.1)
`;

    const process = spawn('python3', ['-c', pythonCode]);
    const capturer = pythonExternalLogLib.createCapturer(process);
    
    const timestamps: number[] = [];
    capturer.onLog(() => {
      timestamps.push(Date.now());
    });
    
    capturer.start();
    
    await new Promise<void>((resolve) => {
      process.on('close', () => {
        capturer.stop();
        resolve();
      });
    });
    
    // Verify logs were streamed (not buffered)
    expect(timestamps.length).toBe(3);
    if (timestamps.length >= 2) {
      const timeDiff = timestamps[timestamps.length - 1] - timestamps[0];
      expect(timeDiff).toBeGreaterThan(150); // Should take at least 150ms for 3 logs
    }
  });

  it('should parse JSON logs from Python through integration', async () => {
    const pythonCode = `
import json
import sys

logs = [
    {"timestamp": "2025-01-15T10:00:00.000Z", "level": "INFO", "message": "JSON log 1"},
    {"timestamp": "2025-01-15T10:00:01.000Z", "level": "DEBUG", "message": "JSON log 2"},
    {"timestamp": "2025-01-15T10:00:02.000Z", "level": "WARNING", "message": "JSON log 3"},
    {"timestamp": "2025-01-15T10:00:03.000Z", "level": "ERROR", "message": "JSON log 4"}
]

for log in logs:
    print(json.dumps(log), file=sys.stderr)
`;

    const process = spawn('python3', ['-c', pythonCode]);
    const capturer = pythonExternalLogLib.createCapturer(process);
    
    const capturedLogs: LogEntry[] = [];
    capturer.onLog((entry) => {
      capturedLogs.push(entry);
    });
    
    capturer.start();
    
    await new Promise<void>((resolve) => {
      process.on('close', () => {
        capturer.stop();
        resolve();
      });
    });
    
    // Verify JSON parsing
    expect(capturedLogs.length).toBe(4);
    
    expect(capturedLogs[0].level).toBe('info');
    expect(capturedLogs[0].message).toBe('JSON log 1');
    
    expect(capturedLogs[1].level).toBe('debug');
    expect(capturedLogs[1].message).toBe('JSON log 2');
    
    expect(capturedLogs[2].level).toBe('warn');
    expect(capturedLogs[2].message).toBe('JSON log 3');
    
    expect(capturedLogs[3].level).toBe('error');
    expect(capturedLogs[3].message).toBe('JSON log 4');
  });

  it('should handle mixed Python output formats in single session', async () => {
    const pythonCode = `
import sys
import json
import logging

# Configure Python logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    stream=sys.stderr
)
logger = logging.getLogger('test')

# Mix of different output types
print("Plain stdout print")
logger.info("Python logging info")
print("ERROR: Simple error format", file=sys.stderr)
print(json.dumps({"level": "WARNING", "message": "JSON warning"}), file=sys.stderr)
logger.error("Python logging error")
print("[DEBUG] Bracket format debug", file=sys.stderr)
`;

    const process = spawn('python3', ['-c', pythonCode]);
    const capturer = pythonExternalLogLib.createCapturer(process);
    
    const capturedLogs: LogEntry[] = [];
    capturer.onLog((entry) => {
      capturedLogs.push(entry);
    });
    
    capturer.start();
    
    await new Promise<void>((resolve) => {
      process.on('close', () => {
        capturer.stop();
        resolve();
      });
    });
    
    // Verify all formats were parsed correctly
    const plainStdout = capturedLogs.find(log => log.message === 'Plain stdout print');
    expect(plainStdout?.level).toBe('info');
    expect(plainStdout?.source).toBe('stdout');
    
    const pythonInfo = capturedLogs.find(log => log.message === 'Python logging info');
    expect(pythonInfo?.level).toBe('info');
    
    const simpleError = capturedLogs.find(log => log.message === 'Simple error format');
    expect(simpleError?.level).toBe('error');
    
    const jsonWarn = capturedLogs.find(log => log.message === 'JSON warning');
    expect(jsonWarn?.level).toBe('warn');
    
    const pythonError = capturedLogs.find(log => log.message === 'Python logging error');
    expect(pythonError?.level).toBe('error');
    
    const bracketDebug = capturedLogs.find(log => log.message === 'Bracket format debug');
    expect(bracketDebug?.level).toBe('debug');
  });

  it('should handle empty lines and special characters', async () => {
    const pythonCode = `
import sys

# Test various edge cases
print("", file=sys.stderr)  # Empty line
print("   ", file=sys.stderr)  # Whitespace only
print("2025-01-15 10:00:00 - test - INFO - Special chars: @#$%^&*()", file=sys.stderr)
print('2025-01-15 10:00:00 - test - INFO - Quotes: "test" \\'test\\'', file=sys.stderr)
print("2025-01-15 10:00:00 - test - INFO - Unicode: 你好 🌍", file=sys.stderr)
`;

    const process = spawn('python3', ['-c', pythonCode]);
    const capturer = pythonExternalLogLib.createCapturer(process);
    
    const capturedLogs: LogEntry[] = [];
    capturer.onLog((entry) => {
      capturedLogs.push(entry);
    });
    
    capturer.start();
    
    await new Promise<void>((resolve) => {
      process.on('close', () => {
        capturer.stop();
        resolve();
      });
    });
    
    // Should capture non-empty lines (empty and whitespace-only lines are filtered)
    expect(capturedLogs.length).toBe(3);
    
    // Check special character handling
    const specialChars = capturedLogs.find(log => log.message.includes('Special chars:'));
    expect(specialChars?.message).toBe('Special chars: @#$%^&*()');
    expect(specialChars?.level).toBe('info');
    
    const quotes = capturedLogs.find(log => log.message.includes('Quotes:'));
    expect(quotes?.message).toBe('Quotes: "test" \'test\'');
    
    const unicode = capturedLogs.find(log => log.message.includes('Unicode:'));
    expect(unicode?.message).toBe('Unicode: 你好 🌍');
  });
});