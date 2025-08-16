/**
 * DeepSeek R1 Model Configuration
 * Configuration settings matching Ollama's DeepSeek R1 implementation
 */

export interface DeepSeekR1Config {
  modelName: string;
  modelPath?: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  contextLength: number;
  stopSequences: string[];
  systemPrompt: string;
  seed?: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

/**
 * Default configuration for DeepSeek R1 32B model
 */
export const DEEPSEEK_R1_32B_CONFIG: DeepSeekR1Config = {
  modelName: 'deepseek-ai/DeepSeek-R1-32B',
  temperature: 0.7,
  topP: 0.95,
  topK: 50,
  maxTokens: 2048,
  contextLength: 32768, // 32K context window
  stopSequences: ['<|end|>', '<|endoftext|>'],
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
  systemPrompt: `You are DeepSeek-R1, a helpful AI assistant in a chat room. You should:
- Be friendly, helpful, and conversational
- Answer questions accurately and concisely
- Help with programming, math, and general knowledge
- Engage naturally in group conversations
- Use markdown for code blocks and formatting
- Keep responses focused and not too long
- If you're not sure about something, say so
- Use your reasoning capabilities to provide thoughtful responses`,
};

/**
 * Configuration for DeepSeek R1 8B model (lighter version)
 */
export const DEEPSEEK_R1_8B_CONFIG: DeepSeekR1Config = {
  ...DEEPSEEK_R1_32B_CONFIG,
  modelName: 'deepseek-ai/DeepSeek-R1-8B',
  maxTokens: 1024, // Smaller token limit for faster responses
};

/**
 * Configuration for DeepSeek R1 Distilled models
 */
export const DEEPSEEK_R1_DISTILLED_CONFIG: DeepSeekR1Config = {
  ...DEEPSEEK_R1_32B_CONFIG,
  modelName: 'deepseek-ai/DeepSeek-R1-Distill-32B',
  temperature: 0.5, // Lower temperature for more focused responses
  maxTokens: 1536,
};

/**
 * Model name mappings to match Ollama conventions
 */
export const MODEL_MAPPINGS: Record<string, string> = {
  'deepseek-r1:latest': 'deepseek-ai/DeepSeek-R1-32B',
  'deepseek-r1:32b': 'deepseek-ai/DeepSeek-R1-32B',
  'deepseek-r1:8b': 'deepseek-ai/DeepSeek-R1-8B',
  'deepseek-r1:distill': 'deepseek-ai/DeepSeek-R1-Distill-32B',
  'deepseek-r1:distill-32b': 'deepseek-ai/DeepSeek-R1-Distill-32B',
};

/**
 * Get configuration for a specific model variant
 */
export function getDeepSeekConfig(modelVariant: string): DeepSeekR1Config {
  const variant = modelVariant.toLowerCase();
  
  if (variant.includes('8b')) {
    return DEEPSEEK_R1_8B_CONFIG;
  } else if (variant.includes('distill')) {
    return DEEPSEEK_R1_DISTILLED_CONFIG;
  } else {
    return DEEPSEEK_R1_32B_CONFIG;
  }
}

/**
 * Get the actual model name from Ollama-style naming
 */
export function resolveModelName(ollamaStyleName: string): string {
  return MODEL_MAPPINGS[ollamaStyleName.toLowerCase()] || ollamaStyleName;
}

/**
 * Create vLLM-compatible generation parameters
 */
export function createVLLMParameters(config: Partial<DeepSeekR1Config>) {
  return {
    temperature: config.temperature ?? DEEPSEEK_R1_32B_CONFIG.temperature,
    top_p: config.topP ?? DEEPSEEK_R1_32B_CONFIG.topP,
    top_k: config.topK ?? DEEPSEEK_R1_32B_CONFIG.topK,
    max_tokens: config.maxTokens ?? DEEPSEEK_R1_32B_CONFIG.maxTokens,
    stop: config.stopSequences ?? DEEPSEEK_R1_32B_CONFIG.stopSequences,
    presence_penalty: config.presencePenalty ?? DEEPSEEK_R1_32B_CONFIG.presencePenalty,
    frequency_penalty: config.frequencyPenalty ?? DEEPSEEK_R1_32B_CONFIG.frequencyPenalty,
    ...(config.seed && { seed: config.seed }),
  };
}