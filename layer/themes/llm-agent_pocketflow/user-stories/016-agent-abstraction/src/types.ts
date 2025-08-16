/**
 * Agent abstraction types for PocketFlow
 * Provider-agnostic interfaces for AI agents
 */

export interface Message {
  role: 'system' | 'user' | "assistant" | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  metadata?: Record<string, any>;
}

export interface AgentConfig {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: Tool[];
  memory?: Memory;
  streaming?: boolean;
  retryAttempts?: number;
  timeout?: number;
  [key: string]: any;
}

export interface AgentInput {
  messages: Message[];
  context?: Record<string, any>;
  streamCallback?: (chunk: string) => void;
}

export interface AgentOutput {
  message: Message;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface Memory {
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  forget(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  
  // Lifecycle
  initialize(config: AgentConfig): Promise<void>;
  process(input: AgentInput): Promise<AgentOutput>;
  terminate(): Promise<void>;
  
  // Capabilities
  tools?: Tool[];
  memory?: Memory;
  
  // Metadata
  getCapabilities(): AgentCapabilities;
}

export interface AgentCapabilities {
  streaming: boolean;
  tools: boolean;
  memory: boolean;
  maxContextLength: number;
  supportedModels?: string[];
}

export interface AgentProvider {
  name: string;
  createAgent(config: AgentConfig): Agent;
  isAvailable(): Promise<boolean>;
}