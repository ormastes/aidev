/**
 * Map-Reduce Pattern
 * Distribute work across agents, then aggregate results
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode, TransformNode, ReduceNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { MapReduceConfig } from '../types';

export class MapReducePattern extends BasePattern {
  name = 'map-reduce';
  description = 'Distribute items to agents for processing, then aggregate results';
  minAgents = 1;

  build(agents: Agent[], config?: MapReduceConfig): PocketFlow {
    const flow = new PocketFlow();
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Add splitter node to distribute items
    const splitterNode = new TransformNode("splitter", (data: any) => {
      if (!Array.isArray(data)) {
        throw new Error('Map-Reduce pattern requires array input');
      }
      
      // Apply optional map function
      if (config?.mapFunction) {
        return data.map(config.mapFunction);
      }
      
      return data;
    });
    
    flow.addNode(splitterNode);
    flow.addEdge({ from: 'input', to: "splitter" });
    
    // Create distributor that assigns items to agents
    const distributorNode = new TransformNode("distributor", (items: any[]) => {
      const assignments: any[] = [];
      
      // Distribute items across agents
      items.forEach((item, index) => {
        const agentIndex = index % agents.length;
        assignments.push({
          agentIndex,
          item,
          itemIndex: index
        });
      });
      
      return assignments;
    });
    
    flow.addNode(distributorNode);
    flow.addEdge({ from: "splitter", to: "distributor" });
    
    // Create agent processing nodes
    const processorNodes: string[] = [];
    agents.forEach((agent, agentIndex) => {
      const processorId = `processor-${agentIndex}`;
      
      // Filter items for this agent
      const filterNode = new TransformNode(`filter-${agentIndex}`, (assignments: any[]) => {
        return assignments
          .filter(a => a.agentIndex === agentIndex)
          .map(a => a.item);
      });
      
      flow.addNode(filterNode);
      flow.addEdge({ from: "distributor", to: `filter-${agentIndex}` });
      
      // Process items with agent
      const agentNode = new AgentNode(processorId, agent, {
        extractInput: (items: any[]) => {
          // Process each item
          const prompt = items.map((item, i) => 
            `Process item ${i + 1}: ${JSON.stringify(item)}`
          ).join('\n');
          
          return {
            messages: [{
              role: 'user',
              content: prompt
            }]
          };
        },
        formatOutput: (output) => {
          // Extract processed results
          return {
            agentId: agent.id,
            results: output.message.content
          };
        }
      });
      
      flow.addNode(agentNode);
      flow.addEdge({ from: `filter-${agentIndex}`, to: processorId });
      processorNodes.push(processorId);
    });
    
    // Collect results
    const collectorNode = new TransformNode("collector", (results: any[]) => {
      // Flatten results from all agents
      return results.flat();
    });
    
    flow.addNode(collectorNode);
    processorNodes.forEach(nodeId => {
      flow.addEdge({ from: nodeId, to: "collector" });
    });
    
    // Add reducer
    const reducerNode = new ReduceNode(
      'reducer',
      config?.reduceFunction || ((acc: any, curr: any) => {
        if (Array.isArray(acc)) {
          return [...acc, curr];
        }
        return [acc, curr];
      }),
      config?.initialValue || []
    );
    
    flow.addNode(reducerNode);
    flow.addEdge({ from: "collector", to: 'reducer' });
    
    // Output
    flow.addNode(new OutputNode('output'));
    flow.addEdge({ from: 'reducer', to: 'output' });
    
    return flow;
  }
}