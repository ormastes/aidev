import { Agent, AGENT_ROLES, AgentCapability } from '../../children/src/domain/agent';

describe('Agent Domain Model', () => {
  describe('Agent Creation', () => {
    it('should create an agent with developer role', () => {
      const agent = new Agent({
        id: 'agent-123',
        role: AGENT_ROLES.DEVELOPER
      });

      expect(agent.getId()).toBe('agent-123');
      expect(agent.getRoleName()).toBe('developer');
      expect(agent.isActive()).toBe(true);
      expect(agent.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('should initialize with default capabilities for role', () => {
      const agent = new Agent({
        id: 'agent-456',
        role: AGENT_ROLES.TESTER
      });

      const capabilities = agent.getEnabledCapabilities();
      expect(capabilities).toContain('test_generation');
      expect(capabilities).toContain('test_execution');
      expect(capabilities).toContain('bug_reporting');
      expect(capabilities).toContain('coverage_analysis');
    });

    it('should accept custom capabilities', () => {
      const customCapability: AgentCapability = {
        name: 'custom_tool',
        description: 'Custom tool capability',
        enabled: true
      };

      const agent = new Agent({
        id: 'agent-789',
        role: AGENT_ROLES.GENERAL,
        capabilities: [customCapability]
      });

      expect(agent.hasCapability('custom_tool')).toBe(true);
    });

    it('should store metadata', () => {
      const metadata = {
        project: 'test-project',
        environment: 'development'
      };

      const agent = new Agent({
        id: 'agent-meta',
        role: AGENT_ROLES.COORDINATOR,
        metadata
      });

      expect(agent.getMetadata()).toEqual(metadata);
      expect(agent.getMetadataValue('project')).toBe('test-project');
    });
  });

  describe('Capability Management', () => {
    let agent: Agent;

    beforeEach(() => {
      agent = new Agent({
        id: 'test-agent',
        role: AGENT_ROLES.DEVELOPER
      });
    });

    it('should check capability existence', () => {
      expect(agent.hasCapability('code_generation')).toBe(true);
      expect(agent.hasCapability('non_existent')).toBe(false);
    });

    it('should enable and disable capabilities', () => {
      agent.disableCapability('code_generation');
      expect(agent.hasCapability('code_generation')).toBe(false);

      agent.enableCapability('code_generation');
      expect(agent.hasCapability('code_generation')).toBe(true);
    });

    it('should add new capabilities', () => {
      const newCapability: AgentCapability = {
        name: 'database_management',
        description: 'Database operations',
        enabled: true
      };

      agent.addCapability(newCapability);
      expect(agent.hasCapability('database_management')).toBe(true);
    });

    it('should return only enabled capabilities', () => {
      agent.disableCapability('debugging');
      const enabled = agent.getEnabledCapabilities();
      
      expect(enabled).toContain('code_generation');
      expect(enabled).toContain('code_review');
      expect(enabled).not.toContain('debugging');
    });
  });

  describe('Agent Lifecycle', () => {
    it('should activate and deactivate agent', () => {
      const agent = new Agent({
        id: 'lifecycle-agent',
        role: AGENT_ROLES.ARCHITECT
      });

      expect(agent.isActive()).toBe(true);

      agent.deactivate();
      expect(agent.isActive()).toBe(false);

      agent.activate();
      expect(agent.isActive()).toBe(true);
    });
  });

  describe('System Prompts', () => {
    it('should return system prompt for role', () => {
      const agent = new Agent({
        id: 'prompt-agent',
        role: AGENT_ROLES.DEVELOPER
      });

      const prompt = agent.getSystemPrompt();
      expect(prompt).toContain('skilled software developer');
      expect(prompt).toContain('coding tasks');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const agent = new Agent({
        id: 'serial-agent',
        role: AGENT_ROLES.TESTER,
        metadata: { version: '1.0' }
      });

      const json = agent.toJSON();
      expect(json).toHaveProperty('id', 'serial-agent');
      expect(json).toHaveProperty('role');
      expect(json).toHaveProperty('capabilities');
      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('active', true);
    });

    it('should deserialize from JSON', () => {
      const originalAgent = new Agent({
        id: 'original',
        role: AGENT_ROLES.COORDINATOR,
        metadata: { key: 'value' }
      });

      const json = originalAgent.toJSON();
      const restoredAgent = Agent.fromJSON(json);

      expect(restoredAgent.getId()).toBe('original');
      expect(restoredAgent.getRoleName()).toBe('coordinator');
      expect(restoredAgent.getMetadataValue('key')).toBe('value');
    });
  });

  describe('Metadata Management', () => {
    it('should update metadata values', () => {
      const agent = new Agent({
        id: 'metadata-agent',
        role: AGENT_ROLES.GENERAL
      });

      agent.setMetadata('newKey', 'newValue');
      expect(agent.getMetadataValue('newKey')).toBe('newValue');

      agent.setMetadata('complex', { nested: true });
      expect(agent.getMetadataValue('complex')).toEqual({ nested: true });
    });
  });
});