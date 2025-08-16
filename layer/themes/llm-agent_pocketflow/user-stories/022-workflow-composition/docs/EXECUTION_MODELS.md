# PocketFlow Execution Models

## Overview

This document describes the different execution models available in PocketFlow, helping you choose the right approach for your workflow requirements.

## Table of Contents

1. [Synchronous Execution](#synchronous-execution)
2. [Asynchronous Execution](#asynchronous-execution)
3. [Event-Driven Execution](#event-driven-execution)
4. [Streaming Execution](#streaming-execution)
5. [Batch Execution](#batch-execution)
6. [Real-Time Execution](#real-time-execution)
7. [Hybrid Execution](#hybrid-execution)

## Synchronous Execution

### Sequential Processing

Traditional step-by-step execution where each node waits for the previous one:

```typescript
const syncWorkflow = new PocketFlow()
  .addNode('input', nodes.input('data'))
  .addNode('step1', new ProcessingAgent())
  .addNode('step2', new AnalysisAgent())
  .addNode('step3', new GenerationAgent())
  .addNode('output', nodes.output('result'))
  
  .connect('input', 'step1')
  .connect('step1', 'step2')
  .connect('step2', 'step3')
  .connect('step3', 'output');

// Execute synchronously
const result = await syncWorkflow.execute(inputData);
```

### Blocking Operations

When you need guaranteed order and completion:

```typescript
class SynchronousWorkflow extends PocketFlow {
  async execute(input: any): Promise<any> {
    const step1Result = await this.executeNode('step1', input);
    const step2Result = await this.executeNode('step2', step1Result);
    const step3Result = await this.executeNode('step3', step2Result);
    
    return step3Result;
  }
}
```

### Use Cases

- **Data validation chains**: Where each step depends on the previous
- **Financial transactions**: Requiring strict ordering
- **Configuration workflows**: Where order matters
- **Simple linear processing**: When parallelization isn't needed

## Asynchronous Execution

### Parallel Node Execution

Execute independent nodes simultaneously:

```typescript
const asyncWorkflow = new PocketFlow()
  .addNode('input', nodes.input('data'))
  .addNode('fork', nodes.fork(['analysis', 'summary', 'keywords']))
  
  // These run in parallel
  .addNode('analysis', new AnalysisAgent())
  .addNode('summary', new SummaryAgent())
  .addNode('keywords', new KeywordAgent())
  
  .addNode('join', nodes.join())
  .addNode('output', nodes.output('result'))
  
  .connect('input', 'fork')
  .connect('fork', 'analysis')
  .connect('fork', 'summary')
  .connect('fork', 'keywords')
  .connect('analysis', 'join')
  .connect('summary', 'join')
  .connect('keywords', 'join')
  .connect('join', 'output');

// Execute with parallelism
const result = await asyncWorkflow.execute(inputData);
```

### Concurrent Processing

Control concurrency levels:

```typescript
const concurrentWorkflow = new PocketFlow({
  maxConcurrency: 5,
  executionMode: 'async'
});

// Process multiple items concurrently
const processMultiple = async (items: any[]) => {
  const results = await Promise.all(
    items.map(item => concurrentWorkflow.execute(item))
  );
  return results;
};
```

### Non-Blocking Operations

Use async/await for non-blocking execution:

```typescript
class AsyncWorkflow extends PocketFlow {
  async processAsync(input: any): Promise<any> {
    // Start all operations
    const task1 = this.executeNode('task1', input);
    const task2 = this.executeNode('task2', input);
    const task3 = this.executeNode('task3', input);
    
    // Wait for all to In Progress
    const [result1, result2, result3] = await Promise.all([
      task1, task2, task3
    ]);
    
    return { result1, result2, result3 };
  }
}
```

## Event-Driven Execution

### Event-Based Workflows

React to events and trigger appropriate processing:

```typescript
const eventDrivenWorkflow = new PocketFlow()
  .addNode('listener', nodes.eventListener('userActions'))
  .addNode('router', nodes.eventRouter({
    'user.signup': 'handleSignup',
    'user.login': 'handleLogin',
    'user.logout': 'handleLogout'
  }))
  .addNode('handleSignup', new SignupAgent())
  .addNode('handleLogin', new LoginAgent())
  .addNode('handleLogout', new LogoutAgent())
  .addNode('output', nodes.output('response'))
  
  .connect('listener', 'router')
  .connect('router', 'handleSignup')
  .connect('router', 'handleLogin')
  .connect('router', 'handleLogout')
  .connect('handleSignup', 'output')
  .connect('handleLogin', 'output')
  .connect('handleLogout', 'output');

// Start event listening
eventDrivenWorkflow.startEventListening();
```

### Message-Driven Processing

Process messages from queues or streams:

```typescript
const messageDrivenWorkflow = new PocketFlow()
  .addNode('queue', nodes.messageQueue('tasks'))
  .addNode('process', nodes.messageProcessor(async (message) => {
    const agent = new TaskAgent();
    return await agent.process(message.data);
  }))
  .addNode('ack', nodes.messageAck())
  
  .connect('queue', 'process')
  .connect('process', 'ack');

// Start message processing
messageDrivenWorkflow.startMessageProcessing();
```

### Reactive Patterns

Respond to state changes:

```typescript
const reactiveWorkflow = new PocketFlow()
  .addNode('state', nodes.stateManager())
  .addNode('watcher', nodes.stateWatcher({
    onChange: (oldState, newState) => {
      if (newState.status === 'processing') {
        return 'startProcessing';
      } else if (newState.status === 'In Progress') {
        return 'sendNotification';
      }
    }
  }))
  .addNode('startProcessing', new ProcessingAgent())
  .addNode('sendNotification', new NotificationAgent())
  
  .connect('state', 'watcher')
  .connect('watcher', 'startProcessing')
  .connect('watcher', 'sendNotification');
```

## Streaming Execution

### Real-Time Data Processing

Process data as it arrives:

```typescript
const streamingWorkflow = new PocketFlow()
  .addNode('input', nodes.streamInput('dataStream'))
  .addNode('transform', nodes.streamTransform((chunk) => {
    // Process each chunk
    return processChunk(chunk);
  }))
  .addNode('aggregate', nodes.streamAggregate({
    windowSize: 100,
    aggregator: (chunks) => combineChunks(chunks)
  }))
  .addNode('output', nodes.streamOutput('processedStream'))
  
  .connect('input', 'transform')
  .connect('transform', 'aggregate')
  .connect('aggregate', 'output');

// Start streaming
for await (const result of streamingWorkflow.stream(inputStream)) {
  console.log('Processed:', result);
}
```

### Windowed Processing

Process data in time or size windows:

```typescript
const windowedWorkflow = new PocketFlow()
  .addNode('input', nodes.streamInput('events'))
  .addNode('window', nodes.window({
    type: 'time',
    size: 60000, // 1 minute
    slide: 30000  // 30 seconds
  }))
  .addNode('process', nodes.streamProcess(async (window) => {
    const agent = new AnalyticsAgent();
    return await agent.analyzeWindow(window);
  }))
  .addNode('output', nodes.streamOutput('analytics'))
  
  .connect('input', 'window')
  .connect('window', 'process')
  .connect('process', 'output');
```

### Backpressure Handling

Manage flow control:

```typescript
const backpressureWorkflow = new PocketFlow()
  .addNode('input', nodes.streamInput('fastData'))
  .addNode('buffer', nodes.buffer({
    maxSize: 1000,
    strategy: 'dropOldest'
  }))
  .addNode('throttle', nodes.throttle({
    rate: 10, // items per second
    burst: 50
  }))
  .addNode('process', new SlowProcessingAgent())
  .addNode('output', nodes.streamOutput('processedData'))
  
  .connect('input', 'buffer')
  .connect('buffer', 'throttle')
  .connect('throttle', 'process')
  .connect('process', 'output');
```

## Batch Execution

### Batch Processing

Process multiple items together:

```typescript
const batchWorkflow = new PocketFlow()
  .addNode('input', nodes.batchInput({
    batchSize: 100,
    timeoutMs: 5000
  }))
  .addNode('process', nodes.batchProcess(async (batch) => {
    const agent = new BatchAgent();
    return await agent.processBatch(batch);
  }))
  .addNode('output', nodes.batchOutput())
  
  .connect('input', 'process')
  .connect('process', 'output');

// Process items in batches
const results = await batchWorkflow.processBatch(items);
```

### Scheduled Execution

Run workflows on a schedule:

```typescript
const scheduledWorkflow = new PocketFlow()
  .addNode('trigger', nodes.scheduler({
    cron: '0 0 * * *', // Daily at midnight
    timezone: 'UTC'
  }))
  .addNode('fetch', new DataFetchAgent())
  .addNode('process', new AnalysisAgent())
  .addNode('store', new StorageAgent())
  .addNode('notify', new NotificationAgent())
  
  .connect('trigger', 'fetch')
  .connect('fetch', 'process')
  .connect('process', 'store')
  .connect('store', 'notify');

// Start scheduler
scheduledWorkflow.startScheduler();
```

### Bulk Operations

Optimize for large datasets:

```typescript
const bulkWorkflow = new PocketFlow()
  .addNode('input', nodes.bulkInput('largeDataset'))
  .addNode('partition', nodes.partition({
    partitionSize: 10000,
    partitionBy: (item) => item.category
  }))
  .addNode('process', nodes.bulkProcess({
    maxConcurrency: 10,
    processor: new BulkProcessingAgent()
  }))
  .addNode('merge', nodes.merge())
  .addNode('output', nodes.bulkOutput())
  
  .connect('input', 'partition')
  .connect('partition', 'process')
  .connect('process', 'merge')
  .connect('merge', 'output');
```

## Real-Time Execution

### Low-Latency Processing

Minimize processing time:

```typescript
const realTimeWorkflow = new PocketFlow({
  executionMode: 'realtime',
  maxLatency: 100, // 100ms max
  priority: 'high'
})
  .addNode('input', nodes.realtimeInput())
  .addNode('process', nodes.realtimeProcess({
    timeout: 50,
    fallback: 'fastFallback'
  }))
  .addNode('fastFallback', new FastFallbackAgent())
  .addNode('output', nodes.realtimeOutput())
  
  .connect('input', 'process')
  .connect('process', 'output')
  .connect('process', 'fastFallback');
```

### Hot Path Optimization

Optimize critical execution paths:

```typescript
const hotPathWorkflow = new PocketFlow()
  .addNode('input', nodes.input('request'))
  .addNode('hotPath', nodes.hotPath({
    condition: (data) => data.priority === 'high',
    hotNode: 'fastProcess',
    coldNode: 'normalProcess'
  }))
  .addNode('fastProcess', new OptimizedAgent({
    cache: true,
    timeout: 100
  }))
  .addNode('normalProcess', new StandardAgent())
  .addNode('output', nodes.output('response'))
  
  .connect('input', 'hotPath')
  .connect('hotPath', 'fastProcess')
  .connect('hotPath', 'normalProcess')
  .connect('fastProcess', 'output')
  .connect('normalProcess', 'output');
```

## Hybrid Execution

### Mixed Execution Models

Combine different execution models:

```typescript
const hybridWorkflow = new PocketFlow()
  // Synchronous preprocessing
  .addNode('validate', nodes.sync(new ValidationAgent()))
  .addNode('normalize', nodes.sync(new NormalizationAgent()))
  
  // Asynchronous parallel processing
  .addNode('fork', nodes.async(nodes.fork(['analysis', 'summary'])))
  .addNode('analysis', nodes.async(new AnalysisAgent()))
  .addNode('summary', nodes.async(new SummaryAgent()))
  
  // Event-driven notification
  .addNode('notify', nodes.event(new NotificationAgent()))
  
  // Streaming output
  .addNode('stream', nodes.stream(nodes.output('results')))
  
  .connect('validate', 'normalize')
  .connect('normalize', 'fork')
  .connect('fork', 'analysis')
  .connect('fork', 'summary')
  .connect('analysis', 'notify')
  .connect('summary', 'notify')
  .connect('notify', 'stream');
```

### Adaptive Execution

Adjust execution model based on conditions:

```typescript
const adaptiveWorkflow = new PocketFlow()
  .addNode('input', nodes.input('request'))
  .addNode('adapter', nodes.adaptive({
    conditions: [
      {
        when: (data) => data.priority === 'urgent',
        use: 'realtimeExecution'
      },
      {
        when: (data) => data.size > 1000,
        use: 'batchExecution'
      },
      {
        when: (data) => data.streaming,
        use: 'streamingExecution'
      }
    ],
    default: 'syncExecution'
  }))
  .addNode('realtimeExecution', new RealtimeProcessor())
  .addNode('batchExecution', new BatchProcessor())
  .addNode('streamingExecution', new StreamProcessor())
  .addNode('syncExecution', new SyncProcessor())
  .addNode('output', nodes.output('result'))
  
  .connect('input', 'adapter')
  .connect('adapter', 'realtimeExecution')
  .connect('adapter', 'batchExecution')
  .connect('adapter', 'streamingExecution')
  .connect('adapter', 'syncExecution')
  .connect('realtimeExecution', 'output')
  .connect('batchExecution', 'output')
  .connect('streamingExecution', 'output')
  .connect('syncExecution', 'output');
```

## Performance Considerations

### Execution Model Selection

Choose the right model for your use case:

| Model | Use Case | Pros | Cons |
|-------|----------|------|------|
| Synchronous | Simple workflows | Predictable, easy to debug | Limited throughput |
| Asynchronous | Independent operations | High throughput | Complex error handling |
| Event-Driven | Reactive systems | Scalable, decoupled | Complex debugging |
| Streaming | Real-time data | Low latency | Memory management |
| Batch | Large datasets | Efficient resource usage | Higher latency |
| Real-Time | Critical applications | Consistent performance | Resource intensive |

### Monitoring and Metrics

Track execution performance:

```typescript
const monitoredWorkflow = new PocketFlow()
  .addNode('input', nodes.input('data'))
  .addNode('monitor', nodes.monitor({
    metrics: ['latency', 'throughput', 'errors'],
    alerts: {
      latency: { threshold: 1000, action: 'alert' },
      errors: { threshold: 0.1, action: 'fallback' }
    }
  }))
  .addNode('process', new ProcessingAgent())
  .addNode('output', nodes.output('result'))
  
  .connect('input', 'monitor')
  .connect('monitor', 'process')
  .connect('process', 'output');
```

## Best Practices

### 1. Choose the Right Model

```typescript
// For simple, ordered operations
const simple = new SynchronousWorkflow();

// For independent parallel operations
const parallel = new AsynchronousWorkflow();

// For reactive, event-based systems
const reactive = new EventDrivenWorkflow();

// For continuous data processing
const streaming = new StreamingWorkflow();
```

### 2. Handle Errors Appropriately

```typescript
// Different error handling for different models
const robustWorkflow = new PocketFlow()
  .addNode('sync', nodes.sync(new ProcessingAgent(), {
    errorHandler: 'retry'
  }))
  .addNode('async', nodes.async(new ProcessingAgent(), {
    errorHandler: 'fallback'
  }))
  .addNode('stream', nodes.stream(new ProcessingAgent(), {
    errorHandler: 'skip'
  }));
```

### 3. Optimize Resource Usage

```typescript
// Resource-aware execution
const optimizedWorkflow = new PocketFlow({
  resourceLimits: {
    memory: '1GB',
    cpu: '2 cores',
    connections: 100
  },
  executionMode: 'adaptive'
});
```

## Next Steps

- [Advanced Techniques](./ADVANCED_TECHNIQUES.md)
- [Best Practices](./BEST_PRACTICES.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)