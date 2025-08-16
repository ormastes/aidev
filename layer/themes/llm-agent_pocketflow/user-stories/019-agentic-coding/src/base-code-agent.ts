/**
 * Base implementation for code generation agents
 */

import { BaseAgent } from '../../016-agent-abstraction/src/base-agent';
import { AgentConfig, AgentInput, AgentOutput } from '../../016-agent-abstraction/src/types';
import { CodeAgent, AgentContext, AgentResult } from './types';

/**
 * Abstract base class for code agents
 */
export abstract class BaseCodeAgent extends BaseAgent implements CodeAgent {
  protected codeConfig: {
    maxRetries?: number;
    temperature?: number;
    model?: string;
  };

  constructor(
    name: string,
    description: string,
    codeConfig: {
      maxRetries?: number;
      temperature?: number;
      model?: string;
    } = {}
  ) {
    super(`${name}-${Date.now()}`, name, description);
    this.codeConfig = codeConfig;
  }

  /**
   * Generate prompt for the AI model
   */
  abstract generatePrompt(request: any): string;

  /**
   * Parse AI model response
   */
  abstract parseResponse(response: string): any;

  /**
   * Validate the generated result
   */
  abstract validate(result: any): boolean;

  // Required abstract methods from BaseAgent
  protected async onInitialize(_config: AgentConfig): Promise<void> {
    // Initialize agent with config
  }

  protected async onProcess(input: AgentInput): Promise<AgentOutput> {
    // Convert to our execute format
    const context: AgentContext = {
      memory: this.memory,
      tools: new Map(),
      metadata: input.context || {}
    };
    
    const result = await this.execute(input.messages[0]?.content || '', context);
    
    return {
      message: {
        role: "assistant",
        content: JSON.stringify(result.data)
      },
      metadata: result.metadata || {}
    };
  }

  protected async onTerminate(): Promise<void> {
    // Cleanup if needed
  }

  protected getMaxContextLength(): number {
    return 8192; // Default
  }

  protected getSupportedModels(): string[] {
    return ['mock-model'];
  }

  /**
   * Execute the agent
   */
  async execute(input: any, context: AgentContext): Promise<AgentResult> {
    try {
      // Generate prompt
      const prompt = this.generatePrompt(input);
      
      // Simulate AI response (in real implementation, this would call an LLM)
      const response = await this.simulateAIResponse(prompt, input);
      
      // Parse response
      const result = this.parseResponse(response);
      
      // Validate result
      if (!this.validate(result)) {
        throw new Error('Generated result failed validation');
      }
      
      // Store in memory if available
      if (context.memory) {
        await context.memory.store(`agent-${this.name}-${Date.now()}`, {
          role: "assistant",
          content: JSON.stringify(result),
          metadata: {
            agent: this.name,
            timestamp: Date.now()
          }
        });
      }
      
      return {
        success: true,
        data: result,
        metadata: {
          agent: this.name,
          model: this.codeConfig.model || 'mock',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        metadata: {
          agent: this.name,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Simulate AI response for testing
   * Override this in production with actual LLM calls
   */
  protected abstract simulateAIResponse(prompt: string, input: any): Promise<string>;

  /**
   * Extract code blocks from markdown response
   */
  protected extractCodeBlocks(response: string, language?: string): string[] {
    const pattern = language 
      ? new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, 'g')
      : /```[\w]*\n([\s\S]*?)```/g;
    
    const blocks: string[] = [];
    let match;
    
    while ((match = pattern.exec(response)) !== null) {
      blocks.push(match[1]!.trim());
    }
    
    return blocks;
  }

  /**
   * Clean and format code
   */
  protected cleanCode(code: string): string {
    return code
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, '  ');
  }

  /**
   * Validate syntax (mock implementation)
   */
  protected validateSyntax(code: string, language: string): boolean {
    // In a real implementation, this would use a parser
    // For now, just check for basic syntax markers
    switch (language) {
      case "typescript":
      case "javascript":
        return code.includes("function") || code.includes('const') || code.includes('class');
      case 'python':
        return code.includes('def') || code.includes('class') || code.includes('import');
      default:
        return true;
    }
  }
}