/**
 * PocketFlow node wrapper for agents
 * Integrates agents into PocketFlow workflows
 */

import { Node, NodeInput, NodeOutput } from '../../015-pocketflow-core/src/types';
import { Agent, AgentInput, Message } from './types';

export interface AgentNodeConfig {
  extractInput?: (data: any) => AgentInput;
  formatOutput?: (output: any) => any;
  onError?: (error: Error) => any;
}

export class AgentNode implements Node {
  id: string;
  type = 'agent';
  
  constructor(
    id: string,
    private agent: Agent,
    private config: AgentNodeConfig = {}
  ) {
    this.id = id;
  }

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      // Extract agent input from node input
      const agentInput = this.config.extractInput 
        ? this.config.extractInput(input.data)
        : this.defaultExtractInput(input.data);

      // Process with agent
      const agentOutput = await this.agent.process(agentInput);

      // Format output
      const formattedOutput = this.config.formatOutput
        ? this.config.formatOutput(agentOutput)
        : this.defaultFormatOutput(agentOutput);

      // Store in context if needed
      if (input.context.variables.has("conversation")) {
        const conversation = input.context.variables.get("conversation") as Message[];
        conversation.push(...agentInput.messages, agentOutput.message);
        input.context.variables.set("conversation", conversation);
      }

      return {
        data: formattedOutput,
        success: true
      };
    } catch (error) {
      const errorData = this.config.onError
        ? this.config.onError(error as Error)
        : { error: (error as Error).message };

      return {
        data: errorData,
        success: false,
        error: error as Error
      };
    }
  }

  private defaultExtractInput(data: any): AgentInput {
    // Handle various input formats
    if (data && typeof data === 'object') {
      // Already in agent input format
      if ("messages" in data && Array.isArray(data.messages)) {
        return data as AgentInput;
      }
      
      // Single message object
      if ('role' in data && 'content' in data) {
        return { messages: [data as Message] };
      }
      
      // Object with content
      if ('content' in data) {
        return { 
          messages: [{ 
            role: 'user', 
            content: String(data.content) 
          }] 
        };
      }
    }
    
    // String or other primitive
    return {
      messages: [{
        role: 'user',
        content: String(data)
      }]
    };
  }

  private defaultFormatOutput(output: any): any {
    // Return the complete output by default
    return {
      message: output.message,
      usage: output.usage,
      metadata: output.metadata,
      toolCalls: output.toolCalls
    };
  }
}

/**
 * Specialized node for chat conversations
 */
export class ChatAgentNode extends AgentNode {
  constructor(id: string, agent: Agent) {
    super(id, agent, {
      extractInput: (data) => {
        if (typeof data === 'string') {
          return {
            messages: [{ role: 'user', content: data }]
          };
        }
        return data;
      },
      formatOutput: (output) => output.message.content
    });
  }
}

/**
 * Node that maintains conversation history
 */
export class ConversationAgentNode implements Node {
  id: string;
  type = 'conversation-agent';
  private history: Message[] = [];
  
  constructor(
    id: string,
    private agent: Agent,
    private maxHistory = 10
  ) {
    this.id = id;
  }

  async execute(input: NodeInput): Promise<NodeOutput> {
    try {
      // Add user message to history
      const userMessage: Message = {
        role: 'user',
        content: typeof input.data === 'string' ? input.data : input.data.content
      };
      
      this.history.push(userMessage);
      
      // Trim history to max size
      if (this.history.length > this.maxHistory * 2) {
        this.history = this.history.slice(-this.maxHistory * 2);
      }

      // Process with full history
      const agentOutput = await this.agent.process({
        messages: this.history
      });

      // Add assistant response to history
      this.history.push(agentOutput.message);
      
      // Trim history again after adding response
      if (this.history.length > this.maxHistory * 2) {
        this.history = this.history.slice(-this.maxHistory * 2);
      }

      return {
        data: {
          response: agentOutput.message.content,
          history: [...this.history],
          usage: agentOutput.usage
        },
        success: true
      };
    } catch (error) {
      return {
        data: { error: (error as Error).message },
        success: false,
        error: error as Error
      };
    }
  }

  clearHistory(): void {
    this.history = [];
  }

  getHistory(): Message[] {
    return [...this.history];
  }
}