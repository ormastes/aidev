import { ClaudeAPIClient, ClaudeAPIConfig, ClaudeMessage, APIError } from '../../../src/core/claude-api-client';
import { ClaudeAuthManager } from '../../../src/core/claude-auth';
import { https } from '../../../../../../infra_external-log-lib/src';
import { EventEmitter } from '../../../../../../infra_external-log-lib/src';

jest.mock('../../../src/core/claude-auth');
jest.mock('https');

describe('ClaudeAPIClient', () => {
  let client: ClaudeAPIClient;
  let mockAuthManager: jest.Mocked<ClaudeAuthManager>;
  let mockRequest: jest.MockedFunction<typeof https.request>;

  beforeEach(() => {
    mockAuthManager = {
      getAuthHeader: jest.fn(),
      validateAuth: jest.fn(),
      getAuthType: jest.fn(),
      getAuthTypeAsync: jest.fn(),
      refreshAuth: jest.fn(),
      isExpired: jest.fn()
    } as any;

    (ClaudeAuthManager as jest.Mock).mockImplementation(() => mockAuthManager);

    mockRequest = https.request as jest.MockedFunction<typeof https.request>;

    const config: ClaudeAPIConfig = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-opus-4-20250514',
      maxTokens: 4096,
      timeout: 30000
    };

    client = new ClaudeAPIClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const config: ClaudeAPIConfig = {};
      const defaultClient = new ClaudeAPIClient(config);
      
      expect(ClaudeAuthManager).toHaveBeenCalledWith({
        apiKey: undefined
      });
      expect(defaultClient['baseUrl']).toBe('https://api.anthropic.com');
      expect(defaultClient['model']).toBe('claude-opus-4-20250514');
      expect(defaultClient['maxTokens']).toBe(4096);
      expect(defaultClient['timeout']).toBe(60000);
    });

    it('should initialize with custom config', () => {
      const config: ClaudeAPIConfig = {
        apiKey: 'custom-key',
        baseUrl: 'https://custom.api.com',
        model: 'claude-3-sonnet',
        maxTokens: 2048,
        timeout: 15000,
        authOptions: { useOAuth: true }
      };

      const customClient = new ClaudeAPIClient(config);

      expect(ClaudeAuthManager).toHaveBeenCalledWith({
        apiKey: 'custom-key',
        useOAuth: true
      });
      expect(customClient['baseUrl']).toBe('https://custom.api.com');
      expect(customClient['model']).toBe('claude-3-sonnet');
      expect(customClient['maxTokens']).toBe(2048);
      expect(customClient['timeout']).toBe(15000);
    });
  });

  describe('createMessage', () => {
    const messages: ClaudeMessage[] = [
      { role: 'user', content: 'Hello, Claude!' }
    ];

    it('should create non-streaming message successfully', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('x-api-key test-key');

      const mockResponse = {
        statusCode: 200,
        on: jest.fn()
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockRequest.mockReturnValue(mockReq as any);

      // Simulate successful response
      mockResponse.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({
            content: [{ text: 'Hello! How can I help you?' }]
          }));
        } else if (event === 'end') {
          callback();
        }
      });

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse as any);
        return mockReq as any;
      });

      const response = await client.createMessage(messages);

      expect(mockAuthManager.getAuthHeader).toHaveBeenCalled();
      expect(response).toBe('Hello! How can I help you?');
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': 'test-key'
          })
        }),
        expect.any(Function)
      );
    });

    it('should create streaming message', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('Bearer oauth-token');

      const mockResponse = {
        statusCode: 200,
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: Buffer.from('data: {"type":"message_start"}\n\n'), done: false })
            .mockResolvedValueOnce({ value: Buffer.from('data: [In Progress]\n\n'), done: false })
            .mockResolvedValueOnce({ done: true })
        })
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse as any);
        return mockReq as any;
      });

      const response = await client.createMessage(messages, { stream: true });

      expect(response).toBeDefined();
      expect(typeof response === 'object' && 'next' in response).toBe(true);
    });

    it('should handle API errors', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('x-api-key test-key');

      const mockResponse = {
        statusCode: 400,
        on: jest.fn()
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockRequest.mockReturnValue(mockReq as any);

      mockResponse.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({
            error: {
              type: 'invalid_request_error',
              message: 'Invalid request'
            }
          }));
        } else if (event === 'end') {
          callback();
        }
      });

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse as any);
        return mockReq as any;
      });

      const errorListener = jest.fn();
      client.on('error', errorListener);

      await expect(client.createMessage(messages)).rejects.toEqual({
        type: 'invalid_request_error',
        message: 'Invalid request',
        status: 400
      });

      expect(errorListener).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('x-api-key test-key');

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockRequest.mockReturnValue(mockReq as any);

      // Simulate network error
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('Network error'));
        }
      });

      const errorListener = jest.fn();
      client.on('error', errorListener);

      await expect(client.createMessage(messages)).rejects.toEqual({
        type: 'network_error',
        message: 'Network error'
      });

      expect(errorListener).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('x-api-key test-key');

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      mockRequest.mockReturnValue(mockReq as any);

      // Simulate timeout
      mockReq.on.mockImplementation((event, callback) => {
        if (event === 'timeout') {
          callback();
        }
      });

      const errorListener = jest.fn();
      client.on('error', errorListener);

      await expect(client.createMessage(messages)).rejects.toEqual({
        type: 'timeout_error',
        message: 'Request timeout after 30000ms'
      });

      expect(mockReq.destroy).toHaveBeenCalled();
      expect(errorListener).toHaveBeenCalled();
    });

    it('should handle auth errors', async () => {
      mockAuthManager.getAuthHeader.mockRejectedValue(new Error('Auth failed'));

      await expect(client.createMessage(messages)).rejects.toThrow('Auth failed');
    });

    it('should handle JSON parse errors', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('x-api-key test-key');

      const mockResponse = {
        statusCode: 200,
        on: jest.fn()
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockRequest.mockReturnValue(mockReq as any);

      mockResponse.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback('invalid json');
        } else if (event === 'end') {
          callback();
        }
      });

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse as any);
        return mockReq as any;
      });

      const errorListener = jest.fn();
      client.on('error', errorListener);

      await expect(client.createMessage(messages)).rejects.toEqual({
        type: 'parse_error',
        message: 'Failed to parse API response'
      });

      expect(errorListener).toHaveBeenCalled();
    });

    it('should include metadata in request', async () => {
      mockAuthManager.getAuthHeader.mockResolvedValue('x-api-key test-key');

      const mockResponse = {
        statusCode: 200,
        on: jest.fn()
      };

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      mockRequest.mockReturnValue(mockReq as any);

      mockResponse.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({ content: [{ text: 'response' }] }));
        } else if (event === 'end') {
          callback();
        }
      });

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse as any);
        return mockReq as any;
      });

      await client.createMessage(messages, {
        sessionId: 'session-123',
        dangerousMode: true,
        allowedTools: ['tool1', 'tool2']
      });

      const writeCall = mockReq.write.mock.calls[0][0];
      const requestData = JSON.parse(writeCall);

      expect(requestData.metadata).toEqual({
        session_id: 'session-123',
        dangerous_mode: true,
        allowed_tools: ['tool1', 'tool2']
      });
    });
  });

  describe('abortStream', () => {
    it('should abort active stream', () => {
      const mockStream = {
        destroy: jest.fn()
      };

      client['activeStreams'].set('stream-1', mockStream as any);

      const abortListener = jest.fn();
      client.on('stream_aborted', abortListener);

      const result = client.abortStream('stream-1');

      expect(result).toBe(true);
      expect(mockStream.destroy).toHaveBeenCalled();
      expect(client['activeStreams'].has('stream-1')).toBe(false);
      expect(abortListener).toHaveBeenCalledWith({ streamId: 'stream-1' });
    });

    it('should return false for non-existent stream', () => {
      const result = client.abortStream('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('abortAllStreams', () => {
    it('should abort all active streams', () => {
      const mockStream1 = { destroy: jest.fn() };
      const mockStream2 = { destroy: jest.fn() };

      client['activeStreams'].set('stream-1', mockStream1 as any);
      client['activeStreams'].set('stream-2', mockStream2 as any);

      const abortListener = jest.fn();
      client.on('stream_aborted', abortListener);

      client.abortAllStreams();

      expect(mockStream1.destroy).toHaveBeenCalled();
      expect(mockStream2.destroy).toHaveBeenCalled();
      expect(client['activeStreams'].size).toBe(0);
      expect(abortListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('getActiveStreamCount', () => {
    it('should return correct stream count', () => {
      expect(client.getActiveStreamCount()).toBe(0);

      client['activeStreams'].set('stream-1', {} as any);
      client['activeStreams'].set('stream-2', {} as any);

      expect(client.getActiveStreamCount()).toBe(2);
    });
  });

  describe('isStreamActive', () => {
    it('should return true for active stream', () => {
      client['activeStreams'].set('stream-1', {} as any);
      expect(client.isStreamActive('stream-1')).toBe(true);
    });

    it('should return false for inactive stream', () => {
      expect(client.isStreamActive('non-existent')).toBe(false);
    });
  });

  describe('createMessageWithRetry', () => {
    const messages: ClaudeMessage[] = [
      { role: 'user', content: 'Test message' }
    ];

    it('should succeed on first attempt', async () => {
      const createMessageSpy = jest.spyOn(client, 'createMessage')
        .mockResolvedValue('Success response');

      const result = await client.createMessageWithRetry(messages);

      expect(result).toBe('Success response');
      expect(createMessageSpy).toHaveBeenCalledTimes(1);
    });

    it('should retry on server errors', async () => {
      const serverError: APIError = {
        type: 'server_error',
        message: 'Internal server error',
        status: 500
      };

      const createMessageSpy = jest.spyOn(client, 'createMessage')
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('Success after retry');

      const retryListener = jest.fn();
      client.on('retry', retryListener);

      const result = await client.createMessageWithRetry(messages);

      expect(result).toBe('Success after retry');
      expect(createMessageSpy).toHaveBeenCalledTimes(3);
      expect(retryListener).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors', async () => {
      const clientError: APIError = {
        type: 'invalid_request_error',
        message: 'Bad request',
        status: 400
      };

      const createMessageSpy = jest.spyOn(client, 'createMessage')
        .mockRejectedValue(clientError);

      await expect(client.createMessageWithRetry(messages))
        .rejects.toEqual(clientError);

      expect(createMessageSpy).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const serverError: APIError = {
        type: 'server_error',
        message: 'Server error',
        status: 500
      };

      const createMessageSpy = jest.spyOn(client, 'createMessage')
        .mockRejectedValue(serverError);

      await expect(client.createMessageWithRetry(messages, {}, 2))
        .rejects.toEqual(serverError);

      expect(createMessageSpy).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      jest.useFakeTimers();

      const serverError: APIError = {
        type: 'server_error',
        message: 'Server error',
        status: 500
      };

      const createMessageSpy = jest.spyOn(client, 'createMessage')
        .mockRejectedValue(serverError);

      const retryPromise = client.createMessageWithRetry(messages, {}, 3);

      // Fast-forward through the delays
      await jest.advanceTimersByTimeAsync(1000); // First retry delay
      await jest.advanceTimersByTimeAsync(2000); // Second retry delay

      await expect(retryPromise).rejects.toEqual(serverError);

      jest.useRealTimers();
    });
  });

  describe('authentication methods', () => {
    it('should check if authenticated', async () => {
      mockAuthManager.validateAuth.mockResolvedValue(true);

      const result = await client.isAuthenticated();

      expect(result).toBe(true);
      expect(mockAuthManager.validateAuth).toHaveBeenCalled();
    });

    it('should get auth type', () => {
      mockAuthManager.getAuthType.mockReturnValue('api-key');

      const result = client.getAuthType();

      expect(result).toBe('api-key');
      expect(mockAuthManager.getAuthType).toHaveBeenCalled();
    });

    it('should get auth info', async () => {
      mockAuthManager.getAuthTypeAsync.mockResolvedValue('oauth');
      mockAuthManager.validateAuth.mockResolvedValue(true);

      const result = await client.getAuthInfo();

      expect(result).toEqual({
        type: 'oauth',
        authenticated: true
      });
    });
  });

  describe('parseSSEStream', () => {
    it('should handle stream end correctly', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ 
              value: Buffer.from('data: [In Progress]\n\n'), 
              done: false 
            })
            .mockResolvedValueOnce({ done: true })
        })
      };

      const endListener = jest.fn();
      client.on('stream_end', endListener);

      const generator = client['parseSSEStream'](mockStream as any, 'test-stream');
      
      // Consume the generator
      const results = [];
      for await (const event of generator) {
        results.push(event);
      }

      expect(results).toHaveLength(0); // Should end without yielding events
      expect(endListener).toHaveBeenCalledWith({ streamId: 'test-stream' });
    });

    it('should parse valid JSON events', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ 
              value: Buffer.from('data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n'), 
              done: false 
            })
            .mockResolvedValueOnce({ 
              value: Buffer.from('data: [In Progress]\n\n'), 
              done: false 
            })
            .mockResolvedValueOnce({ done: true })
        })
      };

      const streamEventListener = jest.fn();
      client.on('stream_event', streamEventListener);

      const generator = client['parseSSEStream'](mockStream as any, 'test-stream');
      
      const results = [];
      for await (const event of generator) {
        results.push(event);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        event: 'content_block_delta',
        data: { type: 'content_block_delta', delta: { text: 'Hello' } }
      });
      expect(streamEventListener).toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ 
              value: Buffer.from('data: invalid json\n\n'), 
              done: false 
            })
            .mockResolvedValueOnce({ 
              value: Buffer.from('data: [In Progress]\n\n'), 
              done: false 
            })
            .mockResolvedValueOnce({ done: true })
        })
      };

      const streamErrorListener = jest.fn();
      client.on('stream_error', streamErrorListener);

      const generator = client['parseSSEStream'](mockStream as any, 'test-stream');
      
      const results = [];
      for await (const event of generator) {
        results.push(event);
      }

      expect(results).toHaveLength(0);
      expect(streamErrorListener).toHaveBeenCalledWith({
        streamId: 'test-stream',
        error: 'Failed to parse stream data'
      });
    });
  });
});