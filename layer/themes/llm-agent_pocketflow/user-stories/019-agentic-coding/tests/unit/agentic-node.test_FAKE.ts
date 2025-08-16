import { 
  AgenticCodeNode, 
  createAgenticNode,
  AgentChain,
  ParallelAgents,
  AgentDebate
} from '../../src/agentic-node';
import { CodeAgent } from '../../src/types';
import { BaseCodeAgent } from '../../src/base-code-agent';

// Mock agent for testing
class MockCodeAgent extends BaseCodeAgent implements CodeAgent {
  constructor(
    name: string,
    private mockResponse: any,
    private shouldFail: boolean = false
  ) {
    super(name, 'Mock agent for testing');
  }

  generatePrompt(request: any): string {
    return JSON.stringify(request);
  }

  parseResponse(response: string): any {
    return JSON.parse(response);
  }

  validate(result: any): boolean {
    return result !== null;
  }

  protected async simulateAIResponse(_prompt: string, _input: any): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Mock agent failed');
    }
    return JSON.stringify(this.mockResponse);
  }
}

describe('AgenticCodeNode', () => {
  describe('basic functionality', () => {
    it('should execute agent and return result', async () => {
      const mockAgent = new MockCodeAgent('test', { result: 'In Progress' });
      const node = new AgenticCodeNode('test-node', mockAgent);
      
      const result = await node.execute({
        data: { input: 'test' },
        context: {}
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'In Progress' });
    });

    it('should apply preprocessing', async () => {
      const mockAgent = new MockCodeAgent('test', { processed: true });
      const node = new AgenticCodeNode(
        'test-node',
        mockAgent,
        async (input: any) => ({ ...input, preprocessed: true })
      );
      
      const result = await node.execute({
        data: { input: 'test' },
        context: {}
      });
      
      expect(result.success).toBe(true);
    });

    it('should apply postprocessing', async () => {
      const mockAgent = new MockCodeAgent('test', { value: 10 });
      const node = new AgenticCodeNode(
        'test-node',
        mockAgent,
        undefined,
        async (output: any) => ({ ...output, doubled: output.value * 2 })
      );
      
      const result = await node.execute({
        data: { input: 'test' },
        context: {}
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 10, doubled: 20 });
    });

    it('should handle agent failures', async () => {
      const mockAgent = new MockCodeAgent('test', null, true);
      const node = new AgenticCodeNode('test-node', mockAgent);
      
      const result = await node.execute({
        data: { input: 'test' },
        context: {}
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Agent execution failed');
    });

    it('should store agent results in context', async () => {
      const mockAgent = new MockCodeAgent('test', { result: 'stored' });
      const node = new AgenticCodeNode('test-node', mockAgent);
      
      const context: any = {};
      await node.execute({
        data: { input: 'test' },
        context
      });
      
      expect(context.agentResults).toBeDefined();
      expect(context.agentResults['test-node']).toBeDefined();
      expect(context.agentResults['test-node'].success).toBe(true);
    });
  });

  describe('createAgenticNode factory', () => {
    it('should create node with options', () => {
      const mockAgent = new MockCodeAgent('test', {});
      const node = createAgenticNode('factory-node', mockAgent, {
        preProcess: async (x) => x,
        postProcess: async (x) => x
      });
      
      expect(node).toBeInstanceOf(AgenticCodeNode);
      expect(node.id).toBe('factory-node');
      expect(node.agent).toBe(mockAgent);
    });
  });
});

describe('AgentChain', () => {
  it('should execute agents in sequence', async () => {
    const agent1 = new MockCodeAgent('agent1', { step: 1 });
    const agent2 = new MockCodeAgent('agent2', { step: 2 });
    const agent3 = new MockCodeAgent('agent3', { step: 3 });
    
    const chain = new AgentChain('chain', [agent1, agent2, agent3]);
    
    const result = await chain.execute({
      data: { input: 'start' },
      context: {}
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ step: 3 });
  });

  it('should apply transformers between agents', async () => {
    const agent1 = new MockCodeAgent('agent1', { value: 5 });
    const agent2 = new MockCodeAgent('agent2', { final: true });
    
    const chain = new AgentChain(
      'chain',
      [agent1, agent2],
      [
        (data) => ({ doubled: data.value * 2 })
      ]
    );
    
    const result = await chain.execute({
      data: { input: 'start' },
      context: {}
    });
    
    expect(result.success).toBe(true);
  });

  it('should fail if any agent fails', async () => {
    const agent1 = new MockCodeAgent('agent1', { step: 1 });
    const agent2 = new MockCodeAgent('agent2', null, true);
    
    const chain = new AgentChain('chain', [agent1, agent2]);
    
    const result = await chain.execute({
      data: { input: 'start' },
      context: {}
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Agent agent2 failed');
  });
});

describe('ParallelAgents', () => {
  it('should execute agents in parallel', async () => {
    const agent1 = new MockCodeAgent('agent1', { result: 'a' });
    const agent2 = new MockCodeAgent('agent2', { result: 'b' });
    const agent3 = new MockCodeAgent('agent3', { result: 'c' });
    
    const parallel = new ParallelAgents('parallel', [agent1, agent2, agent3]);
    
    const result = await parallel.execute({
      data: { input: 'test' },
      context: {}
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data).toEqual([
      { result: 'a' },
      { result: 'b' },
      { result: 'c' }
    ]);
  });

  it('should fail if any agent fails', async () => {
    const agent1 = new MockCodeAgent('agent1', { result: 'a' });
    const agent2 = new MockCodeAgent('agent2', null, true);
    const agent3 = new MockCodeAgent('agent3', { result: 'c' });
    
    const parallel = new ParallelAgents('parallel', [agent1, agent2, agent3]);
    
    const result = await parallel.execute({
      data: { input: 'test' },
      context: {}
    });
    
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('1 agents failed');
  });
});

describe('AgentDebate', () => {
  it('should run debate rounds', async () => {
    const agent1 = new MockCodeAgent('agent1', { position: 'A' });
    const agent2 = new MockCodeAgent('agent2', { position: 'B' });
    
    const debate = new AgentDebate('debate', [agent1, agent2], 2);
    
    const result = await debate.execute({
      data: { topic: 'test' },
      context: {}
    });
    
    expect(result.success).toBe(true);
  });

  it('should use vote consensus strategy', async () => {
    const agent1 = new MockCodeAgent('agent1', { vote: 'option1' });
    const agent2 = new MockCodeAgent('agent2', { vote: 'option2' });
    
    const debate = new AgentDebate('debate', [agent1, agent2], 1, 'vote');
    
    const result = await debate.execute({
      data: { topic: 'test' },
      context: {}
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ vote: 'option1' }); // First agent's vote
  });

  it('should use synthesize consensus strategy', async () => {
    const agent1 = new MockCodeAgent('agent1', { idea: 'A' });
    const agent2 = new MockCodeAgent('agent2', { idea: 'B' });
    
    const debate = new AgentDebate('debate', [agent1, agent2], 1, 'synthesize');
    
    const result = await debate.execute({
      data: { topic: 'test' },
      context: {}
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('consensus', true);
    expect(result.data).toHaveProperty('positions');
    expect(result.data).toHaveProperty('synthesis');
  });
});