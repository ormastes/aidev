/**
 * Coordinator-specific types
 */

import { LLMPlatform, BaseConfig, StreamChunk } from './common.types';
import { Session } from './session.types';

export interface CoordinatorConfig extends BaseConfig {
  sessionPath?: string;
  dangerousMode?: boolean;
  taskQueuePath?: string;
  integrations?: IntegrationConfig;
}

export interface IntegrationConfig {
  chatSpace?: {
    enabled: boolean;
    url?: string;
    room?: string;
  };
  pocketflow?: {
    enabled: boolean;
    url?: string;
  };
}

export interface CoordinatorRequest {
  prompt: string;
  context?: any;
  tools?: string[];
  stream?: boolean;
  sessionId?: string;
}

export interface CoordinatorResponse {
  content: string;
  sessionId: string;
  toolsUsed?: ToolUse[];
  metadata?: any;
}

export interface ToolUse {
  tool: string;
  input: any;
  output: any;
  duration: number;
  error?: string;
}

export interface CoordinatorStatus {
  platform: LLMPlatform;
  connected: boolean;
  session?: Session;
  dangerousMode: boolean;
  integrations: {
    chatSpace: boolean;
    pocketflow: boolean;
  };
}

export interface CoordinatorEvents {
  'session:start': (session: Session) => void;
  'session:end': (session: Session) => void;
  'session:checkpoint': (session: Session) => void;
  'permission:change': (mode: { dangerous: boolean }) => void;
  'task:start': (task: any) => void;
  'task:complete': (task: any) => void;
  'task:error': (error: Error) => void;
  'stream:chunk': (chunk: StreamChunk) => void;
  "interrupt": () => void;
}

export interface ICoordinator {
  readonly platform: LLMPlatform;
  readonly status: CoordinatorStatus;
  
  initialize(config: CoordinatorConfig): Promise<void>;
  process(request: CoordinatorRequest): Promise<CoordinatorResponse>;
  stream(request: CoordinatorRequest): AsyncIterable<StreamChunk>;
  interrupt(): Promise<void>;
  resume(sessionId: string): Promise<void>;
  shutdown(): Promise<void>;
}