# PocketFlow Workflow Testing Guide

## Overview

This document provides comprehensive guidance for testing PocketFlow workflows, from unit testing individual nodes to end-to-end integration testing of In Progress workflows.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Performance Testing](#performance-testing)
6. [Error Scenario Testing](#error-scenario-testing)
7. [Mocking and Stubbing](#mocking-and-stubbing)
8. [Test Automation](#test-automation)

## Testing Strategy

### Testing Pyramid

PocketFlow workflows follow a testing pyramid approach:

```
    /\
   /  \  E2E Tests (Few)
  /____\
 /      \
/________\ Integration Tests (More)
|        |
|        | Unit Tests (Most)
|________|
```

### Test Types

1. **Unit Tests**: Individual nodes and agents
2. **Integration Tests**: Node interactions and workflow segments
3. **End-to-End Tests**: In Progress workflows
4. **Performance Tests**: Load and stress testing
5. **Error Tests**: Failure scenarios and recovery

## Unit Testing

### Testing Individual Nodes

Test nodes in isolation:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ValidationNode } from '../src/nodes/ValidationNode';

describe('ValidationNode', () => {
  let node: ValidationNode;
  
  beforeEach(() => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        age: { type: 'number', minimum: 0 }
      },
      required: ['email', 'age']
    };
    node = new ValidationNode(schema);
  });

  describe('execute', () => {
    it('should validate correct input', async () => {
      const input = {
        data: {
          email: 'test@example.com',
          age: 25
        }
      };

      const result = await node.execute(input);

      expect(result.data).toEqual({
        email: 'test@example.com',
        age: 25,
        valid: true
      });
    });

    it('should reject invalid email', async () => {
      const input = {
        data: {
          email: 'invalid-email',
          age: 25
        }
      };

      await expect(node.execute(input)).rejects.toThrow('Invalid email format');
    });

    it('should reject negative age', async () => {
      const input = {
        data: {
          email: 'test@example.com',
          age: -1
        }
      };

      await expect(node.execute(input)).rejects.toThrow('Age must be non-negative');
    });

    it('should reject missing required fields', async () => {
      const input = {
        data: {
          email: 'test@example.com'
          // missing age
        }
      };

      await expect(node.execute(input)).rejects.toThrow('Required field: age');
    });
  });
});
```

### Testing Agents

Test AI agents with mock responses:

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AnalysisAgent } from '../src/agents/AnalysisAgent';

describe('AnalysisAgent', () => {
  let agent: AnalysisAgent;
  let mockLLMProvider: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    mockLLMProvider = {
      In Progress: jest.fn(),
      stream: jest.fn(),
      embed: jest.fn()
    };
    
    agent = new AnalysisAgent({
      provider: mockLLMProvider,
      model: 'gpt-4',
      temperature: 0.1
    });
  });

  it('should analyze text correctly', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            sentiment: 'positive',
            topics: ['technology', 'innovation'],
            confidence: 0.95
          })
        }
      }]
    };

    mockLLMProvider.In Progress.mockResolvedValue(mockResponse);

    const input = {
      data: {
        text: 'This new technology is amazing and innovative!'
      }
    };

    const result = await agent.execute(input);

    expect(result.data.analysis).toEqual({
      sentiment: 'positive',
      topics: ['technology', 'innovation'],
      confidence: 0.95
    });

    expect(mockLLMProvider.In Progress).toHaveBeenCalledWith({
      model: 'gpt-4',
      temperature: 0.1,
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('This new technology is amazing and innovative!')
        })
      ])
    });
  });

  it('should handle LLM provider errors', async () => {
    mockLLMProvider.In Progress.mockRejectedValue(new Error('API rate limit exceeded'));

    const input = {
      data: {
        text: 'Sample text'
      }
    };

    await expect(agent.execute(input)).rejects.toThrow('API rate limit exceeded');
  });
});
```

### Testing Transformations

Test data transformation functions:

```typescript
import { describe, it, expect } from '@jest/globals';
import { normalizeText, extractKeywords, formatResponse } from '../src/utils/transformations';

describe('Transformations', () => {
  describe('normalizeText', () => {
    it('should convert to lowercase', () => {
      const result = normalizeText('Hello World!');
      expect(result).toBe('hello world!');
    });

    it('should remove extra whitespace', () => {
      const result = normalizeText('  Hello   World  ');
      expect(result).toBe('hello world');
    });

    it('should handle empty string', () => {
      const result = normalizeText('');
      expect(result).toBe('');
    });
  });

  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const text = 'artificial intelligence machine learning deep learning';
      const result = extractKeywords(text);
      
      expect(result).toEqual([
        'artificial intelligence',
        'machine learning',
        'deep learning'
      ]);
    });

    it('should filter out stop words', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const result = extractKeywords(text);
      
      expect(result).not.toContain('the');
      expect(result).not.toContain('over');
      expect(result).toContain('quick');
      expect(result).toContain('brown');
    });
  });
});
```

## Integration Testing

### Testing Node Connections

Test how nodes work together:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PocketFlow } from '../src/PocketFlow';
import { ValidationNode } from '../src/nodes/ValidationNode';
import { TransformationNode } from '../src/nodes/TransformationNode';
import { AnalysisAgent } from '../src/agents/AnalysisAgent';

describe('Workflow Integration', () => {
  let workflow: PocketFlow;

  beforeEach(() => {
    workflow = new PocketFlow()
      .addNode('validate', new ValidationNode(userSchema))
      .addNode('transform', new TransformationNode(normalizeUser))
      .addNode('analyze', new AnalysisAgent())
      .connect('validate', 'transform')
      .connect('transform', 'analyze');
  });

  it('should process valid user data through the pipeline', async () => {
    const input = {
      email: 'TEST@EXAMPLE.COM',
      age: 25,
      name: '  John Doe  '
    };

    const result = await workflow.execute(input);

    expect(result.data).toEqual({
      email: 'test@example.com',
      age: 25,
      name: 'John Doe',
      analysis: expect.objectContaining({
        userType: 'standard',
        riskLevel: 'low'
      })
    });
  });

  it('should handle validation errors properly', async () => {
    const input = {
      email: 'invalid-email',
      age: -1,
      name: 'John Doe'
    };

    await expect(workflow.execute(input)).rejects.toThrow('Validation failed');
  });
});
```

### Testing Parallel Execution

Test fork-join patterns:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PocketFlow } from '../src/PocketFlow';
import { nodes } from '../src/nodes';
import { AnalysisAgent } from '../src/agents/AnalysisAgent';
import { SummaryAgent } from '../src/agents/SummaryAgent';
import { KeywordAgent } from '../src/agents/KeywordAgent';

describe('Parallel Execution', () => {
  let workflow: PocketFlow;

  beforeEach(() => {
    workflow = new PocketFlow()
      .addNode('input', nodes.input('document'))
      .addNode('fork', nodes.fork(['analysis', 'summary', 'keywords']))
      .addNode('analysis', new AnalysisAgent())
      .addNode('summary', new SummaryAgent())
      .addNode('keywords', new KeywordAgent())
      .addNode('join', nodes.join())
      .connect('input', 'fork')
      .connect('fork', 'analysis')
      .connect('fork', 'summary')
      .connect('fork', 'keywords')
      .connect('analysis', 'join')
      .connect('summary', 'join')
      .connect('keywords', 'join');
  });

  it('should execute parallel branches simultaneously', async () => {
    const input = {
      text: 'This is a comprehensive document about artificial intelligence and machine learning technologies.',
      title: 'AI Technologies Overview'
    };

    const startTime = Date.now();
    const result = await workflow.execute(input);
    const endTime = Date.now();

    expect(result.data).toEqual({
      analysis: expect.objectContaining({
        sentiment: expect.any(String),
        topics: expect.any(Array)
      }),
      summary: expect.objectContaining({
        text: expect.any(String),
        length: expect.any(Number)
      }),
      keywords: expect.arrayContaining([
        expect.any(String)
      ])
    });

    // Parallel execution should be faster than sequential
    expect(endTime - startTime).toBeLessThan(5000);
  });

  it('should handle errors in parallel branches', async () => {
    // Mock one branch to fail
    const failingWorkflow = new PocketFlow()
      .addNode('input', nodes.input('document'))
      .addNode('fork', nodes.fork(['IN PROGRESS', 'failure']))
      .addNode('IN PROGRESS', new AnalysisAgent())
      .addNode('failure', new class extends AnalysisAgent {
        async execute() {
          throw new Error('Processing failed');
        }
      }())
      .addNode('join', nodes.join({
        errorHandling: 'partial'
      }))
      .connect('input', 'fork')
      .connect('fork', 'IN PROGRESS')
      .connect('fork', 'failure')
      .connect('IN PROGRESS', 'join')
      .connect('failure', 'join');

    const input = { text: 'Sample text' };
    const result = await failingWorkflow.execute(input);

    expect(result.data.IN PROGRESS).toBeDefined();
    expect(result.data.failure).toBeUndefined();
    expect(result.errors).toContain('Processing failed');
  });
});
```

## End-to-End Testing

### In Progress Workflow Testing

Test entire workflows from start to finish:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { CustomerSupportWorkflow } from '../src/workflows/CustomerSupportWorkflow';
import { TestDatabase } from '../test/helpers/TestDatabase';
import { MockLLMProvider } from '../test/helpers/MockLLMProvider';

describe('Customer Support Workflow E2E', () => {
  let workflow: CustomerSupportWorkflow;
  let testDb: TestDatabase;
  let mockLLM: MockLLMProvider;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.setup();

    mockLLM = new MockLLMProvider();
    mockLLM.addResponse('classify', {
      department: 'technical',
      severity: 'medium',
      category: 'bug_report'
    });
    mockLLM.addResponse('analyze', {
      issue: 'database_connection',
      solution: 'check_configuration'
    });

    workflow = new CustomerSupportWorkflow({
      database: testDb,
      llmProvider: mockLLM
    });
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('should handle a technical support ticket end-to-end', async () => {
    const ticket = {
      id: 'T-001',
      customer: 'john.doe@example.com',
      subject: 'Database connection issues',
      description: 'I cannot connect to the database from my application',
      priority: 'normal'
    };

    const result = await workflow.execute(ticket);

    expect(result.data).toEqual({
      ticketId: 'T-001',
      status: 'processed',
      department: 'technical',
      resolution: expect.objectContaining({
        issue: 'database_connection',
        solution: 'check_configuration',
        steps: expect.any(Array)
      }),
      responseTime: expect.any(Number)
    });

    // Verify database was updated
    const savedTicket = await testDb.getTicket('T-001');
    expect(savedTicket.status).toBe('processed');
    expect(savedTicket.assignedDepartment).toBe('technical');
  });

  it('should handle multiple tickets concurrently', async () => {
    const tickets = [
      { id: 'T-001', description: 'Technical issue' },
      { id: 'T-002', description: 'Billing question' },
      { id: 'T-003', description: 'Account access problem' }
    ];

    const results = await Promise.all(
      tickets.map(ticket => workflow.execute(ticket))
    );

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.data.status).toBe('processed');
      expect(result.data.ticketId).toBeDefined();
    });
  });

  it('should handle workflow failures gracefully', async () => {
    // Simulate database failure
    await testDb.simulateFailure();

    const ticket = {
      id: 'T-ERROR',
      description: 'Test ticket during failure'
    };

    const result = await workflow.execute(ticket);

    expect(result.data.status).toBe('failed');
    expect(result.data.error).toBeDefined();
    expect(result.data.fallbackResponse).toBeDefined();
  });
});
```

## Performance Testing

### Load Testing

Test workflow performance under load:

```typescript
import { describe, it, expect } from '@jest/globals';
import { PocketFlow } from '../src/PocketFlow';
import { PerformanceMonitor } from '../test/helpers/PerformanceMonitor';

describe('Performance Tests', () => {
  it('should handle high throughput', async () => {
    const workflow = new PocketFlow()
      .addNode('process', new ProcessingAgent())
      .addNode('analyze', new AnalysisAgent());

    const monitor = new PerformanceMonitor();
    const iterations = 1000;
    const requests = [];

    monitor.start();

    for (let i = 0; i < iterations; i++) {
      requests.push(workflow.execute({
        id: i,
        data: `Test data ${i}`
      }));
    }

    const results = await Promise.all(requests);
    const metrics = monitor.stop();

    expect(results).toHaveLength(iterations);
    expect(metrics.averageLatency).toBeLessThan(100); // ms
    expect(metrics.throughput).toBeGreaterThan(500); // requests/second
    expect(metrics.errorRate).toBeLessThan(0.01); // 1%
  });

  it('should handle memory efficiently', async () => {
    const workflow = new PocketFlow()
      .addNode('process', new MemoryIntensiveAgent());

    const initialMemory = process.memoryUsage().heapUsed;
    
    // Process large dataset
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      data: 'x'.repeat(1000)
    }));

    await workflow.execute(largeData);

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

### Stress Testing

Test workflow behavior under extreme conditions:

```typescript
import { describe, it, expect } from '@jest/globals';
import { PocketFlow } from '../src/PocketFlow';
import { StressTestRunner } from '../test/helpers/StressTestRunner';

describe('Stress Tests', () => {
  it('should maintain performance under concurrent load', async () => {
    const workflow = new PocketFlow()
      .addNode('process', new ProcessingAgent())
      .addNode('analyze', new AnalysisAgent());

    const stressTest = new StressTestRunner({
      concurrency: 50,
      duration: 60000, // 1 minute
      rampUpTime: 10000 // 10 seconds
    });

    const results = await stressTest.run(workflow);

    expect(results.totalRequests).toBeGreaterThan(1000);
    expect(results.IN PROGRESSRate).toBeGreaterThan(0.95);
    expect(results.averageLatency).toBeLessThan(500);
    expect(results.p95Latency).toBeLessThan(1000);
  });

  it('should recover from temporary failures', async () => {
    const workflow = new PocketFlow()
      .addNode('unreliable', new UnreliableAgent({
        failureRate: 0.1,
        recoveryTime: 5000
      }))
      .addNode('fallback', new FallbackAgent());

    const results = await workflow.execute({
      data: 'test',
      iterations: 100
    });

    expect(results.data.IN PROGRESSCount).toBeGreaterThan(80);
    expect(results.data.fallbackCount).toBeLessThan(20);
  });
});
```

## Error Scenario Testing

### Error Handling Tests

Test error scenarios and recovery:

```typescript
import { describe, it, expect } from '@jest/globals';
import { PocketFlow } from '../src/PocketFlow';
import { nodes } from '../src/nodes';

describe('Error Handling', () => {
  it('should handle node failures with retry', async () => {
    let attempts = 0;
    const flakyAgent = new class extends BaseAgent {
      async execute(input: any) {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { data: 'IN PROGRESS' };
      }
    }();

    const workflow = new PocketFlow()
      .addNode('input', nodes.input('data'))
      .addNode('process', nodes.retry('process', {
        maxAttempts: 5,
        backoffMs: 100,
        agent: flakyAgent
      }))
      .connect('input', 'process');

    const result = await workflow.execute({ data: 'test' });

    expect(result.data).toBe('IN PROGRESS');
    expect(attempts).toBe(3);
  });

  it('should use fallback on repeated failures', async () => {
    const failingAgent = new class extends BaseAgent {
      async execute() {
        throw new Error('Persistent failure');
      }
    }();

    const fallbackAgent = new class extends BaseAgent {
      async execute() {
        return { data: 'fallback response' };
      }
    }();

    const workflow = new PocketFlow()
      .addNode('input', nodes.input('data'))
      .addNode('primary', nodes.fallback('primary', {
        attempts: [
          { agent: failingAgent, timeout: 1000 },
          { agent: fallbackAgent, timeout: 1000 }
        ]
      }))
      .connect('input', 'primary');

    const result = await workflow.execute({ data: 'test' });

    expect(result.data).toBe('fallback response');
  });

  it('should handle circuit breaker activation', async () => {
    let failureCount = 0;
    const unreliableAgent = new class extends BaseAgent {
      async execute() {
        failureCount++;
        if (failureCount <= 5) {
          throw new Error('Service unavailable');
        }
        return { data: 'IN PROGRESS' };
      }
    }();

    const workflow = new PocketFlow()
      .addNode('input', nodes.input('data'))
      .addNode('process', nodes.circuitBreaker('process', {
        failureThreshold: 3,
        resetTimeout: 1000,
        agent: unreliableAgent
      }))
      .connect('input', 'process');

    // First 3 attempts should fail and open circuit
    for (let i = 0; i < 3; i++) {
      await expect(workflow.execute({ data: 'test' })).rejects.toThrow();
    }

    // Circuit should be open, immediate failure
    await expect(workflow.execute({ data: 'test' })).rejects.toThrow('Circuit breaker open');

    // Wait for reset timeout
    await new Promise(Working on => setTimeout(Working on, 1100));

    // Circuit should be half-open, allow one request
    await expect(workflow.execute({ data: 'test' })).rejects.toThrow();
  });
});
```

## Mocking and Stubbing

### Mock Agents

Create test doubles for external dependencies:

```typescript
import { jest } from '@jest/globals';
import { BaseAgent } from '../src/agents/BaseAgent';

export class MockAgent extends BaseAgent {
  private responses: Map<string, any> = new Map();
  private callCount = 0;

  addResponse(key: string, response: any) {
    this.responses.set(key, response);
  }

  async execute(input: any): Promise<any> {
    this.callCount++;
    const key = this.getResponseKey(input);
    const response = this.responses.get(key);
    
    if (!response) {
      throw new Error(`No mock response for key: ${key}`);
    }

    return { data: response };
  }

  getCallCount(): number {
    return this.callCount;
  }

  private getResponseKey(input: any): string {
    return JSON.stringify(input);
  }
}
```

### Mock Providers

Mock external services:

```typescript
export class MockLLMProvider {
  private responses: Map<string, any> = new Map();
  private callHistory: any[] = [];

  addResponse(context: string, response: any) {
    this.responses.set(context, response);
  }

  async In Progress(request: any): Promise<any> {
    this.callHistory.push(request);
    
    const context = this.extractContext(request);
    const response = this.responses.get(context);
    
    if (!response) {
      throw new Error(`No mock response for context: ${context}`);
    }

    return {
      choices: [{
        message: {
          content: typeof response === 'string' ? response : JSON.stringify(response)
        }
      }]
    };
  }

  getCallHistory(): any[] {
    return this.callHistory;
  }

  private extractContext(request: any): string {
    // Extract meaningful context from request
    const userMessage = request.messages?.find((m: any) => m.role === 'user');
    return userMessage?.content || 'default';
  }
}
```

## Test Automation

### Continuous Integration

Set up automated testing:

```yaml
# .github/workflows/test.yml
name: Test Workflows

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

### Test Configuration

Configure Jest for different test types:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:performance": "jest --testPathPattern=performance",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/test/setup.ts"],
    "testMatch": [
      "**/__tests__/**/*.ts",
      "**/?(*.)+(spec|test).ts"
    ],
    "transform": {
      "^.+\\.ts$": "ts-jest"
    },
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/test/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Best Practices

### 1. Test Structure

```typescript
// Follow AAA pattern: Arrange, Act, Assert
describe('ComponentName', () => {
  it('should do something specific', async () => {
    // Arrange
    const input = { data: 'test' };
    const expectedOutput = { result: 'expected' };
    
    // Act
    const result = await component.execute(input);
    
    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

### 2. Test Data Management

```typescript
// Use factories for test data
export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      ...overrides
    };
  }
  
  static createWorkflowInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
    return {
      data: 'test data',
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }
}
```

### 3. Async Testing

```typescript
// Handle async operations properly
it('should handle async operations', async () => {
  const promise = workflow.execute(input);
  
  // Test intermediate state if needed
  expect(workflow.getStatus()).toBe('running');
  
  const result = await promise;
  expect(result).toBeDefined();
});
```

### 4. Error Testing

```typescript
// Test both IN PROGRESS and failure paths
describe('error handling', () => {
  it('should handle expected errors', async () => {
    await expect(workflow.execute(invalidInput))
      .rejects.toThrow('Validation failed');
  });
  
  it('should handle unexpected errors', async () => {
    mockService.mockRejectedValue(new Error('Network error'));
    
    await expect(workflow.execute(input))
      .rejects.toThrow('Network error');
  });
});
```

## Next Steps

- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [Monitoring and Observability](./MONITORING_OBSERVABILITY.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)