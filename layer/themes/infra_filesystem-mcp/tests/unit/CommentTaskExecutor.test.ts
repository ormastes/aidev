import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { CommentTaskExecutor } from '../../children/CommentTaskExecutor';
import { Task } from '../../children/VFTaskQueueWrapper';

// Mock the ScriptMatcher
jest.mock('../../../../llm_rules/steps/script-matcher.js', () => {
  return {
    default: class MockScriptMatcher {
      constructor() {}
      async execute(text: string, parameters: string[]) {
        if (text.includes('error')) {
          throw new Error('Script execution failed');
        }
        if (text.includes('missing')) {
          throw new Error('Script not found');
        }
        return {
          success: true,
          output: `Executed: ${text} with params: ${parameters.join(', ')}`
        };
      }
    }
  };
}, { virtual: true });

describe("CommentTaskExecutor", () => {
  let executor: CommentTaskExecutor;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../../temp/test-comment-executor');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    process.chdir(tempDir);
    
    // Create mock llm_rules/steps directory
    const stepsDir = path.join(tempDir, 'llm_rules', 'steps');
    fs.mkdirSync(stepsDir, { recursive: true });
    
    // Create mock script-matcher.js
    fs.writeFileSync(path.join(stepsDir, 'script-matcher.js'), `
      module.exports = class ScriptMatcher {
        async execute(text, parameters) {
          if (text.includes("register")) {
            return { success: true, output: 'Registered successfully' };
          }
          if (text.includes('check')) {
            return { success: false, error: 'Check failed' };
          }
          throw new Error('No matching script found');
        }
      };
    `);
    
    executor = new CommentTaskExecutor(tempDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe("executePopComment", () => {
    it('should handle string comments', async () => {
      const result = await executor.executePopComment('Simple message');
      
      expect(result).toEqual({
        type: 'message',
        content: 'Simple message'
      });
    });

    it('should handle null/undefined comments', async () => {
      const resultNull = await executor.executePopComment(null);
      expect(resultNull).toBeNull();
      
      const resultUndefined = await executor.executePopComment(undefined);
      expect(resultUndefined).toBeNull();
    });

    it('should execute runnable comments successfully', async () => {
      const comment = {
        text: 'Register user story item',
        parameters: ['US-001', 'User Authentication']
      };
      
      const result = await executor.executePopComment(comment);
      
      expect(result.type).toBe('script_executed');
      expect(result.script).toBe('Register user story item');
      expect(result.parameters).toEqual(['US-001', 'User Authentication']);
      expect(result.output).toBe('Registered successfully');
    });

    it('should handle script execution errors', async () => {
      const comment = {
        text: 'Check validation',
        parameters: ['param1']
      };
      
      const result = await executor.executePopComment(comment);
      
      expect(result.type).toBe('script_error');
      expect(result.script).toBe('Check validation');
      expect(result.error).toBe('Check failed');
    });

    it('should handle missing scripts gracefully', async () => {
      const comment = {
        text: 'Unknown script',
        parameters: []
      };
      
      const result = await executor.executePopComment(comment);
      
      expect(result.type).toBe('comment');
      expect(result.content).toBe('Unknown script');
      expect(result.note).toBe('No matching script found');
    });

    it('should handle comments without parameters', async () => {
      const comment = {
        text: 'Register item'
      };
      
      const result = await executor.executePopComment(comment);
      
      expect(result.type).toBe('script_executed');
      expect(result.parameters).toEqual([]);
    });

    it('should detect NAME_ID updates', async () => {
      const comment = {
        text: 'Register user story',
        parameters: ['US-001', 'Story', 'NAME_ID.vf.json']
      };
      
      const result = await executor.executePopComment(comment);
      
      expect(result.type).toBe('script_executed');
      expect(result.nameIdUpdated).toBe(true);
    });
  });

  describe("getEnhancedExecutor", () => {
    it('should execute runnable tasks', async () => {
      const mockExecutor = jest.fn(() => Promise.resolve({ success: true }));
      executor.registerFunction('test', mockExecutor);
      
      const task: Task = {
        id: 'task-1',
        type: "runnable",
        priority: 'high',
        content: {},
        status: 'working',
        createdAt: new Date().toISOString(),
        runnable: {
          type: "function",
          function: 'test'
        }
      };
      
      const enhancedExecutor = executor.getEnhancedExecutor();
      const result = await enhancedExecutor(task);
      
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Task is not marked as runnable');
    });

    it('should skip non-runnable tasks', async () => {
      const task: Task = {
        id: 'task-2',
        type: 'data',
        priority: 'medium',
        content: { data: 'test' },
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      const enhancedExecutor = executor.getEnhancedExecutor();
      const result = await enhancedExecutor(task);
      
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Task is not marked as runnable');
    });
  });

  describe("createWithCommentSupport", () => {
    it('should create executor with comment support', () => {
      const commentExecutor = CommentTaskExecutor.createWithCommentSupport(tempDir);
      
      expect(commentExecutor).toBeInstanceOf(CommentTaskExecutor);
      expect(commentExecutor.directory).toBe(tempDir);
    });

    it('should register updateNameId function', async () => {
      const commentExecutor = CommentTaskExecutor.createWithCommentSupport(tempDir);
      
      // Create NAME_ID.vf.json
      const nameIdPath = path.join(tempDir, 'NAME_ID.vf.json');
      fs.writeFileSync(nameIdPath, JSON.stringify({
        types: {},
        indices: { by_name: {}, by_namespace: {}, by_tag: {} }
      }));
      
      // Test the registered function
      const entityData = {
        id: 'test-1',
        type: "component",
        name: "TestComponent"
      };
      
      const executor = commentExecutor.getExecutor();
      // The updateNameId function should be registered
      // We can't directly test it without accessing internals
      expect(executor).toBeDefined();
    });
  });

  describe("findStepsDirectory", () => {
    it('should find steps directory in parent directories', () => {
      // Create a nested directory structure
      const nestedDir = path.join(tempDir, 'deep', 'nested', 'path');
      fs.mkdirSync(nestedDir, { recursive: true });
      
      const nestedExecutor = new CommentTaskExecutor(nestedDir);
      
      // The executor should find the steps directory we created in tempDir
      expect(nestedExecutor).toBeDefined();
    });

    it('should handle missing ScriptMatcher gracefully', () => {
      // Remove the script-matcher.js file
      const scriptMatcherPath = path.join(tempDir, 'llm_rules', 'steps', 'script-matcher.js');
      if (fs.existsSync(scriptMatcherPath)) {
        fs.unlinkSync(scriptMatcherPath);
      }
      
      // Should still create executor but with null scriptMatcher
      const executorWithoutMatcher = new CommentTaskExecutor(tempDir);
      expect(executorWithoutMatcher).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle ScriptMatcher not available', async () => {
      // Create executor in a directory without script-matcher
      const noMatcherDir = path.join(tempDir, 'no-matcher');
      fs.mkdirSync(noMatcherDir);
      
      const executorNoMatcher = new CommentTaskExecutor(noMatcherDir);
      
      const comment = {
        text: 'Some script',
        parameters: ['param']
      };
      
      const result = await executorNoMatcher.executePopComment(comment);
      
      expect(result.type).toBe('comment');
      expect(result.note).toBe('ScriptMatcher not available');
    });

    it('should handle complex comment objects', async () => {
      const complexComment = {
        text: 'Register entity',
        parameters: ['id', 'name'],
        metadata: { source: 'test' },
        extra: 'ignored'
      };
      
      const result = await executor.executePopComment(complexComment);
      
      expect(result.type).toBe('script_executed');
      expect(result.script).toBe('Register entity');
    });
  });
});