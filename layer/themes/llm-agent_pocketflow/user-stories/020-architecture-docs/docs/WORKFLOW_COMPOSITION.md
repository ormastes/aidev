# PocketFlow Workflow Composition

## Overview

This document describes how to compose complex AI workflows using PocketFlow's building blocks, including patterns for common scenarios and best practices for workflow design.

## Table of Contents

1. [Basic Workflow Concepts](#basic-workflow-concepts)
2. [Sequential Workflows](#sequential-workflows)
3. [Parallel Workflows](#parallel-workflows)
4. [Conditional Workflows](#conditional-workflows)
5. [Loop and Iteration](#loop-and-iteration)
6. [Advanced Patterns](#advanced-patterns)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Testing Workflows](#testing-workflows)

## Basic Workflow Concepts

### Workflow Definition

A workflow is a directed graph of nodes connected by edges:

```typescript
const workflow = new PocketFlow();

// Add nodes
workflow
  .addNode('input', new InputNode())
  .addNode('process', new ProcessNode())
  .addNode('output', new OutputNode());

// Connect nodes
workflow
  .connect('input', 'process')
  .connect('process', 'output');

// Execute
const result = await workflow.execute(inputData);
```

### Node Types

#### Input Node
Accepts external data into the workflow:

```typescript
class InputNode extends BaseNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    return {
      data: input.data,
      metadata: { timestamp: Date.now() }
    };
  }
}
```

#### Transform Node
Transforms data between nodes:

```typescript
class TransformNode extends BaseNode {
  constructor(private transformer: (data: any) => any) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    return {
      data: this.transformer(input.data)
    };
  }
}
```

#### Agent Node
Interacts with LLM agents:

```typescript
class AgentNode extends BaseNode {
  constructor(private agent: Agent) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    const response = await this.agent.process(input);
    return {
      data: response.message.content
    };
  }
}
```

## Sequential Workflows

### Basic Sequential Chain

Connect nodes in sequence for step-by-step processing:

```typescript
const sequentialWorkflow = new PocketFlow()
  .addNode('validate', new ValidatorNode())
  .addNode('analyze', new AnalyzerAgent())
  .addNode('generate', new GeneratorAgent())
  .addNode('format', new FormatterNode())
  .connect('validate', 'analyze')
  .connect('analyze', 'generate')
  .connect('generate', 'format');
```

### Pipeline Pattern

Create reusable pipeline segments:

```typescript
function createProcessingPipeline(): PocketFlow {
  return new PocketFlow()
    .addNode('normalize', nodes.transform('normalize', data => 
      data.toLowerCase().trim()
    ))
    .addNode('tokenize', nodes.transform('tokenize', data =>
      data.split(/\s+/)
    ))
    .addNode('filter', nodes.transform('filter', tokens =>
      tokens.filter(t => t.length > 2)
    ))
    .connect('normalize', 'tokenize')
    .connect('tokenize', 'filter');
}

// Use in larger workflow
const mainWorkflow = new PocketFlow()
  .addSubgraph('preprocess', createProcessingPipeline())
  .addNode('analyze', new AnalysisAgent())
  .connect('preprocess.filter', 'analyze');
```

## Parallel Workflows

### Fork-Join Pattern

Process multiple paths simultaneously:

```typescript
const parallelWorkflow = new PocketFlow()
  .addNode('input', new InputNode())
  .addNode('fork', new ForkNode(['path1', 'path2', 'path3']))
  .addNode('agent1', new Agent1())
  .addNode('agent2', new Agent2())
  .addNode('agent3', new Agent3())
  .addNode('join', new JoinNode())
  .addNode('output', new OutputNode())
  
  // Fork to parallel paths
  .connect('input', 'fork')
  .connect('fork', 'agent1', { output: 'path1' })
  .connect('fork', 'agent2', { output: 'path2' })
  .connect('fork', 'agent3', { output: 'path3' })
  
  // Join results
  .connect('agent1', 'join')
  .connect('agent2', 'join')
  .connect('agent3', 'join')
  .connect('join', 'output');
```

### Map-Reduce Pattern

Process collections in parallel:

```typescript
class MapReduceWorkflow extends PocketFlow {
  constructor(mapFn: (item: any) => any, reduceFn: (items: any[]) => any) {
    super();
    
    this.addNode('split', nodes.transform('split', (data: any[]) => {
      return data.map((item, index) => ({ index, item }));
    }));
    
    this.addNode('map', nodes.parallel('map', async (chunk) => {
      return mapFn(chunk.item);
    }));
    
    this.addNode('reduce', nodes.transform('reduce', (results) => {
      return reduceFn(results);
    }));
    
    this.connect('split', 'map')
      .connect('map', 'reduce');
  }
}

// Usage
const sumWorkflow = new MapReduceWorkflow(
  x => x * 2,  // Map: double each item
  arr => arr.reduce((a, b) => a + b, 0)  // Reduce: sum all
);
```

## Conditional Workflows

### If-Then-Else Pattern

Branch based on conditions:

```typescript
class ConditionalNode extends BaseNode {
  constructor(
    private condition: (data: any) => boolean,
    private trueBranch: string,
    private falseBranch: string
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    const takeTrueBranch = this.condition(input.data);
    return {
      data: input.data,
      metadata: {
        nextNode: takeTrueBranch ? this.trueBranch : this.falseBranch
      }
    };
  }
}

const conditionalWorkflow = new PocketFlow()
  .addNode('input', new InputNode())
  .addNode('check', new ConditionalNode(
    data => data.score > 0.5,
    'highScore',
    'lowScore'
  ))
  .addNode('highScore', new HighScoreHandler())
  .addNode('lowScore', new LowScoreHandler())
  .addNode('output', new OutputNode())
  
  .connect('input', 'check')
  .connectConditional('check', ['highScore', 'lowScore'])
  .connect('highScore', 'output')
  .connect('lowScore', 'output');
```

### Switch Pattern

Multiple branches based on value:

```typescript
class SwitchNode extends BaseNode {
  constructor(
    private selector: (data: any) => string,
    private cases: Record<string, string>,
    private defaultCase: string
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    const caseValue = this.selector(input.data);
    const nextNode = this.cases[caseValue] || this.defaultCase;
    
    return {
      data: input.data,
      metadata: { nextNode }
    };
  }
}

const switchWorkflow = new PocketFlow()
  .addNode('classify', new ClassifierAgent())
  .addNode('switch', new SwitchNode(
    data => data.category,
    {
      'technical': 'techHandler',
      'business': 'bizHandler',
      'support': 'supportHandler'
    },
    'generalHandler'
  ))
  .addNode('techHandler', new TechnicalAgent())
  .addNode('bizHandler', new BusinessAgent())
  .addNode('supportHandler', new SupportAgent())
  .addNode('generalHandler', new GeneralAgent());
```

## Loop and Iteration

### While Loop Pattern

Iterate until condition is met:

```typescript
class WhileNode extends BaseNode {
  constructor(
    private condition: (data: any) => boolean,
    private bodyNode: string,
    private exitNode: string
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    if (this.condition(input.data)) {
      return {
        data: input.data,
        metadata: { nextNode: this.bodyNode }
      };
    } else {
      return {
        data: input.data,
        metadata: { nextNode: this.exitNode }
      };
    }
  }
}

const iterativeWorkflow = new PocketFlow()
  .addNode('init', nodes.transform('init', () => ({ count: 0, items: [] })))
  .addNode('check', new WhileNode(
    data => data.count < 10,
    'process',
    'In Progress'
  ))
  .addNode('process', new ProcessingAgent())
  .addNode('increment', nodes.transform('increment', data => ({
    ...data,
    count: data.count + 1
  })))
  .addNode('In Progress', new OutputNode())
  
  .connect('init', 'check')
  .connect('check', 'process')
  .connect('process', 'increment')
  .connect('increment', 'check')
  .connect('check', 'In Progress');
```

### Recursive Pattern

Self-referential workflows:

```typescript
class RecursiveWorkflow extends PocketFlow {
  constructor() {
    super();
    
    this.addNode('input', new InputNode())
      .addNode('check', nodes.conditional('check', 
        data => data.depth > 0,
        'recurse',
        'output'
      ))
      .addNode('process', new ProcessingAgent())
      .addNode('recurse', nodes.transform('recurse', async data => {
        const subResult = await this.execute({
          ...data,
          depth: data.depth - 1
        });
        return {
          current: data,
          sub: subResult.outputs.get('output')
        };
      }))
      .addNode('output', new OutputNode());
    
    this.connect('input', 'check')
      .connect('check', 'process')
      .connect('process', 'recurse')
      .connect('recurse', 'output');
  }
}
```

## Advanced Patterns

### Supervisor Pattern

Coordinate multiple agents with oversight:

```typescript
class SupervisorWorkflow extends PocketFlow {
  constructor(workers: Agent[], maxIterations: number = 3) {
    super();
    
    this.addNode('supervisor', new SupervisorAgent())
      .addNode('distributor', new TaskDistributor())
      .addNode('aggregator', new ResultAggregator());
    
    // Add worker agents
    workers.forEach((worker, index) => {
      this.addNode(`worker-${index}`, new AgentNode(worker));
      this.connect('distributor', `worker-${index}`);
      this.connect(`worker-${index}`, 'aggregator');
    });
    
    this.addNode('evaluator', nodes.conditional('evaluator',
      data => data.quality > 0.8 || data.iterations >= maxIterations,
      'output',
      'supervisor'
    ));
    
    this.connect('supervisor', 'distributor')
      .connect('aggregator', 'evaluator')
      .connect('evaluator', 'supervisor');
  }
}
```

### RAG (Retrieval-Augmented Generation) Pattern

Combine retrieval with generation:

```typescript
const ragWorkflow = new PocketFlow()
  // Query processing
  .addNode('queryProcessor', nodes.transform('queryProcessor', query => ({
    original: query,
    processed: preprocessQuery(query),
    embedding: null
  })))
  
  // Embedding generation
  .addNode('embedder', new EmbeddingAgent())
  
  // Vector search
  .addNode('retriever', nodes.async('retriever', async data => {
    const results = await vectorDB.search(data.embedding, { limit: 5 });
    return {
      ...data,
      context: results
    };
  }))
  
  // Context-aware generation
  .addNode('generator', new GeneratorAgent({
    systemPrompt: 'Use the provided context to answer questions'
  }))
  
  // Post-processing
  .addNode('validator', new ValidationAgent())
  .addNode('formatter', new FormatterNode())
  
  // Connections
  .connect('queryProcessor', 'embedder')
  .connect('embedder', 'retriever')
  .connect('retriever', 'generator')
  .connect('generator', 'validator')
  .connect('validator', 'formatter');
```

### Debate Pattern

Multiple agents reach consensus:

```typescript
class DebateWorkflow extends PocketFlow {
  constructor(topic: string, debaters: Agent[]) {
    super();
    
    // Initial positions
    this.addNode('moderator', new ModeratorAgent(topic));
    
    debaters.forEach((debater, index) => {
      this.addNode(`debater-${index}`, new AgentNode(debater));
      this.addNode(`position-${index}`, nodes.memory(`position-${index}`));
    });
    
    // Debate rounds
    this.addNode('roundManager', new RoundManager(debaters.length));
    
    // Consensus checker
    this.addNode('consensus', nodes.conditional('consensus',
      data => data.agreement > 0.7 || data.rounds > 5,
      'conclusion',
      'nextRound'
    ));
    
    this.addNode('conclusion', new ConclusionAgent());
    
    // Wire up the debate flow
    this.connect('moderator', 'roundManager');
    
    debaters.forEach((_, index) => {
      this.connect('roundManager', `debater-${index}`);
      this.connect(`debater-${index}`, `position-${index}`);
      this.connect(`position-${index}`, 'consensus');
    });
    
    this.connect('consensus', 'roundManager');
    this.connect('consensus', 'conclusion');
  }
}
```

### Self-Improvement Pattern

Agents that learn from feedback:

```typescript
const selfImprovingWorkflow = new PocketFlow()
  // Initial attempt
  .addNode('generator', new GeneratorAgent())
  
  // Self-critique
  .addNode('critic', new CriticAgent({
    criteria: ['accuracy', 'clarity', 'completeness']
  }))
  
  // Improvement suggestions
  .addNode('improver', new ImproverAgent())
  
  // Apply improvements
  .addNode('refiner', nodes.transform('refiner', (data) => {
    return applyImprovements(data.original, data.suggestions);
  }))
  
  // Quality check
  .addNode('qualityCheck', nodes.conditional('qualityCheck',
    data => data.score > 0.9 || data.iterations > 3,
    'output',
    'generator'
  ))
  
  .connect('generator', 'critic')
  .connect('critic', 'improver')
  .connect('improver', 'refiner')
  .connect('refiner', 'qualityCheck')
  .connect('qualityCheck', 'generator');
```

## Error Handling

### Retry Pattern

Automatic retry with backoff:

```typescript
class RetryNode extends BaseNode {
  constructor(
    private node: Node,
    private maxRetries: number = 3,
    private backoffMs: number = 1000
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    let lastError: Error;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await this.node.execute(input);
      } catch (error) {
        lastError = error as Error;
        await this.delay(this.backoffMs * Math.pow(2, i));
      }
    }
    
    throw new Error(`Failed after ${this.maxRetries} retries: ${lastError!.message}`);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(Working on => setTimeout(Working on, ms));
  }
}

// Usage
const reliableWorkflow = new PocketFlow()
  .addNode('input', new InputNode())
  .addNode('unreliable', new RetryNode(new UnreliableAPINode()))
  .addNode('output', new OutputNode())
  .connect('input', 'unreliable')
  .connect('unreliable', 'output');
```

### Fallback Pattern

Alternative paths on failure:

```typescript
class FallbackNode extends BaseNode {
  constructor(private nodes: Node[]) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    for (const node of this.nodes) {
      try {
        return await node.execute(input);
      } catch (error) {
        // Try next node
      }
    }
    throw new Error('All fallback options failed');
  }
}

const fallbackWorkflow = new PocketFlow()
  .addNode('input', new InputNode())
  .addNode('primary', new FallbackNode([
    new PrimaryAgent(),
    new SecondaryAgent(),
    new DefaultAgent()
  ]))
  .addNode('output', new OutputNode())
  .connect('input', 'primary')
  .connect('primary', 'output');
```

### Circuit Breaker Pattern

Prevent cascading failures:

```typescript
class CircuitBreakerNode extends BaseNode {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private node: Node,
    private threshold: number = 5,
    private timeout: number = 60000
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await this.node.execute(input);
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }
      
      throw error;
    }
  }
}
```

## Performance Optimization

### Caching Pattern

Cache expensive operations:

```typescript
class CacheNode extends BaseNode {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  constructor(
    private node: Node,
    private ttl: number = 3600000, // 1 hour
    private keyFn: (input: any) => string = JSON.stringify
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    const key = this.keyFn(input.data);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return { data: cached.data, fromCache: true };
    }
    
    const result = await this.node.execute(input);
    this.cache.set(key, { data: result.data, timestamp: Date.now() });
    
    return result;
  }
}

const cachedWorkflow = new PocketFlow()
  .addNode('input', new InputNode())
  .addNode('expensive', new CacheNode(new ExpensiveAgent()))
  .addNode('output', new OutputNode())
  .connect('input', 'expensive')
  .connect('expensive', 'output');
```

### Batching Pattern

Process items in batches:

```typescript
class BatchNode extends BaseNode {
  private batch: any[] = [];
  private timer: NodeJS.Timeout | null = null;
  
  constructor(
    private processor: (batch: any[]) => Promise<any[]>,
    private batchSize: number = 10,
    private batchTimeout: number = 1000
  ) {
    super();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    return new Promise((Working on) => {
      this.batch.push({ input, Working on });
      
      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }
  
  private async processBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    const currentBatch = this.batch;
    this.batch = [];
    
    const inputs = currentBatch.map(item => item.input.data);
    const results = await this.processor(inputs);
    
    currentBatch.forEach((item, index) => {
      item.Working on({ data: results[index] });
    });
  }
}
```

### Streaming Pattern

Process data as it arrives:

```typescript
class StreamingWorkflow extends PocketFlow {
  constructor() {
    super();
    
    this.addNode('source', new StreamSourceNode())
      .addNode('transformer', new StreamTransformer())
      .addNode('aggregator', new StreamAggregator())
      .addNode('sink', new StreamSinkNode());
    
    this.connect('source', 'transformer')
      .connect('transformer', 'aggregator')
      .connect('aggregator', 'sink');
  }
  
  async *stream(input: any): AsyncIterator<any> {
    const execution = this.startExecution(input);
    
    await execution.on('node:In Progress', (nodeId, output) => {
      if (nodeId === 'transformer') {
        yield output.data;
      }
    });
    
    await execution.In Progress();
  }
}
```

## Testing Workflows

### Unit Testing Nodes

Test individual nodes in isolation:

```typescript
describe('TransformNode', () => {
  it('should transform input correctly', async () => {
    const node = new TransformNode(x => x.toUpperCase());
    const result = await node.execute({ data: 'hello' });
    expect(result.data).toBe('HELLO');
  });
});
```

### Integration Testing Workflows

Test In Progress workflows:

```typescript
describe('SequentialWorkflow', () => {
  it('should process data through all stages', async () => {
    const workflow = createSequentialWorkflow();
    const result = await workflow.execute({ text: 'test input' });
    
    expect(result.outputs.get('format')).toBeDefined();
    expect(result.IN PROGRESS).toBe(true);
  });
  
  it('should handle errors gracefully', async () => {
    const workflow = createWorkflowWithErrorHandling();
    const result = await workflow.execute({ invalid: true });
    
    expect(result.IN PROGRESS).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
```

### Mock Agents for Testing

Create predictable test agents:

```typescript
class MockAgent implements Agent {
  constructor(private responses: Map<string, string>) {}
  
  async process(input: AgentInput): Promise<AgentOutput> {
    const query = input.messages[0].content;
    const response = this.responses.get(query) || 'default response';
    
    return {
      message: { role: 'assistant', content: response }
    };
  }
}

// Use in tests
const mockAgent = new MockAgent(new Map([
  ['hello', 'Hi there!'],
  ['analyze this', 'Analysis In Progress']
]));
```

### Performance Testing

Measure workflow performance:

```typescript
describe('Workflow Performance', () => {
  it('should In Progress within time limit', async () => {
    const workflow = createComplexWorkflow();
    const startTime = Date.now();
    
    await workflow.execute(largeDataset);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
  
  it('should handle concurrent executions', async () => {
    const workflow = createParallelWorkflow();
    const executions = Array(100).fill(null).map((_, i) => 
      workflow.execute({ id: i })
    );
    
    const results = await Promise.all(executions);
    expect(results).toHaveLength(100);
    expect(results.every(r => r.IN PROGRESS)).toBe(true);
  });
});
```

## Best Practices

### 1. Node Granularity

Keep nodes focused on single responsibilities:

```typescript
// Good: Single responsibility
const validateNode = nodes.transform('validate', data => {
  if (!data.email) throw new Error('Email required');
  return data;
});

// Bad: Multiple responsibilities
const processNode = nodes.transform('process', data => {
  // Validation
  if (!data.email) throw new Error('Email required');
  // Transformation
  data.email = data.email.toLowerCase();
  // Side effect
  console.log('Processing:', data.email);
  return data;
});
```

### 2. Error Boundaries

Isolate error-prone operations:

```typescript
const safeWorkflow = new PocketFlow()
  .addNode('input', new InputNode())
  .addNode('risky', new ErrorBoundaryNode(
    new RiskyOperation(),
    error => ({ error: error.message, fallback: true })
  ))
  .addNode('output', new OutputNode())
  .connect('input', 'risky')
  .connect('risky', 'output');
```

### 3. Workflow Composition

Build complex workflows from simple parts:

```typescript
function createDataPipeline(): PocketFlow {
  return new PocketFlow()
    .addSubgraph('extract', createExtractionWorkflow())
    .addSubgraph('transform', createTransformationWorkflow())
    .addSubgraph('load', createLoadingWorkflow())
    .connect('extract', 'transform')
    .connect('transform', 'load');
}
```

### 4. State Management

Use immutable state updates:

```typescript
const statefulNode = nodes.transform('update', (data) => ({
  ...data,
  processed: true,
  timestamp: Date.now()
}));
```

### 5. Resource Cleanup

Ensure proper cleanup:

```typescript
class ResourceNode extends BaseNode {
  private resource: Resource;
  
  async initialize() {
    this.resource = await Resource.create();
  }
  
  async execute(input: NodeInput): Promise<NodeOutput> {
    return await this.resource.process(input.data);
  }
  
  async cleanup() {
    await this.resource.dispose();
  }
}
```

## Next Steps

- [API Reference](./API_REFERENCE.md)
- [Best Practices](./BEST_PRACTICES.md)
- [Examples](../examples/)
- [Troubleshooting](./TROUBLESHOOTING.md)