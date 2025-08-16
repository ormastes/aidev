/**
 * DevOps Agent
 * Handles deployment and infrastructure
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class DevOpsAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `devops-${Date.now()}`,
      role: {
        ...AGENT_ROLES.ARCHITECT,
        name: 'devops',
        description: 'Deployment and infrastructure specialist',
        systemPrompt: 'You are the DevOps specialist responsible for CI/CD pipelines, deployment automation, and infrastructure management.'
      },
      capabilities: [
        {
          name: 'ci_cd_pipeline',
          description: 'Manage CI/CD pipelines',
          enabled: true
        },
        {
          name: 'deployment_automation',
          description: 'Automate deployments',
          enabled: true
        },
        {
          name: 'infrastructure_management',
          description: 'Manage cloud infrastructure',
          enabled: true
        },
        {
          name: 'monitoring_setup',
          description: 'Set up monitoring and alerts',
          enabled: true
        }
      ]
    });
  }
}