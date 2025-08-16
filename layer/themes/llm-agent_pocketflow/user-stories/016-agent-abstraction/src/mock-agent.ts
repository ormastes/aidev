/**
 * Mock agent implementation for testing and development
 * Simulates LLM behavior without external API calls
 */

import { BaseAgent } from './base-agent';
import { AgentConfig, AgentInput, AgentOutput, Message } from './types';

export class MockAgent extends BaseAgent {
  private responses: Map<string, string> = new Map();
  private defaultResponse = "I'm a mock agent. I received your message.";
  private simulateDelay = true;
  private delayMs = 100;

  constructor() {
    super('mock-agent', 'Mock Agent', 'A mock agent for testing');
  }

  protected async onInitialize(config: AgentConfig): Promise<void> {
    if (config.responses) {
      Object.entries(config.responses).forEach(([pattern, response]) => {
        this.responses.set(pattern, response as string);
      });
    }
    
    if (config.defaultResponse) {
      this.defaultResponse = config.defaultResponse;
    }
    
    if (config.simulateDelay !== undefined) {
      this.simulateDelay = config.simulateDelay;
    }
    
    if (config.delayMs !== undefined) {
      this.delayMs = config.delayMs;
    }
  }

  protected async onProcess(input: AgentInput): Promise<AgentOutput> {
    // Simulate processing delay
    if (this.simulateDelay) {
      await this.delay(this.delayMs);
    }

    const lastMessage = input.messages[input.messages.length - 1];
    const userContent = lastMessage.content;

    // Check for streaming
    if (input.streamCallback && this.config.streaming) {
      await this.simulateStreaming(this.defaultResponse, input.streamCallback);
    }

    // Find matching response pattern
    let responseContent = this.defaultResponse;
    for (const [pattern, response] of this.responses) {
      if (userContent.toLowerCase().includes(pattern.toLowerCase())) {
        responseContent = response;
        break;
      }
    }

    // Check for tool usage
    const toolCalls = this.checkForToolCalls(userContent);

    const message: Message = {
      role: "assistant",
      content: toolCalls.length > 0 
        ? `I'll help you with that using the ${toolCalls[0].name} tool.`
        : responseContent
    };

    return {
      message,
      usage: {
        promptTokens: this.countTokens(input.messages),
        completionTokens: this.countTokens([message]),
        totalTokens: this.countTokens(input.messages) + this.countTokens([message])
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      metadata: {
        model: 'mock-model',
        timestamp: new Date().toISOString()
      }
    };
  }

  protected async onTerminate(): Promise<void> {
    this.responses.clear();
  }

  protected getMaxContextLength(): number {
    return 4096; // Mock limit
  }

  protected getSupportedModels(): string[] {
    return ['mock-model', 'mock-model-large'];
  }

  // Mock-specific methods
  addResponse(pattern: string, response: string): void {
    this.responses.set(pattern, response);
  }

  setDefaultResponse(response: string): void {
    this.defaultResponse = response;
  }

  private async simulateStreaming(content: string, callback: (chunk: string) => void): Promise<void> {
    const words = content.split(' ');
    for (const word of words) {
      callback(word + ' ');
      await this.delay(50);
    }
  }

  private checkForToolCalls(content: string): any[] {
    const toolCalls = [];
    
    // Simulate tool detection
    if (content.toLowerCase().includes("calculate") || content.toLowerCase().includes('math')) {
      const numbers = content.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        toolCalls.push({
          id: `call_${Date.now()}`,
          name: "calculator",
          arguments: {
            expression: `${numbers[0]} + ${numbers[1]}`
          }
        });
      }
    }
    
    if (content.toLowerCase().includes('search') || content.toLowerCase().includes('find')) {
      const queryMatch = content.match(/(?:search|find)\s+(?:for\s+)?(.+)/i);
      if (queryMatch) {
        toolCalls.push({
          id: `call_${Date.now()}`,
          name: 'search',
          arguments: {
            query: queryMatch[1].trim()
          }
        });
      }
    }
    
    return toolCalls;
  }

  private countTokens(messages: Message[]): number {
    // Simple mock token counting (roughly 4 chars per token)
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }
}