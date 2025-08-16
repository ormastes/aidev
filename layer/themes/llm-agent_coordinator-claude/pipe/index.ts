/**
 * Claude Agent Coordinator - Main Export
 * Gateway for Claude AI integration following HEA pattern
 */

// Client components
export { ClaudeClient } from '../children/client';
export type { 
  ClaudeConfig,
  ClaudeOptions,
  ModelType,
  RequestOptions,
  ClaudeResponse,
  StreamResponse 
} from '../children/client';

// Conversation management
export { ConversationManager } from '../children/conversation';
export type { 
  Conversation,
  Message,
  MessageRole,
  ConversationState,
  ConversationHistory,
  ConversationOptions 
} from '../children/conversation';

// Context window management
export { ContextManager } from '../children/context';
export type { 
  ContextWindow,
  ContextToken,
  ContextStrategy,
  ContextPriority,
  ContextMetadata,
  TokenCount 
} from '../children/context';

// Agent orchestration
export { AgentOrchestrator } from '../children/orchestrator';
export type { 
  Agent,
  AgentRole,
  AgentCapability,
  Task,
  TaskResult,
  OrchestrationStrategy,
  AgentPool 
} from '../children/orchestrator';

// Tools and functions
export { ToolManager } from '../children/tools';
export type { 
  Tool,
  ToolDefinition,
  ToolParameter,
  ToolResult,
  ToolExecutor,
  ToolRegistry 
} from '../children/tools';

// Utilities
export {
  createClaudeAgent,
  createConversation,
  estimateTokens,
  truncateContext,
  formatPrompt,
  parseResponse,
  validateApiKey,
  retryWithBackoff
} from '../utils';

// Constants
export const MODELS = {
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  CLAUDE_2_1: 'claude-2.1',
  CLAUDE_2: 'claude-2.0',
  CLAUDE_INSTANT: 'claude-instant-1.2',
} as const;

export const MAX_TOKENS = {
  CLAUDE_3_OPUS: 200000,
  CLAUDE_3_SONNET: 200000,
  CLAUDE_3_HAIKU: 200000,
  CLAUDE_2_1: 200000,
  CLAUDE_2: 100000,
  CLAUDE_INSTANT: 100000,
} as const;

export const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const;

// Version
export const VERSION = '1.0.0';

// Default export
const ClaudeCoordinator = {
  ClaudeClient,
  ConversationManager,
  ContextManager,
  AgentOrchestrator,
  ToolManager,
  MODELS,
  MAX_TOKENS,
  ROLES,
  VERSION,
};

export default ClaudeCoordinator;