import { BaseAgent } from '../../src/base-agent';
import { AgentConfig, AgentInput, AgentOutput } from '../../src/types';

// Test implementation of BaseAgent
class TestAgent extends BaseAgent {
  processCount = 0;
  lastInput?: AgentInput;

  constructor() {
    super('test-agent', 'Test Agent', 'Agent for testing');
  }

  protected async onInitialize(_config: AgentConfig): Promise<void> {
    // No-op for test
  }

  protected async onProcess(input: AgentInput): Promise<AgentOutput> {
    this.processCount++;
    this.lastInput = input;
    
    return {
      message: {
        role: 'assistant',
        content: 'Test response'
      },
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15
      }
    };
  }

  protected async onTerminate(): Promise<void> {
    this.processCount = 0;
  }

  protected getMaxContextLength(): number {
    return 4096;
  }

  protected getSupportedModels(): string[] {
    return ['test-model'];
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
  });

  describe('Lifecycle', () => {
    it('should initialize with config', async () => {
      const config: AgentConfig = {
        temperature: 0.7,
        maxTokens: 100,
        systemPrompt: 'You are a helpful assistant'
      };

      await agent.initialize(config);
      
      expect(agent.getCapabilities()).toMatchObject({
        streaming: false,
        tools: false,
        memory: false,
        maxContextLength: 4096
      });
    });

    it('should throw error if processing before initialization', async () => {
      const input: AgentInput = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(agent.process(input)).rejects.toThrow('not initialized');
    });

    it('should process after initialization', async () => {
      await agent.initialize({});
      
      const input: AgentInput = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const output = await agent.process(input);
      
      expect(output.message.content).toBe('Test response');
      expect(agent.processCount).toBe(1);
    });

    it('should terminate properly', async () => {
      await agent.initialize({});
      await agent.process({ messages: [] });
      expect(agent.processCount).toBe(1);
      
      await agent.terminate();
      expect(agent.processCount).toBe(0);
    });
  });

  describe('System Prompt', () => {
    it('should add system prompt to messages', async () => {
      await agent.initialize({
        systemPrompt: 'You are a coding assistant'
      });

      const input: AgentInput = {
        messages: [{ role: 'user', content: 'Write a function' }]
      };

      await agent.process(input);
      
      expect(agent.lastInput!.messages).toHaveLength(2);
      expect(agent.lastInput!.messages[0]).toEqual({
        role: 'system',
        content: 'You are a coding assistant'
      });
    });
  });

  describe('Tool Management', () => {
    it('should add and remove tools', async () => {
      await agent.initialize({});
      
      const tool = {
        name: 'test_tool',
        description: 'Test tool',
        parameters: { type: 'object' as const, properties: {} },
        execute: async () => ({ result: 'test' })
      };

      agent.addTool(tool);
      expect(agent.tools).toHaveLength(1);
      expect(agent.getTool('test_tool')).toBe(tool);
      
      agent.removeTool('test_tool');
      expect(agent.tools).toHaveLength(0);
      expect(agent.getTool('test_tool')).toBeUndefined();
    });

    it('should update capabilities when tools are added', async () => {
      await agent.initialize({});
      
      expect(agent.getCapabilities().tools).toBe(false);
      
      agent.addTool({
        name: 'tool',
        description: 'Tool',
        parameters: { type: 'object' as const, properties: {} },
        execute: async () => ({})
      });
      
      expect(agent.getCapabilities().tools).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      
      class RetryAgent extends TestAgent {
        protected async onProcess(input: AgentInput): Promise<AgentOutput> {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return super.onProcess(input);
        }
      }

      const retryAgent = new RetryAgent();
      await retryAgent.initialize({ retryAttempts: 3 });
      
      const output = await retryAgent.process({
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      expect(attempts).toBe(2);
      expect(output.message.content).toBe('Test response');
    });

    it('should throw after max retries', async () => {
      class FailingAgent extends TestAgent {
        protected async onProcess(_input: AgentInput): Promise<AgentOutput> {
          throw new Error('Persistent failure');
        }
      }

      const failingAgent = new FailingAgent();
      await failingAgent.initialize({ retryAttempts: 2 });
      
      await expect(failingAgent.process({
        messages: [{ role: 'user', content: 'Test' }]
      })).rejects.toThrow('Persistent failure');
    });
  });
});

describe('BaseAgent with Tools', () => {
  class ToolAgent extends BaseAgent {
    constructor() {
      super('tool-agent', 'Tool Agent', 'Agent with tool support');
    }

    protected async onInitialize(_config: AgentConfig): Promise<void> {}

    protected async onProcess(input: AgentInput): Promise<AgentOutput> {
      // Return tool calls if asked about calculation
      const lastMessage = input.messages[input.messages.length - 1];
      if (lastMessage.content.includes('calculate')) {
        return {
          message: {
            role: 'assistant',
            content: 'I will calculate that for you.'
          },
          toolCalls: [{
            id: 'call_123',
            name: 'calculator',
            arguments: { expression: '2 + 2' }
          }]
        };
      }

      return {
        message: {
          role: 'assistant',
          content: 'No calculation needed.'
        }
      };
    }

    protected async onTerminate(): Promise<void> {}
    protected getMaxContextLength(): number { return 4096; }
    protected getSupportedModels(): string[] { return ['tool-model']; }
  }

  it('should execute tools and continue processing', async () => {
    const agent = new ToolAgent();
    
    const calculator = {
      name: 'calculator',
      description: 'Calculate math',
      parameters: { type: 'object' as const, properties: {} },
      execute: async (_args: any) => ({ result: 4 })
    };
    
    await agent.initialize({ tools: [calculator] });
    
    const output = await agent.process({
      messages: [{ role: 'user', content: 'Please calculate 2+2' }]
    });
    
    // First response triggers tool
    expect(output.toolCalls).toBeUndefined(); // Tools are executed internally
    expect(output.message.content).toBe('No calculation needed.');
  });
});