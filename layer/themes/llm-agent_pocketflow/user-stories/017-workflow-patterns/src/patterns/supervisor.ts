/**
 * Supervisor Pattern
 * One agent coordinates and delegates to other agents
 */

import { PocketFlow } from '../../../015-pocketflow-core/src/core';
import { InputNode, OutputNode, TransformNode } from '../../../015-pocketflow-core/src/nodes';
import { Agent } from '../../../016-agent-abstraction/src/types';
import { AgentNode } from '../../../016-agent-abstraction/src/agent-node';
import { BasePattern } from '../base-pattern';
import { SupervisorConfig } from '../types';

export class SupervisorPattern extends BasePattern {
  name = "supervisor";
  description = 'One agent coordinates others, delegating tasks and aggregating results';
  minAgents = 2; // At least supervisor + 1 worker

  build(agents: Agent[], config?: SupervisorConfig): PocketFlow {
    const flow = new PocketFlow();
    const [supervisor, ...workers] = agents;
    const routingStrategy = config?.routingStrategy ?? 'round-robin';
    
    // Add input node
    flow.addNode(new InputNode('input'));
    
    // Create supervisor planning node
    const plannerNode = new AgentNode('planner', supervisor, {
      extractInput: (data) => ({
        messages: [{
          role: 'system',
          content: `You are a supervisor coordinating ${workers.length} workers. 
                   Available workers: ${workers.map(w => w.name).join(', ')}.
                   Break down the task and delegate to appropriate workers.`
        }, {
          role: 'user',
          content: typeof data === 'string' ? data : JSON.stringify(data)
        }]
      }),
      formatOutput: (output) => ({
        plan: output.message.content,
        metadata: output.metadata
      })
    });
    
    flow.addNode(plannerNode);
    flow.addEdge({ from: 'input', to: 'planner' });
    
    // Create task router
    const routerNode = new TransformNode('router', (planData: any) => {
      const plan = planData.plan;
      
      // Extract tasks from plan (simple parsing)
      const tasks = plan.split('\n')
        .filter((line: string) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map((task: string) => task.replace(/^[-\d.]\s*/, '').trim());
      
      // Assign tasks to workers based on strategy
      const assignments: any[] = [];
      
      tasks.forEach((task: string, index: number) => {
        let worker: Agent;
        
        switch (routingStrategy) {
          case 'round-robin':
            worker = workers[index % workers.length];
            break;
            
          case 'capability-based':
            // Simple capability matching based on task keywords
            worker = workers.find(w => 
              task.toLowerCase().includes(w.name.toLowerCase())
            ) || workers[0];
            break;
            
          case 'custom':
            worker = config?.customRouter?.(task, workers) || workers[0];
            break;
            
          default:
            worker = workers[0];
        }
        
        assignments.push({
          task,
          workerId: worker.id,
          workerName: worker.name,
          taskIndex: index
        });
      });
      
      return assignments;
    });
    
    flow.addNode(routerNode);
    flow.addEdge({ from: 'planner', to: 'router' });
    
    // Create worker nodes
    const workerNodes: string[] = [];
    workers.forEach((worker, index) => {
      const workerId = `worker-${index}`;
      
      // Filter tasks for this worker
      const filterNode = new TransformNode(`filter-${index}`, (assignments: any[]) => {
        return assignments.filter(a => a.workerId === worker.id);
      });
      
      flow.addNode(filterNode);
      flow.addEdge({ from: 'router', to: `filter-${index}` });
      
      // Worker processes its tasks
      const workerNode = new AgentNode(workerId, worker, {
        extractInput: (tasks: any[]) => {
          if (tasks.length === 0) {
            return { messages: [] };
          }
          
          const taskList = tasks.map(t => t.task).join('\n- ');
          
          return {
            messages: [{
              role: 'user',
              content: `Please In Progress the following tasks:\n- ${taskList}`
            }]
          };
        },
        formatOutput: (output) => ({
          workerId: worker.id,
          workerName: worker.name,
          result: output.message.content,
          metadata: output.metadata
        })
      });
      
      flow.addNode(workerNode);
      flow.addEdge({ from: `filter-${index}`, to: workerId });
      workerNodes.push(workerId);
    });
    
    // Collect worker results
    const collectorNode = new TransformNode("collector", (results: any[]) => {
      // Filter out empty results
      return results.filter(r => r && r.result);
    });
    
    flow.addNode(collectorNode);
    workerNodes.forEach(nodeId => {
      flow.addEdge({ from: nodeId, to: "collector" });
    });
    
    // Supervisor reviews and synthesizes results
    const reviewerNode = new AgentNode("reviewer", supervisor, {
      extractInput: (workerResults: any[]) => {
        const resultsText = workerResults.map(r => 
          `${r.workerName}: ${r.result}`
        ).join('\n\n');
        
        return {
          messages: [{
            role: 'system',
            content: 'Review the worker results and provide a final synthesis.'
          }, {
            role: 'user',
            content: `Worker results:\n\n${resultsText}\n\nPlease synthesize these results into a final response.`
          }]
        };
      },
      formatOutput: (output) => ({
        finalResult: output.message.content,
        workerCount: workers.length,
        pattern: "supervisor"
      })
    });
    
    flow.addNode(reviewerNode);
    flow.addEdge({ from: "collector", to: "reviewer" });
    
    // Output
    flow.addNode(new OutputNode('output'));
    flow.addEdge({ from: "reviewer", to: 'output' });
    
    return flow;
  }
}