import { VLLMCoordinatorAgent, VLLMCoordinatorConfig, createVLLMCoordinator } from '../../../src/agents/vllm-coordinator';
import { VLLMClient } from '../../../src/services/vllm-client';
import { VLLMInstaller } from '../../../src/services/vllm-installer';
import { Message } from '../../../src/agents/coordinator-interface';
import * as deepseekConfig from '../../../src/config/deepseek-r1';

// Mock dependencies
jest.mock('../../../src/services/vllm-client');
jest.mock('../../../src/services/vllm-installer');
jest.mock('../../../src/config/deepseek-r1');

describe('VLLMCoordinatorAgent', () => {
  let coordinator: VLLMCoordinatorAgent;
  let mockVLLMClient: jest.Mocked<VLLMClient>;
  let mockVLLMInstaller: jest.Mocked<VLLMInstaller>;
  let config: VLLMCoordinatorConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockVLLMClient = {
      checkHealth: jest.fn().mockResolvedValue(true),
      listModels: jest.fn().mockResolvedValue([
        { id: 'deepseek-ai/DeepSeek-R1-32B-Chat', object: 'model', created: 123, owned_by: 'vllm' }
      ]),
      chat: jest.fn().mockResolvedValue({
        id: 'chat-123',
        object: 'chat.completion',
        created: 123456,
        model: 'deepseek-ai/DeepSeek-R1-32B-Chat',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop'
        }]
      }),
      chatStream: jest.fn(),
      getMetrics: jest.fn().mockResolvedValue({ requests: 100 })
    } as any;

    mockVLLMInstaller = {
      isInstalled: jest.fn().mockResolvedValue(true),
      checkGPU: jest.fn().mockResolvedValue({
        available: true,
        type: 'cuda',
        name: 'NVIDIA GPU',
        memory: 16384
      }),
      autoInstall: jest.fn().mockResolvedValue(true),
      startServer: jest.fn().mockResolvedValue(true),
      stopServer: jest.fn(),
      downloadModel: jest.fn().mockResolvedValue(true)
    } as any;

    (VLLMClient as jest.MockedClass<typeof VLLMClient>).mockImplementation(() => mockVLLMClient);
    (VLLMInstaller as jest.MockedClass<typeof VLLMInstaller>).mockImplementation(() => mockVLLMInstaller);

    // Mock deepseek config
    (deepseekConfig.resolveModelName as jest.Mock).mockReturnValue('deepseek-ai/DeepSeek-R1-32B-Chat');
    (deepseekConfig.getDeepSeekConfig as jest.Mock).mockReturnValue({
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: 'You are a helpful assistant.',
      contextLength: 32768
    });
    (deepseekConfig.createVLLMParameters as jest.Mock).mockReturnValue({
      temperature: 0.7,
      max_tokens: 4096
    });

    // Default config
    config = {
      serverUrl: 'ws://localhost:3000',
      roomId: 'test-room',
      agentName: 'TestBot',
      vllmConfig: {
        model: 'deepseek-r1:32b',
        serverUrl: 'http://localhost:8000',
        apiKey: 'test-key',
        autoInstall: false,
        streaming: false
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      coordinator = new VLLMCoordinatorAgent(config);
      
      expect(coordinator.capabilities).toEqual({
        chat: true,
        math: true,
        code: true,
        summarize: true,
        moderate: false,
        analyze: true,
        translate: true,
        help: true,
        streaming: true
      });
      
      expect(VLLMClient).toHaveBeenCalledWith({
        baseUrl: 'http://localhost:8000',
        apiKey: 'test-key',
        timeout: 60000
      });
    });

    it('should merge custom parameters with default config', () => {
      config.vllmConfig.parameters = {
        temperature: 0.9,
        maxTokens: 2048
      };
      config.vllmConfig.systemPrompt = 'Custom prompt';
      
      coordinator = new VLLMCoordinatorAgent(config);
      
      expect(deepseekConfig.getDeepSeekConfig).toHaveBeenCalledWith('deepseek-r1:32b');
    });
  });

  describe('onStart', () => {
    beforeEach(() => {
      coordinator = new VLLMCoordinatorAgent(config);
    });

    it('should start successfully when server is running and model available', async () => {
      await coordinator['onStart']();
      
      expect(mockVLLMClient.checkHealth).toHaveBeenCalled();
      expect(mockVLLMInstaller.checkGPU).toHaveBeenCalled();
      expect(mockVLLMClient.listModels).toHaveBeenCalled();
      expect(mockVLLMClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-ai/DeepSeek-R1-32B-Chat',
          messages: expect.arrayContaining([
            { role: 'user', content: 'Say "Hello" in one word.' }
          ])
        })
      );
    });

    it('should auto-install vLLM when enabled and server not running', async () => {
      config.vllmConfig.autoInstall = true;
      coordinator = new VLLMCoordinatorAgent(config);
      
      mockVLLMClient.checkHealth
        .mockResolvedValueOnce(false) // Initial check fails
        .mockResolvedValueOnce(true); // After start succeeds
      
      mockVLLMInstaller.isInstalled.mockResolvedValueOnce(false);
      
      await coordinator['onStart']();
      
      expect(mockVLLMInstaller.autoInstall).toHaveBeenCalled();
      expect(mockVLLMInstaller.startServer).toHaveBeenCalledWith(
        'deepseek-ai/DeepSeek-R1-32B-Chat',
        8000
      );
    });

    it('should download model when auto-install enabled and model not found', async () => {
      config.vllmConfig.autoInstall = true;
      coordinator = new VLLMCoordinatorAgent(config);
      
      mockVLLMClient.listModels.mockResolvedValueOnce([]);
      
      await coordinator['onStart']();
      
      expect(mockVLLMInstaller.downloadModel).toHaveBeenCalledWith('deepseek-ai/DeepSeek-R1-32B-Chat');
      expect(mockVLLMInstaller.stopServer).toHaveBeenCalled();
      expect(mockVLLMInstaller.startServer).toHaveBeenCalled();
    });

    it('should throw error when server not running and auto-install disabled', async () => {
      mockVLLMClient.checkHealth.mockResolvedValue(false);
      
      await expect(coordinator['onStart']()).rejects.toThrow(
        'vLLM server is not running. Please start it manually or enable auto-installation.'
      );
    });

    it('should throw error when model not found and auto-install disabled', async () => {
      mockVLLMClient.listModels.mockResolvedValue([]);
      
      await expect(coordinator['onStart']()).rejects.toThrow(
        'Model deepseek-ai/DeepSeek-R1-32B-Chat not found on server.'
      );
    });

    it('should handle GPU not available', async () => {
      mockVLLMInstaller.checkGPU.mockResolvedValue({
        available: false,
        type: 'cpu'
      });
      
      await coordinator['onStart']();
      
      expect(mockVLLMInstaller.checkGPU).toHaveBeenCalled();
    });
  });

  describe('onStop', () => {
    it('should stop server when auto-install enabled', async () => {
      config.vllmConfig.autoInstall = true;
      coordinator = new VLLMCoordinatorAgent(config);
      
      await coordinator['onStop']();
      
      expect(mockVLLMInstaller.stopServer).toHaveBeenCalled();
    });

    it('should not stop server when auto-install disabled', async () => {
      coordinator = new VLLMCoordinatorAgent(config);
      
      await coordinator['onStop']();
      
      expect(mockVLLMInstaller.stopServer).not.toHaveBeenCalled();
    });
  });

  describe('generateResponse', () => {
    beforeEach(async () => {
      coordinator = new VLLMCoordinatorAgent(config);
      await coordinator['onStart']();
    });

    it('should generate standard response', async () => {
      const message: Message = {
        id: '123',
        username: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      const response = await coordinator['generateResponse'](message, []);
      
      expect(response).toBe('Hello!');
      expect(mockVLLMClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-ai/DeepSeek-R1-32B-Chat',
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello, how are you?' }
          ]),
          stream: false
        })
      );
    });

    it('should generate streaming response', async () => {
      config.vllmConfig.streaming = true;
      coordinator = new VLLMCoordinatorAgent(config);
      await coordinator['onStart']();
      
      // Mock streaming response
      const mockStream = async function* (): AsyncGenerator<any> {
        yield { 
          id: 'chat-123',
          object: 'chat.completion.chunk',
          created: 123456,
          model: 'deepseek-ai/DeepSeek-R1-32B-Chat',
          choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }] 
        };
        yield { 
          id: 'chat-123',
          object: 'chat.completion.chunk',
          created: 123456,
          model: 'deepseek-ai/DeepSeek-R1-32B-Chat',
          choices: [{ index: 0, delta: { content: ' world!' }, finish_reason: 'stop' }] 
        };
      };
      mockVLLMClient.chatStream.mockReturnValue(mockStream());
      
      const message: Message = {
        id: '124',
        username: 'user',
        content: 'Say hello',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      const response = await coordinator['generateResponse'](message, []);
      
      expect(response).toBe('Hello world!');
      expect(mockVLLMClient.chatStream).toHaveBeenCalled();
    });

    it('should handle context messages', async () => {
      const context: Message[] = [
        { id: '101', username: 'user1', content: 'What is 2+2?', timestamp: new Date(), roomId: 'test-room' },
        { id: '102', username: 'TestBot', content: '2+2 equals 4', timestamp: new Date(), roomId: 'test-room' }
      ];
      
      const message: Message = {
        id: '125',
        username: 'user1',
        content: 'Can you explain more?',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      await coordinator['generateResponse'](message, context);
      
      expect(mockVLLMClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'user1: What is 2+2?' },
            { role: 'assistant', content: 'TestBot: 2+2 equals 4' },
            { role: 'user', content: 'Can you explain more?' }
          ])
        })
      );
    });

    it('should handle commands', async () => {
      const message: Message = {
        id: '126',
        username: 'user',
        content: '/model',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      const response = await coordinator['generateResponse'](message, []);
      
      expect(response).toBe('Currently using model: deepseek-r1:32b (deepseek-ai/DeepSeek-R1-32B-Chat)');
    });

    it('should handle connection errors', async () => {
      mockVLLMClient.chat.mockRejectedValue(new Error('connect ECONNREFUSED'));
      
      const message: Message = {
        id: '127',
        username: 'user',
        content: 'Hello',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      const response = await coordinator['generateResponse'](message, []);
      
      expect(response).toBe('vLLM server is not running. Please start vLLM or enable auto-installation.');
    });

    it('should handle auth errors', async () => {
      mockVLLMClient.chat.mockRejectedValue(new Error('401 Unauthorized'));
      
      const message: Message = {
        id: '127',
        username: 'user',
        content: 'Hello',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      const response = await coordinator['generateResponse'](message, []);
      
      expect(response).toBe('Invalid API key. Please check your vLLM API key configuration.');
    });
  });

  describe('command handling', () => {
    beforeEach(async () => {
      coordinator = new VLLMCoordinatorAgent(config);
      await coordinator['onStart']();
    });

    it('should handle /models command', async () => {
      const response = await coordinator['handleCommand']('/models');
      
      expect(response).toContain('Available models:');
      expect(response).toContain('deepseek-ai/DeepSeek-R1-32B-Chat');
    });

    it('should handle /info command', async () => {
      const response = await coordinator['handleCommand']('/info');
      
      expect(response).toContain('vLLM Coordinator Info');
      expect(response).toContain('Model: deepseek-r1:32b');
      expect(response).toContain('Temperature: 0.7');
    });

    it('should handle /metrics command', async () => {
      const response = await coordinator['handleCommand']('/metrics');
      
      expect(response).toContain('Server Metrics:');
      expect(response).toContain('"requests": 100');
    });

    it('should handle /help command', async () => {
      const response = await coordinator['handleCommand']('/help');
      
      expect(response).toContain('vLLM Coordinator');
      expect(response).toContain('Chat Features:');
      expect(response).toContain('Commands:');
    });

    it('should handle /summarize command', async () => {
      // Add some context
      const context: Message[] = [
        { id: '201', username: 'user', content: 'Hello', timestamp: new Date(), roomId: 'test-room' },
        { id: '202', username: 'TestBot', content: 'Hi there!', timestamp: new Date(), roomId: 'test-room' }
      ];
      coordinator['messageHistory'] = context;
      
      const response = await coordinator['handleCommand']('/summarize');
      
      expect(response).toContain('Conversation Summary:');
      expect(mockVLLMClient.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Please provide a concise summary')
            })
          ])
        })
      );
    });

    it('should handle unknown commands', async () => {
      const response = await coordinator['handleCommand']('/unknown');
      
      expect(response).toContain('Unknown command: /unknown');
      expect(response).toContain('/help');
    });
  });

  describe('factory function', () => {
    it('should create coordinator with default config', () => {
      const coordinator = createVLLMCoordinator(
        'ws://localhost:3000',
        'test-room',
        'TestBot'
      );
      
      expect(coordinator).toBeInstanceOf(VLLMCoordinatorAgent);
    });

    it('should create coordinator with custom config', () => {
      const coordinator = createVLLMCoordinator(
        'ws://localhost:3000',
        'test-room',
        'TestBot',
        'deepseek-r1:7b',
        {
          vllmConfig: {
            serverUrl: 'http://custom:8080',
            streaming: false
          }
        }
      );
      
      expect(coordinator).toBeInstanceOf(VLLMCoordinatorAgent);
    });

    it('should use environment variables', () => {
      process.env.VLLM_SERVER_URL = 'http://env-server:8000';
      process.env.VLLM_API_KEY = 'env-key';
      
      const coordinator = createVLLMCoordinator(
        'ws://localhost:3000',
        'test-room',
        'TestBot'
      );
      
      expect(coordinator).toBeInstanceOf(VLLMCoordinatorAgent);
      
      // Clean up
      delete process.env.VLLM_SERVER_URL;
      delete process.env.VLLM_API_KEY;
    });
  });
});