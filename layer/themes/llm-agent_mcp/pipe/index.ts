/**
 * llm-agent_mcp theme pipe gateway
 * All external access to this theme must go through this file
 */

// Export MCP server and client interfaces
export { MCPServer, MCPServerConfig } from '../src/core/mcp-server';
export { MCPClient, MCPClientConfig } from '../src/core/mcp-client';
export { ToolRegistry } from '../src/core/tool-registry';

// Export adapters for each platform
export { ClaudeAdapter } from '../src/adapters/claude-adapter';
export { OllamaAdapter } from '../src/adapters/ollama-adapter';
export { VLLMAdapter } from '../src/adapters/vllm-adapter';

// Export common interfaces
export {
  MCPTool,
  MCPToolResult,
  MCPRequest,
  MCPResponse,
  MCPStreamChunk,
  MCPPlatform
} from '../src/interfaces';

// Export error types
export {
  MCPError,
  MCPConnectionError,
  MCPToolError,
  MCPPlatformError
} from '../src/errors';