/**
 * Platform-specific types
 */

import { BaseConfig } from './common.types';

// Claude Platform Types
export interface ClaudeConfig extends BaseConfig {
  apiKey?: string;
  useLocalAuth?: boolean;
  model?: string;
  baseUrl?: string;
}

export interface ClaudeModel {
  id: string;
  name: string;
  contextLength: number;
  capabilities: string[];
}

// Ollama Platform Types
export interface OllamaConfig extends BaseConfig {
  host?: string;
  model?: string;
  autoStart?: boolean;
  autoInstall?: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaServerStatus {
  running: boolean;
  version?: string;
  models: OllamaModel[];
}

// vLLM Platform Types
export interface VLLMConfig extends BaseConfig {
  host?: string;
  model?: string;
  gpuMemoryUtilization?: number;
  maxModelLen?: number;
  autoStart?: boolean;
}

export interface VLLMModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  capabilities?: {
    max_tokens: number;
    supports_streaming: boolean;
    supports_gpu: boolean;
  };
}

export interface VLLMServerStatus {
  running: boolean;
  models: VLLMModel[];
  gpu?: {
    name: string;
    memory_used: number;
    memory_total: number;
    utilization: number;
  };
}

// Platform Manager Interface
export interface IPlatformManager<TConfig = BaseConfig, TModel = any, TStatus = any> {
  readonly name: string;
  readonly version: string;
  
  initialize(config: TConfig): Promise<void>;
  getStatus(): Promise<TStatus>;
  listModels(): Promise<TModel[]>;
  loadModel(modelId: string): Promise<void>;
  unloadModel(modelId: string): Promise<void>;
  shutdown(): Promise<void>;
}