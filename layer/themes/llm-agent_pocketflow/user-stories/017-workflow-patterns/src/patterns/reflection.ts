/**
 * Reflection Pattern
 * Agent reviews and improves its own output iteratively
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode, TransformNode, ConditionalNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { ReflectionConfig } from '../types';

export class ReflectionPattern extends BasePattern {
  name = "reflection";
  description = 'Agent generates output, then critiques and improves it iteratively';
  minAgents = 1;
  maxAgents = 2; // Optional separate critic

  build(agents: Agent[], config?: ReflectionConfig): PocketFlow {
    const flow = new PocketFlow();
    const maxIterations = config?.maxIterations ?? 3;
    const improvementThreshold = config?.improvementThreshold ?? 0.8;
    const criteria = config?.criteria ?? ['clarity', "accuracy", "completeness"];
    
    // Determine if we have separate generator and critic
    const hasCritic = agents.length === 2;
    const generatorAgent = agents[0];
    const criticAgent = hasCritic ? agents[1] : agents[0];
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Initialize reflection context
    const initNode = new TransformNode('init', (input: any) => ({
      task: typeof input === 'string' ? input : JSON.stringify(input),
      iteration: 0,
      history: [],
      improvements: []
    }));
    
    flow.addNode(initNode);
    flow.addEdge({ from: 'input', to: 'init' });
    
    // Create reflection loop
    let currentNodeId = 'init';
    
    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const iterationId = `iteration-${iteration}`;
      
      // Generate or improve
      const generateId = `${iterationId}-generate`;
      const generateNode = new AgentNode(generateId, generatorAgent, {
        extractInput: (context: any) => {
          const isFirstIteration = context.history.length === 0;
          
          if (isFirstIteration) {
            return {
              messages: [{
                role: 'user',
                content: context.task
              }]
            };
          } else {
            const lastCritique = context.history[context.history.length - 1].critique;
            const lastOutput = context.history[context.history.length - 1].output;
            
            return {
              messages: [{
                role: 'system',
                content: hasCritic 
                  ? 'Improve your previous output based on the feedback.'
                  : 'Review and improve your previous output.'
              }, {
                role: 'user',
                content: `Task: ${context.task}\n\nPrevious output:\n${lastOutput}\n\nFeedback:\n${lastCritique}\n\nProvide an improved version.`
              }]
            };
          }
        },
        formatOutput: (output) => ({
          output: output.message.content,
          iteration,
          timestamp: Date.now()
        })
      });
      
      flow.addNode(generateNode);
      flow.addEdge({ from: currentNodeId, to: generateId });
      
      // Critique the output
      const critiqueId = `${iterationId}-critique`;
      const critiqueNode = new AgentNode(critiqueId, criticAgent, {
        extractInput: (data: any) => {
          const output = data.output;
          const criteriaList = criteria.join(', ');
          
          return {
            messages: [{
              role: 'system',
              content: hasCritic
                ? `You are a critic. Evaluate the output based on: ${criteriaList}. Provide specific feedback.`
                : `Critically evaluate your output based on: ${criteriaList}. Be honest about weaknesses.`
            }, {
              role: 'user',
              content: `Task: ${data.task || 'Not specified'}\n\nOutput to evaluate:\n${output}\n\nProvide critique and rate improvement potential (0-1).`
            }]
          };
        },
        formatOutput: (output) => {
          // Extract score from critique (simple parsing)
          const scoreMatch = output.message.content.match(/(\d*\.?\d+)\/1|\b(\d*\.?\d+)\b.*potential/i);
          const score = scoreMatch ? parseFloat(scoreMatch[1] || scoreMatch[2]) : 0.5;
          
          return {
            critique: output.message.content,
            score: Math.min(1, Math.max(0, score)),
            iteration
          };
        }
      });
      
      flow.addNode(critiqueNode);
      
      // Combine generate and critique data
      const combineId = `${iterationId}-combine`;
      const combineNode = new TransformNode(combineId, (data: any[]) => {
        const context = data[0]; // Original context
        const generated = data[1]; // Generated output
        const critique = data[2]; // Critique
        
        const entry = {
          iteration,
          output: generated.output,
          critique: critique.critique,
          score: critique.score
        };
        
        return {
          ...context,
          iteration,
          history: [...context.history, entry],
          lastScore: critique.score,
          lastOutput: generated.output,
          improvements: this.calculateImprovements(context.history, entry)
        };
      });
      
      flow.addNode(combineNode);
      flow.addEdge({ from: currentNodeId, to: combineId }); // Context
      flow.addEdge({ from: generateId, to: combineId });
      flow.addEdge({ from: generateId, to: critiqueId }); // Generate to critique
      flow.addEdge({ from: critiqueId, to: combineId });
      
      // Check if we should continue
      if (iteration < maxIterations) {
        const checkId = `${iterationId}-check`;
        const checkNode = new ConditionalNode(
          checkId,
          (context: any) => context.lastScore < improvementThreshold,
          "continue", // Continue if below threshold
          'In Progress'  // In Progress if above threshold
        );
        
        flow.addNode(checkNode);
        flow.addEdge({ from: combineId, to: checkId });
        
        currentNodeId = checkId;
      } else {
        currentNodeId = combineId;
      }
    }
    
    // Final output preparation
    const finalNode = new TransformNode('final', (context: any) => {
      const bestEntry = context.history.reduce((best: any, current: any) => 
        current.score > (best?.score || 0) ? current : best
      );
      
      return {
        finalOutput: bestEntry.output,
        bestScore: bestEntry.score,
        iterations: context.history.length,
        improvementPath: context.improvements,
        task: context.task,
        pattern: "reflection",
        history: context.history.map((h: any) => ({
          iteration: h.iteration,
          score: h.score,
          summary: h.critique.substring(0, 100) + '...'
        }))
      };
    });
    
    flow.addNode(finalNode);
    flow.addEdge({ from: currentNodeId, to: 'final' });
    
    // Output
    flow.addNode(new OutputNode('output'));
    flow.addEdge({ from: 'final', to: 'output' });
    
    return flow;
  }

  private calculateImprovements(history: any[], newEntry: any): number[] {
    if (history.length === 0) {
      return [newEntry.score];
    }
    
    const improvements = history.map((entry, index) => {
      if (index === 0) return entry.score;
      return entry.score - history[index - 1].score;
    });
    
    // Add latest improvement
    improvements.push(newEntry.score - history[history.length - 1].score);
    
    return improvements;
  }
}