/**
 * MCP Agent Theme
 * Main entry point and exports
 */

// Domain models
export { Agent, AgentRole, AgentCapability, AGENT_ROLES } from './domain/agent';
export { Session, SessionStatus, SessionContext, SessionMessage } from './domain/session';
export {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPMethod,
  Tool,
  ToolCall,
  ToolResult,
  Resource,
  Prompt,
  MCPProtocol,
  MCPConnectionConfig,
  ServerCapabilities
} from './domain/protocol';

// Server components
export { MCPConnection } from './server/mcp-connection';
export { MCPServerManager, MCPServerInfo, ServerStatus } from './server/mcp-server-manager';

// Session management
export { SessionManager, SessionConfig } from './session/session-manager';

// Orchestration
export { 
  AgentOrchestrator,
  Task,
  Workflow,
  WorkflowStep,
  WorkflowContext
} from './orchestrator/agent-orchestrator';

// Agent implementations
export * from './agents';
export { createAgent, AgentType, AGENT_TYPES } from './agents';

// Integration interfaces for other themes
export interface PocketFlowIntegration {
  // Integration with PocketFlow for payment processing
  processPayment(agentId: string, amount: number, currency: string): Promise<string>;
  getPaymentHistory(agentId: string): Promise<any[]>;
}

export interface ChatSpaceIntegration {
  // Integration with Chat Space for communication
  joinChatSpace(agentId: string, spaceId: string): Promise<void>;
  sendMessage(agentId: string, spaceId: string, message: string): Promise<void>;
  receiveMessages(agentId: string, spaceId: string): Promise<any[]>;
}

// Quick start function
export async function createMCPAgentSystem(serverConfigs: MCPServerInfo[]): Promise<{
  serverManager: MCPServerManager;
  sessionManager: SessionManager;
  orchestrator: AgentOrchestrator;
}> {
  const serverManager = new MCPServerManager(serverConfigs);
  const sessionManager = new SessionManager(serverManager);
  const orchestrator = new AgentOrchestrator(sessionManager, serverManager);

  // Connect to servers
  for (const config of serverConfigs) {
    if (config.autoConnect) {
      await serverManager.connectServer(config.id);
    }
  }

  return {
    serverManager,
    sessionManager,
    orchestrator
  };
}