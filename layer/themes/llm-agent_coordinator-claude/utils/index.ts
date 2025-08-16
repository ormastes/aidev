/**
 * Utility functions for Claude Agent Coordinator
 */

import { ClaudeClient, ClaudeConfig } from '../children/client';
import { ConversationManager } from '../children/conversation';
import { ContextManager } from '../children/context';
import { AgentOrchestrator } from '../children/orchestrator';
import { ToolManager } from '../children/tools';

/**
 * Create a Claude agent with all components
 */
export function createClaudeAgent(config: {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  orchestrationStrategy?: any;
}) {
  const client = new ClaudeClient({
    apiKey: config.apiKey,
    defaultModel: config.model as any,
  });

  const conversation = new ConversationManager({
    maxTokens: config.maxTokens,
  });

  const context = new ContextManager();
  const orchestrator = new AgentOrchestrator(config.orchestrationStrategy);
  const tools = new ToolManager();

  return {
    client,
    conversation,
    context,
    orchestrator,
    tools,
    
    async chat(message: string) {
      conversation.addUserMessage(message);
      const history = conversation.getFormattedHistory();
      
      const response = await client.chat(history);
      const assistantMessage = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
      
      conversation.addAssistantMessage(assistantMessage);
      return assistantMessage;
    },
  };
}

/**
 * Create a conversation with context
 */
export function createConversation(config?: {
  systemPrompt?: string;
  maxTokens?: number;
}) {
  const manager = new ConversationManager({
    maxTokens: config?.maxTokens,
  });

  if (config?.systemPrompt) {
    manager.createConversation({
      systemPrompt: config.systemPrompt,
    });
  }

  return manager;
}

/**
 * Estimate token count
 */
export function estimateTokens(text: string): number {
  // Simple estimation - 1 token ≈ 4 characters
  // For accurate counting, use tiktoken or similar
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit token limit
 */
export function truncateContext(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Calculate character limit based on token limit
  const maxChars = maxTokens * 4;
  
  // Try to truncate at sentence boundary
  let truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  const cutPoint = Math.max(lastPeriod, lastNewline);
  if (cutPoint > maxChars * 0.8) {
    truncated = truncated.substring(0, cutPoint + 1);
  }

  return truncated + '\n[... context truncated ...]';
}

/**
 * Format a prompt with system message and context
 */
export function formatPrompt(config: {
  system?: string;
  context?: string;
  user: string;
}): string {
  let prompt = '';
  
  if (config.system) {
    prompt += `System: ${config.system}\n\n`;
  }
  
  if (config.context) {
    prompt += `Context:\n${config.context}\n\n`;
  }
  
  prompt += `User: ${config.user}`;
  
  return prompt;
}

/**
 * Parse Claude response for tool calls
 */
export function parseResponse(response: any): {
  text: string;
  toolCalls: Array<{ name: string; arguments: any }>;
} {
  const text: string[] = [];
  const toolCalls: Array<{ name: string; arguments: any }> = [];

  for (const block of response.content || []) {
    if (block.type === 'text') {
      text.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        arguments: block.input,
      });
    }
  }

  return {
    text: text.join(''),
    toolCalls,
  };
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  return /^sk-ant-[a-zA-Z0-9-_]{40,}$/.test(apiKey);
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries || 3;
  const initialDelay = options?.initialDelay || 1000;
  const maxDelay = options?.maxDelay || 60000;
  const factor = options?.factor || 2;

  let delay = initialDelay;
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Split text into chunks
 */
export function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Merge conversation histories
 */
export function mergeHistories(
  histories: Array<Array<{ role: string; content: string }>>
): Array<{ role: string; content: string }> {
  const merged: Array<{ role: string; content: string }> = [];
  const seen = new Set<string>();

  for (const history of histories) {
    for (const message of history) {
      const key = `${message.role}:${message.content}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(message);
      }
    }
  }

  return merged;
}

/**
 * Calculate conversation metrics
 */
export function calculateMetrics(conversation: any): {
  messageCount: number;
  tokenCount: number;
  userMessages: number;
  assistantMessages: number;
  averageMessageLength: number;
} {
  const messages = conversation.messages || [];
  let tokenCount = 0;
  let userMessages = 0;
  let assistantMessages = 0;
  let totalLength = 0;

  for (const message of messages) {
    const content = typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);
    
    tokenCount += estimateTokens(content);
    totalLength += content.length;
    
    if (message.role === 'user') userMessages++;
    if (message.role === "assistant") assistantMessages++;
  }

  return {
    messageCount: messages.length,
    tokenCount,
    userMessages,
    assistantMessages,
    averageMessageLength: messages.length > 0 ? totalLength / messages.length : 0,
  };
}

export default {
  createClaudeAgent,
  createConversation,
  estimateTokens,
  truncateContext,
  formatPrompt,
  parseResponse,
  validateApiKey,
  retryWithBackoff,
  chunkText,
  mergeHistories,
  calculateMetrics,
};