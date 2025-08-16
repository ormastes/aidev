/**
 * Utility functions for Ollama Agent Coordinator
 */

import { OllamaClient, OllamaConfig } from '../children/client';
import { ModelManager } from '../children/models';
import { StreamHandler } from '../children/stream';
import { EmbeddingsManager } from '../children/embeddings';
import { ChatManager, ChatSession, ChatOptions } from '../children/chat';

/**
 * Create a configured Ollama client
 */
export function createOllamaClient(config?: OllamaConfig): {
  client: OllamaClient;
  models: ModelManager;
  stream: StreamHandler;
  embeddings: EmbeddingsManager;
  chat: ChatManager;
} {
  const client = new OllamaClient(config);
  const models = new ModelManager(client);
  const stream = new StreamHandler(client);
  const embeddings = new EmbeddingsManager(client);
  const chat = new ChatManager(client, stream);

  return {
    client,
    models,
    stream,
    embeddings,
    chat
  };
}

/**
 * Create a chat session with Ollama
 */
export function createChatSession(options?: ChatOptions & {
  client?: OllamaClient;
  metadata?: Record<string, any>;
}): ChatSession {
  const { client: providedClient, ...chatOptions } = options || {};
  
  const client = providedClient || new OllamaClient();
  const stream = new StreamHandler(client);
  const chat = new ChatManager(client, stream);
  
  return chat.createSession(chatOptions);
}

/**
 * Create an embeddings manager
 */
export function createEmbeddings(options?: {
  client?: OllamaClient;
  defaultModel?: string;
  maxCacheSize?: number;
}): EmbeddingsManager {
  const client = options?.client || new OllamaClient();
  
  return new EmbeddingsManager(client, {
    defaultModel: options?.defaultModel,
    maxCacheSize: options?.maxCacheSize
  });
}

/**
 * Quick generate function
 */
export async function quickGenerate(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = new OllamaClient();
  
  const response = await client.generate({
    model: options?.model || 'llama2',
    prompt,
    options: {
      temperature: options?.temperature,
      num_predict: options?.maxTokens
    }
  });
  
  return response.response;
}

/**
 * Quick embedding function
 */
export async function quickEmbed(
  text: string,
  model?: string
): Promise<number[]> {
  const client = new OllamaClient();
  const embeddings = new EmbeddingsManager(client);
  
  const response = await embeddings.embed({
    text,
    model
  });
  
  return response.embedding;
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaAvailability(
  config?: OllamaConfig
): Promise<{
  available: boolean;
  models?: string[];
  error?: string;
}> {
  const client = new OllamaClient(config);
  
  try {
    const { models } = await client.list();
    return {
      available: true,
      models: models.map(m => m.name)
    };
  } catch (error: any) {
    return {
      available: false,
      error: error.message
    };
  }
}

/**
 * Install a model if not present
 */
export async function ensureModel(
  modelName: string,
  options?: {
    client?: OllamaClient;
    onProgress?: (progress: any) => void;
  }
): Promise<boolean> {
  const client = options?.client || new OllamaClient();
  const models = new ModelManager(client);
  
  const installed = await models.listModels();
  const isInstalled = installed.some(m => m.name === modelName);
  
  if (!isInstalled) {
    return models.installModel(modelName, options?.onProgress);
  }
  
  return true;
}

/**
 * Create a specialized assistant
 */
export async function createAssistant(
  type: 'code' | "creative" | 'analyst' | "translator" | 'teacher',
  options?: {
    client?: OllamaClient;
    modelOverride?: string;
  }
): Promise<ChatSession> {
  const client = options?.client || new OllamaClient();
  const stream = new StreamHandler(client);
  const chat = new ChatManager(client, stream);
  
  const configs = {
    code: {
      model: options?.modelOverride || "codellama",
      systemPrompt: 'You are an expert programmer. Provide clear, efficient, and well-documented code.',
      temperature: 0.1
    },
    creative: {
      model: options?.modelOverride || 'llama2',
      systemPrompt: 'You are a creative writer with a vivid imagination.',
      temperature: 0.9
    },
    analyst: {
      model: options?.modelOverride || 'mistral',
      systemPrompt: 'You are a data analyst. Provide precise, factual analysis.',
      temperature: 0.3
    },
    translator: {
      model: options?.modelOverride || 'llama2',
      systemPrompt: 'You are a professional translator. Provide accurate translations.',
      temperature: 0.2
    },
    teacher: {
      model: options?.modelOverride || 'llama2',
      systemPrompt: 'You are a patient teacher. Explain concepts clearly and thoroughly.',
      temperature: 0.5
    }
  };
  
  const config = configs[type];
  return chat.createSession(config);
}

export default {
  createOllamaClient,
  createChatSession,
  createEmbeddings,
  quickGenerate,
  quickEmbed,
  checkOllamaAvailability,
  ensureModel,
  createAssistant
};