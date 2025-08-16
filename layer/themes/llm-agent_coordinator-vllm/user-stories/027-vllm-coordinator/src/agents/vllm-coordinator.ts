/**
 * vLLM Coordinator Agent
 * Integrates vLLM models (including DeepSeek R1) as chat coordinators
 */

import { BaseCoordinatorAgent, CoordinatorCapabilities, CoordinatorConfig, Message } from './coordinator-interface';
import { VLLMClient, VLLMChatRequest } from '../services/vllm-client';
import { VLLMInstaller } from '../services/vllm-installer';
import { 
  getDeepSeekConfig, 
  resolveModelName, 
  createVLLMParameters,
  DeepSeekR1Config 
} from '../config/deepseek-r1';
import chalk from 'chalk';

export interface VLLMCoordinatorConfig extends CoordinatorConfig {
  /** vLLM-specific configuration */
  vllmConfig: {
    /** Model name (e.g., 'deepseek-r1:32b') */
    model: string;
    /** vLLM server URL */
    serverUrl?: string;
    /** API key for authentication */
    apiKey?: string;
    /** Enable auto-installation if server not found */
    autoInstall?: boolean;
    /** Generation parameters */
    parameters?: Partial<DeepSeekR1Config>;
    /** Enable response streaming */
    streaming?: boolean;
    /** Context window size */
    contextSize?: number;
    /** System prompt override */
    systemPrompt?: string;
    /** Server port for auto-installation */
    serverPort?: number;
  };
}

export class VLLMCoordinatorAgent extends BaseCoordinatorAgent {
  protected declare config: VLLMCoordinatorConfig;
  private vllmClient: VLLMClient;
  private vllmInstaller: VLLMInstaller;
  private modelConfig: DeepSeekR1Config;
  private actualModelName: string;
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
  
  constructor(config: VLLMCoordinatorConfig) {
    super(config);
    
    // Resolve model name and get configuration
    this.actualModelName = resolveModelName(config.vllmConfig.model);
    this.modelConfig = {
      ...getDeepSeekConfig(config.vllmConfig.model),
      ...(config.vllmConfig.parameters || {}),
      systemPrompt: config.vllmConfig.systemPrompt || getDeepSeekConfig(config.vllmConfig.model).systemPrompt,
    };
    
    // Initialize vLLM client
    this.vllmClient = new VLLMClient({
      baseUrl: config.vllmConfig.serverUrl || 'http://localhost:8000',
      apiKey: config.vllmConfig.apiKey,
      timeout: 60000, // 60 seconds for longer responses
    });
    
    // Initialize installer
    this.vllmInstaller = new VLLMInstaller();
  }
  
  protected async onStart(): Promise<void> {
    console.log(chalk.blue(`🚀 Initializing vLLM with model: ${this.config.vllmConfig.model}`));
    
    try {
      // Check if vLLM server is running
      let isRunning = await this.vllmClient.checkHealth();
      
      if (!isRunning && this.config.vllmConfig.autoInstall) {
        console.log(chalk.yellow('⚠️  vLLM server not detected. Attempting auto-installation...'));
        
        // Check if vLLM is installed
        const isInstalled = await this.vllmInstaller.isInstalled();
        if (!isInstalled) {
          console.log(chalk.yellow('Installing vLLM...'));
          const installed = await this.vllmInstaller.autoInstall();
          if (!installed) {
            throw new Error('Failed to install vLLM. Please install manually.');
          }
        }
        
        // Start vLLM server
        const serverPort = this.config.vllmConfig.serverPort || 8000;
        const started = await this.vllmInstaller.startServer(this.actualModelName, serverPort);
        if (!started) {
          throw new Error('Failed to start vLLM server.');
        }
        
        // Update client with correct port
        this.vllmClient = new VLLMClient({
          baseUrl: `http://localhost:${serverPort}`,
          apiKey: this.config.vllmConfig.apiKey,
        });
        
        isRunning = await this.vllmClient.checkHealth();
      }
      
      if (!isRunning) {
        throw new Error('vLLM server is not running. Please start it manually or enable auto-installation.');
      }
      
      // Check GPU availability
      const gpuInfo = await this.vllmInstaller.checkGPU();
      if (gpuInfo.available) {
        console.log(chalk.green(`🎮 GPU detected: ${gpuInfo.name || gpuInfo.type} ${gpuInfo.memory ? `(${gpuInfo.memory}MB)` : ''}`));
      } else {
        console.log(chalk.yellow('⚠️  No GPU detected. Running on CPU (slower performance)'));
      }
      
      // Check if model is available
      const models = await this.vllmClient.listModels();
      this.isModelAvailable = models.some(m => m.id === this.actualModelName);
      
      if (!this.isModelAvailable) {
        if (this.config.vllmConfig.autoInstall) {
          console.log(chalk.yellow(`⚠️  Model ${this.actualModelName} not found. Downloading...`));
          await this.vllmInstaller.downloadModel(this.actualModelName);
          
          // Restart server with new model
          this.vllmInstaller.stopServer();
          const serverPort = this.config.vllmConfig.serverPort || 8000;
          await this.vllmInstaller.startServer(this.actualModelName, serverPort);
          
          this.isModelAvailable = true;
        } else {
          throw new Error(`Model ${this.actualModelName} not found on server.`);
        }
      } else {
        console.log(chalk.green(`✅ Model ${this.actualModelName} is available`));
      }
      
      // Verify model works with a test prompt
      await this.verifyModel();
      
      console.log(chalk.green(`✅ vLLM coordinator ready with ${this.config.vllmConfig.model}`));
    } catch (error) {
      console.error(chalk.red('Failed to initialize vLLM:'), error);
      throw error;
    }
  }
  
  protected async onStop(): Promise<void> {
    // Stop vLLM server if we started it
    if (this.config.vllmConfig.autoInstall) {
      this.vllmInstaller.stopServer();
    }
  }
  
  protected async generateResponse(message: Message, context: Message[]): Promise<string> {
    try {
      // Check for special commands
      if (message.content.startsWith('/')) {
        return await this.handleCommand(message.content);
      }
      
      // Prepare messages for vLLM
      const messages = this.prepareMessages(context, message);
      
      // Create request with DeepSeek R1 parameters
      const request: VLLMChatRequest = {
        model: this.actualModelName,
        messages,
        ...createVLLMParameters(this.modelConfig),
        stream: this.config.vllmConfig.streaming ?? true,
      };
      
      // Generate response
      if (request.stream) {
        return await this.generateStreamingResponse(request);
      } else {
        return await this.generateStandardResponse(request);
      }
    } catch (error: any) {
      console.error(chalk.red('vLLM generation error:'), error);
      
      // Provide helpful error messages
      if (error.message?.includes('connection refused')) {
        return 'vLLM server is not running. Please start vLLM or enable auto-installation.';
      } else if (error.message?.includes('401')) {
        return 'Invalid API key. Please check your vLLM API key configuration.';
      } else if (error.message?.includes('model not found')) {
        return `Model ${this.actualModelName} not found. Please check model availability.`;
      } else {
        return `Sorry, I encountered an error: ${error.message}`;
      }
    }
  }
  
  private async generateStandardResponse(request: VLLMChatRequest): Promise<string> {
    const response = await this.vllmClient.chat(request);
    return response.choices[0].message.content;
  }
  
  private async generateStreamingResponse(request: VLLMChatRequest): Promise<string> {
    let fullResponse = '';
    
    for await (const chunk of this.vllmClient.chatStream(request)) {
      const choice = chunk.choices?.[0] as any;
      if (choice?.message?.content) {
        fullResponse += choice.message.content;
      } else if (choice?.delta?.content) {
        fullResponse += choice.delta.content;
      }
    }
    
    return fullResponse;
  }
  
  private prepareMessages(context: Message[], currentMessage: Message): any[] {
    const messages: any[] = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: this.modelConfig.systemPrompt,
    });
    
    // Add context messages
    const contextSize = this.config.vllmConfig.contextSize || 10;
    const contextMessages = context.slice(-contextSize);
    
    for (const msg of contextMessages) {
      messages.push({
        role: msg.username === this.config.agentName ? 'assistant' : 'user',
        content: `${msg.username}: ${msg.content}`,
      });
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage.content,
    });
    
    return messages;
  }
  
  private async verifyModel(): Promise<void> {
    try {
      const request: VLLMChatRequest = {
        model: this.actualModelName,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello" in one word.' }
        ],
        max_tokens: 10,
        temperature: 0.1,
      };
      
      await this.vllmClient.chat(request);
    } catch (error) {
      console.error(chalk.red('Model verification failed:'), error);
      throw error;
    }
  }
  
  private async handleCommand(command: string): Promise<string> {
    const [cmd] = command.slice(1).split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'model':
        return `Currently using model: ${this.config.vllmConfig.model} (${this.actualModelName})`;
        
      case 'models':
        const models = await this.vllmClient.listModels();
        if (models.length === 0) {
          return 'No models available on the server.';
        }
        return `Available models:\n${models.map(m => `- ${m.id} (${m.owned_by})`).join('\n')}`;
        
      case 'info':
        return this.getModelInfo();
        
      case 'metrics':
        const metrics = await this.vllmClient.getMetrics();
        if (metrics) {
          return `**Server Metrics:**\n\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\``;
        }
        return 'Metrics not available.';
        
      case 'help':
        return this.getHelpMessage();
        
      case 'summarize':
        return await this.summarizeConversation();
        
      default:
        return `Unknown command: /${cmd}. Type /help for available commands.`;
    }
  }
  
  private getModelInfo(): string {
    return `
**vLLM Coordinator Info**
- Model: ${this.config.vllmConfig.model} (${this.actualModelName})
- Server: ${this.config.vllmConfig.serverUrl || 'http://localhost:8000'}
- Streaming: ${this.config.vllmConfig.streaming ? 'enabled' : 'disabled'}
- Temperature: ${this.modelConfig.temperature}
- Max Tokens: ${this.modelConfig.maxTokens}
- Context Size: ${this.config.vllmConfig.contextSize || 10} messages
- Context Window: ${this.modelConfig.contextLength} tokens
    `.trim();
  }
  
  protected getHelpMessage(): string {
    return `
**${this.config.agentName} - vLLM Coordinator**

I'm powered by ${this.config.vllmConfig.model} via vLLM. Here's what I can do:

**Chat Features:**
- Answer questions and have conversations
- Explain code and programming concepts
- Help with math and calculations
- Translate text between languages
- Analyze and reason through problems
- Summarize our conversation

**Commands:**
- /help - Show this help message
- /model - Show current model
- /models - List available models
- /info - Show configuration info
- /metrics - Show server metrics
- /summarize - Summarize our conversation

**Tips:**
- Mention me by name or use @ to get my attention
- I'll respond to questions automatically
- For code help, just paste your code and ask!
- I use DeepSeek R1's advanced reasoning capabilities
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
    
    const summaryRequest: VLLMChatRequest = {
      model: this.actualModelName,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries.',
        },
        {
          role: 'user',
          content: `Please provide a concise summary of the following conversation:\n\n${conversationText}\n\nSummary:`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    };
    
    try {
      const response = await this.vllmClient.chat(summaryRequest);
      return `**Conversation Summary:**\n${response.choices[0].message.content}`;
    } catch (error) {
      return super.summarizeConversation();
    }
  }
}

// Factory function for creating vLLM coordinators
export function createVLLMCoordinator(
  serverUrl: string,
  roomId: string,
  agentName: string,
  model: string = 'deepseek-r1:32b',
  additionalConfig?: Partial<VLLMCoordinatorConfig>
): VLLMCoordinatorAgent {
  const config: VLLMCoordinatorConfig = {
    serverUrl,
    roomId,
    agentName,
    vllmConfig: {
      model,
      serverUrl: process.env.VLLM_SERVER_URL || 'http://localhost:8000',
      apiKey: process.env.VLLM_API_KEY,
      autoInstall: true,
      streaming: true,
      contextSize: 20,
      serverPort: 8000,
      ...additionalConfig?.vllmConfig,
    },
    ...additionalConfig,
  };
  
  return new VLLMCoordinatorAgent(config);
}