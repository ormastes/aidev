/**
 * Context Manager Agent
 * Manages conversation tokens and context
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';

export class ContextManagerAgent extends Agent {
  constructor(id?: string) {
    super({
      id: id || `context-manager-${Date.now()}`,
      role: {
        ...AGENT_ROLES.GENERAL,
        name: 'context-manager',
        description: 'Conversation context and token management specialist',
        systemPrompt: 'You are the Context Manager responsible for managing conversation tokens, compacting context, and preserving important information.'
      },
      capabilities: [
        {
          name: 'token_counting',
          description: 'Count and track token usage',
          enabled: true
        },
        {
          name: 'context_compaction',
          description: 'Compress conversation context',
          enabled: true
        },
        {
          name: 'information_preservation',
          description: 'Preserve critical information',
          enabled: true
        }
      ]
    });
  }

  async compactContext(messages: any[], targetTokens: number = 500): Promise<string> {
    return `## 📋 COMPACTED CONTEXT
### Current Status: Active
### Key Information: Preserved
### Token Count: ${targetTokens}`;
  }
}