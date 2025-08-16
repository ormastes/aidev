/**
 * Debate Pattern
 * Multiple agents discuss to reach consensus
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode, TransformNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { DebateConfig } from '../types';

export class DebatePattern extends BasePattern {
  name = 'debate';
  description = 'Multiple agents debate a topic to reach consensus';
  minAgents = 2;
  maxAgents = 5; // Practical limit for debates

  build(agents: Agent[], config?: DebateConfig): PocketFlow {
    const flow = new PocketFlow();
    const rounds = config?.rounds ?? 3;
    const votingStrategy = config?.votingStrategy ?? 'majority';
    const moderator = config?.moderatorAgent;
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Initialize debate context
    const initNode = new TransformNode('debate-init', (topic: any) => ({
      topic: typeof topic === 'string' ? topic : JSON.stringify(topic),
      round: 0,
      positions: new Map(),
      history: []
    }));
    
    flow.addNode(initNode);
    flow.addEdge({ from: 'input', to: 'debate-init' });
    
    // Create debate rounds
    let previousRoundId = 'debate-init';
    
    for (let round = 1; round <= rounds; round++) {
      const roundId = `round-${round}`;
      
      // Round controller
      const roundNode = new TransformNode(roundId, (context: any) => ({
        ...context,
        round,
        prompt: this.generateRoundPrompt(context, round, rounds)
      }));
      
      flow.addNode(roundNode);
      flow.addEdge({ from: previousRoundId, to: roundId });
      
      // Each agent provides their position
      const positionNodes: string[] = [];
      agents.forEach((agent, index) => {
        const positionId = `${roundId}-agent-${index}`;
        
        const agentNode = new AgentNode(positionId, agent, {
          extractInput: (data: any) => {
            const previousPositions = data.history
              .filter((h: any) => h.agentId === agent.id)
              .map((h: any) => h.position);
            
            return {
              messages: [{
                role: 'system',
                content: `You are participating in a debate. ${
                  round === 1 
                    ? 'Present your initial position.' 
                    : 'Respond to other positions and refine your argument.'
                }`
              }, {
                role: 'user',
                content: `Topic: ${data.topic}\n\n${data.prompt}\n\n${
                  previousPositions.length > 0 
                    ? `Your previous positions:\n${previousPositions.join('\n')}\n\n`
                    : ''
                }Provide your ${round === 1 ? 'position' : 'response'}:`
              }]
            };
          },
          formatOutput: (output) => ({
            agentId: agent.id,
            agentName: agent.name,
            round,
            position: output.message.content,
            timestamp: Date.now()
          })
        });
        
        flow.addNode(agentNode);
        flow.addEdge({ from: roundId, to: positionId });
        positionNodes.push(positionId);
      });
      
      // Collect positions for this round
      const collectId = `${roundId}-collect`;
      const collectNode = new TransformNode(collectId, (positions: any[]) => {
        const context = positions[0]; // First element is the context
        const agentPositions = positions.slice(1);
        
        // Update history
        const updatedHistory = [
          ...context.history,
          ...agentPositions
        ];
        
        // Update current positions
        const updatedPositions = new Map(context.positions);
        agentPositions.forEach((pos: any) => {
          updatedPositions.set(pos.agentId, pos.position);
        });
        
        return {
          ...context,
          positions: updatedPositions,
          history: updatedHistory,
          lastRoundPositions: agentPositions
        };
      });
      
      flow.addNode(collectNode);
      flow.addEdge({ from: roundId, to: collectId }); // Context
      positionNodes.forEach(nodeId => {
        flow.addEdge({ from: nodeId, to: collectId });
      });
      
      previousRoundId = collectId;
    }
    
    // Final consensus building
    const consensusNode = new TransformNode('consensus', (context: any) => {
      const finalPositions = Array.from(context.positions.entries()) as [string, string][];
      
      // Apply voting strategy
      let consensus: string;
      
      switch (votingStrategy) {
        case 'majority':
          // Find common themes (simplified)
          const themes = this.extractCommonThemes(finalPositions);
          consensus = `Based on majority agreement: ${themes.join(', ')}`;
          break;
          
        case 'weighted':
          // Weight by consistency across rounds
          consensus = this.weightedConsensus(context.history);
          break;
          
        case 'moderator':
          // Moderator decides (if available)
          consensus = moderator 
            ? 'Moderator decision pending'
            : this.extractCommonThemes(finalPositions).join(', ');
          break;
          
        default:
          consensus = 'No consensus reached';
      }
      
      return {
        topic: context.topic,
        rounds: rounds,
        participants: agents.map(a => a.name),
        finalPositions: Object.fromEntries(finalPositions),
        consensus,
        debateHistory: context.history
      };
    });
    
    flow.addNode(consensusNode);
    flow.addEdge({ from: previousRoundId, to: 'consensus' });
    
    // Optional moderator summary
    if (moderator) {
      const moderatorNode = new AgentNode('moderator', moderator, {
        extractInput: (data: any) => ({
          messages: [{
            role: 'system',
            content: 'You are the debate moderator. Summarize the debate and provide final conclusions.'
          }, {
            role: 'user',
            content: `Topic: ${data.topic}\n\nFinal positions:\n${
              Object.entries(data.finalPositions)
                .map(([id, pos]) => `${id}: ${pos}`)
                .join('\n\n')
            }\n\nProvide your moderator summary and conclusions.`
          }]
        }),
        formatOutput: (output) => {
          return {
            moderatorSummary: output.message.content,
            consensus: output.message.content
          };
        }
      });
      
      flow.addNode(moderatorNode);
      flow.addEdge({ from: 'consensus', to: 'moderator' });
      flow.addNode(new OutputNode('output'));
      flow.addEdge({ from: 'moderator', to: 'output' });
    } else {
      flow.addNode(new OutputNode('output'));
      flow.addEdge({ from: 'consensus', to: 'output' });
    }
    
    return flow;
  }

  private generateRoundPrompt(context: any, round: number, totalRounds: number): string {
    if (round === 1) {
      return 'Present your initial position on this topic.';
    }
    
    const lastPositions = context.lastRoundPositions || [];
    const otherPositions = lastPositions
      .map((p: any) => `${p.agentName}: ${p.position}`)
      .join('\n\n');
    
    if (round === totalRounds) {
      return `Final round. Other positions:\n\n${otherPositions}\n\nProvide your final position.`;
    }
    
    return `Round ${round}. Other positions:\n\n${otherPositions}\n\nRespond and refine your position.`;
  }

  private extractCommonThemes(positions: [string, string][]): string[] {
    // Simple theme extraction (in real implementation, use NLP)
    const allWords = positions
      .flatMap(([_, pos]) => pos.toLowerCase().split(/\W+/))
      .filter(word => word.length > 4);
    
    const wordCounts = new Map<string, number>();
    allWords.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    // Get most common words as themes
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  private weightedConsensus(history: any[]): string {
    // Weight positions by consistency
    const agentConsistency = new Map<string, number>();
    
    history.forEach((entry, index) => {
      const weight = (index + 1) / history.length; // Later positions weighted more
      agentConsistency.set(
        entry.agentId,
        (agentConsistency.get(entry.agentId) || 0) + weight
      );
    });
    
    const mostConsistent = Array.from(agentConsistency.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    const finalPosition = history
      .filter(h => h.agentId === mostConsistent[0])
      .pop();
    
    return `Weighted consensus based on ${mostConsistent[0]}'s position: ${finalPosition?.position}`;
  }
}