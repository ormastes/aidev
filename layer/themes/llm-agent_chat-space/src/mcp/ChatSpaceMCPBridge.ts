import { EventEmitter } from 'node:events';
import { ChatSpaceMCPClient } from './ChatSpaceMCPClient';
import { ChatSpace, ChatMessage } from '../ChatSpace';

/**
 * Bridge between Chat Space and MCP Protocol
 * Translates chat events to MCP calls and vice versa
 */
export class ChatSpaceMCPBridge extends EventEmitter {
  public mcpClient: ChatSpaceMCPClient;
  private chatSpace: ChatSpace;
  private activeAgents: Map<string, string> = new Map(); // agentId -> spaceId
  private messageQueue: Map<string, ChatMessage[]> = new Map();

  constructor(chatSpace: ChatSpace, mcpServerUrl?: string) {
    super();
    this.chatSpace = chatSpace;
    this.mcpClient = new ChatSpaceMCPClient(mcpServerUrl);
    this.setupEventHandlers();
  }

  /**
   * Initialize the bridge
   */
  async initialize(): Promise<void> {
    // Connect to MCP server
    await this.mcpClient.connect();

    // Register MCP tools with chat space
    await this.registerMCPTools();

    console.log('Chat Space MCP Bridge initialized');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle chat space events
    this.chatSpace.on('message', (message: ChatMessage) => {
      this.handleChatMessage(message);
    });

    this.chatSpace.on('command', (command: any) => {
      this.handleChatCommand(command);
    });

    this.chatSpace.on('user_joined', (data: any) => {
      this.handleUserJoined(data);
    });

    // Handle MCP client events
    this.mcpClient.on("notification", (notification: any) => {
      this.handleMCPNotification(notification);
    });

    this.mcpClient.on('error', (error: Error) => {
      console.error('MCP Client error:', error);
      this.emit('error', error);
    });

    this.mcpClient.on("disconnected", () => {
      console.log('MCP Client disconnected');
      this.emit('mcp_disconnected');
    });
  }

  /**
   * Register MCP tools with chat space
   */
  private async registerMCPTools(): Promise<void> {
    try {
      const tools = await this.mcpClient.listTools();
      
      // Register each tool as a chat command
      for (const tool of tools) {
        this.chatSpace.registerCommand({
          name: `/mcp_${tool.name}`,
          description: tool.description,
          handler: async (args: any) => {
            return await this.callMCPTool(tool.name, args);
          }
        });
      }

      console.log(`Registered ${tools.length} MCP tools as chat commands`);
    } catch (error) {
      console.error('Failed to register MCP tools:', error);
    }
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(message: ChatMessage): Promise<void> {
    // Check if message is for an MCP agent
    if (message.content.startsWith('@mcp') || message.content.startsWith('/mcp')) {
      await this.routeToMCPAgent(message);
    }

    // Store message for context
    const spaceId = message.spaceId;
    if (!this.messageQueue.has(spaceId)) {
      this.messageQueue.set(spaceId, []);
    }
    this.messageQueue.get(spaceId)!.push(message);

    // Keep only last 100 messages
    const messages = this.messageQueue.get(spaceId)!;
    if (messages.length > 100) {
      this.messageQueue.set(spaceId, messages.slice(-100));
    }
  }

  /**
   * Handle chat command
   */
  private async handleChatCommand(command: any): Promise<void> {
    const { name, args, userId, spaceId } = command;

    // Special MCP commands
    switch (name) {
      case '/mcp-connect':
        await this.handleMCPConnect(args, userId, spaceId);
        break;

      case '/mcp-tools':
        await this.handleMCPListTools(userId, spaceId);
        break;

      case '/mcp-resources':
        await this.handleMCPListResources(userId, spaceId);
        break;

      case '/mcp-call':
        await this.handleMCPCallTool(args, userId, spaceId);
        break;

      default:
        // Check if it's a registered MCP tool command
        if (name.startsWith('/mcp_')) {
          const toolName = name.substring(5);
          await this.callMCPTool(toolName, args);
        }
    }
  }

  /**
   * Handle user joined event
   */
  private handleUserJoined(data: any): void {
    const { userId, spaceId } = data;
    
    // Check if user is an MCP agent
    if (userId.startsWith('mcp-agent-')) {
      this.activeAgents.set(userId, spaceId);
      console.log(`MCP Agent ${userId} joined space ${spaceId}`);
    }
  }

  /**
   * Handle MCP notification
   */
  private handleMCPNotification(notification: any): void {
    const { method, params } = notification;

    switch (method) {
      case 'tools/list_changed':
        // Re-register tools
        this.registerMCPTools();
        break;

      case 'log/message':
        // Forward log messages to chat
        if (params.level === 'error' || params.level === 'warning') {
          this.broadcastToChatSpaces({
            type: 'mcp_log',
            level: params.level,
            message: params.data
          });
        }
        break;

      default:
        console.log('Unhandled MCP notification:', method);
    }
  }

  /**
   * Route message to MCP agent
   */
  private async routeToMCPAgent(message: ChatMessage): Promise<void> {
    try {
      // Extract agent name and actual message
      const match = message.content.match(/^(@mcp-\w+|\/mcp)\s+(.*)$/);
      if (!match) return;

      const [, target, content] = match;
      
      // Call MCP tool to process message
      const response = await this.mcpClient.callTool('process_message', {
        message: content,
        context: {
          userId: message.userId,
          spaceId: message.spaceId,
          timestamp: message.timestamp,
          recentMessages: this.getRecentMessages(message.spaceId, 10)
        }
      });

      // Send response back to chat
      if (response.reply) {
        this.chatSpace.sendMessage({
          userId: 'mcp-agent',
          userName: 'MCP Agent',
          spaceId: message.spaceId,
          content: response.reply,
          metadata: {
            type: 'mcp_response',
            toolsUsed: response.toolsUsed || []
          }
        });
      }
    } catch (error) {
      console.error('Failed to route message to MCP agent:', error);
      
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId: message.spaceId,
        content: `Failed to process MCP request: ${error}`,
        metadata: { type: 'error' }
      });
    }
  }

  /**
   * Call MCP tool
   */
  private async callMCPTool(toolName: string, args: any): Promise<any> {
    try {
      const result = await this.mcpClient.callTool(toolName, args);
      
      // Process result based on tool type
      if (result.content) {
        // Content response - send to chat
        const content = result.content[0];
        if (content.type === 'text') {
          return {
            success: true,
            message: content.text
          };
        }
      }

      return result;
    } catch (error: any) {
      console.error(`Failed to call MCP tool ${toolName}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle MCP connect command
   */
  private async handleMCPConnect(args: any, userId: string, spaceId: string): Promise<void> {
    const { serverUrl } = args;
    
    try {
      if (serverUrl) {
        // Disconnect from current server
        this.mcpClient.disconnect();
        
        // Create new client with specified URL
        this.mcpClient = new ChatSpaceMCPClient(serverUrl);
        this.setupEventHandlers();
      }

      await this.mcpClient.connect();
      await this.registerMCPTools();

      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Connected to MCP server${serverUrl ? ' at ' + serverUrl : ''}`,
        metadata: { type: 'success' }
      });
    } catch (error: any) {
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Failed to connect to MCP server: ${error.message}`,
        metadata: { type: 'error' }
      });
    }
  }

  /**
   * Handle MCP list tools command
   */
  private async handleMCPListTools(userId: string, spaceId: string): Promise<void> {
    try {
      const tools = await this.mcpClient.listTools();
      
      const toolList = tools.map(t => `• **${t.name}**: ${t.description}`).join('\n');
      
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Available MCP Tools:\n${toolList}`,
        metadata: { type: 'info' }
      });
    } catch (error: any) {
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Failed to list MCP tools: ${error.message}`,
        metadata: { type: 'error' }
      });
    }
  }

  /**
   * Handle MCP list resources command
   */
  private async handleMCPListResources(userId: string, spaceId: string): Promise<void> {
    try {
      const resources = await this.mcpClient.listResources();
      
      const resourceList = resources.map(r => 
        `• **${r.name}**: ${r.description} (${r.uri})`
      ).join('\n');
      
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Available MCP Resources:\n${resourceList || 'No resources available'}`,
        metadata: { type: 'info' }
      });
    } catch (error: any) {
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Failed to list MCP resources: ${error.message}`,
        metadata: { type: 'error' }
      });
    }
  }

  /**
   * Handle MCP call tool command
   */
  private async handleMCPCallTool(args: any, userId: string, spaceId: string): Promise<void> {
    const { tool, params } = args;
    
    if (!tool) {
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: 'Usage: /mcp-call <tool_name> <params>',
        metadata: { type: 'error' }
      });
      return;
    }

    try {
      const result = await this.callMCPTool(tool, params || {});
      
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `MCP Tool Result:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
        metadata: { type: 'mcp_result', tool }
      });
    } catch (error: any) {
      this.chatSpace.sendMessage({
        userId: 'system',
        userName: 'System',
        spaceId,
        content: `Failed to call MCP tool: ${error.message}`,
        metadata: { type: 'error' }
      });
    }
  }

  /**
   * Get recent messages from a space
   */
  private getRecentMessages(spaceId: string, limit: number = 10): ChatMessage[] {
    const messages = this.messageQueue.get(spaceId) || [];
    return messages.slice(-limit);
  }

  /**
   * Broadcast message to all chat spaces
   */
  private broadcastToChatSpaces(data: any): void {
    // Broadcast to all active spaces
    for (const [agentId, spaceId] of this.activeAgents) {
      this.chatSpace.sendMessage({
        userId: 'mcp-system',
        userName: 'MCP System',
        spaceId,
        content: JSON.stringify(data),
        metadata: data
      });
    }
  }

  /**
   * Shutdown the bridge
   */
  shutdown(): void {
    this.mcpClient.disconnect();
    this.removeAllListeners();
    this.messageQueue.clear();
    this.activeAgents.clear();
  }
}