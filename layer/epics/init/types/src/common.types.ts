/**
 * Common types used across all LLM Agent components
 */

export type LLMPlatform = 'claude' | 'ollama' | 'vllm';

export interface BaseConfig {
  platform: LLMPlatform;
  debug?: boolean;
  timeout?: number;
}

export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorInfo;
  metadata?: ResponseMetadata;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ResponseMetadata {
  timestamp: string;
  duration: number;
  platform: LLMPlatform;
  model?: string;
  requestId?: string;
}

export interface StreamChunk {
  type: 'content' | 'error' | "metadata" | 'end';
  content?: string;
  error?: ErrorInfo;
  metadata?: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, listener: (...args: any[]) => void): void;
}