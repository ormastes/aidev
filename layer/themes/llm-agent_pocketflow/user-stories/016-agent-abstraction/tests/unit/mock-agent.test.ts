import { MockAgent } from '../../src/mock-agent';

describe('MockAgent', () => {
  let agent: MockAgent;

  beforeEach(async () => {
    agent = new MockAgent();
    await agent.initialize({});
  });

  afterEach(async () => {
    await agent.terminate();
  });

  describe('Basic Responses', () => {
    it('should return default response', async () => {
      const output = await agent.process({
        messages: [{ role: 'user', content: 'Hello' }]
      });
      
      expect(output.message.role).toBe('assistant');
      expect(output.message.content).toBe("I'm a mock agent. I received your message.");
    });

    it('should use custom default response', async () => {
      await agent.terminate();
      await agent.initialize({
        defaultResponse: 'Custom response'
      });
      
      const output = await agent.process({
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      expect(output.message.content).toBe('Custom response');
    });

    it('should match response patterns', async () => {
      agent.addResponse('weather', 'The weather is sunny today.');
      agent.addResponse('time', 'The current time is 3:00 PM.');
      
      const weatherOutput = await agent.process({
        messages: [{ role: 'user', content: 'What is the weather?' }]
      });
      
      expect(weatherOutput.message.content).toBe('The weather is sunny today.');
      
      const timeOutput = await agent.process({
        messages: [{ role: 'user', content: 'What time is it?' }]
      });
      
      expect(timeOutput.message.content).toBe('The current time is 3:00 PM.');
    });

    it('should handle pattern matching case-insensitively', async () => {
      agent.addResponse('HELLO', 'Hi there!');
      
      const output = await agent.process({
        messages: [{ role: 'user', content: 'hello world' }]
      });
      
      expect(output.message.content).toBe('Hi there!');
    });
  });

  describe('Usage Tracking', () => {
    it('should track token usage', async () => {
      const output = await agent.process({
        messages: [
          { role: 'user', content: 'This is a test message' }
        ]
      });
      
      expect(output.usage).toBeDefined();
      expect(output.usage!.promptTokens).toBeGreaterThan(0);
      expect(output.usage!.completionTokens).toBeGreaterThan(0);
      expect(output.usage!.totalTokens).toBe(
        output.usage!.promptTokens + output.usage!.completionTokens
      );
    });
  });

  describe('Tool Detection', () => {
    it('should detect calculation requests', async () => {
      const output = await agent.process({
        messages: [{ role: 'user', content: 'Please calculate 42 plus 58' }]
      });
      
      expect(output.toolCalls).toBeDefined();
      expect(output.toolCalls).toHaveLength(1);
      expect(output.toolCalls![0].name).toBe('calculator');
      expect(output.toolCalls![0].arguments).toEqual({
        expression: '42 + 58'
      });
    });

    it('should detect search requests', async () => {
      const output = await agent.process({
        messages: [{ role: 'user', content: 'Can you search for TypeScript tutorials?' }]
      });
      
      expect(output.toolCalls).toBeDefined();
      expect(output.toolCalls).toHaveLength(1);
      expect(output.toolCalls![0].name).toBe('search');
      expect(output.toolCalls![0].arguments.query).toBe('TypeScript tutorials?');
    });

    it('should not detect tools in normal conversation', async () => {
      const output = await agent.process({
        messages: [{ role: 'user', content: 'Tell me a story' }]
      });
      
      expect(output.toolCalls).toBeUndefined();
    });
  });

  describe('Streaming', () => {
    it('should simulate streaming when enabled', async () => {
      await agent.terminate();
      await agent.initialize({
        streaming: true,
        simulateDelay: true,
        delayMs: 10
      });
      
      const chunks: string[] = [];
      
      await agent.process({
        messages: [{ role: 'user', content: 'Test' }],
        streamCallback: (chunk) => chunks.push(chunk)
      });
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain("I'm a mock agent");
    });

    it('should not stream when disabled', async () => {
      const chunks: string[] = [];
      
      await agent.process({
        messages: [{ role: 'user', content: 'Test' }],
        streamCallback: (chunk) => chunks.push(chunk)
      });
      
      expect(chunks.length).toBe(0);
    });
  });

  describe('Delay Simulation', () => {
    it('should simulate delay by default', async () => {
      const start = Date.now();
      
      await agent.process({
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should skip delay when disabled', async () => {
      await agent.terminate();
      await agent.initialize({
        simulateDelay: false
      });
      
      const start = Date.now();
      
      await agent.process({
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Metadata', () => {
    it('should include metadata in response', async () => {
      const output = await agent.process({
        messages: [{ role: 'user', content: 'Test' }]
      });
      
      expect(output.metadata).toBeDefined();
      expect(output.metadata!.model).toBe('mock-model');
      expect(output.metadata!.timestamp).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should accept response patterns in config', async () => {
      await agent.terminate();
      await agent.initialize({
        responses: {
          'hello': 'Hi there!',
          'goodbye': 'See you later!'
        }
      });
      
      const helloOutput = await agent.process({
        messages: [{ role: 'user', content: 'hello' }]
      });
      
      expect(helloOutput.message.content).toBe('Hi there!');
      
      const goodbyeOutput = await agent.process({
        messages: [{ role: 'user', content: 'goodbye' }]
      });
      
      expect(goodbyeOutput.message.content).toBe('See you later!');
    });
  });

  describe('Agent Capabilities', () => {
    it('should report correct capabilities', () => {
      const capabilities = agent.getCapabilities();
      
      expect(capabilities.maxContextLength).toBe(4096);
      expect(capabilities.supportedModels).toContain('mock-model');
      expect(capabilities.supportedModels).toContain('mock-model-large');
      expect(capabilities.tools).toBe(false); // No tools by default
      expect(capabilities.memory).toBe(false); // No memory by default
    });
  });
});