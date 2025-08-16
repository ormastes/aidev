/**
 * Base interfaces for all LLM Agent Epic components
 */

export interface IBaseComponent {
  id: string;
  name: string;
  version: string;
  initialize(config: any): Promise<void>;
  shutdown(): Promise<void>;
}

export interface HealthStatus {
  status: 'healthy' | "degraded" | "unhealthy";
  timestamp: Date;
  message?: string;
  details?: Record<string, any>;
}

export interface IServer extends IBaseComponent {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  isRunning(): boolean;
  getHealth(): Promise<HealthStatus>;
}

export interface AgentCapabilities {
  chat: boolean;
  streaming: boolean;
  tools: boolean;
  memory: boolean;
  multimodal: boolean;
  languages: string[];
  maxContextLength: number;
  customCapabilities?: Record<string, boolean>;
}

export interface AgentRequest {
  id?: string;
  sessionId?: string;
  messages: Message[];
  stream?: boolean;
  tools?: string[];
  options?: RequestOptions;
}

export interface AgentResponse {
  id: string;
  content: string;
  role: "assistant";
  toolCalls?: ToolCall[];
  metadata?: ResponseMetadata;
}

export interface Message {
  id?: string;
  role: 'user' | "assistant" | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface IAgent extends IBaseComponent {
  capabilities: string[];
  process(request: AgentRequest): Promise<AgentResponse>;
  hasCapability(capability: string): boolean;
}

export interface Workflow {
  id?: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  parallel?: boolean;
  metadata?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  taskType: string;
  agentRole?: string;
  dependencies?: string[];
  config?: Record<string, any>;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'success' | 'failed' | 'partial';
  results: StepResult[];
  startTime: Date;
  endTime: Date;
  error?: string;
}

export interface StepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  duration: number;
}

export interface ICoordinator extends IAgent {
  registerAgent(agent: IAgent): void;
  routeRequest(request: AgentRequest): Promise<IAgent>;
  orchestrate(workflow: Workflow): Promise<WorkflowResult>;
}

// Tool-related interfaces
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: ToolHandler;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

export type ToolHandler = (params: any) => Promise<any>;

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
  result?: any;
  error?: string;
}

// Request/Response metadata
export interface RequestOptions {
  timeout?: number;
  retryCount?: number;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, any>;
}

export interface ResponseMetadata {
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency?: number;
  cached?: boolean;
}