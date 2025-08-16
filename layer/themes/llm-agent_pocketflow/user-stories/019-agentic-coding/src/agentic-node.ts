/**
 * Agentic node implementation for PocketFlow integration
 */

import { ValidatedNode } from '../../018-type-safety/src/nodes';
import { AgenticNode, CodeAgent, AgentContext, AgentResult } from './types';
import { InMemoryStorage } from '../../016-agent-abstraction/src/memory';

/**
 * Node that wraps a code agent for use in PocketFlow workflows
 */
export class AgenticCodeNode<TInput, TOutput> 
  extends ValidatedNode<TInput, TOutput> 
  implements AgenticNode<TInput, TOutput> {
  
  id: string;
  type = 'agentic';
  
  constructor(
    id: string,
    public agent: CodeAgent,
    public preProcess?: (input: TInput) => Promise<any>,
    public postProcess?: (output: any) => Promise<TOutput>
  ) {
    super();
    this.id = id;
  }
  
  protected async process(input: TInput, context: any): Promise<TOutput> {
    // Pre-process input if needed
    const processedInput = this.preProcess 
      ? await this.preProcess(input)
      : input;
    
    // Create agent context
    const agentContext: AgentContext = {
      memory: context.memory || new InMemoryStorage(),
      tools: context.tools || new Map(),
      metadata: {
        nodeId: this.id,
        workflowContext: context
      }
    };
    
    // Execute agent
    const result = await this.agent.execute(processedInput, agentContext);
    
    if (!result.success) {
      throw new Error(`Agent execution failed: ${result.error?.message}`);
    }
    
    // Post-process output if needed
    const output = this.postProcess 
      ? await this.postProcess(result.data)
      : result.data;
    
    // Store agent result in workflow context
    if (context.agentResults) {
      context.agentResults[this.id] = result;
    } else {
      context.agentResults = { [this.id]: result };
    }
    
    return output;
  }
}

/**
 * Factory function to create agentic nodes
 */
export function createAgenticNode<TInput, TOutput>(
  id: string,
  agent: CodeAgent,
  options?: {
    preProcess?: (input: TInput) => Promise<any>;
    postProcess?: (output: any) => Promise<TOutput>;
  }
): AgenticCodeNode<TInput, TOutput> {
  return new AgenticCodeNode(
    id,
    agent,
    options?.preProcess,
    options?.postProcess
  );
}

/**
 * Chain multiple agents in sequence
 */
export class AgentChain<TInput, TOutput> extends ValidatedNode<TInput, TOutput> {
  id: string;
  type = 'agent-chain';
  
  constructor(
    id: string,
    private agents: CodeAgent[],
    private transformers?: Array<(data: any) => any>
  ) {
    super();
    this.id = id;
  }
  
  protected async process(input: TInput, context: any): Promise<TOutput> {
    let currentData: any = input;
    const agentContext: AgentContext = {
      memory: context.memory || new InMemoryStorage(),
      tools: context.tools || new Map(),
      metadata: {
        nodeId: this.id,
        chainLength: this.agents.length
      }
    };
    
    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i]!;
      const result = await agent.execute(currentData, agentContext);
      
      if (!result.success) {
        throw new Error(`Agent ${agent.name} failed: ${result.error?.message}`);
      }
      
      currentData = result.data;
      
      // Apply transformer if available
      if (this.transformers && this.transformers[i]) {
        currentData = this.transformers[i]!(currentData);
      }
    }
    
    return currentData as TOutput;
  }
}

/**
 * Parallel agent execution node
 */
export class ParallelAgents<TInput, TOutput> extends ValidatedNode<TInput, TOutput[]> {
  id: string;
  type = 'parallel-agents';
  
  constructor(
    id: string,
    private agents: CodeAgent[]
  ) {
    super();
    this.id = id;
  }
  
  protected async process(input: TInput, context: any): Promise<TOutput[]> {
    const agentContext: AgentContext = {
      memory: context.memory || new InMemoryStorage(),
      tools: context.tools || new Map(),
      metadata: {
        nodeId: this.id,
        parallelCount: this.agents.length
      }
    };
    
    const promises = this.agents.map(agent => 
      agent.execute(input, agentContext)
    );
    
    const results = await Promise.all(promises);
    
    // Check all succeeded
    const failed = results.filter((r: AgentResult) => !r.success);
    if (failed.length > 0) {
      const errors = failed.map((r: AgentResult) => r.error?.message).join(', ');
      throw new Error(`${failed.length} agents failed: ${errors}`);
    }
    
    return results.map((r: AgentResult) => r.data) as TOutput[];
  }
}

/**
 * Agent debate node - multiple agents discuss and reach consensus
 */
export class AgentDebate<TInput, TOutput> extends ValidatedNode<TInput, TOutput> {
  id: string;
  type = 'agent-debate';
  
  constructor(
    id: string,
    private agents: CodeAgent[],
    private rounds: number = 3,
    private consensusStrategy: 'vote' | 'synthesize' = 'synthesize'
  ) {
    super();
    this.id = id;
  }
  
  protected async process(input: TInput, context: any): Promise<TOutput> {
    const agentContext: AgentContext = {
      memory: context.memory || new InMemoryStorage(),
      tools: context.tools || new Map(),
      metadata: {
        nodeId: this.id,
        debateRounds: this.rounds
      }
    };
    
    const positions: Map<string, any> = new Map();
    
    // Initial positions
    for (const agent of this.agents) {
      const result = await agent.execute(input, agentContext);
      if (result.success) {
        positions.set(agent.name, result.data);
      }
    }
    
    // Debate rounds
    for (let round = 0; round < this.rounds; round++) {
      const debateContext = {
        ...input,
        positions: Array.from(positions.entries()),
        round
      };
      
      for (const agent of this.agents) {
        const result = await agent.execute(debateContext, agentContext);
        if (result.success) {
          positions.set(agent.name, result.data);
        }
      }
    }
    
    // Reach consensus
    if (this.consensusStrategy === 'vote') {
      // Simple majority vote (mock implementation)
      return Array.from(positions.values())[0] as TOutput;
    } else {
      // Synthesize positions (mock implementation)
      return {
        consensus: true,
        positions: Array.from(positions.entries()),
        synthesis: 'Combined agent insights'
      } as any as TOutput;
    }
  }
}