/**
 * MCP Manager
 * Core manager for MCP protocol operations
 */

import { EventEmitter } from 'node:events';
import { MessageHandler, MCPMessage, MCPRequest, MCPResponse } from '../messages';
import { Transport, TransportConfig, Connection } from '../transport';
import { SchemaValidator } from '../schema';
import { MessageRouter, Route } from '../router';

export interface MCPConfig {
  version?: string;
  transport?: TransportConfig;
  timeout?: number;
  maxMessageSize?: number;
  capabilities?: MCPCapability[];
  schemas?: Record<string, any>;
  routes?: Route[];
  middleware?: any[];
}

export interface MCPSession {
  id: string;
  connection: Connection;
  capabilities: MCPCapability[];
  metadata: Record<string, any>;
  startedAt: Date;
  lastActivity: Date;
  messageCount: number;
}

export interface MCPCapability {
  name: string;
  version: string;
  required?: boolean;
  parameters?: Record<string, any>;
}

export interface ProtocolOptions {
  strict?: boolean;
  validateSchemas?: boolean;
  enableLogging?: boolean;
  compression?: boolean;
}

export interface HandshakeData {
  version: string;
  capabilities: MCPCapability[];
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class MCPManager extends EventEmitter {
  private config: MCPConfig;
  private messageHandler: MessageHandler;
  private transport: Transport;
  private schemaValidator: SchemaValidator;
  private router: MessageRouter;
  private sessions: Map<string, MCPSession>;
  private capabilities: Map<string, MCPCapability>;
  private options: ProtocolOptions;

  constructor(config: MCPConfig = {}, options: ProtocolOptions = {}) {
    super();
    this.config = {
      version: '1.0.0',
      timeout: 30000,
      maxMessageSize: 10 * 1024 * 1024,
      ...config
    };
    this.options = {
      strict: true,
      validateSchemas: true,
      enableLogging: false,
      compression: false,
      ...options
    };
    
    this.sessions = new Map();
    this.capabilities = new Map();
    
    // Initialize child components
    this.messageHandler = new MessageHandler(this.config);
    this.transport = new Transport(this.config.transport);
    this.schemaValidator = new SchemaValidator();
    this.router = new MessageRouter(this.config.routes);
    
    this.setupEventHandlers();
    this.registerCapabilities();
  }

  private setupEventHandlers(): void {
    // Transport events
    this.transport.on("connection", (connection: Connection) => {
      this.handleNewConnection(connection);
    });

    this.transport.on('message', (connection: Connection, data: any) => {
      this.handleIncomingMessage(connection, data);
    });

    this.transport.on("disconnect", (connection: Connection) => {
      this.handleDisconnection(connection);
    });

    // Message handler events
    this.messageHandler.on('request', (request: MCPRequest) => {
      this.handleRequest(request);
    });

    this.messageHandler.on("response", (response: MCPResponse) => {
      this.handleResponse(response);
    });

    this.messageHandler.on("notification", (notification: any) => {
      this.emit("notification", notification);
    });

    // Router events
    this.router.on('route:matched', (route: Route, message: MCPMessage) => {
      this.emit('route:matched', { route, message });
    });

    this.router.on('route:not-found', (message: MCPMessage) => {
      this.emit('route:not-found', message);
    });
  }

  private registerCapabilities(): void {
    // Register default capabilities
    const defaultCapabilities: MCPCapability[] = [
      {
        name: "protocol",
        version: this.config.version!,
        required: true
      },
      {
        name: 'request-response',
        version: '1.0.0',
        required: true
      },
      {
        name: "notification",
        version: '1.0.0',
        required: false
      },
      {
        name: "streaming",
        version: '1.0.0',
        required: false
      },
      {
        name: 'batch',
        version: '1.0.0',
        required: false
      }
    ];

    // Add custom capabilities
    const allCapabilities = [...defaultCapabilities, ...(this.config.capabilities || [])];
    
    for (const capability of allCapabilities) {
      this.capabilities.set(capability.name, capability);
    }
  }

  async start(): Promise<void> {
    this.emit("starting");
    
    try {
      await this.transport.start();
      
      if (this.config.schemas) {
        for (const [name, schema] of Object.entries(this.config.schemas)) {
          this.schemaValidator.registerSchema(name, schema);
        }
      }
      
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.emit("stopping");
    
    try {
      // Close all sessions
      for (const session of this.sessions.values()) {
        await this.closeSession(session.id);
      }
      
      await this.transport.stop();
      
      this.emit('stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async handleNewConnection(connection: Connection): Promise<void> {
    this.emit('connection:new', connection);
    
    // Perform handshake
    const handshake = await this.performHandshake(connection);
    
    if (!handshake) {
      connection.close();
      return;
    }
    
    // Create session
    const session: MCPSession = {
      id: this.generateSessionId(),
      connection,
      capabilities: handshake.capabilities,
      metadata: handshake.metadata || {},
      startedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0
    };
    
    this.sessions.set(session.id, session);
    connection.metadata = { sessionId: session.id };
    
    this.emit('session:created', session);
  }

  private async performHandshake(connection: Connection): Promise<HandshakeData | null> {
    try {
      // Send handshake request
      const handshakeRequest: MCPMessage = {
        id: this.generateMessageId(),
        type: 'request',
        method: "handshake",
        params: {
          version: this.config.version,
          capabilities: Array.from(this.capabilities.values()),
          sessionId: this.generateSessionId()
        }
      };
      
      await connection.send(JSON.stringify(handshakeRequest));
      
      // Wait for handshake response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Handshake timeout'));
        }, this.config.timeout);
        
        const handler = (data: any) => {
          clearTimeout(timeout);
          
          try {
            const message = JSON.parse(data);
            
            if (message.type === "response" && message.id === handshakeRequest.id) {
              const handshake: HandshakeData = {
                version: message.result.version,
                capabilities: message.result.capabilities,
                sessionId: message.result.sessionId,
                metadata: message.result.metadata
              };
              
              // Validate capabilities
              if (this.validateCapabilities(handshake.capabilities)) {
                resolve(handshake);
              } else {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        };
        
        connection.once('message', handler);
      });
    } catch (error) {
      this.emit('handshake:error', { connection, error });
      return null;
    }
  }

  private validateCapabilities(capabilities: MCPCapability[]): boolean {
    // Check required capabilities
    for (const [name, capability] of this.capabilities) {
      if (capability.required) {
        const found = capabilities.find(c => c.name === name);
        if (!found) {
          return false;
        }
        
        // Check version compatibility
        if (!this.isVersionCompatible(capability.version, found.version)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private isVersionCompatible(required: string, provided: string): boolean {
    // Simple version check - in production, use semver
    const [reqMajor] = required.split('.');
    const [provMajor] = provided.split('.');
    return reqMajor === provMajor;
  }

  private async handleIncomingMessage(connection: Connection, data: any): Promise<void> {
    const sessionId = connection.metadata?.sessionId;
    const session = sessionId ? this.sessions.get(sessionId) : null;
    
    if (!session) {
      this.emit('message:no-session', { connection, data });
      return;
    }
    
    session.lastActivity = new Date();
    session.messageCount++;
    
    try {
      const message = this.messageHandler.parse(data);
      
      // Validate schema if enabled
      if (this.options.validateSchemas && message.schema) {
        const validation = this.schemaValidator.validate(message.params, message.schema);
        if (!validation.valid) {
          await this.sendError(connection, message.id, 'Invalid schema', validation.errors);
          return;
        }
      }
      
      // Route message
      const route = this.router.match(message);
      
      if (route) {
        await this.executeRoute(session, message, route);
      } else {
        await this.handleUnroutedMessage(session, message);
      }
    } catch (error: any) {
      this.emit('message:error', { session, error });
      
      if (data.id) {
        await this.sendError(connection, data.id, 'Message processing error', error.message);
      }
    }
  }

  private async executeRoute(session: MCPSession, message: MCPMessage, route: Route): Promise<void> {
    try {
      const context = {
        session,
        message,
        manager: this
      };
      
      const result = await route.handler(context);
      
      if (message.type === 'request') {
        await this.sendResponse(session.connection, message.id!, result);
      }
    } catch (error: any) {
      if (message.type === 'request') {
        await this.sendError(session.connection, message.id!, 'Route execution error', error.message);
      }
    }
  }

  private async handleUnroutedMessage(session: MCPSession, message: MCPMessage): Promise<void> {
    // Handle built-in methods
    if (message.type === 'request') {
      switch (message.method) {
        case 'ping':
          await this.sendResponse(session.connection, message.id!, { pong: true });
          break;
          
        case "capabilities":
          await this.sendResponse(session.connection, message.id!, {
            capabilities: Array.from(this.capabilities.values())
          });
          break;
          
        case 'session':
          await this.sendResponse(session.connection, message.id!, {
            id: session.id,
            startedAt: session.startedAt,
            messageCount: session.messageCount
          });
          break;
          
        default:
          await this.sendError(session.connection, message.id!, 'Method not found', {
            method: message.method
          });
      }
    }
  }

  private async handleRequest(request: MCPRequest): Promise<void> {
    this.emit('request', request);
  }

  private async handleResponse(response: MCPResponse): Promise<void> {
    this.emit("response", response);
  }

  private async handleDisconnection(connection: Connection): Promise<void> {
    const sessionId = connection.metadata?.sessionId;
    
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        this.emit('session:closed', session);
      }
    }
    
    this.emit('connection:closed', connection);
  }

  async sendRequest(sessionId: string, method: string, params?: any): Promise<any> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const request: MCPRequest = {
      id: this.generateMessageId(),
      type: 'request',
      method,
      params
    };
    
    const message = this.messageHandler.format(request);
    await session.connection.send(message);
    
    // Wait for response
    return this.waitForResponse(session, request.id!);
  }

  async sendNotification(sessionId: string, method: string, params?: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const notification: MCPMessage = {
      type: "notification",
      method,
      params
    };
    
    const message = this.messageHandler.format(notification);
    await session.connection.send(message);
  }

  private async sendResponse(connection: Connection, id: string, result: any): Promise<void> {
    const response: MCPResponse = {
      id,
      type: "response",
      result
    };
    
    const message = this.messageHandler.format(response);
    await connection.send(message);
  }

  private async sendError(connection: Connection, id: string, message: string, data?: any): Promise<void> {
    const error: MCPResponse = {
      id,
      type: "response",
      error: {
        code: -32603,
        message,
        data
      }
    };
    
    const formatted = this.messageHandler.format(error);
    await connection.send(formatted);
  }

  private async waitForResponse(session: MCPSession, requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.config.timeout);
      
      const handler = (response: MCPResponse) => {
        if (response.id === requestId) {
          clearTimeout(timeout);
          this.removeListener("response", handler);
          
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      };
      
      this.on("response", handler);
    });
  }

  async broadcast(method: string, params?: any): Promise<void> {
    const notification: MCPMessage = {
      type: "notification",
      method,
      params
    };
    
    const message = this.messageHandler.format(notification);
    
    for (const session of this.sessions.values()) {
      try {
        await session.connection.send(message);
      } catch (error) {
        this.emit('broadcast:error', { session, error });
      }
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      await session.connection.close();
      this.sessions.delete(sessionId);
      this.emit('session:closed', session);
    }
  }

  addRoute(route: Route): void {
    this.router.addRoute(route);
  }

  removeRoute(pattern: string): void {
    this.router.removeRoute(pattern);
  }

  registerSchema(name: string, schema: any): void {
    this.schemaValidator.registerSchema(name, schema);
  }

  registerCapability(capability: MCPCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessions(): MCPSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): MCPSession | undefined {
    return this.sessions.get(sessionId);
  }

  getCapabilities(): MCPCapability[] {
    return Array.from(this.capabilities.values());
  }

  getConfig(): MCPConfig {
    return { ...this.config };
  }
}

export default MCPManager;