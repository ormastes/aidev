/**
 * Integration tests for Ollama Coordinator
 * These tests require Ollama to be running locally
 */

import { OllamaCoordinator } from '../src/ollama-coordinator';
import { checkOllamaAvailability } from '../pipe/utils';

describe('Ollama Integration Tests', () => {
  let coordinator: OllamaCoordinator;
  let ollamaAvailable: boolean;

  beforeAll(async () => {
    const availability = await checkOllamaAvailability();
    ollamaAvailable = availability.available;
    
    if (!ollamaAvailable) {
      console.warn('⚠️  Ollama is not available - skipping integration tests');
      console.warn('   Start Ollama with: ollama serve');
      return;
    }
  });

  beforeEach(() => {
    if (ollamaAvailable) {
      coordinator = new OllamaCoordinator({
        defaultModel: 'llama2',
        embeddingModel: 'nomic-embed-text',
        enableLogging: false,
        autoInstallModels: false
      });
    }
  });

  afterEach(async () => {
    if (ollamaAvailable && coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('real Ollama server interaction', () => {
    it('should check Ollama availability', async () => {
      if (!ollamaAvailable) {
        expect(ollamaAvailable).toBe(false);
        return;
      }

      const availability = await checkOllamaAvailability();
      expect(availability.available).toBe(true);
      expect(availability.models).toBeDefined();
    });

    it('should initialize coordinator', async () => {
      if (!ollamaAvailable) return;

      await expect(coordinator.initialize()).resolves.not.toThrow();
    });

    it('should list available models', async () => {
      if (!ollamaAvailable) return;

      await coordinator.initialize();
      const models = await coordinator.listModels();
      
      expect(Array.isArray(models)).toBe(true);
    });

    it('should perform health check', async () => {
      if (!ollamaAvailable) return;

      await coordinator.initialize();
      const health = await coordinator.healthCheck();
      
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.services.ollama).toBe(true);
    });

    it('should create chat session', async () => {
      if (!ollamaAvailable) return;

      await coordinator.initialize();
      const session = coordinator.createChatSession({
        model: 'llama2',
        systemPrompt: 'You are a test assistant.'
      });
      
      expect(session).toBeDefined();
      expect(session.id).toBeTruthy();
      expect(session.model).toBe('llama2');
    });

    // These tests require specific models to be installed
    describe('with installed models', () => {
      it('should generate text if model is available', async () => {
        if (!ollamaAvailable) return;

        await coordinator.initialize();
        const models = await coordinator.listModels();
        
        if (models.length === 0) {
          console.warn('⚠️  No models installed - install a model with: ollama pull llama2');
          return;
        }

        const modelName = models[0]?.name;
        if (!modelName) return;

        const result = await coordinator.generate('Say hello', {
          model: modelName,
          maxTokens: 10
        });
        
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }, 30000); // 30 second timeout for generation

      it('should generate embeddings if embedding model is available', async () => {
        if (!ollamaAvailable) return;

        await coordinator.initialize();
        const models = await coordinator.listModels();
        
        const embeddingModel = models.find(m => 
          m.name.includes('embed') || m.name.includes('nomic')
        );
        
        if (!embeddingModel) {
          console.warn('⚠️  No embedding model available - install with: ollama pull nomic-embed-text');
          return;
        }

        const embedding = await coordinator.embed('Hello world', {
          model: embeddingModel.name
        });
        
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBeGreaterThan(0);
        expect(embedding[0]).toBeDefined();
        expect(typeof embedding[0]).toBe('number');
      }, 30000); // 30 second timeout for embedding

      it('should find similar texts', async () => {
        if (!ollamaAvailable) return;

        await coordinator.initialize();
        const models = await coordinator.listModels();
        
        const embeddingModel = models.find(m => 
          m.name.includes('embed') || m.name.includes('nomic')
        );
        
        if (!embeddingModel) {
          console.warn('⚠️  No embedding model available for similarity test');
          return;
        }

        const corpus = [
          'The cat sat on the mat',
          'Dogs are loyal animals',
          'The feline rested on the rug',
          'Cars have four wheels'
        ];

        const results = await coordinator.findSimilar('A cat on a mat', corpus, {
          model: embeddingModel.name,
          topK: 2
        });
        
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(2);
        
        if (results.length > 0) {
          expect(results[0]?.text).toBeDefined();
          expect(results[0]?.similarity).toBeDefined();
          expect(typeof results[0]?.similarity).toBe('number');
        }
      }, 60000); // 60 second timeout for similarity search
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      if (ollamaAvailable) return; // Skip if Ollama is available

      const badCoordinator = new OllamaCoordinator({
        ollama: {
          host: 'nonexistent-host',
          port: 99999
        },
        enableLogging: false
      });

      await expect(badCoordinator.initialize())
        .rejects.toThrow('Ollama service is not available');
    });

    it('should handle invalid model requests', async () => {
      if (!ollamaAvailable) return;

      await coordinator.initialize();
      
      await expect(coordinator.generate('test', {
        model: 'nonexistent-model-12345'
      })).rejects.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple concurrent requests', async () => {
      if (!ollamaAvailable) return;

      await coordinator.initialize();
      const models = await coordinator.listModels();
      
      if (models.length === 0) return;

      const modelName = models[0]?.name;
      if (!modelName) return;

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          coordinator.generate(`Count to ${i + 1}`, {
            model: modelName,
            maxTokens: 5
          })
        );
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    }, 60000); // Longer timeout for concurrent requests
  });
});