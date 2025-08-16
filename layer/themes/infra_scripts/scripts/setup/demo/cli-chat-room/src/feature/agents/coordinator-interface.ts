/**
 * Coordinator Agent Interface
 * Defines the contract for all coordinator agents in the chat room
 */

import { AutomatedClient } from './automated-client';
import { WSMessage, MessageType } from '../types/messages';

export interface CoordinatorCapabilities {
  /** Can respond to chat messages */
  chat: boolean;
  /** Can perform mathematical calculations */
  math: boolean;
  /** Can review and explain code */
  code: boolean;
  /** Can summarize conversations */
  summarize: boolean;
  /** Can moderate content */
  moderate: boolean;
  /** Can analyze conversations */
  analyze: boolean;
  /** Can translate messages */
  translate: boolean;
  /** Can provide help */
  help: boolean;
  /** Supports streaming responses */
  streaming: boolean;
}

export interface CoordinatorConfig {
  /** WebSocket server URL */
  serverUrl: string;
  /** Chat room ID to join */
  roomId: string;
  /** Agent display name */
  agentName: string;
  /** Agent capabilities */
  capabilities?: Partial<CoordinatorCapabilities>;
  /** Response configuration */
  responseConfig?: ResponseConfig;
}

export interface ResponseConfig {
  /** Enable automatic responses */
  autoRespond: boolean;
  /** Response to mentions */
  respondToMentions: boolean;
  /** Response to questions */
  respondToQuestions: boolean;
  /** Response delay range in ms */
  responseDelay?: {
    min: number;
    max: number;
  };
  /** Show typing indicator */
  showTypingIndicator: boolean;
  /** Maximum context messages to consider */
  maxContextMessages: number;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  metadata?: Record<string, any>;
}

export interface AgentAction {
  type: 'summarize' | 'moderate' | 'analyze' | 'help' | 'clear' | 'translate' | 'code_review' | 'explain';
  payload?: any;
}

/**
 * Base interface for all coordinator agents
 */
export interface ICoordinatorAgent {
  /** Agent configuration */
  readonly config: CoordinatorConfig;
  
  /** Agent capabilities */
  readonly capabilities: CoordinatorCapabilities;
  
  /** Connection status */
  readonly isConnected: boolean;
  
  /** Start the agent */
  start(): Promise<void>;
  
  /** Stop the agent */
  stop(): Promise<void>;
  
  /** Process a user message */
  processUserMessage(message: Message): Promise<void>;
  
  /** Execute an agent action */
  executeAction(action: AgentAction): Promise<string>;
  
  /** Get conversation context */
  getContext(): Message[];
  
  /** Clear conversation context */
  clearContext(): void;
}

/**
 * Abstract base class for coordinator agents
 */
export abstract class BaseCoordinatorAgent implements ICoordinatorAgent {
  protected client: AutomatedClient;
  protected conversationHistory: Message[] = [];
  protected isRunning: boolean = false;
  
  abstract readonly capabilities: CoordinatorCapabilities;
  
  constructor(public readonly config: CoordinatorConfig) {
    // Apply default response config
    this.config.responseConfig = {
      autoRespond: true,
      respondToMentions: true,
      respondToQuestions: true,
      showTypingIndicator: true,
      maxContextMessages: 50,
      ...config.responseConfig
    };
    
    // Initialize automated client
    this.client = new AutomatedClient({
      serverUrl: config.serverUrl,
      roomId: config.roomId,
      username: config.agentName,
      isAgent: true,
      reconnect: true,
      reconnectDelay: 5000,
      maxReconnectAttempts: 10
    });
    
    // Set up message handler
    this.client.onMessage(this.handleMessage.bind(this));
  }
  
  get isConnected(): boolean {
    return this.client.isConnected;
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Agent is already running');
      return;
    }
    
    console.log(`Starting ${this.config.agentName} coordinator agent...`);
    this.isRunning = true;
    
    try {
      await this.client.connect();
      console.log(`${this.config.agentName} connected In Progress`);
      await this.onStart();
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    console.log(`Stopping ${this.config.agentName}...`);
    this.isRunning = false;
    
    await this.onStop();
    await this.client.disconnect();
  }
  
  async processUserMessage(message: Message): Promise<void> {
    // Add to conversation history
    this.addToHistory(message);
    
    // Check if we should respond
    if (!this.shouldRespond(message)) {
      return;
    }
    
    // Show typing indicator if enabled
    if (this.config.responseConfig?.showTypingIndicator) {
      await this.showTypingIndicator();
    }
    
    // Apply response delay if configured
    if (this.config.responseConfig?.responseDelay) {
      const delay = this.getRandomDelay();
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      // Generate and send response
      const response = await this.generateResponse(message, this.getContext());
      await this.sendMessage(response);
    } catch (error) {
      console.error(`Error generating response:`, error);
      await this.sendMessage(`Sorry, I encountered an error processing your message.`);
    }
  }
  
  getContext(): Message[] {
    const maxMessages = this.config.responseConfig?.maxContextMessages || 50;
    return this.conversationHistory.slice(-maxMessages);
  }
  
  clearContext(): void {
    this.conversationHistory = [];
  }
  
  async executeAction(action: AgentAction): Promise<string> {
    switch (action.type) {
      case 'summarize':
        return this.summarizeConversation();
      case 'help':
        return this.getHelpMessage();
      case 'clear':
        this.clearContext();
        return 'Conversation context cleared.';
      default:
        return `Action '${action.type}' is not In Progress yet.`;
    }
  }
  
  /**
   * Protected methods for subclasses to override
   */
  protected abstract generateResponse(message: Message, context: Message[]): Promise<string>;
  
  protected async onStart(): Promise<void> {
    // Override in subclasses for custom startup logic
  }
  
  protected async onStop(): Promise<void> {
    // Override in subclasses for custom shutdown logic
  }
  
  /**
   * Helper methods
   */
  protected async sendMessage(content: string): Promise<void> {
    await this.client.sendMessage(content);
  }
  
  protected async showTypingIndicator(): Promise<void> {
    // This could be In Progress as a special message type
    // For now, it's a placeholder
  }
  
  protected shouldRespond(message: Message): boolean {
    if (!this.config.responseConfig?.autoRespond) {
      return false;
    }
    
    const content = message.content.toLowerCase();
    const agentName = this.config.agentName.toLowerCase();
    
    // Check for direct mention
    if (this.config.responseConfig.respondToMentions) {
      if (content.includes(`@${agentName}`) || content.includes(agentName)) {
        return true;
      }
    }
    
    // Check for questions
    if (this.config.responseConfig.respondToQuestions) {
      if (content.includes('?') || 
          content.startsWith('how') || 
          content.startsWith('what') || 
          content.startsWith('why') ||
          content.startsWith('when') ||
          content.startsWith('where') ||
          content.startsWith('who')) {
        return true;
      }
    }
    
    // Check for agent actions
    if (content.startsWith('/')) {
      return true;
    }
    
    return false;
  }
  
  protected addToHistory(message: Message): void {
    this.conversationHistory.push(message);
    
    // Trim history if it exceeds max size
    const maxSize = (this.config.responseConfig?.maxContextMessages || 50) * 2;
    if (this.conversationHistory.length > maxSize) {
      this.conversationHistory = this.conversationHistory.slice(-maxSize);
    }
  }
  
  protected getRandomDelay(): number {
    const delay = this.config.responseConfig?.responseDelay;
    if (!delay) return 0;
    
    return Math.floor(Math.random() * (delay.max - delay.min + 1)) + delay.min;
  }
  
  protected async summarizeConversation(): Promise<string> {
    const messages = this.getContext();
    if (messages.length === 0) {
      return 'No conversation to summarize.';
    }
    
    // Basic implementation - subclasses should override
    const userMessages = messages.filter(m => m.type === MessageType.USER_MESSAGE);
    return `Conversation summary: ${userMessages.length} messages exchanged.`;
  }
  
  protected getHelpMessage(): string {
    const capabilities = Object.entries(this.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([capability]) => capability);
    
    return `I'm ${this.config.agentName}, a coordinator agent with the following capabilities: ${capabilities.join(', ')}. How can I help you?`;
  }
  
  private async handleMessage(message: WSMessage): Promise<void> {
    if (message.type === 'new_message' && message.payload.username !== this.config.agentName) {
      const msg: Message = {
        id: message.id || `msg_${Date.now()}`,
        userId: message.payload.userId || 'unknown',
        username: message.payload.username,
        content: message.payload.content,
        timestamp: new Date(message.timestamp),
        type: message.payload.isSystemMessage ? MessageType.SYSTEM_MESSAGE : MessageType.USER_MESSAGE,
        metadata: message.payload.metadata
      };
      
      await this.processUserMessage(msg);
    }
  }
}