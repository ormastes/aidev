import { BaseCoordinatorAgent, Message, CoordinatorConfig, CoordinatorCapabilities } from '../../../src/agents/coordinator-interface';

// Test implementation of BaseCoordinatorAgent
class TestCoordinatorAgent extends BaseCoordinatorAgent {
  readonly capabilities: CoordinatorCapabilities = {
    chat: true,
    math: false,
    code: false,
    summarize: true,
    moderate: false,
    analyze: false,
    translate: false,
    help: true,
    streaming: false
  };

  public onStartCalled = false;
  public onStopCalled = false;
  public generateResponseCalled = false;
  public lastGeneratedResponse = '';
  public sendResponseCalled = false;
  public lastSentResponse = '';

  protected async onStart(): Promise<void> {
    this.onStartCalled = true;
  }

  protected async onStop(): Promise<void> {
    this.onStopCalled = true;
  }

  protected async generateResponse(message: Message, _context: Message[]): Promise<string> {
    this.generateResponseCalled = true;
    this.lastGeneratedResponse = `Response to: ${message.content}`;
    return this.lastGeneratedResponse;
  }

  protected getHelpMessage(): string {
    return 'Test help message';
  }
  
  public testGetHelpMessage(): string {
    return this.getHelpMessage();
  }

  protected async sendResponse(content: string): Promise<void> {
    this.sendResponseCalled = true;
    this.lastSentResponse = content;
  }

  // Expose protected methods for testing
  public testShouldRespond(message: Message): boolean {
    return this.shouldRespond(message);
  }

  public testGetContext(): Message[] {
    return this.getContext();
  }

  public async testSummarizeConversation(): Promise<string> {
    return this.summarizeConversation();
  }

  public get messages(): Message[] {
    return this.messageHistory;
  }

  public set messages(messages: Message[]) {
    this.messageHistory = messages;
  }
}

describe('BaseCoordinatorAgent', () => {
  let agent: TestCoordinatorAgent;
  let config: CoordinatorConfig;

  beforeEach(() => {
    config = {
      serverUrl: 'ws://localhost:3000',
      roomId: 'test-room',
      agentName: 'TestBot',
      authToken: 'test-token',
      reconnectAttempts: 3,
      reconnectDelay: 1000
    };
    
    agent = new TestCoordinatorAgent(config);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(agent['config']).toBe(config);
      expect(agent['isConnected']).toBe(false);
      expect(agent['messageHistory']).toEqual([]);
    });
  });

  describe('start', () => {
    it('should call onStart and set connected status', async () => {
      await agent.start();
      
      expect(agent.onStartCalled).toBe(true);
      expect(agent['isConnected']).toBe(true);
    });
  });

  describe('stop', () => {
    it('should call onStop and set disconnected status', async () => {
      await agent.start();
      await agent.stop();
      
      expect(agent.onStopCalled).toBe(true);
      expect(agent['isConnected']).toBe(false);
    });
  });

  describe('processMessage', () => {
    const createMessage = (content: string, username = 'user'): Message => ({
      id: '123',
      username,
      content,
      timestamp: new Date(),
      roomId: 'test-room'
    });

    it('should add message to history', async () => {
      const message = createMessage('Hello');
      
      await agent.processMessage(message);
      
      expect(agent.messages).toContainEqual(message);
    });

    it('should respond when shouldRespond returns true', async () => {
      const message = createMessage('Hello TestBot');
      
      await agent.processMessage(message);
      
      expect(agent.generateResponseCalled).toBe(true);
      expect(agent.sendResponseCalled).toBe(true);
      expect(agent.lastSentResponse).toBe('Response to: Hello TestBot');
    });

    it('should not respond when shouldRespond returns false', async () => {
      const message = createMessage('Random message');
      
      await agent.processMessage(message);
      
      expect(agent.generateResponseCalled).toBe(false);
      expect(agent.sendResponseCalled).toBe(false);
    });

    it('should not send response when generateResponse returns empty', async () => {
      // Override the generateResponse method to return empty string
      agent.lastGeneratedResponse = '';
      jest.spyOn(agent as any, 'generateResponse').mockResolvedValue('');
      
      const message = createMessage('Hello TestBot');
      
      await agent.processMessage(message);
      
      expect(agent.sendResponseCalled).toBe(false);
    });
  });

  describe('shouldRespond', () => {
    it('should not respond to own messages', () => {
      const message: Message = {
        id: '123',
        username: 'TestBot',
        content: 'My own message',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      expect(agent.testShouldRespond(message)).toBe(false);
    });

    it('should respond when mentioned by name', () => {
      const message1: Message = {
        id: '123',
        username: 'user',
        content: 'Hey TestBot, how are you?',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      const message2: Message = {
        id: '124',
        username: 'user',
        content: 'I need help @testbot',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      expect(agent.testShouldRespond(message1)).toBe(true);
      expect(agent.testShouldRespond(message2)).toBe(true);
    });

    it('should respond to questions', () => {
      const questions = [
        'What is the weather?',
        'How do I do this?',
        'Why is the sky blue?',
        'Can you help me?'
      ];
      
      questions.forEach(content => {
        const message: Message = {
          id: '123',
          username: 'user',
          content,
          timestamp: new Date(),
          roomId: 'test-room'
        };
        
        expect(agent.testShouldRespond(message)).toBe(true);
      });
    });

    it('should respond to commands', () => {
      const message: Message = {
        id: '123',
        username: 'user',
        content: '/help',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      expect(agent.testShouldRespond(message)).toBe(true);
    });

    it('should not respond to regular statements', () => {
      const message: Message = {
        id: '123',
        username: 'user',
        content: 'Just a regular statement',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      expect(agent.testShouldRespond(message)).toBe(false);
    });
  });

  describe('getContext', () => {
    it('should return last 10 messages', () => {
      // Add 15 messages
      const messages: Message[] = [];
      for (let i = 0; i < 15; i++) {
        messages.push({
          id: `${i}`,
          username: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
          roomId: 'test-room'
        });
      }
      
      agent.messages = messages;
      const context = agent.testGetContext();
      
      expect(context).toHaveLength(10);
      expect(context[0].content).toBe('Message 5');
      expect(context[9].content).toBe('Message 14');
    });

    it('should return all messages when less than 10', () => {
      const messages: Message[] = [
        {
          id: '1',
          username: 'user',
          content: 'Message 1',
          timestamp: new Date(),
          roomId: 'test-room'
        },
        {
          id: '2',
          username: 'user',
          content: 'Message 2',
          timestamp: new Date(),
          roomId: 'test-room'
        }
      ];
      
      agent.messages = messages;
      const context = agent.testGetContext();
      
      expect(context).toHaveLength(2);
      expect(context).toEqual(messages);
    });
  });

  describe('summarizeConversation', () => {
    it('should return no conversation message when empty', async () => {
      const summary = await agent.testSummarizeConversation();
      expect(summary).toBe('No conversation to summarize yet.');
    });

    it('should summarize last 20 messages', async () => {
      const messages: Message[] = [];
      for (let i = 0; i < 25; i++) {
        messages.push({
          id: `${i}`,
          username: i % 2 === 0 ? 'user1' : 'user2',
          content: `This is message number ${i} with some longer content that should be truncated`,
          timestamp: new Date(),
          roomId: 'test-room'
        });
      }
      
      agent.messages = messages;
      const summary = await agent.testSummarizeConversation();
      
      expect(summary).toContain('Conversation Summary (last 20 messages)');
      expect(summary).toContain('user1: This is message number');
      expect(summary).toContain('...');
      expect(summary.split('\n').length).toBeGreaterThan(20); // Header + 20 messages
    });

    it('should truncate long messages', async () => {
      const longMessage = 'a'.repeat(200);
      agent.messages = [{
        id: '1',
        username: 'user',
        content: longMessage,
        timestamp: new Date(),
        roomId: 'test-room'
      }];
      
      const summary = await agent.testSummarizeConversation();
      
      expect(summary).toContain('a'.repeat(100) + '...');
      expect(summary).not.toContain('a'.repeat(101));
    });
  });

  describe('capabilities', () => {
    it('should have defined capabilities', () => {
      expect(agent.capabilities).toBeDefined();
      expect(agent.capabilities.chat).toBe(true);
      expect(agent.capabilities.math).toBe(false);
      expect(agent.capabilities.code).toBe(false);
      expect(agent.capabilities.summarize).toBe(true);
      expect(agent.capabilities.moderate).toBe(false);
      expect(agent.capabilities.analyze).toBe(false);
      expect(agent.capabilities.translate).toBe(false);
      expect(agent.capabilities.help).toBe(true);
      expect(agent.capabilities.streaming).toBe(false);
    });
  });

  describe('getHelpMessage', () => {
    it('should return help message', () => {
      expect(agent.testGetHelpMessage()).toBe('Test help message');
    });
  });
});