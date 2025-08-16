import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';
import axios from 'axios';

/**
 * System Test: Hello Add with Local LLM (DeepSeek R1)
 * 
 * Mock-free test that asks a simple addition question to a local LLM
 * and verifies the numeric answer in the response.
 * 
 * This test uses real process execution and HTTP requests to communicate
 * with either Ollama or vLLM running DeepSeek R1 model locally.
 */

interface LLMResponse {
  answer: string;
  model: string;
  timestamp: string;
}

class LocalLLMChatSystem {
  private ollamaEndpoint = 'http://localhost:11434/api/generate';
  private vllmEndpoint = 'http://localhost:8000/v1/completions';
  private testDir: string;
  private logFile: string;
  private useOllama: boolean = true;

  constructor(testDir: string) {
    this.testDir = testDir;
    this.logFile = join(testDir, 'llm-chat.log');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.testDir, { recursive: true });
    
    // Check which LLM server is available
    this.useOllama = await this.checkOllamaAvailable();
    if (!this.useOllama) {
      const vllmAvailable = await this.checkVLLMAvailable();
      if (!vllmAvailable) {
        throw new Error('No local LLM server available. Please start Ollama or vLLM with DeepSeek R1 model.');
      }
    }
    
    await this.log(`Initialized with ${this.useOllama ? 'Ollama' : 'vLLM'} backend`);
  }

  private async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:11434/api/tags', {
        timeout: 2000
      });
      const models = response.data?.models || [];
      return models.some((m: any) => 
        m.name?.toLowerCase().includes('deepseek') || 
        m.name?.toLowerCase().includes('r1')
      );
    } catch {
      return false;
    }
  }

  private async checkVLLMAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:8000/v1/models', {
        timeout: 2000
      });
      const models = response.data?.data || [];
      return models.some((m: any) => 
        m.id?.toLowerCase().includes('deepseek') ||
        m.id?.toLowerCase().includes('r1')
      );
    } catch {
      return false;
    }
  }

  async askAdditionQuestion(num1: number, num2: number): Promise<LLMResponse> {
    const prompt = `Please calculate the sum of ${num1} + ${num2}. 
    Respond with just the number, nothing else.`;
    
    await this.log(`Asking: ${prompt}`);
    
    if (this.useOllama) {
      return await this.askOllama(prompt);
    } else {
      return await this.askVLLM(prompt);
    }
  }

  private async askOllama(prompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(this.ollamaEndpoint, {
        model: 'deepseek-r1:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,  // Low temperature for deterministic math
          top_p: 0.9,
          max_tokens: 10     // We only need a number
        }
      }, {
        timeout: 30000
      });

      const answer = this.extractNumber(response.data.response);
      await this.log(`Ollama response: ${answer}`);
      
      return {
        answer,
        model: 'deepseek-r1 (Ollama)',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      await this.log(`Ollama error: ${error.message}`);
      throw new Error(`Failed to get response from Ollama: ${error.message}`);
    }
  }

  private async askVLLM(prompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(this.vllmEndpoint, {
        model: 'deepseek-ai/DeepSeek-R1-32B',
        prompt: prompt,
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 10,
        stop: ['\\n', '.', ',']
      }, {
        timeout: 30000
      });

      const answer = this.extractNumber(response.data.choices[0].text);
      await this.log(`vLLM response: ${answer}`);
      
      return {
        answer,
        model: 'deepseek-r1 (vLLM)',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      await this.log(`vLLM error: ${error.message}`);
      throw new Error(`Failed to get response from vLLM: ${error.message}`);
    }
  }

  private extractNumber(text: string): string {
    // Extract just the number from the response
    const match = text.match(/\\d+/);
    return match ? match[0] : text.trim();
  }

  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\\n`;
    await fs.appendFile(this.logFile, logEntry);
  }

  async cleanup(): Promise<void> {
    if (await fs.access(this.testDir).then(() => true).catch(() => false)) {
      await fs.rm(this.testDir, { recursive: true, force: true });
    }
  }
}

describe('Hello Add - Local LLM System Test', () => {
  let chatSystem: LocalLLMChatSystem;
  const testDir = join(os.tmpdir(), 'hello-add-test-' + Date.now());

  beforeAll(async () => {
    chatSystem = new LocalLLMChatSystem(testDir);
    try {
      await chatSystem.initialize();
    } catch (error: any) {
      console.warn('Local LLM not available, tests will be skipped:', error.message);
    }
  }, 30000);

  afterAll(async () => {
    if (chatSystem) {
      await chatSystem.cleanup();
    }
  });

  test('should correctly add 2 + 3', async () => {
    try {
      const response = await chatSystem.askAdditionQuestion(2, 3);
      expect(response.answer).toBe('5');
      expect(response.model).toBeDefined();
      expect(response.timestamp).toBeDefined();
    } catch (error: any) {
      if (error.message.includes('No local LLM server')) {
        console.log('Skipping test: No local LLM server available');
        return;
      }
      throw error;
    }
  }, 60000);

  test('should correctly add 10 + 15', async () => {
    try {
      const response = await chatSystem.askAdditionQuestion(10, 15);
      expect(response.answer).toBe('25');
    } catch (error: any) {
      if (error.message.includes('No local LLM server')) {
        console.log('Skipping test: No local LLM server available');
        return;
      }
      throw error;
    }
  }, 60000);

  test('should correctly add 100 + 200', async () => {
    try {
      const response = await chatSystem.askAdditionQuestion(100, 200);
      expect(response.answer).toBe('300');
    } catch (error: any) {
      if (error.message.includes('No local LLM server')) {
        console.log('Skipping test: No local LLM server available');
        return;
      }
      throw error;
    }
  }, 60000);

  test('should correctly add negative numbers -5 + 8', async () => {
    try {
      const response = await chatSystem.askAdditionQuestion(-5, 8);
      expect(response.answer).toBe('3');
    } catch (error: any) {
      if (error.message.includes('No local LLM server')) {
        console.log('Skipping test: No local LLM server available');
        return;
      }
      throw error;
    }
  }, 60000);

  test('should correctly add 0 + 42', async () => {
    try {
      const response = await chatSystem.askAdditionQuestion(0, 42);
      expect(response.answer).toBe('42');
    } catch (error: any) {
      if (error.message.includes('No local LLM server')) {
        console.log('Skipping test: No local LLM server available');
        return;
      }
      throw error;
    }
  }, 60000);
});