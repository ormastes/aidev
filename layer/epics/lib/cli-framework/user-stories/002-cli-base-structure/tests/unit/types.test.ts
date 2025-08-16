import {
  CLIError,
  CommandNotFoundError,
  ValidationError,
  PluginError,
  ParsedArguments,
  CommandArgument,
  CommandOption,
  CLIOptions,
  Hook,
  HookType
} from '../../src/domain/types';

describe('Domain Types', () => {
  describe('Error Classes', () => {
    describe('CLIError', () => {
      it('should create error with message', () => {
        const error = new CLIError('Test error');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(CLIError);
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('CLIError');
      });
    });

    describe('CommandNotFoundError', () => {
      it('should create error with command name', () => {
        const error = new CommandNotFoundError('unknown-command');
        expect(error).toBeInstanceOf(CLIError);
        expect(error.message).toBe("Command 'unknown-command' not found");
        expect(error.command).toBe('unknown-command');
      });

      it('should include suggestions if provided', () => {
        const error = new CommandNotFoundError('deplpy', ['deploy', 'destroy']);
        expect(error.message).toBe("Command 'deplpy' not found");
        expect(error.suggestions).toEqual(['deploy', 'destroy']);
      });
    });

    describe('ValidationError', () => {
      it('should create validation error', () => {
        const error = new ValidationError('Invalid option value');
        expect(error).toBeInstanceOf(CLIError);
        expect(error.message).toBe('Invalid option value');
      });
    });

    describe('PluginError', () => {
      it('should create plugin error', () => {
        const error = new PluginError('Plugin failed to load');
        expect(error).toBeInstanceOf(CLIError);
        expect(error.message).toBe('Plugin failed to load');
      });
    });
  });

  describe('Type Interfaces', () => {
    describe('ParsedArguments', () => {
      it('should allow valid parsed arguments structure', () => {
        const args: ParsedArguments = {
          _: ['arg1', 'arg2'],
          command: 'test',
          verbose: true,
          output: 'file.txt',
          tags: ['tag1', 'tag2'],
          count: 3
        };

        expect(args._).toEqual(['arg1', 'arg2']);
        expect(args.command).toBe('test');
        expect(args.verbose).toBe(true);
      });
    });

    describe('CommandArgument', () => {
      it('should define required argument', () => {
        const arg: CommandArgument = {
          name: 'file',
          required: true,
          description: 'File to process'
        };

        expect(arg.name).toBe('file');
        expect(arg.required).toBe(true);
        expect(arg.description).toBe('File to process');
      });

      it('should define optional argument', () => {
        const arg: CommandArgument = {
          name: 'output',
          required: false,
          description: 'Output file'
        };

        expect(arg.required).toBe(false);
      });
    });

    describe('CommandOption', () => {
      it('should define string option with all properties', () => {
        const option: CommandOption = {
          name: 'env',
          type: 'string',
          description: 'Environment',
          alias: 'e',
          required: true,
          choices: ['dev', 'prod'],
          validate: (value) => {
            if (typeof value === 'string' && value.length > 0) return true;
            return 'Environment must not be empty';
          }
        };

        expect(option.type).toBe('string');
        expect(option.alias).toBe('e');
        expect(option.choices).toEqual(['dev', 'prod']);
        expect(option.validate?.('dev')).toBe(true);
        expect(option.validate?.('')).toBe('Environment must not be empty');
      });

      it('should define boolean option', () => {
        const option: CommandOption = {
          name: 'verbose',
          type: 'boolean',
          description: 'Verbose output'
        };

        expect(option.type).toBe('boolean');
      });

      it('should define array option', () => {
        const option: CommandOption = {
          name: 'tags',
          type: 'array',
          description: 'Tags to apply'
        };

        expect(option.type).toBe('array');
      });

      it('should define count option', () => {
        const option: CommandOption = {
          name: 'verbosity',
          type: 'count',
          description: 'Increase verbosity'
        };

        expect(option.type).toBe('count');
      });
    });

    describe('CLIOptions', () => {
      it('should define minimal CLI options', () => {
        const options: CLIOptions = {
          name: 'my-cli',
          version: '1.0.0'
        };

        expect(options.name).toBe('my-cli');
        expect(options.version).toBe('1.0.0');
      });

      it('should define full CLI options', () => {
        const options: CLIOptions = {
          name: 'my-cli',
          version: '1.0.0',
          description: 'My CLI tool',
          globalOptions: [
            { name: 'config', type: 'string', description: 'Config file' }
          ]
        };

        expect(options.description).toBe('My CLI tool');
        expect(options.globalOptions).toHaveLength(1);
      });
    });

    describe('Hook', () => {
      it('should define hook with all hook types', () => {
        const hookTypes: HookType[] = ['preparse', 'postparse', 'precommand', 'postcommand', 'error'];

        hookTypes.forEach(type => {
          const hook: Hook = {
            type,
            handler: async (context) => {
              // Hook handler
            }
          };

          expect(hook.type).toBe(type);
          expect(hook.handler).toBeDefined();
        });
      });

      it('should allow async and sync handlers', () => {
        const asyncHook: Hook = {
          type: 'precommand',
          handler: async (context) => {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        };

        const syncHook: Hook = {
          type: 'postcommand',
          handler: (context) => {
            // Synchronous handler
          }
        };

        expect(asyncHook.handler).toBeDefined();
        expect(syncHook.handler).toBeDefined();
      });
    });
  });

  describe('Type Guards and Utilities', () => {
    it('should handle undefined and null safely', () => {
      const args: ParsedArguments = {
        _: [],
        value: undefined,
        nullValue: null
      };

      expect(args.value).toBeUndefined();
      expect(args.nullValue).toBeNull();
    });

    it('should allow extending parsed arguments', () => {
      interface ExtendedArgs extends ParsedArguments {
        customField: string;
      }

      const args: ExtendedArgs = {
        _: [],
        customField: 'custom'
      };

      expect(args.customField).toBe('custom');
    });
  });
});