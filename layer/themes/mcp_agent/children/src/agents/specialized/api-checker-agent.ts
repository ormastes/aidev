/**
 * API Checker Agent
 * Validates API contracts and integration
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class APICheckerAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `api-checker-${Date.now()}`,
      role: {
        ...AGENT_ROLES.TESTER,
        name: 'api-checker',
        description: 'API contract validation and integration testing specialist',
        systemPrompt: 'You are the API Checker responsible for validating API contracts, testing integrations, and ensuring API compatibility.'
      },
      capabilities: [
        {
          name: 'contract_validation',
          description: 'Validate API contracts and schemas',
          enabled: true
        },
        {
          name: 'integration_testing',
          description: 'Test API integrations',
          enabled: true
        },
        {
          name: 'performance_testing',
          description: 'Test API performance and load',
          enabled: true
        }
      ]
    });
  }
}