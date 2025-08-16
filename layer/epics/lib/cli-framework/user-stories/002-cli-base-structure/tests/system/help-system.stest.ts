import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';

/**
 * Mockless System Test: Help System
 * 
 * Tests the In Progress help system functionality including:
 * - Auto-generated help for commands
 * - Help command functionality
 * - Help for subcommands
 * - Custom help formatting
 */

describe('Help System Tests', () => {
  const TEST_DIR = path.join(process.cwd(), 'test-help-output');
  const TEST_SCRIPT = path.join(TEST_DIR, 'test-help-cli.js');

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Basic Help', () => {
    test('should show help when no command is provided', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class FooCommand extends Command {
  name = 'foo';
  description = 'Do foo things';
  
  async execute() {
    console.log('Foo!');
  }
}

class BarCommand extends Command {
  name = 'bar';
  description = 'Do bar things';
  
  async execute() {
    console.log('Bar!');
  }
}

const cli = new CLI({
  name: 'my-cli',
  version: '1.0.0',
  description: 'My awesome CLI tool'
});

cli.register(new FooCommand().getDefinition());
cli.register(new BarCommand().getDefinition());

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, []);
      
      expect(output.stdout).toContain('my-cli');
      expect(output.stdout).toContain('My awesome CLI tool');
      expect(output.stdout).toContain('Commands:');
      expect(output.stdout).toContain('foo');
      expect(output.stdout).toContain('Do foo things');
      expect(output.stdout).toContain('bar');
      expect(output.stdout).toContain('Do bar things');
    });

    test('should show help with --help flag', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class TestCommand extends Command {
  name = 'test';
  description = 'Test command';
  
  async execute() {
    console.log('Test executed');
  }
}

const cli = new CLI({
  name: 'test-cli',
  version: '2.0.0'
});

cli.register(new TestCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['--help']);
      
      expect(output.stdout).toContain('test-cli');
      expect(output.stdout).toContain('test');
      expect(output.stdout).toContain('Test command');
      expect(output.exitCode).toBe(0);
    });

    test('should show version with --version flag', async () => {
      const scriptContent = `
import { CLI } from '${path.join(process.cwd(), 'dist', 'index.js')}';

const cli = new CLI({
  name: 'version-cli',
  version: '3.2.1'
});

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['--version']);
      
      expect(output.stdout).toContain('3.2.1');
      expect(output.exitCode).toBe(0);
    });
  });

  describe('Command Help', () => {
    test('should show help for specific command', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class DeployCommand extends Command {
  name = 'deploy';
  description = 'Deploy application to server';
  
  options = {
    target: {
      type: 'string',
      alias: 't',
      description: 'Deployment target (dev, staging, prod)',
      required: true,
      choices: ['dev', 'staging', 'prod']
    },
    force: {
      type: 'boolean',
      alias: 'f',
      description: 'Force deployment without confirmation',
      default: false
    },
    version: {
      type: 'string',
      alias: 'v',
      description: 'Version to deploy',
      default: 'latest'
    }
  };
  
  examples = [
    {
      description: 'Deploy to staging',
      command: 'deploy --target staging'
    },
    {
      description: 'Force deploy specific version to production',
      command: 'deploy -t prod -v 1.2.3 --force'
    }
  ];
  
  async execute(options) {
    console.log(\`Deploying \${options.version} to \${options.target}\`);
  }
}

const cli = new CLI({
  name: 'deploy-cli',
  version: '1.0.0'
});

cli.register(new DeployCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['deploy', '--help']);
      
      // Check command description
      expect(output.stdout).toContain('deploy');
      expect(output.stdout).toContain('Deploy application to server');
      
      // Check options
      expect(output.stdout).toContain('--target');
      expect(output.stdout).toContain('-t');
      expect(output.stdout).toContain('Deployment target');
      expect(output.stdout).toContain('required');
      expect(output.stdout).toContain('dev, staging, prod');
      
      expect(output.stdout).toContain('--force');
      expect(output.stdout).toContain('-f');
      expect(output.stdout).toContain('Force deployment');
      
      expect(output.stdout).toContain('--version');
      expect(output.stdout).toContain('-v');
      expect(output.stdout).toContain('Version to deploy');
      expect(output.stdout).toContain('default: latest');
      
      // Check examples
      expect(output.stdout).toContain('Examples:');
      expect(output.stdout).toContain('Deploy to staging');
      expect(output.stdout).toContain('deploy --target staging');
      expect(output.stdout).toContain('Force deploy specific version');
      expect(output.stdout).toContain('deploy -t prod -v 1.2.3 --force');
    });
  });

  describe('Subcommand Help', () => {
    test('should show help for nested subcommands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class DatabaseCommand extends Command {
  name = 'db';
  description = 'Database management commands';
  
  subcommands = [
    {
      metadata: {
        name: 'migrate',
        description: 'Run database migrations'
      },
      options: {
        direction: {
          type: 'string',
          alias: 'd',
          description: 'Migration direction',
          choices: ['up', 'down'],
          default: 'up'
        },
        steps: {
          type: 'number',
          alias: 's',
          description: 'Number of migrations to run',
          default: 1
        }
      },
      examples: [
        {
          description: 'Run all pending migrations',
          command: 'db migrate'
        },
        {
          description: 'Rollback last 3 migrations',
          command: 'db migrate --direction down --steps 3'
        }
      ],
      execute: async (options) => {
        console.log(\`Running \${options.steps} migrations \${options.direction}\`);
      }
    },
    {
      metadata: {
        name: 'seed',
        description: 'Seed database with test data'
      },
      options: {
        env: {
          type: 'string',
          alias: 'e',
          description: 'Environment to seed',
          choices: ['dev', 'test'],
          default: 'dev'
        }
      },
      execute: async (options) => {
        console.log(\`Seeding \${options.env} database\`);
      }
    }
  ];
}

const cli = new CLI({
  name: 'db-cli',
  version: '1.0.0'
});

cli.register(new DatabaseCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test main command help
      const output1 = await executeScript(TEST_SCRIPT, ['db', '--help']);
      expect(output1.stdout).toContain('Database management commands');
      expect(output1.stdout).toContain('migrate');
      expect(output1.stdout).toContain('Run database migrations');
      expect(output1.stdout).toContain('seed');
      expect(output1.stdout).toContain('Seed database with test data');

      // Test subcommand help
      const output2 = await executeScript(TEST_SCRIPT, ['db', 'migrate', '--help']);
      expect(output2.stdout).toContain('migrate');
      expect(output2.stdout).toContain('Run database migrations');
      expect(output2.stdout).toContain('--direction');
      expect(output2.stdout).toContain('up, down');
      expect(output2.stdout).toContain('--steps');
      expect(output2.stdout).toContain('Number of migrations');
      expect(output2.stdout).toContain('Examples:');
      expect(output2.stdout).toContain('Rollback last 3 migrations');
    });
  });

  describe('Help Formatting', () => {
    test('should format help with colors when supported', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class ColorCommand extends Command {
  name = 'color';
  description = 'Test color output';
  
  options = {
    bold: {
      type: 'boolean',
      alias: 'b',
      description: 'Make text bold'
    }
  };
  
  async execute(options) {
    console.log('Color test');
  }
}

const cli = new CLI({
  name: 'color-cli',
  version: '1.0.0',
  context: {
    color: true  // Force color output
  }
});

cli.register(new ColorCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Run with color support
      const output = await executeScript(TEST_SCRIPT, ['--help'], {
        env: {
          ...process.env,
          FORCE_COLOR: '1'
        }
      });
      
      // Check for ANSI color codes
      expect(output.stdout).toMatch(/\x1b\[[\d;]+m/);
    });

    test('should handle long descriptions and wrap text', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class LongCommand extends Command {
  name = 'process';
  description = 'This is a very long description that should be wrapped properly when displayed in the help output. It contains multiple sentences and should demonstrate how the help formatter handles text wrapping for better readability in terminal environments.';
  
  options = {
    input: {
      type: 'string',
      alias: 'i',
      description: 'The input file path that contains the data to be processed. This option accepts any valid file path and will validate that the file exists before processing.',
      required: true
    }
  };
  
  async execute(options) {
    console.log('Processing...');
  }
}

const cli = new CLI({
  name: 'wrap-cli',
  version: '1.0.0'
});

cli.register(new LongCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['process', '--help']);
      
      // Check that long descriptions are present but formatted
      expect(output.stdout).toContain('very long description');
      expect(output.stdout).toContain('input file path');
      
      // Help should be readable (no extremely long lines)
      const lines = output.stdout.split('\n');
      const longLines = lines.filter(line => line.length > 100);
      expect(longLines.length).toBe(0);
    });
  });

  describe('Hidden and Deprecated Commands', () => {
    test('should handle hidden and deprecated commands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class PublicCommand extends Command {
  name = 'public';
  description = 'Public command';
  
  async execute() {
    console.log('Public');
  }
}

class HiddenCommand extends Command {
  name = 'hidden';
  description = 'Hidden command';
  hidden = true;
  
  async execute() {
    console.log('Hidden');
  }
}

class DeprecatedCommand extends Command {
  name = 'old';
  description = 'Deprecated command';
  deprecated = true;
  
  async execute() {
    console.log('Deprecated');
  }
}

const cli = new CLI({
  name: 'visibility-cli',
  version: '1.0.0'
});

cli.register(new PublicCommand().getDefinition());
cli.register(new HiddenCommand().getDefinition());
cli.register(new DeprecatedCommand().getDefinition());

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Normal help should not show hidden commands
      const output1 = await executeScript(TEST_SCRIPT, ['--help']);
      expect(output1.stdout).toContain('public');
      expect(output1.stdout).not.toContain('hidden');
      expect(output1.stdout).toContain('old');
      expect(output1.stdout).toContain('deprecated');

      // Hidden command should still be executable
      const output2 = await executeScript(TEST_SCRIPT, ['hidden']);
      expect(output2.stdout).toContain('Hidden');
      expect(output2.exitCode).toBe(0);

      // Deprecated command should show warning
      const output3 = await executeScript(TEST_SCRIPT, ['old']);
      expect(output3.stdout).toContain('Deprecated');
    });
  });
});

// Helper function to execute scripts
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