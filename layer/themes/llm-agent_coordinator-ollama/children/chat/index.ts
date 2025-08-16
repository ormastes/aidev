/**
 * Chat Manager
 * Manages chat sessions and conversations with Ollama
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { OllamaClient } from '../client';
import { StreamHandler, StreamChunk } from '../stream';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  seed?: number;
  stream?: boolean;
  format?: 'json';
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface ChatSession {
  id: string;
  model: string;
  messages: ChatMessage[];
  context?: number[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  options?: ChatOptions;
}

export interface ChatHistory {
  sessionId: string;
  messages: ChatMessage[];
  tokenCount?: number;
  duration?: number;
}

export interface ChatContext {
  sessionId: string;
  context: number[];
  model: string;
  timestamp: Date;
}

export interface ChatCompletion {
  content: string;
  role: 'assistant';
  context?: number[];
  finishReason?: 'stop' | 'length' | 'error';
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class ChatManager extends EventEmitter {
  private client: OllamaClient;
  private streamHandler: StreamHandler;
  private sessions: Map<string, ChatSession>;
  private contexts: Map<string, ChatContext>;
  private defaultOptions: ChatOptions;
  private maxSessionAge: number;

  constructor(
    client: OllamaClient,
    streamHandler: StreamHandler,
    options?: {
      defaultOptions?: ChatOptions;
      maxSessionAge?: number;
    }
  ) {
    super();
    this.client = client;
    this.streamHandler = streamHandler;
    this.sessions = new Map();
    this.contexts = new Map();
    this.defaultOptions = options?.defaultOptions || {
      model: 'llama2',
      temperature: 0.7
    };
    this.maxSessionAge = options?.maxSessionAge || 3600000; // 1 hour
    
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldSessions();
    }, 60000); // Check every minute
  }

  createSession(options?: ChatOptions & { metadata?: Record<string, any> }): ChatSession {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ChatSession = {
      id: sessionId,
      model: options?.model || this.defaultOptions.model || 'llama2',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options?.metadata,
      options: { ...this.defaultOptions, ...options }
    };

    if (options?.systemPrompt) {
      session.messages.push({
        role: 'system',
        content: options.systemPrompt,
        timestamp: new Date()
      });
    }

    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId, model: session.model });
    
    return session;
  }

  async chat(
    sessionId: string,
    message: string | ChatMessage,
    options?: ChatOptions
  ): Promise<ChatCompletion> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add user message
    const userMessage: ChatMessage = typeof message === 'string'
      ? { role: 'user', content: message, timestamp: new Date() }
      : { ...message, timestamp: new Date() };
    
    session.messages.push(userMessage);
    session.updatedAt = new Date();

    const chatOptions = { ...session.options, ...options };
    
    this.emit('chat:start', { sessionId, message: userMessage });

    try {
      let response: ChatCompletion;
      
      if (chatOptions.stream) {
        response = await this.streamChat(sessionId, chatOptions);
      } else {
        response = await this.standardChat(sessionId, chatOptions);
      }

      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });

      // Update context
      if (response.context) {
        this.contexts.set(sessionId, {
          sessionId,
          context: response.context,
          model: session.model,
          timestamp: new Date()
        });
        session.context = response.context;
      }

      this.emit('chat:complete', { sessionId, response });
      
      return response;
    } catch (error) {
      this.emit('chat:error', { sessionId, error });
      throw error;
    }
  }

  private async standardChat(
    sessionId: string,
    options: ChatOptions
  ): Promise<ChatCompletion> {
    const session = this.sessions.get(sessionId)!;
    
    const response = await this.client.chat({
      model: options.model || session.model,
      messages: session.messages.map(m => ({
        role: m.role,
        content: m.content,
        images: m.images
      })),
      format: options.format,
      options: {
        temperature: options.temperature,
        top_k: options.topK,
        top_p: options.topP,
        repeat_penalty: options.repeatPenalty,
        seed: options.seed,
        num_predict: options.maxTokens,
        stop: options.stopSequences
      }
    });

    return {
      content: response.response,
      role: 'assistant',
      context: response.context,
      finishReason: response.done ? 'stop' : 'length',
      usage: {
        promptTokens: response.prompt_eval_count,
        completionTokens: response.eval_count,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      }
    };
  }

  private async streamChat(
    sessionId: string,
    options: ChatOptions
  ): Promise<ChatCompletion> {
    const session = this.sessions.get(sessionId)!;
    let content = '';
    let context: number[] | undefined;
    
    return new Promise((resolve, reject) => {
      this.streamHandler.stream({
        model: options.model || session.model,
        messages: session.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stopSequences: options.stopSequences,
        onChunk: (chunk: StreamChunk) => {
          content += chunk.content;
          context = chunk.context;
          
          this.emit('chat:stream:chunk', { 
            sessionId,
            chunk: chunk.content 
          });
        },
        onComplete: () => {
          resolve({
            content,
            role: 'assistant',
            context,
            finishReason: 'stop'
          });
        },
        onError: (error) => {
          reject(error);
        }
      }).catch(reject);
    });
  }

  async continueConversation(
    sessionId: string,
    options?: ChatOptions
  ): Promise<ChatCompletion> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.messages.length === 0) {
      throw new Error('No messages in session');
    }

    const lastUserMessage = [...session.messages]
      .reverse()
      .find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      throw new Error('No user message found');
    }

    // Generate continuation
    const chatOptions = { ...session.options, ...options };
    
    return this.standardChat(sessionId, chatOptions);
  }

  async regenerateLastResponse(
    sessionId: string,
    options?: ChatOptions
  ): Promise<ChatCompletion> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Remove last assistant message if exists
    const lastMessage = session.messages[session.messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      session.messages.pop();
    }

    // Generate new response
    const lastUserMessage = [...session.messages]
      .reverse()
      .find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      throw new Error('No user message found');
    }

    return this.chat(sessionId, lastUserMessage, options);
  }

  async summarizeSession(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const conversationText = session.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const summarySession = this.createSession({
      model: session.model,
      systemPrompt: 'You are a helpful assistant that summarizes conversations concisely.'
    });

    const response = await this.chat(
      summarySession.id,
      `Please summarize this conversation:\n\n${conversationText}`,
      { temperature: 0.3 }
    );

    // Clean up summary session
    this.deleteSession(summarySession.id);

    return response.content;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionHistory(sessionId: string): ChatHistory {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId,
      messages: [...session.messages],
      tokenCount: session.messages.reduce((sum, m) => 
        sum + (m.content.split(' ').length * 1.3), 0
      ), // Rough estimate
      duration: Date.now() - session.createdAt.getTime()
    };
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.messages = session.messages.filter(m => m.role === 'system');
      session.context = undefined;
      session.updatedAt = new Date();
      
      this.contexts.delete(sessionId);
      this.emit('session:cleared', { sessionId });
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.contexts.delete(sessionId);
    this.emit('session:deleted', { sessionId });
  }

  private cleanupOldSessions(): void {
    const now = Date.now();
    const sessionsToDelete: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const age = now - session.updatedAt.getTime();
      if (age > this.maxSessionAge) {
        sessionsToDelete.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDelete) {
      this.deleteSession(sessionId);
    }

    if (sessionsToDelete.length > 0) {
      this.emit('sessions:cleaned', { count: sessionsToDelete.length });
    }
  }

  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return JSON.stringify({
      session,
      context: this.contexts.get(sessionId)
    }, null, 2);
  }

  importSession(data: string): ChatSession {
    const parsed = JSON.parse(data);
    const session = parsed.session as ChatSession;
    
    // Generate new ID
    session.id = `chat_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    
    // Convert message timestamps
    session.messages = session.messages.map(m => ({
      ...m,
      timestamp: m.timestamp ? new Date(m.timestamp) : undefined
    }));

    this.sessions.set(session.id, session);

    if (parsed.context) {
      this.contexts.set(session.id, {
        ...parsed.context,
        sessionId: session.id,
        timestamp: new Date(parsed.context.timestamp)
      });
    }

    this.emit('session:imported', { sessionId: session.id });
    
    return session;
  }

  async branchSession(sessionId: string, fromIndex: number): Promise<ChatSession> {
    const originalSession = this.sessions.get(sessionId);
    
    if (!originalSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const newSession = this.createSession(originalSession.options);
    
    // Copy messages up to fromIndex
    newSession.messages = originalSession.messages.slice(0, fromIndex + 1).map(m => ({ ...m }));
    
    // Copy context if available
    const context = this.contexts.get(sessionId);
    if (context) {
      this.contexts.set(newSession.id, {
        ...context,
        sessionId: newSession.id,
        timestamp: new Date()
      });
    }

    this.emit('session:branched', { 
      originalId: sessionId,
      newId: newSession.id,
      fromIndex 
    });

    return newSession;
  }

  getMetrics(): {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    averageSessionLength: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const now = Date.now();
    const activeThreshold = 300000; // 5 minutes
    
    const activeSessions = sessions.filter(s => 
      now - s.updatedAt.getTime() < activeThreshold
    );

    const totalMessages = sessions.reduce((sum, s) => 
      sum + s.messages.length, 0
    );

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalMessages,
      averageSessionLength: sessions.length > 0 
        ? totalMessages / sessions.length 
        : 0
    };
  }
}

export default ChatManager;