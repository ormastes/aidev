import { VLLMClient } from '../../../src/services/vllm-client';
import { http } from '../../../../../../infra_external-log-lib/src';
import { https } from '../../../../../../infra_external-log-lib/src';
import { EventEmitter, PassThrough } from 'stream';

// Mock dependencies
jest.mock('http');
jest.mock('https');

describe('VLLMClient', () => {
  let client: VLLMClient;
  let mockRequest: jest.MockedFunction<typeof http.request>;
  let mockHttpsRequest: jest.MockedFunction<typeof https.request>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = http.request as jest.MockedFunction<typeof http.request>;
    mockHttpsRequest = https.request as jest.MockedFunction<typeof https.request>;
    
    // Reset environment variables
    delete process.env.VLLM_SERVER_URL;
    delete process.env.VLLM_API_KEY;
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      client = new VLLMClient();
      expect(client['baseUrl']).toBe('http://localhost:8000');
      expect(client['apiKey']).toBeUndefined();
      expect(client['timeout']).toBe(30000);
      expect(client['maxRetries']).toBe(3);
    });

    it('should use provided configuration', () => {
      client = new VLLMClient({
        baseUrl: 'http://custom:9000',
        apiKey: 'test-key',
        timeout: 60000,
        maxRetries: 5
      });
      
      expect(client['baseUrl']).toBe('http://custom:9000');
      expect(client['apiKey']).toBe('test-key');
      expect(client['timeout']).toBe(60000);
      expect(client['maxRetries']).toBe(5);
    });

    it('should use environment variables', () => {
      process.env.VLLM_SERVER_URL = 'http://env-server:8080';
      process.env.VLLM_API_KEY = 'env-key';
      
      client = new VLLMClient();
      expect(client['baseUrl']).toBe('http://env-server:8080');
      expect(client['apiKey']).toBe('env-key');
    });

  });

  describe('checkHealth', () => {
    beforeEach(() => {
      client = new VLLMClient();
    });

    it('should return true when health endpoint returns ok', async () => {
      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify({ status: 'ok' }));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.checkHealth();
      expect(result).toBe(true);
    });

    it('should return true when health endpoint returns healthy', async () => {
      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify({ status: 'healthy' }));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.checkHealth();
      expect(result).toBe(true);
    });

    it('should fallback to model list when health endpoint fails', async () => {
      // First request to /health fails
      mockRequest.mockImplementationOnce((_options: any, _callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          req.emit('error', new Error('Connection failed'));
        });
        return req as any;
      });

      // Second request to /v1/models succeeds
      const mockResponse = createMockResponse();
      mockRequest.mockImplementationOnce((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify({ 
            data: [{ id: 'model-1', object: 'model' }] 
          }));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.checkHealth();
      expect(result).toBe(true);
    });

    it('should return false when both endpoints fail', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          req.emit('error', new Error('Connection failed'));
        });
        return req as any;
      });

      const result = await client.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      client = new VLLMClient();
    });

    it('should return list of models', async () => {
      const mockModels = {
        data: [
          { id: 'model-1', object: 'model', created: 123, owned_by: 'test' },
          { id: 'model-2', object: 'model', created: 456, owned_by: 'test' }
        ]
      };

      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify(mockModels));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.listModels();
      expect(result).toEqual(mockModels.data);
    });

    it('should return empty array on error', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          req.emit('error', new Error('Connection failed'));
        });
        return req as any;
      });

      const result = await client.listModels();
      expect(result).toEqual([]);
    });
  });

  describe('hasModel', () => {
    beforeEach(() => {
      client = new VLLMClient();
    });

    it('should return true when model exists', async () => {
      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify({
            data: [
              { id: 'model-1', object: 'model' },
              { id: 'model-2', object: 'model' }
            ]
          }));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.hasModel('model-1');
      expect(result).toBe(true);
    });

    it('should return false when model does not exist', async () => {
      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify({
            data: [{ id: 'model-1', object: 'model' }]
          }));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.hasModel('model-3');
      expect(result).toBe(false);
    });
  });

  describe('chat', () => {
    const chatRequest = {
      model: 'test-model',
      messages: [
        { role: 'user' as const, content: 'Hello' }
      ]
    };


    it('should use direct API call when no API key', async () => {
      const mockResponse = createMockResponse();
      const chatResponse = {
        id: 'chat-123',
        object: 'chat.completion',
        created: 123456,
        model: 'test-model',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Direct response' },
          finish_reason: 'stop'
        }]
      };

      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify(chatResponse));
          mockResponse.emit('end');
        });
        return req as any;
      });

      client = new VLLMClient();
      const result = await client.chat(chatRequest);
      
      expect(result).toEqual(chatResponse);
    });
  });

  describe('chatStream', () => {
    const chatRequest = {
      model: 'test-model',
      messages: [
        { role: 'user' as const, content: 'Hello' }
      ]
    };

    it('should handle streaming with OpenAI client', async () => {
      const mockStream = new PassThrough();
      const mockOpenAIClient = {
        createChatCompletion: jest.fn().mockResolvedValue({
          data: mockStream
        })
      };

      client = new VLLMClient({ apiKey: 'test-key' });
      client['openaiClient'] = mockOpenAIClient as any;

      const generator = client.chatStream(chatRequest);
      const results: any[] = [];

      // Start consuming the generator
      const consumePromise = (async () => {
        for await (const chunk of generator) {
          results.push(chunk);
        }
      })();

      // Emit data to the stream
      mockStream.write('data: {"id":"1","choices":[{"delta":{"content":"Hello"}}]}\n');
      mockStream.write('data: {"id":"2","choices":[{"delta":{"content":" world"}}]}\n');
      mockStream.write('data: [DONE]\n');
      mockStream.end();

      await consumePromise;

      expect(results).toHaveLength(2);
      expect(results[0].choices[0].delta.content).toBe('Hello');
      expect(results[1].choices[0].delta.content).toBe(' world');
    });

    it('should handle direct streaming API call', async () => {
      client = new VLLMClient();
      
      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.statusCode = 200;
          
          // Simulate SSE data
          mockResponse.emit('data', 'data: {"id":"1","choices":[{"delta":{"content":"Stream"}}]}\n');
          mockResponse.emit('data', 'data: [DONE]\n');
          mockResponse.emit('end');
        });
        return req as any;
      });

      const generator = client.chatStream(chatRequest);
      const results: any[] = [];

      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toHaveLength(1);
      expect(results[0].choices[0].delta.content).toBe('Stream');
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      client = new VLLMClient();
    });

    it('should return metrics when available', async () => {
      const mockMetrics = { 
        requests_total: 100,
        errors_total: 5 
      };

      const mockResponse = createMockResponse();
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify(mockMetrics));
          mockResponse.emit('end');
        });
        return req as any;
      });

      const result = await client.getMetrics();
      expect(result).toEqual(mockMetrics);
    });

    it('should return null on error', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          req.emit('error', new Error('Connection failed'));
        });
        return req as any;
      });

      const result = await client.getMetrics();
      expect(result).toBeNull();
    });
  });

  describe('request retry logic', () => {
    beforeEach(() => {
      client = new VLLMClient({ maxRetries: 3 });
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        attempts++;
        
        setImmediate(() => {
          if (attempts < 3) {
            req.emit('error', new Error('Connection failed'));
          } else {
            const mockResponse = createMockResponse();
            if (typeof callback === 'function') callback(mockResponse as any);
            mockResponse.emit('data', JSON.stringify({ status: 'ok' }));
            mockResponse.emit('end');
          }
        });
        
        return req as any;
      });

      const promise = client.checkHealth();
      
      // Fast-forward through retry delays
      jest.runAllTimers();
      
      const result = await promise;
      expect(result).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should throw error after max retries', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          req.emit('error', new Error('Connection failed'));
        });
        return req as any;
      });

      const promise = client.checkHealth();
      jest.runAllTimers();
      
      const result = await promise;
      expect(result).toBe(false); // checkHealth catches errors and returns false
    });
  });

  describe('HTTPS support', () => {
    it('should use HTTPS for secure URLs', async () => {
      client = new VLLMClient({ baseUrl: 'https://secure-server:8443' });
      
      const mockResponse = createMockResponse();
      mockHttpsRequest.mockImplementation((options, callback) => {
        const req = createMockRequest();
        setImmediate(() => {
          if (typeof callback === 'function') callback(mockResponse as any);
          mockResponse.emit('data', JSON.stringify({ status: 'ok' }));
          mockResponse.emit('end');
        });
        return req as any;
      });

      await client.checkHealth();
      
      expect(mockHttpsRequest).toHaveBeenCalled();
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      client = new VLLMClient({ timeout: 1000 });
    });

    it('should handle request timeout', async () => {
      mockRequest.mockImplementation((_options: any, callback: any) => {
        const req = createMockRequest();
        setImmediate(() => {
          req.emit('timeout');
        });
        return req as any;
      });

      const result = await client.checkHealth();
      expect(result).toBe(false);
    });
  });
});

// Helper functions
function createMockResponse() {
  const response = new EventEmitter() as any;
  response.statusCode = 200;
  response.setEncoding = jest.fn();
  return response;
}

function createMockRequest() {
  const req = new EventEmitter() as any;
  req.write = jest.fn();
  req.end = jest.fn();
  req.destroy = jest.fn();
  req.on = jest.fn((event, handler) => {
    EventEmitter.prototype.on.call(req, event, handler);
    return req;
  });
  return req;
}