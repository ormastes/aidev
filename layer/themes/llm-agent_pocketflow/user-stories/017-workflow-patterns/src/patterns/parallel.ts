/**
 * Parallel Execution Pattern
 * Multiple agents work simultaneously on the same input
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode, TransformNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { ParallelConfig } from '../types';

export class ParallelPattern extends BasePattern {
  name = "parallel";
  description = 'Multiple agents process the same input simultaneously';
  minAgents = 2;

  build(agents: Agent[], config?: ParallelConfig): PocketFlow {
    const flow = new PocketFlow();
    const strategy = config?.aggregationStrategy ?? 'array';
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Create agent nodes
    const agentNodes: string[] = [];
    agents.forEach((agent, index) => {
      const nodeId = this.createAgentId(agent, index);
      
      const agentNode = new AgentNode(nodeId, agent, {
        extractInput: (data) => ({
          messages: [{
            role: 'user',
            content: typeof data === 'string' ? data : JSON.stringify(data)
          }]
        })
      });
      
      flow.addNode(agentNode);
      agentNodes.push(nodeId);
      
      // Connect input to each agent
      flow.addEdge({ from: 'input', to: nodeId });
    });
    
    // Add aggregation node
    const aggregatorNode = new TransformNode("aggregator", (inputs: any[]) => {
      // Handle different aggregation strategies
      switch (strategy) {
        case 'array':
          return inputs;
          
        case 'merge':
          // Merge objects or concatenate arrays
          if (inputs.every(i => typeof i === 'object' && !Array.isArray(i))) {
            return inputs.reduce((acc, curr) => ({ ...acc, ...curr }), {});
          } else if (inputs.every(i => Array.isArray(i))) {
            return inputs.flat();
          }
          return inputs;
          
        case 'custom':
          if (config?.customAggregator) {
            return config.customAggregator(inputs);
          }
          return inputs;
          
        default:
          return inputs;
      }
    });
    
    flow.addNode(aggregatorNode);
    flow.addNode(new OutputNode('output'));
    
    // Connect all agents to aggregator
    agentNodes.forEach(nodeId => {
      flow.addEdge({ from: nodeId, to: "aggregator" });
    });
    
    // Connect aggregator to output
    flow.addEdge({ from: "aggregator", to: 'output' });
    
    return flow;
  }
}