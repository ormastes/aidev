import { Session, Message, ToolCall } from '../../children/src/domain/session';

describe('Session Domain Model', () => {
  describe('Session Creation', () => {
    it('should create a session with required fields', () => {
      const session = new Session({
        id: 'session-123',
        agentId: 'agent-456',
        agentRole: 'developer',
        model: 'claude-3-opus'
      });

      expect(session.getId()).toBe('session-123');
      expect(session.getAgentId()).toBe('agent-456');
      expect(session.getAgentRole()).toBe('developer');
      expect(session.getModel()).toBe('claude-3-opus');
      expect(session.isActive()).toBe(true);
      expect(session.getMessageCount()).toBe(0);
    });

    it('should accept additional metadata', () => {
      const session = new Session({
        id: 'session-meta',
        agentId: 'agent-789',
        agentRole: 'tester',
        model: 'claude-3-sonnet',
        metadata: {
          temperature: 0.7,
          maxTokens: 2000,
          tools: ['filesystem', 'git'],
          tags: ['testing', 'automation']
        }
      });

      const metadata = session.getMetadata();
      expect(metadata.temperature).toBe(0.7);
      expect(metadata.maxTokens).toBe(2000);
      expect(metadata.tools).toEqual(['filesystem', 'git']);
      expect(metadata.tags).toEqual(['testing', 'automation']);
    });
  });

  describe('Message Management', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session({
        id: 'msg-session',
        agentId: 'agent-123',
        agentRole: 'general',
        model: 'claude-3-haiku'
      });
    });

    it('should add system message', () => {
      const message = session.addSystemMessage('You are a helpful assistant');
      
      expect(message.role).toBe('system');
      expect(message.content).toBe('You are a helpful assistant');
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(session.getMessageCount()).toBe(1);
    });

    it('should add user message', () => {
      const message = session.addUserMessage('Hello, world!');
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, world!');
      expect(session.getLastMessage()).toBe(message);
    });

    it('should add assistant message with metadata', () => {
      const metadata = {
        model: 'claude-3-opus',
        cost: 0.01,
        duration: 1500,
        turnCount: 1
      };

      const message = session.addAssistantMessage('Hello! How can I help?', metadata);
      
      expect(message.role).toBe('assistant');
      expect(message.metadata).toEqual(metadata);
    });

    it('should add tool call', () => {
      const toolCall: ToolCall = {
        id: 'tool-123',
        name: 'filesystem_read',
        arguments: { path: '/test.txt' }
      };

      const message = session.addToolCall(toolCall);
      
      expect(message.role).toBe('tool');
      expect(message.metadata?.toolCalls).toHaveLength(1);
      expect(message.metadata?.toolCalls?.[0]).toBe(toolCall);
    });

    it('should add tool result', () => {
      const result = { content: 'File contents' };
      const message = session.addToolResult('tool-123', result);
      
      expect(message.role).toBe('result');
      expect(message.content).toBe(JSON.stringify(result));
      expect(message.metadata?.toolCalls?.[0].result).toBe(result);
    });

    it('should add tool error', () => {
      const error = 'File not found';
      const message = session.addToolResult('tool-456', null, error);
      
      expect(message.role).toBe('result');
      expect(message.content).toBe(error);
      expect(message.metadata?.toolCalls?.[0].error).toBe(error);
    });

    it('should filter messages by role', () => {
      session.addSystemMessage('System prompt');
      session.addUserMessage('User input 1');
      session.addAssistantMessage('Response 1');
      session.addUserMessage('User input 2');
      session.addAssistantMessage('Response 2');

      const userMessages = session.getMessagesByRole('user');
      expect(userMessages).toHaveLength(2);
      expect(userMessages[0].content).toBe('User input 1');
      expect(userMessages[1].content).toBe('User input 2');

      const assistantMessages = session.getMessagesByRole('assistant');
      expect(assistantMessages).toHaveLength(2);
    });
  });

  describe('Context Management', () => {
    let session: Session;

    beforeEach(() => {
      session = new Session({
        id: 'ctx-session',
        agentId: 'agent-ctx',
        agentRole: 'developer',
        model: 'claude-3-opus'
      });

      // Add some messages
      session.addSystemMessage('System prompt');
      session.addUserMessage('Message 1');
      session.addAssistantMessage('Response 1');
      session.addUserMessage('Message 2');
      session.addAssistantMessage('Response 2');
    });

    it('should get full context', () => {
      const context = session.getContext();
      expect(context).toHaveLength(5);
    });

    it('should get limited context', () => {
      const context = session.getContext(3);
      expect(context).toHaveLength(3);
      expect(context[0].content).toBe('Response 1');
      expect(context[2].content).toBe('Response 2');
    });

    it('should calculate turn count', () => {
      const turnCount = session.getTurnCount();
      expect(turnCount).toBe(4); // 2 user + 2 assistant
    });

    it('should estimate tokens', () => {
      const estimate = session.getTokenEstimate();
      expect(estimate).toBeGreaterThan(0);
      // Rough check - should be reasonable for the messages
      expect(estimate).toBeLessThan(100);
    });
  });

  describe('Session Lifecycle', () => {
    it('should update last accessed time', () => {
      const session = new Session({
        id: 'lifecycle-session',
        agentId: 'agent-lc',
        agentRole: 'general',
        model: 'claude-3-haiku'
      });

      const initialAccess = session.getLastAccessedAt();
      
      // Wait a bit and touch
      setTimeout(() => {
        session.touch();
        const newAccess = session.getLastAccessedAt();
        expect(newAccess.getTime()).toBeGreaterThan(initialAccess.getTime());
      }, 10);
    });

    it('should close and reopen session', () => {
      const session = new Session({
        id: 'close-session',
        agentId: 'agent-close',
        agentRole: 'general',
        model: 'claude-3-haiku'
      });

      expect(session.isActive()).toBe(true);

      session.close();
      expect(session.isActive()).toBe(false);

      session.reopen();
      expect(session.isActive()).toBe(true);
    });
  });

  describe('Metadata Management', () => {
    it('should update metadata', () => {
      const session = new Session({
        id: 'meta-session',
        agentId: 'agent-meta',
        agentRole: 'architect',
        model: 'claude-3-opus'
      });

      session.updateMetadata({
        temperature: 0.8,
        customField: 'value'
      });

      const metadata = session.getMetadata();
      expect(metadata.temperature).toBe(0.8);
      expect(metadata.customField).toBe('value');
    });

    it('should manage tags', () => {
      const session = new Session({
        id: 'tag-session',
        agentId: 'agent-tag',
        agentRole: 'coordinator',
        model: 'claude-3-sonnet'
      });

      session.addTag('important');
      session.addTag('review');
      session.addTag('important'); // Duplicate should not be added

      const metadata = session.getMetadata();
      expect(metadata.tags).toEqual(['important', 'review']);
    });
  });

  describe('Summary Generation', () => {
    it('should generate session summary', () => {
      const session = new Session({
        id: 'summary-session',
        agentId: 'agent-sum',
        agentRole: 'developer',
        model: 'claude-3-opus'
      });

      session.addUserMessage('Hello');
      session.addAssistantMessage('Hi there!');

      const summary = session.generateSummary();
      expect(summary).toContain('summary-session');
      expect(summary).toContain('developer');
      expect(summary).toContain('Messages: 2');
      expect(summary).toContain('Turns: 2');
      expect(summary).toContain('claude-3-opus');
      expect(summary).toContain('Active: true');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const session = new Session({
        id: 'serial-session',
        agentId: 'agent-serial',
        agentRole: 'tester',
        model: 'claude-3-haiku'
      });

      session.addUserMessage('Test message');
      session.addTag('test');

      const json = session.toJSON();
      expect(json).toHaveProperty('id', 'serial-session');
      expect(json).toHaveProperty('messages');
      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('lastAccessedAt');
      expect(json).toHaveProperty('active');
    });

    it('should deserialize from JSON', () => {
      const original = new Session({
        id: 'original-session',
        agentId: 'agent-orig',
        agentRole: 'architect',
        model: 'claude-3-opus',
        metadata: { temperature: 0.5 }
      });

      original.addUserMessage('Hello');
      original.addAssistantMessage('Hi!');
      original.close();

      const json = original.toJSON();
      const restored = Session.fromJSON(json);

      expect(restored.getId()).toBe('original-session');
      expect(restored.getMessageCount()).toBe(2);
      expect(restored.isActive()).toBe(false);
      expect(restored.getMetadata().temperature).toBe(0.5);
    });

    it('should export session', () => {
      const session = new Session({
        id: 'export-session',
        agentId: 'agent-export',
        agentRole: 'general',
        model: 'claude-3-sonnet'
      });

      const exported = session.export();
      expect(exported).toContain('export-session');
      expect(exported).toContain('claude-3-sonnet');
      
      // Should be valid JSON
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });
});