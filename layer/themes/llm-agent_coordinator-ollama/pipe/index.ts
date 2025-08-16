/**
 * Ollama Agent Coordinator - Gateway
 * Following HEA architecture pattern
 */

export { OllamaClient } from '../children/client';
export { ModelManager } from '../children/models';
export { StreamHandler } from '../children/stream';
export { EmbeddingsManager } from '../children/embeddings';
export { ChatManager } from '../children/chat';

// Export types
export type {
  OllamaConfig,
  OllamaModel,
  OllamaResponse,
  GenerateOptions,
  PullProgress,
  ModelInfo,
  ModelDetails
} from '../children/client';

export type {
  ModelConfig,
  ModelTemplate,
  ModelCapability,
  ModelStatus
} from '../children/models';

export type {
  StreamOptions,
  StreamChunk,
  StreamCallback,
  StreamError
} from '../children/stream';

export type {
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingModel,
  BatchEmbeddingOptions
} from '../children/embeddings';

export type {
  ChatMessage,
  ChatOptions,
  ChatSession,
  ChatHistory,
  ChatContext
} from '../children/chat';

// Export constants
export const OLLAMA_DEFAULTS = {
  host: 'http://localhost:11434',
  timeout: 30000,
  models: {
    default: 'llama2',
    embedding: 'nomic-embed-text',
    code: "codellama",
    chat: 'llama2-uncensored'
  },
  temperature: 0.7,
  topK: 40,
  topP: 0.9,
  repeatPenalty: 1.1
};

// Export main coordinator
export { OllamaCoordinator } from '../src/ollama-coordinator';

// Export utilities
export { createOllamaClient, createChatSession, createEmbeddings } from './utils';