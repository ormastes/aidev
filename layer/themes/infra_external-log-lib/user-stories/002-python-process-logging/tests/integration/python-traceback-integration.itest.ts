import { spawn } from 'child_process';
import { pythonExternalLogLib } from '../../src/external/python-external-log-lib';
import { LogEntry } from '../../../001-basic-log-capture/src/external/external-log-lib';

describe('Python Traceback Handling Integration Test', () => {
  it('should capture and parse In Progress Python tracebacks', async () => {
    const pythonCode = `
def function_c():
    raise ValueError("This is a test error")

def function_b():
    function_c()

def function_a():
    function_b()

try:
    function_a()
except Exception as e:
    import traceback
    traceback.print_exc()
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
    
    // All traceback lines should be captured as error level
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);
    
    // Verify key traceback components are captured
    const tracebackMessages = errorLogs.map(log => log.message).join('\n');
    
    expect(tracebackMessages).toContain('Traceback (most recent call last):');
    expect(tracebackMessages).toContain('function_a');
    expect(tracebackMessages).toContain('function_b');
    expect(tracebackMessages).toContain('function_c');
    expect(tracebackMessages).toContain('ValueError: This is a test error');
  });

  it('should handle multiple tracebacks in sequence', async () => {
    const pythonCode = `
import traceback

# First exception
try:
    raise TypeError("First error")
except:
    traceback.print_exc()
    print("---")

# Second exception
try:
    x = 1 / 0
except:
    traceback.print_exc()
    print("---")

# Third exception
try:
    list()[10]
except:
    traceback.print_exc()
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
    
    // Check for all three exception types
    const messages = capturedLogs.map(log => log.message).join('\n');
    
    expect(messages).toContain('TypeError: First error');
    expect(messages).toContain('ZeroDivisionError: division by zero');
    expect(messages).toContain('IndexError: list index out of range');
    
    // Verify separator lines are captured
    const separators = capturedLogs.filter(log => log.message === '---');
    expect(separators.length).toBe(2);
  });

  it('should handle tracebacks mixed with regular logging', async () => {
    const pythonCode = `
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    stream=sys.stderr
)
logger = logging.getLogger('app')

logger.info("Application starting")

try:
    logger.debug("About to perform risky operation")
    raise RuntimeError("Something went wrong")
except Exception as e:
    logger.error(f"Operation failed: {e}")
    import traceback
    traceback.print_exc()
    logger.info("Continuing after error")

logger.info("Application ending")
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
    
    // Verify proper log levels
    const infoLogs = capturedLogs.filter(log => log.level === 'info');
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    
    // Should have info logs before and after the error
    expect(infoLogs.some(log => log.message === 'Application starting')).toBe(true);
    expect(infoLogs.some(log => log.message === 'Continuing after error')).toBe(true);
    expect(infoLogs.some(log => log.message === 'Application ending')).toBe(true);
    
    // Should have error log and traceback
    expect(errorLogs.some(log => log.message.includes('Operation failed: Something went wrong'))).toBe(true);
    expect(errorLogs.some(log => log.message.includes('RuntimeError: Something went wrong'))).toBe(true);
  });

  it('should capture custom exception types and messages', async () => {
    const pythonCode = `
class CustomError(Exception):
    pass

class DetailedError(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code

try:
    raise CustomError("This is a custom error")
except:
    import traceback
    traceback.print_exc()

print("---")

try:
    raise DetailedError("Detailed error message", 42)
except:
    traceback.print_exc()
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
    
    const messages = capturedLogs.map(log => log.message).join('\n');
    
    // Verify custom exceptions are properly captured
    expect(messages).toContain('CustomError: This is a custom error');
    expect(messages).toContain('DetailedError: Detailed error message');
    // When using -c flag, Python doesn't show source code in traceback
    expect(messages).toContain('File "<string>", line');
  });

  it('should handle syntax errors and import errors', async () => {
    const pythonCode = `
# Test ImportError
try:
    import non_existent_module_12345
except ImportError as e:
    import traceback
    traceback.print_exc()

print("---")

# Test AttributeError
try:
    x = None
    x.non_existent_method()
except AttributeError:
    traceback.print_exc()

print("---")

# Test NameError
try:
    print(undefined_variable)
except NameError:
    traceback.print_exc()
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
    
    const errorLogs = capturedLogs.filter(log => log.level === 'error');
    const messages = errorLogs.map(log => log.message).join('\n');
    
    // Verify different error types are captured
    expect(messages).toContain("ModuleNotFoundError: No module named 'non_existent_module_12345'");
    expect(messages).toContain("AttributeError: 'NoneType' object has no attribute 'non_existent_method'");
    expect(messages).toContain("NameError: name 'undefined_variable' is not defined");
  });

  it('should preserve traceback line numbers and file information', async () => {
    const pythonCode = `
def problematic_function():
    x = 10
    y = 0
    return x / y  # This will cause ZeroDivisionError on line 5

try:
    result = problematic_function()
except:
    import traceback
    traceback.print_exc()
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
    
    // Find the file line in traceback
    const fileLineLog = capturedLogs.find(log => 
      log.message.includes('File') && log.message.includes('line')
    );
    
    expect(fileLineLog).toBeDefined();
    expect(fileLineLog?.level).toBe('error');
    
    // Should contain line number
    const messages = capturedLogs.map(log => log.message).join('\n');
    expect(messages).toMatch(/line \d+/);
    // Verify the specific line where error occurred
    expect(messages).toContain('line 5, in problematic_function');
  });
});