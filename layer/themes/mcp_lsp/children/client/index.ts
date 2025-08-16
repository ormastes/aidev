/**
 * LSP Client Implementation
 * Language Server Protocol client with MCP integration
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { MCPMessage, MCPRequest, MCPResponse, MCPNotification } from '../protocol';
import { Transport } from '../transport';

export interface ClientCapabilities {
  workspace?: {
    applyEdit?: boolean;
    workspaceEdit?: {
      documentChanges?: boolean;
      resourceOperations?: string[];
      failureHandling?: string;
    };
    didChangeConfiguration?: { dynamicRegistration?: boolean };
    didChangeWatchedFiles?: { dynamicRegistration?: boolean };
    symbol?: { dynamicRegistration?: boolean };
    executeCommand?: { dynamicRegistration?: boolean };
  };
  
  textDocument?: {
    synchronization?: {
      dynamicRegistration?: boolean;
      willSave?: boolean;
      willSaveWaitUntil?: boolean;
      didSave?: boolean;
    };
    completion?: {
      dynamicRegistration?: boolean;
      completionItem?: {
        snippetSupport?: boolean;
        commitCharactersSupport?: boolean;
        documentationFormat?: string[];
        deprecatedSupport?: boolean;
        preselectSupport?: boolean;
      };
      completionItemKind?: { valueSet?: number[] };
      contextSupport?: boolean;
    };
    hover?: {
      dynamicRegistration?: boolean;
      contentFormat?: string[];
    };
    definition?: { dynamicRegistration?: boolean; linkSupport?: boolean };
    references?: { dynamicRegistration?: boolean };
    documentSymbol?: {
      dynamicRegistration?: boolean;
      symbolKind?: { valueSet?: number[] };
      hierarchicalDocumentSymbolSupport?: boolean;
    };
    codeAction?: {
      dynamicRegistration?: boolean;
      codeActionLiteralSupport?: {
        codeActionKind: { valueSet: string[] };
      };
      isPreferredSupport?: boolean;
    };
    formatting?: { dynamicRegistration?: boolean };
  };
  
  // MCP specific capabilities
  model?: {
    streaming?: boolean;
    contextWindow?: number;
    supportedModels?: string[];
  };
  context?: {
    maxSize?: number;
    formats?: string[];
  };
}

export interface ClientOptions {
  name?: string;
  version?: string;
  rootUri?: string;
  workspaceFolders?: WorkspaceFolder[];
  capabilities?: ClientCapabilities;
  trace?: 'off' | 'messages' | 'verbose';
  locale?: string;
}

export interface ClientConfig {
  transport: Transport;
  options?: ClientOptions;
}

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'initializing'
  | 'initialized'
  | 'shutting_down'
  | 'error';

interface WorkspaceFolder {
  uri: string;
  name: string;
}

interface PendingRequest {
  method: string;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

export class LSPClient extends EventEmitter {
  private config: ClientConfig;
  private state: ConnectionState;
  private requestCounter: number;
  private pendingRequests: Map<number, PendingRequest>;
  private serverCapabilities?: any;
  private openDocuments: Map<string, DocumentState>;

  constructor(config: ClientConfig) {
    super();
    this.config = config;
    this.state = 'disconnected';
    this.requestCounter = 0;
    this.pendingRequests = new Map();
    this.openDocuments = new Map();
    
    this.setupTransportHandlers();
  }

  async connect(): Promise<void> {
    if (this.state !== 'disconnected') {
      throw new Error(`Client is already ${this.state}`);
    }

    this.state = 'connecting';
    
    try {
      await this.config.transport.connect();
      this.state = 'connected';
      this.emit('connected');
      
      // Initialize the connection
      await this.initialize();
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.state === 'disconnected') {
      return;
    }

    if (this.state === 'initialized') {
      await this.shutdown();
    }

    await this.config.transport.close();
    this.state = 'disconnected';
    
    // Cancel all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
    
    this.emit('disconnected');
  }

  private setupTransportHandlers(): void {
    this.config.transport.on('message', (message: MCPMessage) => {
      this.handleMessage(message);
    });
    
    this.config.transport.on('close', () => {
      this.state = 'disconnected';
      this.emit('disconnected');
    });
    
    this.config.transport.on('error', (error: Error) => {
      this.emit('error', error);
    });
  }

  private handleMessage(message: MCPMessage): void {
    this.emit('message', message);
    
    if (message.type === 'response') {
      this.handleResponse(message as MCPResponse);
    } else if (message.type === 'request') {
      this.handleServerRequest(message as MCPRequest);
    } else if (message.type === 'notification') {
      this.handleServerNotification(message as MCPNotification);
    }
  }

  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;
    
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);
    
    if ('error' in response) {
      pending.reject(response.error);
    } else {
      pending.resolve(response.result);
    }
  }

  private async handleServerRequest(request: MCPRequest): Promise<void> {
    // Handle server-initiated requests (e.g., workspace/applyEdit)
    try {
      let result: any = null;
      
      switch (request.method) {
        case 'workspace/applyEdit':
          result = await this.handleApplyEdit(request.params);
          break;
        case 'window/showMessage':
          this.emit('showMessage', request.params);
          break;
        case 'window/showMessageRequest':
          result = await this.handleShowMessageRequest(request.params);
          break;
        case 'window/logMessage':
          this.emit('logMessage', request.params);
          break;
        default:
          throw new Error(`Unknown server request: ${request.method}`);
      }
      
      await this.sendResponse(request.id, result);
    } catch (error: any) {
      await this.sendError(request.id, {
        code: -32603,
        message: error.message || 'Internal error',
      });
    }
  }

  private handleServerNotification(notification: MCPNotification): void {
    switch (notification.method) {
      case 'textDocument/publishDiagnostics':
        this.emit('diagnostics', notification.params);
        break;
      case 'window/showMessage':
        this.emit('showMessage', notification.params);
        break;
      case 'window/logMessage':
        this.emit('logMessage', notification.params);
        break;
      case 'telemetry/event':
        this.emit('telemetry', notification.params);
        break;
      default:
        this.emit('notification', notification);
    }
  }

  private async initialize(): Promise<void> {
    this.state = 'initializing';
    
    const params = {
      processId: process.pid,
      clientInfo: {
        name: this.config.options?.name || 'MCP-LSP Client',
        version: this.config.options?.version || '1.0.0',
      },
      locale: this.config.options?.locale || 'en-US',
      rootUri: this.config.options?.rootUri || null,
      workspaceFolders: this.config.options?.workspaceFolders || null,
      capabilities: this.config.options?.capabilities || this.getDefaultCapabilities(),
      trace: this.config.options?.trace || 'off',
    };
    
    const result = await this.sendRequest('initialize', params);
    this.serverCapabilities = result.capabilities;
    
    // Send initialized notification
    await this.sendNotification('initialized', {});
    
    this.state = 'initialized';
    this.emit('initialized', this.serverCapabilities);
  }

  private async shutdown(): Promise<void> {
    this.state = 'shutting_down';
    await this.sendRequest('shutdown', null);
    await this.sendNotification('exit', null);
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    const id = ++this.requestCounter;
    
    const request: MCPRequest = {
      type: 'request',
      id,
      method,
      params,
    };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);
      
      this.pendingRequests.set(id, {
        method,
        resolve,
        reject,
        timeout,
      });
      
      this.config.transport.send(request).catch(reject);
    });
  }

  async sendNotification(method: string, params?: any): Promise<void> {
    const notification: MCPNotification = {
      type: 'notification',
      method,
      params,
    };
    
    await this.config.transport.send(notification);
  }

  private async sendResponse(id: number, result: any): Promise<void> {
    const response: MCPResponse = {
      type: 'response',
      id,
      result,
    };
    
    await this.config.transport.send(response);
  }

  private async sendError(id: number, error: any): Promise<void> {
    const response: MCPResponse = {
      type: 'response',
      id,
      error,
    };
    
    await this.config.transport.send(response);
  }

  // Document management
  async openDocument(uri: string, languageId: string, content: string): Promise<void> {
    const version = 1;
    
    this.openDocuments.set(uri, {
      uri,
      languageId,
      version,
      content,
    });
    
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text: content,
      },
    });
  }

  async changeDocument(uri: string, changes: any[]): Promise<void> {
    const doc = this.openDocuments.get(uri);
    if (!doc) {
      throw new Error(`Document not open: ${uri}`);
    }
    
    doc.version++;
    
    // Apply changes locally
    for (const change of changes) {
      if (change.range) {
        // Incremental change
        doc.content = this.applyChange(doc.content, change);
      } else {
        // Full document change
        doc.content = change.text;
      }
    }
    
    await this.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version: doc.version,
      },
      contentChanges: changes,
    });
  }

  async saveDocument(uri: string): Promise<void> {
    const doc = this.openDocuments.get(uri);
    if (!doc) {
      throw new Error(`Document not open: ${uri}`);
    }
    
    await this.sendNotification('textDocument/didSave', {
      textDocument: { uri },
      text: doc.content,
    });
  }

  async closeDocument(uri: string): Promise<void> {
    if (!this.openDocuments.has(uri)) {
      throw new Error(`Document not open: ${uri}`);
    }
    
    this.openDocuments.delete(uri);
    
    await this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  // Language features
  async getCompletion(uri: string, position: Position): Promise<any> {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position,
    });
  }

  async getHover(uri: string, position: Position): Promise<any> {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position,
    });
  }

  async getDefinition(uri: string, position: Position): Promise<any> {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position,
    });
  }

  async getReferences(uri: string, position: Position, includeDeclaration: boolean = true): Promise<any> {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position,
      context: { includeDeclaration },
    });
  }

  async getDocumentSymbols(uri: string): Promise<any> {
    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri },
    });
  }

  async getCodeActions(uri: string, range: Range, diagnostics: any[] = []): Promise<any> {
    return this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context: { diagnostics },
    });
  }

  formatDocument(uri: string, options?: FormattingOptions): Promise<any> {
    return this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options: options || { tabSize: 2, insertSpaces: true },
    });
  }

  // MCP specific methods
  async sendModelRequest(model: string, prompt: string, context?: any): Promise<any> {
    return this.sendRequest('model/request', {
      model,
      prompt,
      context,
    });
  }

  async updateContext(context: any): Promise<void> {
    await this.sendNotification('context/update', context);
  }

  async queryCapabilities(): Promise<any> {
    return this.sendRequest('capability/query', {});
  }

  private async handleApplyEdit(params: any): Promise<{ applied: boolean }> {
    // Implement workspace edit application
    this.emit('applyEdit', params);
    return { applied: true };
  }

  private async handleShowMessageRequest(params: any): Promise<any> {
    // Implement message request handling
    this.emit('showMessageRequest', params);
    return null;
  }

  private applyChange(content: string, change: any): string {
    // Simple implementation - should be enhanced for production
    const lines = content.split('\n');
    const startLine = change.range.start.line;
    const endLine = change.range.end.line;
    
    if (startLine === endLine) {
      const line = lines[startLine];
      lines[startLine] = 
        line.substring(0, change.range.start.character) +
        change.text +
        line.substring(change.range.end.character);
    } else {
      // Multi-line change
      const startText = lines[startLine].substring(0, change.range.start.character);
      const endText = lines[endLine].substring(change.range.end.character);
      const newLines = change.text.split('\n');
      
      newLines[0] = startText + newLines[0];
      newLines[newLines.length - 1] += endText;
      
      lines.splice(startLine, endLine - startLine + 1, ...newLines);
    }
    
    return lines.join('\n');
  }

  private getDefaultCapabilities(): ClientCapabilities {
    return {
      workspace: {
        applyEdit: true,
        workspaceEdit: {
          documentChanges: true,
        },
        didChangeConfiguration: { dynamicRegistration: true },
        didChangeWatchedFiles: { dynamicRegistration: true },
      },
      textDocument: {
        synchronization: {
          dynamicRegistration: true,
          willSave: true,
          willSaveWaitUntil: true,
          didSave: true,
        },
        completion: {
          dynamicRegistration: true,
          completionItem: {
            snippetSupport: true,
            commitCharactersSupport: true,
            documentationFormat: ['markdown', 'plaintext'],
            deprecatedSupport: true,
            preselectSupport: true,
          },
          contextSupport: true,
        },
        hover: {
          dynamicRegistration: true,
          contentFormat: ['markdown', 'plaintext'],
        },
        definition: { dynamicRegistration: true, linkSupport: true },
        references: { dynamicRegistration: true },
        documentSymbol: {
          dynamicRegistration: true,
          hierarchicalDocumentSymbolSupport: true,
        },
        codeAction: {
          dynamicRegistration: true,
          codeActionLiteralSupport: {
            codeActionKind: { valueSet: ['quickfix', 'refactor', 'source'] },
          },
          isPreferredSupport: true,
        },
        formatting: { dynamicRegistration: true },
      },
      model: {
        streaming: true,
        contextWindow: 8192,
        supportedModels: ['gpt-4', 'claude-3', 'llama-2'],
      },
      context: {
        maxSize: 32768,
        formats: ['text', 'markdown', 'code'],
      },
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  getServerCapabilities(): any {
    return this.serverCapabilities;
  }

  isInitialized(): boolean {
    return this.state === 'initialized';
  }
}

interface DocumentState {
  uri: string;
  languageId: string;
  version: number;
  content: string;
}

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
}

export default LSPClient;