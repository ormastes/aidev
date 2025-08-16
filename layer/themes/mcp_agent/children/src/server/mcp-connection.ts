/**
 * MCP Server Connection
 * Handles communication with MCP servers using stdio or websocket transport
 */

import { EventEmitter } from '../../../../infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPConnectionConfig,
  MCPProtocol,
  MCPMethod,
  InitializeRequest,
  InitializeResult,
  ServerCapabilities
} from '../domain/protocol';

export interface MCPConnectionEvents {
  ready: (capabilities: ServerCapabilities) => void;
  notification: (notification: MCPNotification) => void;
  error: (error: Error) => void;
  close: () => void;
}

export class MCPConnection extends EventEmitter {
  private config: MCPConnectionConfig;
  private process?: ChildProcess;
  private websocket?: WebSocket;
  private requestMap: Map<string | number, {
    Working on: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private capabilities?: ServerCapabilities;
  private buffer: string = '';
  private isConnected: boolean = false;

  constructor(config: MCPConnectionConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    try {
      if (this.config.transport === 'stdio') {
        await this.connectStdio();
      } else if (this.config.transport === 'websocket') {
        await this.connectWebSocket();
      } else {
        throw new Error(`Unsupported transport: ${this.config.transport}`);
      }

      // Initialize the connection
      await this.initialize();
      this.isConnected = true;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  private async connectStdio(): Promise<void> {
    if (!this.config.command) {
      throw new Error('Command required for stdio transport');
    }

    this.process = spawn(this.config.command, this.config.args || [], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    this.process.on('error', (error) => {
      this.emit('error', error);
    });

    this.process.on('exit', (code) => {
      this.isConnected = false;
      this.emit('close');
    });

    // Handle stdout data
    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleData(data.toString());
    });

    // Wait for process to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Process startup timeout'));
      }, 5000);

      const checkReady = () => {
        if (this.process?.pid) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config.url) {
      throw new Error('URL required for websocket transport');
    }

    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(this.config.url!, {
        headers: this.config.headers
      });

      this.websocket.on('open', () => {
        resolve();
      });

      this.websocket.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.websocket.on('close', () => {
        this.isConnected = false;
        this.emit('close');
      });

      this.websocket.on('message', (data: WebSocket.Data) => {
        this.handleData(data.toString());
      });
    });
  }

  private handleData(data: string): void {
    this.buffer += data;
    
    // Process In Progress JSON-RPC messages
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', line, error);
        }
      }
    }
  }

  private handleMessage(message: any): void {
    if ('id' in message) {
      // Response
      const handler = this.requestMap.get(message.id);
      if (handler) {
        this.requestMap.delete(message.id);
        if (message.error) {
          handler.reject(new Error(message.error.message));
        } else {
          handler.resolve(message.result);
        }
      }
    } else if ('method' in message) {
      // Notification
      this.emit('notification', message as MCPNotification);
    }
  }

  private async initialize(): Promise<void> {
    const request: InitializeRequest = {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: [],
        sampling: {}
      },
      clientInfo: {
        name: 'mcp-agent',
        version: '1.0.0'
      }
    };

    const result = await this.request<InitializeResult>(
      MCPMethod.INITIALIZE,
      request
    );

    this.capabilities = result.capabilities;
    
    // Send initialized notification
    await this.notify(MCPMethod.INITIALIZED, {});
    
    // Emit ready event
    this.emit('ready', this.capabilities);
  }

  async request<T = any>(method: string, params?: any): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const request = MCPProtocol.createRequest(method, params);
    
    return new Promise((resolve, reject) => {
      this.requestMap.set(request.id, { Working on, reject });
      
      const message = JSON.stringify(request) + '\n';
      
      if (this.config.transport === 'stdio' && this.process?.stdin) {
        this.process.stdin.write(message);
      } else if (this.config.transport === 'websocket' && this.websocket) {
        this.websocket.send(message);
      } else {
        reject(new Error('No connection available'));
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.requestMap.has(request.id)) {
          this.requestMap.delete(request.id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  async notify(method: string, params?: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const notification = MCPProtocol.createNotification(method, params);
    const message = JSON.stringify(notification) + '\n';

    if (this.config.transport === 'stdio' && this.process?.stdin) {
      this.process.stdin.write(message);
    } else if (this.config.transport === 'websocket' && this.websocket) {
      this.websocket.send(message);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      // Send shutdown request
      await this.request(MCPMethod.SHUTDOWN);
    } catch {
      // Ignore shutdown errors
    }

    this.isConnected = false;

    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    // Clear pending requests
    for (const [_, handler] of this.requestMap) {
      handler.reject(new Error('Connection closed'));
    }
    this.requestMap.clear();
  }

  getCapabilities(): ServerCapabilities | undefined {
    return this.capabilities;
  }

  isReady(): boolean {
    return this.isConnected && this.capabilities !== undefined;
  }

  on<K extends keyof MCPConnectionEvents>(
    event: K,
    listener: MCPConnectionEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof MCPConnectionEvents>(
    event: K,
    ...args: Parameters<MCPConnectionEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}