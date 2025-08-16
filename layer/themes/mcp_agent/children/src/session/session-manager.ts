/**
 * Session Manager
 * Manages agent sessions and their lifecycle
 */

import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import { Session, SessionStatus, SessionContext, SessionMessage } from '../domain/session';
import { Agent } from '../domain/agent';
import { MCPServerManager } from '../server/mcp-server-manager';

export interface SessionConfig {
  maxIdleTime?: number; // Maximum idle time in milliseconds
  maxMessageHistory?: number; // Maximum messages to keep in history
  autoSave?: boolean; // Auto-save session state
  savePath?: string; // Path to save sessions
}

export interface SessionManagerEvents {
  sessionCreated: (session: Session) => void;
  sessionStarted: (sessionId: string) => void;
  sessioncompleted: (sessionId: string) => void;
  sessionError: (sessionId: string, error: Error) => void;
  messageAdded: (sessionId: string, message: SessionMessage) => void;
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();
  private agents: Map<string, Agent> = new Map();
  private serverManager: MCPServerManager;
  private config: SessionConfig;
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(serverManager: MCPServerManager, config?: SessionConfig) {
    super();
    this.serverManager = serverManager;
    this.config = {
      maxIdleTime: 30 * 60 * 1000, // 30 minutes default
      maxMessageHistory: 1000,
      autoSave: false,
      ...config
    };
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.getId(), agent);
  }

  unregisterAgent(agentId: string): void {
    // End all sessions for this agent
    for (const session of this.sessions.values()) {
      if (session.getAgentId() === agentId && session.isActive()) {
        this.endSession(session.getId(), 'Agent unregistered');
      }
    }
    this.agents.delete(agentId);
  }

  createSession(agentId: string, context?: SessionContext): Session {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.isActive()) {
      throw new Error(`Agent ${agentId} is not active`);
    }

    const sessionId = uuidv4();
    const session = new Session({
      id: sessionId,
      agentId,
      context: context || {},
      metadata: {
        agentRole: agent.getRoleName(),
        capabilities: agent.getEnabledCapabilities()
      }
    });

    this.sessions.set(sessionId, session);
    this.emit("sessionCreated", session);
    
    // Set idle timer
    this.resetIdleTimer(sessionId);
    
    return session;
  }

  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const agent = this.agents.get(session.getAgentId());
    if (!agent) {
      throw new Error(`Agent ${session.getAgentId()} not found`);
    }

    try {
      session.start();
      
      // Add system message with agent introduction
      const systemPrompt = agent.getSystemPrompt();
      if (systemPrompt) {
        session.addMessage({
          role: 'system',
          content: [{
            type: 'text',
            text: systemPrompt
          }],
          timestamp: new Date()
        });
      }

      this.emit("sessionStarted", sessionId);
    } catch (error: any) {
      session.setError(error.message);
      this.emit("sessionError", sessionId, error);
      throw error;
    }
  }

  async processMessage(sessionId: string, content: string): Promise<SessionMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.isActive()) {
      throw new Error(`Session ${sessionId} is not active`);
    }

    const agent = this.agents.get(session.getAgentId());
    if (!agent) {
      throw new Error(`Agent ${session.getAgentId()} not found`);
    }

    // Reset idle timer
    this.resetIdleTimer(sessionId);

    // Add user message
    const userMessage: SessionMessage = {
      role: 'user',
      content: [{
        type: 'text',
        text: content
      }],
      timestamp: new Date()
    };
    session.addMessage(userMessage);
    this.emit("messageAdded", sessionId, userMessage);

    try {
      // Process with agent capabilities
      const response = await this.processWithAgent(session, agent, content);
      
      // Add assistant response
      const assistantMessage: SessionMessage = {
        role: "assistant",
        content: [{
          type: 'text',
          text: response
        }],
        timestamp: new Date()
      };
      session.addMessage(assistantMessage);
      this.emit("messageAdded", sessionId, assistantMessage);

      // Trim history if needed
      this.trimMessageHistory(session);

      // Auto-save if enabled
      if (this.config.autoSave) {
        await this.saveSession(sessionId);
      }

      return assistantMessage;
    } catch (error: any) {
      session.setError(error.message);
      this.emit("sessionError", sessionId, error);
      throw error;
    }
  }

  private async processWithAgent(session: Session, agent: Agent, input: string): Promise<string> {
    const capabilities = agent.getEnabledCapabilities();
    const tools = await this.serverManager.getAllTools();
    
    // Build available tools based on agent capabilities
    const availableTools = new Map();
    for (const [name, toolInfo] of tools) {
      const toolCapability = toolInfo.tool.name;
      if (capabilities.includes(toolCapability) || capabilities.includes('general_assistance')) {
        availableTools.set(name, toolInfo);
      }
    }

    // For now, return a simple response
    // In a real implementation, this would use the MCP servers to process the request
    const context = session.getContext();
    const messages = session.getMessages();
    
    return `Processing your request with ${agent.getRoleName()} agent. Available tools: ${Array.from(availableTools.keys()).join(', ')}`;
  }

  endSession(sessionId: string, reason?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.success();
    
    if (reason) {
      session.setMetadata("endReason", reason);
    }

    // Clear idle timer
    const timer = this.idleTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(sessionId);
    }

    this.emit("sessioncompleted", sessionId);
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive());
  }

  getAgentSessions(agentId: string): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.getAgentId() === agentId);
  }

  private resetIdleTimer(sessionId: string): void {
    // Clear existing timer
    const existingTimer = this.idleTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.endSession(sessionId, 'Idle timeout');
    }, this.config.maxIdleTime!);

    this.idleTimers.set(sessionId, timer);
  }

  private trimMessageHistory(session: Session): void {
    const messages = session.getMessages();
    if (messages.length > this.config.maxMessageHistory!) {
      // Keep system messages and trim old user/assistant messages
      const systemMessages = messages.filter(m => m.role === 'system');
      const otherMessages = messages.filter(m => m.role !== 'system');
      
      const toKeep = otherMessages.slice(-this.config.maxMessageHistory!);
      session["messages"] = [...systemMessages, ...toKeep];
    }
  }

  async saveSession(sessionId: string): Promise<void> {
    if (!this.config.savePath) {
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // In a real implementation, this would save to file system
    // For now, just log
    console.log(`Saving session ${sessionId} to ${this.config.savePath}`);
  }

  async loadSession(sessionId: string): Promise<Session | undefined> {
    if (!this.config.savePath) {
      return undefined;
    }

    // In a real implementation, this would load from file system
    console.log(`Loading session ${sessionId} from ${this.config.savePath}`);
    return undefined;
  }

  // Statistics
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    errorSessions: number;
    sessionsByAgent: Map<string, number>;
  } {
    const stats = {
      totalSessions: this.sessions.size,
      activeSessions: 0,
      completedSessions: 0,
      errorSessions: 0,
      sessionsByAgent: new Map<string, number>()
    };

    for (const session of this.sessions.values()) {
      if (session.getStatus() === SessionStatus.ACTIVE) {
        stats.activeSessions++;
      } else if (session.getStatus() === SessionStatus.success) {
        stats.completedSessions++;
      } else if (session.getStatus() === SessionStatus.ERROR) {
        stats.errorSessions++;
      }

      const agentId = session.getAgentId();
      stats.sessionsByAgent.set(
        agentId, 
        (stats.sessionsByAgent.get(agentId) || 0) + 1
      );
    }

    return stats;
  }

  // Cleanup
  cleanup(): void {
    // End all active sessions
    for (const session of this.sessions.values()) {
      if (session.isActive()) {
        this.endSession(session.getId(), 'Manager cleanup');
      }
    }

    // Clear all timers
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.idleTimers.clear();

    this.removeAllListeners();
  }

  on<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof SessionManagerEvents>(
    event: K,
    ...args: Parameters<SessionManagerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}