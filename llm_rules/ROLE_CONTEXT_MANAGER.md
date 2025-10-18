# Role: Context Manager

> **Claude Agent**: [context-manager](../.claude/agents/context-manager.md)

## Responsibilities

The Context Manager maintains and optimizes context for LLM interactions and system state.

## Primary Tasks

### 1. Context Optimization

- **Context window management**

- **Relevant information selection**

- **Context compression**

- **History management**

### 2. State Management

- **Application state tracking**

- **User session context**

- **Conversation history**

- **System configuration**

### 3. Memory Management

- **Short-term memory**

- **Long-term storage**

- **Context retrieval**

- **Memory optimization**

## Context Strategies

### Sliding Window
```typescript
class ContextWindow {
  maxTokens: number;
  content: Message[];
  
  addMessage(message: Message) {
    this.content.push(message);
    this.trimToFit();
  }
  
  trimToFit() {
    while (this.getTokenCount() > this.maxTokens) {
      this.content.shift();
    }
  }
}
```text

### Semantic Compression

- Identify key information

- Remove redundancy

- Summarize verbose content

- Preserve critical context

### Priority-Based Selection

- Recent information priority

- Relevance scoring

- User preference weighting

- Task-specific filtering

## Implementation Patterns

### Context Store
```typescript
interface ContextStore {
  saveContext(key: string, context: Context): void;
  loadContext(key: string): Context;
  searchContext(query: string): Context[];
  pruneOldContext(maxAge: number): void;
}
```text

### Context Injection

- Automatic context loading

- Dynamic context switching

- Context inheritance

- Scoped context management

## Best Practices

1. **Monitor context size**

2. **Implement context versioning**

3. **Use efficient storage**

4. **Provide context debugging**

5. **Handle context overflow gracefully**

## Deliverables

- Context management system

- Memory optimization strategies

- Context retrieval APIs

- Performance metrics

- Documentation and guides
