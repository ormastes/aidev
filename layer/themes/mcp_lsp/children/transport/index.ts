/**
 * Transport Layer Implementation
 * Handles communication channels for MCP LSP
 */

import { EventEmitter } from 'node:events';
import { net } from '../../../infra_external-log-lib/src';
import * as WebSocket from 'ws';
import { Readable, Writable } from 'node:stream';

export type TransportType = 'stdio' | "websocket" | 'tcp' | 'ipc';

export interface TransportConfig {
  type: TransportType;
  options?: any;
}

export abstract class Transport extends EventEmitter {
  protected config: TransportConfig;
  protected connected: boolean;

  constructor(config: TransportConfig) {
    super();
    this.config = config;
    this.connected = false;
  }

  abstract connect(): Promise<void>;
  abstract close(): Promise<void>;
  abstract send(message: any): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  getType(): TransportType {
    return this.config.type;
  }
}

export class StdioTransport extends Transport {
  private input: Readable;
  private output: Writable;
  private buffer: string;
  private contentLength: number | null;

  constructor(config: TransportConfig) {
    super(config);
    this.input = config.options?.input || process.stdin;
    this.output = config.options?.output || process.stdout;
    this.buffer = '';
    this.contentLength = null;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    this.input.setEncoding('utf8');
    this.input.on('data', (chunk: string) => this.handleData(chunk));
    this.input.on('end', () => this.handleEnd());
    this.input.on('error', (error) => this.emit('error', error));

    this.connected = true;
    this.emit('connect');
  }

  async start(): Promise<void> {
    // For stdio, start is same as connect
    await this.connect();
  }

  async close(): Promise<void> {
    if (!this.connected) return;

    this.input.removeAllListeners();
    this.connected = false;
    this.emit('close');
  }

  async stop(): Promise<void> {
    await this.close();
  }

  async send(message: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }

    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf8');
    
    const header = `Content-Length: ${contentLength}\r\n\r\n`;
    
    return new Promise((resolve, reject) => {
      this.output.write(header + content, 'utf8', (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private handleData(chunk: string): void {
    this.buffer += chunk;

    while (true) {
      if (this.contentLength === null) {
        // Look for headers
        const headerEnd = this.buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;

        const header = this.buffer.substring(0, headerEnd);
        const contentLengthMatch = header.match(/Content-Length: (\d+)/i);
        
        if (!contentLengthMatch) {
          this.emit('error', new Error('Invalid header: missing Content-Length'));
          this.buffer = '';
          break;
        }

        this.contentLength = parseInt(contentLengthMatch[1], 10);
        this.buffer = this.buffer.substring(headerEnd + 4);
      }

      if (this.contentLength !== null) {
        if (this.buffer.length < this.contentLength) break;

        const content = this.buffer.substring(0, this.contentLength);
        this.buffer = this.buffer.substring(this.contentLength);
        this.contentLength = null;

        try {
          const message = JSON.parse(content);
          this.emit('message', message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      }
    }
  }

  private handleEnd(): void {
    this.connected = false;
    this.emit('close');
  }
}

export class WebSocketTransport extends Transport {
  private ws: WebSocket | null;
  private server: WebSocket.Server | null;
  private url?: string;
  private port?: number;

  constructor(config: TransportConfig) {
    super(config);
    this.ws = null;
    this.server = null;
    this.url = config.options?.url;
    this.port = config.options?.port;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    if (!this.url) {
      throw new Error('WebSocket URL not provided');
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url!);

      this.ws.on('open', () => {
        this.connected = true;
        this.emit('connect');
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.emit('message', message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.emit('close');
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  async start(): Promise<void> {
    if (this.server) return;

    if (!this.port) {
      throw new Error('WebSocket port not provided for server mode');
    }

    return new Promise((resolve) => {
      this.server = new WebSocket.Server({ port: this.port });

      this.server.on("connection", (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      this.server.on("listening", () => {
        this.emit("listening", { port: this.port });
        resolve();
      });

      this.server.on('error', (error) => {
        this.emit('error', error);
      });
    });
  }

  private handleConnection(ws: WebSocket): void {
    const transport = new WebSocketTransport({
      type: "websocket",
      options: { ws },
    });

    transport.ws = ws;
    transport.connected = true;

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        transport.emit('message', message);
      } catch (error) {
        transport.emit('error', new Error(`Failed to parse message: ${error}`));
      }
    });

    ws.on('close', () => {
      transport.connected = false;
      transport.emit('close');
    });

    ws.on('error', (error) => {
      transport.emit('error', error);
    });

    this.emit("connection", transport);
  }

  async close(): Promise<void> {
    if (!this.connected && !this.server) return;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.emit('close');
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
    
    await this.close();
  }

  async send(message: any): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('Transport not connected');
    }

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

export class TCPTransport extends Transport {
  private socket: net.Socket | null;
  private server: net.Server | null;
  private host?: string;
  private port: number;
  private buffer: string;
  private contentLength: number | null;

  constructor(config: TransportConfig) {
    super(config);
    this.socket = null;
    this.server = null;
    this.host = config.options?.host || "localhost";
    this.port = config.options?.port || 7000;
    this.buffer = '';
    this.contentLength = null;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, this.host);

      this.socket.on('connect', () => {
        this.connected = true;
        this.emit('connect');
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data.toString('utf8'));
      });

      this.socket.on('close', () => {
        this.connected = false;
        this.emit('close');
      });

      this.socket.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  async start(): Promise<void> {
    if (this.server) return;

    return new Promise((resolve) => {
      this.server = net.createServer((socket: net.Socket) => {
        this.handleConnection(socket);
      });

      this.server.listen(this.port, this.host, () => {
        this.emit("listening", { host: this.host, port: this.port });
        resolve();
      });

      this.server.on('error', (error) => {
        this.emit('error', error);
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    const transport = new TCPTransport({
      type: 'tcp',
      options: { socket },
    });

    transport.socket = socket;
    transport.connected = true;

    socket.on('data', (data: Buffer) => {
      transport.handleData(data.toString('utf8'));
    });

    socket.on('close', () => {
      transport.connected = false;
      transport.emit('close');
    });

    socket.on('error', (error) => {
      transport.emit('error', error);
    });

    this.emit("connection", transport);
  }

  async close(): Promise<void> {
    if (!this.connected && !this.server) return;

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.connected = false;
    this.emit('close');
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
    
    await this.close();
  }

  async send(message: any): Promise<void> {
    if (!this.connected || !this.socket) {
      throw new Error('Transport not connected');
    }

    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf8');
    const header = `Content-Length: ${contentLength}\r\n\r\n`;

    return new Promise((resolve, reject) => {
      this.socket!.write(header + content, 'utf8', (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private handleData(chunk: string): void {
    this.buffer += chunk;

    while (true) {
      if (this.contentLength === null) {
        const headerEnd = this.buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;

        const header = this.buffer.substring(0, headerEnd);
        const contentLengthMatch = header.match(/Content-Length: (\d+)/i);
        
        if (!contentLengthMatch) {
          this.emit('error', new Error('Invalid header: missing Content-Length'));
          this.buffer = '';
          break;
        }

        this.contentLength = parseInt(contentLengthMatch[1], 10);
        this.buffer = this.buffer.substring(headerEnd + 4);
      }

      if (this.contentLength !== null) {
        if (this.buffer.length < this.contentLength) break;

        const content = this.buffer.substring(0, this.contentLength);
        this.buffer = this.buffer.substring(this.contentLength);
        this.contentLength = null;

        try {
          const message = JSON.parse(content);
          this.emit('message', message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      }
    }
  }
}

// Factory function
export function createTransport(config: TransportConfig): Transport {
  switch (config.type) {
    case 'stdio':
      return new StdioTransport(config);
    case "websocket":
      return new WebSocketTransport(config);
    case 'tcp':
      return new TCPTransport(config);
    default:
      throw new Error(`Unsupported transport type: ${config.type}`);
  }
}

export default Transport;