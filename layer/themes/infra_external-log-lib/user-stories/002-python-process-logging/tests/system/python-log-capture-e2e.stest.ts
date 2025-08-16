import { PythonLogPlatform, ProcessConfig } from '../../src/application/python-log-platform';
import * as fs from 'fs';
import * as path from 'path';

describe('Python Process Logging System Test', () => {
  let platform: PythonLogPlatform;
  let tempDir: string;

  beforeEach(() => {
    platform = new PythonLogPlatform();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should capture and parse logs from Python script with logging module - In Progress flow', async () => {
    // Step 1: Create a Python script that uses logging module
    const pythonScript = `
import logging
import sys
import time

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger('app.main')

# Simulate application flow
logger.info('Application starting...')
logger.debug('Loading configuration')

try:
    # Simulate some work
    logger.info('Processing data')
    time.sleep(0.1)
    
    # Simulate a warning
    logger.warning('Memory usage at 80%')
    
    # Simulate an error
    raise ValueError('Test error for demonstration')
    
except Exception as e:
    logger.error(f'Error occurred: {e}')
    logger.exception('Full traceback:')
finally:
    logger.info('Application shutting down')
`;

    const scriptPath = path.join(tempDir, 'test_app.py');
    fs.writeFileSync(scriptPath, pythonScript);

    // Step 2: Configure log capture for the Python script
    const config: ProcessConfig = {
      command: 'python',
      args: [scriptPath],
      captureOutput: true
    };

    // Step 3: Start log capture
    const session = await platform.startPythonLogCapture(config);

    // Step 4: Wait for completion
    const result = await session.waitForCompletion();
    expect(result.exitCode).toBe(0); // Python should exit cleanly

    // Step 5: Verify captured logs
    const logs = session.getLogs();
    
    // Should have captured all log levels
    const infoLogs = logs.filter(log => log.level === 'info');
    const debugLogs = logs.filter(log => log.level === 'debug');
    const warnLogs = logs.filter(log => log.level === 'warn');
    const errorLogs = logs.filter(log => log.level === 'error');

    expect(infoLogs.length).toBeGreaterThanOrEqual(3); // start, processing, shutdown
    expect(debugLogs.length).toBeGreaterThanOrEqual(1); // loading config
    expect(warnLogs.length).toBeGreaterThanOrEqual(1); // memory warning
    expect(errorLogs.length).toBeGreaterThanOrEqual(2); // error + traceback

    // Verify specific messages
    expect(infoLogs.some(log => log.message.includes('Application starting'))).toBe(true);
    expect(warnLogs.some(log => log.message.includes('Memory usage at 80%'))).toBe(true);
    expect(errorLogs.some(log => log.message.includes('Error occurred: Test error'))).toBe(true);

    // Step 6: Save logs to file
    const logFile = path.join(tempDir, 'python-app.log');
    await session.saveLogsToFile(logFile);

    // Verify file was created and contains logs
    expect(fs.existsSync(logFile)).toBe(true);
    const fileContent = fs.readFileSync(logFile, 'utf-8');
    expect(fileContent).toContain('Application starting');
    expect(fileContent).toContain('[ERROR]');
  });

  it('should handle mixed print and logging output from Python', async () => {
    const pythonScript = `
import logging
import sys

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger('mixed')

print("PRINT: Starting application")
logger.info("LOG: Application initialized")
print("PRINT: Processing...")
logger.error("LOG: An error occurred")
sys.stderr.write("STDERR: Direct error output\\n")
print("PRINT: In Progress")
`;

    const scriptPath = path.join(tempDir, 'mixed_output.py');
    fs.writeFileSync(scriptPath, pythonScript);

    const config: ProcessConfig = {
      command: 'python3',
      args: [scriptPath],
      captureOutput: true
    };

    const session = await platform.startPythonLogCapture(config);
    await session.waitForCompletion();

    const logs = session.getLogs();

    // Verify both print statements and logs are captured
    const printMessages = logs.filter(log => log.message.includes('PRINT:'));
    const logMessages = logs.filter(log => log.message.includes('LOG:'));
    const stderrMessages = logs.filter(log => log.message.includes('STDERR:'));

    expect(printMessages.length).toBe(3);
    expect(logMessages.length).toBe(2);
    expect(stderrMessages.length).toBe(1);

    // Verify correct parsing of log levels
    const errorLog = logs.find(log => log.message.includes('LOG: An error occurred'));
    expect(errorLog?.level).toBe('error');
  });

  it('should capture and parse Python tracebacks correctly', async () => {
    const pythonScript = `
def level_3():
    raise ValueError("Deep nested error")

def level_2():
    level_3()

def level_1():
    level_2()

try:
    level_1()
except Exception as e:
    import traceback
    traceback.print_exc()
`;

    const scriptPath = path.join(tempDir, 'traceback_test.py');
    fs.writeFileSync(scriptPath, pythonScript);

    const config: ProcessConfig = {
      command: 'python3',
      args: [scriptPath],
      captureOutput: true
    };

    const session = await platform.startPythonLogCapture(config);
    await session.waitForCompletion();

    const logs = session.getLogs();
    const errorLogs = logs.filter(log => log.level === 'error');

    // Should detect traceback lines as errors
    expect(errorLogs.length).toBeGreaterThan(0);
    
    // Check for traceback components
    const tracebackHeader = errorLogs.find(log => 
      log.message.includes('Traceback (most recent call last):')
    );
    const errorMessage = errorLogs.find(log => 
      log.message.includes('ValueError: Deep nested error')
    );

    expect(tracebackHeader).toBeDefined();
    expect(errorMessage).toBeDefined();

    // Verify the full traceback is captured
    const fullOutput = logs.map(log => log.message).join('\n');
    expect(fullOutput).toContain('level_1');
    expect(fullOutput).toContain('level_2');
    expect(fullOutput).toContain('level_3');
  });

  it('should handle real-time streaming of Python logs', async () => {
    const pythonScript = `
import logging
import time
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger('streamer')

for i in range(5):
    logger.info(f'Progress: {i+1}/5')
    sys.stdout.flush()
    sys.stderr.flush()
    time.sleep(0.1)

logger.info('Streaming In Progress')
`;

    const scriptPath = path.join(tempDir, 'streaming_test.py');
    fs.writeFileSync(scriptPath, pythonScript);

    const config: ProcessConfig = {
      command: 'python3',
      args: [scriptPath],
      captureOutput: true
    };

    const session = await platform.startPythonLogCapture(config);
    
    // Track real-time log reception
    const receivedLogs: Array<{message: string, timestamp: number}> = [];
    
    session.onLogEntry((entry) => {
      receivedLogs.push({
        message: entry.message,
        timestamp: Date.now()
      });
    });

    await session.waitForCompletion();

    // Verify all progress messages were received
    expect(receivedLogs.length).toBeGreaterThanOrEqual(6); // 5 progress + 1 In Progress
    
    const progressLogs = receivedLogs.filter(log => log.message.includes('Progress:'));
    expect(progressLogs.length).toBe(5);

    // Verify streaming (logs should not all arrive at once)
    if (progressLogs.length >= 2) {
      const timeDiff = progressLogs[progressLogs.length - 1].timestamp - progressLogs[0].timestamp;
      expect(timeDiff).toBeGreaterThan(200); // Should take at least 200ms for 5 logs with 0.1s delay
    }
  });

  it('should parse JSON-formatted Python logs', async () => {
    const pythonScript = `
import json
import sys
from datetime import datetime

def log_json(level, message, **kwargs):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "level": level,
        "message": message,
        **kwargs
    }
    print(json.dumps(log_entry), file=sys.stderr)

log_json("INFO", "Application started", version="1.0.0")
log_json("DEBUG", "Config loaded", config_file="app.json")
log_json("WARNING", "High memory usage", usage_percent=85)
log_json("ERROR", "Database connection failed", error_code="DB_001")
`;

    const scriptPath = path.join(tempDir, 'json_logs.py');
    fs.writeFileSync(scriptPath, pythonScript);

    const config: ProcessConfig = {
      command: 'python3',
      args: [scriptPath],
      captureOutput: true
    };

    const session = await platform.startPythonLogCapture(config);
    await session.waitForCompletion();

    const logs = session.getLogs();

    // Verify JSON logs are parsed correctly
    const infoLog = logs.find(log => log.message === 'Application started');
    const debugLog = logs.find(log => log.message === 'Config loaded');
    const warnLog = logs.find(log => log.message === 'High memory usage');
    const errorLog = logs.find(log => log.message === 'Database connection failed');

    expect(infoLog?.level).toBe('info');
    expect(debugLog?.level).toBe('debug');
    expect(warnLog?.level).toBe('warn');
    expect(errorLog?.level).toBe('error');
  });

  it('should handle Python subprocess that crashes', async () => {
    const pythonScript = `
import sys
print("Starting process")
sys.exit(1)  # Simulate crash
`;

    const scriptPath = path.join(tempDir, 'crash_test.py');
    fs.writeFileSync(scriptPath, pythonScript);

    const config: ProcessConfig = {
      command: 'python3',
      args: [scriptPath],
      captureOutput: true
    };

    const session = await platform.startPythonLogCapture(config);
    const result = await session.waitForCompletion();

    // Should capture the output before crash
    const logs = session.getLogs();
    expect(logs.some(log => log.message.includes('Starting process'))).toBe(true);

    // Exit code should be non-zero
    expect(result.exitCode).toBe(1);
  });
});