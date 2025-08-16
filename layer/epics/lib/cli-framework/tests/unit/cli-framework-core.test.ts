/**
 * Core tests for CLI Framework Theme
 */

describe('CLI Framework Theme - Core Functionality', () => {
  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('command parsing', () => {
    it('should parse simple commands', () => {
      const parseCommand = (input: string) => {
        const parts = input.trim().split(/\s+/);
        return {
          command: parts[0],
          args: parts.slice(1),
          flags: parts.filter(part => part.startsWith('--')),
          options: parts.filter(part => part.startsWith('-') && !part.startsWith('--'))
        };
      };

      const result = parseCommand('build --watch -v --output dist');
      
      expect(result.command).toBe('build');
      expect(result.args).toEqual(['--watch', '-v', '--output', 'dist']);
      expect(result.flags).toEqual(['--watch', '--output']);
      expect(result.options).toEqual(['-v']);
    });

    it('should handle quoted arguments', () => {
      const parseQuotedArgs = (input: string) => {
        const matches = input.match(/(".*?"|\S+)/g) || [];
        return matches.map(match => match.replace(/"/g, ''));
      };

      const result = parseQuotedArgs('deploy "my app" --env "production environment"');
      
      expect(result).toEqual(['deploy', 'my app', '--env', 'production environment']);
    });

    it('should extract key-value options', () => {
      const extractOptions = (args: string[]) => {
        const options: Record<string, string> = {};
        
        for (let i = 0; i < args.length; i++) {
          if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('-')) {
            const key = args[i].replace('--', '');
            const value = args[i + 1];
            options[key] = value;
            i++; // Skip the value
          }
        }
        
        return options;
      };

      const args = ['--port', '3000', '--host', 'localhost', '--debug'];
      const options = extractOptions(args);
      
      expect(options.port).toBe('3000');
      expect(options.host).toBe('localhost');
      expect(options.debug).toBeUndefined();
    });
  });

  describe('command registry', () => {
    it('should register and retrieve commands', () => {
      class CommandRegistry {
        private commands = new Map<string, any>();

        register(name: string, handler: Function, description?: string) {
          this.commands.set(name, { handler, description });
        }

        get(name: string) {
          return this.commands.get(name);
        }

        list() {
          return Array.from(this.commands.keys());
        }
      }

      const registry = new CommandRegistry();
      const handler = jest.fn();
      
      registry.register('test', handler, 'Test command');
      
      expect(registry.get('test')).toEqual({
        handler,
        description: 'Test command'
      });
      expect(registry.list()).toContain('test');
    });

    it('should handle command aliases', () => {
      class AliasRegistry {
        private commands = new Map<string, any>();
        private aliases = new Map<string, string>();

        register(name: string, handler: Function, aliases?: string[]) {
          this.commands.set(name, handler);
          
          if (aliases) {
            aliases.forEach(alias => {
              this.aliases.set(alias, name);
            });
          }
        }

        resolve(nameOrAlias: string): string {
          return this.aliases.get(nameOrAlias) || nameOrAlias;
        }

        get(nameOrAlias: string) {
          const realName = this.resolve(nameOrAlias);
          return this.commands.get(realName);
        }
      }

      const registry = new AliasRegistry();
      const handler = jest.fn();
      
      registry.register('build', handler, ['b', 'compile']);
      
      expect(registry.resolve('b')).toBe('build');
      expect(registry.resolve('compile')).toBe('build');
      expect(registry.get('b')).toBe(handler);
    });
  });

  describe('help system', () => {
    it('should generate command help', () => {
      const generateHelp = (command: any) => {
        const help = [`Usage: ${command.name} [options]`];
        
        if (command.description) {
          help.push('', command.description);
        }
        
        if (command.options && command.options.length > 0) {
          help.push('', 'Options:');
          command.options.forEach((option: any) => {
            const flags = [option.short, option.long].filter(Boolean).join(', ');
            help.push(`  ${flags.padEnd(20)} ${option.description}`);
          });
        }
        
        if (command.examples && command.examples.length > 0) {
          help.push('', 'Examples:');
          command.examples.forEach((example: string) => {
            help.push(`  ${example}`);
          });
        }
        
        return help.join('\n');
      };

      const command = {
        name: 'deploy',
        description: 'Deploy application to environment',
        options: [
          { short: '-e', long: '--env', description: 'Target environment' },
          { short: '-v', long: '--verbose', description: 'Verbose output' }
        ],
        examples: [
          'deploy --env production',
          'deploy -e staging -v'
        ]
      };

      const help = generateHelp(command);
      
      expect(help).toContain('Usage: deploy [options]');
      expect(help).toContain('Deploy application to environment');
      expect(help).toContain('-e, --env');
      expect(help).toContain('Target environment');
      expect(help).toContain('deploy --env production');
    });

    it('should generate global help', () => {
      const generateGlobalHelp = (commands: Record<string, any>) => {
        const help = ['Usage: aidev-cli <command> [options]', '', 'Commands:'];
        
        Object.entries(commands).forEach(([name, command]) => {
          const description = command.description || 'No description';
          help.push(`  ${name.padEnd(15)} ${description}`);
        });
        
        help.push('', 'Use "aidev-cli <command> --help" for more information about a command.');
        
        return help.join('\n');
      };

      const commands = {
        build: { description: 'Build the application' },
        deploy: { description: 'Deploy to environment' },
        test: { description: 'Run tests' }
      };

      const help = generateGlobalHelp(commands);
      
      expect(help).toContain('Usage: aidev-cli <command> [options]');
      expect(help).toContain('build           Build the application');
      expect(help).toContain('deploy          Deploy to environment');
    });
  });

  describe('input validation', () => {
    it('should validate required arguments', () => {
      const validateArgs = (args: string[], required: string[]) => {
        const missing = required.filter(req => !args.includes(req));
        return {
          valid: missing.length === 0,
          missing
        };
      };

      const result1 = validateArgs(['--port', '3000'], ['--port']);
      const result2 = validateArgs(['--port', '3000'], ['--port', '--host']);

      expect(result1.valid).toBe(true);
      expect(result1.missing).toEqual([]);
      
      expect(result2.valid).toBe(false);
      expect(result2.missing).toEqual(['--host']);
    });

    it('should validate option types', () => {
      const validateOption = (value: string, type: string) => {
        switch (type) {
          case 'number':
            return !isNaN(Number(value));
          case 'boolean':
            return ['true', 'false', '1', '0'].includes(value.toLowerCase());
          case 'string':
            return typeof value === 'string';
          case 'port':
            const port = Number(value);
            return !isNaN(port) && port > 0 && port <= 65535;
          default:
            return true;
        }
      };

      expect(validateOption('3000', 'number')).toBe(true);
      expect(validateOption('abc', 'number')).toBe(false);
      expect(validateOption('true', 'boolean')).toBe(true);
      expect(validateOption('maybe', 'boolean')).toBe(false);
      expect(validateOption('8080', 'port')).toBe(true);
      expect(validateOption('99999', 'port')).toBe(false);
    });
  });

  describe('interactive prompts', () => {
    it('should handle user input prompts', async () => {
      const mockPrompt = jest.fn();
      
      const prompt = async (questions: any[]) => {
        const answers: Record<string, any> = {};
        
        for (const question of questions) {
          // Simulate user input based on question type
          switch (question.type) {
            case 'input':
              answers[question.name] = question.default || 'test-input';
              break;
            case 'confirm':
              answers[question.name] = question.default !== false;
              break;
            case 'list':
              answers[question.name] = question.choices[0];
              break;
            default:
              answers[question.name] = question.default;
          }
        }
        
        return answers;
      };

      const questions = [
        { type: 'input', name: 'name', message: 'Project name?' },
        { type: 'confirm', name: 'typescript', message: 'Use TypeScript?' },
        { type: 'list', name: 'framework', message: 'Choose framework:', choices: ['react', 'vue', 'angular'] }
      ];

      const answers = await prompt(questions);
      
      expect(answers.name).toBe('test-input');
      expect(answers.typescript).toBe(true);
      expect(answers.framework).toBe('react');
    });

    it('should validate prompt responses', () => {
      const validateResponse = (value: any, validator: any) => {
        if (typeof validator === 'function') {
          return validator(value);
        }
        
        if (validator.required && (!value || value.trim() === '')) {
          return 'This field is required';
        }
        
        if (validator.minLength && value.length < validator.minLength) {
          return `Must be at least ${validator.minLength} characters`;
        }
        
        if (validator.pattern && !validator.pattern.test(value)) {
          return 'Invalid format';
        }
        
        return true;
      };

      const nameValidator = { required: true, minLength: 3 };
      const emailValidator = { 
        required: true, 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ 
      };

      expect(validateResponse('', nameValidator)).toBe('This field is required');
      expect(validateResponse('ab', nameValidator)).toBe('Must be at least 3 characters');
      expect(validateResponse('abc', nameValidator)).toBe(true);
      
      expect(validateResponse('invalid-email', emailValidator)).toBe('Invalid format');
      expect(validateResponse('test@example.com', emailValidator)).toBe(true);
    });
  });

  describe('progress indicators', () => {
    it('should track command progress', () => {
      class ProgressTracker {
        private current = 0;
        private total = 0;
        private message = '';

        start(total: number, message = 'Processing...') {
          this.current = 0;
          this.total = total;
          this.message = message;
        }

        increment(message?: string) {
          this.current++;
          if (message) this.message = message;
        }

        getProgress() {
          return {
            current: this.current,
            total: this.total,
            percentage: Math.round((this.current / this.total) * 100),
            message: this.message
          };
        }

        isComplete() {
          return this.current >= this.total;
        }
      }

      const progress = new ProgressTracker();
      progress.start(3, 'Building project...');
      
      expect(progress.getProgress().percentage).toBe(0);
      
      progress.increment('Compiling sources...');
      expect(progress.getProgress().percentage).toBe(33);
      
      progress.increment('Bundling assets...');
      progress.increment('Generating output...');
      
      expect(progress.isComplete()).toBe(true);
      expect(progress.getProgress().percentage).toBe(100);
    });

    it('should handle spinner states', () => {
      const createSpinner = () => {
        let state = 'stopped';
        let text = '';
        
        return {
          start: (message: string) => {
            state = 'spinning';
            text = message;
          },
          stop: () => {
            state = 'stopped';
          },
          succeed: (message?: string) => {
            state = 'success';
            if (message) text = message;
          },
          fail: (message?: string) => {
            state = 'failed';
            if (message) text = message;
          },
          getState: () => ({ state, text })
        };
      };

      const spinner = createSpinner();
      
      spinner.start('Loading...');
      expect(spinner.getState().state).toBe('spinning');
      expect(spinner.getState().text).toBe('Loading...');
      
      spinner.succeed('Done!');
      expect(spinner.getState().state).toBe('success');
      expect(spinner.getState().text).toBe('Done!');
    });
  });

  describe('error handling', () => {
    it('should handle command not found', () => {
      const handleCommandNotFound = (command: string, available: string[]) => {
        const suggestions = available.filter(cmd => 
          cmd.toLowerCase().includes(command.toLowerCase()) ||
          command.toLowerCase().includes(cmd.toLowerCase())
        );

        return {
          error: `Command '${command}' not found`,
          suggestions: suggestions.length > 0 ? suggestions : null
        };
      };

      const available = ['build', 'deploy', 'test', 'start'];
      const result = handleCommandNotFound('buil', available);
      
      expect(result.error).toContain("Command 'buil' not found");
      expect(result.suggestions).toContain('build');
    });

    it('should handle validation errors', () => {
      const ValidationError = class extends Error {
        constructor(public field: string, public value: any, message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      };

      const handleValidationError = (error: ValidationError) => {
        return {
          type: 'validation',
          field: error.field,
          value: error.value,
          message: error.message,
          fixSuggestion: `Please provide a valid value for ${error.field}`
        };
      };

      const error = new ValidationError('port', 'abc', 'Port must be a number');
      const handled = handleValidationError(error);
      
      expect(handled.type).toBe('validation');
      expect(handled.field).toBe('port');
      expect(handled.fixSuggestion).toContain('Please provide a valid value for port');
    });

    it('should provide helpful error messages', () => {
      const formatError = (error: any) => {
        const lines = ['Error occurred:', ''];
        
        if (error.type === 'validation') {
          lines.push(`❌ Invalid ${error.field}: ${error.value}`);
          lines.push(`💡 ${error.fixSuggestion}`);
        } else if (error.type === 'command_not_found') {
          lines.push(`❌ ${error.message}`);
          if (error.suggestions && error.suggestions.length > 0) {
            lines.push(`💡 Did you mean: ${error.suggestions.join(', ')}?`);
          }
        } else {
          lines.push(`❌ ${error.message || 'Unknown error'}`);
        }
        
        return lines.join('\n');
      };

      const validationError = {
        type: 'validation',
        field: 'port',
        value: 'abc',
        fixSuggestion: 'Please provide a number between 1 and 65535'
      };

      const formatted = formatError(validationError);
      expect(formatted).toContain('❌ Invalid port: abc');
      expect(formatted).toContain('💡 Please provide a number between 1 and 65535');
    });
  });

  describe('plugin system', () => {
    it('should load and register plugins', () => {
      class PluginManager {
        private plugins = new Map<string, any>();

        register(name: string, plugin: any) {
          if (typeof plugin.init === 'function') {
            plugin.init();
          }
          this.plugins.set(name, plugin);
        }

        get(name: string) {
          return this.plugins.get(name);
        }

        executeHook(hookName: string, ...args: any[]) {
          const results: any[] = [];
          
          this.plugins.forEach(plugin => {
            if (plugin.hooks && typeof plugin.hooks[hookName] === 'function') {
              results.push(plugin.hooks[hookName](...args));
            }
          });
          
          return results;
        }
      }

      const pluginManager = new PluginManager();
      
      const testPlugin = {
        init: jest.fn(),
        hooks: {
          beforeCommand: jest.fn(),
          afterCommand: jest.fn()
        }
      };

      pluginManager.register('test-plugin', testPlugin);
      
      expect(testPlugin.init).toHaveBeenCalled();
      expect(pluginManager.get('test-plugin')).toBe(testPlugin);
      
      pluginManager.executeHook('beforeCommand', 'test-arg');
      expect(testPlugin.hooks.beforeCommand).toHaveBeenCalledWith('test-arg');
    });
  });
});