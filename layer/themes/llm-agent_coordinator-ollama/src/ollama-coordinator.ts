/**
 * Ollama Coordinator - Main orchestrator for Ollama AI services
 * Integrates all Ollama components and provides high-level API
 */

import { EventEmitter } from '../../infra_external-log-lib/src';
import { OllamaClient, OllamaConfig } from '../children/client';
import { ModelManager, ModelStatus, ModelTemplate } from '../children/models';
import { StreamHandler, StreamSession, StreamOptions } from '../children/stream';
import { EmbeddingsManager, EmbeddingRequest, EmbeddingResponse } from '../children/embeddings';
import { ChatManager, ChatSession, ChatOptions, ChatMessage } from '../children/chat';

export interface OllamaCoordinatorConfig {
  ollama?: OllamaConfig;
  enableLogging?: boolean;
  maxConcurrentTasks?: number;
  defaultModel?: string;
  embeddingModel?: string;
  autoInstallModels?: boolean;
}

export interface TaskQueue {
  id: string;
  type: 'generate' | 'chat' | 'embed' | 'stream';
  priority: number;
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  createdAt: Date;
}

export interface CoordinatorMetrics {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  modelsLoaded: number;
  activeSessions: number;
  queueLength: number;
  uptime: number;
}

export interface AgentCapabilities {
  chat: boolean;
  completion: boolean;
  embedding: boolean;
  streaming: boolean;
  modelManagement: boolean;
  contextMemory: boolean;
  multimodal: boolean;
}

export class OllamaCoordinator extends EventEmitter {
  private client: OllamaClient;
  private modelManager: ModelManager;
  private streamHandler: StreamHandler;
  private embeddingsManager: EmbeddingsManager;
  private chatManager: ChatManager;
  private config: Required<OllamaCoordinatorConfig>;
  private taskQueue: TaskQueue[];
  private activeTasks: Set<string>;
  private isProcessingQueue: boolean;
  private metrics: CoordinatorMetrics;
  private startTime: Date;
  private requestCounter: number;

  constructor(config: OllamaCoordinatorConfig = {}) {
    super();
    this.config = {
      ollama: config.ollama || {},
      enableLogging: config.enableLogging ?? true,
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      defaultModel: config.defaultModel || 'llama2',
      embeddingModel: config.embeddingModel || 'nomic-embed-text',
      autoInstallModels: config.autoInstallModels ?? true
    };

    this.taskQueue = [];
    this.activeTasks = new Set();
    this.isProcessingQueue = false;
    this.startTime = new Date();
    this.requestCounter = 0;

    this.metrics = {
      totalRequests: 0,
      activeRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      modelsLoaded: 0,
      activeSessions: 0,
      queueLength: 0,
      uptime: 0
    };

    this.initializeComponents();
    this.setupEventListeners();
    this.startQueueProcessor();
    this.startMetricsUpdater();
  }

  private initializeComponents(): void {
    this.client = new OllamaClient(this.config.ollama);
    this.modelManager = new ModelManager(this.client);
    this.streamHandler = new StreamHandler(this.client);
    this.embeddingsManager = new EmbeddingsManager(this.client, {
      defaultModel: this.config.embeddingModel
    });
    this.chatManager = new ChatManager(this.client, this.streamHandler, {
      defaultOptions: { model: this.config.defaultModel }
    });

    if (this.config.enableLogging) {
      this.log('info', 'Ollama Coordinator initialized');
    }
  }

  private setupEventListeners(): void {
    // Client events
    this.client.on('stream:chunk', (chunk) => {
      this.emit('stream:chunk', chunk);
    });

    // Model events
    this.modelManager.on('model:install:complete', (event) => {
      this.log('info', `Model ${event.model} installed successfully`);
      this.emit('model:installed', event);
    });

    this.modelManager.on('error', (event) => {
      this.log('error', `Model error: ${event.error.message}`);
    });

    // Chat events
    this.chatManager.on('session:created', (event) => {
      this.log('info', `Chat session ${event.sessionId} created`);
    });

    // Stream events
    this.streamHandler.on('stream:complete', (event) => {
      this.log('info', `Stream ${event.sessionId} completed`);
    });

    // Embeddings events
    this.embeddingsManager.on('embedding:complete', (event) => {
      this.log('debug', `Embedding generated for text length: ${event.text.length}`);
    });
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 100); // Process queue every 100ms
  }

  private startMetricsUpdater(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update metrics every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.taskQueue.length === 0) {
      return;
    }

    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Sort by priority (higher number = higher priority)
      this.taskQueue.sort((a, b) => b.priority - a.priority);
      
      const task = this.taskQueue.shift();
      if (!task) {
        this.isProcessingQueue = false;
        return;
      }

      this.activeTasks.add(task.id);
      this.metrics.activeRequests = this.activeTasks.size;

      try {
        const result = await this.executeTask(task);
        task.resolve(result);
        this.metrics.completedRequests++;
      } catch (error) {
        task.reject(error);
        this.metrics.failedRequests++;
        this.log('error', `Task ${task.id} failed: ${error}`);
      } finally {
        this.activeTasks.delete(task.id);
        this.metrics.activeRequests = this.activeTasks.size;
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async executeTask(task: TaskQueue): Promise<any> {
    const startTime = Date.now();

    let result: any;
    
    switch (task.type) {
      case 'generate':
        result = await this.client.generate(task.data);
        break;
      case 'chat':
        result = await this.chatManager.chat(
          task.data.sessionId,
          task.data.message,
          task.data.options
        );
        break;
      case 'embed':
        result = await this.embeddingsManager.embed(task.data);
        break;
      case 'stream':
        result = await this.streamHandler.stream(task.data);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    const duration = Date.now() - startTime;
    this.updateResponseTime(duration);

    return result;
  }

  private updateResponseTime(duration: number): void {
    const total = this.metrics.averageResponseTime * this.metrics.completedRequests;
    this.metrics.averageResponseTime = (total + duration) / (this.metrics.completedRequests + 1);
  }

  private updateMetrics(): void {
    this.metrics.uptime = Date.now() - this.startTime.getTime();
    this.metrics.queueLength = this.taskQueue.length;
    this.metrics.activeSessions = this.chatManager.getAllSessions().length;
    this.metrics.modelsLoaded = this.modelManager.getActiveModels().length;
  }

  private queueTask(type: TaskQueue['type'], data: any, priority: number = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: TaskQueue = {
        id: `task_${Date.now()}_${this.requestCounter++}`,
        type,
        priority,
        data,
        resolve,
        reject,
        createdAt: new Date()
      };

      this.taskQueue.push(task);
      this.metrics.totalRequests++;
    });
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] Ollama Coordinator: ${message}`);
      this.emit('log', { level, message, timestamp });
    }
  }

  // Public API Methods

  async initialize(): Promise<void> {
    this.log('info', 'Initializing Ollama Coordinator...');

    // Check if Ollama is available
    const isAvailable = await this.client.isAvailable();
    if (!isAvailable) {
      throw new Error('Ollama service is not available');
    }

    // Load available models
    const models = await this.modelManager.listModels();
    this.log('info', `Found ${models.length} available models`);

    // Auto-install default models if configured
    if (this.config.autoInstallModels) {
      await this.ensureDefaultModels();
    }

    this.emit('initialized', { models: models.length });
  }

  private async ensureDefaultModels(): Promise<void> {
    const models = await this.modelManager.listModels();
    const modelNames = models.map(m => m.name);

    const requiredModels = [this.config.defaultModel, this.config.embeddingModel];
    
    for (const modelName of requiredModels) {
      if (!modelNames.includes(modelName)) {
        this.log('info', `Installing required model: ${modelName}`);
        await this.modelManager.installModel(modelName, (progress) => {
          this.emit('model:install:progress', { model: modelName, progress });
        });
      }
    }
  }

  async generate(prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    priority?: number;
  }): Promise<string> {
    const result = await this.queueTask('generate', {
      model: options?.model || this.config.defaultModel,
      prompt,
      options: {
        temperature: options?.temperature,
        num_predict: options?.maxTokens
      }
    }, options?.priority);

    return result.response;
  }

  async chat(sessionId: string, message: string | ChatMessage, options?: ChatOptions & {
    priority?: number;
  }): Promise<string> {
    const result = await this.queueTask('chat', {
      sessionId,
      message,
      options
    }, options?.priority);

    return result.content;
  }

  createChatSession(options?: ChatOptions & { metadata?: Record<string, any> }): ChatSession {
    return this.chatManager.createSession(options);
  }

  async embed(text: string, options?: {
    model?: string;
    priority?: number;
  }): Promise<number[]> {
    const result = await this.queueTask('embed', {
      text,
      model: options?.model || this.config.embeddingModel
    }, options?.priority);

    return result.embedding;
  }

  async batchEmbed(texts: string[], options?: {
    model?: string;
    batchSize?: number;
    parallel?: boolean;
    onProgress?: (progress: { completed: number; total: number }) => void;
  }): Promise<number[][]> {
    const embeddings = await this.embeddingsManager.batchEmbed({
      texts,
      model: options?.model,
      batchSize: options?.batchSize,
      parallel: options?.parallel,
      onProgress: options?.onProgress
    });

    return embeddings.map(e => e.embedding);
  }

  async findSimilar(query: string, corpus: string[], options?: {
    model?: string;
    topK?: number;
    threshold?: number;
  }): Promise<Array<{ text: string; similarity: number }>> {
    return this.embeddingsManager.findSimilar(query, corpus, options);
  }

  async streamGenerate(prompt: string, options?: StreamOptions & {
    onChunk?: (chunk: string) => void;
    priority?: number;
  }): Promise<string> {
    const streamOptions: StreamOptions = {
      model: options?.model || this.config.defaultModel,
      prompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      onChunk: options?.onChunk ? (chunk) => {
        if (options.onChunk) options.onChunk(chunk.content);
      } : undefined
    };

    const session = await this.queueTask('stream', streamOptions, options?.priority);
    return session.chunks.map((c: any) => c.content).join('');
  }

  // Model Management
  async listModels(): Promise<ModelStatus[]> {
    return this.modelManager.listModels();
  }

  async installModel(name: string, onProgress?: (progress: any) => void): Promise<boolean> {
    return this.modelManager.installModel(name, onProgress);
  }

  async uninstallModel(name: string): Promise<boolean> {
    return this.modelManager.uninstallModel(name);
  }

  async createCustomModel(config: any): Promise<boolean> {
    return this.modelManager.createCustomModel(config);
  }

  getModelTemplates(): ModelTemplate[] {
    return this.modelManager.getTemplates();
  }

  // Session Management
  getChatSession(sessionId: string): ChatSession | undefined {
    return this.chatManager.getSession(sessionId);
  }

  getAllChatSessions(): ChatSession[] {
    return this.chatManager.getAllSessions();
  }

  clearChatSession(sessionId: string): void {
    this.chatManager.clearSession(sessionId);
  }

  deleteChatSession(sessionId: string): void {
    this.chatManager.deleteSession(sessionId);
  }

  // Utilities
  getMetrics(): CoordinatorMetrics {
    return { ...this.metrics };
  }

  getCapabilities(): AgentCapabilities {
    return {
      chat: true,
      completion: true,
      embedding: true,
      streaming: true,
      modelManagement: true,
      contextMemory: true,
      multimodal: false // Would need vision models
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    metrics: CoordinatorMetrics;
  }> {
    const services = {
      ollama: await this.client.isAvailable(),
      models: (await this.modelManager.listModels()).length > 0,
      queue: this.taskQueue.length < 100, // Queue not overwhelmed
      memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1024 // Less than 1GB
    };

    const allHealthy = Object.values(services).every(s => s);
    const someHealthy = Object.values(services).some(s => s);

    const status = allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy';

    return {
      status,
      services,
      metrics: this.getMetrics()
    };
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down Ollama Coordinator...');
    
    // Cancel all active streams
    this.streamHandler.cancelAllStreams();
    
    // Clear queues
    this.taskQueue.length = 0;
    
    // Clear caches
    this.embeddingsManager.clearCache();
    this.modelManager.clearCache();
    
    this.emit('shutdown');
    this.removeAllListeners();
  }
}

export default OllamaCoordinator;