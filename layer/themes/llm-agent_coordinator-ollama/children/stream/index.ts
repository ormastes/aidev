/**
 * Stream Handler
 * Manages streaming responses from Ollama
 */

import { EventEmitter } from 'node:events';
import { OllamaClient } from '../client';

export interface StreamOptions {
  model: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  onChunk?: StreamCallback;
  onComplete?: (response: any) => void;
  onError?: (error: StreamError) => void;
  bufferSize?: number;
  timeout?: number;
}

export interface StreamChunk {
  id: string;
  model: string;
  content: string;
  done: boolean;
  timestamp: Date;
  tokenCount?: number;
  context?: number[];
  metrics?: {
    promptEvalDuration?: number;
    evalDuration?: number;
    totalDuration?: number;
  };
}

export type StreamCallback = (chunk: StreamChunk) => void;

export interface StreamError {
  code: string;
  message: string;
  timestamp: Date;
  context?: any;
}

export interface StreamSession {
  id: string;
  model: string;
  startTime: Date;
  endTime?: Date;
  chunks: StreamChunk[];
  totalTokens: number;
  status: 'active' | "completed" | 'error' | "cancelled";
  error?: StreamError;
}

export class StreamHandler extends EventEmitter {
  private client: OllamaClient;
  private sessions: Map<string, StreamSession>;
  private buffers: Map<string, string[]>;
  private activeStreams: Set<string>;

  constructor(client: OllamaClient) {
    super();
    this.client = client;
    this.sessions = new Map();
    this.buffers = new Map();
    this.activeStreams = new Set();
    
    this.setupClientListeners();
  }

  private setupClientListeners(): void {
    this.client.on('stream:chunk', (chunk) => {
      this.handleStreamChunk(chunk);
    });
  }

  async stream(options: StreamOptions): Promise<StreamSession> {
    const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: StreamSession = {
      id: sessionId,
      model: options.model,
      startTime: new Date(),
      chunks: [],
      totalTokens: 0,
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    this.activeStreams.add(sessionId);
    this.buffers.set(sessionId, []);

    this.emit('stream:start', { sessionId, model: options.model });

    try {
      let response;
      
      if (options.messages) {
        // Chat mode
        response = await this.streamChat(sessionId, options);
      } else if (options.prompt) {
        // Completion mode
        response = await this.streamCompletion(sessionId, options);
      } else {
        throw new Error('Either prompt or messages must be provided');
      }

      session.endTime = new Date();
      session.status = "completed";
      
      this.emit('stream:complete', { 
        sessionId, 
        totalTokens: session.totalTokens,
        duration: session.endTime.getTime() - session.startTime.getTime()
      });

      return session;
    } catch (error: any) {
      session.status = 'error';
      session.error = {
        code: 'STREAM_ERROR',
        message: error.message,
        timestamp: new Date(),
        context: error
      };

      this.emit('stream:error', { sessionId, error: session.error });
      
      if (options.onError) {
        options.onError(session.error);
      }

      throw error;
    } finally {
      this.activeStreams.delete(sessionId);
      this.cleanupSession(sessionId);
    }
  }

  private async streamCompletion(sessionId: string, options: StreamOptions): Promise<any> {
    const session = this.sessions.get(sessionId)!;
    let buffer = '';

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 60000;
      const timer = setTimeout(() => {
        this.cancelStream(sessionId);
        reject(new Error('Stream timeout'));
      }, timeout);

      const handleChunk = (chunk: any) => {
        clearTimeout(timer);
        
        const streamChunk: StreamChunk = {
          id: `${sessionId}_${session.chunks.length}`,
          model: options.model,
          content: chunk.response || '',
          done: chunk.done || false,
          timestamp: new Date(),
          tokenCount: 1, // Approximate
          context: chunk.context,
          metrics: {
            promptEvalDuration: chunk.prompt_eval_duration,
            evalDuration: chunk.eval_duration,
            totalDuration: chunk.total_duration
          }
        };

        buffer += streamChunk.content;
        session.chunks.push(streamChunk);
        session.totalTokens++;

        if (options.onChunk) {
          options.onChunk(streamChunk);
        }

        this.emit('stream:chunk', { sessionId, chunk: streamChunk });

        if (chunk.done) {
          clearTimeout(timer);
          
          if (options.onComplete) {
            options.onComplete({ content: buffer, context: chunk.context });
          }
          
          resolve({ content: buffer, context: chunk.context });
        }
      };

      // Set up listener for this specific session
      const chunkListener = (chunk: any) => {
        if (this.activeStreams.has(sessionId)) {
          handleChunk(chunk);
        }
      };

      this.client.on('stream:chunk', chunkListener);

      // Start the stream
      this.client.generate({
        model: options.model,
        prompt: options.prompt!,
        stream: true,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          stop: options.stopSequences
        }
      }).catch((error) => {
        clearTimeout(timer);
        this.client.removeListener('stream:chunk', chunkListener);
        reject(error);
      });
    });
  }

  private async streamChat(sessionId: string, options: StreamOptions): Promise<any> {
    const session = this.sessions.get(sessionId)!;
    let buffer = '';

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 60000;
      const timer = setTimeout(() => {
        this.cancelStream(sessionId);
        reject(new Error('Stream timeout'));
      }, timeout);

      const handleChunk = (chunk: any) => {
        clearTimeout(timer);
        
        const streamChunk: StreamChunk = {
          id: `${sessionId}_${session.chunks.length}`,
          model: options.model,
          content: chunk.message?.content || '',
          done: chunk.done || false,
          timestamp: new Date(),
          tokenCount: 1, // Approximate
          context: chunk.context,
          metrics: {
            promptEvalDuration: chunk.prompt_eval_duration,
            evalDuration: chunk.eval_duration,
            totalDuration: chunk.total_duration
          }
        };

        buffer += streamChunk.content;
        session.chunks.push(streamChunk);
        session.totalTokens++;

        if (options.onChunk) {
          options.onChunk(streamChunk);
        }

        this.emit('stream:chunk', { sessionId, chunk: streamChunk });

        if (chunk.done) {
          clearTimeout(timer);
          
          if (options.onComplete) {
            options.onComplete({ content: buffer, context: chunk.context });
          }
          
          resolve({ content: buffer, context: chunk.context });
        }
      };

      // Set up listener for this specific session
      const chunkListener = (chunk: any) => {
        if (this.activeStreams.has(sessionId)) {
          handleChunk(chunk);
        }
      };

      this.client.on('stream:chunk', chunkListener);

      // Start the stream
      this.client.chat({
        model: options.model,
        messages: options.messages!,
        stream: true,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
          stop: options.stopSequences
        }
      }).catch((error) => {
        clearTimeout(timer);
        this.client.removeListener('stream:chunk', chunkListener);
        reject(error);
      });
    });
  }

  private handleStreamChunk(chunk: any): void {
    // Global chunk handler for logging and monitoring
    this.emit('chunk:received', chunk);
  }

  cancelStream(sessionId: string): void {
    if (this.activeStreams.has(sessionId)) {
      this.activeStreams.delete(sessionId);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = "cancelled";
        session.endTime = new Date();
      }

      this.emit('stream:cancelled', { sessionId });
      this.cleanupSession(sessionId);
    }
  }

  cancelAllStreams(): void {
    for (const sessionId of this.activeStreams) {
      this.cancelStream(sessionId);
    }
  }

  private cleanupSession(sessionId: string): void {
    // Keep session in memory for a while for debugging
    setTimeout(() => {
      this.buffers.delete(sessionId);
      
      // Optional: Remove old sessions after some time
      const session = this.sessions.get(sessionId);
      if (session && session.endTime) {
        const age = Date.now() - session.endTime.getTime();
        if (age > 300000) { // 5 minutes
          this.sessions.delete(sessionId);
        }
      }
    }, 5000);
  }

  getSession(sessionId: string): StreamSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): StreamSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'active'
    );
  }

  getAllSessions(): StreamSession[] {
    return Array.from(this.sessions.values());
  }

  async bufferStream(options: StreamOptions & { 
    bufferSize?: number;
    flushInterval?: number;
  }): Promise<string> {
    const bufferSize = options.bufferSize || 10;
    const flushInterval = options.flushInterval || 1000;
    const chunks: string[] = [];
    let buffer = '';

    const flushBuffer = () => {
      if (buffer) {
        this.emit('buffer:flush', { content: buffer });
        buffer = '';
      }
    };

    const interval = setInterval(flushBuffer, flushInterval);

    try {
      const session = await this.stream({
        ...options,
        onChunk: (chunk) => {
          chunks.push(chunk.content);
          buffer += chunk.content;
          
          if (chunks.length >= bufferSize) {
            flushBuffer();
            chunks.length = 0;
          }
          
          if (options.onChunk) {
            options.onChunk(chunk);
          }
        }
      });

      clearInterval(interval);
      flushBuffer(); // Final flush
      
      return session.chunks.map(c => c.content).join('');
    } catch (error) {
      clearInterval(interval);
      throw error;
    }
  }

  getMetrics(): {
    activeSessions: number;
    totalSessions: number;
    totalTokensGenerated: number;
    averageTokensPerSession: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
    
    return {
      activeSessions: this.activeStreams.size,
      totalSessions: sessions.length,
      totalTokensGenerated: totalTokens,
      averageTokensPerSession: sessions.length > 0 ? totalTokens / sessions.length : 0
    };
  }

  clearSessions(): void {
    this.cancelAllStreams();
    this.sessions.clear();
    this.buffers.clear();
    this.emit('sessions:cleared');
  }
}

export default StreamHandler;