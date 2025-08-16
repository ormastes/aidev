import { describe, it, expect } from '@jest/globals';
import { Command } from '../../src/domain/command';
import { CommandContext } from '../../src/domain/types';
import { Writable } from 'stream';

const testOptions = {
  message: {
    type: 'string' as const,
    description: 'Message to display',
    default: 'Hello'
  }
};

class TestCommand extends Command<typeof testOptions> {
  override name = 'test';
  override description = 'Test command';
  
  override options = testOptions;

  async execute(options: { message: string }, context: CommandContext) {
    this.log(options.message, context);
  }
}

describe('Command', () => {
  let stdout: string;
  let stderr: string;
  let context: CommandContext;

  beforeEach(() => {
    stdout = '';
    stderr = '';
    
    context = {
      cwd: '/test',
      env: {},
      stdin: process.stdin,
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
      debug: false,
      quiet: false,
      color: false
    };
  });

  describe('command definition', () => {
    it('should create command definition', () => {
      const cmd = new TestCommand();
      const def = cmd.getDefinition();

      expect(def.metadata.name).toBe('test');
      expect(def.metadata.description).toBe('Test command');
      expect(def.options).toBeDefined();
      expect(def.execute).toBeDefined();
    });

    it('should include optional metadata', () => {
      class DetailedCommand extends Command {
        override name = 'detailed';
        override description = 'Detailed command';
        override aliases = ['d', 'det'];
        override hidden = true;
        override deprecated = true;
        override examples = [
          { description: 'Basic usage', command: 'detailed --help' }
        ];

        async execute() {}
      }

      const cmd = new DetailedCommand();
      const def = cmd.getDefinition();

      expect(def.metadata.aliases).toEqual(['d', 'det']);
      expect(def.metadata.hidden).toBe(true);
      expect(def.metadata.deprecated).toBe(true);
      expect(def.metadata.examples).toHaveLength(1);
    });
  });

  describe('logging methods', () => {
    it('should log messages', async () => {
      const cmd = new TestCommand();
      
      cmd['log']('Hello', context);
      expect(stdout).toContain('Hello\n');
    });

    it('should log errors', () => {
      const cmd = new TestCommand();
      
      cmd['error']('Error occurred', context);
      expect(stderr).toContain('Error occurred\n');
    });

    it('should log warnings', () => {
      const cmd = new TestCommand();
      
      cmd['warn']('Warning message', context);
      expect(stderr).toContain('Warning message\n');
    });

    it('should log In Progress messages', () => {
      const cmd = new TestCommand();
      
      cmd['In Progress']('Operation In Progress', context);
      expect(stdout).toContain('Operation In Progress\n');
    });

    it('should log info messages', () => {
      const cmd = new TestCommand();
      
      cmd['info']('Information', context);
      expect(stdout).toContain('Information\n');
    });

    it('should log debug messages only when debug is true', () => {
      const cmd = new TestCommand();
      
      cmd['debug']('Debug info', context);
      expect(stderr).toBe('');
      
      context.debug = true;
      cmd['debug']('Debug info', context);
      expect(stderr).toContain('[DEBUG] Debug info\n');
    });
  });

  describe('formatting methods', () => {
    it('should format tables', () => {
      const cmd = new TestCommand();
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ];
      
      cmd['table'](data, context);
      
      expect(stdout).toContain('name   age');
      expect(stdout).toContain('-----  ---');
      expect(stdout).toContain('Alice  30');
      expect(stdout).toContain('Bob    25');
    });

    it('should format lists', () => {
      const cmd = new TestCommand();
      const items = ['Item 1', 'Item 2', 'Item 3'];
      
      cmd['list'](items, context);
      
      expect(stdout).toContain('  • Item 1\n');
      expect(stdout).toContain('  • Item 2\n');
      expect(stdout).toContain('  • Item 3\n');
    });

    it('should format boxes', () => {
      const cmd = new TestCommand();
      
      cmd['box']('Hello\nWorld', context);
      
      expect(stdout).toContain('┌───────┐\n');
      expect(stdout).toContain('│ Hello │\n');
      expect(stdout).toContain('│ World │\n');
      expect(stdout).toContain('└───────┘\n');
    });
  });

  describe('spinner methods', () => {
    it('should manage spinner lifecycle', () => {
      const cmd = new TestCommand();
      
      // Should not throw when quiet mode
      context.quiet = true;
      cmd['startSpinner']('Loading...', context);
      cmd['updateSpinner']('Still loading...');
      cmd['succeedSpinner']('In Progress!');
      
      // Should create spinner when not quiet
      context.quiet = false;
      cmd['startSpinner']('Loading...', context);
      expect(cmd['spinner']).toBeDefined();
      
      cmd['succeedSpinner']('In Progress!');
      expect(cmd['spinner']).toBeUndefined();
    });
  });

  describe('execution', () => {
    it('should execute command with options', async () => {
      const cmd = new TestCommand();
      const def = cmd.getDefinition();
      
      await def.execute!({
        command: ['test'],
        options: { message: 'Custom message' },
        positionals: [],
        raw: ['test', '--message', 'Custom message']
      }, context);
      
      expect(stdout).toContain('Custom message\n');
    });
  });
});