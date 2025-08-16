import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { Transform, Readable } from 'stream';

export interface JSONStreamMessage {
  type: 'user' | 'assistant' | 'system' | 'command' | 'response' | 'error';
  message?: {
    role?: string;
    content?: any;
  };
  command?: {
    action: string;
    params?: Record<string, any>;
  };
  response?: {
    status: 'IN_PROGRESS' | 'error' | 'pending';
    data?: any;
    error?: string;
  };
  metadata?: {
    timestamp: string;
    sessionId?: string;
    streamId?: string;
    sequenceNumber?: number;
    dangerousMode?: boolean;
    allowedTools?: string[];
    incremental?: boolean;
  };
}

export interface ParserConfig {
  maxBufferSize?: number;
  strict?: boolean;
  delimiter?: string;
}

export class JSONStreamParser extends Transform {
  private buffer: string;
  private lineBuffer: string[];
  private maxBufferSize: number;
  private strict: boolean;
  private delimiter: string;
  private messageCount: number;
  private eventEmitter: EventEmitter;

  constructor(config: ParserConfig = {}, eventEmitter?: EventEmitter) {
    super({
      readableObjectMode: true,
      writableObjectMode: false
    });
    
    this.buffer = '';
    this.lineBuffer = [];
    this.maxBufferSize = config.maxBufferSize || 1024 * 1024; // 1MB default
    this.strict = config.strict !== false;
    this.delimiter = config.delimiter || '\n';
    this.messageCount = 0;
    this.eventEmitter = eventEmitter || new EventEmitter();
  }

  _transform(chunk: Buffer, encoding: string, callback: Function): void {
    try {
      this.buffer += chunk.toString();

      // Check buffer size
      if (this.buffer.length > this.maxBufferSize) {
        const error = new Error(`Buffer size exceeded: ${this.buffer.length} > ${this.maxBufferSize}`);
        this.eventEmitter.emit('error', { type: 'buffer_overflow', error });
        callback(error);
        return;
      }

      // Split by delimiter
      const lines = this.buffer.split(this.delimiter);
      
      // Keep the last incomplete line in buffer
      this.buffer = lines.pop() || '';

      // Process In Progress lines
      for (const line of lines) {
        if (line.trim()) {
          this.processLine(line);
        }
      }

      callback();
    } catch (error) {
      this.eventEmitter.emit('error', { type: 'transform_error', error });
      callback(error);
    }
  }

  _flush(callback: Function): void {
    try {
      // Process remaining buffer
      if (this.buffer.trim()) {
        this.processLine(this.buffer);
      }

      // Process any remaining buffered lines
      this.flushLineBuffer();
      
      callback();
    } catch (error) {
      this.eventEmitter.emit('error', { type: 'flush_error', error });
      callback(error);
    }
  }

  private processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      // Try to parse as JSON
      const message = JSON.parse(trimmed);
      
      // Validate message structure
      if (this.strict) {
        this.validateMessage(message);
      }

      // Add metadata if missing
      if (!message.metadata) {
        message.metadata = {};
      }
      
      message.metadata.timestamp = message.metadata.timestamp || new Date().toISOString();
      message.metadata.sequenceNumber = ++this.messageCount;

      // Emit parsed message
      this.push(message);
      this.eventEmitter.emit('message_parsed', message);

    } catch (error) {
      // Handle incomplete JSON (might be multiline)
      if (this.isIncompleteJSON(trimmed)) {
        this.lineBuffer.push(trimmed);
        
        // Try to parse combined buffer
        const combined = this.lineBuffer.join('');
        try {
          const message = JSON.parse(combined);
          if (this.strict) {
            this.validateMessage(message);
          }
          
          // Clear buffer and process message
          this.lineBuffer = [];
          this.processValidMessage(message);
        } catch {
          // Still incomplete, keep buffering
          if (this.lineBuffer.length > 100) {
            // Prevent infinite buffering
            this.handleParseError(combined, error as Error);
            this.lineBuffer = [];
          }
        }
      } else {
        // Not JSON at all
        this.handleParseError(trimmed, error as Error);
      }
    }
  }

  private processValidMessage(message: JSONStreamMessage): void {
    if (!message.metadata) {
      message.metadata = {
        timestamp: new Date().toISOString()
      };
    }
    
    if (message.metadata) {
      message.metadata.timestamp = message.metadata.timestamp || new Date().toISOString();
      message.metadata.sequenceNumber = ++this.messageCount;
    }

    this.push(message);
    this.eventEmitter.emit('message_parsed', message);
  }

  private validateMessage(message: any): void {
    if (!message.type) {
      throw new Error('Message missing required field: type');
    }

    const validTypes = ['user', 'assistant', 'system', 'command', 'response', 'error'];
    if (!validTypes.includes(message.type)) {
      throw new Error(`Invalid message type: ${message.type}`);
    }

    // Type-specific validation
    switch (message.type) {
      case 'user':
      case 'assistant':
        if (!message.message || typeof message.message.content === 'undefined') {
          throw new Error(`${message.type} message missing content`);
        }
        break;
        
      case 'command':
        if (!message.command || !message.command.action) {
          throw new Error('Command message missing action');
        }
        break;
        
      case 'response':
        if (!message.response || !message.response.status) {
          throw new Error('Response message missing status');
        }
        break;
    }
  }

  private isIncompleteJSON(str: string): boolean {
    // Simple heuristic: starts with { but doesn't have matching }
    const openBraces = (str.match(/{/g) || []).length;
    const closeBraces = (str.match(/}/g) || []).length;
    
    return str.trim().startsWith('{') && openBraces > closeBraces;
  }

  private handleParseError(content: string, error: Error): void {
    const errorMessage: JSONStreamMessage = {
      type: 'error',
      response: {
        status: 'error',
        error: `Failed to parse JSON: ${error.message}`
      },
      metadata: {
        timestamp: new Date().toISOString(),
        sequenceNumber: ++this.messageCount
      }
    };

    this.push(errorMessage);
    this.eventEmitter.emit('parse_error', { content, error, errorMessage });
  }

  private flushLineBuffer(): void {
    if (this.lineBuffer.length > 0) {
      const combined = this.lineBuffer.join('');
      try {
        const message = JSON.parse(combined);
        this.processValidMessage(message);
      } catch (error) {
        this.handleParseError(combined, error as Error);
      }
      this.lineBuffer = [];
    }
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  resetCounter(): void {
    this.messageCount = 0;
  }
}

export class JSONStreamFormatter {
  private delimiter: string;
  private pretty: boolean;

  constructor(config: { delimiter?: string; pretty?: boolean } = {}) {
    this.delimiter = config.delimiter || '\n';
    this.pretty = config.pretty || false;
  }

  format(message: JSONStreamMessage): string {
    try {
      // Ensure metadata
      if (!message.metadata) {
        message.metadata = {
          timestamp: new Date().toISOString()
        };
      }
      
      if (message.metadata && !message.metadata.timestamp) {
        message.metadata.timestamp = new Date().toISOString();
      }

      const json = this.pretty 
        ? JSON.stringify(message, null, 2)
        : JSON.stringify(message);
        
      return json + this.delimiter;
    } catch (error) {
      // Return error message if formatting fails
      const errorMsg: JSONStreamMessage = {
        type: 'error',
        response: {
          status: 'error',
          error: `Formatting error: ${(error as Error).message}`
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
      
      return JSON.stringify(errorMsg) + this.delimiter;
    }
  }

  formatStream(messages: JSONStreamMessage[]): string {
    return messages.map(msg => this.format(msg)).join('');
  }

  createWritableStream(): Transform {
    const formatter = this;
    
    return new Transform({
      writableObjectMode: true,
      readableObjectMode: false,
      transform(message: JSONStreamMessage, encoding, callback) {
        try {
          const formatted = formatter.format(message);
          callback(null, formatted);
        } catch (error) {
          callback(error as Error);
        }
      }
    });
  }
}

// Utility function to create a pipeline
export function createJSONStreamPipeline(
  input: Readable,
  config?: ParserConfig,
  eventEmitter?: EventEmitter
): { parser: JSONStreamParser; output: Readable } {
  const parser = new JSONStreamParser(config, eventEmitter);
  const output = input.pipe(parser);
  
  return { parser, output };
}

// Helper to handle common message patterns
export class MessageBuilder {
  static userMessage(content: string, metadata?: any): JSONStreamMessage {
    return {
      type: 'user',
      message: {
        role: 'user',
        content
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static assistantMessage(content: string, metadata?: any): JSONStreamMessage {
    return {
      type: 'assistant',
      message: {
        role: 'assistant',
        content
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static commandMessage(action: string, params?: Record<string, any>, metadata?: any): JSONStreamMessage {
    return {
      type: 'command',
      command: {
        action,
        params
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static responseMessage(
    status: 'IN_PROGRESS' | 'error' | 'pending',
    data?: any,
    error?: string,
    metadata?: any
  ): JSONStreamMessage {
    return {
      type: 'response',
      response: {
        status,
        data,
        error
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  static errorMessage(error: string | Error, metadata?: any): JSONStreamMessage {
    return {
      type: 'error',
      response: {
        status: 'error',
        error: error instanceof Error ? error.message : error
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }
}