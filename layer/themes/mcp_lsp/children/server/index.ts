/**
 * LSP Server Implementation
 * Language Server Protocol server with MCP integration
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { MCPMessage, MCPRequest, MCPResponse, MCPNotification } from '../protocol';
import { Transport } from '../transport';

export interface ServerCapabilities {
  // Text document sync
  textDocumentSync?: {
    openClose?: boolean;
    change?: 'none' | 'full' | 'incremental';
    save?: boolean | { includeText?: boolean };
  };
  
  // Language features
  completionProvider?: {
    resolveProvider?: boolean;
    triggerCharacters?: string[];
    allCommitCharacters?: string[];
  };
  hoverProvider?: boolean | { workDoneProgress?: boolean };
  definitionProvider?: boolean | { workDoneProgress?: boolean };
  referencesProvider?: boolean | { workDoneProgress?: boolean };
  documentSymbolProvider?: boolean | { workDoneProgress?: boolean };
  codeActionProvider?: boolean | {
    codeActionKinds?: string[];
    resolveProvider?: boolean;
  };
  documentFormattingProvider?: boolean | { workDoneProgress?: boolean };
  
  // MCP specific capabilities
  modelProvider?: {
    models: string[];
    contextWindow?: number;
    streaming?: boolean;
  };
  contextProvider?: {
    maxContextSize?: number;
    supportedFormats?: string[];
  };
}

export interface ServerOptions {
  name?: string;
  version?: string;
  capabilities?: ServerCapabilities;
  maxConnections?: number;
  requestTimeout?: number;
  workspaceRoot?: string;
  trace?: 'off' | 'messages' | 'verbose';
}

export interface ServerConfig {
  transport: Transport;
  options?: ServerOptions;
}

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

interface Connection {
  id: string;
  transport: Transport;
  initialized: boolean;
  capabilities?: any;
  documents: Map<string, TextDocument>;
}

interface TextDocument {
  uri: string;
  languageId: string;
  version: number;
  content: string;
}

export class LSPServer extends EventEmitter {
  private config: ServerConfig;
  private status: ServerStatus;
  private connections: Map<string, Connection>;
  private handlers: Map<string, MessageHandler>;
  private requestCounter: number;
  private capabilities: ServerCapabilities;

  constructor(config: ServerConfig) {
    super();
    this.config = config;
    this.status = 'stopped';
    this.connections = new Map();
    this.handlers = new Map();
    this.requestCounter = 0;
    this.capabilities = config.options?.capabilities || this.getDefaultCapabilities();
    
    this.registerDefaultHandlers();
  }

  async start(): Promise<void> {
    if (this.status !== 'stopped') {
      throw new Error(`Server is already ${this.status}`);
    }

    this.status = 'starting';
    
    try {
      await this.config.transport.start();
      
      this.config.transport.on('connection', (transport: Transport) => {
        this.handleNewConnection(transport);
      });
      
      this.config.transport.on('error', (error: Error) => {
        this.emit('error', error);
      });
      
      this.status = 'running';
      this.emit('started');
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.status !== 'running') {
      return;
    }

    this.status = 'stopping';
    
    // Close all connections
    for (const [id, connection] of this.connections) {
      await this.closeConnection(id);
    }
    
    await this.config.transport.stop();
    
    this.status = 'stopped';
    this.emit('stopped');
  }

  private handleNewConnection(transport: Transport): void {
    const connectionId = this.generateConnectionId();
    
    const connection: Connection = {
      id: connectionId,
      transport,
      initialized: false,
      documents: new Map(),
    };
    
    this.connections.set(connectionId, connection);
    
    transport.on('message', (message: MCPMessage) => {
      this.handleMessage(connectionId, message);
    });
    
    transport.on('close', () => {
      this.closeConnection(connectionId);
    });
    
    transport.on('error', (error: Error) => {
      this.emit('connectionError', { connectionId, error });
    });
    
    this.emit('connection', { connectionId });
  }

  private async handleMessage(connectionId: string, message: MCPMessage): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.emit('message', { connectionId, message });
    
    if (message.type === 'request') {
      await this.handleRequest(connection, message as MCPRequest);
    } else if (message.type === 'notification') {
      await this.handleNotification(connection, message as MCPNotification);
    }
  }

  private async handleRequest(connection: Connection, request: MCPRequest): Promise<void> {
    const handler = this.handlers.get(request.method);
    
    if (!handler) {
      await this.sendError(connection, request.id, {
        code: -32601,
        message: `Method not found: ${request.method}`,
      });
      return;
    }
    
    try {
      const result = await handler(connection, request.params);
      await this.sendResponse(connection, request.id, result);
    } catch (error: any) {
      await this.sendError(connection, request.id, {
        code: -32603,
        message: error.message || 'Internal error',
        data: error,
      });
    }
  }

  private async handleNotification(connection: Connection, notification: MCPNotification): Promise<void> {
    const handler = this.handlers.get(notification.method);
    
    if (!handler) {
      // Notifications don't require a response
      return;
    }
    
    try {
      await handler(connection, notification.params);
    } catch (error) {
      this.emit('notificationError', { 
        connectionId: connection.id, 
        method: notification.method, 
        error 
      });
    }
  }

  private registerDefaultHandlers(): void {
    // Lifecycle handlers
    this.registerHandler('initialize', async (connection, params) => {
      connection.initialized = true;
      connection.capabilities = params.capabilities;
      
      return {
        capabilities: this.capabilities,
        serverInfo: {
          name: this.config.options?.name || 'MCP-LSP Server',
          version: this.config.options?.version || '1.0.0',
        },
      };
    });
    
    this.registerHandler('initialized', async (connection) => {
      this.emit('initialized', { connectionId: connection.id });
    });
    
    this.registerHandler('shutdown', async (connection) => {
      // Prepare for shutdown
      connection.documents.clear();
      return null;
    });
    
    this.registerHandler('exit', async (connection) => {
      await this.closeConnection(connection.id);
    });
    
    // Document synchronization handlers
    this.registerHandler('textDocument/didOpen', async (connection, params) => {
      const { textDocument } = params;
      const doc: TextDocument = {
        uri: textDocument.uri,
        languageId: textDocument.languageId,
        version: textDocument.version,
        content: textDocument.text,
      };
      
      connection.documents.set(textDocument.uri, doc);
      this.emit('documentOpened', { connectionId: connection.id, document: doc });
    });
    
    this.registerHandler('textDocument/didChange', async (connection, params) => {
      const { textDocument, contentChanges } = params;
      const doc = connection.documents.get(textDocument.uri);
      
      if (doc) {
        doc.version = textDocument.version;
        
        // Apply changes based on sync type
        if (this.capabilities.textDocumentSync?.change === 'full') {
          doc.content = contentChanges[0].text;
        } else if (this.capabilities.textDocumentSync?.change === 'incremental') {
          // Apply incremental changes
          for (const change of contentChanges) {
            this.applyIncrementalChange(doc, change);
          }
        }
        
        this.emit('documentChanged', { connectionId: connection.id, document: doc });
      }
    });
    
    this.registerHandler('textDocument/didSave', async (connection, params) => {
      const doc = connection.documents.get(params.textDocument.uri);
      if (doc) {
        this.emit('documentSaved', { connectionId: connection.id, document: doc });
      }
    });
    
    this.registerHandler('textDocument/didClose', async (connection, params) => {
      connection.documents.delete(params.textDocument.uri);
      this.emit('documentClosed', { 
        connectionId: connection.id, 
        uri: params.textDocument.uri 
      });
    });
    
    // MCP specific handlers
    this.registerHandler('model/request', async (connection, params) => {
      this.emit('modelRequest', { 
        connectionId: connection.id, 
        params 
      });
      
      // Return a placeholder response
      return {
        model: params.model || 'default',
        response: 'Model response placeholder',
        tokens: 0,
      };
    });
    
    this.registerHandler('context/update', async (connection, params) => {
      this.emit('contextUpdate', { 
        connectionId: connection.id, 
        context: params 
      });
    });
    
    this.registerHandler('capability/query', async () => {
      return this.capabilities;
    });
  }

  registerHandler(method: string, handler: MessageHandler): void {
    this.handlers.set(method, handler);
  }

  unregisterHandler(method: string): void {
    this.handlers.delete(method);
  }

  async sendRequest(connectionId: string, method: string, params?: any): Promise<any> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    const id = ++this.requestCounter;
    const request: MCPRequest = {
      type: 'request',
      id,
      method,
      params,
    };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.options?.requestTimeout || 30000);
      
      const responseHandler = (message: MCPMessage) => {
        if (message.type === 'response' && message.id === id) {
          clearTimeout(timeout);
          connection.transport.off('message', responseHandler);
          
          if ('error' in message) {
            reject(message.error);
          } else {
            resolve(message.result);
          }
        }
      };
      
      connection.transport.on('message', responseHandler);
      connection.transport.send(request);
    });
  }

  async sendNotification(connectionId: string, method: string, params?: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    const notification: MCPNotification = {
      type: 'notification',
      method,
      params,
    };
    
    await connection.transport.send(notification);
  }

  private async sendResponse(connection: Connection, id: number, result: any): Promise<void> {
    const response: MCPResponse = {
      type: 'response',
      id,
      result,
    };
    
    await connection.transport.send(response);
  }

  private async sendError(connection: Connection, id: number, error: any): Promise<void> {
    const response: MCPResponse = {
      type: 'response',
      id,
      error,
    };
    
    await connection.transport.send(response);
  }

  private applyIncrementalChange(doc: TextDocument, change: any): void {
    if (!change.range) {
      // Full document change
      doc.content = change.text;
      return;
    }
    
    // Convert position to offset
    const lines = doc.content.split('\n');
    const startOffset = this.positionToOffset(lines, change.range.start);
    const endOffset = this.positionToOffset(lines, change.range.end);
    
    // Apply the change
    doc.content = 
      doc.content.substring(0, startOffset) +
      change.text +
      doc.content.substring(endOffset);
  }

  private positionToOffset(lines: string[], position: { line: number; character: number }): number {
    let offset = 0;
    
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    
    if (position.line < lines.length) {
      offset += Math.min(position.character, lines[position.line].length);
    }
    
    return offset;
  }

  private async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    await connection.transport.close();
    this.connections.delete(connectionId);
    this.emit('connectionClosed', { connectionId });
  }

  private generateConnectionId(): string {
    return `connection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultCapabilities(): ServerCapabilities {
    return {
      textDocumentSync: {
        openClose: true,
        change: 'full',
        save: true,
      },
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', ':', '/', '@'],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      codeActionProvider: true,
      documentFormattingProvider: true,
      modelProvider: {
        models: ['gpt-4', 'claude-3', 'llama-2'],
        contextWindow: 8192,
        streaming: true,
      },
      contextProvider: {
        maxContextSize: 32768,
        supportedFormats: ['text', 'markdown', 'code'],
      },
    };
  }

  getStatus(): ServerStatus {
    return this.status;
  }

  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }
}

type MessageHandler = (connection: Connection, params?: any) => Promise<any>;

export default LSPServer;