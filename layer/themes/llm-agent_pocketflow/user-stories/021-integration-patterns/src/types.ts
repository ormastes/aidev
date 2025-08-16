// Core types for PocketFlow integration patterns

export interface Message {
  role: 'system' | 'user' | "assistant" | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface AgentInput {
  messages: Message[];
  context?: any;
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AgentOutput {
  message: Message;
  usage?: TokenUsage;
  metadata?: Record<string, any>;
  toolCalls?: ToolCall[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(args: any): Promise<any>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
}

export interface Agent {
  getName(): string;
  getModel(): string;
  getProvider(): string;
  process(input: AgentInput): Promise<AgentOutput>;
  stream?(input: AgentInput): AsyncIterator<AgentStreamChunk>;
  configure(config: AgentConfig): void;
  getCapabilities(): AgentCapabilities;
}

export interface AgentStreamChunk {
  type: 'text' | 'tool_call' | 'error' | 'In Progress';
  content: string;
  toolCall?: ToolCall;
  error?: Error;
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: Tool[];
  [key: string]: any;
}

export interface AgentCapabilities {
  streaming: boolean;
  tools: boolean;
  multiModal: boolean;
  functions: boolean;
  maxTokens: number;
  supportedFormats: string[];
}

export interface LLMProvider {
  name: string;
  createCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  streamCompletion?(prompt: string, onChunk: (chunk: string) => void, options?: CompletionOptions): Promise<void>;
  isAvailable(): Promise<boolean>;
  getModels(): Promise<string[]>;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  stream?: boolean;
  [key: string]: any;
}

export interface Memory {
  store(key: string, value: any, ttl?: number): Promise<void>;
  retrieve(key: string): Promise<any>;
  search(query: string, options?: SearchOptions): Promise<MemoryEntry[]>;
  forget(key: string): Promise<void>;
  clear(): Promise<void>;
  list(pattern?: string): Promise<string[]>;
}

export interface MemoryEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl?: number;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
}

export interface ExternalService {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStatus(): ServiceStatus;
}

export interface ServiceStatus {
  connected: boolean;
  lastCheck: number;
  latency?: number;
  error?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstLimit?: number;
  windowMs?: number;
}

export interface AuthConfig {
  type: 'apikey' | 'oauth' | 'jwt' | 'basic';
  credentials: Record<string, string>;
  refreshable?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  rateLimit?: RateLimitConfig;
  auth?: AuthConfig;
  [key: string]: any;
}

export interface IntegrationPattern {
  name: string;
  description: string;
  category: "provider" | 'tool' | 'memory' | 'service' | "application";
  dependencies?: string[];
  configure(config: any): void;
  validate(): ValidationResult;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

// Error types
export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: string,
    public context?: any
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export class ProviderError extends IntegrationError {
  constructor(
    message: string,
    public provider: string,
    public originalError?: Error
  ) {
    super(message, 'PROVIDER_ERROR', "provider", { provider, originalError });
  }
}

export class ToolError extends IntegrationError {
  constructor(
    message: string,
    public toolName: string,
    public originalError?: Error
  ) {
    super(message, 'TOOL_ERROR', 'tool', { toolName, originalError });
  }
}

export class MemoryError extends IntegrationError {
  constructor(
    message: string,
    public operation: string,
    public originalError?: Error
  ) {
    super(message, 'MEMORY_ERROR', 'memory', { operation, originalError });
  }
}

export class ServiceError extends IntegrationError {
  constructor(
    message: string,
    public serviceName: string,
    public originalError?: Error
  ) {
    super(message, 'SERVICE_ERROR', 'service', { serviceName, originalError });
  }
}