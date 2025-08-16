/**
 * MCP Session Domain Model
 * Manages conversation history and context
 */

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'result';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    toolCalls?: ToolCall[];
    cost?: number;
    duration?: number;
    turnCount?: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

export interface SessionMetadata {
  agentId: string;
  agentRole: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  tags?: string[];
  [key: string]: any;
}

export class Session {
  private readonly id: string;
  private readonly messages: Message[];
  private readonly metadata: SessionMetadata;
  private readonly createdAt: Date;
  private lastAccessedAt: Date;
  private active: boolean;

  constructor(config: {
    id: string;
    agentId: string;
    agentRole: string;
    model: string;
    metadata?: Partial<SessionMetadata>;
  }) {
    this.id = config.id;
    this.messages = [];
    this.metadata = {
      agentId: config.agentId,
      agentRole: config.agentRole,
      model: config.model,
      ...config.metadata
    };
    this.createdAt = new Date();
    this.lastAccessedAt = new Date();
    this.active = true;
  }

  // Message management
  addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };
    
    this.messages.push(fullMessage);
    this.lastAccessedAt = new Date();
    
    return fullMessage;
  }

  addSystemMessage(content: string): Message {
    return this.addMessage({
      role: 'system',
      content
    });
  }

  addUserMessage(content: string): Message {
    return this.addMessage({
      role: 'user',
      content
    });
  }

  addAssistantMessage(content: string, metadata?: Message['metadata']): Message {
    return this.addMessage({
      role: 'assistant',
      content,
      metadata
    });
  }

  addToolCall(toolCall: ToolCall): Message {
    return this.addMessage({
      role: 'tool',
      content: JSON.stringify({
        name: toolCall.name,
        arguments: toolCall.arguments
      }),
      metadata: {
        toolCalls: [toolCall]
      }
    });
  }

  addToolResult(toolCallId: string, result: any, error?: string): Message {
    return this.addMessage({
      role: 'result',
      content: error || JSON.stringify(result),
      metadata: {
        toolCalls: [{
          id: toolCallId,
          name: '',
          arguments: {},
          result,
          error
        }]
      }
    });
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  getLastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  getMessagesByRole(role: Message['role']): Message[] {
    return this.messages.filter(m => m.role === role);
  }

  getMetadata(): SessionMetadata {
    return { ...this.metadata };
  }

  getAgentId(): string {
    return this.metadata.agentId;
  }

  getAgentRole(): string {
    return this.metadata.agentRole;
  }

  getModel(): string {
    return this.metadata.model;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getLastAccessedAt(): Date {
    return this.lastAccessedAt;
  }

  isActive(): boolean {
    return this.active;
  }

  // Context management
  getContext(maxMessages?: number): Message[] {
    if (!maxMessages) {
      return this.getMessages();
    }
    return this.messages.slice(-maxMessages);
  }

  getTurnCount(): number {
    return this.messages.filter(m => 
      m.role === 'user' || m.role === 'assistant'
    ).length;
  }

  getTokenEstimate(): number {
    // Rough estimate: 1 token ≈ 4 characters
    return this.messages.reduce((total, msg) => 
      total + Math.ceil(msg.content.length / 4), 0
    );
  }

  // Metadata management
  updateMetadata(updates: Partial<SessionMetadata>): void {
    Object.assign(this.metadata, updates);
    this.lastAccessedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.metadata.tags) {
      this.metadata.tags = [];
    }
    if (!this.metadata.tags.includes(tag)) {
      this.metadata.tags.push(tag);
    }
  }

  // Lifecycle
  touch(): void {
    this.lastAccessedAt = new Date();
  }

  close(): void {
    this.active = false;
    this.lastAccessedAt = new Date();
  }

  reopen(): void {
    this.active = true;
    this.lastAccessedAt = new Date();
  }

  // Utilities
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Summary generation
  generateSummary(): string {
    const turnCount = this.getTurnCount();
    const duration = this.lastAccessedAt.getTime() - this.createdAt.getTime();
    const durationMinutes = Math.floor(duration / 60000);
    
    return `Session ${this.id} (${this.metadata.agentRole}):
- Messages: ${this.messages.length}
- Turns: ${turnCount}
- Duration: ${durationMinutes} minutes
- Model: ${this.metadata.model}
- Active: ${this.active}`;
  }

  // Serialization
  toJSON(): object {
    return {
      id: this.id,
      messages: this.messages,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      lastAccessedAt: this.lastAccessedAt.toISOString(),
      active: this.active
    };
  }

  static fromJSON(data: any): Session {
    const session = new Session({
      id: data.id,
      agentId: data.metadata.agentId,
      agentRole: data.metadata.agentRole,
      model: data.metadata.model,
      metadata: data.metadata
    });

    // Restore messages
    data.messages.forEach((msg: any) => {
      session.messages.push({
        ...msg,
        timestamp: new Date(msg.timestamp)
      });
    });

    // Restore timestamps
    (session as any).createdAt = new Date(data.createdAt);
    session.lastAccessedAt = new Date(data.lastAccessedAt);
    session.active = data.active;

    return session;
  }

  // Export for external use
  export(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}