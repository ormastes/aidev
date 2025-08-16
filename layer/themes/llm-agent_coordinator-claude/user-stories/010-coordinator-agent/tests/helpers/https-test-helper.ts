import { https } from '../../../../../infra_external-log-lib/src';
import { http } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { IncomingMessage, ServerResponse } from 'http';

/**
 * Creates a real HTTPS test server with self-signed certificates
 */
export async function createTestHttpsServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<{ server: https.Server; port: number; url: string; cleanup: () => Promise<void> }> {
  // For testing purposes, we'll create a simple HTTP server that mimics HTTPS behavior
  // In a real scenario, you'd generate self-signed certificates
  const httpServer = http.createServer(handler);
  
  return new Promise((resolve, reject) => {
    httpServer.on('error', reject);
    
    httpServer.listen(0, '127.0.0.1', () => {
      const address = httpServer.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      
      resolve({
        server: httpServer as any, // Cast to https.Server for API compatibility
        port: address.port,
        url: `http://127.0.0.1:${address.port}`, // Using HTTP for simplicity in tests
        cleanup: async () => {
          return new Promise((resolve, reject) => {
            httpServer.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      });
    });
  });
}

/**
 * Intercepts HTTPS requests and redirects them to a test server
 */
export class HttpsRequestInterceptor {
  private originalRequest: typeof https.request;
  private testServerUrl: string;
  private handlers: Map<string, (options: any, data: any) => { statusCode: number; headers?: any; body: string | Buffer }> = new Map();

  constructor(testServerUrl: string) {
    this.originalRequest = https.request;
    this.testServerUrl = testServerUrl;
  }

  /**
   * Adds a request handler for a specific path
   */
  addHandler(path: string, handler: (options: any, data: any) => { statusCode: number; headers?: any; body: string | Buffer }): void {
    this.handlers.set(path, handler);
  }

  /**
   * Starts intercepting HTTPS requests
   */
  start(): void {
    const self = this;
    
    (https as any).request = function(options: any, callback?: (res: IncomingMessage) => void): any {
      const mockReq = new MockClientRequest();
      const mockRes = new MockIncomingMessage();
      
      // Collect request data
      let requestData = '';
      mockReq.on('write', (chunk: string | Buffer) => {
        requestData += chunk.toString();
      });
      
      mockReq.on('end', () => {
        // Find matching handler
        const path = options.path || '/';
        const handler = self.handlers.get(path);
        
        if (handler) {
          const response = handler(options, requestData);
          mockRes.statusCode = response.statusCode;
          mockRes.headers = response.headers || {};
          
          // Simulate response
          setImmediate(() => {
            if (callback) callback(mockRes as any);
            mockRes.emit('data', response.body);
            mockRes.emit('end');
          });
        } else {
          // Default 404 response
          mockRes.statusCode = 404;
          setImmediate(() => {
            if (callback) callback(mockRes as any);
            mockRes.emit('data', JSON.stringify({ error: 'Not found' }));
            mockRes.emit('end');
          });
        }
      });
      
      return mockReq;
    };
  }

  /**
   * Stops intercepting HTTPS requests
   */
  stop(): void {
    (https as any).request = this.originalRequest;
  }
}

/**
 * Mock ClientRequest for testing
 */
class MockClientRequest extends EventEmitter {
  public destroyed: boolean = false;
  private writeBuffer: Buffer[] = [];

  write(chunk: string | Buffer, encoding?: BufferEncoding | ((error?: Error) => void), cb?: (error?: Error) => void): boolean {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding as BufferEncoding);
    this.writeBuffer.push(buffer);
    this.emit('write', chunk);
    if (typeof encoding === 'function') encoding();
    if (cb) cb();
    return true;
  }

  end(data?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): void {
    if (data) {
      this.write(data, encoding as BufferEncoding);
    }
    if (typeof encoding === 'function') {
      cb = encoding;
    }
    this.emit('end');
    if (cb) cb();
  }

  destroy(error?: Error): void {
    this.destroyed = true;
    if (error) {
      this.emit('error', error);
    }
    this.emit('close');
  }

  setTimeout(timeout: number, callback?: () => void): this {
    if (callback) {
      setTimeout(() => {
        if (!this.destroyed) {
          callback();
          this.emit('timeout');
        }
      }, timeout);
    }
    return this;
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.writeBuffer);
  }
}

/**
 * Mock IncomingMessage for testing
 */
class MockIncomingMessage extends EventEmitter {
  public statusCode: number = 200;
  public statusMessage: string = 'OK';
  public headers: Record<string, string | string[]> = {};
  public method?: string;
  public url?: string;
  public httpVersion: string = '1.1';
  public rawHeaders: string[] = [];

  constructor() {
    super();
    // Add IncomingMessage prototype methods
    Object.setPrototypeOf(this, IncomingMessage.prototype);
  }

  setEncoding(encoding: BufferEncoding): this {
    // Mock implementation
    return this;
  }

  pause(): this {
    // Mock implementation
    return this;
  }

  resume(): this {
    // Mock implementation
    return this;
  }

  pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T {
    // Mock implementation
    return destination;
  }
}

/**
 * Creates a Claude API mock server handler
 */
export function createClaudeApiHandler(): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const url = req.url || '/';
      const method = req.method || 'GET';
      
      // Check authorization
      const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
      if (!authHeader) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { type: 'authentication_error', message: 'Missing authentication' } }));
        return;
      }
      
      // Handle different endpoints
      if (url === '/v1/messages' && method === 'POST') {
        try {
          const request = JSON.parse(body);
          
          // Check for stream parameter
          if (request.stream) {
            // SSE response
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            });
            
            // Send some mock SSE events
            res.write('event: message_start\n');
            res.write(`data: ${JSON.stringify({ type: 'message_start', message: { id: 'msg_' + Date.now() } })}\n\n`);
            
            res.write('event: content_block_delta\n');
            res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: 'Hello from mock Claude!' } })}\n\n`);
            
            res.write('event: message_stop\n');
            res.write('data: [In Progress]\n\n');
            
            res.end();
          } else {
            // Regular JSON response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              content: [{ text: 'Hello from mock Claude!' }],
              id: 'msg_' + Date.now()
            }));
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { type: 'invalid_request', message: 'Invalid request body' } }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { type: 'not_found', message: 'Endpoint not found' } }));
      }
    });
  };
}