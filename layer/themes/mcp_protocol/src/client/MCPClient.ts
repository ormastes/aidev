/**
 * MCP Client Implementation
 * Model Context Protocol client for connecting to MCP servers
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

export interface MCPClientConfig {
  serverUrl: string;
  clientId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  requestTimeout?: number;
  enableLogging?: boolean;
  authentication?: {
    token?: string;
    credentials?: {
      username: string;
      password: string;
    };
  };
}

export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
  timeout?: number;
  callback?: (error: Error | null, result?: any) => void;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
  outputSchema?: object;
}

export interface MCPContextInfo {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  resources: any[];
  capabilities: string[];
}

export class MCPClient extends EventEmitter {
  private config: Required<Omit<MCPClientConfig, 'authentication'>> & Pick<MCPClientConfig, 'authentication'>;
  private ws?: WebSocket;
  private connected: boolean = false;
  private authenticated: boolean = false;
  private sessionId?: string;
  private pendingRequests: Map<string, MCPRequest> = new Map();
  private tools: Map<string, MCPToolDefinition> = new Map();
  private context?: MCPContextInfo;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private permissions: string[] = [];

  constructor(config: MCPClientConfig) {
    super();
    this.config = {
      clientId: uuidv4(),
      autoReconnect: true,
      reconnectInterval: 5000,
      requestTimeout: 30000,
      enableLogging: true,
      ...config
    };
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.log('info', `Connecting to ${this.config.serverUrl}`);
        
        this.ws = new WebSocket(this.config.serverUrl, {
          headers: {
            'x-client-id': this.config.clientId
          }
        });

        this.ws.on('open', async () => {
          this.connected = true;
          this.log('info', 'Connected to MCP server');
          
          // Wait for welcome message
          this.once('welcome', async (params) => {
            this.sessionId = params.sessionId;
            this.log('info', `Session established: ${this.sessionId}`);
            
            // Authenticate if required
            if (params.authRequired && this.config.authentication) {
              try {
                await this.authenticate();
                resolve();
              } catch (error) {
                reject(error);
              }
            } else {
              this.authenticated = !params.authRequired;
              resolve();
            }
            
            // Fetch initial data
            await this.fetchInitialData();
            this.emit('connected', params);
          });
        });

        this.ws.on('message', this.handleMessage.bind(this));
        this.ws.on('close', this.handleClose.bind(this));
        this.ws.on('error', this.handleError.bind(this));
        this.ws.on('ping', () => this.ws?.pong());

        // Set connection timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
            this.disconnect();
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.connected = false;
    this.authenticated = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnecting');
      }
      this.ws = undefined;
    }
    
    // Reject all pending requests
    for (const request of this.pendingRequests.values()) {
      if (request.callback) {
        request.callback(new Error('Connection closed'));
      }
    }
    this.pendingRequests.clear();
    
    this.log('info', 'Disconnected from MCP server');
    this.emit('disconnected');
  }

  /**
   * Authenticate with the server
   */
  private async authenticate(): Promise<void> {
    if (!this.config.authentication) {
      throw new Error('No authentication credentials provided');
    }

    const result = await this.request('authenticate', {
      token: this.config.authentication.token,
      credentials: this.config.authentication.credentials
    });

    this.authenticated = true;
    this.permissions = result.permissions || [];
    this.log('info', 'Authentication successful');
    this.emit('authenticated', result);
  }

  /**
   * Send a request to the server
   */
  async request(method: string, params?: any, timeout?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const requestId = uuidv4();
      const request: MCPRequest = {
        id: requestId,
        method,
        params,
        timeout: timeout || this.config.requestTimeout,
        callback: (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      };

      this.pendingRequests.set(requestId, request);

      // Set timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${method}`));
      }, request.timeout!);

      // Modify callback to clear timeout
      const originalCallback = request.callback!;
      request.callback = (error, result) => {
        clearTimeout(timeoutId);
        originalCallback(error, result);
      };

      // Send request
      this.sendMessage({
        id: requestId,
        type: 'request',
        method,
        params,
        timestamp: new Date()
      });

      this.log('debug', `Sent request: ${method}`);
    });
  }

  /**
   * Send a notification to the server
   */
  notify(method: string, params?: any): void {
    if (!this.connected) {
      this.log('warn', 'Cannot send notification: not connected');
      return;
    }

    this.sendMessage({
      id: uuidv4(),
      type: 'notification',
      method,
      params,
      timestamp: new Date()
    });

    this.log('debug', `Sent notification: ${method}`);
  }

  /**
   * Execute a tool on the server
   */
  async executeTool(name: string, input: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    return await this.request('executeTool', { name, input });
  }

  /**
   * Get the current context
   */
  async getContext(): Promise<MCPContextInfo> {
    if (!this.context) {
      this.context = await this.request('getContext');
    }
    return this.context!;
  }

  /**
   * Update the context
   */
  async updateContext(updates: { metadata?: Record<string, any>; resources?: any[] }): Promise<void> {
    const result = await this.request('updateContext', updates);
    if (result.success) {
      this.context = result.context;
      this.emit('contextUpdated', this.context);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPToolDefinition[]> {
    const tools = await this.request('listTools');
    
    // Cache tools locally
    this.tools.clear();
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
    
    return tools;
  }

  /**
   * Get available tools (from cache)
   */
  getTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): MCPToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: any): void {
    try {
      const message = JSON.parse(data.toString());
      this.log('debug', `Received message: ${message.type} ${message.method || ''}`);

      if (message.type === 'response') {
        this.handleResponse(message);
      } else if (message.type === 'error') {
        this.handleErrorMessage(message);
      } else if (message.type === 'notification') {
        this.handleNotification(message);
      }
    } catch (error) {
      this.log('error', `Failed to parse message: ${error}`);
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(message: any): void {
    const request = this.pendingRequests.get(message.id);
    if (request) {
      this.pendingRequests.delete(message.id);
      if (request.callback) {
        request.callback(null, message.result);
      }
    }
  }

  /**
   * Handle error message
   */
  private handleErrorMessage(message: any): void {
    const request = this.pendingRequests.get(message.id);
    if (request) {
      this.pendingRequests.delete(message.id);
      if (request.callback) {
        const error = new Error(message.error.message);
        (error as any).code = message.error.code;
        (error as any).data = message.error.data;
        request.callback(error);
      }
    } else {
      // Emit general error
      this.emit('error', message.error);
    }
  }

  /**
   * Handle notification message
   */
  private handleNotification(message: any): void {
    if (message.method === 'welcome') {
      this.emit('welcome', message.params);
    } else {
      this.emit('notification', message.method, message.params);
      this.emit(`notification:${message.method}`, message.params);
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(code: number, reason: string): void {
    this.connected = false;
    this.authenticated = false;
    this.log('info', `Connection closed: ${code} ${reason}`);
    
    // Clear pending requests
    for (const request of this.pendingRequests.values()) {
      if (request.callback) {
        request.callback(new Error('Connection closed'));
      }
    }
    this.pendingRequests.clear();
    
    // Auto-reconnect if enabled
    if (this.config.autoReconnect && code !== 1000) {
      this.scheduleReconnect();
    }
    
    this.emit('disconnected', code, reason);
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    this.log('error', `Connection error: ${error.message}`);
    this.emit('error', error);
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.log('info', `Reconnecting in ${this.config.reconnectInterval}ms...`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      try {
        await this.connect();
      } catch (error) {
        this.log('error', `Reconnection failed: ${error}`);
        this.scheduleReconnect();
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Send message to server
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.log('warn', 'Cannot send message: connection not open');
    }
  }

  /**
   * Fetch initial data from server
   */
  private async fetchInitialData(): Promise<void> {
    try {
      // Fetch available tools
      await this.listTools();
      this.log('info', `Loaded ${this.tools.size} tools`);
      
      // Fetch context
      await this.getContext();
      this.log('info', 'Context loaded');
      
      // Start heartbeat
      this.startHeartbeat();
    } catch (error) {
      this.log('error', `Failed to fetch initial data: ${error}`);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.notify('heartbeat', { timestamp: new Date() });
    }, 30000);
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'debug' | 'warn' | 'error', message: string): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [MCP Client] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Get client permissions
   */
  getPermissions(): string[] {
    return this.permissions;
  }

  /**
   * Check if client has permission
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) || this.permissions.includes('admin');
  }
}

// Export factory function
export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}