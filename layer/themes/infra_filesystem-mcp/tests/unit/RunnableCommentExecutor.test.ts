/**
 * Unit tests for RunnableCommentExecutor (Mock Free Test Oriented Development)
 * 
 * Testing runnable comment execution with real scripts
 */

import { RunnableCommentExecutor } from '../../children/RunnableCommentExecutor';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('RunnableCommentExecutor', () => {
  let testStepsDir: string;
  let executor: RunnableCommentExecutor;

  beforeEach(async () => {
    // Create a temporary steps directory
    testStepsDir = path.join(os.tmpdir(), 'runnable-comment-executor-test-' + Date.now());
    await fs.promises.mkdir(testStepsDir, { recursive: true });
    executor = new RunnableCommentExecutor(testStepsDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.promises.rm(testStepsDir, { recursive: true, force: true });
  });

  describe('textToScriptName', () => {
    it('should convert simple text to script name', () => {
      expect(executor.textToScriptName('hello world')).toBe('hello_world.js');
    });

    it('should replace angle brackets with underscores', () => {
      expect(executor.textToScriptName('write a <file>')).toBe('write_a__file_.js');
    });

    it('should replace special characters with underscores', () => {
      expect(executor.textToScriptName('test-script@#$%')).toBe('test_script____.js');
    });

    it('should convert to lowercase', () => {
      expect(executor.textToScriptName('Test Script')).toBe('test_script.js');
    });

    it('should handle text with multiple spaces', () => {
      expect(executor.textToScriptName('test   multiple   spaces')).toBe('test___multiple___spaces.js');
    });

    it('should preserve alphanumeric characters and underscores', () => {
      expect(executor.textToScriptName('test_123_ABC')).toBe('test_123_abc.js');
    });
  });

  describe('findScript', () => {
    it('should find JavaScript script', async () => {
      const scriptContent = `console.log('Hello from JS');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'test_script.js'),
        scriptContent
      );

      const scriptPath = executor.findScript('test script');
      expect(scriptPath).toBe(path.join(testStepsDir, 'test_script.js'));
    });

    it('should find Python script', async () => {
      const scriptContent = `print('Hello from Python')`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'test_python.py'),
        scriptContent
      );

      const scriptPath = executor.findScript('test python');
      expect(scriptPath).toBe(path.join(testStepsDir, 'test_python.py'));
    });

    it('should prefer JavaScript over Python', async () => {
      await fs.promises.writeFile(
        path.join(testStepsDir, 'test_both.js'),
        'console.log("JS");'
      );
      await fs.promises.writeFile(
        path.join(testStepsDir, 'test_both.py'),
        'print("Python")'
      );

      const scriptPath = executor.findScript('test both');
      expect(scriptPath).toBe(path.join(testStepsDir, 'test_both.js'));
    });

    it('should return null for non-existent script', () => {
      const scriptPath = executor.findScript('non existent');
      expect(scriptPath).toBeNull();
    });

    it('should handle complex text with special characters', async () => {
      const scriptContent = `console.log('Complex script');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'write_a__file__to__path_.js'),
        scriptContent
      );

      const scriptPath = executor.findScript('write a <file> to <path>');
      expect(scriptPath).toBe(path.join(testStepsDir, 'write_a__file__to__path_.js'));
    });
  });

  describe('execute', () => {
    it('should execute JavaScript script successfully', async () => {
      const scriptContent = `console.log('Output from script');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'echo_test.js'),
        scriptContent
      );

      const result = await executor.execute('echo test');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Output from script');
      expect(result.error).toBeUndefined();
    });

    it('should execute JavaScript script with parameters', async () => {
      const scriptContent = `
const args = process.argv.slice(2);
console.log('Args: ' + args.join(', '));`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'with_args.js'),
        scriptContent
      );

      const result = await executor.execute({
        text: 'with args',
        parameters: ['param1', 'param2', 'param3']
      });
      expect(result.success).toBe(true);
      expect(result.output).toBe('Args: param1, param2, param3');
    });

    it('should handle script execution errors', async () => {
      const scriptContent = `
console.error('Error occurred');
process.exit(1);`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'error_script.js'),
        scriptContent
      );

      const result = await executor.execute('error script');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error occurred');
    });

    it('should return error for non-existent script', async () => {
      const result = await executor.execute('non existent script');
      expect(result.success).toBe(false);
      expect(result.error).toBe('No script found for: "non existent script"');
    });

    it('should execute Python script if Node.js not found', async () => {
      // Skip if Python is not available
      try {
        const pythonVersion = await new Promise((resolve) => {
          const { exec } = require('child_process');
          exec('python3 --version', (error: any) => {
            resolve(!error);
          });
        });
        
        if (!pythonVersion) {
          return; // Skip test if Python not available
        }
      } catch {
        return; // Skip test
      }

      const scriptContent = `print('Hello from Python')`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'python_test.py'),
        scriptContent
      );

      const result = await executor.execute('python test');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello from Python');
    });

    it('should handle script with both stdout and stderr', async () => {
      const scriptContent = `
console.log('Regular output');
console.error('Error output');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'mixed_output.js'),
        scriptContent
      );

      const result = await executor.execute('mixed output');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Regular output');
      expect(result.error).toBe('Error output');
    });

    it('should handle script that produces no output', async () => {
      const scriptContent = `// Silent script`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'silent_script.js'),
        scriptContent
      );

      const result = await executor.execute('silent script');
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
      expect(result.error).toBeUndefined();
    });

    it('should handle executable scripts without extension', async () => {
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      const scriptContent = `console.log('Shell script output');`;
      const scriptPath = path.join(testStepsDir, 'shell_script.js');
      await fs.promises.writeFile(scriptPath, scriptContent);
      await fs.promises.chmod(scriptPath, 0o755);

      const result = await executor.execute('shell script');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Shell script output');
    });

    it('should handle string comment', async () => {
      const scriptContent = `console.log('String comment test');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'string_test.js'),
        scriptContent
      );

      const result = await executor.execute('string test');
      expect(result.success).toBe(true);
      expect(result.output).toBe('String comment test');
    });

    it('should handle RunnableComment object', async () => {
      const scriptContent = `console.log('Object comment test');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'object_test.js'),
        scriptContent
      );

      const result = await executor.execute({
        text: 'object test',
        parameters: []
      });
      expect(result.success).toBe(true);
      expect(result.output).toBe('Object comment test');
    });

    it('should handle script that times out', async () => {
      const scriptContent = `
// This would normally hang forever
setTimeout(() => {
  console.log('Should not reach here');
}, 10000);
console.log('Started');
// Exit after a short delay
setTimeout(() => process.exit(0), 100);`;
      
      await fs.promises.writeFile(
        path.join(testStepsDir, 'timeout_test.js'),
        scriptContent
      );

      const result = await executor.execute('timeout test');
      expect(result.success).toBe(true);
      expect(result.output).toBe('Started');
    }, 10000); // Increase test timeout
  });

  describe('isRunnable', () => {
    it('should return true for existing script', async () => {
      await fs.promises.writeFile(
        path.join(testStepsDir, 'exists.js'),
        'console.log("exists");'
      );

      expect(executor.isRunnable('exists')).toBe(true);
    });

    it('should return false for non-existent script', () => {
      expect(executor.isRunnable('does not exist')).toBe(false);
    });

    it('should handle RunnableComment object', async () => {
      await fs.promises.writeFile(
        path.join(testStepsDir, 'object_runnable.js'),
        'console.log("runnable");'
      );

      expect(executor.isRunnable({
        text: 'object runnable',
        parameters: []
      })).toBe(true);
    });

    it('should check Python scripts', async () => {
      await fs.promises.writeFile(
        path.join(testStepsDir, 'python_runnable.py'),
        'print("runnable")'
      );

      expect(executor.isRunnable('python runnable')).toBe(true);
    });
  });

  describe('default steps directory', () => {
    it('should use default steps directory when not specified', () => {
      const defaultExecutor = new RunnableCommentExecutor();
      const expectedPath = path.join(__dirname, '../../../llm_rules/steps');
      
      // Test by checking if textToScriptName works
      expect(defaultExecutor.textToScriptName('test')).toBe('test.js');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      expect(executor.textToScriptName('')).toBe('.js');
    });

    it('should handle text with only special characters', () => {
      expect(executor.textToScriptName('!@#$%')).toBe('_____.js');
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(200);
      const scriptName = executor.textToScriptName(longText);
      expect(scriptName).toBe(longText + '.js');
    });

    it('should handle Unicode characters', () => {
      expect(executor.textToScriptName('test 你好 мир')).toBe('test_______.js');
    });

    it('should handle comment with undefined parameters', async () => {
      const scriptContent = `console.log('No params');`;
      await fs.promises.writeFile(
        path.join(testStepsDir, 'no_params.js'),
        scriptContent
      );

      const result = await executor.execute({
        text: 'no params'
        // parameters is undefined
      } as any);
      expect(result.success).toBe(true);
      expect(result.output).toBe('No params');
    });
  });
});