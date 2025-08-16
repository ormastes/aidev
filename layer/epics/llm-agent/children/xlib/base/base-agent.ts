/**
 * Base Agent implementation
 */

import { EventEmitter } from "eventemitter3";
import { v4 as uuidv4 } from 'uuid';
import {
  IAgent,
  AgentRequest,
  AgentResponse,
  AgentCapabilities,
  Message
} from '../interfaces/base.interfaces';
import { ISessionManager, Session } from '../interfaces/infrastructure.interfaces';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  protected config: any;
  protected sessionManager?: ISessionManager;
  protected initialized: boolean = false;

  constructor(id: string, name: string, version: string = '1.0.0', capabilities: string[] = []) {
    super();
    this.id = id;
    this.name = name;
    this.version = version;
    this.capabilities = capabilities;
  }

  async initialize(config: any): Promise<void> {
    this.config = config;
    await this.onInitialize(config);
    this.initialized = true;
    this.emit("initialized");
  }

  async shutdown(): Promise<void> {
    await this.onShutdown();
    this.initialized = false;
    this.removeAllListeners();
    this.emit("shutdown");
  }

  async process(request: AgentRequest): Promise<AgentResponse> {
    if (!this.initialized) {
      throw new Error(`Agent ${this.name} is not initialized`);
    }

    // Create response ID
    const responseId = uuidv4();

    try {
      this.emit("processing", { requestId: request.id, responseId });

      // Add session handling if session manager is available
      let session: Session | null = null;
      if (this.sessionManager && request.sessionId) {
        session = await this.sessionManager.loadSession(request.sessionId);
        if (!session) {
          throw new Error(`Session ${request.sessionId} not found`);
        }
      }

      // Process the request
      const response = await this.onProcess(request, session);

      // Ensure response has required fields
      if (!response.id) response.id = responseId;
      if (!response.role) response.role = "assistant";

      // Update session if needed
      if (session && this.sessionManager) {
        const assistantMessage: Message = {
          id: response.id,
          role: "assistant",
          content: response.content,
          timestamp: new Date(),
          metadata: response.metadata
        };
        
        session.messages.push(assistantMessage);
        await this.sessionManager.saveSession(session);
      }

      this.emit("processed", { requestId: request.id, responseId: response.id });
      return response;

    } catch (error) {
      this.emit('error', { requestId: request.id, responseId, error });
      throw error;
    }
  }

  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  // Session management helpers
  setSessionManager(sessionManager: ISessionManager): void {
    this.sessionManager = sessionManager;
  }

  async createSession(options?: any): Promise<Session> {
    if (!this.sessionManager) {
      throw new Error('Session manager not configured');
    }
    return this.sessionManager.createSession(this.id, options);
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(config: any): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
  protected abstract onProcess(request: AgentRequest, session?: Session | null): Promise<AgentResponse>;

  // Utility methods for subclasses
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.emit('log', {
      level,
      message,
      data,
      timestamp: new Date(),
      agentId: this.id
    });
  }

  protected async validateRequest(request: AgentRequest): Promise<void> {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request must contain at least one message');
    }

    // Check if requested tools are available
    if (request.tools) {
      for (const tool of request.tools) {
        if (!this.hasCapability(`tool:${tool}`)) {
          throw new Error(`Tool ${tool} is not available`);
        }
      }
    }
  }

  // Helper method to get agent capabilities in standard format
  abstract getCapabilities(): AgentCapabilities;
}