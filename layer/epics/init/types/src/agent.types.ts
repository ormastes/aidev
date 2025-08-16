/**
 * Agent-specific types
 */

import { LLMPlatform } from './common.types';

export interface AgentConfig {
  id: string;
  name: string;
  platform: LLMPlatform;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
}

export interface AgentMessage {
  role: 'system' | 'user' | "assistant" | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata?: any;
}

export interface ToolCall {
  id: string;
  tool: string;
  arguments: any;
}

export interface ToolResult {
  callId: string;
  result: any;
  error?: string;
}

export interface AgentRequest {
  messages: AgentMessage[];
  tools?: string[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface AgentResponse {
  message: AgentMessage;
  usage?: TokenUsage;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error';
  metadata?: any;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentCapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  functionCalling: boolean;
  maxContextLength: number;
  supportedModels: string[];
}

export interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly platform: LLMPlatform;
  readonly capabilities: AgentCapabilities;
  
  initialize(config: AgentConfig): Promise<void>;
  chat(request: AgentRequest): Promise<AgentResponse>;
  stream(request: AgentRequest): AsyncIterable<AgentResponse>;
  getTools(): string[];
  setTools(tools: string[]): void;
}