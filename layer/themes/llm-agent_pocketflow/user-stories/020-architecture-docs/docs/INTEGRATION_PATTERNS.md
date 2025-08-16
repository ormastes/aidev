# PocketFlow Integration Patterns

## Overview

This document describes how to integrate PocketFlow with various LLM providers, external services, and existing applications.

## Table of Contents

1. [LLM Provider Integration](#llm-provider-integration)
2. [Tool Integration](#tool-integration)
3. [Memory Systems](#memory-systems)
4. [External Services](#external-services)
5. [Application Integration](#application-integration)
6. [Best Practices](#best-practices)

## LLM Provider Integration

### Provider Adapter Pattern

Create adapters for different LLM providers:

```typescript
// Base provider interface
interface LLMProvider {
  name: string;
  createCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// OpenAI implementation
class OpenAIProvider implements LLMProvider {
  name = 'openai';
  
  constructor(private apiKey: string) {}
  
  async createCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4',
        prompt,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7
      })
    });
    
    const data = await response.json();
    return data.choices[0].text;
  }
  
  async streamCompletion(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    // Streaming implementation
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models');
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### Agent Factory Pattern

Create agents from providers:

```typescript
class AgentFactory {
  private providers = new Map<string, LLMProvider>();
  
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }
  
  createAgent(providerName: string, config: AgentConfig): Agent {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    return new LLMAgent({
      ...config,
      provider
    });
  }
}

// Usage
const factory = new AgentFactory();
factory.registerProvider(new OpenAIProvider(apiKey));
factory.registerProvider(new AnthropicProvider(apiKey));

const agent = factory.createAgent('openai', {
  model: 'gpt-4',
  temperature: 0.7
});
```

### Multi-Provider Workflows

Use different providers for different tasks:

```typescript
const workflow = new PocketFlow();

// Use GPT-4 for complex reasoning
const reasoningAgent = factory.createAgent('openai', {
  model: 'gpt-4',
  temperature: 0.3
});

// Use Claude for creative writing
const writingAgent = factory.createAgent('anthropic', {
  model: 'claude-3-opus',
  temperature: 0.9
});

// Use local model for classification
const classifierAgent = factory.createAgent('ollama', {
  model: 'llama2',
  temperature: 0.1
});

workflow
  .addNode('analyze', new AgentNode(reasoningAgent))
  .addNode('generate', new AgentNode(writingAgent))
  .addNode('classify', new AgentNode(classifierAgent))
  .connect('analyze', 'generate')
  .connect('generate', 'classify');
```

## Tool Integration

### Tool Interface

Define tools that agents can use:

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(args: any): Promise<any>;
}

class WebSearchTool implements Tool {
  name = 'web_search';
  description = 'Search the web for information';
  parameters = [
    { name: 'query', type: 'string', required: true },
    { name: 'limit', type: 'number', required: false }
  ];
  
  async execute(args: { query: string; limit?: number }): Promise<any> {
    // Implement web search
    const results = await searchAPI.search(args.query, args.limit);
    return results;
  }
}
```

### Tool-Enabled Agents

Create agents that can use tools:

```typescript
class ToolAgent extends BaseAgent {
  constructor(
    private llmProvider: LLMProvider,
    private tools: Tool[]
  ) {
    super();
  }
  
  async process(input: AgentInput): Promise<AgentOutput> {
    // Generate tool-aware prompt
    const toolDescriptions = this.tools.map(t => 
      `${t.name}: ${t.description}`
    ).join('\n');
    
    const prompt = `
You have access to these tools:
${toolDescriptions}

To use a tool, respond with:
TOOL: tool_name
ARGS: { "param": "value" }

User request: ${input.messages[0].content}
`;
    
    const response = await this.llmProvider.createCompletion(prompt);
    
    // Parse tool usage
    if (response.includes('TOOL:')) {
      const toolCall = this.parseToolCall(response);
      const tool = this.tools.find(t => t.name === toolCall.name);
      
      if (tool) {
        const result = await tool.execute(toolCall.args);
        // Process tool result
        return this.processToolResult(result);
      }
    }
    
    return { message: { role: 'assistant', content: response } };
  }
}
```

### Common Tools

Pre-built tools for common tasks:

```typescript
// File system tool
class FileSystemTool implements Tool {
  name = 'file_system';
  description = 'Read and write files';
  
  async execute(args: { action: string; path: string; content?: string }) {
    switch (args.action) {
      case 'read':
        return await fs.readFile(args.path, 'utf-8');
      case 'write':
        await fs.writeFile(args.path, args.content!);
        return { IN PROGRESS: true };
      case 'list':
        return await fs.readdir(args.path);
    }
  }
}

// Database tool
class DatabaseTool implements Tool {
  name = 'database';
  description = 'Query and update database';
  
  async execute(args: { query: string; params?: any[] }) {
    const result = await db.query(args.query, args.params);
    return result.rows;
  }
}

// API tool
class APITool implements Tool {
  name = 'api';
  description = 'Make HTTP requests';
  
  async execute(args: { method: string; url: string; body?: any }) {
    const response = await fetch(args.url, {
      method: args.method,
      body: JSON.stringify(args.body),
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }
}
```

## Memory Systems

### Memory Interface

```typescript
interface Memory {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  search(query: string): Promise<any[]>;
  forget(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Memory Implementations

#### In-Memory Storage

```typescript
class InMemoryStorage implements Memory {
  private data = new Map<string, any>();
  
  async store(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }
  
  async retrieve(key: string): Promise<any> {
    return this.data.get(key);
  }
  
  async search(query: string): Promise<any[]> {
    const results: any[] = [];
    for (const [key, value] of this.data) {
      if (JSON.stringify(value).includes(query)) {
        results.push({ key, value });
      }
    }
    return results;
  }
  
  async forget(key: string): Promise<void> {
    this.data.delete(key);
  }
  
  async clear(): Promise<void> {
    this.data.clear();
  }
}
```

#### Vector Database Memory

```typescript
class VectorMemory implements Memory {
  constructor(private vectorDB: VectorDatabase) {}
  
  async store(key: string, value: any): Promise<void> {
    const embedding = await this.embed(value);
    await this.vectorDB.insert({
      id: key,
      vector: embedding,
      metadata: value
    });
  }
  
  async retrieve(key: string): Promise<any> {
    const result = await this.vectorDB.get(key);
    return result?.metadata;
  }
  
  async search(query: string): Promise<any[]> {
    const queryEmbedding = await this.embed(query);
    const results = await this.vectorDB.search(queryEmbedding, 10);
    return results.map(r => r.metadata);
  }
  
  private async embed(text: string): Promise<number[]> {
    // Use embedding model
    return await embeddingModel.encode(text);
  }
}
```

#### Persistent Memory

```typescript
class FileMemory implements Memory {
  constructor(private basePath: string) {}
  
  private getPath(key: string): string {
    return path.join(this.basePath, `${key}.json`);
  }
  
  async store(key: string, value: any): Promise<void> {
    const filePath = this.getPath(key);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
  }
  
  async retrieve(key: string): Promise<any> {
    try {
      const filePath = this.getPath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  async search(query: string): Promise<any[]> {
    const files = await fs.readdir(this.basePath);
    const results: any[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(
          path.join(this.basePath, file), 
          'utf-8'
        );
        if (content.includes(query)) {
          results.push(JSON.parse(content));
        }
      }
    }
    
    return results;
  }
}
```

### Memory-Enhanced Workflows

```typescript
const memory = new VectorMemory(vectorDB);

const workflow = workflow()
  .addNode('remember', nodes.transform('remember', async (input) => {
    // Store important information
    await memory.store(`conversation-${Date.now()}`, input);
    return input;
  }))
  .addNode('recall', nodes.transform('recall', async (input) => {
    // Search for relevant memories
    const memories = await memory.search(input.query);
    return {
      ...input,
      context: memories
    };
  }))
  .addNode('process', createAgenticNode('process', agent, {
    preProcess: async (input) => ({
      ...input,
      memory: await memory.search(input.query)
    })
  }));
```

## External Services

### Service Integration Pattern

```typescript
interface ExternalService {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

class EmailService implements ExternalService {
  name = 'email';
  private client: EmailClient;
  
  async connect(): Promise<void> {
    this.client = await EmailClient.create({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await this.client.send({ to, subject, body });
  }
  
  async disconnect(): Promise<void> {
    await this.client.close();
  }
  
  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }
}
```

### Service Registry

```typescript
class ServiceRegistry {
  private services = new Map<string, ExternalService>();
  
  register(service: ExternalService): void {
    this.services.set(service.name, service);
  }
  
  async connectAll(): Promise<void> {
    for (const service of this.services.values()) {
      await service.connect();
    }
  }
  
  async disconnectAll(): Promise<void> {
    for (const service of this.services.values()) {
      await service.disconnect();
    }
  }
  
  get<T extends ExternalService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service as T;
  }
}
```

## Application Integration

### Express.js Integration

```typescript
import express from 'express';
import { PocketFlow } from '@aidev/pocketflow-core';

const app = express();
app.use(express.json());

// Create workflow
const chatWorkflow = createChatWorkflow();

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const result = await chatWorkflow.execute({
      messages: [{ role: 'user', content: message }]
    });
    
    const response = result.outputs.get('response');
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### React Integration

```typescript
// usePocketFlow.ts
import { useState, useCallback } from 'react';
import { PocketFlow } from '@aidev/pocketflow-core';

export function usePocketFlow(workflow: PocketFlow) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const execute = useCallback(async (input: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const executionResult = await workflow.execute(input);
      setResult(executionResult.outputs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [workflow]);
  
  return { execute, loading, error, result };
}

// Component usage
function ChatComponent() {
  const workflow = useMemo(() => createChatWorkflow(), []);
  const { execute, loading, result } = usePocketFlow(workflow);
  
  const handleSubmit = (message: string) => {
    execute({ message });
  };
  
  return (
    <div>
      <ChatInput onSubmit={handleSubmit} disabled={loading} />
      {result && <ChatResponse response={result.get('response')} />}
    </div>
  );
}
```

### CLI Integration

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { createWorkflow } from './workflows';

const program = new Command();

program
  .name('pocketflow-cli')
  .description('PocketFlow command line interface')
  .version('1.0.0');

program
  .command('run <workflow>')
  .description('Run a workflow')
  .option('-i, --input <json>', 'Input data as JSON')
  .option('-f, --file <path>', 'Input data from file')
  .action(async (workflowName, options) => {
    const workflow = await loadWorkflow(workflowName);
    
    let input;
    if (options.file) {
      input = JSON.parse(await fs.readFile(options.file, 'utf-8'));
    } else if (options.input) {
      input = JSON.parse(options.input);
    } else {
      input = {};
    }
    
    const result = await workflow.execute(input);
    console.log(JSON.stringify(result.outputs, null, 2));
  });

program.parse();
```

## Best Practices

### 1. Provider Abstraction

Always abstract provider-specific details:

```typescript
// Good
const agent = factory.createAgent(provider, config);

// Bad
const agent = new OpenAIAgent(apiKey);
```

### 2. Error Handling

Implement robust error handling:

```typescript
class ResilientProvider implements LLMProvider {
  async createCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.provider.createCompletion(prompt, options);
      } catch (error) {
        lastError = error;
        await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }
    
    throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
  }
}
```

### 3. Resource Management

Properly manage connections and resources:

```typescript
class ManagedWorkflow {
  private registry = new ServiceRegistry();
  
  async execute(input: any): Promise<any> {
    try {
      await this.registry.connectAll();
      return await this.workflow.execute(input);
    } finally {
      await this.registry.disconnectAll();
    }
  }
}
```

### 4. Configuration Management

Use environment-specific configuration:

```typescript
interface Config {
  providers: Record<string, ProviderConfig>;
  services: Record<string, ServiceConfig>;
  memory: MemoryConfig;
}

const config: Config = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.OPENAI_BASE_URL
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!
    }
  },
  services: {
    email: {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!)
    }
  },
  memory: {
    type: process.env.MEMORY_TYPE || 'inmemory',
    options: {}
  }
};
```

### 5. Testing Integration

Test with mock providers:

```typescript
class MockProvider implements LLMProvider {
  name = 'mock';
  
  constructor(private responses: Map<string, string>) {}
  
  async createCompletion(prompt: string): Promise<string> {
    // Return predefined response based on prompt
    for (const [pattern, response] of this.responses) {
      if (prompt.includes(pattern)) {
        return response;
      }
    }
    return 'Default response';
  }
}

// In tests
const mockProvider = new MockProvider(new Map([
  ['email', 'Here is a professional email...'],
  ['code', 'function example() { return 42; }']
]));
```

## Next Steps

- [Workflow Composition](./WORKFLOW_COMPOSITION.md)
- [API Reference](./API_REFERENCE.md)
- [Examples](../examples/)