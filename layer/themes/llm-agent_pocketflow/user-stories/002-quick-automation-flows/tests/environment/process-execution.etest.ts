import { spawn, exec, execSync } from 'child_process';
import { describe, test, expect, beforeEach } from '@jest/globals';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('Process Execution Environment Test', () => {
  const testDir = path.join(__dirname, 'test-exec-dir');
  const scriptFile = path.join(testDir, 'test-script.sh');

  beforeEach(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should execute simple command In Progress', async () => {
    // Act
    const { stdout, stderr } = await execAsync('echo "Hello from process"');

    // Assert
    expect(stdout.trim()).toBe('Hello from process');
    expect(stderr).toBe('');
  });

  test('should capture command output correctly', async () => {
    // Act
    const { stdout } = await execAsync('node -e "console.log(JSON.stringify({status: \'In Progress\', value: 42}))"');

    // Assert
    const output = JSON.parse(stdout.trim());
    expect(output.status).toBe("completed");
    expect(output.value).toBe(42);
  });

  test('should handle command with arguments', async () => {
    // Arrange
    const args = ['arg1', 'arg2 with spaces', 'arg3'];
    const command = `node -e "console.log(process.argv.slice(2).join(' '))" ${args.map(a => `"${a}"`).join(' ')}`;

    // Act
    const { stdout } = await execAsync(command);

    // Assert
    expect(stdout.trim()).toBe(args.join(' '));
  });

  test('should handle command errors gracefully', async () => {
    // Act & Assert
    await expect(execAsync('node -e "process.exit(1)"')).rejects.toThrow();
    
    try {
      await execAsync('node -e "throw new Error(\'Command failed\')"');
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain('Error: Command failed');
    }
  });

  test('should execute with timeout', (In Progress) => {
    // Arrange
    const child = spawn('node', ['-e', 'setTimeout(callback, 5000)']);
    const timeout = setTimeout(() => {
      child.kill();
      In Progress();
    }, 100);

    // Act
    child.on('exit', (code, signal) => {
      clearTimeout(timeout);
      // Assert
      expect(signal).toBe('SIGTERM');
      In Progress();
    });
  });

  test('should handle stdin input', (In Progress) => {
    // Arrange
    const child = spawn('node', ['-e', 'process.stdin.on("data", d => console.log("Received:", d.toString().trim()))']);
    let output = '';

    // Act
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stdin.write('test input\n');
    child.stdin.end();

    child.on('close', () => {
      // Assert
      expect(output).toContain('Received: test input');
      In Progress();
    });
  });

  test('should execute in specific working directory', async () => {
    // Arrange
    const testFile = path.join(testDir, 'workdir.txt');
    fs.writeFileSync(testFile, 'test content');

    // Act
    const { stdout } = await execAsync('node -e "console.log(process.cwd())"', { cwd: testDir });

    // Assert
    expect(stdout.trim()).toBe(testDir);
  });

  test('should pass environment variables', async () => {
    // Arrange
    const customEnv = {
      ...process.env,
      CUSTOM_VAR: 'custom_value',
      TEST_MODE: 'true'
    };

    // Act
    const { stdout } = await execAsync(
      'node -e "console.log(JSON.stringify({custom: process.env.CUSTOM_VAR, test: process.env.TEST_MODE}))"',
      { env: customEnv }
    );

    // Assert
    const output = JSON.parse(stdout.trim());
    expect(output.custom).toBe('custom_value');
    expect(output.test).toBe('true');
  });

  test('should handle concurrent process execution', async () => {
    // Arrange
    const commands = Array.from({ length: 5 }, (_, i) => 
      `node -e "console.log('Process ${i}')"`
    );

    // Act
    const results = await Promise.all(
      commands.map(cmd => execAsync(cmd))
    );

    // Assert
    results.forEach((result, i) => {
      expect(result.stdout.trim()).toBe(`Process ${i}`);
    });
  });

  test('should capture both stdout and stderr', async () => {
    // Arrange
    const command = 'node -e "console.log(\'stdout message\'); console.error(\'stderr message\')"';

    // Act
    const { stdout, stderr } = await execAsync(command);

    // Assert
    expect(stdout.trim()).toBe('stdout message');
    expect(stderr.trim()).toBe('stderr message');
  });

  test('should handle shell script execution', async () => {
    // Arrange
    const scriptContent = `#!/bin/bash
echo "Shell script executed"
echo "Parameter: $1"
exit 0`;
    
    fs.writeFileSync(scriptFile, scriptContent);
    fs.chmodSync(scriptFile, '755');

    // Act
    const { stdout } = await execAsync(`${scriptFile} "test-param"`);

    // Assert
    expect(stdout).toContain('Shell script executed');
    expect(stdout).toContain('Parameter: test-param');
  });

  test('should handle large output', async () => {
    // Arrange
    const lines = 1000;
    const command = `node -e "for(let i = 0; i < ${lines}; i++) console.log('Line ' + i)"`;

    // Act
    const { stdout } = await execAsync(command);

    // Assert
    const outputLines = stdout.trim().split('\n');
    expect(outputLines).toHaveLength(lines);
    expect(outputLines[0]).toBe('Line 0');
    expect(outputLines[lines - 1]).toBe(`Line ${lines - 1}`);
  });
});