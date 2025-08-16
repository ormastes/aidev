/**
 * Agent Factory Tests
 * Tests for all agent types
 */

import { 
  createAgent,
  AGENT_TYPES,
  AgentType,
  Agent
} from '../src';

describe('Agent Factory', () => {
  describe('Core Agents', () => {
    AGENT_TYPES.core.forEach(type => {
      it(`should create ${type} agent`, () => {
        const agent = createAgent(type);
        expect(agent).toBeInstanceOf(Agent);
        expect(agent.getId()).toContain(type);
        expect(agent.isActive()).toBe(true);
      });
    });

    it('should create Task Manager with correct role', () => {
      const agent = createAgent('task-manager');
      expect(agent.getRoleName()).toBe('coordinator');
    });

    it('should create Coder with developer role', () => {
      const agent = createAgent('coder');
      expect(agent.getRoleName()).toBe('developer');
    });

    it('should create Tester with tester role', () => {
      const agent = createAgent('tester');
      expect(agent.getRoleName()).toBe('tester');
    });

    it('should create Refactor agent with developer role', () => {
      const agent = createAgent('refactor');
      expect(agent.getRoleName()).toBe('developer');
    });
  });

  describe('Specialized Agents', () => {
    AGENT_TYPES.specialized.forEach(type => {
      it(`should create ${type} agent`, () => {
        const agent = createAgent(type);
        expect(agent).toBeInstanceOf(Agent);
        expect(agent.getId()).toContain(type);
        expect(agent.isActive()).toBe(true);
      });
    });

    it('should create GUI Coordinator with architect role', () => {
      const agent = createAgent('gui-coordinator');
      expect(agent.getRoleName()).toBe('architect');
    });

    it('should create Mobile Automation agent', () => {
      const agent = createAgent('mobile-automation');
      expect(agent).toBeDefined();
      expect(agent.isActive()).toBe(true);
    });

    it('should create API Checker with tester role', () => {
      const agent = createAgent('api-checker');
      expect(agent.getRoleName()).toBe('tester');
    });

    it('should create DevOps agent', () => {
      const agent = createAgent('devops');
      expect(agent).toBeDefined();
      expect(agent.isActive()).toBe(true);
    });
  });

  describe('Support Agents', () => {
    AGENT_TYPES.support.forEach(type => {
      it(`should create ${type} agent`, () => {
        const agent = createAgent(type);
        expect(agent).toBeInstanceOf(Agent);
        expect(agent.getId()).toContain(type);
        expect(agent.isActive()).toBe(true);
      });
    });

    it('should create Context Manager agent', () => {
      const agent = createAgent('context-manager');
      expect(agent).toBeDefined();
      expect(agent.isActive()).toBe(true);
    });

    it('should create Auth Manager agent', () => {
      const agent = createAgent('auth-manager');
      expect(agent).toBeDefined();
      expect(agent.isActive()).toBe(true);
    });

    it('should create Setup agent', () => {
      const agent = createAgent('setup');
      expect(agent).toBeDefined();
      expect(agent.isActive()).toBe(true);
    });

    it('should create Feature Manager with coordinator role', () => {
      const agent = createAgent('feature-manager');
      expect(agent.getRoleName()).toBe('coordinator');
    });
  });

  describe('Agent Creation with Custom ID', () => {
    it('should create agent with custom ID', () => {
      const customId = 'custom-agent-123';
      const agent = createAgent('task-manager', customId);
      expect(agent.getId()).toBe(customId);
    });

    it('should generate ID when not provided', () => {
      const agent1 = createAgent('coder');
      const agent2 = createAgent('coder');
      expect(agent1.getId()).not.toBe(agent2.getId());
    });
  });

  describe('Agent Creation Error Handling', () => {
    it('should throw error for unknown agent type', () => {
      expect(() => createAgent('unknown-agent' as AgentType)).toThrow('Unknown agent type');
    });

    it('should throw error for null agent type', () => {
      expect(() => createAgent(null as any)).toThrow();
    });

    it('should throw error for undefined agent type', () => {
      expect(() => createAgent(undefined as any)).toThrow();
    });
  });

  describe('Agent Capabilities', () => {
    it('should have capabilities based on role', () => {
      const developer = createAgent('coder');
      const capabilities = developer.getEnabledCapabilities();
      
      expect(capabilities).toContain('code_generation');
      expect(capabilities).toContain('code_review');
      expect(capabilities).toContain('debugging');
      expect(capabilities).toContain('testing');
    });

    it('should allow capability management', () => {
      const agent = createAgent('tester');
      
      // Check initial capabilities
      const capabilities = agent.getEnabledCapabilities();
      expect(capabilities).toContain('test_generation');
      
      // Disable a capability
      agent.disableCapability('test_generation');
      expect(agent.getEnabledCapabilities()).not.toContain('test_generation');
      
      // Re-enable it
      agent.enableCapability('test_generation');
      expect(agent.getEnabledCapabilities()).toContain('test_generation');
    });

    it('should add new capabilities', () => {
      const agent = createAgent('task-manager');
      
      agent.addCapability({
        name: 'custom_capability',
        description: 'A custom capability',
        enabled: true
      });
      
      expect(agent.getEnabledCapabilities()).toContain('custom_capability');
    });
  });

  describe('Agent Metadata', () => {
    it('should allow metadata updates', () => {
      const agent = createAgent('coder');
      
      agent.updateMetadata({ project: 'test-project' });
      const metadata = agent.getMetadata();
      
      expect(metadata.project).toBe('test-project');
    });

    it('should preserve existing metadata on update', () => {
      const agent = createAgent('tester');
      
      agent.updateMetadata({ key1: 'value1' });
      agent.updateMetadata({ key2: 'value2' });
      
      const metadata = agent.getMetadata();
      expect(metadata.key1).toBe('value1');
      expect(metadata.key2).toBe('value2');
    });
  });

  describe('Agent Lifecycle', () => {
    it('should start in active state', () => {
      const agent = createAgent('task-manager');
      expect(agent.isActive()).toBe(true);
    });

    it('should activate and deactivate', () => {
      const agent = createAgent('coder');
      
      agent.deactivate();
      expect(agent.isActive()).toBe(false);
      
      agent.activate();
      expect(agent.isActive()).toBe(true);
    });

    it('should track creation time', () => {
      const beforeCreation = new Date();
      const agent = createAgent('tester');
      const afterCreation = new Date();
      
      const createdAt = agent.getCreatedAt();
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('Agent System Prompts', () => {
    it('should have system prompt based on role', () => {
      const developer = createAgent('coder');
      const prompt = developer.getSystemPrompt();
      expect(prompt).toContain('software developer');
    });

    it('should have tester prompt for test agents', () => {
      const tester = createAgent('tester');
      const prompt = tester.getSystemPrompt();
      expect(prompt).toContain('QA specialist');
    });
  });
});