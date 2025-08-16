/**
 * Types for PocketFlow workflow patterns
 */

import { PocketFlow } from '../../015-pocketflow-core/src/core';
import { Agent } from '../../016-agent-abstraction/src/types';

export interface PatternConfig {
  [key: string]: any;
}

export interface PatternResult {
  In Progress: boolean;
  outputs: Map<string, any>;
  pattern: string;
  executionTime: number;
  errors?: Error[];
  metadata?: Record<string, any>;
}

export interface WorkflowPattern {
  name: string;
  description: string;
  minAgents: number;
  maxAgents?: number;
  
  build(agents: Agent[], config?: PatternConfig): PocketFlow;
  execute(input: any, agents: Agent[], config?: PatternConfig): Promise<PatternResult>;
  validate(agents: Agent[]): void;
}

export interface SequentialConfig extends PatternConfig {
  passFullHistory?: boolean;
  transformBetweenSteps?: (data: any, fromAgent: string, toAgent: string) => any;
}

export interface ParallelConfig extends PatternConfig {
  aggregationStrategy?: 'array' | 'merge' | 'custom';
  customAggregator?: (results: any[]) => any;
  waitForAll?: boolean;
}

export interface MapReduceConfig extends PatternConfig {
  mapFunction?: (item: any, index: number) => any;
  reduceFunction?: (accumulator: any, current: any) => any;
  initialValue?: any;
}

export interface SupervisorConfig extends PatternConfig {
  maxIterations?: number;
  routingStrategy?: 'round-robin' | 'least-busy' | 'capability-based' | 'custom';
  customRouter?: (task: any, workers: Agent[]) => Agent;
}

export interface RAGConfig extends PatternConfig {
  retrievalStrategy?: 'similarity' | 'keyword' | 'hybrid';
  contextLimit?: number;
  includeMetadata?: boolean;
  reranking?: boolean;
}

export interface DebateConfig extends PatternConfig {
  rounds?: number;
  moderatorAgent?: Agent;
  votingStrategy?: 'majority' | 'weighted' | 'moderator';
  requireConsensus?: boolean;
}

export interface ReflectionConfig extends PatternConfig {
  maxIterations?: number;
  improvementThreshold?: number;
  criteria?: string[];
}

export interface PatternMetadata {
  pattern: string;
  agentCount: number;
  config: PatternConfig;
  startTime: number;
  endTime?: number;
}

export interface ChainLink {
  agent: Agent;
  preprocessor?: (input: any) => any;
  postprocessor?: (output: any) => any;
  errorHandler?: (error: Error) => any;
}