import { EventEmitter } from '../../../infra_external-log-lib/src';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

/**
 * MCP Client for Chat Space Integration
 * Enables chat-space to communicate with MCP servers
 */
export class ChatSpaceMCPClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private requestMap: Map<string, (response: any) => void> = new Map();
  private connected: boolean = false;
  private serverUrl: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(serverUrl: string = 'ws://localhost:8080') {
    super();
    this.serverUrl = serverUrl;
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
          console.log(`Connected to MCP server at ${this.serverUrl}`);
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          
          // Send initialization request
          this.initialize().then(resolve).catch(reject);
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing MCP message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('MCP WebSocket error:', error);
          this.emit('error', error);
        });

        this.ws.on('close', () => {
          console.log('Disconnected from MCP server');
          this.connected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize MCP session
   */
  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: 'chat-space-mcp-client',
        version: '1.0.0'
      }
    });

    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`);
    }

    // Notify initialized
    await this.sendNotification('notifications/initialized', {});
  }

  /**
   * Send MCP request
   */
  async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to MCP server');
    }

    const id = uuidv4();
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params: params || {}
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestMap.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.requestMap.set(id, (response) => {
        clearTimeout(timeout);
        this.requestMap.delete(id);
        resolve(response);
      });

      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Send MCP notification
   */
  async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to MCP server');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params: params || {}
    };

    this.ws.send(JSON.stringify(notification));
  }

  /**
   * Handle incoming MCP message
   */
  private handleMessage(message: any): void {
    // Handle response to request
    if (message.id && this.requestMap.has(message.id)) {
      const handler = this.requestMap.get(message.id);
      if (handler) {
        handler(message);
      }
      return;
    }

    // Handle notifications
    if (!message.id && message.method) {
      this.emit('notification', message);
      return;
    }

    // Handle requests from server
    if (message.id && message.method) {
      this.handleServerRequest(message);
    }
  }

  /**
   * Handle requests from MCP server
   */
  private async handleServerRequest(request: any): Promise<void> {
    let response: any = {
      jsonrpc: '2.0',
      id: request.id
    };

    try {
      // Handle different request types
      switch (request.method) {
        case 'tools/list':
          response.result = {
            tools: this.getAvailableTools()
          };
          break;

        case 'completion/complete':
          response.result = await this.handleCompletion(request.params);
          break;

        default:
          response.error = {
            code: -32601,
            message: `Method not found: ${request.method}`
          };
      }
    } catch (error: any) {
      response.error = {
        code: -32603,
        message: error.message
      };
    }

    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(response));
    }
  }

  /**
   * Get available tools for chat-space
   */
  private getAvailableTools(): any[] {
    return [
      {
        name: 'send_message',
        description: 'Send a message to a chat space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Chat space ID' },
            message: { type: 'string', description: 'Message content' },
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['spaceId', 'message', 'userId']
        }
      },
      {
        name: 'create_space',
        description: 'Create a new chat space',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Space name' },
            description: { type: 'string', description: 'Space description' }
          },
          required: ['name']
        }
      },
      {
        name: 'join_space',
        description: 'Join an existing chat space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Chat space ID' },
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['spaceId', 'userId']
        }
      },
      {
        name: 'get_messages',
        description: 'Get recent messages from a chat space',
        inputSchema: {
          type: 'object',
          properties: {
            spaceId: { type: 'string', description: 'Chat space ID' },
            limit: { type: 'number', description: 'Number of messages to retrieve' }
          },
          required: ['spaceId']
        }
      }
    ];
  }

  /**
   * Handle completion requests
   */
  private async handleCompletion(params: any): Promise<any> {
    // Delegate to chat-space completion logic
    return {
      completion: {
        values: []
      }
    };
  }

  /**
   * Call MCP tool
   */
  async callTool(name: string, args: any): Promise<any> {
    const response = await this.sendRequest('tools/call', {
      name,
      arguments: args
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * List available MCP tools
   */
  async listTools(): Promise<any[]> {
    const response = await this.sendRequest('tools/list');
    
    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return response.result?.tools || [];
  }

  /**
   * List MCP resources
   */
  async listResources(): Promise<any[]> {
    const response = await this.sendRequest('resources/list');
    
    if (response.error) {
      throw new Error(`Failed to list resources: ${response.error.message}`);
    }

    return response.result?.resources || [];
  }

  /**
   * Read MCP resource
   */
  async readResource(uri: string): Promise<any> {
    const response = await this.sendRequest('resources/read', { uri });
    
    if (response.error) {
      throw new Error(`Failed to read resource: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Attempt to reconnect to MCP server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.requestMap.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}