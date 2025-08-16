/**
 * Conversation Manager
 * Manages conversation state and history
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string | ContentBlock[];
  timestamp: Date;
  metadata?: MessageMetadata;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'code';
  text?: string;
  language?: string;
  image?: {
    url?: string;
    base64?: string;
    mimeType: string;
  };
}

export interface MessageMetadata {
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
  latency?: number;
  cost?: number;
  tags?: string[];
  context?: any;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ToolResult {
  callId: string;
  output: any;
  error?: string;
}

export interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  metadata: ConversationMetadata;
  state: ConversationState;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tags?: string[];
  parentId?: string;
  branchPoint?: string;
}

export type ConversationState = 
  | 'active'
  | 'paused'
  | 'completed'
  | 'error'
  | 'archived';

export interface ConversationHistory {
  conversations: Conversation[];
  totalCount: number;
  branches: Map<string, string[]>;
}

export interface ConversationOptions {
  maxMessages?: number;
  maxTokens?: number;
  autoSummarize?: boolean;
  persistHistory?: boolean;
  branchingEnabled?: boolean;
}

export class ConversationManager extends EventEmitter {
  private conversations: Map<string, Conversation>;
  private activeConversation?: Conversation;
  private options: ConversationOptions;
  private messageCounter: number;
  private summaryCache: Map<string, string>;

  constructor(options: ConversationOptions = {}) {
    super();
    this.conversations = new Map();
    this.options = {
      maxMessages: 100,
      maxTokens: 100000,
      autoSummarize: true,
      persistHistory: true,
      branchingEnabled: true,
      ...options,
    };
    this.messageCounter = 0;
    this.summaryCache = new Map();
  }

  createConversation(metadata?: ConversationMetadata): Conversation {
    const id = this.generateId();
    const conversation: Conversation = {
      id,
      title: metadata?.systemPrompt?.substring(0, 50) || `Conversation ${id}`,
      messages: [],
      metadata: metadata || {},
      state: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add system message if provided
    if (metadata?.systemPrompt) {
      this.addMessage(conversation, {
        role: 'system',
        content: metadata.systemPrompt,
      });
    }

    this.conversations.set(id, conversation);
    this.activeConversation = conversation;
    
    this.emit('conversationCreated', conversation);
    return conversation;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  setActiveConversation(id: string): boolean {
    const conversation = this.conversations.get(id);
    if (conversation) {
      this.activeConversation = conversation;
      this.emit('conversationActivated', conversation);
      return true;
    }
    return false;
  }

  addMessage(
    conversationOrId?: Conversation | string,
    messageData?: Partial<Message>
  ): Message {
    const conversation = this.resolveConversation(conversationOrId);
    if (!conversation) {
      throw new Error('No active conversation');
    }

    const message: Message = {
      id: this.generateMessageId(),
      role: messageData?.role || 'user',
      content: messageData?.content || '',
      timestamp: new Date(),
      metadata: messageData?.metadata,
      toolCalls: messageData?.toolCalls,
      toolResults: messageData?.toolResults,
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Manage conversation size
    this.manageConversationSize(conversation);

    this.emit('messageAdded', { conversation, message });
    return message;
  }

  addUserMessage(content: string, metadata?: MessageMetadata): Message {
    return this.addMessage(undefined, {
      role: 'user',
      content,
      metadata,
    });
  }

  addAssistantMessage(content: string, metadata?: MessageMetadata): Message {
    return this.addMessage(undefined, {
      role: 'assistant',
      content,
      metadata,
    });
  }

  addToolCall(toolCall: ToolCall): Message {
    return this.addMessage(undefined, {
      role: 'assistant',
      content: `Calling tool: ${toolCall.name}`,
      toolCalls: [toolCall],
    });
  }

  addToolResult(callId: string, output: any, error?: string): Message {
    return this.addMessage(undefined, {
      role: 'tool',
      content: error || JSON.stringify(output),
      toolResults: [{ callId, output, error }],
    });
  }

  private manageConversationSize(conversation: Conversation): void {
    // Check message count limit
    if (this.options.maxMessages && conversation.messages.length > this.options.maxMessages) {
      const overflow = conversation.messages.length - this.options.maxMessages;
      
      if (this.options.autoSummarize) {
        // Summarize old messages
        const messagesToSummarize = conversation.messages.slice(0, overflow + 10);
        const summary = this.summarizeMessages(messagesToSummarize);
        
        // Replace with summary
        conversation.messages = [
          {
            id: this.generateMessageId(),
            role: 'system',
            content: `[Previous conversation summary: ${summary}]`,
            timestamp: new Date(),
            metadata: { isSummary: true },
          },
          ...conversation.messages.slice(overflow + 10),
        ];
        
        this.summaryCache.set(conversation.id, summary);
      } else {
        // Simply truncate
        conversation.messages = conversation.messages.slice(overflow);
      }
      
      this.emit('conversationTruncated', { conversation, removed: overflow });
    }

    // Check token limit
    if (this.options.maxTokens) {
      const totalTokens = this.estimateTotalTokens(conversation);
      if (totalTokens > this.options.maxTokens) {
        this.emit('tokenLimitExceeded', { conversation, tokens: totalTokens });
      }
    }
  }

  private summarizeMessages(messages: Message[]): string {
    // Simple summarization - in production, use AI for better summaries
    const textMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => {
        const content = typeof m.content === 'string' 
          ? m.content 
          : m.content.map(b => b.text || '[non-text content]').join(' ');
        return `${m.role}: ${content}`;
      });

    const summary = textMessages.slice(0, 5).join('\n');
    return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
  }

  private estimateTotalTokens(conversation: Conversation): number {
    let total = 0;
    for (const message of conversation.messages) {
      if (message.metadata?.tokens) {
        total += (message.metadata.tokens.input || 0) + (message.metadata.tokens.output || 0);
      } else {
        // Rough estimate
        const text = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        total += Math.ceil(text.length / 4);
      }
    }
    return total;
  }

  getMessages(conversationId?: string, filter?: MessageFilter): Message[] {
    const conversation = conversationId 
      ? this.conversations.get(conversationId)
      : this.activeConversation;
    
    if (!conversation) return [];

    let messages = [...conversation.messages];

    if (filter) {
      if (filter.role) {
        messages = messages.filter(m => m.role === filter.role);
      }
      if (filter.after) {
        messages = messages.filter(m => m.timestamp > filter.after!);
      }
      if (filter.before) {
        messages = messages.filter(m => m.timestamp < filter.before!);
      }
      if (filter.limit) {
        messages = messages.slice(-filter.limit);
      }
    }

    return messages;
  }

  getFormattedHistory(conversationId?: string): Array<{
    role: MessageRole;
    content: string;
  }> {
    const messages = this.getMessages(conversationId);
    
    return messages.map(message => ({
      role: message.role,
      content: typeof message.content === 'string'
        ? message.content
        : message.content.map(block => {
            if (block.type === 'text') return block.text;
            if (block.type === 'code') return `\`\`\`${block.language || ''}\n${block.text}\n\`\`\``;
            return '[non-text content]';
          }).join('\n'),
    }));
  }

  branchConversation(fromMessageId?: string): Conversation {
    if (!this.options.branchingEnabled) {
      throw new Error('Branching is not enabled');
    }

    const current = this.activeConversation;
    if (!current) {
      throw new Error('No active conversation to branch from');
    }

    const branchPoint = fromMessageId || current.messages[current.messages.length - 1]?.id;
    const branchIndex = current.messages.findIndex(m => m.id === branchPoint);
    
    if (branchIndex === -1) {
      throw new Error(`Message ${branchPoint} not found`);
    }

    // Create new conversation as branch
    const branch = this.createConversation({
      ...current.metadata,
      parentId: current.id,
      branchPoint,
    });

    // Copy messages up to branch point
    branch.messages = current.messages.slice(0, branchIndex + 1).map(m => ({ ...m }));
    
    this.emit('conversationBranched', { parent: current, branch, branchPoint });
    return branch;
  }

  mergeConversations(sourceId: string, targetId: string): Conversation {
    const source = this.conversations.get(sourceId);
    const target = this.conversations.get(targetId);
    
    if (!source || !target) {
      throw new Error('Source or target conversation not found');
    }

    // Append source messages to target
    target.messages.push(...source.messages);
    target.updatedAt = new Date();
    
    // Remove source conversation
    this.conversations.delete(sourceId);
    
    this.emit('conversationsMerged', { source, target });
    return target;
  }

  clearConversation(conversationId?: string): void {
    const conversation = this.resolveConversation(conversationId);
    if (!conversation) return;

    const systemMessage = conversation.messages.find(m => m.role === 'system');
    conversation.messages = systemMessage ? [systemMessage] : [];
    conversation.updatedAt = new Date();
    
    this.emit('conversationCleared', conversation);
  }

  deleteConversation(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    this.conversations.delete(conversationId);
    
    if (this.activeConversation?.id === conversationId) {
      this.activeConversation = undefined;
    }
    
    this.emit('conversationDeleted', conversation);
    return true;
  }

  exportConversation(conversationId?: string): string {
    const conversation = this.resolveConversation(conversationId);
    if (!conversation) {
      throw new Error('No conversation to export');
    }

    return JSON.stringify(conversation, null, 2);
  }

  importConversation(data: string): Conversation {
    const parsed = JSON.parse(data);
    
    // Validate and reconstruct conversation
    const conversation: Conversation = {
      ...parsed,
      id: parsed.id || this.generateId(),
      messages: parsed.messages || [],
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt || Date.now()),
    };

    this.conversations.set(conversation.id, conversation);
    this.emit('conversationImported', conversation);
    
    return conversation;
  }

  searchMessages(query: string, options?: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    
    for (const conversation of this.conversations.values()) {
      for (const message of conversation.messages) {
        const content = typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content);
        
        if (this.matchesQuery(content, query, options)) {
          results.push({
            conversationId: conversation.id,
            messageId: message.id,
            message,
            relevance: this.calculateRelevance(content, query),
          });
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  private matchesQuery(content: string, query: string, options?: SearchOptions): boolean {
    const normalizedContent = options?.caseSensitive ? content : content.toLowerCase();
    const normalizedQuery = options?.caseSensitive ? query : query.toLowerCase();
    
    if (options?.regex) {
      try {
        const regex = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
        return regex.test(content);
      } catch {
        return false;
      }
    }
    
    if (options?.wholeWord) {
      const regex = new RegExp(`\\b${normalizedQuery}\\b`, options.caseSensitive ? 'g' : 'gi');
      return regex.test(content);
    }
    
    return normalizedContent.includes(normalizedQuery);
  }

  private calculateRelevance(content: string, query: string): number {
    const normalizedContent = content.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    
    // Simple relevance scoring
    let score = 0;
    
    // Exact match
    if (normalizedContent === normalizedQuery) score += 100;
    
    // Count occurrences
    const matches = (normalizedContent.match(new RegExp(normalizedQuery, 'g')) || []).length;
    score += matches * 10;
    
    // Position bonus (earlier is better)
    const position = normalizedContent.indexOf(normalizedQuery);
    if (position !== -1) {
      score += Math.max(0, 50 - position / 10);
    }
    
    return score;
  }

  private resolveConversation(conversationOrId?: Conversation | string): Conversation | undefined {
    if (!conversationOrId) return this.activeConversation;
    if (typeof conversationOrId === 'string') {
      return this.conversations.get(conversationOrId);
    }
    return conversationOrId;
  }

  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${++this.messageCounter}_${Date.now()}`;
  }

  getStats(): ConversationStats {
    const stats: ConversationStats = {
      totalConversations: this.conversations.size,
      activeConversations: 0,
      totalMessages: 0,
      totalTokens: 0,
      averageLength: 0,
    };

    for (const conversation of this.conversations.values()) {
      if (conversation.state === 'active') stats.activeConversations++;
      stats.totalMessages += conversation.messages.length;
      stats.totalTokens += this.estimateTotalTokens(conversation);
    }

    if (stats.totalConversations > 0) {
      stats.averageLength = stats.totalMessages / stats.totalConversations;
    }

    return stats;
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  getActiveConversation(): Conversation | undefined {
    return this.activeConversation;
  }
}

interface MessageFilter {
  role?: MessageRole;
  after?: Date;
  before?: Date;
  limit?: number;
}

interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

interface SearchResult {
  conversationId: string;
  messageId: string;
  message: Message;
  relevance: number;
}

interface ConversationStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  totalTokens: number;
  averageLength: number;
}

export default ConversationManager;