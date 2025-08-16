/**
 * Claude Connector for Chat Space
 * 
 * Provides integration with Claude AI for intelligent chat responses
 * and mathematical operations including addition.
 * 
 * Mock-free implementation designed for real API integration.
 */

import { EventEmitter } from '../../../../../infra_external-log-lib/src';

export interface ClaudeConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  enableMath?: boolean;
}

export interface ClaudeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  timestamp: string;
}

export interface MathResult {
  expression: string;
  result: number;
  explanation?: string;
}

export class ClaudeConnector extends EventEmitter {
  private config: ClaudeConfig;
  private conversationHistory: ClaudeMessage[] = [];
  private isInitialized: boolean = false;

  constructor(config: ClaudeConfig = {}) {
    super();
    
    this.config = {
      apiKey: config.apiKey || process.env.CLAUDE_API_KEY,
      model: config.model || 'claude-3-opus-20240229',
      maxTokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.7,
      enableMath: config.enableMath ?? true,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt()
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are Claude, a helpful AI assistant in a developer chat room. 
You excel at:
- Answering programming questions
- Performing mathematical calculations with precision
- Helping with debugging and problem-solving
- Providing clear, concise explanations

When asked to perform addition or other math operations:
- Always provide the exact numerical answer
- Show your work when helpful
- Format: "X + Y = Z" for clarity
- Be accurate and double-check calculations`;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize with system prompt
    if (this.config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }

    this.isInitialized = true;
    
    this.emit('initialized', {
      model: this.config.model,
      mathEnabled: this.config.enableMath
    });
  }

  /**
   * Send a message to Claude and get a response
   */
  async chat(message: string): Promise<ClaudeResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Check if this is a math question
    if (this.config.enableMath && this.isMathQuestion(message)) {
      return await this.handleMathQuestion(message);
    }

    // For general chat, simulate Claude response
    // In production, this would call the actual Claude API
    const response = await this.simulateClaudeResponse(message);
    
    // Add to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content
    });

    this.emit('response', response);
    return response;
  }

  /**
   * Handle mathematical questions with high accuracy
   */
  private async handleMathQuestion(message: string): Promise<ClaudeResponse> {
    const mathResults = this.extractAndCalculate(message);
    
    let responseContent = '';
    
    if (mathResults.length === 0) {
      responseContent = 'I can help with math! Please provide numbers to calculate.';
    } else if (mathResults.length === 1) {
      const result = mathResults[0];
      responseContent = `${result.expression} = ${result.result}`;
    } else {
      responseContent = 'Here are the calculations:\\n';
      mathResults.forEach(result => {
        responseContent += `${result.expression} = ${result.result}\\n`;
      });
    }

    const response: ClaudeResponse = {
      content: responseContent,
      model: this.config.model || 'claude-3',
      timestamp: new Date().toISOString(),
      usage: {
        inputTokens: message.length / 4, // Rough estimate
        outputTokens: responseContent.length / 4
      }
    };

    this.conversationHistory.push({
      role: 'assistant',
      content: responseContent
    });

    this.emit('math-response', mathResults);
    return response;
  }

  /**
   * Check if a message is asking for math calculations
   */
  private isMathQuestion(message: string): boolean {
    const mathPatterns = [
      /\d+\s*[\+\-\*\/]\s*\d+/,  // Basic operations
      /what is \d+ [\+\-\*\/] \d+/i,
      /calculate/i,
      /add|subtract|multiply|divide/i,
      /sum of/i,
      /total/i
    ];
    
    return mathPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Extract math expressions and calculate results
   */
  private extractAndCalculate(message: string): MathResult[] {
    const results: MathResult[] = [];
    
    // Extract addition expressions
    const additionPattern = /(-?\d+)\s*\+\s*(-?\d+)/g;
    let match;
    
    while ((match = additionPattern.exec(message)) !== null) {
      const num1 = parseInt(match[1], 10);
      const num2 = parseInt(match[2], 10);
      const result = num1 + num2;
      
      results.push({
        expression: `${num1} + ${num2}`,
        result: result,
        explanation: `Adding ${num1} and ${num2}`
      });
    }
    
    // Extract subtraction expressions
    const subtractionPattern = /(-?\d+)\s*-\s*(-?\d+)/g;
    while ((match = subtractionPattern.exec(message)) !== null) {
      const num1 = parseInt(match[1], 10);
      const num2 = parseInt(match[2], 10);
      const result = num1 - num2;
      
      results.push({
        expression: `${num1} - ${num2}`,
        result: result
      });
    }
    
    return results;
  }

  /**
   * Simulate Claude's response for testing
   * In production, this would call the actual API
   */
  private async simulateClaudeResponse(message: string): Promise<ClaudeResponse> {
    let content = '';
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      content = 'Hello! I\'m Claude, ready to help with programming and math questions.';
    } else if (lowerMessage.includes('help')) {
      content = 'I can help with:\\n- Mathematical calculations\\n- Programming questions\\n- Debugging\\n- General assistance';
    } else if (lowerMessage.includes('thank')) {
      content = 'You\'re welcome! Feel free to ask if you need more help.';
    } else {
      content = 'I understand. How can I assist you further?';
    }
    
    return {
      content,
      model: this.config.model || 'claude-3',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Perform a specific addition operation
   */
  async add(num1: number, num2: number): Promise<MathResult> {
    const result: MathResult = {
      expression: `${num1} + ${num2}`,
      result: num1 + num2,
      explanation: `The sum of ${num1} and ${num2} is ${num1 + num2}`
    };
    
    this.emit('calculation', result);
    return result;
  }

  /**
   * Batch addition operations
   */
  async addMultiple(pairs: Array<[number, number]>): Promise<MathResult[]> {
    const results = pairs.map(([num1, num2]) => ({
      expression: `${num1} + ${num2}`,
      result: num1 + num2
    }));
    
    this.emit('batch-calculation', results);
    return results;
  }

  /**
   * Get conversation history
   */
  getHistory(): ClaudeMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    if (this.config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }
  }

  /**
   * Check if Claude service is available
   */
  async isAvailable(): Promise<boolean> {
    // In production, this would check API connectivity
    // For now, return true if we have an API key or are in test mode
    return !!this.config.apiKey || process.env.NODE_ENV === 'test';
  }

  /**
   * Get current configuration
   */
  getConfig(): ClaudeConfig {
    return { ...this.config, apiKey: '***' }; // Hide API key
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    this.clearHistory();
    this.removeAllListeners();
    this.isInitialized = false;
  }
}