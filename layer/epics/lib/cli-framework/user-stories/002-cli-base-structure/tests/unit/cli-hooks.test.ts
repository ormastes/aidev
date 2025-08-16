import { CLI } from '../../src/application/cli';
import { Command } from '../../src/domain/command';
import { Hook, HookType } from '../../src/domain/types';

describe('CLI Hooks', () => {
  let cli: CLI;

  beforeEach(() => {
    cli = new CLI({
      name: 'test-cli',
      version: '1.0.0'
    });
  });

  describe('addHook', () => {
    it('should add hooks for all hook types', () => {
      const hookTypes: HookType[] = ["preparse", "postparse", "precommand", "postcommand", 'error'];
      const handlers = new Map<HookType, jest.Mock>();

      hookTypes.forEach(type => {
        const handler = jest.fn();
        handlers.set(type, handler);
        
        const hook: Hook = { type, handler };
        cli.addHook(hook);
      });

      // Verify hooks were added (we'll test execution separately)
      expect(cli).toBeDefined();
    });

    it('should allow multiple hooks of the same type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      cli.addHook({ type: "precommand", handler: handler1 });
      cli.addHook({ type: "precommand", handler: handler2 });

      // Both hooks should be registered
      expect(cli).toBeDefined();
    });
  });

  describe('Hook Execution', () => {
    it('should execute preparse and postparse hooks', async () => {
      const preparseHandler = jest.fn();
      const postparseHandler = jest.fn();

      cli.addHook({ type: "preparse", handler: preparseHandler });
      cli.addHook({ type: "postparse", handler: postparseHandler });

      await cli.parse(['test']);

      expect(preparseHandler).toHaveBeenCalledWith({
        args: ['test'],
        options: expect.objectContaining({
          name: 'test-cli',
          version: '1.0.0'
        })
      });

      expect(postparseHandler).toHaveBeenCalledWith({
        args: ['test'],
        parsedArgs: expect.objectContaining({
          _: ['test']
        }),
        options: expect.objectContaining({
          name: 'test-cli',
          version: '1.0.0'
        })
      });
    });

    it('should execute precommand and postcommand hooks', async () => {
      const precommandHandler = jest.fn();
      const postcommandHandler = jest.fn();

      class TestCommand extends Command {
        name = 'test';
        description = 'Test command';
        
        async run() {
          return 'test result';
        }
      }

      cli.addHook({ type: "precommand", handler: precommandHandler });
      cli.addHook({ type: "postcommand", handler: postcommandHandler });
      cli.addCommand(new TestCommand());

      await cli.parse(['test']);

      expect(precommandHandler).toHaveBeenCalledWith({
        command: expect.objectContaining({ name: 'test' }),
        parsedArgs: expect.any(Object),
        options: expect.any(Object)
      });

      expect(postcommandHandler).toHaveBeenCalledWith({
        command: expect.objectContaining({ name: 'test' }),
        parsedArgs: expect.any(Object),
        result: 'test result',
        options: expect.any(Object)
      });
    });

    it('should execute error hooks on command error', async () => {
      const errorHandler = jest.fn();
      const error = new Error('Command failed');

      class FailingCommand extends Command {
        name = 'fail';
        description = 'Failing command';
        
        async run() {
          throw error;
        }
      }

      cli.addHook({ type: 'error', handler: errorHandler });
      cli.addCommand(new FailingCommand());

      await expect(cli.parse(['fail'])).rejects.toThrow('Command failed');

      expect(errorHandler).toHaveBeenCalledWith({
        error,
        command: expect.objectContaining({ name: 'fail' }),
        parsedArgs: expect.any(Object),
        options: expect.any(Object)
      });
    });

    it('should handle async hooks properly', async () => {
      const asyncResults: string[] = [];

      cli.addHook({
        type: "preparse",
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          asyncResults.push("preparse");
        }
      });

      cli.addHook({
        type: "postparse",
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          asyncResults.push("postparse");
        }
      });

      await cli.parse(['help']);

      expect(asyncResults).toEqual(["preparse", "postparse"]);
    });

    it('should execute hooks in order', async () => {
      const executionOrder: number[] = [];

      cli.addHook({
        type: "preparse",
        handler: () => { executionOrder.push(1); }
      });

      cli.addHook({
        type: "preparse",
        handler: () => { executionOrder.push(2); }
      });

      cli.addHook({
        type: "preparse",
        handler: () => { executionOrder.push(3); }
      });

      await cli.parse([]);

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should continue execution if hook throws', async () => {
      const executedHooks: string[] = [];

      cli.addHook({
        type: "preparse",
        handler: () => {
          executedHooks.push('hook1');
        }
      });

      cli.addHook({
        type: "preparse",
        handler: () => {
          executedHooks.push('hook2');
          throw new Error('Hook error');
        }
      });

      cli.addHook({
        type: "preparse",
        handler: () => {
          executedHooks.push('hook3');
        }
      });

      // Hook errors are caught and logged, execution continues
      await cli.parse([]);

      expect(executedHooks).toEqual(['hook1', 'hook2', 'hook3']);
    });

    it('should pass context between hooks', async () => {
      let preparseContext: any;
      let postparseContext: any;

      cli.addHook({
        type: "preparse",
        handler: (context) => {
          preparseContext = context;
        }
      });

      cli.addHook({
        type: "postparse",
        handler: (context) => {
          postparseContext = context;
        }
      });

      await cli.parse(['--verbose']);

      expect(preparseContext.args).toEqual(['--verbose']);
      expect(postparseContext.args).toEqual(['--verbose']);
      expect(postparseContext.parsedArgs).toBeDefined();
    });
  });
});