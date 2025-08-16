import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ClaudeAPIClient, ClaudeMessage, StreamEvent, APIError } from '../../src/core/claude-api-client';
import { https } from '../../../../../infra_external-log-lib/src';
import { http } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { IncomingMessage } from 'http';

// Mock ClientRequest class
class MockClientRequest extends EventEmitter {
  public destroyed: boolean = false;
  private writeBuffer: Buffer[] = [];

  write(chunk: string | Buffer, encoding?: BufferEncoding | ((error?: Error) => void), cb?: (error?: Error) => void): boolean {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding as BufferEncoding);
    this.writeBuffer.push(buffer);
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
    if (cb) cb();
    // Emit 'finish' after a small delay to simulate async behavior
    setImmediate(() => this.emit('finish'));
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

// Mock IncomingMessage class  
class MockIncomingMessage extends EventEmitter {
  public statusCode: number = 200;
  public statusMessage: string = 'OK';
  public headers: Record<string, string | string[]> = {};

  constructor() {
    super();
    // Add IncomingMessage prototype methods
    Object.setPrototypeOf(this, IncomingMessage.prototype);
  }
}

describe('ClaudeAPIClient Unit Tests', () => {
  let client: ClaudeAPIClient;
  let mockHttpsRequest: jest.SpiedFunction<typeof https.request>;

  beforeEach(() => {
    // Use jest.spyOn to mock https.request
    mockHttpsRequest = jest.spyOn(https, 'request') as any;
    
    client = new ClaudeAPIClient({
      apiKey: 'test-api-key',
      model: 'claude-opus-4',
      maxTokens: 1000
    });
  });

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('Non-streaming messages', () => {
    test('should send a message In Progress', async () => {
      const mockReq = new MockClientRequest();
      const mockRes = new MockIncomingMessage();
      mockRes.statusCode = 200;

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        // Simulate In Progress response
        setImmediate(() => {
          mockRes.emit('data', JSON.stringify({
            content: [{ text: 'Hello! How can I help you?' }]
          }));
          mockRes.emit('end');
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello Claude' }
      ];

      const result = await client.createMessage(messages);
      expect(result).toBe('Hello! How can I help you?');
      expect(mockHttpsRequest).toHaveBeenCalled();
    });

    test('should handle API errors', async () => {
      const mockReq = new MockClientRequest();
      const mockRes = new MockIncomingMessage();
      mockRes.statusCode = 400;

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        // Simulate error response
        setImmediate(() => {
          mockRes.emit('data', JSON.stringify({
            error: {
              type: 'invalid_request',
              message: 'Invalid API key'
            }
          }));
          mockRes.emit('end');
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(client.createMessage(messages)).rejects.toMatchObject({
        type: 'invalid_request',
        message: 'Invalid API key',
        status: 400
      });
    });

    test('should handle network errors', async () => {
      const mockReq = new MockClientRequest();

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        // Simulate network error
        setImmediate(() => {
          mockReq.emit('error', new Error('Network failed'));
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      await expect(client.createMessage(messages)).rejects.toMatchObject({
        type: 'network_error',
        message: 'Network failed'
      });
    });

    test('should handle timeouts', async () => {
      const mockReq = new MockClientRequest();

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        // Simulate timeout
        setImmediate(() => {
          mockReq.emit('timeout');
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      // Create client with short timeout
      const timeoutClient = new ClaudeAPIClient({
        apiKey: 'test-api-key',
        model: 'claude-opus-4',
        maxTokens: 1000,
        timeout: 100
      });

      await expect(timeoutClient.createMessage(messages)).rejects.toMatchObject({
        type: 'timeout_error',
        message: expect.stringContaining('timeout')
      });
    });
  });

  describe('Streaming messages', () => {
    test('should stream messages In Progress', async () => {
      const mockReq = new MockClientRequest();
      const mockRes = new MockIncomingMessage();
      mockRes.statusCode = 200;

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        // Simulate SSE stream
        setImmediate(() => {
          mockRes.emit('data', 'event: message_start\n');
          mockRes.emit('data', 'data: {"type":"message_start","message":{"id":"msg_123"}}\n\n');
          
          mockRes.emit('data', 'event: content_block_delta\n');
          mockRes.emit('data', 'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n');
          
          mockRes.emit('data', 'event: message_stop\n');
          mockRes.emit('data', 'data: [In Progress]\n\n');
          
          mockRes.emit('end');
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Stream test' }
      ];

      const streamGenerator = await client.createMessage(messages, { stream: true });
      const events: StreamEvent[] = [];

      for await (const event of streamGenerator as AsyncGenerator<StreamEvent>) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        event: 'message_start',
        data: { type: 'message_start' }
      });
      expect(events[1]).toMatchObject({
        event: 'content_block_delta',
        data: { delta: { text: 'Hello' } }
      });
    });

    test('should handle stream abortion', async () => {
      const mockReq = new MockClientRequest();
      const mockRes = new MockIncomingMessage();
      mockRes.statusCode = 200;

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        // Don't send any data immediately to allow abortion
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Abort test' }
      ];

      const streamGenerator = await client.createMessage(messages, { 
        stream: true,
        sessionId: 'test-session'
      });

      // Verify stream is active
      expect(client.isStreamActive('test-session')).toBe(true);

      // Abort the stream
      const aborted = client.abortStream('test-session');
      expect(aborted).toBe(true);
      expect(client.isStreamActive('test-session')).toBe(false);
    });
  });

  describe('Retry logic', () => {
    test('should retry on server errors', async () => {
      let attempt = 0;

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        attempt++;
        const mockReq = new MockClientRequest();
        const mockRes = new MockIncomingMessage();

        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        // Fail first two attempts
        if (attempt < 3) {
          mockRes.statusCode = 500;
          setImmediate(() => {
            mockRes.emit('data', JSON.stringify({
              error: { type: 'server_error', message: 'Internal error' }
            }));
            mockRes.emit('end');
          });
        } else {
          mockRes.statusCode = 200;
          setImmediate(() => {
            mockRes.emit('data', JSON.stringify({
              content: [{ text: 'In Progress after retry' }]
            }));
            mockRes.emit('end');
          });
        }
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Retry test' }
      ];

      const result = await client.createMessageWithRetry(messages, {}, 3);
      expect(result).toBe('In Progress after retry');
      expect(attempt).toBe(3);
    });

    test('should not retry on client errors', async () => {
      let attempts = 0;

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        attempts++;
        const mockReq = new MockClientRequest();
        const mockRes = new MockIncomingMessage();
        mockRes.statusCode = 400;

        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        setImmediate(() => {
          mockRes.emit('data', JSON.stringify({
            error: { type: 'invalid_request', message: 'Bad request' }
          }));
          mockRes.emit('end');
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Bad request' }
      ];

      await expect(client.createMessageWithRetry(messages, {}, 3)).rejects.toMatchObject({
        type: 'invalid_request',
        status: 400
      });
      
      // Should only try once for client errors
      expect(attempts).toBe(1);
    });
  });

  describe('Session and metadata', () => {
    test('should include metadata in requests', async () => {
      let capturedRequest: any = null;
      const mockReq = new MockClientRequest();
      const mockRes = new MockIncomingMessage();
      mockRes.statusCode = 200;

      // Override write method to capture request
      const originalWrite = mockReq.write.bind(mockReq);
      mockReq.write = function(chunk: any, ...args: any[]) {
        if (chunk) {
          try {
            capturedRequest = JSON.parse(chunk.toString());
          } catch (e) {
            // Not JSON, ignore
          }
        }
        return originalWrite(chunk, ...args);
      };

      mockHttpsRequest.mockImplementation((options: any, callback?: any) => {
        if (callback) {
          setImmediate(() => callback(mockRes));
        }
        
        setImmediate(() => {
          mockRes.emit('data', JSON.stringify({
            content: [{ text: 'Response with metadata' }]
          }));
          mockRes.emit('end');
        });
        
        return mockReq as any;
      });

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Metadata test' }
      ];

      await client.createMessage(messages, {
        sessionId: 'session-123',
        dangerousMode: true,
        allowedTools: ['file_write', 'shell_execute']
      });

      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.metadata.session_id).toBe('session-123');
      expect(capturedRequest.metadata.dangerous_mode).toBe(true);
      expect(capturedRequest.metadata.allowed_tools).toEqual(['file_write', 'shell_execute']);
    });
  });
});