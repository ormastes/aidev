/**
 * Coordinator Factory
 * Creates coordinator agents based on configuration
 */

import { CoordinatorConfig, CoordinatorType } from '../config/room-config.schema';
import { BaseCoordinatorAgent } from './coordinator-interface';
import { ClaudeCoordinatorAgent } from './claude-coordinator';
import { OllamaCoordinatorAgent } from './ollama-coordinator';
// import { OpenAICoordinatorAgent } from './openai-coordinator';

export async function createCoordinatorAgent(
  config: CoordinatorConfig,
  serverUrl: string,
  roomId: string
): Promise<BaseCoordinatorAgent | null> {
  switch (config.type) {
    case CoordinatorType.CLAUDE:
      return createClaudeCoordinator(config, serverUrl, roomId);
    
    case CoordinatorType.OLLAMA:
      return createOllamaCoordinator(config, serverUrl, roomId);
    
    case CoordinatorType.OPENAI:
      // TODO: Implement OpenAI coordinator
      console.warn('OpenAI coordinator not yet In Progress');
      return null;
    
    case CoordinatorType.CUSTOM:
      return createCustomCoordinator(config, serverUrl, roomId);
    
    case CoordinatorType.NONE:
      return null;
    
    default:
      console.error(`Unknown coordinator type: ${config.type}`);
      return null;
  }
}

async function createClaudeCoordinator(
  config: CoordinatorConfig,
  serverUrl: string,
  roomId: string
): Promise<ClaudeCoordinatorAgent> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Claude coordinator requires API key');
  }

  const agent = new ClaudeCoordinatorAgent(
    serverUrl,
    roomId,
    apiKey,
    config.model || 'claude-3-sonnet-20240229'
  );

  await agent.connect();
  return agent;
}

async function createOllamaCoordinator(
  config: CoordinatorConfig,
  serverUrl: string,
  roomId: string
): Promise<OllamaCoordinatorAgent> {
  const ollamaUrl = config.endpoint || 'http://localhost:11434';
  const model = config.model || 'deepseek-r1:32b';
  
  // Check if Ollama is installed
  const agent = new OllamaCoordinatorAgent(
    serverUrl,
    roomId,
    ollamaUrl,
    model
  );

  // Check Ollama availability
  const isAvailable = await agent.checkOllamaAvailability();
  if (!isAvailable) {
    console.log('Ollama not available, attempting to install...');
    // In a real implementation, you might trigger installation here
    throw new Error('Ollama is not available. Please install it first.');
  }

  // Check if model exists, download if not
  const hasModel = await agent.checkModelExists();
  if (!hasModel) {
    console.log(`Model ${model} not found, downloading...`);
    await agent.downloadModel();
  }

  await agent.connect();
  return agent;
}

async function createCustomCoordinator(
  config: CoordinatorConfig,
  serverUrl: string,
  roomId: string
): Promise<BaseCoordinatorAgent | null> {
  if (!config.customHandler) {
    console.error('Custom coordinator requires customHandler configuration');
    return null;
  }

  try {
    // Dynamic import of custom coordinator
    const modulePath = config.customHandler;
    const customModule = await import(modulePath);
    
    if (!customModule.createCoordinator) {
      throw new Error('Custom coordinator module must export createCoordinator function');
    }

    const agent = await customModule.createCoordinator(serverUrl, roomId, config);
    
    if (!(agent instanceof BaseCoordinatorAgent)) {
      throw new Error('Custom coordinator must extend BaseCoordinatorAgent');
    }

    await agent.connect();
    return agent;
  } catch (error) {
    console.error('Failed to create custom coordinator:', error);
    return null;
  }
}

/**
 * Validate coordinator configuration
 */
export function validateCoordinatorConfig(config: CoordinatorConfig): string[] {
  const errors: string[] = [];

  switch (config.type) {
    case CoordinatorType.CLAUDE:
      if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
        errors.push('Claude coordinator requires API key');
      }
      break;
    
    case CoordinatorType.OPENAI:
      if (!config.apiKey && !process.env.OPENAI_API_KEY) {
        errors.push('OpenAI coordinator requires API key');
      }
      break;
    
    case CoordinatorType.CUSTOM:
      if (!config.customHandler) {
        errors.push('Custom coordinator requires customHandler path');
      }
      break;
  }

  return errors;
}

/**
 * Get default configuration for coordinator type
 */
export function getDefaultCoordinatorConfig(type: CoordinatorType): CoordinatorConfig {
  switch (type) {
    case CoordinatorType.CLAUDE:
      return {
        type: CoordinatorType.CLAUDE,
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 1000
      };
    
    case CoordinatorType.OLLAMA:
      return {
        type: CoordinatorType.OLLAMA,
        model: 'deepseek-r1:32b',
        endpoint: 'http://localhost:11434',
        temperature: 0.7
      };
    
    case CoordinatorType.OPENAI:
      return {
        type: CoordinatorType.OPENAI,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000
      };
    
    case CoordinatorType.CUSTOM:
      return {
        type: CoordinatorType.CUSTOM,
        customHandler: './custom-coordinator.js'
      };
    
    case CoordinatorType.NONE:
    default:
      return {
        type: CoordinatorType.NONE
      };
  }
}