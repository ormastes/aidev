/**
 * vLLM Coordinator Agent
 * Main entry point and exports
 */

// Export agents
export { VLLMCoordinatorAgent, createVLLMCoordinator } from './agents/vllm-coordinator';
export type { VLLMCoordinatorConfig } from './agents/vllm-coordinator';

// Export services
export { VLLMClient } from './services/vllm-client';
export type { VLLMClientConfig, VLLMChatRequest, VLLMChatResponse } from './services/vllm-client';

export { VLLMInstaller } from './services/vllm-installer';
export type { VLLMInstallConfig, GPUInfo } from './services/vllm-installer';

// Export configuration
export * from './config/deepseek-r1';

// Export base interfaces
export type { 
  Message, 
  CoordinatorCapabilities, 
  CoordinatorConfig 
} from './agents/coordinator-interface';