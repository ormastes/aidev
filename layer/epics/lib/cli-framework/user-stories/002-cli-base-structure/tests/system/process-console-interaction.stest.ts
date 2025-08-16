import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';
import * as readline from 'readline';
import { Readable, Writable } from 'stream';

const execAsync = promisify(exec);

/**
 * Mockless System Test: Process and Console Interaction
 * 
 * Tests real process interactions, console I/O, and stream handling:
 * - Interactive prompts and user input
 * - Progress indicators and spinners
 * - Colored output and formatting
 * - Stream piping and redirection
 * - Child process spawning
 */

describe('Process and Console Interaction Tests', () => {
  const TEST_DIR = path.join(process.cwd(), 'test-process-output');
  const TEST_SCRIPT = path.join(TEST_DIR, 'test-process-cli.js');

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Interactive Prompts', () => {
    test('should handle interactive user input', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as readline from 'readline';

class InteractiveCommand extends Command {
  name = 'interactive';
  description = 'Interactive command';
  
  async execute(options, context) {
    const rl = readline.createInterface({
      input: context.stdin,
      output: context.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('What is your name? ', (name) => {
        console.log(\`Hello, \${name}!\`);
        rl.close();
        resolve();
      });
    });
  }
}

const cli = new CLI({
  name: 'interactive-cli',
  version: '1.0.0'
});

cli.register(new InteractiveCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test with automated input
      const child = spawn('node', [TEST_SCRIPT, 'interactive']);
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('What is your name?')) {
          child.stdin.write('Alice\n');
        }
      });

      const result = await new Promise<{ output: string; exitCode: number }>((resolve) => {
        child.on('exit', (code) => {
          resolve({ output, exitCode: code || 0 });
        });
      });

      expect(result.output).toContain('What is your name?');
      expect(result.output).toContain('Hello, Alice!');
      expect(result.exitCode).toBe(0);
    });

    test('should handle multiple prompts in sequence', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as readline from 'readline';

class SetupCommand extends Command {
  name = 'setup';
  description = 'Setup wizard';
  
  async execute(options, context) {
    const rl = readline.createInterface({
      input: context.stdin,
      output: context.stdout
    });
    
    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, Working on);
    });
    
    const name = await question('Project name: ');
    const description = await question('Description: ');
    const author = await question('Author: ');
    
    console.log('\\nProject Configuration:');
    console.log(\`Name: \${name}\`);
    console.log(\`Description: \${description}\`);
    console.log(\`Author: \${author}\`);
    
    rl.close();
  }
}

const cli = new CLI({
  name: 'setup-cli',
  version: '1.0.0'
});

cli.register(new SetupCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const child = spawn('node', [TEST_SCRIPT, 'setup']);
      let output = '';
      let promptCount = 0;

      child.stdout.on('data', (data) => {
        output += data.toString();
        
        if (output.includes('Project name:') && promptCount === 0) {
          promptCount++;
          child.stdin.write('my-project\n');
        } else if (output.includes('Description:') && promptCount === 1) {
          promptCount++;
          child.stdin.write('A test project\n');
        } else if (output.includes('Author:') && promptCount === 2) {
          promptCount++;
          child.stdin.write('Test User\n');
        }
      });

      const result = await new Promise<{ output: string; exitCode: number }>((resolve) => {
        child.on('exit', (code) => {
          resolve({ output, exitCode: code || 0 });
        });
      });

      expect(result.output).toContain('Name: my-project');
      expect(result.output).toContain('Description: A test project');
      expect(result.output).toContain('Author: Test User');
    });
  });

  describe('Progress Indicators', () => {
    test('should show progress during long operations', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class ProgressCommand extends Command {
  name = 'progress';
  description = 'Show progress';
  
  async execute(options, context) {
    const total = 10;
    console.log('Starting operation...');
    
    for (let i = 1; i <= total; i++) {
      // Clear line and show progress
      process.stdout.write(\`\\rProgress: [\${'='.repeat(i)}\${' '.repeat(total - i)}] \${i}/\${total}\`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\\nOperation In Progress!');
  }
}

const cli = new CLI({
  name: 'progress-cli',
  version: '1.0.0'
});

cli.register(new ProgressCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['progress']);
      
      expect(output.stdout).toContain('Starting operation...');
      expect(output.stdout).toContain('Progress:');
      expect(output.stdout).toContain('10/10');
      expect(output.stdout).toContain('Operation In Progress!');
    });

    test('should handle streaming output', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class StreamCommand extends Command {
  name = 'stream';
  description = 'Stream output';
  
  options = {
    lines: {
      type: 'number',
      alias: 'n',
      description: 'Number of lines to stream',
      default: 5
    }
  };
  
  async execute(options, context) {
    console.log('Streaming data...');
    
    for (let i = 1; i <= options.lines; i++) {
      context.stdout.write(\`Line \${i}: \${Math.random().toString(36).substring(7)}\\n\`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('Stream In Progress');
  }
}

const cli = new CLI({
  name: 'stream-cli',
  version: '1.0.0'
});

cli.register(new StreamCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['stream', '--lines', '3']);
      
      expect(output.stdout).toContain('Streaming data...');
      expect(output.stdout).toContain('Line 1:');
      expect(output.stdout).toContain('Line 2:');
      expect(output.stdout).toContain('Line 3:');
      expect(output.stdout).toContain('Stream In Progress');
    });
  });

  describe('Child Process Spawning', () => {
    test('should spawn and manage child processes', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import { spawn } from 'child_process';

class ExecCommand extends Command {
  name = 'exec';
  description = 'Execute command';
  
  options = {
    command: {
      type: 'string',
      alias: 'c',
      description: 'Command to execute',
      required: true
    },
    args: {
      type: 'array',
      alias: 'a',
      description: 'Command arguments',
      default: []
    }
  };
  
  async execute(options, context) {
    console.log(\`Executing: \${options.command} \${options.args.join(' ')}\`);
    
    return new Promise((resolve, reject) => {
      const child = spawn(options.command, options.args, {
        stdio: 'pipe'
      });
      
      child.stdout.on('data', (data) => {
        context.stdout.write(\`[stdout] \${data}\`);
      });
      
      child.stderr.on('data', (data) => {
        context.stderr.write(\`[stderr] \${data}\`);
      });
      
      child.on('exit', (code) => {
        console.log(\`\\nProcess exited with code: \${code}\`);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(\`Command failed with exit code \${code}\`));
        }
      });
    });
  }
}

const cli = new CLI({
  name: 'exec-cli',
  version: '1.0.0'
});

cli.register(new ExecCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test executing echo command
      const output1 = await executeScript(TEST_SCRIPT, ['exec', '-c', 'echo', '-a', 'Hello from child']);
      expect(output1.stdout).toContain('Executing: echo Hello from child');
      expect(output1.stdout).toContain('[stdout] Hello from child');
      expect(output1.stdout).toContain('Process exited with code: 0');

      // Test with node command
      const testFile = path.join(TEST_DIR, 'test.js');
      await fs.writeFile(testFile, 'console.log("Node script output");', 'utf8');
      
      const output2 = await executeScript(TEST_SCRIPT, ['exec', '-c', 'node', '-a', testFile]);
      expect(output2.stdout).toContain('[stdout] Node script output');
    });

    test('should handle process pipes and redirection', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import { spawn } from 'child_process';
import { fs } from '../../../../../../../themes/infra_external-log-lib/dist';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';

class PipeCommand extends Command {
  name = 'pipe';
  description = 'Pipe command output';
  
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
    transform: {
      type: 'string',
      alias: 't',
      description: 'Transform command',
      choices: ['uppercase', 'lowercase', 'reverse'],
      default: 'uppercase'
    }
  };
  
  async execute(options, context) {
    const inputPath = path.resolve(options.input);
    const outputPath = path.resolve(options.output);
    
    console.log(\`Piping \${inputPath} through \${options.transform} to \${outputPath}\`);
    
    return new Promise((resolve, reject) => {
      const inputStream = fs.createReadStream(inputPath);
      const outputStream = fs.createWriteStream(outputPath);
      
      // Create transform based on option
      let transformCmd, transformArgs;
      switch (options.transform) {
        case 'uppercase':
          transformCmd = 'tr';
          transformArgs = ['[:lower:]', '[:upper:]'];
          break;
        case 'lowercase':
          transformCmd = 'tr';
          transformArgs = ['[:upper:]', '[:lower:]'];
          break;
        case 'reverse':
          transformCmd = 'rev';
          transformArgs = [];
          break;
      }
      
      const transform = spawn(transformCmd, transformArgs);
      
      // Pipe: input -> transform -> output
      inputStream.pipe(transform.stdin);
      transform.stdout.pipe(outputStream);
      
      transform.on('error', reject);
      outputStream.on('finish', () => {
        console.log('Pipe In Progress In Progress');
        resolve();
      });
      outputStream.on('error', reject);
    });
  }
}

const cli = new CLI({
  name: 'pipe-cli',
  version: '1.0.0'
});

cli.register(new PipeCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Create input file
      const inputFile = path.join(TEST_DIR, 'input.txt');
      const outputFile = path.join(TEST_DIR, 'output.txt');
      await fs.writeFile(inputFile, 'hello world\nthis is a test\n', 'utf8');

      // Test uppercase transform
      const output = await executeScript(TEST_SCRIPT, [
        'pipe', '-i', inputFile, '-o', outputFile, '-t', 'uppercase'
      ]);
      
      expect(output.stdout).toContain('Piping');
      expect(output.stdout).toContain('through uppercase');
      expect(output.stdout).toContain('Pipe In Progress In Progress');

      // Verify output
      const content = await fs.readFile(outputFile, 'utf8');
      expect(content).toContain('HELLO WORLD');
      expect(content).toContain('THIS IS A TEST');
    });
  });

  describe('Console Output Formatting', () => {
    test('should handle colored output', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class ColorCommand extends Command {
  name = 'colors';
  description = 'Show colored output';
  
  async execute(options, context) {
    // ANSI color codes
    console.log('\\x1b[31mRed text\\x1b[0m');
    console.log('\\x1b[32mGreen text\\x1b[0m');
    console.log('\\x1b[33mYellow text\\x1b[0m');
    console.log('\\x1b[34mBlue text\\x1b[0m');
    console.log('\\x1b[35mMagenta text\\x1b[0m');
    console.log('\\x1b[36mCyan text\\x1b[0m');
    
    // Bold and underline
    console.log('\\x1b[1mBold text\\x1b[0m');
    console.log('\\x1b[4mUnderlined text\\x1b[0m');
    
    // Background colors
    console.log('\\x1b[41m\\x1b[37mRed background\\x1b[0m');
    console.log('\\x1b[42m\\x1b[30mGreen background\\x1b[0m');
  }
}

const cli = new CLI({
  name: 'color-cli',
  version: '1.0.0'
});

cli.register(new ColorCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['colors'], {
        env: { ...process.env, FORCE_COLOR: '1' }
      });
      
      // Check for ANSI escape codes
      expect(output.stdout).toContain('\x1b[31m');
      expect(output.stdout).toContain('\x1b[32m');
      expect(output.stdout).toContain('Red text');
      expect(output.stdout).toContain('Bold text');
    });

    test('should handle table formatting', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class TableCommand extends Command {
  name = 'table';
  description = 'Show table output';
  
  async execute(options, context) {
    const data = [
      { name: 'Alice', age: 30, city: 'New York' },
      { name: 'Bob', age: 25, city: 'San Francisco' },
      { name: 'Charlie', age: 35, city: 'Chicago' }
    ];
    
    // Header
    console.log('┌─────────────┬─────┬───────────────┐');
    console.log('│ Name        │ Age │ City          │');
    console.log('├─────────────┼─────┼───────────────┤');
    
    // Data rows
    data.forEach(row => {
      const name = row.name.padEnd(11);
      const age = row.age.toString().padEnd(3);
      const city = row.city.padEnd(13);
      console.log(\`│ \${name} │ \${age} │ \${city} │\`);
    });
    
    console.log('└─────────────┴─────┴───────────────┘');
  }
}

const cli = new CLI({
  name: 'table-cli',
  version: '1.0.0'
});

cli.register(new TableCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['table']);
      
      expect(output.stdout).toContain('┌─────────────┬─────┬───────────────┐');
      expect(output.stdout).toContain('│ Name        │ Age │ City          │');
      expect(output.stdout).toContain('│ Alice       │ 30  │ New York      │');
      expect(output.stdout).toContain('│ Bob         │ 25  │ San Francisco │');
      expect(output.stdout).toContain('└─────────────┴─────┴───────────────┘');
    });
  });

  describe('Environment and Process Info', () => {
    test('should access process and environment information', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as os from 'os';

class InfoCommand extends Command {
  name = 'info';
  description = 'Show system info';
  
  async execute(options, context) {
    console.log('Process Information:');
    console.log(\`  PID: \${process.pid}\`);
    console.log(\`  Node Version: \${process.version}\`);
    console.log(\`  Platform: \${process.platform}\`);
    console.log(\`  Architecture: \${process.arch}\`);
    console.log(\`  Working Directory: \${process.cwd()}\`);
    
    console.log('\\nSystem Information:');
    console.log(\`  Hostname: \${os.hostname()}\`);
    console.log(\`  Total Memory: \${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB\`);
    console.log(\`  Free Memory: \${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB\`);
    console.log(\`  CPU Cores: \${os.cpus().length}\`);
    
    console.log('\\nEnvironment Variables:');
    console.log(\`  NODE_ENV: \${context.env.NODE_ENV || 'not set'}\`);
    console.log(\`  HOME: \${context.env.HOME || 'not set'}\`);
    console.log(\`  PATH entries: \${(context.env.PATH || '').split(':').length}\`);
  }
}

const cli = new CLI({
  name: 'info-cli',
  version: '1.0.0'
});

cli.register(new InfoCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['info'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      expect(output.stdout).toContain('Process Information:');
      expect(output.stdout).toContain('PID:');
      expect(output.stdout).toContain('Node Version:');
      expect(output.stdout).toContain('System Information:');
      expect(output.stdout).toContain('CPU Cores:');
      expect(output.stdout).toContain('NODE_ENV: test');
    });
  });

  describe('TTY and Terminal Detection', () => {
    test('should detect TTY and adjust output accordingly', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class TTYCommand extends Command {
  name = 'tty';
  description = 'Test TTY detection';
  
  async execute(options, context) {
    const isTTY = process.stdout.isTTY;
    
    console.log(\`Running in TTY: \${isTTY ? 'Yes' : 'No'}\`);
    console.log(\`Color support: \${context.color ? 'Enabled' : 'Disabled'}\`);
    
    if (isTTY) {
      console.log('Terminal size:', process.stdout.columns + 'x' + process.stdout.rows);
      console.log('\\x1b[32mThis should be green in a TTY\\x1b[0m');
    } else {
      console.log('Output is being piped or redirected');
      console.log('This is plain text without colors');
    }
  }
}

const cli = new CLI({
  name: 'tty-cli',
  version: '1.0.0'
});

cli.register(new TTYCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test direct execution (TTY)
      const output1 = await executeScript(TEST_SCRIPT, ['tty']);
      expect(output1.stdout).toContain('Running in TTY:');

      // Test with output redirection (non-TTY)
      const outputFile = path.join(TEST_DIR, 'tty-output.txt');
      await execAsync(\`node \${TEST_SCRIPT} tty > \${outputFile}\`);
      const redirectedOutput = await fs.readFile(outputFile, 'utf8');
      expect(redirectedOutput).toContain('Output is being piped or redirected');
    });
  });
});

// Helper function
async function executeScript(
  scriptPath: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', [scriptPath, ...args], {
      env: options.env || process.env
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