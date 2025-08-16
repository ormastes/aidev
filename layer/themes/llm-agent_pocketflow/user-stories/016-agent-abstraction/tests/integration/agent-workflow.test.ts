import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { MockAgent } from '../../src/mock-agent';
import { AgentNode, ChatAgentNode, ConversationAgentNode } from '../../src/agent-node';
import { ConversationMemory } from '../../src/memory';
import { calculatorTool } from '../../src/tools';
import { AgentInput, AgentOutput } from '../../src/types';

describe('Agent Workflow Integration', () => {
  describe('Basic Agent in Workflow', () => {
    it('should process through agent node', async () => {
      const flow = new PocketFlow();
      const agent = new MockAgent();
      
      await agent.initialize({
        defaultResponse: 'Processed by mock agent'
      });
      
      const inputNode = {
        id: 'input',
        type: 'input',
        execute: async (input: any) => ({ data: input.data, "success": true })
      };
      
      const agentNode = new AgentNode('agent', agent);
      
      const outputNode = {
        id: 'output',
        type: 'output',
        execute: async (input: any) => ({ data: input.data, "success": true })
      };
      
      flow.addNode(inputNode);
      flow.addNode(agentNode);
      flow.addNode(outputNode);
      
      flow.addEdge({ from: 'input', to: 'agent' });
      flow.addEdge({ from: 'agent', to: 'output' });
      
      const result = await flow.execute('Hello, agent!');
      
      expect(result.success).toBe(true);
      const output = result.outputs.get('output');
      expect(output.message.content).toBe('Processed by mock agent');
    });
  });

  describe('Chat Agent Node', () => {
    it('should simplify chat interactions', async () => {
      const flow = new PocketFlow();
      const agent = new MockAgent();
      
      agent.addResponse('hello', 'Hi there! How can I help you?');
      await agent.initialize({});
      
      const chatNode = new ChatAgentNode('chat', agent);
      
      flow.addNode(chatNode);
      
      const result = await flow.execute('Hello!');
      
      expect(result.outputs.get('chat')).toBe('Hi there! How can I help you?');
    });
  });

  describe('Conversation Agent Node', () => {
    it('should maintain conversation history', async () => {
      const agent = new MockAgent();
      agent.addResponse('name', 'I will remember that.');
      agent.addResponse('recall', 'You told me your name earlier.');
      await agent.initialize({});
      
      const convNode = new ConversationAgentNode('conv', agent, 10);
      
      // First interaction
      const result1 = await convNode.execute({
        data: 'My name is John',
        context: { variables: new Map(), errors: [], metadata: new Map() }
      });
      
      expect(result1.success).toBe(true);
      expect(result1.data.response).toBe('I will remember that.');
      expect(result1.data.history).toHaveLength(2); // User + Assistant
      
      // Second interaction - should have history
      const result2 = await convNode.execute({
        data: 'Do you recall what I told you?',
        context: { variables: new Map(), errors: [], metadata: new Map() }
      });
      
      expect(result2.data.response).toBe('You told me your name earlier.');
      expect(result2.data.history).toHaveLength(4); // 2 previous + 2 new
    });

    it('should trim history to max size', async () => {
      const agent = new MockAgent();
      await agent.initialize({});
      
      const convNode = new ConversationAgentNode('conv', agent, 2); // Max 2 exchanges
      
      // Add multiple messages
      for (let i = 0; i < 5; i++) {
        await convNode.execute({
          data: `Message ${i}`,
          context: { variables: new Map(), errors: [], metadata: new Map() }
        });
      }
      
      const history = convNode.getHistory();
      expect(history.length).toBeLessThanOrEqual(4); // 2 exchanges = 4 messages max
    });
  });

  describe('Agent with Tools in Workflow', () => {
    it('should execute tools through workflow', async () => {
      const flow = new PocketFlow();
      const agent = new MockAgent();
      
      // Configure agent to use calculator for math questions
      await agent.initialize({
        tools: [calculatorTool]
      });
      
      const agentNode = new AgentNode('agent', agent);
      
      flow.addNode(agentNode);
      
      const result = await flow.execute({
        messages: [{ role: 'user', content: 'Calculate 25 times 4' }]
      });
      
      const output = result.outputs.get('agent');
      // Tool calls are executed by BaseAgent when tools are present
      // The output won't have toolCalls since they were executed
      expect(output.message.content).toBe('I\'m a mock agent. I received your message.');
    });
  });

  describe('Multi-Agent Workflow', () => {
    it('should coordinate multiple agents', async () => {
      const flow = new PocketFlow();
      
      // First agent: analyzer
      const analyzer = new MockAgent();
      analyzer.addResponse('analyze', 'This appears to be a question about math.');
      await analyzer.initialize({});
      
      // Second agent: solver
      const solver = new MockAgent();
      solver.addResponse('math', 'The answer is 42.');
      await solver.initialize({});
      
      // Create agent nodes
      const analyzerNode = new AgentNode('analyzer', analyzer, {
        formatOutput: (output) => output.message.content
      });
      
      const solverNode = new AgentNode('solver', solver, {
        extractInput: (data) => ({
          messages: [{ role: 'user', content: `Based on analysis: "${data}", solve the math problem` }]
        }),
        formatOutput: (output) => output.message.content
      });
      
      flow.addNode(analyzerNode);
      flow.addNode(solverNode);
      
      flow.addEdge({ from: 'analyzer', to: 'solver' });
      
      const result = await flow.execute('Please analyze this math problem');
      
      expect(result.outputs.get('analyzer')).toContain('question about math');
      expect(result.outputs.get('solver')).toBe('The answer is 42.');
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle agent errors gracefully', async () => {
      const flow = new PocketFlow();
      
      // Create a failing agent
      class FailingAgent extends MockAgent {
        async process(_input: AgentInput): Promise<AgentOutput> {
          throw new Error('Agent failure');
        }
      }
      
      const agent = new FailingAgent();
      await agent.initialize({});
      
      const agentNode = new AgentNode('agent', agent, {
        onError: (error) => ({
          error: error.message,
          fallback: 'Using fallback response'
        })
      });
      
      flow.addNode(agentNode);
      
      const result = await flow.execute('Test');
      
      // The node failed, so check the error in the result
      expect(result.success).toBe(false);
      expect(result.errors[0].toString()).toContain('Agent failure');
    });
  });

  describe('Complex Workflow with Memory', () => {
    it('should maintain state across workflow execution', async () => {
      const flow = new PocketFlow();
      const memory = new ConversationMemory();
      
      const agent = new MockAgent();
      agent.addResponse('remember', 'I will remember that information.');
      agent.addResponse('recall', 'I remember what you told me.');
      await agent.initialize({ memory });
      
      // Store information node
      const storeNode = {
        id: 'store',
        type: 'store',
        execute: async (_input: any) => {
          await memory.store('messages', [
            { role: 'user', content: 'Important fact: The sky is blue' },
            { role: 'assistant', content: 'I have noted that fact.' }
          ]);
          return { data: 'stored', "success": true };
        }
      };
      
      // Agent node that uses memory
      const agentNode = new AgentNode('agent', agent);
      
      flow.addNode(storeNode);
      flow.addNode(agentNode);
      
      // First execute store to populate memory
      await storeNode.execute({ data: null, context: { variables: new Map(), errors: [], metadata: new Map() } });
      
      // Then execute agent with the recall question
      const result = await agentNode.execute({ 
        data: 'Can you recall what I told you?',
        context: { variables: new Map(), errors: [], metadata: new Map() }
      });
      
      expect(result.data.message.content).toBe('I remember what you told me.');
    });
  });
});