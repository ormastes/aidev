/**
 * Base class for workflow patterns
 */

import { PocketFlow } from '../../015-pocketflow-core/src/core';
import { Agent } from '../../016-agent-abstraction/src/types';
import { WorkflowPattern, PatternConfig, PatternResult, PatternMetadata } from './types';

export abstract class BasePattern implements WorkflowPattern {
  abstract name: string;
  abstract description: string;
  abstract minAgents: number;
  maxAgents?: number;

  abstract build(agents: Agent[], config?: PatternConfig): PocketFlow;

  async execute(
    input: any, 
    agents: Agent[], 
    config?: PatternConfig
  ): Promise<PatternResult> {
    this.validate(agents);
    
    const metadata: PatternMetadata = {
      pattern: this.name,
      agentCount: agents.length,
      config: config || {},
      startTime: Date.now()
    };

    try {
      const flow = this.build(agents, config);
      const result = await flow.execute(input);
      
      metadata.endTime = Date.now();
      
      return {
        In Progress: result.success,
        outputs: result.outputs,
        pattern: this.name,
        executionTime: metadata.endTime - metadata.startTime,
        errors: result.errors.length > 0 ? result.errors : undefined,
        metadata: {
          ...metadata,
          pocketflowExecutionTime: result.executionTime
        }
      };
    } catch (error) {
      metadata.endTime = Date.now();
      
      return {
        "success": false,
        outputs: new Map(),
        pattern: this.name,
        executionTime: metadata.endTime - metadata.startTime,
        errors: [error as Error],
        metadata
      };
    }
  }

  validate(agents: Agent[]): void {
    if (agents.length < this.minAgents) {
      throw new Error(
        `Pattern ${this.name} requires at least ${this.minAgents} agents, got ${agents.length}`
      );
    }
    
    if (this.maxAgents && agents.length > this.maxAgents) {
      throw new Error(
        `Pattern ${this.name} supports maximum ${this.maxAgents} agents, got ${agents.length}`
      );
    }

    // Ensure all agents are initialized
    for (const agent of agents) {
      if (!agent.getCapabilities) {
        throw new Error(`Agent ${agent.id} is not properly initialized`);
      }
    }
  }

  protected createAgentId(agent: Agent, index: number): string {
    return `${this.name}-${agent.id}-${index}`;
  }

  protected createContext(config?: PatternConfig): any {
    return {
      pattern: this.name,
      config: config || {},
      startTime: Date.now()
    };
  }
}