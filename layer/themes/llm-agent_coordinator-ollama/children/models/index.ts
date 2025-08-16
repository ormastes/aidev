/**
 * Model Manager
 * Manages Ollama models and their configurations
 */

import { EventEmitter } from 'node:events';
import { OllamaClient, OllamaModel, ModelInfo } from '../client';

export interface ModelConfig {
  name: string;
  baseModel?: string;
  parameters?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    repeatPenalty?: number;
    seed?: number;
    numPredict?: number;
    numCtx?: number;
    stop?: string[];
  };
  system?: string;
  template?: string;
  modelfile?: string;
  quantization?: 'q4_0' | 'q4_1' | 'q5_0' | 'q5_1' | 'q8_0' | 'f16';
}

export interface ModelTemplate {
  name: string;
  description: string;
  baseModel: string;
  system: string;
  parameters: Record<string, any>;
  examples?: Array<{ input: string; output: string }>;
}

export type ModelCapability = 'chat' | "completion" | "embedding" | 'code' | 'vision' | "function";

export interface ModelStatus {
  name: string;
  installed: boolean;
  size?: number;
  modifiedAt?: Date;
  capabilities?: ModelCapability[];
  performance?: {
    tokensPerSecond?: number;
    contextLength?: number;
    memoryUsage?: number;
  };
}

export class ModelManager extends EventEmitter {
  private client: OllamaClient;
  private modelCache: Map<string, ModelInfo>;
  private templates: Map<string, ModelTemplate>;
  private activeModels: Set<string>;

  constructor(client: OllamaClient) {
    super();
    this.client = client;
    this.modelCache = new Map();
    this.templates = new Map();
    this.activeModels = new Set();
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    const templates: ModelTemplate[] = [
      {
        name: 'coding-assistant',
        description: 'Optimized for code generation and debugging',
        baseModel: "codellama",
        system: 'You are an expert programmer. Provide clear, efficient, and well-documented code.',
        parameters: {
          temperature: 0.1,
          topP: 0.95,
          repeatPenalty: 1.0
        },
        examples: [
          {
            input: 'Write a function to calculate fibonacci',
            output: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)'
          }
        ]
      },
      {
        name: 'creative-writer',
        description: 'Optimized for creative writing and storytelling',
        baseModel: 'llama2',
        system: 'You are a creative writer with a vivid imagination.',
        parameters: {
          temperature: 0.9,
          topP: 0.95,
          repeatPenalty: 1.2
        }
      },
      {
        name: 'analyst',
        description: 'Optimized for data analysis and reasoning',
        baseModel: 'mistral',
        system: 'You are a data analyst. Provide precise, factual analysis.',
        parameters: {
          temperature: 0.3,
          topP: 0.9,
          repeatPenalty: 1.1
        }
      },
      {
        name: "translator",
        description: 'Optimized for language translation',
        baseModel: 'llama2',
        system: 'You are a professional translator. Provide accurate translations.',
        parameters: {
          temperature: 0.2,
          topP: 0.9,
          repeatPenalty: 1.0
        }
      },
      {
        name: 'teacher',
        description: 'Optimized for educational explanations',
        baseModel: 'llama2',
        system: 'You are a patient teacher. Explain concepts clearly and thoroughly.',
        parameters: {
          temperature: 0.5,
          topP: 0.9,
          repeatPenalty: 1.1
        }
      }
    ];

    for (const template of templates) {
      this.templates.set(template.name, template);
    }
  }

  async listModels(): Promise<ModelStatus[]> {
    try {
      const { models } = await this.client.list();
      
      return models.map(model => ({
        name: model.name,
        installed: true,
        size: model.size,
        modifiedAt: new Date(model.modified_at),
        capabilities: this.detectCapabilities(model.name)
      }));
    } catch (error) {
      this.emit('error', { operation: "listModels", error });
      return [];
    }
  }

  async getModel(name: string): Promise<ModelInfo | null> {
    // Check cache first
    if (this.modelCache.has(name)) {
      return this.modelCache.get(name)!;
    }

    try {
      const info = await this.client.show(name);
      this.modelCache.set(name, info);
      return info;
    } catch (error) {
      this.emit('error', { operation: "getModel", model: name, error });
      return null;
    }
  }

  async installModel(name: string, onProgress?: (progress: any) => void): Promise<boolean> {
    this.emit('model:install:start', { model: name });

    try {
      await this.client.pull(name, (progress) => {
        this.emit('model:install:progress', { model: name, progress });
        if (onProgress) {
          onProgress(progress);
        }
      });

      this.emit('model:install:complete', { model: name });
      return true;
    } catch (error) {
      this.emit('model:install:error', { model: name, error });
      return false;
    }
  }

  async uninstallModel(name: string): Promise<boolean> {
    try {
      await this.client.delete(name);
      this.modelCache.delete(name);
      this.activeModels.delete(name);
      this.emit('model:uninstalled', { model: name });
      return true;
    } catch (error) {
      this.emit('error', { operation: "uninstallModel", model: name, error });
      return false;
    }
  }

  async createCustomModel(config: ModelConfig): Promise<boolean> {
    const modelfile = this.generateModelfile(config);
    
    this.emit('model:create:start', { model: config.name });

    try {
      await this.client.create({
        name: config.name,
        modelfile,
        stream: true
      });

      this.emit('model:create:complete', { model: config.name });
      return true;
    } catch (error) {
      this.emit('model:create:error', { model: config.name, error });
      return false;
    }
  }

  async createFromTemplate(templateName: string, modelName: string): Promise<boolean> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const config: ModelConfig = {
      name: modelName,
      baseModel: template.baseModel,
      system: template.system,
      parameters: template.parameters
    };

    return this.createCustomModel(config);
  }

  private generateModelfile(config: ModelConfig): string {
    const lines: string[] = [];

    // Base model
    if (config.baseModel) {
      lines.push(`FROM ${config.baseModel}`);
    }

    // System prompt
    if (config.system) {
      lines.push(`SYSTEM "${config.system}"`);
    }

    // Template
    if (config.template) {
      lines.push(`TEMPLATE "${config.template}"`);
    }

    // Parameters
    if (config.parameters) {
      for (const [key, value] of Object.entries(config.parameters)) {
        lines.push(`PARAMETER ${key} ${value}`);
      }
    }

    return lines.join('\n');
  }

  async copyModel(source: string, destination: string): Promise<boolean> {
    try {
      await this.client.copy(source, destination);
      this.emit('model:copied', { source, destination });
      return true;
    } catch (error) {
      this.emit('error', { operation: "copyModel", source, destination, error });
      return false;
    }
  }

  async loadModel(name: string): Promise<boolean> {
    if (this.activeModels.has(name)) {
      return true;
    }

    try {
      // Warm up the model with a simple request
      await this.client.generate({
        model: name,
        prompt: 'Hello',
        options: { num_predict: 1 }
      });

      this.activeModels.add(name);
      this.emit('model:loaded', { model: name });
      return true;
    } catch (error) {
      this.emit('error', { operation: "loadModel", model: name, error });
      return false;
    }
  }

  async unloadModel(name: string): Promise<void> {
    this.activeModels.delete(name);
    this.emit('model:unloaded', { model: name });
  }

  isModelLoaded(name: string): boolean {
    return this.activeModels.has(name);
  }

  private detectCapabilities(modelName: string): ModelCapability[] {
    const capabilities: ModelCapability[] = ["completion", 'chat'];
    
    const name = modelName.toLowerCase();
    
    if (name.includes('code') || name.includes('llama')) {
      capabilities.push('code');
    }
    
    if (name.includes('embed') || name.includes('nomic')) {
      capabilities.push("embedding");
    }
    
    if (name.includes('llava') || name.includes('vision')) {
      capabilities.push('vision');
    }
    
    if (name.includes("function") || name.includes('tool')) {
      capabilities.push("function");
    }
    
    return capabilities;
  }

  async benchmarkModel(name: string, options?: {
    promptLength?: number;
    maxTokens?: number;
    iterations?: number;
  }): Promise<{
    tokensPerSecond: number;
    firstTokenLatency: number;
    totalDuration: number;
    memoryUsage?: number;
  }> {
    const config = {
      promptLength: options?.promptLength || 100,
      maxTokens: options?.maxTokens || 100,
      iterations: options?.iterations || 3
    };

    const prompt = 'The quick brown fox '.repeat(Math.ceil(config.promptLength / 4));
    const results: number[] = [];
    let firstTokenLatency = 0;

    for (let i = 0; i < config.iterations; i++) {
      const startTime = Date.now();
      let firstToken = true;

      await this.client.generate({
        model: name,
        prompt,
        stream: true,
        options: {
          num_predict: config.maxTokens
        }
      });

      this.client.on('stream:chunk', () => {
        if (firstToken) {
          firstTokenLatency = Date.now() - startTime;
          firstToken = false;
        }
      });

      const duration = Date.now() - startTime;
      results.push(config.maxTokens / (duration / 1000));
    }

    const avgTokensPerSecond = results.reduce((a, b) => a + b, 0) / results.length;

    return {
      tokensPerSecond: avgTokensPerSecond,
      firstTokenLatency,
      totalDuration: results.reduce((a, b) => a + b, 0),
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  getTemplates(): ModelTemplate[] {
    return Array.from(this.templates.values());
  }

  addTemplate(template: ModelTemplate): void {
    this.templates.set(template.name, template);
    this.emit('template:added', { template: template.name });
  }

  removeTemplate(name: string): boolean {
    const result = this.templates.delete(name);
    if (result) {
      this.emit('template:removed', { template: name });
    }
    return result;
  }

  clearCache(): void {
    this.modelCache.clear();
    this.emit('cache:cleared');
  }

  getActiveModels(): string[] {
    return Array.from(this.activeModels);
  }

  async exportModel(name: string, path: string): Promise<boolean> {
    try {
      await this.client.push(name);
      this.emit('model:exported', { model: name, path });
      return true;
    } catch (error) {
      this.emit('error', { operation: "exportModel", model: name, error });
      return false;
    }
  }
}

export default ModelManager;