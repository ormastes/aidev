/**
 * MCP Protocol Domain Model
 * Defines the Model Context Protocol types and interfaces
 */

// Base protocol types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// Protocol methods
export enum MCPMethod {
  // Lifecycle
  INITIALIZE = "initialize",
  INITIALIZED = "initialized",
  SHUTDOWN = "shutdown",
  
  // Capabilities
  LIST_TOOLS = 'tools/list',
  CALL_TOOL = 'tools/call',
  
  // Resources
  LIST_RESOURCES = 'resources/list',
  READ_RESOURCE = 'resources/read',
  
  // Prompts
  LIST_PROMPTS = 'prompts/list',
  GET_PROMPT = 'prompts/get',
  
  // Sampling
  CREATE_MESSAGE = 'sampling/createMessage',
  
  // Notifications
  PROGRESS = 'notifications/progress',
  LOG_MESSAGE = 'notifications/message',
  RESOURCE_UPDATED = 'notifications/resources/updated'
}

// Tool definitions
export interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  arguments?: Record<string, any>;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

// Resource definitions
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// Prompt definitions
export interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface PromptMessage {
  role: 'user' | "assistant" | 'system';
  content: {
    type: 'text' | 'image' | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  };
}

// Sampling definitions
export interface SamplingMessage {
  role: 'user' | "assistant" | 'system';
  content: {
    type: 'text' | "resource";
    text?: string;
    uri?: string;
  };
}

export interface CreateMessageRequest {
  messages: SamplingMessage[];
  modelPreferences?: {
    hints?: Array<{
      name?: string;
    }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
  systemPrompt?: string;
  includeContext?: 'none' | "thisServer" | "allServers";
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
}

export interface CreateMessageResult {
  role: "assistant";
  content: {
    type: 'text';
    text: string;
  };
  model: string;
  stopReason?: 'endTurn' | "stopSequence" | "maxTokens";
}

// Server capabilities
export interface ServerCapabilities {
  tools?: Record<string, Tool>;
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    levels?: Array<'debug' | 'info' | 'warning' | 'error'>;
  };
}

export interface InitializeRequest {
  protocolVersion: string;
  capabilities: {
    roots?: {
      uri: string;
      name?: string;
    }[];
    sampling?: Record<string, any>;
  };
  clientInfo: {
    name: string;
    version?: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: {
    name: string;
    version?: string;
  };
}

// Progress notifications
export interface ProgressNotification {
  progressToken: string | number;
  progress: number;
  total?: number;
}

// Logging
export interface LogMessage {
  level: 'debug' | 'info' | 'warning' | 'error';
  logger?: string;
  data?: any;
}

// Connection types
export type MCPTransport = 'stdio' | "websocket";

export interface MCPConnectionConfig {
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

// Protocol helpers
export class MCPProtocol {
  static createRequest(method: string, params?: any, id?: string | number): MCPRequest {
    return {
      jsonrpc: '2.0',
      id: id ?? Date.now(),
      method,
      params
    };
  }

  static createResponse(id: string | number, result?: any, error?: MCPError): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      ...(result !== undefined ? { result } : {}),
      ...(error ? { error } : {})
    };
  }

  static createNotification(method: string, params?: any): MCPNotification {
    return {
      jsonrpc: '2.0',
      method,
      params
    };
  }

  static createError(code: number, message: string, data?: any): MCPError {
    return {
      code,
      message,
      data
    };
  }

  // Standard error codes
  static readonly ErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603
  } as const;
}