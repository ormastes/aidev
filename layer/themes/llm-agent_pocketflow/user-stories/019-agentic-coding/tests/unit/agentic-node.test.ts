import { createAgenticNode, createAgentChain, createAgentParallel, createAgentDebate } from '../../src/agentic-node';
import { CodeGenAgent } from '../../src/agents/code-gen-agent';
import { TestGenAgent } from '../../src/agents/test-gen-agent';
import { CodeGenRequest, TestGenRequest, AgentContext } from '../../src/types';
import { InMemoryStorage } from '../../../016-agent-abstraction/src/memory';

// Mock the agent modules
jest.mock('../../src/agents/code-gen-agent');
jest.mock('../../src/agents/test-gen-agent');

describe('AgenticNode', () => {
  let mockCodeGenAgent: jest.Mocked<CodeGenAgent>;
  let mockTestGenAgent: jest.Mocked<TestGenAgent>;
  let context: AgentContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock agents
    mockCodeGenAgent = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
    mockTestGenAgent = new TestGenAgent() as jest.Mocked<TestGenAgent>;
    
    // Setup default mock behaviors
    mockCodeGenAgent.execute.mockResolvedValue({
      success: true,
      data: {
        code: 'function test() { return true; }',
        language: 'typescript'
      }
    });
    
    mockTestGenAgent.execute.mockResolvedValue({
      success: true,
      data: {
        testCode: 'describe("test", () => { it("works", () => {}); });',
        framework: 'jest',
        coverage: { statements: 100, branches: 100, functions: 100, lines: 100 }
      }
    });
    
    context = {
      memory: new InMemoryStorage(),
      tools: new Map(),
      metadata: {}
    };
  });

  describe('createAgenticNode', () => {
    it('should create node with agent', async () => {
      const node = createAgenticNode('code-gen', mockCodeGenAgent);
      
      expect(node.id).toBe('code-gen');
      expect(node.type).toBe('agentic');
      expect(node.agent).toBe(mockCodeGenAgent);
    });

    it('should execute agent with input', async () => {
      const node = createAgenticNode('code-gen', mockCodeGenAgent);
      const input: CodeGenRequest = {
        description: 'Create a function',
        language: 'typescript'
      };
      
      const result = await node.execute(input);
      
      expect(mockCodeGenAgent.execute).toHaveBeenCalledWith(input, expect.any(Object));
      expect(result.data).toEqual({
        code: 'function test() { return true; }',
        language: 'typescript'
      });
    });

    it('should apply preProcess function', async () => {
      const preProcess = jest.fn().mockResolvedValue({
        description: 'Modified description',
        language: 'javascript'
      });
      
      const node = createAgenticNode('code-gen', mockCodeGenAgent, {
        preProcess
      });
      
      const input: CodeGenRequest = {
        description: 'Original description',
        language: 'typescript'
      };
      
      await node.execute(input);
      
      expect(preProcess).toHaveBeenCalledWith(input);
      expect(mockCodeGenAgent.execute).toHaveBeenCalledWith({
        description: 'Modified description',
        language: 'javascript'
      }, expect.any(Object));
    });

    it('should apply postProcess function', async () => {
      const postProcess = jest.fn().mockResolvedValue({
        modified: true,
        originalCode: 'function test() { return true; }'
      });
      
      const node = createAgenticNode('code-gen', mockCodeGenAgent, {
        postProcess
      });
      
      const input: CodeGenRequest = {
        description: 'Create a function',
        language: 'typescript'
      };
      
      const result = await node.execute(input);
      
      expect(postProcess).toHaveBeenCalledWith({
        code: 'function test() { return true; }',
        language: 'typescript'
      });
      expect(result.data).toEqual({
        modified: true,
        originalCode: 'function test() { return true; }'
      });
    });

    it('should handle agent execution failure', async () => {
      mockCodeGenAgent.execute.mockResolvedValue({
        success: false,
        error: new Error('Agent failed')
      });
      
      const node = createAgenticNode('code-gen', mockCodeGenAgent);
      const input: CodeGenRequest = {
        description: 'Create a function',
        language: 'typescript'
      };
      
      await expect(node.execute(input)).rejects.toThrow('Agent execution failed');
    });
  });

  describe('createAgentChain', () => {
    it('should create chain of agents', () => {
      const chain = createAgentChain('code-test-chain', [
        mockCodeGenAgent,
        mockTestGenAgent
      ]);
      
      expect(chain.id).toBe('code-test-chain');
      expect(chain.type).toBe('agentic-chain');
    });

    it('should execute agents in sequence', async () => {
      const chain = createAgentChain('code-test-chain', [
        mockCodeGenAgent,
        mockTestGenAgent
      ]);
      
      const input: CodeGenRequest = {
        description: 'Create a calculator',
        language: 'typescript'
      };
      
      const result = await chain.execute(input);
      
      expect(mockCodeGenAgent.execute).toHaveBeenCalledWith(input, expect.any(Object));
      expect(mockTestGenAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'function test() { return true; }',
          language: 'typescript'
        }),
        expect.any(Object)
      );
      expect(result.data).toBeDefined();
    });

    it('should stop chain on failure', async () => {
      mockCodeGenAgent.execute.mockResolvedValue({
        success: false,
        error: new Error('Code generation failed')
      });
      
      const chain = createAgentChain('code-test-chain', [
        mockCodeGenAgent,
        mockTestGenAgent
      ]);
      
      await expect(chain.execute({} as any)).rejects.toThrow();
      
      expect(mockCodeGenAgent.execute).toHaveBeenCalled();
      expect(mockTestGenAgent.execute).not.toHaveBeenCalled();
    });

    it('should transform data between agents', async () => {
      const transformers = [
        (data: any) => ({ ...data, framework: 'jest', testType: 'unit' as const })
      ];
      
      const chain = createAgentChain('code-test-chain', [
        mockCodeGenAgent,
        mockTestGenAgent
      ], { transformers });
      
      await chain.execute({} as any);
      
      expect(mockTestGenAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: 'jest',
          testType: 'unit'
        }),
        expect.any(Object)
      );
    });
  });

  describe('createAgentParallel', () => {
    it('should create parallel agent executor', () => {
      const parallel = createAgentParallel('parallel-gen', [
        mockCodeGenAgent,
        mockCodeGenAgent // Using same agent type for simplicity
      ]);
      
      expect(parallel.id).toBe('parallel-gen');
      expect(parallel.type).toBe('agentic-parallel');
    });

    it('should execute agents in parallel', async () => {
      const mockAgent1 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      const mockAgent2 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      
      mockAgent1.execute.mockResolvedValue({
        success: true,
        data: { code: 'code1', language: 'typescript' }
      });
      
      mockAgent2.execute.mockResolvedValue({
        success: true,
        data: { code: 'code2', language: 'javascript' }
      });
      
      const parallel = createAgentParallel('parallel-gen', [mockAgent1, mockAgent2]);
      
      const result = await parallel.execute({} as any);
      
      expect(mockAgent1.execute).toHaveBeenCalled();
      expect(mockAgent2.execute).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].code).toBe('code1');
      expect(result.data[1].code).toBe('code2');
    });

    it('should aggregate results with custom aggregator', async () => {
      const aggregator = (results: any[]) => ({
        combinedCode: results.map(r => r.code).join('\n'),
        count: results.length
      });
      
      const parallel = createAgentParallel('parallel-gen', [
        mockCodeGenAgent,
        mockCodeGenAgent
      ], { aggregator });
      
      const result = await parallel.execute({} as any);
      
      expect(result.data).toEqual({
        combinedCode: expect.any(String),
        count: 2
      });
    });

    it('should handle partial failures', async () => {
      const mockAgent1 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      const mockAgent2 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      
      mockAgent1.execute.mockResolvedValue({
        success: true,
        data: { code: 'code1', language: 'typescript' }
      });
      
      mockAgent2.execute.mockResolvedValue({
        success: false,
        error: new Error('Agent 2 failed')
      });
      
      const parallel = createAgentParallel('parallel-gen', [mockAgent1, mockAgent2]);
      
      const result = await parallel.execute({} as any);
      
      // Default behavior: still returns successful results
      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('code1');
    });
  });

  describe('createAgentDebate', () => {
    it('should create debate node', () => {
      const debate = createAgentDebate('debate-node', [
        mockCodeGenAgent,
        mockCodeGenAgent
      ]);
      
      expect(debate.id).toBe('debate-node');
      expect(debate.type).toBe('agentic-debate');
    });

    it('should run debate rounds', async () => {
      const mockAgent1 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      const mockAgent2 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      
      // First round
      mockAgent1.execute
        .mockResolvedValueOnce({
          success: true,
          data: { code: 'version1', language: 'typescript' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { code: 'version1-improved', language: 'typescript' }
        });
      
      mockAgent2.execute
        .mockResolvedValueOnce({
          success: true,
          data: { code: 'version2', language: 'typescript' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { code: 'version2-improved', language: 'typescript' }
        });
      
      const debate = createAgentDebate('debate-node', [mockAgent1, mockAgent2], {
        rounds: 2
      });
      
      const result = await debate.execute({} as any);
      
      expect(mockAgent1.execute).toHaveBeenCalledTimes(2);
      expect(mockAgent2.execute).toHaveBeenCalledTimes(2);
      expect(result.data).toBeDefined();
    });

    it('should use custom judge function', async () => {
      const judge = jest.fn().mockReturnValue(1); // Select second result
      
      const mockAgent1 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      const mockAgent2 = new CodeGenAgent() as jest.Mocked<CodeGenAgent>;
      
      mockAgent1.execute.mockResolvedValue({
        success: true,
        data: { code: 'code1', language: 'typescript' }
      });
      
      mockAgent2.execute.mockResolvedValue({
        success: true,
        data: { code: 'code2', language: 'typescript' }
      });
      
      const debate = createAgentDebate('debate-node', [mockAgent1, mockAgent2], {
        rounds: 1,
        judge
      });
      
      const result = await debate.execute({} as any);
      
      expect(judge).toHaveBeenCalledWith([
        { code: 'code1', language: 'typescript' },
        { code: 'code2', language: 'typescript' }
      ]);
      expect(result.data.code).toBe('code2');
    });

    it('should handle debate with no consensus', async () => {
      const debate = createAgentDebate('debate-node', [
        mockCodeGenAgent,
        mockCodeGenAgent
      ], {
        rounds: 1
      });
      
      const result = await debate.execute({} as any);
      
      // Should return one of the results
      expect(result.data).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle preProcess errors', async () => {
      const preProcess = jest.fn().mockRejectedValue(new Error('PreProcess failed'));
      
      const node = createAgenticNode('code-gen', mockCodeGenAgent, {
        preProcess
      });
      
      await expect(node.execute({} as any)).rejects.toThrow();
    });

    it('should handle postProcess errors', async () => {
      const postProcess = jest.fn().mockRejectedValue(new Error('PostProcess failed'));
      
      const node = createAgenticNode('code-gen', mockCodeGenAgent, {
        postProcess
      });
      
      await expect(node.execute({} as any)).rejects.toThrow();
    });

    it('should handle empty agent array', async () => {
      const chain = createAgentChain('empty-chain', []);
      
      await expect(chain.execute({} as any)).rejects.toThrow();
    });
  });
});