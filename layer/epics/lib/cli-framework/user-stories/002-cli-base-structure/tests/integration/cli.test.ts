import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CLI } from '../../src/application/cli';
import { Command } from '../../src/domain/command';
import { CommandContext, Plugin } from '../../src/domain/types';
import { Writable } from 'node:stream';

describe('CLI Integration', () => {
  let stdout: string;
  let stderr: string;
  let mockContext: Partial<CommandContext>;
  let mockExit: any;

  beforeEach(() => {
    stdout = '';
    stderr = '';
    
    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    
    mockContext = {
      stdout: new Writable({
        write(chunk, _, callback) {
          stdout += chunk.toString();
          callback();
        }
      }) as any,
      stderr: new Writable({
        write(chunk, _, callback) {
          stderr += chunk.toString();
          callback();
        }
      }) as any,
      color: false
    };
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  describe('basic functionality', () => {
    it('should show help by default', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        description: 'Test CLI',
        context: mockContext
      });

      try {
        await cli.run(['--help']);
      } catch (error) {
        // Expected to throw due to process.exit mock
        expect(error).toEqual(new Error('process.exit called'));
      }
      
      expect(stdout).toContain('testcli');
      expect(stdout).toContain('Test CLI');
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('Commands:');
    });

    it('should show version', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      try {
        await cli.run(['--version']);
      } catch (error) {
        // Expected to throw due to process.exit mock
        expect(error).toEqual(new Error('process.exit called'));
      }
      
      expect(stdout).toContain('testcli 1.0.0');
    });

    it('should execute registered commands', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      class TestCommand extends Command {
        name = 'test';
        description = 'Test command';
        
        async execute(_options: any, context: CommandContext) {
          this.log('Test executed', context);
        }
      }

      cli.register(new TestCommand().getDefinition());
      await cli.run(['test']);
      
      expect(stdout).toContain('Test executed');
    });
  });

  describe('command not found', () => {
    it('should show error for unknown command', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });

      try {
        await cli.run(['unknown']);
      } catch (e) {
        // Expected
      }

      expect(stderr).toContain('Error: Command "unknown" not found');
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should suggest similar commands', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      cli.register({
        metadata: { name: 'deploy', description: 'Deploy application' },
        execute: async () => {}
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });

      try {
        await cli.run(['deplyo']);
      } catch (e) {
        // Expected
      }

      expect(stderr).toContain('Did you mean: deploy?');
      
      exitSpy.mockRestore();
    });
  });

  describe("subcommands", () => {
    it('should execute nested commands', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      cli.register({
        metadata: { name: 'db', description: 'Database commands' },
        subcommands: [
          {
            metadata: { name: 'migrate', description: 'Run migrations' },
            execute: async (_, context) => {
              context.stdout.write('Migrations executed\n');
            }
          }
        ]
      });

      await cli.run(['db', 'migrate']);
      
      expect(stdout).toContain('Migrations executed');
    });

    it('should show help for parent command with subcommands', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      cli.register({
        metadata: { name: 'db', description: 'Database commands' },
        subcommands: [
          {
            metadata: { name: 'migrate', description: 'Run migrations' },
            execute: async () => {}
          },
          {
            metadata: { name: 'seed', description: 'Seed database' },
            execute: async () => {}
          }
        ]
      });

      await cli.run(['help', 'db']);
      
      expect(stdout).toContain('db');
      expect(stdout).toContain('Database commands');
      expect(stdout).toContain('Subcommands:');
      expect(stdout).toContain('migrate');
      expect(stdout).toContain('seed');
    });
  });

  describe('plugins', () => {
    it('should register plugins', async () => {
      let pluginCalled = false;
      
      const testPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        register(cli) {
          pluginCalled = true;
          cli.register({
            metadata: { name: 'plugin-cmd', description: 'Plugin command' },
            execute: async (_, context) => {
              context.stdout.write('Plugin command executed\n');
            }
          });
        }
      };

      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        plugins: [testPlugin],
        context: mockContext
      });

      expect(pluginCalled).toBe(true);
      
      await cli.run(['plugin-cmd']);
      expect(stdout).toContain('Plugin command executed');
    });
  });

  describe('hooks', () => {
    it('should run lifecycle hooks', async () => {
      const hookCalls: string[] = [];
      
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        hooks: {
          preparse: [async () => { hookCalls.push("preparse"); }],
          postparse: [async () => { hookCalls.push("postparse"); }],
          precommand: [async () => { hookCalls.push("precommand"); }],
          postcommand: [async () => { hookCalls.push("postcommand"); }]
        },
        context: mockContext
      });

      cli.register({
        metadata: { name: 'test', description: 'Test' },
        execute: async () => { hookCalls.push('execute'); }
      });

      await cli.run(['test']);
      
      expect(hookCalls).toEqual([
        "preparse",
        "postparse",
        "precommand",
        'execute',
        "postcommand"
      ]);
    });

    it('should run error hooks on failure', async () => {
      let errorHookCalled = false;
      
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        hooks: {
          error: [async () => { errorHookCalled = true; }]
        },
        context: mockContext
      });

      cli.register({
        metadata: { name: 'fail', description: 'Failing command' },
        execute: async () => {
          throw new Error('Command failed');
        }
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });

      try {
        await cli.run(['fail']);
      } catch (e) {
        // Expected
      }

      expect(errorHookCalled).toBe(true);
      expect(stderr).toContain('Error: Command failed');
      
      exitSpy.mockRestore();
    });
  });

  describe('global options', () => {
    it('should handle debug mode', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      let debugEnabled = false;
      
      cli.register({
        metadata: { name: 'test', description: 'Test' },
        execute: async (_, context) => {
          debugEnabled = context.debug;
        }
      });

      await cli.run(['test', '--debug']);
      
      expect(debugEnabled).toBe(true);
    });

    it('should handle quiet mode', async () => {
      const cli = new CLI({
        name: 'testcli',
        version: '1.0.0',
        context: mockContext
      });

      let quietEnabled = false;
      
      cli.register({
        metadata: { name: 'test', description: 'Test' },
        execute: async (_, context) => {
          quietEnabled = context.quiet;
          throw new Error('This should be quiet');
        }
      });

      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });

      try {
        await cli.run(['test', '--quiet']);
      } catch (e) {
        // Expected
      }
      
      expect(quietEnabled).toBe(true);
      expect(stderr).toBe(''); // No error output in quiet mode
      
      exitSpy.mockRestore();
    });
  });
});