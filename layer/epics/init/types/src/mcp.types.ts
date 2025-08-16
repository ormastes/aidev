/**
 * Model Context Protocol (MCP) types
 */

import { LLMPlatform, BaseConfig } from './common.types';

export interface MCPConfig extends BaseConfig {
  serverName?: string;
  serverPort?: number;
  enabledPlatforms?: LLMPlatform[];
  tools?: MCPToolDefinition[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
  handler: MCPToolHandler;
  permissions?: string[];
}

export type MCPToolHandler = (input: any, context: MCPContext) => Promise<any>;

export interface MCPContext {
  platform: LLMPlatform;
  sessionId?: string;
  user?: string;
  permissions: string[];
  metadata?: any;
}

export interface MCPRequest {
  id: string;
  method: string;
  params: any;
  context?: MCPContext;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  platforms: LLMPlatform[];
  tools: string[];
  capabilities: string[];
}

export interface MCPToolResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: {
    duration: number;
    platform: LLMPlatform;
    toolVersion?: string;
  };
}

export interface IMCPServer {
  readonly info: MCPServerInfo;
  
  start(config: MCPConfig): Promise<void>;
  stop(): Promise<void>;
  registerTool(tool: MCPToolDefinition): void;
  unregisterTool(name: string): void;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
}

export interface IMCPClient {
  connect(url: string): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<MCPToolDefinition[]>;
  executeTool(name: string, input: any): Promise<MCPToolResult>;
}