/**
 * MCP Server implementation
 * Handles MCP protocol communication and tool execution
 */

import { http } from '../../../infra_external-log-lib/src';
import * as WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';

export interface MCPServerConfig {
  name: string;
  version: string;
  port: number;
  host?: string;
  capabilities?: ServerCapabilities;
}

export interface ServerCapabilities {
  tools?: boolean;
  streaming?: boolean;
  resources?: boolean;
  prompts?: boolean;
}

export class MCPServer extends EventEmitter {
  private config: MCPServerConfig;
  private httpServer?: http.Server;
  private wsServer?: WebSocket.Server;
  private connections: Map<string, WebSocket> = new Map();
  private running: boolean = false;

  constructor(config?: Partial<MCPServerConfig>) {
    super();
    this.config = {
      name: config?.name || 'mcp-server',
      version: config?.version || '1.0.0',
      port: config?.port || 3456,
      host: config?.host || "localhost",
      capabilities: config?.capabilities || {
        tools: true,
        streaming: true,
        resources: true,
        prompts: true
      }
    };
  }

  /**
   * Start the MCP server
   */
  async start(config?: MCPServerConfig): Promise<void> {
    if (this.running) {
      throw new Error('Server is already running');
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    return new Promise((resolve, reject) => {
      // Create HTTP server
      this.httpServer = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy', name: this.config.name }));
        } else if (req.url === '/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getServerInfo()));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      // Create WebSocket server
      this.wsServer = new WebSocket.Server({ server: this.httpServer });

      this.wsServer.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
        const connectionId = uuidv4();
        this.connections.set(connectionId, ws);
        
        this.emit("connection", { connectionId, request: req });

        ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(connectionId, message);
          } catch (error) {
            this.sendError(connectionId, null, 'Invalid JSON');
          }
        });

        ws.on('close', () => {
          this.connections.delete(connectionId);
          this.emit("disconnection", { connectionId });
        });

        ws.on('error', (error) => {
          this.emit('error', { connectionId, error });
        });

        // Send initialization message
        this.sendMessage(connectionId, {
          jsonrpc: '2.0',
          method: "initialize",
          params: {
            protocolVersion: '2024-11-05',
            capabilities: this.config.capabilities,
            serverInfo: {
              name: this.config.name,
              version: this.config.version
            }
          }
        });
      });

      this.httpServer.listen(this.config.port, this.config.host, () => {
        this.running = true;
        this.emit('started', { port: this.config.port, host: this.config.host });
        resolve();
      });

      this.httpServer.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    return new Promise((resolve) => {
      // Close all WebSocket connections
      for (const [connectionId, ws] of this.connections) {
        ws.close();
        this.connections.delete(connectionId);
      }

      // Close WebSocket server
      if (this.wsServer) {
        this.wsServer.close();
      }

      // Close HTTP server
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.running = false;
          this.emit('stopped');
          resolve();
        });
      } else {
        this.running = false;
        resolve();
      }
    });
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get server information
   */
  getServerInfo(): any {
    return {
      name: this.config.name,
      version: this.config.version,
      capabilities: this.config.capabilities,
      connections: this.connections.size,
      uptime: process.uptime()
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(connectionId: string, message: any): void {
    this.emit('message', { connectionId, message });

    // Handle standard MCP messages
    if (message.jsonrpc === '2.0') {
      if (message.method) {
        this.handleRequest(connectionId, message);
      } else if (message.result !== undefined || message.error !== undefined) {
        this.handleResponse(connectionId, message);
      }
    }
  }

  /**
   * Handle MCP request
   */
  private handleRequest(connectionId: string, request: any): void {
    switch (request.method) {
      case 'ping':
        this.sendResponse(connectionId, request.id, { pong: true });
        break;
      
      case 'tools/list':
        this.emit('tools:list', { connectionId, request });
        break;
      
      case 'tools/call':
        this.emit('tools:call', { connectionId, request });
        break;
      
      case 'resources/list':
        this.emit('resources:list', { connectionId, request });
        break;
      
      case 'resources/read':
        this.emit('resources:read', { connectionId, request });
        break;
      
      case 'prompts/list':
        this.emit('prompts:list', { connectionId, request });
        break;
      
      case 'prompts/get':
        this.emit('prompts:get', { connectionId, request });
        break;
      
      default:
        this.sendError(connectionId, request.id, `Unknown method: ${request.method}`);
    }
  }

  /**
   * Handle MCP response
   */
  private handleResponse(connectionId: string, response: any): void {
    this.emit("response", { connectionId, response });
  }

  /**
   * Send message to connection
   */
  sendMessage(connectionId: string, message: any): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send response to connection
   */
  sendResponse(connectionId: string, id: any, result: any): void {
    this.sendMessage(connectionId, {
      jsonrpc: '2.0',
      id,
      result
    });
  }

  /**
   * Send error to connection
   */
  sendError(connectionId: string, id: any, message: string, code: number = -32603): void {
    this.sendMessage(connectionId, {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    });
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: any): void {
    for (const connectionId of this.connections.keys()) {
      this.sendMessage(connectionId, message);
    }
  }

  /**
   * Get all connection IDs
   */
  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }
}