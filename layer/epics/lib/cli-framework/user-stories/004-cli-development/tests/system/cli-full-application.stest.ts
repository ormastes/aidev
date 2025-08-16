/**
 * System tests for CLI Framework - Full Application
 */

import { spawn, ChildProcess } from 'child_process';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';
import * as fs from 'fs/promises';
import * as os from 'os';
import { EventEmitter } from 'events';

describe('CLI Framework System Tests', () => {
  let testDir: string;
  let cliProcess: ChildProcess | null = null;
  const CLI_PATH = path.join(__dirname, '../../dist/cli.js');

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `cli-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Kill any running processes
    if (cliProcess && !cliProcess.killed) {
      cliProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('CLI Application Lifecycle', () => {
    it('should start and respond to commands', async () => {
      const result = await runCommand(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
      expect(result.stderr).toBe('');
    });

    it('should handle help command', async () => {
      const result = await runCommand(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('Options:');
    });

    it('should handle invalid commands gracefully', async () => {
      const result = await runCommand(['invalid-command']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown command');
      expect(result.stderr).toContain('invalid-command');
    });
  });

  describe('Project Initialization', () => {
    it('should initialize new project with all required files', async () => {
      const projectName = 'test-project';
      const projectPath = path.join(testDir, projectName);

      const result = await runCommand(['init', projectName], {
        cwd: testDir,
        input: 'y\n' // Confirm initialization
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Project initialized successfully');

      // Verify project structure
      const files = await fs.readdir(projectPath);
      expect(files).toContain('package.json');
      expect(files).toContain('README.md');
      expect(files).toContain('src');
      expect(files).toContain('.gitignore');

      // Verify package.json content
      const packageJson = JSON.parse(
        await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
      );
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.scripts).toHaveProperty('start');
      expect(packageJson.scripts).toHaveProperty('test');
    });

    it('should handle project name conflicts', async () => {
      const projectName = 'existing-project';
      const projectPath = path.join(testDir, projectName);
      
      // Create existing directory
      await fs.mkdir(projectPath);

      const result = await runCommand(['init', projectName], {
        cwd: testDir,
        input: 'n\n' // Don't overwrite
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('already exists');
    });
  });

  describe('Build and Run Commands', () => {
    let projectPath: string;

    beforeEach(async () => {
      // Initialize a test project
      projectPath = path.join(testDir, 'build-test');
      await runCommand(['init', 'build-test'], {
        cwd: testDir,
        input: 'y\n'
      });
    });

    it('should build project successfully', async () => {
      const result = await runCommand(['build'], {
        cwd: projectPath
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Build completed');

      // Verify build output
      const distFiles = await fs.readdir(path.join(projectPath, 'dist'));
      expect(distFiles.length).toBeGreaterThan(0);
      expect(distFiles).toContain('index.js');
    });

    it('should run project in development mode', async () => {
      const devProcess = spawn('node', [CLI_PATH, 'dev'], {
        cwd: projectPath
      });

      // Wait for dev server to start
      const output = await waitForOutput(devProcess, 'Development server started', 5000);
      
      expect(output).toContain('Development server started');
      expect(output).toMatch(/http:\/\/localhost:\d+/);

      // Cleanup
      devProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should watch for file changes', async () => {
      const watchProcess = spawn('node', [CLI_PATH, 'watch'], {
        cwd: projectPath
      });

      // Wait for watcher to start
      await waitForOutput(watchProcess, 'Watching for changes', 3000);

      // Modify a file
      const srcFile = path.join(projectPath, 'src', 'index.js');
      const originalContent = await fs.readFile(srcFile, 'utf-8');
      await fs.writeFile(srcFile, originalContent + '\n// Modified');

      // Wait for rebuild
      const rebuildOutput = await waitForOutput(watchProcess, 'Rebuild completed', 5000);
      expect(rebuildOutput).toContain('File changed');
      expect(rebuildOutput).toContain('Rebuild completed');

      // Cleanup
      watchProcess.kill('SIGTERM');
    });
  });

  describe('Plugin System', () => {
    it('should install and use plugins', async () => {
      const projectPath = path.join(testDir, 'plugin-test');
      await runCommand(['init', 'plugin-test'], {
        cwd: testDir,
        input: 'y\n'
      });

      // Install a plugin
      const installResult = await runCommand(['plugin', 'install', 'cli-plugin-typescript'], {
        cwd: projectPath
      });

      expect(installResult.exitCode).toBe(0);
      expect(installResult.stdout).toContain('Plugin installed');

      // Verify plugin is registered
      const configFile = await fs.readFile(
        path.join(projectPath, '.cli-config.json'),
        'utf-8'
      );
      const config = JSON.parse(configFile);
      expect(config.plugins).toContain('cli-plugin-typescript');

      // Use plugin command
      const tsResult = await runCommand(['typescript', 'init'], {
        cwd: projectPath
      });

      expect(tsResult.exitCode).toBe(0);
      expect(tsResult.stdout).toContain('TypeScript configuration created');
    });
  });

  describe('Configuration Management', () => {
    it('should handle configuration commands', async () => {
      const projectPath = path.join(testDir, 'config-test');
      await runCommand(['init', 'config-test'], {
        cwd: testDir,
        input: 'y\n'
      });

      // Set configuration
      const setResult = await runCommand(['config', 'set', 'output.dir', './build'], {
        cwd: projectPath
      });

      expect(setResult.exitCode).toBe(0);
      expect(setResult.stdout).toContain('Configuration updated');

      // Get configuration
      const getResult = await runCommand(['config', 'get', 'output.dir'], {
        cwd: projectPath
      });

      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('./build');

      // List all configuration
      const listResult = await runCommand(['config', 'list'], {
        cwd: projectPath
      });

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain('output.dir');
      expect(listResult.stdout).toContain('./build');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing dependencies gracefully', async () => {
      const projectPath = path.join(testDir, 'error-test');
      await runCommand(['init', 'error-test'], {
        cwd: testDir,
        input: 'y\n'
      });

      // Remove node_modules to simulate missing dependencies
      await fs.rm(path.join(projectPath, 'node_modules'), { 
        recursive: true, 
        force: true 
      });

      const result = await runCommand(['build'], {
        cwd: projectPath
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Missing dependencies');
      expect(result.stderr).toContain('npm install');
    });

    it('should handle interrupted processes', async () => {
      const projectPath = path.join(testDir, 'interrupt-test');
      await runCommand(['init', 'interrupt-test'], {
        cwd: testDir,
        input: 'y\n'
      });

      const longProcess = spawn('node', [CLI_PATH, 'long-running-task'], {
        cwd: projectPath
      });

      // Wait a bit then interrupt
      await new Promise(resolve => setTimeout(resolve, 1000));
      longProcess.kill('SIGINT');

      const exitCode = await new Promise<number>((resolve) => {
        longProcess.on('exit', (code) => resolve(code || 0));
      });

      expect(exitCode).toBe(130); // Standard SIGINT exit code
    });
  });

  describe('Interactive Mode', () => {
    it('should handle interactive prompts', async () => {
      const result = await runCommand(['interactive'], {
        input: 'create\nmy-component\nyes\nexit\n'
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Welcome to interactive mode');
      expect(result.stdout).toContain('Component created: my-component');
      expect(result.stdout).toContain('Goodbye!');
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large projects efficiently', async () => {
      const projectPath = path.join(testDir, 'large-project');
      await runCommand(['init', 'large-project'], {
        cwd: testDir,
        input: 'y\n'
      });

      // Create many files
      const srcDir = path.join(projectPath, 'src');
      const filePromises = [];
      for (let i = 0; i < 100; i++) {
        filePromises.push(
          fs.writeFile(
            path.join(srcDir, `module-${i}.js`),
            `export const module${i} = () => 'Module ${i}';`
          )
        );
      }
      await Promise.all(filePromises);

      // Measure build time
      const startTime = Date.now();
      const result = await runCommand(['build', '--stats'], {
        cwd: projectPath
      });
      const buildTime = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(buildTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.stdout).toContain('Files processed: 100');
    });
  });

  // Helper functions
  async function runCommand(
    args: string[],
    options: {
      cwd?: string;
      input?: string;
      timeout?: number;
    } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('node', [CLI_PATH, ...args], {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      if (options.input) {
        proc.stdin.write(options.input);
        proc.stdin.end();
      }

      const timeout = options.timeout || 30000;
      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      proc.on('exit', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async function waitForOutput(
    proc: ChildProcess,
    expectedOutput: string,
    timeout: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for output: "${expectedOutput}"`));
      }, timeout);

      const handler = (data: Buffer) => {
        output += data.toString();
        if (output.includes(expectedOutput)) {
          clearTimeout(timer);
          proc.stdout?.removeListener('data', handler);
          resolve(output);
        }
      };

      proc.stdout?.on('data', handler);
    });
  }
});