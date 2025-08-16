/**
 * MCP Server Implementation
 * Model Context Protocol server for AI model communication
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'error';
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  timestamp: Date;
}

export interface MCPContext {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  tools: MCPTool[];
  resources: MCPResource[];
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  outputSchema?: object;
  handler: (params: any) => Promise<any>;
}

export interface MCPResource {
  uri: string;
  type: string;
  mimeType?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface MCPSession {
  id: string;
  clientId: string;
  context: MCPContext;
  connection: WebSocket;
  authenticated: boolean;
  permissions: string[];
  lastActivity: Date;
}

export interface MCPServerConfig {
  port?: number;
  host?: string;
  maxConnections?: number;
  authRequired?: boolean;
  heartbeatInterval?: number;
  requestTimeout?: number;
  enableLogging?: boolean;
}

export class MCPServer extends EventEmitter {
  private config: Required<MCPServerConfig>;
  private httpServer: HTTPServer;
  private wsServer: WebSocketServer;
  private sessions: Map<string, MCPSession> = new Map();
  private contexts: Map<string, MCPContext> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private handlers: Map<string, (params: any, session: MCPSession) => Promise<any>> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config?: MCPServerConfig) {
    super();
    this.config = {
      port: 8765,
      host: 'localhost',
      maxConnections: 100,
      authRequired: true,
      heartbeatInterval: 30000,
      requestTimeout: 30000,
      enableLogging: true,
      ...config
    };

    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });
    this.setupHandlers();
    this.registerBuiltInHandlers();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsServer.on('connection', this.handleConnection.bind(this));
      
      this.httpServer.listen(this.config.port, this.config.host, () => {
        this.log('info', `MCP Server listening on ${this.config.host}:${this.config.port}`);
        this.startHeartbeat();
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    this.stopHeartbeat();
    
    // Close all sessions
    for (const session of this.sessions.values()) {
      session.connection.close(1000, 'Server shutting down');
    }
    this.sessions.clear();

    // Close WebSocket server
    await new Promise<void>((resolve) => {
      this.wsServer.close(() => resolve());
    });

    // Close HTTP server
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve());
    });

    this.log('info', 'MCP Server stopped');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const sessionId = uuidv4();
    const clientId = request.headers['x-client-id'] || uuidv4();

    if (this.sessions.size >= this.config.maxConnections) {
      ws.close(1008, 'Maximum connections reached');
      return;
    }

    const session: MCPSession = {
      id: sessionId,
      clientId,
      context: this.createDefaultContext(),
      connection: ws,
      authenticated: !this.config.authRequired,
      permissions: [],
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    this.log('info', `New connection from client ${clientId} (session: ${sessionId})`);

    ws.on('message', (data) => this.handleMessage(data, session));
    ws.on('close', () => this.handleDisconnect(session));
    ws.on('error', (error) => this.handleError(error, session));
    ws.on('pong', () => {
      session.lastActivity = new Date();
    });

    // Send welcome message
    this.sendMessage(session, {
      id: uuidv4(),
      type: 'notification',
      method: 'welcome',
      params: {
        sessionId,
        version: '1.0.0',
        capabilities: this.getServerCapabilities(),
        authRequired: this.config.authRequired
      },
      timestamp: new Date()
    });

    this.emit('connection', session);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(data: any, session: MCPSession): Promise<void> {
    try {
      const message: MCPMessage = JSON.parse(data.toString());
      session.lastActivity = new Date();

      this.log('debug', `Received message: ${message.type} ${message.method || ''}`);

      if (message.type === 'request') {
        await this.handleRequest(message, session);
      } else if (message.type === 'notification') {
        await this.handleNotification(message, session);
      } else if (message.type === 'response') {
        this.emit('response', message, session);
      }
    } catch (error) {
      this.sendError(session, null, -32700, 'Parse error', error);
    }
  }

  /**
   * Handle request message
   */
  private async handleRequest(message: MCPMessage, session: MCPSession): Promise<void> {
    if (this.config.authRequired && !session.authenticated && message.method !== 'authenticate') {
      this.sendError(session, message.id, -32001, 'Authentication required');
      return;
    }

    const handler = this.handlers.get(message.method!);
    if (!handler) {
      this.sendError(session, message.id, -32601, 'Method not found');
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout);
      });

      const result = await Promise.race([
        handler(message.params, session),
        timeoutPromise
      ]);

      this.sendResponse(session, message.id, result);
    } catch (error: any) {
      this.sendError(session, message.id, -32603, 'Internal error', error.message);
    }
  }

  /**
   * Handle notification message
   */
  private async handleNotification(message: MCPMessage, session: MCPSession): Promise<void> {
    this.emit('notification', message, session);
    
    // Handle built-in notifications
    if (message.method === 'heartbeat') {
      session.lastActivity = new Date();
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(session: MCPSession): void {
    this.sessions.delete(session.id);
    this.log('info', `Client ${session.clientId} disconnected`);
    this.emit('disconnect', session);
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error, session: MCPSession): void {
    this.log('error', `WebSocket error for client ${session.clientId}: ${error.message}`);
    this.emit('error', error, session);
  }

  /**
   * Register built-in handlers
   */
  private registerBuiltInHandlers(): void {
    // Authentication handler
    this.registerHandler('authenticate', async (params: any, session: MCPSession) => {
      const { token, credentials } = params;
      
      // Implement your authentication logic here
      const authenticated = await this.authenticate(token, credentials);
      
      if (authenticated) {
        session.authenticated = true;
        session.permissions = ['read', 'write', 'execute'];
        return { authenticated: true, permissions: session.permissions };
      } else {
        throw new Error('Authentication failed');
      }
    });

    // List tools handler
    this.registerHandler('listTools', async (params: any, session: MCPSession) => {
      return Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema
      }));
    });

    // Execute tool handler
    this.registerHandler('executeTool', async (params: any, session: MCPSession) => {
      const { name, input } = params;
      const tool = this.tools.get(name);
      
      if (!tool) {
        throw new Error(`Tool '${name}' not found`);
      }

      if (!this.hasPermission(session, 'execute')) {
        throw new Error('Permission denied');
      }

      return await tool.handler(input);
    });

    // Get context handler
    this.registerHandler('getContext', async (params: any, session: MCPSession) => {
      return {
        id: session.context.id,
        name: session.context.name,
        description: session.context.description,
        metadata: session.context.metadata,
        resources: session.context.resources,
        capabilities: session.context.capabilities
      };
    });

    // Update context handler
    this.registerHandler('updateContext', async (params: any, session: MCPSession) => {
      const { metadata, resources } = params;
      
      if (metadata) {
        Object.assign(session.context.metadata, metadata);
      }
      
      if (resources) {
        session.context.resources = resources;
      }
      
      session.context.updatedAt = new Date();
      
      return { success: true, context: session.context };
    });

    // List sessions handler
    this.registerHandler('listSessions', async (params: any, session: MCPSession) => {
      if (!this.hasPermission(session, 'admin')) {
        throw new Error('Permission denied');
      }

      return Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        clientId: s.clientId,
        authenticated: s.authenticated,
        lastActivity: s.lastActivity
      }));
    });
  }

  /**
   * Register a request handler
   */
  registerHandler(method: string, handler: (params: any, session: MCPSession) => Promise<any>): void {
    this.handlers.set(method, handler);
    this.log('debug', `Registered handler for method: ${method}`);
  }

  /**
   * Register a tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.log('debug', `Registered tool: ${tool.name}`);
    this.emit('toolRegistered', tool);
  }

  /**
   * Create a context
   */
  createContext(name: string, description?: string): MCPContext {
    const context: MCPContext = {
      id: uuidv4(),
      name,
      description,
      metadata: {},
      tools: Array.from(this.tools.values()),
      resources: [],
      capabilities: this.getServerCapabilities(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.contexts.set(context.id, context);
    return context;
  }

  /**
   * Send message to client
   */
  private sendMessage(session: MCPSession, message: MCPMessage): void {
    if (session.connection.readyState === WebSocket.OPEN) {
      session.connection.send(JSON.stringify(message));
    }
  }

  /**
   * Send response to client
   */
  private sendResponse(session: MCPSession, requestId: string, result: any): void {
    this.sendMessage(session, {
      id: requestId,
      type: 'response',
      result,
      timestamp: new Date()
    });
  }

  /**
   * Send error to client
   */
  private sendError(session: MCPSession, requestId: string | null, code: number, message: string, data?: any): void {
    this.sendMessage(session, {
      id: requestId || uuidv4(),
      type: 'error',
      error: {
        code,
        message,
        data
      },
      timestamp: new Date()
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(method: string, params: any): void {
    const message: MCPMessage = {
      id: uuidv4(),
      type: 'notification',
      method,
      params,
      timestamp: new Date()
    };

    for (const session of this.sessions.values()) {
      this.sendMessage(session, message);
    }
  }

  /**
   * Setup WebSocket server handlers
   */
  private setupHandlers(): void {
    this.wsServer.on('error', (error) => {
      this.log('error', `WebSocket server error: ${error.message}`);
      this.emit('serverError', error);
    });
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [sessionId, session] of this.sessions) {
        const lastActivity = session.lastActivity.getTime();
        
        if (now - lastActivity > this.config.heartbeatInterval * 2) {
          // Connection seems dead, close it
          session.connection.close(1000, 'Connection timeout');
          this.sessions.delete(sessionId);
        } else {
          // Send ping
          session.connection.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  /**
   * Create default context
   */
  private createDefaultContext(): MCPContext {
    return {
      id: uuidv4(),
      name: 'default',
      description: 'Default MCP context',
      metadata: {},
      tools: Array.from(this.tools.values()),
      resources: [],
      capabilities: this.getServerCapabilities(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get server capabilities
   */
  private getServerCapabilities(): string[] {
    return [
      'tools',
      'resources',
      'streaming',
      'notifications',
      'authentication',
      'context-management',
      'multi-session'
    ];
  }

  /**
   * Authenticate client
   */
  private async authenticate(token?: string, credentials?: any): Promise<boolean> {
    // Implement your authentication logic here
    // This is a simple example
    if (token === 'valid-token') {
      return true;
    }
    
    if (credentials?.username === 'admin' && credentials?.password === 'admin') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if session has permission
   */
  private hasPermission(session: MCPSession, permission: string): boolean {
    return session.permissions.includes(permission) || session.permissions.includes('admin');
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'debug' | 'error', message: string): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [MCP Server] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get server statistics
   */
  getStats(): {
    sessions: number;
    contexts: number;
    tools: number;
    handlers: number;
    uptime: number;
  } {
    return {
      sessions: this.sessions.size,
      contexts: this.contexts.size,
      tools: this.tools.size,
      handlers: this.handlers.size,
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
export const mcpServer = new MCPServer();