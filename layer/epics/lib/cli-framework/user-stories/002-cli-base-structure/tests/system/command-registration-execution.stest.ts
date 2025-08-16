import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';
import { CLI, Command } from '../../src/index.js';

/**
 * Mockless System Test: Command Registration and Execution
 * 
 * Tests real command registration, execution, and output using actual process spawning
 * and file I/O without any mocks.
 */

describe('Command Registration and Execution System Tests', () => {
  const TEST_DIR = path.join(process.cwd(), 'test-cli-output');
  const TEST_SCRIPT = path.join(TEST_DIR, 'test-cli.js');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Basic Command Registration', () => {
    test('should register and execute a simple command', async () => {
      // Create a test CLI script
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class TestCommand extends Command {
  name = 'test';
  description = 'Test command';
  
  async execute() {
    console.log('Command executed In Progress');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new TestCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Execute the script
      const output = await executeScript(TEST_SCRIPT, ['test']);
      
      expect(output.stdout).toContain('Command executed In Progress');
      expect(output.exitCode).toBe(0);
    });

    test('should handle command with options', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class GreetCommand extends Command {
  name = 'greet';
  description = 'Greet someone';
  
  options = {
    name: {
      type: 'string',
      alias: 'n',
      description: 'Name to greet',
      required: true
    },
    loud: {
      type: 'boolean',
      alias: 'l',
      description: 'Shout the greeting',
      default: false
    }
  };
  
  async execute(options) {
    const greeting = \`Hello, \${options.name}!\`;
    console.log(options.loud ? greeting.toUpperCase() : greeting);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new GreetCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test with different option formats
      const output1 = await executeScript(TEST_SCRIPT, ['greet', '--name', 'Alice']);
      expect(output1.stdout).toContain('Hello, Alice!');
      expect(output1.exitCode).toBe(0);

      const output2 = await executeScript(TEST_SCRIPT, ['greet', '-n', 'Bob', '--loud']);
      expect(output2.stdout).toContain('HELLO, BOB!');
      expect(output2.exitCode).toBe(0);

      // Test missing required option
      const output3 = await executeScript(TEST_SCRIPT, ['greet']);
      expect(output3.stderr).toContain('required');
      expect(output3.exitCode).toBe(1);
    });

    test('should register multiple commands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class FooCommand extends Command {
  name = 'foo';
  description = 'Foo command';
  
  async execute() {
    console.log('Foo executed');
  }
}

class BarCommand extends Command {
  name = 'bar';
  description = 'Bar command';
  
  async execute() {
    console.log('Bar executed');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new FooCommand().getDefinition());
cli.register(new BarCommand().getDefinition());

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output1 = await executeScript(TEST_SCRIPT, ['foo']);
      expect(output1.stdout).toContain('Foo executed');

      const output2 = await executeScript(TEST_SCRIPT, ['bar']);
      expect(output2.stdout).toContain('Bar executed');
    });

    test('should handle command aliases', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class StatusCommand extends Command {
  name = 'status';
  description = 'Show status';
  aliases = ['st', 'stat'];
  
  async execute() {
    console.log('Status: OK');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new StatusCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test main command
      const output1 = await executeScript(TEST_SCRIPT, ['status']);
      expect(output1.stdout).toContain('Status: OK');

      // Test aliases
      const output2 = await executeScript(TEST_SCRIPT, ['st']);
      expect(output2.stdout).toContain('Status: OK');

      const output3 = await executeScript(TEST_SCRIPT, ['stat']);
      expect(output3.stdout).toContain('Status: OK');
    });
  });

  describe('Nested Commands', () => {
    test('should handle nested subcommands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class GitCommand extends Command {
  name = 'git';
  description = 'Git-like command';
  
  subcommands = [
    {
      metadata: {
        name: 'add',
        description: 'Add files'
      },
      execute: async () => {
        console.log('Files added');
      }
    },
    {
      metadata: {
        name: 'commit',
        description: 'Commit changes'
      },
      options: {
        message: {
          type: 'string',
          alias: 'm',
          description: 'Commit message',
          required: true
        }
      },
      execute: async (options) => {
        console.log(\`Committed with message: \${options.message}\`);
      }
    }
  ];
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new GitCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test subcommand execution
      const output1 = await executeScript(TEST_SCRIPT, ['git', 'add']);
      expect(output1.stdout).toContain('Files added');

      const output2 = await executeScript(TEST_SCRIPT, ['git', 'commit', '-m', 'Initial commit']);
      expect(output2.stdout).toContain('Committed with message: Initial commit');
    });
  });

  describe('Real File I/O', () => {
    test('should read and write files through commands', async () => {
      const inputFile = path.join(TEST_DIR, 'input.txt');
      const outputFile = path.join(TEST_DIR, 'output.txt');
      await fs.writeFile(inputFile, 'Hello, World!', 'utf8');

      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as fs from 'fs/promises';

class CopyCommand extends Command {
  name = 'copy';
  description = 'Copy file';
  
  options = {
    input: {
      type: 'string',
      alias: 'i',
      description: 'Input file',
      required: true
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output file',
      required: true
    },
    uppercase: {
      type: 'boolean',
      alias: 'u',
      description: 'Convert to uppercase',
      default: false
    }
  };
  
  async execute(options) {
    try {
      let content = await fs.readFile(options.input, 'utf8');
      if (options.uppercase) {
        content = content.toUpperCase();
      }
      await fs.writeFile(options.output, content, 'utf8');
      console.log(\`Copied \${options.input} to \${options.output}\`);
    } catch (error) {
      console.error(\`Error: \${error.message}\`);
      process.exit(1);
    }
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new CopyCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test file copy
      const output = await executeScript(TEST_SCRIPT, [
        'copy', '-i', inputFile, '-o', outputFile
      ]);
      
      expect(output.stdout).toContain(`Copied ${inputFile} to ${outputFile}`);
      
      const content = await fs.readFile(outputFile, 'utf8');
      expect(content).toBe('Hello, World!');

      // Test with uppercase option
      const outputFile2 = path.join(TEST_DIR, 'output2.txt');
      const output2 = await executeScript(TEST_SCRIPT, [
        'copy', '-i', inputFile, '-o', outputFile2, '--uppercase'
      ]);
      
      const content2 = await fs.readFile(outputFile2, 'utf8');
      expect(content2).toBe('HELLO, WORLD!');
    });
  });

  describe('Environment and Context', () => {
    test('should access environment variables and working directory', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class EnvCommand extends Command {
  name = 'env';
  description = 'Show environment info';
  
  async execute() {
    console.log('CWD:', this.context.cwd);
    console.log('TEST_VAR:', this.context.env.TEST_VAR || 'not set');
    console.log('NODE_ENV:', this.context.env.NODE_ENV || 'not set');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new EnvCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test with environment variables
      const output = await executeScript(TEST_SCRIPT, ['env'], {
        env: {
          ...process.env,
          TEST_VAR: 'test-value',
          NODE_ENV: 'test'
        },
        cwd: TEST_DIR
      });
      
      expect(output.stdout).toContain(`CWD: ${TEST_DIR}`);
      expect(output.stdout).toContain('TEST_VAR: test-value');
      expect(output.stdout).toContain('NODE_ENV: test');
    });
  });

  describe('Exit Codes', () => {
    test('should handle different exit codes', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class ExitCommand extends Command {
  name = 'exit';
  description = 'Exit with code';
  
  options = {
    code: {
      type: 'number',
      alias: 'c',
      description: 'Exit code',
      default: 0
    }
  };
  
  async execute(options) {
    console.log(\`Exiting with code \${options.code}\`);
    process.exit(options.code);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new ExitCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test different exit codes
      const output1 = await executeScript(TEST_SCRIPT, ['exit', '-c', '0']);
      expect(output1.exitCode).toBe(0);

      const output2 = await executeScript(TEST_SCRIPT, ['exit', '-c', '1']);
      expect(output2.exitCode).toBe(1);

      const output3 = await executeScript(TEST_SCRIPT, ['exit', '-c', '42']);
      expect(output3.exitCode).toBe(42);
    });
  });
});

// Helper function to execute scripts and capture output
async function executeScript(
  scriptPath: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; cwd?: string } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', [scriptPath, ...args], {
      env: options.env || process.env,
      cwd: options.cwd || process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });
  });
}