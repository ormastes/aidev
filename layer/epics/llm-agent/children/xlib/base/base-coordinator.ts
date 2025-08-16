/**
 * Base Coordinator implementation
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from './base-agent';
import {
  ICoordinator,
  IAgent,
  AgentRequest,
  Workflow,
  WorkflowResult,
  StepResult
} from '../interfaces/base.interfaces';

export abstract class BaseCoordinator extends BaseAgent implements ICoordinator {
  protected agents: Map<string, IAgent>;
  protected agentsByRole: Map<string, IAgent[]>;
  protected workflows: Map<string, Workflow>;

  constructor(id: string, name: string, version: string = '1.0.0') {
    super(id, name, version, ["coordination", "orchestration"]);
    this.agents = new Map();
    this.agentsByRole = new Map();
    this.workflows = new Map();
  }

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent);
    
    // Also index by capabilities for role-based routing
    for (const capability of agent.capabilities) {
      if (!this.agentsByRole.has(capability)) {
        this.agentsByRole.set(capability, []);
      }
      this.agentsByRole.get(capability)!.push(agent);
    }

    this.emit('agent:registered', { agentId: agent.id, capabilities: agent.capabilities });
  }

  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Remove from main registry
    this.agents.delete(agentId);

    // Remove from role index
    for (const [role, agents] of this.agentsByRole.entries()) {
      const filtered = agents.filter(a => a.id !== agentId);
      if (filtered.length === 0) {
        this.agentsByRole.delete(role);
      } else {
        this.agentsByRole.set(role, filtered);
      }
    }

    this.emit('agent:unregistered', { agentId });
  }

  async routeRequest(request: AgentRequest): Promise<IAgent> {
    // Default routing implementation - can be overridden
    const agent = await this.selectAgent(request);
    if (!agent) {
      throw new Error('No suitable agent found for request');
    }
    return agent;
  }

  async orchestrate(workflow: Workflow): Promise<WorkflowResult> {
    const workflowId = workflow.id || uuidv4();
    const startTime = new Date();
    const results: StepResult[] = [];

    try {
      this.emit('workflow:started', { workflowId, workflow });

      // Store workflow for reference
      this.workflows.set(workflowId, workflow);

      // Execute steps
      if (workflow.parallel) {
        // Execute all steps in parallel
        const stepPromises = workflow.steps.map(step => 
          this.executeStep(workflowId, step, workflow)
        );
        const stepResults = await Promise.allSettled(stepPromises);
        
        for (let i = 0; i < stepResults.length; i++) {
          const result = stepResults[i];
          const step = workflow.steps[i];
          
          if (result.status === "fulfilled") {
            results.push(result.value);
          } else {
            results.push({
              stepId: step.id,
              status: 'failed',
              error: result.reason?.message || 'Step execution failed',
              duration: 0
            });
          }
        }
      } else {
        // Execute steps sequentially
        for (const step of workflow.steps) {
          // Check dependencies
          if (step.dependencies) {
            const failedDeps = step.dependencies.filter(depId => 
              results.find(r => r.stepId === depId && r.status === 'failed')
            );
            
            if (failedDeps.length > 0) {
              results.push({
                stepId: step.id,
                status: 'skipped',
                error: `Dependencies failed: ${failedDeps.join(', ')}`,
                duration: 0
              });
              continue;
            }
          }

          try {
            const stepResult = await this.executeStep(workflowId, step, workflow);
            results.push(stepResult);
          } catch (error) {
            results.push({
              stepId: step.id,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: 0
            });
            
            // Stop on first failure in sequential mode
            break;
          }
        }
      }

      // Determine overall status
      const hasFailures = results.some(r => r.status === 'failed');
      const allFailed = results.every(r => r.status === 'failed');
      const status = allFailed ? 'failed' : hasFailures ? 'partial' : 'success';

      const workflowResult: WorkflowResult = {
        workflowId,
        status,
        results,
        startTime,
        endTime: new Date()
      };

      this.emit('workflow:completed', { workflowId, result: workflowResult });
      return workflowResult;

    } catch (error) {
      const workflowResult: WorkflowResult = {
        workflowId,
        status: 'failed',
        results,
        startTime,
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Workflow execution failed'
      };

      this.emit('workflow:failed', { workflowId, error });
      return workflowResult;
    } finally {
      // Clean up stored workflow
      this.workflows.delete(workflowId);
    }
  }

  // Helper methods
  protected async selectAgent(request: AgentRequest): Promise<IAgent | null> {
    // Override this method for custom agent selection logic
    // Default: return first available agent
    const agents = Array.from(this.agents.values());
    return agents.length > 0 ? agents[0] : null;
  }

  protected async executeStep(
    workflowId: string,
    step: WorkflowStep,
    workflow: Workflow
  ): Promise<StepResult> {
    const stepStartTime = Date.now();

    try {
      // Find agent for this step
      let agent: IAgent | null = null;
      
      if (step.agentRole) {
        const roleAgents = this.agentsByRole.get(step.agentRole);
        if (roleAgents && roleAgents.length > 0) {
          // Select first available agent with the role
          agent = roleAgents[0];
        }
      }

      if (!agent) {
        // Use default agent selection
        agent = await this.selectAgent({
          messages: [{
            role: 'system',
            content: `Execute workflow step: ${step.taskType}`
          }]
        });
      }

      if (!agent) {
        throw new Error(`No agent available for step ${step.id}`);
      }

      // Create request for the step
      const stepRequest: AgentRequest = {
        id: `${workflowId}-${step.id}`,
        messages: [{
          role: 'system',
          content: `Workflow: ${workflow.name}\nStep: ${step.taskType}\nConfig: ${JSON.stringify(step.config || {})}`
        }],
        options: {
          metadata: {
            workflowId,
            stepId: step.id,
            stepConfig: step.config
          }
        }
      };

      // Execute the step
      this.emit('workflow:step:started', { workflowId, stepId: step.id });
      const response = await agent.process(stepRequest);
      
      const duration = Date.now() - stepStartTime;
      
      this.emit('workflow:step:completed', { workflowId, stepId: step.id });
      
      return {
        stepId: step.id,
        status: 'success',
        result: response,
        duration
      };

    } catch (error) {
      const duration = Date.now() - stepStartTime;
      
      this.emit('workflow:step:failed', { workflowId, stepId: step.id, error });
      
      return {
        stepId: step.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Step execution failed',
        duration
      };
    }
  }

  // List registered agents
  listAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentsByRole(role: string): IAgent[] {
    return this.agentsByRole.get(role) || [];
  }
}