import { MockAgent } from '../../../016-agent-abstraction/src/mock-agent';
import {
  SequentialPattern,
  ParallelPattern,
  MapReducePattern,
  SupervisorPattern,
  RAGPattern,
  DebatePattern,
  ReflectionPattern
} from '../../src/patterns';

describe('Workflow Patterns', () => {
  let agents: MockAgent[];

  beforeEach(async () => {
    // Create mock agents
    agents = [
      new MockAgent(),
      new MockAgent(),
      new MockAgent()
    ];

    // Initialize agents
    for (const agent of agents) {
      await agent.initialize({});
    }
  });

  afterEach(async () => {
    for (const agent of agents) {
      await agent.terminate();
    }
  });

  describe('SequentialPattern', () => {
    it('should process agents in sequence', async () => {
      const pattern = new SequentialPattern();
      
      // Configure agent responses
      agents[0].addResponse('hello', 'First response');
      agents[1].addResponse('first', 'Second response');
      agents[2].addResponse('second', 'Final response');
      
      const result = await pattern.execute('Hello', agents);
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('sequential');
      expect(result.outputs.has('output')).toBe(true);
    });

    it('should pass full history when configured', async () => {
      const pattern = new SequentialPattern();
      
      const result = await pattern.execute('Test', agents, {
        passFullHistory: true
      });
      
      expect(result.success).toBe(true);
      const output = result.outputs.get('output');
      expect(Array.isArray(output)).toBe(true);
    });

    it('should validate minimum agents', () => {
      const pattern = new SequentialPattern();
      
      expect(() => pattern.validate([agents[0]])).toThrow('requires at least 2 agents');
    });
  });

  describe('ParallelPattern', () => {
    it('should process all agents in parallel', async () => {
      const pattern = new ParallelPattern();
      
      agents[0].setDefaultResponse('Response A');
      agents[1].setDefaultResponse('Response B');
      agents[2].setDefaultResponse('Response C');
      
      const result = await pattern.execute('Parallel test', agents);
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('parallel');
      
      const output = result.outputs.get('output');
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBe(3);
    });

    it('should merge object results', async () => {
      const pattern = new ParallelPattern();
      
      // Mock agents to return objects
      for (let i = 0; i < agents.length; i++) {
        agents[i].setDefaultResponse(JSON.stringify({ [`key${i}`]: `value${i}` }));
      }
      
      const result = await pattern.execute('Test', agents, {
        aggregationStrategy: 'merge'
      });
      
      expect(result.success).toBe(true);
    });

    it('should use custom aggregator', async () => {
      const pattern = new ParallelPattern();
      
      const customAggregator = (results: any[]) => {
        return results.map(r => r.message.content).join(' | ');
      };
      
      const result = await pattern.execute('Test', agents, {
        aggregationStrategy: 'custom',
        customAggregator
      });
      
      expect(result.success).toBe(true);
      expect(typeof result.outputs.get('output')).toBe('string');
      expect(result.outputs.get('output')).toContain(' | ');
    });
  });

  describe('MapReducePattern', () => {
    it('should distribute array items to agents', async () => {
      const pattern = new MapReducePattern();
      
      const items = [1, 2, 3, 4, 5];
      const result = await pattern.execute(items, agents.slice(0, 2));
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('map-reduce');
    });

    it('should apply map function', async () => {
      const pattern = new MapReducePattern();
      
      const items = [1, 2, 3];
      const result = await pattern.execute(items, [agents[0]], {
        mapFunction: (item: number) => item * 2,
        reduceFunction: (acc: number, _curr: any) => acc + 1,
        initialValue: 0
      });
      
      expect(result.success).toBe(true);
    });

    it('should require array input', async () => {
      const pattern = new MapReducePattern();
      
      const result = await pattern.execute('not an array', agents);
      
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('array input');
    });
  });

  describe('SupervisorPattern', () => {
    it('should have supervisor delegate to workers', async () => {
      const pattern = new SupervisorPattern();
      
      // First agent is supervisor
      agents[0].setDefaultResponse('Task 1: Do A\nTask 2: Do B');
      agents[1].setDefaultResponse('In Progress A');
      agents[2].setDefaultResponse('In Progress B');
      
      const result = await pattern.execute('Coordinate tasks', agents);
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('supervisor');
      
      const output = result.outputs.get('output');
      expect(output.finalResult).toBeDefined();
      expect(output.workerCount).toBe(2);
    });

    it('should support different routing strategies', async () => {
      const pattern = new SupervisorPattern();
      
      const result = await pattern.execute('Test', agents, {
        routingStrategy: 'capability-based'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('RAGPattern', () => {
    it('should retrieve then generate', async () => {
      const pattern = new RAGPattern();
      
      agents[0].addResponse('retrieve', 'Context: Paris is the capital of France.');
      agents[0].setDefaultResponse('Based on the context, the answer is Paris.');
      
      const result = await pattern.execute('What is the capital of France?', [agents[0]]);
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('rag');
      
      const output = result.outputs.get('output');
      expect(output.response).toContain('Paris');
      expect(output.contextUsed).toBe(true);
    });

    it('should support separate retriever and generator', async () => {
      const pattern = new RAGPattern();
      
      agents[0].setDefaultResponse('Retrieved: France info');
      agents[1].setDefaultResponse('Generated: Answer about France');
      
      const result = await pattern.execute('Question', agents.slice(0, 2));
      
      expect(result.success).toBe(true);
    });

    it('should handle reranking', async () => {
      const pattern = new RAGPattern();
      
      const result = await pattern.execute('Test query', [agents[0]], {
        reranking: true,
        contextLimit: 2
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('DebatePattern', () => {
    it('should run debate rounds', async () => {
      const pattern = new DebatePattern();
      
      // Set different positions for agents
      agents[0].setDefaultResponse('Position A: I believe X');
      agents[1].setDefaultResponse('Position B: I believe Y');
      
      const result = await pattern.execute('Should AI be regulated?', agents.slice(0, 2), {
        rounds: 2
      });
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('debate');
      
      const output = result.outputs.get('output');
      expect(output.rounds).toBe(2);
      expect(output.participants).toHaveLength(2);
      expect(output.consensus).toBeDefined();
    });

    it('should support moderator', async () => {
      const pattern = new DebatePattern();
      
      const moderator = new MockAgent();
      await moderator.initialize({});
      moderator.setDefaultResponse('Moderator summary: Both sides have merit.');
      
      const result = await pattern.execute('Topic', agents.slice(0, 2), {
        rounds: 1,
        moderatorAgent: moderator
      });
      
      expect(result.success).toBe(true);
      const output = result.outputs.get('output');
      expect(output.moderatorSummary).toBeDefined();
      
      await moderator.terminate();
    });

    it('should enforce max agents', () => {
      const pattern = new DebatePattern();
      const tooManyAgents = Array(6).fill(null).map(() => new MockAgent());
      
      expect(() => pattern.validate(tooManyAgents)).toThrow('maximum 5 agents');
    });
  });

  describe('ReflectionPattern', () => {
    it('should iterate and improve', async () => {
      const pattern = new ReflectionPattern();
      
      agents[0].setDefaultResponse('Initial output');
      agents[0].addResponse('improve', 'Improved output');
      
      const result = await pattern.execute('Write a paragraph', [agents[0]], {
        maxIterations: 2,
        improvementThreshold: 0.9
      });
      
      expect(result.success).toBe(true);
      expect(result.pattern).toBe('reflection');
      
      const output = result.outputs.get('output');
      expect(output.iterations).toBeGreaterThanOrEqual(1);
      expect(output.finalOutput).toBeDefined();
    });

    it('should support separate critic', async () => {
      const pattern = new ReflectionPattern();
      
      agents[0].setDefaultResponse('Generated content');
      agents[1].setDefaultResponse('Critique: Good but needs improvement. Score: 0.7');
      
      const result = await pattern.execute('Task', agents.slice(0, 2), {
        maxIterations: 1
      });
      
      expect(result.success).toBe(true);
      const output = result.outputs.get('output');
      expect(output.bestScore).toBeLessThanOrEqual(1);
    });

    it('should track improvement path', async () => {
      const pattern = new ReflectionPattern();
      
      const result = await pattern.execute('Test', [agents[0]], {
        maxIterations: 3,
        criteria: ['clarity', 'depth']
      });
      
      expect(result.success).toBe(true);
      const output = result.outputs.get('output');
      expect(output.improvementPath).toBeDefined();
      expect(Array.isArray(output.history)).toBe(true);
    });
  });
});