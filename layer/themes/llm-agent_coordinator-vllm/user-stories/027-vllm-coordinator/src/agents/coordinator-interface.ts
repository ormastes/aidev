/**
 * Coordinator Interface
 * Base interface and abstract class for coordinator agents
 */

export interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

export interface CoordinatorCapabilities {
  chat: boolean;
  math: boolean;
  code: boolean;
  summarize: boolean;
  moderate: boolean;
  analyze: boolean;
  translate: boolean;
  help: boolean;
  streaming: boolean;
}

export interface CoordinatorConfig {
  serverUrl: string;
  roomId: string;
  agentName: string;
  authToken?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export abstract class BaseCoordinatorAgent {
  protected config: CoordinatorConfig;
  protected isConnected: boolean = false;
  protected messageHistory: Message[] = [];
  
  abstract readonly capabilities: CoordinatorCapabilities;
  
  constructor(config: CoordinatorConfig) {
    this.config = config;
  }
  
  /**
   * Start the coordinator agent
   */
  async start(): Promise<void> {
    console.log(`Starting ${this.config.agentName} coordinator...`);
    await this.onStart();
    this.isConnected = true;
  }
  
  /**
   * Stop the coordinator agent
   */
  async stop(): Promise<void> {
    console.log(`Stopping ${this.config.agentName} coordinator...`);
    await this.onStop();
    this.isConnected = false;
  }
  
  /**
   * Process incoming message
   */
  async processMessage(message: Message): Promise<void> {
    // Add to history
    this.messageHistory.push(message);
    
    // Check if we should respond
    if (this.shouldRespond(message)) {
      const response = await this.generateResponse(message, this.getContext());
      if (response) {
        await this.sendResponse(response);
      }
    }
  }
  
  /**
   * Check if the agent should respond to a message
   */
  protected shouldRespond(message: Message): boolean {
    // Don't respond to own messages
    if (message.username === this.config.agentName) {
      return false;
    }
    
    const content = message.content.toLowerCase();
    const agentName = this.config.agentName.toLowerCase();
    
    // Respond if mentioned by name
    if (content.includes(agentName) || content.includes(`@${agentName}`)) {
      return true;
    }
    
    // Respond to questions
    if (content.includes('?') || content.startsWith('how') || content.startsWith('what') || content.startsWith('why')) {
      return true;
    }
    
    // Respond to commands
    if (content.startsWith('/')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get conversation context
   */
  protected getContext(): Message[] {
    // Return last 10 messages for context
    return this.messageHistory.slice(-10);
  }
  
  /**
   * Send response to chat room
   */
  protected async sendResponse(content: string): Promise<void> {
    // This will be implemented by the chat room integration
    console.log(`${this.config.agentName}: ${content}`);
  }
  
  /**
   * Get help message
   */
  protected abstract getHelpMessage(): string;
  
  /**
   * Summarize conversation
   */
  protected async summarizeConversation(): Promise<string> {
    if (this.messageHistory.length === 0) {
      return 'No conversation to summarize yet.';
    }
    
    const messages = this.messageHistory.slice(-20);
    const summary = messages
      .map(m => `${m.username}: ${m.content.substring(0, 100)}...`)
      .join('\n');
    
    return `**Conversation Summary (last ${messages.length} messages):**\n${summary}`;
  }
  
  // Abstract methods to be implemented by subclasses
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract generateResponse(message: Message, context: Message[]): Promise<string>;
}