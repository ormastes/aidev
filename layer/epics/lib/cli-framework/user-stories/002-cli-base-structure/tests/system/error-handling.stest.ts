import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';

/**
 * Mockless System Test: Error Handling
 * 
 * Tests comprehensive error handling including:
 * - Command not found errors
 * - Validation errors
 * - Runtime errors
 * - Custom error handling
 * - Error hooks
 */

describe('Error Handling System Tests', () => {
  const TEST_DIR = path.join(process.cwd(), 'test-error-output');
  const TEST_SCRIPT = path.join(TEST_DIR, 'test-error-cli.js');

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Command Not Found', () => {
    test('should handle unknown commands with suggestions', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class StatusCommand extends Command {
  name = 'status';
  description = 'Show status';
  
  async execute() {
    console.log('Status: OK');
  }
}

class StartCommand extends Command {
  name = 'start';
  description = 'Start service';
  
  async execute() {
    console.log('Started');
  }
}

class StopCommand extends Command {
  name = 'stop';
  description = 'Stop service';
  
  async execute() {
    console.log('Stopped');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new StatusCommand().getDefinition());
cli.register(new StartCommand().getDefinition());
cli.register(new StopCommand().getDefinition());

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test similar command
      const output1 = await executeScript(TEST_SCRIPT, ['stat']);
      expect(output1.stderr).toContain('Command "stat" not found');
      expect(output1.stderr).toMatch(/Did you mean.*status|start/);
      expect(output1.exitCode).toBe(1);

      // Test completely unknown command
      const output2 = await executeScript(TEST_SCRIPT, ['foobar']);
      expect(output2.stderr).toContain('Command "foobar" not found');
      expect(output2.exitCode).toBe(1);
    });

    test('should handle unknown subcommands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class GitCommand extends Command {
  name = 'git';
  description = 'Git commands';
  
  subcommands = [
    {
      metadata: { name: 'add', description: 'Add files' },
      execute: async () => console.log('Added')
    },
    {
      metadata: { name: 'commit', description: 'Commit changes' },
      execute: async () => console.log('Committed')
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

      const output = await executeScript(TEST_SCRIPT, ['git', 'push']);
      expect(output.stderr).toContain('Command "push" not found');
      expect(output.exitCode).toBe(1);
    });
  });

  describe('Validation Errors', () => {
    test('should validate required options', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class UploadCommand extends Command {
  name = 'upload';
  description = 'Upload file';
  
  options = {
    file: {
      type: 'string',
      alias: 'f',
      description: 'File to upload',
      required: true
    },
    destination: {
      type: 'string',
      alias: 'd',
      description: 'Upload destination',
      required: true
    }
  };
  
  async execute(options) {
    console.log(\`Uploading \${options.file} to \${options.destination}\`);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new UploadCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  if (error.errors) {
    error.errors.forEach(e => console.error(\`  - \${e.field}: \${e.message}\`));
  }
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Missing all required options
      const output1 = await executeScript(TEST_SCRIPT, ['upload']);
      expect(output1.stderr).toContain('Validation failed');
      expect(output1.stderr).toContain('file');
      expect(output1.stderr).toContain('destination');
      expect(output1.exitCode).toBe(1);

      // Missing one required option
      const output2 = await executeScript(TEST_SCRIPT, ['upload', '--file', 'test.txt']);
      expect(output2.stderr).toContain('destination');
      expect(output2.exitCode).toBe(1);
    });

    test('should validate option types', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class CalcCommand extends Command {
  name = 'calc';
  description = 'Calculate';
  
  options = {
    number: {
      type: 'number',
      alias: 'n',
      description: 'Number input',
      required: true
    },
    count: {
      type: 'count',
      alias: 'v',
      description: 'Verbosity level'
    }
  };
  
  async execute(options) {
    console.log(\`Number: \${options.number}, Verbosity: \${options.count || 0}\`);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new CalcCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Invalid number type
      const output1 = await executeScript(TEST_SCRIPT, ['calc', '--number', 'abc']);
      expect(output1.stderr).toContain('Invalid');
      expect(output1.exitCode).toBe(1);

      // Valid number
      const output2 = await executeScript(TEST_SCRIPT, ['calc', '-n', '42']);
      expect(output2.stdout).toContain('Number: 42');
      expect(output2.exitCode).toBe(0);

      // Count type
      const output3 = await executeScript(TEST_SCRIPT, ['calc', '-n', '42', '-vvv']);
      expect(output3.stdout).toContain('Verbosity: 3');
    });

    test('should validate choices', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class EnvCommand extends Command {
  name = 'deploy';
  description = 'Deploy to environment';
  
  options = {
    env: {
      type: 'string',
      alias: 'e',
      description: 'Target environment',
      choices: ['dev', 'staging', 'prod'],
      required: true
    }
  };
  
  async execute(options) {
    console.log(\`Deploying to \${options.env}\`);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new EnvCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Invalid choice
      const output1 = await executeScript(TEST_SCRIPT, ['deploy', '--env', 'production']);
      expect(output1.stderr).toContain('Invalid');
      expect(output1.stderr).toMatch(/dev.*staging.*prod/);
      expect(output1.exitCode).toBe(1);

      // Valid choice
      const output2 = await executeScript(TEST_SCRIPT, ['deploy', '-e', 'staging']);
      expect(output2.stdout).toContain('Deploying to staging');
      expect(output2.exitCode).toBe(0);
    });

    test('should run custom validators', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class PortCommand extends Command {
  name = 'serve';
  description = 'Start server';
  
  options = {
    port: {
      type: 'number',
      alias: 'p',
      description: 'Port number',
      default: 3000,
      validate: (value) => {
        const port = value;
        if (port < 1024 || port > 65535) {
          return 'Port must be between 1024 and 65535';
        }
        return true;
      }
    }
  };
  
  async execute(options) {
    console.log(\`Server running on port \${options.port}\`);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new PortCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Invalid port
      const output1 = await executeScript(TEST_SCRIPT, ['serve', '--port', '80']);
      expect(output1.stderr).toContain('Port must be between 1024 and 65535');
      expect(output1.exitCode).toBe(1);

      // Valid port
      const output2 = await executeScript(TEST_SCRIPT, ['serve', '-p', '8080']);
      expect(output2.stdout).toContain('Server running on port 8080');
      expect(output2.exitCode).toBe(0);
    });
  });

  describe('Runtime Errors', () => {
    test('should handle command execution errors', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as fs from 'fs/promises';

class ReadCommand extends Command {
  name = 'read';
  description = 'Read file';
  
  options = {
    file: {
      type: 'string',
      alias: 'f',
      description: 'File to read',
      required: true
    }
  };
  
  async execute(options) {
    const content = await fs.readFile(options.file, 'utf8');
    console.log(content);
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new ReadCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Try to read non-existent file
      const output = await executeScript(TEST_SCRIPT, ['read', '--file', '/nonexistent/file.txt']);
      expect(output.stderr).toContain('Error:');
      expect(output.stderr).toContain('ENOENT');
      expect(output.exitCode).toBe(1);
    });

    test('should handle async errors in commands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class AsyncCommand extends Command {
  name = 'async';
  description = 'Async command';
  
  async execute() {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Async operation failed');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new AsyncCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['async']);
      expect(output.stderr).toContain('Async operation failed');
      expect(output.exitCode).toBe(1);
    });
  });

  describe('Custom Error Handling', () => {
    test('should handle custom CLI errors', async () => {
      const scriptContent = `
import { CLI, Command, CLIError } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class AuthCommand extends Command {
  name = 'auth';
  description = 'Authenticate';
  
  options = {
    token: {
      type: 'string',
      alias: 't',
      description: 'Auth token',
      required: true
    }
  };
  
  async execute(options) {
    if (options.token !== 'valid-token') {
      throw new CLIError('Invalid authentication token', 'AUTH_FAILED', 2);
    }
    console.log('Authenticated In Progress');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new AuthCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(\`[\${error.code}] \${error.message}\`);
  process.exit(error.exitCode || 1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Invalid token
      const output1 = await executeScript(TEST_SCRIPT, ['auth', '--token', 'invalid']);
      expect(output1.stderr).toContain('[AUTH_FAILED] Invalid authentication token');
      expect(output1.exitCode).toBe(2);

      // Valid token
      const output2 = await executeScript(TEST_SCRIPT, ['auth', '-t', 'valid-token']);
      expect(output2.stdout).toContain('Authenticated In Progress');
      expect(output2.exitCode).toBe(0);
    });

    test('should use error hooks', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class FailCommand extends Command {
  name = 'fail';
  description = 'Command that fails';
  
  async execute() {
    throw new Error('Command failed');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0',
  hooks: {
    error: [
      async (context) => {
        console.error('Error hook triggered');
        console.error('Command:', context.command);
      }
    ]
  }
});

cli.register(new FailCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error('Final error:', error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['fail']);
      expect(output.stderr).toContain('Error hook triggered');
      expect(output.stderr).toContain('Command: fail');
      expect(output.stderr).toContain('Final error: Command failed');
      expect(output.exitCode).toBe(1);
    });
  });

  describe('Error Recovery and Suggestions', () => {
    test('should provide helpful error messages', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as fs from 'fs/promises';

class ConfigCommand extends Command {
  name = 'config';
  description = 'Manage configuration';
  
  subcommands = [
    {
      metadata: {
        name: 'get',
        description: 'Get config value'
      },
      options: {
        key: {
          type: 'string',
          alias: 'k',
          description: 'Config key',
          required: true
        }
      },
      execute: async (options) => {
        const configFile = './config.json';
        try {
          const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
          if (!(options.key in config)) {
            throw new Error(\`Key "\${options.key}" not found in config\`);
          }
          console.log(config[options.key]);
        } catch (error) {
          if (error.code === 'ENOENT') {
            throw new Error('Config file not found. Run "config init" first.');
          }
          throw error;
        }
      }
    },
    {
      metadata: {
        name: 'init',
        description: 'Initialize config'
      },
      execute: async () => {
        await fs.writeFile('./config.json', '{"initialized": true}', 'utf8');
        console.log('Config initialized');
      }
    }
  ];
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new ConfigCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Try to get config before init
      const output = await executeScript(TEST_SCRIPT, ['config', 'get', '--key', 'test'], {
        cwd: TEST_DIR
      });
      expect(output.stderr).toContain('Config file not found');
      expect(output.stderr).toContain('Run "config init" first');
      expect(output.exitCode).toBe(1);
    });
  });

  describe('Signal Handling', () => {
    test('should handle process signals gracefully', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class LongRunningCommand extends Command {
  name = 'run';
  description = 'Long running command';
  
  async execute() {
    console.log('Starting long operation...');
    
    process.on('SIGINT', () => {
      console.log('\\nGracefully shutting down...');
      process.exit(130);
    });
    
    // Simulate long running operation
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Operation In Progress');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '1.0.0'
});

cli.register(new LongRunningCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Start command and send SIGINT after a short delay
      const child = spawn('node', [TEST_SCRIPT, 'run']);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Wait for command to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send SIGINT
      child.kill('SIGINT');

      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        child.on('exit', (code) => {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0
          });
        });
      });

      expect(result.stdout).toContain('Starting long operation');
      expect(result.stdout).toContain('Gracefully shutting down');
      expect(result.exitCode).toBe(130);
    });
  });
});

// Helper function
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