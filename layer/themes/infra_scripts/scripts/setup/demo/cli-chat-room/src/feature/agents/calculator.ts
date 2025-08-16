/**
 * Calculator Agent
 * Performs basic math operations
 */

import { BaseCoordinatorAgent, CoordinatorCapabilities, CoordinatorConfig, Message } from './coordinator-interface';

export class CalculatorAgent extends BaseCoordinatorAgent {
  readonly capabilities: CoordinatorCapabilities = {
    chat: false,
    math: true,
    code: false,
    summarize: false,
    moderate: false,
    analyze: false,
    translate: false,
    help: false,
    streaming: false
  };

  // Public accessor for tests
  get agentName(): string {
    return this.config.agentName;
  }

  constructor(
    serverUrl: string,
    roomId: string,
    agentName: string = 'Calculator'
  ) {
    const config: CoordinatorConfig = {
      serverUrl,
      roomId,
      agentName,
      capabilities: {
        math: true
      },
      responseConfig: {
        autoRespond: true,
        respondToMentions: true,
        respondToQuestions: true,
        showTypingIndicator: false,
        responseDelay: { min: 100, max: 300 },
        maxContextMessages: 10
      }
    };
    super(config);
  }

  protected async onStart(): Promise<void> {
    console.log(`🧮 Calculator connected to room ${this.config.roomId}`);
    await this.sendMessage('🧮 Calculator ready! Try: "calculate 5 + 3" or "what is 10 * 2?"');
  }

  protected async onStop(): Promise<void> {
    console.log('🧮 Calculator shutting down');
  }

  protected async generateResponse(message: Message, _context: Message[]): Promise<string> {
    const content = message.content.toLowerCase();
    
    // Extract numbers and operation
    const match = content.match(/(\d+\.?\d*)\s*([\+\-\*\/])\s*(\d+\.?\d*)/);
    
    if (!match) {
      return ''; // No response for non-calculation messages
    }

    const [, num1Str, operator, num2Str] = match;
    const num1 = parseFloat(num1Str);
    const num2 = parseFloat(num2Str);
    
    let result: number;

    switch (operator) {
      case '+':
        result = num1 + num2;
        break;
      case '-':
        result = num1 - num2;
        break;
      case '*':
        result = num1 * num2;
        break;
      case '/':
        if (num2 === 0) {
          return '🧮 Error: Division by zero!';
        }
        result = num1 / num2;
        break;
      default:
        return '';
    }

    // Format result (show decimals only if needed)
    const formattedResult = result % 1 === 0 ? result.toString() : result.toFixed(2);
    
    return `🧮 ${num1} ${operator} ${num2} = ${formattedResult}`;
  }

  protected shouldRespond(message: Message): boolean {
    const content = message.content.toLowerCase();
    
    // Respond to calculation requests
    return content.includes('calculate') || 
           content.includes('what is') || 
           /\d+\s*[\+\-\*\/]\s*\d+/.test(content);
  }

  // Additional methods for test compatibility
  public async connect(): Promise<void> {
    await this.start();
  }

  public async disconnect(): Promise<void> {
    await this.stop();
  }
}

// Export factory function
export function createCalculator(
  serverUrl: string,
  roomId: string,
  agentName?: string
): CalculatorAgent {
  return new CalculatorAgent(serverUrl, roomId, agentName);
}