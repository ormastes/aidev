import { VLLMClient } from '../../../src/services/vllm-client';

describe('VLLMClient - Unit Tests', () => {
  let client: VLLMClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
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

  describe('configuration and setup', () => {
    it('should handle different server URLs', () => {
      const urls = [
        'http://localhost:8000',
        'https://secure-server:8443',
        'http://192.168.1.100:8080'
      ];
      
      urls.forEach(url => {
        const testClient = new VLLMClient({ baseUrl: url });
        expect(testClient['baseUrl']).toBe(url);
      });
    });

    it('should handle API key configuration', () => {
      const clientWithKey = new VLLMClient({ apiKey: 'test-api-key' });
      expect(clientWithKey['apiKey']).toBe('test-api-key');
      
      const clientWithoutKey = new VLLMClient();
      expect(clientWithoutKey['apiKey']).toBeUndefined();
    });

    it('should handle timeout configuration', () => {
      const shortTimeout = new VLLMClient({ timeout: 5000 });
      expect(shortTimeout['timeout']).toBe(5000);
      
      const longTimeout = new VLLMClient({ timeout: 120000 });
      expect(longTimeout['timeout']).toBe(120000);
    });

    it('should handle retry configuration', () => {
      const noRetries = new VLLMClient({ maxRetries: 0 });
      expect(noRetries['maxRetries']).toBe(0);
      
      const manyRetries = new VLLMClient({ maxRetries: 10 });
      expect(manyRetries['maxRetries']).toBe(10);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton vllmClient', async () => {
      const { vllmClient } = await import('../../../src/services/vllm-client');
      expect(vllmClient).toBeInstanceOf(VLLMClient);
      expect(vllmClient['baseUrl']).toBe('http://localhost:8000');
    });
  });
});