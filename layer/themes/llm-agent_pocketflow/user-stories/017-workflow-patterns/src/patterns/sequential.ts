/**
 * Sequential Chain Pattern
 * Agents process in order, each building on previous outputs
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { SequentialConfig } from '../types';

export class SequentialPattern extends BasePattern {
  name = "sequential";
  description = 'Agents process in sequence, each receiving the previous output';
  minAgents = 2;

  build(agents: Agent[], config?: SequentialConfig): PocketFlow {
    const flow = new PocketFlow();
    const passFullHistory = config?.passFullHistory ?? false;
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Create agent nodes
    const agentNodes: string[] = [];
    const conversationHistory: any[] = [];
    
    agents.forEach((agent, index) => {
      const nodeId = this.createAgentId(agent, index);
      
      const agentNode = new AgentNode(nodeId, agent, {
        extractInput: (data) => {
          if (passFullHistory && Array.isArray(data)) {
            // Pass full conversation history
            return { messages: data };
          } else if (index === 0) {
            // First agent gets raw input
            return {
              messages: [{
                role: 'user',
                content: typeof data === 'string' ? data : JSON.stringify(data)
              }]
            };
          } else {
            // Subsequent agents get previous output
            const content = typeof data === 'object' && data.message 
              ? data.message.content 
              : String(data);
            
            return {
              messages: [{
                role: 'user',
                content: content
              }]
            };
          }
        },
        formatOutput: (output) => {
          if (passFullHistory) {
            // Build conversation history
            conversationHistory.push(output.message);
            return [...conversationHistory];
          }
          return output;
        }
      });
      
      flow.addNode(agentNode);
      agentNodes.push(nodeId);
    });
    
    // Add output node
    flow.addNode(new OutputNode('output'));
    
    // Connect nodes in sequence
    flow.addEdge({ from: 'input', to: agentNodes[0] });
    
    for (let i = 0; i < agentNodes.length - 1; i++) {
      const transform = config?.transformBetweenSteps 
        ? (data: any) => config.transformBetweenSteps!(data, agents[i].id, agents[i + 1].id)
        : undefined;
      
      flow.addEdge({ 
        from: agentNodes[i], 
        to: agentNodes[i + 1],
        transform
      });
    }
    
    flow.addEdge({ from: agentNodes[agentNodes.length - 1], to: 'output' });
    
    return flow;
  }
}