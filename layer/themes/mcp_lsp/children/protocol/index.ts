/**
 * MCP Protocol Implementation
 * Model Context Protocol message types and handlers
 */

export type ProtocolVersion = '1.0' | '2.0';

export interface MCPMessage {
  type: 'request' | 'response' | 'notification' | 'error';
  jsonrpc?: '2.0';
}

export interface MCPRequest extends MCPMessage {
  type: 'request';
  id: number | string;
  method: string;
  params?: any;
}

export interface MCPResponse extends MCPMessage {
  type: 'response';
  id: number | string;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification extends MCPMessage {
  type: 'notification';
  method: string;
  params?: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export class MCPProtocol {
  private version: ProtocolVersion;
  private strict: boolean;

  constructor(version: ProtocolVersion = '1.0', strict: boolean = true) {
    this.version = version;
    this.strict = strict;
  }

  parse(data: string | Buffer): MCPMessage {
    let json: any;
    
    try {
      const str = typeof data === 'string' ? data : data.toString('utf8');
      json = JSON.parse(str);
    } catch (error) {
      throw new ProtocolError('Invalid JSON', -32700, error);
    }

    return this.validateMessage(json);
  }

  format(message: MCPMessage): string {
    const validated = this.validateMessage(message);
    return JSON.stringify(validated);
  }

  validateMessage(message: any): MCPMessage {
    if (!message || typeof message !== 'object') {
      throw new ProtocolError('Invalid message format', -32600);
    }

    // Add JSON-RPC version if not present
    if (!message.jsonrpc) {
      message.jsonrpc = '2.0';
    }

    // Determine message type
    if ('method' in message && 'id' in message) {
      return this.validateRequest(message);
    } else if ('result' in message || 'error' in message) {
      return this.validateResponse(message);
    } else if ('method' in message) {
      return this.validateNotification(message);
    } else {
      throw new ProtocolError('Unknown message type', -32600);
    }
  }

  private validateRequest(message: any): MCPRequest {
    if (!message.method || typeof message.method !== 'string') {
      throw new ProtocolError('Invalid request: missing method', -32600);
    }

    if (message.id === null || message.id === undefined) {
      throw new ProtocolError('Invalid request: missing id', -32600);
    }

    return {
      type: 'request',
      jsonrpc: message.jsonrpc,
      id: message.id,
      method: message.method,
      params: message.params,
    };
  }

  private validateResponse(message: any): MCPResponse {
    if (message.id === null || message.id === undefined) {
      throw new ProtocolError('Invalid response: missing id', -32600);
    }

    if ('result' in message && 'error' in message) {
      throw new ProtocolError('Invalid response: both result and error present', -32600);
    }

    if (!('result' in message) && !('error' in message)) {
      throw new ProtocolError('Invalid response: neither result nor error present', -32600);
    }

    if (message.error) {
      this.validateError(message.error);
    }

    return {
      type: 'response',
      jsonrpc: message.jsonrpc,
      id: message.id,
      result: message.result,
      error: message.error,
    };
  }

  private validateNotification(message: any): MCPNotification {
    if (!message.method || typeof message.method !== 'string') {
      throw new ProtocolError('Invalid notification: missing method', -32600);
    }

    if ('id' in message) {
      throw new ProtocolError('Invalid notification: id should not be present', -32600);
    }

    return {
      type: 'notification',
      jsonrpc: message.jsonrpc,
      method: message.method,
      params: message.params,
    };
  }

  private validateError(error: any): void {
    if (!error || typeof error !== 'object') {
      throw new ProtocolError('Invalid error format', -32600);
    }

    if (typeof error.code !== 'number') {
      throw new ProtocolError('Invalid error: code must be a number', -32600);
    }

    if (typeof error.message !== 'string') {
      throw new ProtocolError('Invalid error: message must be a string', -32600);
    }
  }

  createRequest(method: string, params?: any, id?: number | string): MCPRequest {
    return {
      type: 'request',
      jsonrpc: '2.0',
      id: id || Date.now(),
      method,
      params,
    };
  }

  createResponse(id: number | string, result?: any, error?: MCPError): MCPResponse {
    if (result !== undefined && error !== undefined) {
      throw new Error('Cannot have both result and error in response');
    }

    return {
      type: 'response',
      jsonrpc: '2.0',
      id,
      result,
      error,
    };
  }

  createNotification(method: string, params?: any): MCPNotification {
    return {
      type: 'notification',
      jsonrpc: '2.0',
      method,
      params,
    };
  }

  createError(code: number, message: string, data?: any): MCPError {
    return {
      code,
      message,
      data,
    };
  }

  // Common error codes
  static readonly ErrorCodes = {
    // JSON-RPC errors
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    
    // LSP errors
    SERVER_NOT_INITIALIZED: -32002,
    UNKNOWN_ERROR_CODE: -32001,
    
    // Request errors
    REQUEST_CANCELLED: -32800,
    CONTENT_MODIFIED: -32801,
    
    // MCP specific errors
    MODEL_NOT_AVAILABLE: -33000,
    CONTEXT_TOO_LARGE: -33001,
    RATE_LIMIT_EXCEEDED: -33002,
    AUTHENTICATION_FAILED: -33003,
  };

  isRequest(message: MCPMessage): message is MCPRequest {
    return message.type === 'request';
  }

  isResponse(message: MCPMessage): message is MCPResponse {
    return message.type === 'response';
  }

  isNotification(message: MCPMessage): message is MCPNotification {
    return message.type === 'notification';
  }

  isError(message: MCPMessage): boolean {
    return message.type === 'response' && 'error' in message && message.error !== undefined;
  }

  getVersion(): ProtocolVersion {
    return this.version;
  }

  setVersion(version: ProtocolVersion): void {
    this.version = version;
  }

  isStrict(): boolean {
    return this.strict;
  }

  setStrict(strict: boolean): void {
    this.strict = strict;
  }
}

export class ProtocolError extends Error {
  code: number;
  data?: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.data = data;
  }

  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

export class MessageBuilder {
  private protocol: MCPProtocol;
  private messages: MCPMessage[];

  constructor(protocol: MCPProtocol = new MCPProtocol()) {
    this.protocol = protocol;
    this.messages = [];
  }

  addRequest(method: string, params?: any, id?: number | string): this {
    this.messages.push(this.protocol.createRequest(method, params, id));
    return this;
  }

  addResponse(id: number | string, result?: any, error?: MCPError): this {
    this.messages.push(this.protocol.createResponse(id, result, error));
    return this;
  }

  addNotification(method: string, params?: any): this {
    this.messages.push(this.protocol.createNotification(method, params));
    return this;
  }

  addError(id: number | string, code: number, message: string, data?: any): this {
    const error = this.protocol.createError(code, message, data);
    this.messages.push(this.protocol.createResponse(id, undefined, error));
    return this;
  }

  build(): MCPMessage[] {
    return [...this.messages];
  }

  buildSingle(): MCPMessage | undefined {
    return this.messages[0];
  }

  clear(): void {
    this.messages = [];
  }
}

export class MessageRouter {
  private handlers: Map<string, MessageHandler>;
  private defaultHandler?: MessageHandler;

  constructor() {
    this.handlers = new Map();
  }

  register(method: string, handler: MessageHandler): void {
    this.handlers.set(method, handler);
  }

  unregister(method: string): void {
    this.handlers.delete(method);
  }

  setDefault(handler: MessageHandler): void {
    this.defaultHandler = handler;
  }

  async route(message: MCPMessage, context?: any): Promise<any> {
    if (message.type === 'request' || message.type === 'notification') {
      const method = (message as MCPRequest | MCPNotification).method;
      const handler = this.handlers.get(method) || this.defaultHandler;
      
      if (!handler) {
        throw new ProtocolError(
          `No handler for method: ${method}`,
          MCPProtocol.ErrorCodes.METHOD_NOT_FOUND
        );
      }
      
      return await handler(message, context);
    }
    
    throw new ProtocolError(
      'Cannot route response messages',
      MCPProtocol.ErrorCodes.INVALID_REQUEST
    );
  }

  hasHandler(method: string): boolean {
    return this.handlers.has(method);
  }

  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

type MessageHandler = (message: MCPMessage, context?: any) => Promise<any>;

export default MCPProtocol;