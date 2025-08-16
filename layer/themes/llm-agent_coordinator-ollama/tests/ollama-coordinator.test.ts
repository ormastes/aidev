/**
 * Tests for OllamaCoordinator
 */

import { OllamaCoordinator } from '../src/ollama-coordinator';
import { OllamaClient } from '../children/client';

// Mock OllamaClient
jest.mock('../children/client');

describe("OllamaCoordinator", () => {
  let coordinator: OllamaCoordinator;
  let mockClient: jest.Mocked<OllamaClient>;

  beforeEach(() => {
    mockClient = {
      isAvailable: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue({ models: [] }),
      generate: jest.fn().mockResolvedValue({ response: 'test response', done: true }),
      chat: jest.fn().mockResolvedValue({ response: 'chat response', done: true }),
      embeddings: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
      on: jest.fn(),
      emit: jest.fn()
    } as any;

    (OllamaClient as jest.MockedClass<typeof OllamaClient>).mockImplementation(() => mockClient);
    
    coordinator = new OllamaCoordinator({
      defaultModel: 'test-model',
      enableLogging: false,
      autoInstallModels: false
    });
  });

  afterEach(async () => {
    await coordinator.shutdown();
  });

  describe("initialization", () => {
    it('should initialize successfully', async () => {
      await expect(coordinator.initialize()).resolves.not.toThrow();
      expect(mockClient.isAvailable).toHaveBeenCalled();
    });

    it('should throw error if Ollama is not available', async () => {
      mockClient.isAvailable.mockResolvedValue(false);
      
      await expect(coordinator.initialize()).rejects.toThrow('Ollama service is not available');
    });
  });

  describe('text generation', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should generate text successfully', async () => {
      const result = await coordinator.generate('Hello world');
      
      expect(result).toBe('test response');
      expect(mockClient.generate).toHaveBeenCalledWith({
        model: 'test-model',
        prompt: 'Hello world',
        options: {
          temperature: undefined,
          num_predict: undefined
        }
      });
    });

    it('should generate text with custom options', async () => {
      const result = await coordinator.generate('Hello world', {
        model: 'custom-model',
        temperature: 0.5,
        maxTokens: 100
      });
      
      expect(result).toBe('test response');
      expect(mockClient.generate).toHaveBeenCalledWith({
        model: 'custom-model',
        prompt: 'Hello world',
        options: {
          temperature: 0.5,
          num_predict: 100
        }
      });
    });
  });

  describe('chat functionality', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should create chat session', () => {
      const session = coordinator.createChatSession();
      
      expect(session).toBeDefined();
      expect(session.id).toBeTruthy();
      expect(session.model).toBe('test-model');
    });

    it('should create chat session with custom options', () => {
      const session = coordinator.createChatSession({
        model: 'custom-model',
        temperature: 0.8,
        systemPrompt: 'You are a helpful assistant'
      });
      
      expect(session.model).toBe('custom-model');
      expect(session.messages[0]?.role).toBe('system');
      expect(session.messages[0]?.content).toBe('You are a helpful assistant');
    });
  });

  describe("embeddings", () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should generate embeddings', async () => {
      const result = await coordinator.embed('test text');
      
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockClient.embeddings).toHaveBeenCalledWith({
        model: 'nomic-embed-text',
        prompt: 'test text'
      });
    });

    it('should generate embeddings with custom model', async () => {
      const result = await coordinator.embed('test text', {
        model: 'custom-embed-model'
      });
      
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockClient.embeddings).toHaveBeenCalledWith({
        model: 'custom-embed-model',
        prompt: 'test text'
      });
    });
  });

  describe('metrics', () => {
    it('should provide metrics', () => {
      const metrics = coordinator.getMetrics();
      
      expect(metrics).toMatchObject({
        totalRequests: expect.any(Number),
        activeRequests: expect.any(Number),
        completedRequests: expect.any(Number),
        failedRequests: expect.any(Number),
        averageResponseTime: expect.any(Number),
        modelsLoaded: expect.any(Number),
        activeSessions: expect.any(Number),
        queueLength: expect.any(Number),
        uptime: expect.any(Number)
      });
    });
  });

  describe("capabilities", () => {
    it('should provide capabilities', () => {
      const capabilities = coordinator.getCapabilities();
      
      expect(capabilities).toMatchObject({
        chat: true,
        completion: true,
        embedding: true,
        streaming: true,
        modelManagement: true,
        contextMemory: true,
        multimodal: false
      });
    });
  });

  describe('health check', () => {
    it('should perform health check', async () => {
      const health = await coordinator.healthCheck();
      
      expect(health).toMatchObject({
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        services: expect.any(Object),
        metrics: expect.any(Object)
      });
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should handle generate errors', async () => {
      mockClient.generate.mockRejectedValue(new Error('Generate failed'));
      
      await expect(coordinator.generate('test')).rejects.toThrow('Generate failed');
    });

    it('should handle embed errors', async () => {
      mockClient.embeddings.mockRejectedValue(new Error('Embed failed'));
      
      await expect(coordinator.embed('test')).rejects.toThrow('Embed failed');
    });
  });

  describe('queue management', () => {
    beforeEach(async () => {
      await coordinator.initialize();
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = [
        coordinator.generate('prompt 1'),
        coordinator.generate('prompt 2'),
        coordinator.generate('prompt 3')
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBe('test response');
      });
    });

    it('should prioritize high priority tasks', async () => {
      const lowPriorityPromise = coordinator.generate('low priority', { priority: 1 });
      const highPriorityPromise = coordinator.generate('high priority', { priority: 10 });
      
      const results = await Promise.all([lowPriorityPromise, highPriorityPromise]);
      
      expect(results).toHaveLength(2);
    });
  });
});