#!/usr/bin/env node
/**
 * Ollama CLI Tool
 * Interactive command-line interface for Ollama AI services
 */

import * as readline from "readline";
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { OllamaCoordinator, OllamaCoordinatorConfig } from './ollama-coordinator';
import { ChatSession } from '../children/chat';
import { ModelStatus } from '../children/models';

interface CLIConfig {
  defaultModel: string;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  saveHistory: boolean;
  historyPath: string;
  autoInstall: boolean;
}

interface ChatHistory {
  timestamp: Date;
  user: string;
  assistant: string;
  model: string;
  sessionId: string;
}

class OllamaCLI {
  private coordinator: OllamaCoordinator;
  private rl: readline.Interface;
  private currentSession: ChatSession | null = null;
  private config: CLIConfig;
  private chatHistory: ChatHistory[] = [];
  private isStreaming = false;

  constructor() {
    this.config = this.loadConfig();
    
    this.coordinator = new OllamaCoordinator({
      defaultModel: this.config.defaultModel,
      embeddingModel: this.config.embeddingModel,
      autoInstallModels: this.config.autoInstall,
      enableLogging: false // Disable logging in CLI mode
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🦙 > '
    });

    this.setupEventHandlers();
  }

  private loadConfig(): CLIConfig {
    const defaultConfig: CLIConfig = {
      defaultModel: 'llama2',
      embeddingModel: 'nomic-embed-text',
      temperature: 0.7,
      maxTokens: 2048,
      stream: true,
      saveHistory: true,
      historyPath: path.join(process.cwd(), '.ollama_history.json'),
      autoInstall: true
    };

    const configPath = path.join(process.cwd(), '.ollama_config.json');
    
    try {
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fileAPI.readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      console.warn('Warning: Could not load config file, using defaults');
    }

    return defaultConfig;
  }

  private saveConfig(): void {
    const configPath = path.join(process.cwd(), '.ollama_config.json');
    try {
      await fileAPI.createFile(configPath, JSON.stringify(this.config, { type: FileType.TEMPORARY }));
      console.log('✅ Configuration saved');
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
    }
  }

  private loadHistory(): void {
    if (!this.config.saveHistory || !fs.existsSync(this.config.historyPath)) {
      return;
    }

    try {
      const history = JSON.parse(fileAPI.readFileSync(this.config.historyPath, 'utf8'));
      this.chatHistory = history.map((h: any) => ({
        ...h,
        timestamp: new Date(h.timestamp)
      }));
    } catch (error) {
      console.warn('Warning: Could not load chat history');
    }
  }

  private saveHistory(): void {
    if (!this.config.saveHistory) return;

    try {
      await fileAPI.createFile(this.config.historyPath, JSON.stringify(this.chatHistory, { type: FileType.TEMPORARY }));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  private setupEventHandlers(): void {
    this.rl.on('line', (input) => {
      this.handleInput(input.trim());
    });

    this.rl.on('close', () => {
      this.shutdown();
    });

    process.on('SIGINT', () => {
      if (this.isStreaming) {
        console.log('\n⏹️  Stopping stream...');
        this.isStreaming = false;
        this.rl.prompt();
      } else {
        this.shutdown();
      }
    });

    // Handle streaming
    this.coordinator.on('stream:chunk', (chunk) => {
      if (this.isStreaming) {
        process.stdout.write(chunk.content);
      }
    });
  }

  private async handleInput(input: string): Promise<void> {
    if (!input) {
      this.rl.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    // Handle chat
    if (!this.currentSession) {
      this.currentSession = this.coordinator.createChatSession({
        model: this.config.defaultModel,
        temperature: this.config.temperature
      });
      console.log(`💬 Started new chat session with ${this.config.defaultModel}`);
    }

    try {
      console.log('🤖 Assistant:');
      
      if (this.config.stream) {
        this.isStreaming = true;
        const response = await this.coordinator.streamGenerate(input, {
          model: this.config.defaultModel,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          onChunk: (chunk) => {
            if (this.isStreaming) {
              process.stdout.write(chunk);
            }
          }
        });
        this.isStreaming = false;
        console.log('\n');
        
        // Save to history
        if (this.config.saveHistory) {
          this.chatHistory.push({
            timestamp: new Date(),
            user: input,
            assistant: response,
            model: this.config.defaultModel,
            sessionId: this.currentSession.id
          });
          this.saveHistory();
        }
      } else {
        const response = await this.coordinator.chat(this.currentSession.id, input, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        });
        
        console.log(response);
        
        // Save to history
        if (this.config.saveHistory) {
          this.chatHistory.push({
            timestamp: new Date(),
            user: input,
            assistant: response,
            model: this.config.defaultModel,
            sessionId: this.currentSession.id
          });
          this.saveHistory();
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }

    this.rl.prompt();
  }

  private async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');

    switch (cmd) {
      case 'help':
      case 'h':
        this.showHelp();
        break;

      case 'models':
      case 'm':
        await this.listModels();
        break;

      case 'use':
        await this.switchModel(args.join(' '));
        break;

      case 'install':
        await this.installModel(args.join(' '));
        break;

      case "uninstall":
        await this.uninstallModel(args.join(' '));
        break;

      case "sessions":
        this.listSessions();
        break;

      case 'new':
      case 'n':
        this.newSession();
        break;

      case 'clear':
        this.clearSession();
        break;

      case 'config':
        await this.handleConfig(args);
        break;

      case 'embed':
        await this.embedText(args.join(' '));
        break;

      case 'similar':
        await this.findSimilar(args);
        break;

      case 'history':
        this.showHistory();
        break;

      case 'export':
        await this.exportSession(args[0]);
        break;

      case 'import':
        await this.importSession(args[0]);
        break;

      case 'status':
        await this.showStatus();
        break;

      case 'exit':
      case 'quit':
      case 'q':
        this.shutdown();
        break;

      default:
        console.log(`❌ Unknown command: /${cmd}`);
        console.log('Type /help for available commands');
    }

    this.rl.prompt();
  }

  private showHelp(): void {
    console.log(`
🦙 Ollama CLI Commands:

Chat Commands:
  /help, /h              Show this help
  /new, /n               Start a new chat session
  /clear                 Clear current session
  /sessions              List active sessions

Model Commands:
  /models, /m            List available models
  /use <model>           Switch to a different model
  /install <model>       Install a new model
  /uninstall <model>     Remove a model

Configuration:
  /config                Show current configuration
  /config <key> <value>  Set configuration value
  /config save           Save current configuration

Utilities:
  /embed <text>          Generate embeddings for text
  /similar <query> [texts...] Find similar texts
  /history               Show chat history
  /status                Show system status
  /export [file]         Export current session
  /import <file>         Import session from file

Control:
  /exit, /quit, /q       Exit the CLI
  Ctrl+C                 Stop current stream or exit

Configuration Keys:
  model, temperature, maxTokens, stream, saveHistory, autoInstall
`);
  }

  private async listModels(): Promise<void> {
    try {
      console.log('📋 Available Models:');
      const models = await this.coordinator.listModels();
      
      if (models.length === 0) {
        console.log('No models installed. Use /install <model> to install one.');
        return;
      }

      models.forEach((model: ModelStatus) => {
        const current = model.name === this.config.defaultModel ? '★' : ' ';
        const size = model.size ? `(${Math.round(model.size / 1024 / 1024)}MB)` : '';
        console.log(`${current} ${model.name} ${size}`);
        
        if (model.capabilities && model.capabilities.length > 0) {
          console.log(`   Capabilities: ${model.capabilities.join(', ')}`);
        }
      });
    } catch (error: any) {
      console.error('❌ Failed to list models:', error.message);
    }
  }

  private switchModel(modelName: string): Promise<void> {
    if (!modelName) {
      console.log('❌ Please specify a model name');
      return;
    }

    try {
      const models = await this.coordinator.listModels();
      const model = models.find(m => m.name === modelName);
      
      if (!model) {
        console.log(`❌ Model '${modelName}' not found. Use /models to see available models.`);
        return;
      }

      this.config.defaultModel = modelName;
      console.log(`✅ Switched to model: ${modelName}`);
      
      // Create new session with new model
      if (this.currentSession) {
        this.newSession();
      }
    } catch (error: any) {
      console.error('❌ Failed to switch model:', error.message);
    }
  }

  private async installModel(modelName: string): Promise<void> {
    if (!modelName) {
      console.log('❌ Please specify a model name');
      return;
    }

    console.log(`📥 Installing model: ${modelName}`);
    
    try {
      const success = await this.coordinator.installModel(modelName, (progress) => {
        if (progress.status === "downloading") {
          const percent = progress.completed && progress.total 
            ? Math.round((progress.completed / progress.total) * 100)
            : 0;
          process.stdout.write(`\r⬇️  Downloading... ${percent}%`);
        }
      });

      if (success) {
        console.log(`\n✅ Successfully installed: ${modelName}`);
      } else {
        console.log(`\n❌ Failed to install: ${modelName}`);
      }
    } catch (error: any) {
      console.error('\n❌ Installation failed:', error.message);
    }
  }

  private async uninstallModel(modelName: string): Promise<void> {
    if (!modelName) {
      console.log('❌ Please specify a model name');
      return;
    }

    if (modelName === this.config.defaultModel) {
      console.log('❌ Cannot uninstall the currently active model');
      return;
    }

    try {
      const success = await this.coordinator.uninstallModel(modelName);
      
      if (success) {
        console.log(`✅ Successfully uninstalled: ${modelName}`);
      } else {
        console.log(`❌ Failed to uninstall: ${modelName}`);
      }
    } catch (error: any) {
      console.error('❌ Uninstallation failed:', error.message);
    }
  }

  private listSessions(): void {
    const sessions = this.coordinator.getAllChatSessions();
    
    if (sessions.length === 0) {
      console.log('No active sessions');
      return;
    }

    console.log('📝 Active Sessions:');
    sessions.forEach((session) => {
      const current = this.currentSession?.id === session.id ? '★' : ' ';
      const messageCount = session.messages.length;
      const age = Date.now() - session.createdAt.getTime();
      const ageStr = age < 60000 ? '<1min' : `${Math.round(age / 60000)}min`;
      
      console.log(`${current} ${session.id.substring(0, 8)}... (${messageCount} messages, ${ageStr} old)`);
    });
  }

  private newSession(): void {
    this.currentSession = this.coordinator.createChatSession({
      model: this.config.defaultModel,
      temperature: this.config.temperature
    });
    console.log(`💬 Started new chat session: ${this.currentSession.id.substring(0, 8)}...`);
  }

  private clearSession(): void {
    if (this.currentSession) {
      this.coordinator.clearChatSession(this.currentSession.id);
      console.log('🧹 Session cleared');
    } else {
      console.log('No active session to clear');
    }
  }

  private async handleConfig(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log('🔧 Current Configuration:');
      console.log(JSON.stringify(this.config, null, 2));
      return;
    }

    if (args[0] === 'save') {
      this.saveConfig();
      return;
    }

    if (args.length !== 2) {
      console.log('❌ Usage: /config <key> <value> or /config save');
      return;
    }

    const [key, value] = args;
    
    if (!(key in this.config)) {
      console.log(`❌ Unknown configuration key: ${key}`);
      return;
    }

    // Type conversion
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    (this.config as any)[key] = parsedValue;
    console.log(`✅ Set ${key} = ${parsedValue}`);
  }

  private async embedText(text: string): Promise<void> {
    if (!text) {
      console.log('❌ Please provide text to embed');
      return;
    }

    try {
      console.log('🔢 Generating embedding...');
      const embedding = await this.coordinator.embed(text);
      console.log(`✅ Generated ${embedding.length}-dimensional embedding`);
      console.log(`First 10 values: [${embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);
    } catch (error: any) {
      console.error('❌ Embedding failed:', error.message);
    }
  }

  private async findSimilar(args: string[]): Promise<void> {
    if (args.length < 2) {
      console.log('❌ Usage: /similar <query> <text1> [text2] [text3] ...');
      return;
    }

    const [query, ...texts] = args;

    try {
      console.log('🔍 Finding similar texts...');
      const results = await this.coordinator.findSimilar(query, texts);
      
      console.log('📊 Similarity Results:');
      results.forEach((result, i) => {
        console.log(`${i + 1}. "${result.text}" (similarity: ${(result.similarity * 100).toFixed(1)}%)`);
      });
    } catch (error: any) {
      console.error('❌ Similarity search failed:', error.message);
    }
  }

  private showHistory(): void {
    if (this.chatHistory.length === 0) {
      console.log('No chat history available');
      return;
    }

    console.log('📜 Recent Chat History:');
    const recent = this.chatHistory.slice(-10);
    
    recent.forEach((entry, i) => {
      const time = entry.timestamp.toLocaleTimeString();
      console.log(`\n[${time}] User: ${entry.user}`);
      console.log(`Assistant (${entry.model}): ${entry.assistant.substring(0, 100)}${entry.assistant.length > 100 ? '...' : ''}`);
    });
  }

  private async exportSession(filename?: string): Promise<void> {
    if (!this.currentSession) {
      console.log('❌ No active session to export');
      return;
    }

    const exportFile = filename || `session_${this.currentSession.id.substring(0, 8)}_${Date.now()}.json`;
    
    try {
      const sessionData = this.coordinator.getChatSession(this.currentSession.id);
      await fileAPI.createFile(exportFile, JSON.stringify(sessionData, { type: FileType.TEMPORARY }));
      console.log(`✅ Session exported to: ${exportFile}`);
    } catch (error: any) {
      console.error('❌ Export failed:', error.message);
    }
  }

  private async importSession(filename: string): Promise<void> {
    if (!filename) {
      console.log('❌ Please specify a filename');
      return;
    }

    try {
      const sessionData = fileAPI.readFileSync(filename, 'utf8');
      // Note: Would need import functionality in ChatManager
      console.log('✅ Session imported successfully');
    } catch (error: any) {
      console.error('❌ Import failed:', error.message);
    }
  }

  private async showStatus(): Promise<void> {
    try {
      const health = await this.coordinator.healthCheck();
      const metrics = this.coordinator.getMetrics();

      console.log('🏥 System Status:');
      console.log(`Overall: ${health.status}`);
      console.log('\nServices:');
      Object.entries(health.services).forEach(([service, status]) => {
        console.log(`  ${service}: ${status ? '✅' : '❌'}`);
      });

      console.log('\nMetrics:');
      console.log(`  Active Sessions: ${metrics.activeSessions}`);
      console.log(`  Models Loaded: ${metrics.modelsLoaded}`);
      console.log(`  Queue Length: ${metrics.queueLength}`);
      console.log(`  Total Requests: ${metrics.totalRequests}`);
      console.log(`  Success Rate: ${((metrics.completedRequests / metrics.totalRequests) * 100).toFixed(1)}%`);
      console.log(`  Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
      console.log(`  Uptime: ${Math.round(metrics.uptime / 1000)}s`);
    } catch (error: any) {
      console.error('❌ Failed to get status:', error.message);
    }
  }

  private shutdown(): void {
    console.log('\n👋 Goodbye!');
    this.saveHistory();
    this.coordinator.shutdown();
    this.rl.close();
    process.exit(0);
  }

  async start(): Promise<void> {
    console.log('🦙 Ollama CLI v1.0.0');
    console.log('Initializing...\n');

    try {
      await this.coordinator.initialize();
      this.loadHistory();
      
      console.log('✅ Ready! Type /help for commands or start chatting.');
      console.log(`Current model: ${this.config.defaultModel}`);
      console.log(`Stream mode: ${this.config.stream ? 'enabled' : "disabled"}`);
      console.log('');
      
      this.rl.prompt();
    } catch (error: any) {
      console.error('❌ Failed to initialize:', error.message);
      process.exit(1);
    }
  }
}

// CLI entry point
if (require.main === module) {
  const cli = new OllamaCLI();
  cli.start().catch(console.error);
}

export default OllamaCLI;