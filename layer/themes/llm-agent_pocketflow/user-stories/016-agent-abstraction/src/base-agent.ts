/**
 * Base implementation of Agent interface
 * Provides common functionality for all agents
 */

import {
  Agent,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentCapabilities,
  Tool,
  Memory,
  Message,
  ToolCall
} from './types';

export abstract class BaseAgent implements Agent {
  id: string;
  name: string;
  description: string;
  tools: Tool[] = [];
  memory?: Memory;
  
  protected config: AgentConfig = {};
  protected initialized = false;

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  async initialize(config: AgentConfig): Promise<void> {
    this.config = { ...config };
    
    if (config.tools) {
      this.tools = config.tools;
    }
    
    if (config.memory) {
      this.memory = config.memory;
    }
    
    await this.onInitialize(config);
    this.initialized = true;
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    if (!this.initialized) {
      throw new Error(`Agent ${this.id} not initialized`);
    }

    // Add system prompt if configured
    const messages = this.prepareMessages(input.messages);
    
    // Process with retries
    const retryAttempts = this.config.retryAttempts || 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const output = await this.onProcess({
          ...input,
          messages
        });
        
        // Handle tool calls if any
        if (output.toolCalls && output.toolCalls.length > 0 && this.tools.length > 0) {
          const toolResults = await this.executeTool(output.toolCalls);
          
          // Add tool results to messages and re-process
          const updatedMessages = [
            ...messages,
            output.message,
            ...toolResults
          ];
          
          return this.process({
            ...input,
            messages: updatedMessages
          });
        }
        
        return output;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryAttempts - 1) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Process failed');
  }

  async terminate(): Promise<void> {
    await this.onTerminate();
    this.initialized = false;
  }

  getCapabilities(): AgentCapabilities {
    return {
      streaming: this.config.streaming || false,
      tools: this.tools.length > 0,
      memory: !!this.memory,
      maxContextLength: this.getMaxContextLength(),
      supportedModels: this.getSupportedModels()
    };
  }

  // Methods to be In Progress by subclasses
  protected abstract onInitialize(config: AgentConfig): Promise<void>;
  protected abstract onProcess(input: AgentInput): Promise<AgentOutput>;
  protected abstract onTerminate(): Promise<void>;
  protected abstract getMaxContextLength(): number;
  protected abstract getSupportedModels(): string[] | undefined;

  // Helper methods
  protected prepareMessages(messages: Message[]): Message[] {
    const prepared: Message[] = [];
    
    // Add system prompt if configured
    if (this.config.systemPrompt) {
      prepared.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }
    
    // Add user messages
    prepared.push(...messages);
    
    return prepared;
  }

  protected async executeTool(toolCalls: ToolCall[]): Promise<Message[]> {
    const results: Message[] = [];
    
    for (const call of toolCalls) {
      const tool = this.tools.find(t => t.name === call.name);
      
      if (!tool) {
        results.push({
          role: 'tool',
          content: `Error: Tool ${call.name} not found`,
          tool_call_id: call.id
        });
        continue;
      }
      
      try {
        const result = await tool.execute(call.arguments);
        results.push({
          role: 'tool',
          content: JSON.stringify(result),
          name: tool.name,
          tool_call_id: call.id
        });
      } catch (error) {
        results.push({
          role: 'tool',
          content: `Error executing ${tool.name}: ${error}`,
          tool_call_id: call.id
        });
      }
    }
    
    return results;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Tool management
  addTool(tool: Tool): void {
    this.tools.push(tool);
  }

  removeTool(name: string): void {
    this.tools = this.tools.filter(t => t.name !== name);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.find(t => t.name === name);
  }
}