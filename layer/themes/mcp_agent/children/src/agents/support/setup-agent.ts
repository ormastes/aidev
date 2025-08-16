/**
 * Setup Agent
 * Project initialization and configuration
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class SetupAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `setup-${Date.now()}`,
      role: {
        ...AGENT_ROLES.GENERAL,
        name: 'setup',
        description: 'Project setup and initialization specialist',
        systemPrompt: 'You are the Setup specialist responsible for project initialization, dependency installation, and environment configuration.'
      },
      capabilities: [
        {
          name: 'project_initialization',
          description: 'Initialize new projects',
          enabled: true
        },
        {
          name: 'dependency_management',
          description: 'Manage project dependencies',
          enabled: true
        },
        {
          name: 'environment_configuration',
          description: 'Configure development environments',
          enabled: true
        }
      ]
    });
  }
}