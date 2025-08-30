import { test, expect, Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

test.describe('Python Process Logging System Tests', () => {
  let tempDir: string;
  let pythonScript: string;
  let logOutput: string;

  test.beforeEach(async () => {
    // Setup temporary directory for test artifacts
    tempDir = path.join(__dirname, '..', '..', 'temp', `test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    pythonScript = path.join(tempDir, 'test_script.py');
    logOutput = path.join(tempDir, 'python_process.log');
    
    // Create a sample Python script that generates various log messages
    const pythonCode = `
import logging
import sys
import time
import json
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('${logOutput}'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('test_python_process')

def main():
    logger.info("Starting Python process logging test")
    
    # Test various log levels
    logger.debug("Debug message with process info")
    logger.info("Info: Processing data batch 1")
    logger.warning("Warning: High memory usage detected")
    
    # Simulate subprocess calls
    try:
        result = subprocess.run(['echo', 'subprocess test'], capture_output=True, text=True)
        logger.info(f"Subprocess output: {result.stdout.strip()}")
    except Exception as e:
        logger.error(f"Subprocess error: {e}")
    
    # Test structured logging with JSON
    structured_data = {
        'process_id': 12345,
        'memory_usage': '256MB',
        'status': 'processing',
        'items_processed': 100
    }
    logger.info(f"Structured log: {json.dumps(structured_data)}")
    
    # Simulate error condition
    try:
        raise ValueError("Simulated error for testing")
    except Exception as e:
        logger.exception(f"Exception occurred: {e}")
    
    logger.info("Python process logging test completed")

if __name__ == '__main__':
    main()
`;
    
    await fs.writeFile(pythonScript, pythonCode);
  });

  test.afterEach(async () => {
    // Cleanup temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should capture Python process logs with all log levels', async () => {
    // Execute the Python script
    const { stdout, stderr } = await execAsync(`python3 "${pythonScript}"`);
    
    // Verify script executed successfully
    expect(stderr).not.toContain('Traceback');
    
    // Verify log file was created
    const logExists = await fs.access(logOutput).then(() => true).catch(() => false);
    expect(logExists).toBe(true);
    
    // Read and verify log content
    const logContent = await fs.readFile(logOutput, 'utf-8');
    
    // Verify all log levels are captured
    expect(logContent).toContain('DEBUG');
    expect(logContent).toContain('INFO');
    expect(logContent).toContain('WARNING');
    expect(logContent).toContain('ERROR');
    
    // Verify specific log messages
    expect(logContent).toContain('Starting Python process logging test');
    expect(logContent).toContain('Debug message with process info');
    expect(logContent).toContain('High memory usage detected');
    expect(logContent).toContain('Subprocess output: subprocess test');
    expect(logContent).toContain('Structured log:');
    expect(logContent).toContain('Exception occurred: Simulated error for testing');
    expect(logContent).toContain('Python process logging test completed');
  });

  test('should parse structured JSON logs from Python processes', async () => {
    await execAsync(`python3 "${pythonScript}"`);
    
    const logContent = await fs.readFile(logOutput, 'utf-8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    // Find and parse structured log entry
    const structuredLogLine = logLines.find(line => line.includes('Structured log:'));
    expect(structuredLogLine).toBeDefined();
    
    // Extract JSON from log line
    const jsonMatch = structuredLogLine?.match(/Structured log: ({.*})/);
    expect(jsonMatch).toBeDefined();
    
    const parsedData = JSON.parse(jsonMatch![1]);
    expect(parsedData).toMatchObject({
      process_id: 12345,
      memory_usage: '256MB',
      status: 'processing',
      items_processed: 100
    });
  });

  test('should handle Python subprocess logging correctly', async () => {
    await execAsync(`python3 "${pythonScript}"`);
    
    const logContent = await fs.readFile(logOutput, 'utf-8');
    
    // Verify subprocess output is captured
    expect(logContent).toContain('Subprocess output: subprocess test');
    
    // Verify no subprocess errors in normal case
    expect(logContent).not.toContain('Subprocess error:');
  });

  test('should capture Python exception stack traces', async () => {
    await execAsync(`python3 "${pythonScript}"`);
    
    const logContent = await fs.readFile(logOutput, 'utf-8');
    
    // Verify exception logging
    expect(logContent).toContain('Exception occurred: Simulated error for testing');
    expect(logContent).toContain('Traceback');
    expect(logContent).toContain('ValueError: Simulated error for testing');
    
    // Verify stack trace includes our test function
    expect(logContent).toContain('in main');
  });

  test('should handle long-running Python process logging', async ({ timeout }) => {
    timeout(30000); // 30 second timeout for long-running test
    
    // Create a long-running Python script
    const longRunningScript = path.join(tempDir, 'long_running.py');
    const longRunningCode = `
import logging
import time
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('${logOutput}'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('long_running_process')

for i in range(5):
    logger.info(f"Processing iteration {i + 1}/5")
    logger.debug(f"Detailed debug info for iteration {i + 1}")
    time.sleep(2)  # Simulate processing time
    
    if i == 2:
        logger.warning("Midpoint warning: Resource usage increasing")

logger.info("Long running process completed")
`;
    
    await fs.writeFile(longRunningScript, longRunningCode);
    
    // Run the long-running script
    const { stdout } = await execAsync(`python3 "${longRunningScript}"`);
    
    const logContent = await fs.readFile(logOutput, 'utf-8');
    
    // Verify all iterations are logged
    for (let i = 1; i <= 5; i++) {
      expect(logContent).toContain(`Processing iteration ${i}/5`);
    }
    
    // Verify warning at midpoint
    expect(logContent).toContain('Midpoint warning: Resource usage increasing');
    expect(logContent).toContain('Long running process completed');
  });

  test('should handle concurrent Python processes logging', async () => {
    // Create multiple Python scripts for concurrent execution
    const scripts: string[] = [];
    const processes: Promise<any>[] = [];
    
    for (let i = 0; i < 3; i++) {
      const scriptPath = path.join(tempDir, `concurrent_${i}.py`);
      const scriptCode = `
import logging
import time
import random
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - Process${i} - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('${path.join(tempDir, `concurrent_${i}.log`)}'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(f'concurrent_process_${i}')

# Simulate different processing patterns
for j in range(3):
    logger.info(f"Process ${i} - Iteration {j + 1}")
    time.sleep(random.uniform(0.1, 0.5))
    
logger.info(f"Process ${i} completed")
`;
      
      await fs.writeFile(scriptPath, scriptCode);
      scripts.push(scriptPath);
    }
    
    // Execute all scripts concurrently
    const promises = scripts.map(script => execAsync(`python3 "${script}"`));
    await Promise.all(promises);
    
    // Verify each process created its own log file
    for (let i = 0; i < 3; i++) {
      const logFile = path.join(tempDir, `concurrent_${i}.log`);
      const logExists = await fs.access(logFile).then(() => true).catch(() => false);
      expect(logExists).toBe(true);
      
      const logContent = await fs.readFile(logFile, 'utf-8');
      expect(logContent).toContain(`Process ${i} completed`);
      
      // Verify all iterations are present
      for (let j = 1; j <= 3; j++) {
        expect(logContent).toContain(`Process ${i} - Iteration ${j}`);
      }
    }
  });
});