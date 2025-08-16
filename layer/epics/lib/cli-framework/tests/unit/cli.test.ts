import { CLI, CLIOptions } from '../../user-stories/002-cli-base-structure/src/application/cli';
import { CommandDefinition, CommandContext, CLIError, CommandNotFoundError } from '../../user-stories/002-cli-base-structure/src/domain/types';
import { Writable, Readable } from 'stream';

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  level: 1,
}));

describe('CLI', () => {
  let cli: CLI;
  let mockStdout: Writable;
  let mockStderr: Writable;
  let mockStdin: Readable;
  let options: CLIOptions;

  beforeEach(() => {
    // Create mock streams
    mockStdout = new Writable({
      write: jest.fn((chunk, encoding, callback) => {
        if (typeof callback === 'function') callback();
        return true;
      }),
    });

    mockStderr = new Writable({
      write: jest.fn((chunk, encoding, callback) => {
        if (typeof callback === 'function') callback();
        return true;
      }),
    });

    mockStdin = new Readable({
      read: jest.fn(),
    });

    options = {
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI',
      context: {
        stdout: mockStdout,
        stderr: mockStderr,
        stdin: mockStdin,
      },
    };

    cli = new CLI(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create CLI instance with options', () => {
      expect(cli).toBeInstanceOf(CLI);
    });

    it('should register default help command when enableHelp is true', async () => {
      const cliWithHelp = new CLI({ ...options, enableHelp: true });
      await cliWithHelp.run(['help']);
      expect(mockStdout.write).toHaveBeenCalled();
    });

    it('should not register help command when enableHelp is false', async () => {
      const cliNoHelp = new CLI({ ...options, enableHelp: false });
      
      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cliNoHelp.run(['help'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).toHaveBeenCalledWith(expect.stringContaining('Command not found: help'));
      
      mockExit.mockRestore();
    });

    it('should register version command by default', async () => {
      await cli.run(['version']);
      expect(mockStdout.write).toHaveBeenCalledWith('test-cli 1.0.0\n');
    });

    it('should register plugins', () => {
      const mockPlugin = {
        register: jest.fn(),
      };

      new CLI({ ...options, plugins: [mockPlugin] });
      expect(mockPlugin.register).toHaveBeenCalled();
    });

    it('should register hooks from options', async () => {
      const mockHook = jest.fn();
      const cliWithHooks = new CLI({
        ...options,
        hooks: {
          preparse: [mockHook],
        },
      });

      await cliWithHooks.run([]);
      expect(mockHook).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register command', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: jest.fn(),
      };

      cli.register(command);
      await cli.run(['test']);
      expect(command.execute).toHaveBeenCalled();
    });

    it('should register command with aliases', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
          aliases: ['t', 'tst'],
        },
        execute: jest.fn(),
      };

      cli.register(command);
      
      await cli.run(['t']);
      expect(command.execute).toHaveBeenCalledTimes(1);
      
      await cli.run(['tst']);
      expect(command.execute).toHaveBeenCalledTimes(2);
    });

    it('should register nested subcommands', async () => {
      const subcommand: CommandDefinition = {
        metadata: {
          name: 'sub',
          description: 'Subcommand',
        },
        execute: jest.fn(),
      };

      const command: CommandDefinition = {
        metadata: {
          name: 'parent',
          description: 'Parent command',
        },
        subcommands: [subcommand],
      };

      cli.register(command);
      await cli.run(['parent', 'sub']);
      expect(subcommand.execute).toHaveBeenCalled();
    });
  });

  describe('addHook', () => {
    it('should add and execute hooks', async () => {
      const preparseHook = jest.fn();
      const postparseHook = jest.fn();

      cli.addHook('preparse', preparseHook);
      cli.addHook('postparse', postparseHook);

      await cli.run([]);

      expect(preparseHook).toHaveBeenCalled();
      expect(postparseHook).toHaveBeenCalled();
    });

    it('should execute multiple hooks for same event', async () => {
      const hook1 = jest.fn();
      const hook2 = jest.fn();

      cli.addHook('preparse', hook1);
      cli.addHook('preparse', hook2);

      await cli.run([]);

      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should parse global options', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: jest.fn((args, context) => {
          expect(context.debug).toBe(true);
          expect(context.quiet).toBe(true);
          expect(context.color).toBe(false);
        }),
      };

      cli.register(command);
      await cli.run(['--debug', '--quiet', '--no-color', 'test']);
      expect(command.execute).toHaveBeenCalled();
    });

    it('should show help for --help option', async () => {
      await cli.run(['--help']);
      expect(mockStdout.write).toHaveBeenCalled();
    });

    it('should show version for --version option', async () => {
      await cli.run(['--version']);
      expect(mockStdout.write).toHaveBeenCalledWith('test-cli 1.0.0\n');
    });

    it('should show command help when help follows command', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
          usage: 'test [options]',
        },
      };

      cli.register(command);
      await cli.run(['test', '--help']);
      expect(mockStdout.write).toHaveBeenCalled();
    });

    it('should show general help when no command provided', async () => {
      await cli.run([]);
      expect(mockStdout.write).toHaveBeenCalled();
    });

    it('should handle command not found error', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['nonexistent'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).toHaveBeenCalledWith(expect.stringContaining('Command not found: nonexistent'));

      mockExit.mockRestore();
    });

    it('should suggest similar commands on error', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
      };

      cli.register(command);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['tst'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).toHaveBeenCalledWith(expect.stringContaining('Command not found: tst'));

      mockExit.mockRestore();
    });

    it('should execute precommand and postcommand hooks', async () => {
      const precommandHook = jest.fn();
      const postcommandHook = jest.fn();

      cli.addHook('precommand', precommandHook);
      cli.addHook('postcommand', postcommandHook);

      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: jest.fn(),
      };

      cli.register(command);
      await cli.run(['test']);

      expect(precommandHook).toHaveBeenCalled();
      expect(postcommandHook).toHaveBeenCalled();
    });

    it('should execute error hook on error', async () => {
      const errorHook = jest.fn();
      cli.addHook('error', errorHook);

      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: jest.fn(() => {
          throw new Error('Test error');
        }),
      };

      cli.register(command);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['test'])).rejects.toThrow('Process exit');
      expect(errorHook).toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle CLIError with exit code', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: () => {
          throw new CLIError('Test CLI error', 42);
        },
      };

      cli.register(command);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`Exit ${code}`);
      });

      await expect(cli.run(['test'])).rejects.toThrow('Exit 42');
      expect(mockStderr.write).toHaveBeenCalledWith('Error: Test CLI error\n');

      mockExit.mockRestore();
    });

    it('should show stack trace in debug mode', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';

      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: () => {
          throw error;
        },
      };

      cli.register(command);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['--debug', 'test'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).toHaveBeenCalledWith(expect.stringContaining(error.stack));

      mockExit.mockRestore();
    });

    it('should handle unknown errors', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: () => {
          throw 'Not an error object';
        },
      };

      cli.register(command);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['test'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).toHaveBeenCalledWith('An unknown error occurred\n');

      mockExit.mockRestore();
    });

    it('should suppress output in quiet mode', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
        },
        execute: () => {
          throw new Error('Test error');
        },
      };

      cli.register(command);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['--quiet', 'test'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });

  describe('help command', () => {
    it('should show help for specific command', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'test',
          description: 'Test command',
          usage: 'test [options]',
        },
      };

      cli.register(command);
      await cli.run(['help', 'test']);
      expect(mockStdout.write).toHaveBeenCalled();
    });

    it('should handle help for non-existent command', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      await expect(cli.run(['help', 'nonexistent'])).rejects.toThrow('Process exit');
      expect(mockStderr.write).toHaveBeenCalledWith(expect.stringContaining('Command not found: nonexistent'));

      mockExit.mockRestore();
    });
  });

  describe('subcommand handling', () => {
    it('should show help for parent command with subcommands', async () => {
      const command: CommandDefinition = {
        metadata: {
          name: 'parent',
          description: 'Parent command',
        },
        subcommands: [
          {
            metadata: {
              name: 'sub1',
              description: 'Subcommand 1',
            },
          },
          {
            metadata: {
              name: 'sub2',
              description: 'Subcommand 2',
            },
          },
        ],
      };

      cli.register(command);
      await cli.run(['parent']);
      expect(mockStdout.write).toHaveBeenCalled();
    });
  });
});