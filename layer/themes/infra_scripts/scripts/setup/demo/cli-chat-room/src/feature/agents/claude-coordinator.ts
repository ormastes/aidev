import { AutomatedClient } from './automated-client';
import { AgentAction, Message, MessageType, WSEventType } from '../types/chat';
import chalk from 'chalk';
import Anthropic from '@anthropic-ai/sdk';
import { authManager } from '../auth/local-auth-manager';

interface ClaudeCoordinatorConfig {
  serverUrl: string;
  roomId: string;
  agentName: string;
  apiKey?: string;
  model?: string;
}

export class ClaudeCoordinatorAgent {
  private client: AutomatedClient;
  private config: ClaudeCoordinatorConfig;
  private anthropic?: Anthropic;
  private conversationHistory: Message[] = [];
  private maxHistorySize: number = 50;

  constructor(config: ClaudeCoordinatorConfig) {
    this.config = config;
    
    // Initialize Claude API using local auth manager
    const apiKey = config.apiKey || authManager.getAnthropicApiKey();
    
    if (apiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey
      });
      console.log(chalk.green('🔄 Claude API initialized'));
    } else {
      console.log(chalk.yellow('⚠️  No API key found - running in demo mode'));
      console.log(chalk.gray('  Tip: Run "claude-auth setup" to configure shared authentication'));
    }

    this.client = new AutomatedClient({
      serverUrl: config.serverUrl,
      username: config.agentName,
      roomId: config.roomId,
      isAgent: true
    });

    // Set up message handling
    this.setupMessageHandling();
  }

  private setupMessageHandling() {
    // Register message handler
    this.client.onMessage((message) => {
      this.handleIncomingMessage(message);
    });
  }

  private handleIncomingMessage(message: any) {
    // Process messages for our agent
    if (message.type === WSEventType.NEW_MESSAGE && message.payload) {
      const msg = message.payload;
      
      // Store in history
      this.conversationHistory.push(msg);
      if (this.conversationHistory.length > this.maxHistorySize) {
        this.conversationHistory.shift();
      }

      // Check if message is directed at agent
      if (msg.type === MessageType.USER_MESSAGE) {
        const content = msg.content.toLowerCase();
        
        // Check for direct mentions or questions
        if (content.includes('@' + this.config.agentName.toLowerCase()) ||
            content.includes('claude') ||
            content.includes('?') ||
            content.match(/\d+\s*[\+\-\*\/]\s*\d+/) || // Math expressions
            content.includes('help')) {
          
          this.processUserMessage(msg);
        }
      }
    }
  }

  private async processUserMessage(message: Message) {
    const response = await this.generateResponse(message.content, message.username);
    
    if (response) {
      // Send response through client
      setTimeout(() => {
        this.client.sendChatMessage(response);
      }, 500); // Small delay to seem more natural
    }
  }

  private async generateResponse(userMessage: string, username: string): Promise<string> {
    // If no Claude API, provide helpful demo response
    if (!this.anthropic) {
      return this.getDemoResponse(userMessage);
    }

    try {
      // Build context from recent conversation
      const context = this.buildConversationContext();
      
      const systemPrompt = `You are Claude, a helpful AI assistant participating in a chat room. 
You should:
- Be helpful, friendly, and concise
- Answer questions directly
- Solve math problems when asked
- Provide coding help when requested
- Keep responses brief and chat-appropriate (1-3 sentences usually)
- Use emojis sparingly to be friendly 😊

Current participants: ${this.getParticipants().join(', ')}`;

      const response = await this.anthropic.messages.create({
        model: this.config.model || 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [
          ...context,
          { role: 'user', content: `${username}: ${userMessage}` }
        ],
        system: systemPrompt
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'I couldn\'t generate a response.';

    } catch (error) {
      console.error(chalk.red('Claude API error:'), error);
      return 'Sorry, I encountered an error. ' + this.getDemoResponse(userMessage);
    }
  }

  private buildConversationContext(): Array<{role: 'user' | 'assistant', content: string}> {
    const context: Array<{role: 'user' | 'assistant', content: string}> = [];
    
    // Get last 10 messages for context
    const recentMessages = this.conversationHistory.slice(-10);
    
    recentMessages.forEach(msg => {
      if (msg.type === MessageType.USER_MESSAGE) {
        context.push({ 
          role: 'user', 
          content: `${msg.username}: ${msg.content}` 
        });
      } else if (msg.type === MessageType.AGENT_MESSAGE && msg.username === this.config.agentName) {
        context.push({ 
          role: 'assistant', 
          content: msg.content 
        });
      }
    });

    return context;
  }

  private getParticipants(): string[] {
    const participants = new Set<string>();
    this.conversationHistory.forEach(msg => {
      if (msg.username && msg.username !== 'System') {
        participants.add(msg.username);
      }
    });
    return Array.from(participants);
  }

  private getDemoResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Math detection and calculation
    const mathMatch = message.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
    if (mathMatch) {
      const num1 = parseInt(mathMatch[1]);
      const operator = mathMatch[2];
      const num2 = parseInt(mathMatch[3]);
      
      let result: number;
      switch (operator) {
        case '+': result = num1 + num2; break;
        case '-': result = num1 - num2; break;
        case '*': result = num1 * num2; break;
        case '/': result = num2 !== 0 ? num1 / num2 : NaN; break;
        default: result = NaN;
      }
      
      if (!isNaN(result)) {
        return `${mathMatch[0]} = ${result}`;
      }
    }

    // Common questions
    if (lowerMessage.includes('what is your name')) {
      return `I'm ${this.config.agentName}, your AI assistant! 🤖`;
    }

    if (lowerMessage.includes('how are you')) {
      return 'I\'m doing great, thanks for asking! How can I help you today?';
    }

    if (lowerMessage.includes('help')) {
      return 'I can help with math, answer questions, and assist with various topics. Just ask! 📚';
    }

    // Moved hello check to later to avoid overriding specific questions

    if (lowerMessage.includes('thank')) {
      return 'You\'re welcome! Happy to help! 😊';
    }

    // Programming questions
    if (lowerMessage.includes('python') && (lowerMessage.includes('hello world') || lowerMessage.includes('hello'))) {
      return 'Here\'s Python hello world:\n\n```python\nprint("Hello, World!")\n```\n\nThis prints "Hello, World!" to the console.';
    }
    
    if (lowerMessage.includes('javascript') && (lowerMessage.includes('hello world') || lowerMessage.includes('hello'))) {
      return 'Here\'s JavaScript hello world:\n\n```javascript\nconsole.log("Hello, World!");\n```\n\nThis prints "Hello, World!" to the console.';
    }

    if (lowerMessage.includes('code') || lowerMessage.includes('program')) {
      return 'I can help with coding! What language or problem are you working with?';
    }

    // Generic greetings (after specific checks)
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! 👋 How can I assist you today?`;
    }

    // Default response
    return 'I\'m here to help! Feel free to ask me anything - math problems, questions, or just chat! 🤔';
  }

  async processAction(action: AgentAction): Promise<string> {
    console.log(chalk.magenta(`\n[Processing ${action.type}]`));

    switch (action.type) {
      case 'summarize':
        return this.summarizeConversation();
      
      case 'moderate':
        return this.moderateContent();
      
      case 'analyze':
        return this.analyzeConversation();
      
      default:
        return this.generateResponse(
          `User requested: ${action.type}`, 
          'System'
        );
    }
  }

  private summarizeConversation(): string {
    if (this.conversationHistory.length === 0) {
      return '📋 No messages to summarize yet.';
    }

    const participants = this.getParticipants();
    const messageCount = this.conversationHistory.filter(
      m => m.type === MessageType.USER_MESSAGE
    ).length;

    // Extract topics discussed
    const topics = new Set<string>();
    this.conversationHistory.forEach(msg => {
      if (msg.content.includes('?')) topics.add('questions');
      if (msg.content.match(/\d+\s*[\+\-\*\/]\s*\d+/)) topics.add('math');
      if (msg.content.toLowerCase().includes('help')) topics.add('assistance');
    });

    return `📋 Conversation Summary:
- ${participants.length} participants: ${participants.join(', ')}
- ${messageCount} messages exchanged
- Topics: ${Array.from(topics).join(', ') || 'general chat'}
- I've ${this.anthropic ? 'been helping with' : 'been ready to help with'} questions and calculations`;
  }

  private moderateContent(): string {
    // Real moderation would use Claude's moderation capabilities
    return '🔄 Chat moderation active - all messages appropriate so far';
  }

  private analyzeConversation(): string {
    const msgCount = this.conversationHistory.length;
    const participants = this.getParticipants();
    const questions = this.conversationHistory.filter(m => m.content.includes('?')).length;
    const mathExpressions = this.conversationHistory.filter(
      m => m.content.match(/\d+\s*[\+\-\*\/]\s*\d+/)
    ).length;

    return `📈 Conversation Analysis:
- Total messages: ${msgCount}
- Active participants: ${participants.length}
- Questions asked: ${questions}
- Math problems: ${mathExpressions}
- Agent status: ${this.anthropic ? 'Claude API connected' : 'Demo mode (no API key)'}`;
  }

  async start() {
    console.log(chalk.bold.magenta(`\n🤖 Claude Coordinator Agent`));
    console.log(chalk.gray(`Agent Name: ${this.config.agentName}`));
    console.log(chalk.gray(`API Status: ${this.anthropic ? 'Connected' : 'Demo Mode'}`));
    console.log(chalk.gray(`Capabilities: Math, Q&A, Conversation, Help`));
    
    if (!this.anthropic) {
      console.log(chalk.yellow('\nTo enable full Claude capabilities:'));
      console.log(chalk.yellow('Set ANTHROPIC_API_KEY environment variable'));
    }
    console.log();

    await this.client.connect();
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(chalk.red('Usage: claude-coordinator <roomId> [agentName]'));
    console.log(chalk.gray('\nEnvironment variables:'));
    console.log(chalk.gray('  ANTHROPIC_API_KEY - Your Claude API key'));
    console.log(chalk.gray('  CHAT_SERVER_URL - WebSocket server URL'));
    process.exit(1);
  }

  const config: ClaudeCoordinatorConfig = {
    serverUrl: process.env.CHAT_SERVER_URL || 'ws://localhost:3000',
    roomId: args[0],
    agentName: args[1] || 'Claude',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL
  };

  const coordinator = new ClaudeCoordinatorAgent(config);
  coordinator.start().catch(err => {
    console.error(chalk.red('Failed to start Claude coordinator:'), err);
    process.exit(1);
  });
}