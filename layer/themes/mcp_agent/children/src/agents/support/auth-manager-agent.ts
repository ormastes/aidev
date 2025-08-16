/**
 * Auth Manager Agent
 * Handles authentication configuration
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class AuthManagerAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `auth-manager-${Date.now()}`,
      role: {
        ...AGENT_ROLES.GENERAL,
        name: 'auth-manager',
        description: 'Authentication and authorization specialist',
        systemPrompt: 'You are the Auth Manager responsible for handling authentication configuration, OAuth setup, and security best practices.'
      },
      capabilities: [
        {
          name: 'oauth_configuration',
          description: 'Configure OAuth providers',
          enabled: true
        },
        {
          name: 'token_management',
          description: 'Manage authentication tokens',
          enabled: true
        },
        {
          name: 'security_audit',
          description: 'Audit security configurations',
          enabled: true
        }
      ]
    });
  }
}