/**
 * Ollama Coordinator Agent
 * Integrates Ollama models (including DeepSeek R1) as chat coordinators
 */

import { BaseCoordinatorAgent, CoordinatorCapabilities, CoordinatorConfig, Message } from './coordinator-interface';
import { OllamaClient, OllamaModel, OllamaGenerateRequest, OllamaChatRequest } from '../services/ollama-client';
import chalk from 'chalk';

export interface OllamaCoordinatorConfig extends CoordinatorConfig {
  /** Ollama-specific configuration */
  ollamaConfig: {
    /** Model name (e.g., 'deepseek-r1:latest') */
    model: string;
    /** Ollama server URL */
    serverUrl?: string;
    /** Generation parameters */
    parameters?: {
      temperature?: number;
      top_p?: number;
      top_k?: number;
      num_predict?: number;
      stop?: string[];
      seed?: number;
    };
    /** Enable response streaming */
    streaming?: boolean;
    /** Context window size */
    contextSize?: number;
    /** System prompt */
    systemPrompt?: string;
  };
}

export class OllamaCoordinatorAgent extends BaseCoordinatorAgent {
  private ollamaClient: OllamaClient;
  private model: string;
  private systemPrompt: string;
  private isModelAvailable: boolean = false;
  
  readonly capabilities: CoordinatorCapabilities = {
    chat: true,
    math: true,
    code: true,
    summarize: true,
    moderate: false,
    analyze: true,
    translate: true,
    help: true,
    streaming: true
  };
  
  constructor(config: OllamaCoordinatorConfig) {
    super(config);
    
    this.model = config.ollamaConfig.model;
    this.systemPrompt = config.ollamaConfig.systemPrompt || this.getDefaultSystemPrompt();
    
    // Initialize Ollama client
    this.ollamaClient = new OllamaClient({
      baseUrl: config.ollamaConfig.serverUrl || 'http://localhost:11434',
      timeout: 30000
    });
  }
  
  protected async onStart(): Promise<void> {
    console.log(chalk.blue(`🦙 Initializing Ollama with model: ${this.model}`));
    
    try {
      // Check if Ollama server is running
      let isRunning = await this.ollamaClient.checkHealth();
      if (!isRunning) {
        console.log(chalk.yellow('⚠️  Ollama server not detected. Attempting auto-installation...'));
        
        // Try to auto-install Ollama
        const installed = await this.ollamaClient.autoInstall();
        if (!installed) {
          throw new Error('Failed to install Ollama. Please install manually from https://ollama.com');
        }
        
        // Check again after installation
        isRunning = await this.ollamaClient.checkHealth();
        if (!isRunning) {
          throw new Error('Ollama server is not running after installation. Please start it manually.');
        }
      }
      
      // Check GPU availability
      const gpuInfo = await this.ollamaClient.checkGPU();
      if (gpuInfo.available) {
        console.log(chalk.green(`🔄 GPU detected: ${gpuInfo.name || gpuInfo.type} ${gpuInfo.memory ? `(${gpuInfo.memory}MB)` : ''}`));
      } else {
        console.log(chalk.yellow('⚠️  No GPU detected. Running on CPU (slower performance)'));
      }
      
      // Check if model is available
      const models = await this.ollamaClient.listModels();
      this.isModelAvailable = models.some(m => m.name === this.model);
      
      if (!this.isModelAvailable) {
        console.log(chalk.yellow(`⚠️  Model ${this.model} not found. Auto-downloading...`));
        await this.ollamaClient.ensureModel(this.model);
        this.isModelAvailable = true;
      } else {
        console.log(chalk.green(`🔄 Model ${this.model} is available`));
      }
      
      // Verify model works with a test prompt
      await this.verifyModel();
      
      console.log(chalk.green(`🔄 Ollama coordinator ready with ${this.model}`));
    } catch (error) {
      console.error(chalk.red('Failed to initialize Ollama:'), error);
      throw error;
    }
  }
  
  protected async generateResponse(message: Message, context: Message[]): Promise<string> {
    try {
      // Check for special commands
      if (message.content.startsWith('/')) {
        return await this.handleCommand(message.content);
      }
      
      // Prepare context for Ollama
      const messages = this.prepareMessages(context, message);
      
      // Generate response
      if ((this.config as OllamaCoordinatorConfig).ollamaConfig.streaming) {
        return await this.generateStreamingResponse(messages);
      } else {
        return await this.generateStandardResponse(messages);
      }
    } catch (error: any) {
      console.error(chalk.red('Ollama generation error:'), error);
      
      // Provide helpful error messages
      if (error.message?.includes('connection refused')) {
        return 'Ollama server is not running. Please start Ollama with: `ollama serve`';
      } else if (error.message?.includes('model not found')) {
        return `Model ${this.model} not found. Trying to pull it now...`;
      } else {
        return `Sorry, I encountered an error: ${error.message}`;
      }
    }
  }
  
  private async generateStandardResponse(messages: any[]): Promise<string> {
    const request: OllamaChatRequest = {
      model: this.model,
      messages,
      options: (this.config as OllamaCoordinatorConfig).ollamaConfig.parameters
    };
    
    const response = await this.ollamaClient.chat(request);
    return response.message.content;
  }
  
  private async generateStreamingResponse(messages: any[]): Promise<string> {
    const request: OllamaChatRequest = {
      model: this.model,
      messages,
      stream: true,
      options: (this.config as OllamaCoordinatorConfig).ollamaConfig.parameters
    };
    
    let fullResponse = '';
    const stream = await this.ollamaClient.chatStream(request);
    
    for await (const chunk of stream) {
      if (chunk.message?.content) {
        fullResponse += chunk.message.content;
      }
    }
    
    return fullResponse;
  }
  
  private prepareMessages(context: Message[], currentMessage: Message): any[] {
    const messages: any[] = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: this.systemPrompt
    });
    
    // Add context messages
    const contextMessages = context.slice(-(this.config as OllamaCoordinatorConfig).ollamaConfig.contextSize || 10);
    
    for (const msg of contextMessages) {
      messages.push({
        role: msg.username === this.config.agentName ? 'assistant' : 'user',
        content: `${msg.username}: ${msg.content}`
      });
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage.content
    });
    
    return messages;
  }
  
  
  private async verifyModel(): Promise<void> {
    try {
      const testRequest: OllamaGenerateRequest = {
        model: this.model,
        prompt: 'Hello',
        options: {
          num_predict: 10
        }
      };
      
      await this.ollamaClient.generate(testRequest);
    } catch (error) {
      console.error(chalk.red('Model verification failed:'), error);
      throw error;
    }
  }
  
  private async handleCommand(command: string): Promise<string> {
    const [cmd, ...args] = command.slice(1).split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'model':
        return `Currently using model: ${this.model}`;
        
      case 'models':
        const models = await this.ollamaClient.listModels();
        return `Available models:\n${models.map(m => `- ${m.name} (${this.formatSize(m.size)})`).join('\n')}`;
        
      case 'info':
        return this.getModelInfo();
        
      case 'help':
        return this.getHelpMessage();
        
      case 'summarize':
        return await this.summarizeConversation();
        
      default:
        return `Unknown command: /${cmd}. Type /help for available commands.`;
    }
  }
  
  private getModelInfo(): string {
    const config = (this.config as OllamaCoordinatorConfig).ollamaConfig;
    return `
**Ollama Coordinator Info**
- Model: ${this.model}
- Server: ${config.serverUrl || 'http://localhost:11434'}
- Streaming: ${config.streaming ? 'enabled' : 'disabled'}
- Temperature: ${config.parameters?.temperature || 0.7}
- Context Size: ${config.contextSize || 10} messages
    `.trim();
  }
  
  protected getHelpMessage(): string {
    return `
**${this.config.agentName} - Ollama Coordinator**

I'm powered by ${this.model} via Ollama. Here's what I can do:

**Chat Features:**
- Answer questions and have conversations
- Explain code and programming concepts
- Help with math and calculations
- Translate text between languages
- Summarize our conversation

**Commands:**
- /help - Show this help message
- /model - Show current model
- /models - List available models
- /info - Show configuration info
- /summarize - Summarize our conversation

**Tips:**
- Mention me by name or use @ to get my attention
- I'll respond to questions automatically
- For code help, just paste your code and ask!
    `.trim();
  }
  
  protected async summarizeConversation(): Promise<string> {
    const messages = this.getContext();
    if (messages.length === 0) {
      return 'No conversation to summarize yet.';
    }
    
    // Prepare conversation text
    const conversationText = messages
      .map(m => `${m.username}: ${m.content}`)
      .join('\n');
    
    const summaryPrompt = `Please provide a concise summary of the following conversation:\n\n${conversationText}\n\nSummary:`;
    
    try {
      const request: OllamaGenerateRequest = {
        model: this.model,
        prompt: summaryPrompt,
        options: {
          temperature: 0.3,
          num_predict: 200
        }
      };
      
      const response = await this.ollamaClient.generate(request);
      return `**Conversation Summary:**\n${response.response}`;
    } catch (error) {
      return super.summarizeConversation();
    }
  }
  
  private getDefaultSystemPrompt(): string {
    return `You are ${this.config.agentName}, a helpful AI assistant in a chat room. You should:
- Be friendly, helpful, and conversational
- Answer questions accurately and concisely
- Help with programming, math, and general knowledge
- Engage naturally in group conversations
- Use markdown for code blocks and formatting
- Keep responses focused and not too long
- If you're not sure about something, say so`;
  }
  
  private formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Factory function for creating Ollama coordinators
export function createOllamaCoordinator(
  serverUrl: string,
  roomId: string,
  agentName: string,
  model: string = 'deepseek-r1:32b',
  additionalConfig?: Partial<OllamaCoordinatorConfig>
): OllamaCoordinatorAgent {
  const config: OllamaCoordinatorConfig = {
    serverUrl,
    roomId,
    agentName,
    ollamaConfig: {
      model,
      serverUrl: 'http://localhost:11434',
      streaming: true,
      contextSize: 20,
      parameters: {
        temperature: 0.7,
        top_p: 0.95,
        num_predict: 2048
      },
      ...additionalConfig?.ollamaConfig
    },
    ...additionalConfig
  };
  
  return new OllamaCoordinatorAgent(config);
}