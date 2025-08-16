/**
 * Session management types
 */

import { LLMPlatform } from './common.types';
import { AgentMessage } from './agent.types';

export interface Session {
  id: string;
  platform: LLMPlatform;
  createdAt: string;
  updatedAt: string;
  state: SessionState;
  metadata?: SessionMetadata;
}

export interface SessionState {
  messages: AgentMessage[];
  context: any;
  variables: Record<string, any>;
  checkpoints: SessionCheckpoint[];
}

export interface SessionCheckpoint {
  id: string;
  timestamp: string;
  messageCount: number;
  hash: string;
  metadata?: any;
}

export interface SessionMetadata {
  user?: string;
  agent?: string;
  tags?: string[];
  dangerousMode?: boolean;
  integrations?: {
    chatSpace?: {
      room: string;
      connected: boolean;
    };
    pocketflow?: {
      workflowId: string;
      connected: boolean;
    };
  };
}

export interface SessionConfig {
  persistent?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  maxMessages?: number;
  compression?: boolean;
}

export interface SessionManager {
  create(config: SessionConfig): Promise<Session>;
  load(id: string): Promise<Session>;
  save(session: Session): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<SessionSummary[]>;
  checkpoint(session: Session): Promise<SessionCheckpoint>;
  restore(id: string, checkpointId: string): Promise<Session>;
}

export interface SessionSummary {
  id: string;
  platform: LLMPlatform;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  metadata?: any;
}