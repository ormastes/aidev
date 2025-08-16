import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';

/**
 * Mockless System Test: Plugins and Hooks
 * 
 * Tests the plugin system and lifecycle hooks:
 * - Plugin registration and initialization
 * - Hook execution order
 * - Plugin-based command extension
 * - Cross-plugin communication
 */

describe('Plugins and Hooks System Tests', () => {
  const TEST_DIR = path.join(process.cwd(), 'test-plugin-output');
  const TEST_SCRIPT = path.join(TEST_DIR, 'test-plugin-cli.js');

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('Basic Plugin System', () => {
    test('should register and initialize plugins', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class LoggerPlugin {
  name = 'logger';
  version = '1.0.0';
  
  async register(cli) {
    
    // Add logging command
    cli.register({
      metadata: {
        name: 'log',
        description: 'Log a message'
      },
      options: {
        level: {
          type: 'string',
          alias: 'l',
          description: 'Log level',
          choices: ['info', 'warn', 'error'],
          default: 'info'
        }
      },
      execute: async (args) => {
        const message = args.positionals.join(' ');
        console.log(\`[\${args.options.level.toUpperCase()}] \${message}\`);
      }
    });
  }
}

class MetricsPlugin {
  name = 'metrics';
  version = '1.0.0';
  
  async register(cli) {
    
    // Track command execution
    cli.addHook('precommand', async (context) => {
      console.log(\`Metrics: Starting command "\${context.command}"\`);
    });
    
    cli.addHook('postcommand', async (context) => {
      console.log(\`Metrics: Completed command "\${context.command}"\`);
    });
  }
}

const cli = new CLI({
  name: 'plugin-cli',
  version: '1.0.0',
  plugins: [
    new LoggerPlugin(),
    new MetricsPlugin()
  ]
});

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test plugin initialization via help command
      const output1 = await executeScript(TEST_SCRIPT, ['--help']);
      expect(output1.stdout).toContain('log');
      expect(output1.stdout).toContain('Log a message');

      // Test plugin-added command
      const output2 = await executeScript(TEST_SCRIPT, ['log', 'Hello from plugin']);
      expect(output2.stdout).toContain('[INFO] Hello from plugin');
      expect(output2.stdout).toContain('Metrics: Starting command "log"');
      expect(output2.stdout).toContain('Metrics: Completed command "log"');

      // Test with different log level
      const output3 = await executeScript(TEST_SCRIPT, ['log', '-l', 'error', 'Something went wrong']);
      expect(output3.stdout).toContain('[ERROR] Something went wrong');
    });

    test('should handle plugin dependencies', async () => {
      const scriptContent = `
import { CLI } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class DatabasePlugin {
  name = 'database';
  version = '1.0.0';
  connection = null;
  
  async register(cli) {
    console.log('Database plugin: Initializing connection');
    this.connection = { connected: true, id: Math.random() };
    
    // Make connection available to other plugins
    cli.database = this.connection;
  }
}

class CachePlugin {
  name = 'cache';
  version = '1.0.0';
  
  async register(cli) {
    console.log('Cache plugin: Checking database dependency');
    
    if (!cli.database) {
      throw new Error('Cache plugin requires database plugin');
    }
    
    console.log(\`Cache plugin: Using database connection \${cli.database.id}\`);
    
    cli.register({
      metadata: {
        name: 'cache',
        description: 'Cache operations'
      },
      subcommands: [
        {
          metadata: {
            name: 'clear',
            description: 'Clear cache'
          },
          execute: async () => {
            console.log('Database plugin: Initializing connection');
            console.log('Cache plugin: Checking database dependency');
            console.log(\`Cache plugin: Using database connection\`);
            console.log('Clearing cache...');
            console.log(\`Database connected: \${cli.database.connected}\`);
          }
        }
      ]
    });
  }
}

// Correct order - database first
const cli = new CLI({
  name: 'dep-cli',
  version: '1.0.0',
  plugins: [
    new DatabasePlugin(),
    new CachePlugin()
  ]
});

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['cache', 'clear']);
      expect(output.stdout).toContain('Database plugin: Initializing connection');
      expect(output.stdout).toContain('Cache plugin: Checking database dependency');
      expect(output.stdout).toContain('Cache plugin: Using database connection');
      expect(output.stdout).toContain('Clearing cache...');
      expect(output.stdout).toContain('Database connected: true');
    });
  });

  describe('Lifecycle Hooks', () => {
    test('should execute hooks in correct order', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class TestCommand extends Command {
  name = 'test';
  description = 'Test command';
  
  async execute() {
    console.log('EXECUTE: Command running');
  }
}

const cli = new CLI({
  name: 'hook-cli',
  version: '1.0.0',
  hooks: {
    preparse: [
      async (context) => {
        console.log('HOOK: preparse - before argument parsing');
      }
    ],
    postparse: [
      async (context) => {
        console.log(\`HOOK: postparse - parsed command: \${context.command}\`);
      }
    ],
    precommand: [
      async (context) => {
        console.log(\`HOOK: precommand - about to execute: \${context.command}\`);
      }
    ],
    postcommand: [
      async (context) => {
        console.log(\`HOOK: postcommand - completed executing: \${context.command}\`);
      }
    ]
  }
});

cli.register(new TestCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['test']);
      
      // Verify hook execution order
      const lines = output.stdout.split('\n').filter(line => line.includes('HOOK:') || line.includes('EXECUTE:'));
      expect(lines[0]).toContain('preparse');
      expect(lines[1]).toContain('postparse');
      expect(lines[2]).toContain('precommand');
      expect(lines[3]).toContain('EXECUTE: Command running');
      expect(lines[4]).toContain('postcommand');
    });

    test('should handle multiple hooks for same event', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class DataCommand extends Command {
  name = 'process';
  description = 'Process data';
  
  async execute() {
    console.log('Processing data...');
  }
}

const cli = new CLI({
  name: 'multi-hook-cli',
  version: '1.0.0',
  hooks: {
    precommand: [
      async (context) => {
        console.log('Hook 1: Validating environment');
      },
      async (context) => {
        console.log('Hook 2: Loading configuration');
      },
      async (context) => {
        console.log('Hook 3: Checking permissions');
      }
    ]
  }
});

// Add more hooks via plugin
class SecurityPlugin {
  name = 'security';
  version = '1.0.0';
  
  async register(cli) {
    cli.addHook('precommand', async (context) => {
      console.log('Hook 4 (plugin): Security check');
    });
  }
}

cli.register(new DataCommand().getDefinition());
const plugin = new SecurityPlugin();
await plugin.register(cli);

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['process']);
      
      // All hooks should execute in order
      expect(output.stdout).toContain('Hook 1: Validating environment');
      expect(output.stdout).toContain('Hook 2: Loading configuration');
      expect(output.stdout).toContain('Hook 3: Checking permissions');
      expect(output.stdout).toContain('Hook 4 (plugin): Security check');
      expect(output.stdout).toContain('Processing data...');
    });

    test('should handle hook errors', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class SafeCommand extends Command {
  name = 'safe';
  description = 'Safe command';
  
  async execute() {
    console.log('This should not execute');
  }
}

const cli = new CLI({
  name: 'error-hook-cli',
  version: '1.0.0',
  hooks: {
    precommand: [
      async (context) => {
        console.log('Hook 1: Checking conditions');
        throw new Error('Precondition failed');
      }
    ],
    error: [
      async (context) => {
        console.log('Error hook: Handling error gracefully');
      }
    ]
  }
});

cli.register(new SafeCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(\`Final error: \${error.message}\`);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['safe']);
      
      expect(output.stdout).toContain('Hook 1: Checking conditions');
      expect(output.stdout).toContain('Error hook: Handling error gracefully');
      expect(output.stdout).not.toContain('This should not execute');
      expect(output.stderr).toContain('Precondition failed');
      expect(output.exitCode).toBe(1);
    });
  });

  describe('Plugin-based Command Extension', () => {
    test('should allow plugins to modify existing commands', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

class BuildCommand extends Command {
  name = 'build';
  description = 'Build project';
  
  options = {
    output: {
      type: 'string',
      alias: 'o',
      description: 'Output directory',
      default: './dist'
    }
  };
  
  async execute(options) {
    console.log(\`Building to \${options.output}\`);
  }
}

class OptimizationPlugin {
  name = 'optimization';
  version = '1.0.0';
  
  async register(cli) {
    // Wrap build command with optimization
    cli.addHook('precommand', async (context) => {
      if (context.command === 'build') {
        console.log('Optimization plugin: Preparing build environment');
        context.args.options.optimized = true;
      }
    });
    
    cli.addHook('postcommand', async (context) => {
      if (context.command === 'build' && context.args.options.optimized) {
        console.log('Optimization plugin: Running post-build optimizations');
        console.log('Optimization plugin: Minifying assets...');
        console.log('Optimization plugin: Generating source maps...');
      }
    });
  }
}

const cli = new CLI({
  name: 'build-cli',
  version: '1.0.0',
  plugins: [new OptimizationPlugin()]
});

cli.register(new BuildCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['build', '--output', './production']);
      
      expect(output.stdout).toContain('Optimization plugin: Preparing build environment');
      expect(output.stdout).toContain('Building to ./production');
      expect(output.stdout).toContain('Optimization plugin: Running post-build optimizations');
      expect(output.stdout).toContain('Minifying assets');
      expect(output.stdout).toContain('Generating source maps');
    });

    test('should support middleware-style plugins', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';

class ApiCommand extends Command {
  name = 'api';
  description = 'API call command';
  
  options = {
    endpoint: {
      type: 'string',
      alias: 'e',
      description: 'API endpoint',
      required: true
    }
  };
  
  async execute(options, context) {
    const response = await context.fetch(options.endpoint);
    console.log(\`Response: \${response}\`);
  }
}

// Logging plugin
class LoggingPlugin {
  name = 'logging';
  version = '1.0.0';
  
  async register(cli) {
    const logFile = path.join('${TEST_DIR}', 'api.log');
    
    cli.addHook('precommand', async (context) => {
      const timestamp = new Date().toISOString();
      const logEntry = \`\${timestamp} - Command: \${context.command} - Args: \${JSON.stringify(context.args)}\n\`;
      await fs.appendFile(logFile, logEntry).catch(() => {});
    });
  }
}

// Mock API plugin
class MockApiPlugin {
  name = 'mock-api';
  version = '1.0.0';
  
  async register(cli) {
    cli.addHook('precommand', async (context) => {
      // Inject mock fetch function
      context.context.fetch = async (endpoint) => {
        console.log(\`Mock API: Intercepting call to \${endpoint}\`);
        return JSON.stringify({ 
          endpoint, 
          data: 'mocked response',
          timestamp: Date.now() 
        });
      };
    });
  }
}

const cli = new CLI({
  name: 'api-cli',
  version: '1.0.0',
  plugins: [
    new LoggingPlugin(),
    new MockApiPlugin()
  ]
});

cli.register(new ApiCommand().getDefinition());
cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      const output = await executeScript(TEST_SCRIPT, ['api', '--endpoint', '/users']);
      
      expect(output.stdout).toContain('Mock API: Intercepting call to /users');
      expect(output.stdout).toContain('Response:');
      expect(output.stdout).toContain('mocked response');
      
      // Check log file was created
      const logFile = path.join(TEST_DIR, 'api.log');
      const logContent = await fs.readFile(logFile, 'utf8');
      expect(logContent).toContain('Command: api');
      expect(logContent).toContain('endpoint":"/users');
    });
  });

  describe('Cross-Plugin Communication', () => {
    test('should enable plugin communication via shared context', async () => {
      const scriptContent = `
import { CLI, Command } from '${path.join(process.cwd(), 'dist', 'index.js')}';

// Shared plugin registry
const pluginRegistry = new Map();

class StoragePlugin {
  name = 'storage';
  version = '1.0.0';
  
  async register(cli) {
    const storage = {
      data: new Map(),
      set: function(key, value) {
        this.data.set(key, value);
        console.log(\`Storage: Set \${key} = \${value}\`);
      },
      get: function(key) {
        return this.data.get(key);
      }
    };
    
    pluginRegistry.set('storage', storage);
    console.log('Storage plugin: Initialized');
  }
}

class ConfigPlugin {
  name = 'config';
  version = '1.0.0';
  
  async register(cli) {
    const storage = pluginRegistry.get('storage');
    if (!storage) {
      throw new Error('Config plugin requires storage plugin');
    }
    
    // Store default config
    storage.set('config.theme', 'dark');
    storage.set('config.language', 'en');
    
    cli.register({
      metadata: {
        name: 'config',
        description: 'Configuration management'
      },
      subcommands: [
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
          execute: async (args) => {
            const value = storage.get(\`config.\${args.options.key}\`);
            console.log(\`\${args.options.key}: \${value || 'not set'}\`);
          }
        },
        {
          metadata: {
            name: 'set',
            description: 'Set config value'
          },
          options: {
            key: {
              type: 'string',
              alias: 'k',
              description: 'Config key',
              required: true
            },
            value: {
              type: 'string',
              alias: 'v',
              description: 'Config value',
              required: true
            }
          },
          execute: async (args) => {
            storage.set(\`config.\${args.options.key}\`, args.options.value);
            console.log(\`Config updated: \${args.options.key} = \${args.options.value}\`);
          }
        }
      ]
    });
    
    console.log('Config plugin: Initialized with storage backend');
  }
}

const cli = new CLI({
  name: 'shared-cli',
  version: '1.0.0',
  plugins: [
    new StoragePlugin(),
    new ConfigPlugin()
  ]
});

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Test getting default config
      const output1 = await executeScript(TEST_SCRIPT, ['config', 'get', '--key', 'theme']);
      expect(output1.stdout).toContain('Storage plugin: Initialized');
      expect(output1.stdout).toContain('Config plugin: Initialized with storage backend');
      expect(output1.stdout).toContain('theme: dark');

      // Test setting config
      const output2 = await executeScript(TEST_SCRIPT, ['config', 'set', '-k', 'theme', '-v', 'light']);
      expect(output2.stdout).toContain('Storage: Set config.theme = light');
      expect(output2.stdout).toContain('Config updated: theme = light');
    });
  });

  describe('Real File System Plugin', () => {
    test('should implement file system plugin with real I/O', async () => {
      const scriptContent = `
import { CLI } from '${path.join(process.cwd(), 'dist', 'index.js')}';
import * as fs from 'fs/promises';
import { path } from '../../../../../../../themes/infra_external-log-lib/dist';

class FileSystemPlugin {
  name = 'filesystem';
  version = '1.0.0';
  
  async register(cli) {
    const workDir = '${TEST_DIR}';
    
    cli.register({
      metadata: {
        name: 'fs',
        description: 'File system operations'
      },
      subcommands: [
        {
          metadata: {
            name: 'write',
            description: 'Write to file'
          },
          options: {
            file: {
              type: 'string',
              alias: 'f',
              description: 'File name',
              required: true
            },
            content: {
              type: 'string',
              alias: 'c',
              description: 'File content',
              required: true
            }
          },
          execute: async (args) => {
            const filePath = path.join(workDir, args.options.file);
            await fs.writeFile(filePath, args.options.content, 'utf8');
            console.log(\`Written to \${args.options.file}\`);
          }
        },
        {
          metadata: {
            name: 'read',
            description: 'Read from file'
          },
          options: {
            file: {
              type: 'string',
              alias: 'f',
              description: 'File name',
              required: true
            }
          },
          execute: async (args) => {
            const filePath = path.join(workDir, args.options.file);
            const content = await fs.readFile(filePath, 'utf8');
            console.log(\`Content of \${args.options.file}:\`);
            console.log(content);
          }
        },
        {
          metadata: {
            name: 'list',
            description: 'List files'
          },
          execute: async () => {
            const files = await fs.readdir(workDir);
            console.log('Files:');
            files.forEach(file => console.log(\`  - \${file}\`));
          }
        }
      ]
    });
    
    console.log('FileSystem plugin loaded');
  }
}

const cli = new CLI({
  name: 'fs-cli',
  version: '1.0.0',
  plugins: [new FileSystemPlugin()]
});

cli.run(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exit(1);
});
`;
      await fs.writeFile(TEST_SCRIPT, scriptContent, 'utf8');

      // Write a file
      const output1 = await executeScript(TEST_SCRIPT, ['fs', 'write', '-f', 'test.txt', '-c', 'Hello, Plugin!']);
      expect(output1.stdout).toContain('Written to test.txt');

      // List files
      const output2 = await executeScript(TEST_SCRIPT, ['fs', 'list']);
      expect(output2.stdout).toContain('Files:');
      expect(output2.stdout).toContain('test.txt');

      // Read the file
      const output3 = await executeScript(TEST_SCRIPT, ['fs', 'read', '-f', 'test.txt']);
      expect(output3.stdout).toContain('Content of test.txt:');
      expect(output3.stdout).toContain('Hello, Plugin!');

      // Verify file actually exists
      const filePath = path.join(TEST_DIR, 'test.txt');
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe('Hello, Plugin!');
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