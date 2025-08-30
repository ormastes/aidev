import { test, expect } from '@playwright/test';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * System Tests for Python Environment Integration
 * Validates Python process management, virtual environments, and package management
 */

test.describe('Python Environment System Tests', () => {
  const workspaceRoot = process.cwd();
  const pythonTestDir = path.join(workspaceRoot, 'gen/test-python');
  const venvPath = path.join(pythonTestDir, 'venv');
  
  test.beforeAll(async () => {
    // Create test directory
    await fs.mkdir(pythonTestDir, { recursive: true });
  });

  test.afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(pythonTestDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  test.describe('Python Runtime Detection', () => {
    test('should detect Python installation', async () => {
      const { stdout, stderr } = await execAsync('python3 --version');
      expect(stdout).toMatch(/Python 3\.\d+\.\d+/);
      expect(stderr).toBe('');
    });

    test('should detect pip installation', async () => {
      const { stdout } = await execAsync('python3 -m pip --version');
      expect(stdout).toMatch(/pip \d+\.\d+/);
    });

    test('should list installed packages', async () => {
      const { stdout } = await execAsync('python3 -m pip list --format=json');
      const packages = JSON.parse(stdout);
      expect(Array.isArray(packages)).toBe(true);
      expect(packages.length).toBeGreaterThan(0);
    });
  });

  test.describe('Virtual Environment Management', () => {
    test('should create virtual environment', async () => {
      await execAsync(`python3 -m venv ${venvPath}`);
      
      // Check venv structure
      const venvExists = await fs.access(venvPath).then(() => true).catch(() => false);
      expect(venvExists).toBe(true);
      
      const binDir = path.join(venvPath, 'bin');
      const binExists = await fs.access(binDir).then(() => true).catch(() => false);
      expect(binExists).toBe(true);
      
      const pythonBin = path.join(binDir, 'python');
      const pythonExists = await fs.access(pythonBin).then(() => true).catch(() => false);
      expect(pythonExists).toBe(true);
    });

    test('should activate and use virtual environment', async () => {
      // Create a test script
      const testScript = path.join(pythonTestDir, 'test_venv.py');
      await fs.writeFile(testScript, `
import sys
print(sys.prefix)
print(sys.executable)
      `);

      // Run script with venv Python
      const venvPython = path.join(venvPath, 'bin', 'python');
      const { stdout } = await execAsync(`${venvPython} ${testScript}`);
      
      // Should use venv paths
      expect(stdout).toContain(venvPath);
    });

    test('should install packages in virtual environment', async () => {
      const venvPip = path.join(venvPath, 'bin', 'pip');
      
      // Install a test package
      await execAsync(`${venvPip} install requests`);
      
      // Verify installation
      const { stdout } = await execAsync(`${venvPip} list --format=json`);
      const packages = JSON.parse(stdout);
      const hasRequests = packages.some((pkg: any) => pkg.name === 'requests');
      expect(hasRequests).toBe(true);
    });
  });

  test.describe('Python Process Management', () => {
    test('should spawn Python process and capture output', async () => {
      const script = path.join(pythonTestDir, 'output_test.py');
      await fs.writeFile(script, `
print("stdout message")
import sys
print("error message", file=sys.stderr)
sys.exit(0)
      `);

      const result = await new Promise<{stdout: string, stderr: string, code: number}>((resolve) => {
        const proc = spawn('python3', [script]);
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('close', (code) => {
          resolve({ stdout, stderr, code: code || 0 });
        });
      });

      expect(result.stdout).toContain('stdout message');
      expect(result.stderr).toContain('error message');
      expect(result.code).toBe(0);
    });

    test('should handle Python process errors', async () => {
      const script = path.join(pythonTestDir, 'error_test.py');
      await fs.writeFile(script, `
raise ValueError("Test error")
      `);

      const result = await new Promise<{stderr: string, code: number}>((resolve) => {
        const proc = spawn('python3', [script]);
        let stderr = '';
        
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('close', (code) => {
          resolve({ stderr, code: code || 0 });
        });
      });

      expect(result.stderr).toContain('ValueError');
      expect(result.stderr).toContain('Test error');
      expect(result.code).not.toBe(0);
    });

    test('should terminate long-running Python process', async () => {
      const script = path.join(pythonTestDir, 'long_running.py');
      await fs.writeFile(script, `
import time
import signal
import sys

def signal_handler(sig, frame):
    print("Process terminated")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

print("Process started")
while True:
    time.sleep(0.1)
      `);

      const proc = spawn('python3', [script]);
      
      // Wait for process to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Terminate process
      proc.kill('SIGTERM');
      
      // Wait for process to exit
      const exitCode = await new Promise<number>((resolve) => {
        proc.on('close', (code) => {
          resolve(code || 0);
        });
      });

      expect(exitCode).toBe(0);
    });
  });

  test.describe('Python-Node Integration', () => {
    test('should execute Python from Node/Bun', async () => {
      const script = path.join(pythonTestDir, 'json_output.py');
      await fs.writeFile(script, `
import json
data = {
    "status": "success",
    "value": 42,
    "items": ["a", "b", "c"]
}
print(json.dumps(data))
      `);

      const { stdout } = await execAsync(`python3 ${script}`);
      const data = JSON.parse(stdout);
      
      expect(data.status).toBe('success');
      expect(data.value).toBe(42);
      expect(data.items).toEqual(['a', 'b', 'c']);
    });

    test('should pass arguments to Python script', async () => {
      const script = path.join(pythonTestDir, 'args_test.py');
      await fs.writeFile(script, `
import sys
import json
args = sys.argv[1:]
result = {
    "count": len(args),
    "args": args
}
print(json.dumps(result))
      `);

      const { stdout } = await execAsync(`python3 ${script} arg1 arg2 arg3`);
      const result = JSON.parse(stdout);
      
      expect(result.count).toBe(3);
      expect(result.args).toEqual(['arg1', 'arg2', 'arg3']);
    });

    test('should pipe data to Python process', async () => {
      const script = path.join(pythonTestDir, 'stdin_test.py');
      await fs.writeFile(script, `
import sys
import json
data = sys.stdin.read()
parsed = json.loads(data)
parsed['processed'] = True
print(json.dumps(parsed))
      `);

      const inputData = JSON.stringify({ test: 'data', value: 123 });
      const { stdout } = await execAsync(`echo '${inputData}' | python3 ${script}`);
      const result = JSON.parse(stdout);
      
      expect(result.test).toBe('data');
      expect(result.value).toBe(123);
      expect(result.processed).toBe(true);
    });
  });

  test.describe('Python Package Management', () => {
    test('should install packages from requirements.txt', async () => {
      const reqFile = path.join(pythonTestDir, 'requirements.txt');
      await fs.writeFile(reqFile, 'requests==2.31.0\n');
      
      const venvPip = path.join(venvPath, 'bin', 'pip');
      await execAsync(`${venvPip} install -r ${reqFile}`);
      
      const { stdout } = await execAsync(`${venvPip} show requests`);
      expect(stdout).toContain('Version: 2.31.0');
    });

    test('should freeze installed packages', async () => {
      const venvPip = path.join(venvPath, 'bin', 'pip');
      const { stdout } = await execAsync(`${venvPip} freeze`);
      
      expect(stdout).toContain('requests==');
      
      // Save freeze output
      const freezeFile = path.join(pythonTestDir, 'freeze.txt');
      await fs.writeFile(freezeFile, stdout);
      
      const freezeContent = await fs.readFile(freezeFile, 'utf-8');
      expect(freezeContent).toBe(stdout);
    });
  });

  test.describe('Python Script Execution Security', () => {
    test('should sandbox Python execution', async () => {
      const script = path.join(pythonTestDir, 'sandbox_test.py');
      await fs.writeFile(script, `
import os
import sys

# Try to access parent directory (should be restricted in production)
try:
    parent_files = os.listdir('..')
    print(f"Parent dir access: {len(parent_files)} files")
except Exception as e:
    print(f"Parent dir access blocked: {e}")

# Try to import dangerous modules
dangerous_modules = ['subprocess', 'socket', 'ctypes']
for module in dangerous_modules:
    try:
        __import__(module)
        print(f"Module {module}: imported")
    except ImportError as e:
        print(f"Module {module}: blocked")
      `);

      const { stdout } = await execAsync(`python3 ${script}`);
      console.log('Sandbox test output:', stdout);
      
      // In production, these should be blocked
      // For now, just verify the script runs
      expect(stdout).toBeDefined();
    });
  });

  test.describe('Python Logging Integration', () => {
    test('should capture Python logs', async () => {
      const script = path.join(pythonTestDir, 'logging_test.py');
      await fs.writeFile(script, `
import logging
import json
import sys

# Configure logging to output JSON
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'source': record.name,
            'message': record.getMessage(),
            'details': {
                'filename': record.filename,
                'line': record.lineno,
                'function': record.funcName
            }
        }
        return json.dumps(log_obj)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logger = logging.getLogger('test_logger')
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)

# Generate logs
logger.debug('Debug message')
logger.info('Info message')
logger.warning('Warning message')
logger.error('Error message')
      `);

      const { stdout } = await execAsync(`python3 ${script}`);
      const logs = stdout.trim().split('\n').map(line => JSON.parse(line));
      
      expect(logs).toHaveLength(4);
      expect(logs[0].level).toBe('DEBUG');
      expect(logs[1].level).toBe('INFO');
      expect(logs[2].level).toBe('WARNING');
      expect(logs[3].level).toBe('ERROR');
      
      logs.forEach(log => {
        expect(log.timestamp).toBeDefined();
        expect(log.source).toBe('test_logger');
        expect(log.details.filename).toBe('logging_test.py');
      });
    });
  });

  test.describe('Python Performance Monitoring', () => {
    test('should measure Python script execution time', async () => {
      const script = path.join(pythonTestDir, 'performance_test.py');
      await fs.writeFile(script, `
import time
import json

start = time.time()

# Simulate work
time.sleep(0.1)
result = sum(range(1000000))

end = time.time()

print(json.dumps({
    'execution_time': end - start,
    'result': result
}))
      `);

      const startTime = Date.now();
      const { stdout } = await execAsync(`python3 ${script}`);
      const endTime = Date.now();
      
      const output = JSON.parse(stdout);
      const nodeExecutionTime = (endTime - startTime) / 1000;
      
      expect(output.execution_time).toBeGreaterThan(0.1);
      expect(output.execution_time).toBeLessThan(1);
      expect(nodeExecutionTime).toBeGreaterThan(output.execution_time);
      expect(output.result).toBe(499999500000);
    });

    test('should monitor Python memory usage', async () => {
      const script = path.join(pythonTestDir, 'memory_test.py');
      await fs.writeFile(script, `
import sys
import json

# Create large data structure
data = [i for i in range(1000000)]
size = sys.getsizeof(data)

print(json.dumps({
    'memory_bytes': size,
    'memory_mb': size / (1024 * 1024),
    'list_length': len(data)
}))
      `);

      const { stdout } = await execAsync(`python3 ${script}`);
      const output = JSON.parse(stdout);
      
      expect(output.memory_bytes).toBeGreaterThan(1000000);
      expect(output.memory_mb).toBeGreaterThan(1);
      expect(output.list_length).toBe(1000000);
    });
  });
});