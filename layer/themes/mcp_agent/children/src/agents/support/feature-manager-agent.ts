/**
 * Feature Manager Agent
 * Feature planning and tracking
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class FeatureManagerAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `feature-manager-${Date.now()}`,
      role: {
        ...AGENT_ROLES.COORDINATOR,
        name: 'feature-manager',
        description: 'Feature planning and tracking specialist',
        systemPrompt: 'You are the Feature Manager responsible for planning features, tracking implementation progress, and managing the feature backlog.'
      },
      capabilities: [
        {
          name: 'feature_planning',
          description: 'Plan and design features',
          enabled: true
        },
        {
          name: 'progress_tracking',
          description: 'Track feature implementation',
          enabled: true
        },
        {
          name: 'backlog_management',
          description: 'Manage feature backlog',
          enabled: true
        }
      ]
    });
  }
}