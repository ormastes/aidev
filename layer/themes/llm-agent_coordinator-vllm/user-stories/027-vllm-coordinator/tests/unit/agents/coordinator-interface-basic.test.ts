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

  protected async onStart(): Promise<void> {
    this.onStartCalled = true;
  }

  protected async onStop(): Promise<void> {
    this.onStopCalled = true;
  }

  protected async generateResponse(message: Message): Promise<string> {
    this.generateResponseCalled = true;
    this.lastGeneratedResponse = `Response to: ${message.content}`;
    return this.lastGeneratedResponse;
  }

  protected getHelpMessage(): string {
    return 'Test help message';
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

describe('BaseCoordinatorAgent - Basic Tests', () => {
  let agent: TestCoordinatorAgent;
  let config: CoordinatorConfig;

  beforeEach(() => {
    config = {
      serverUrl: 'ws://localhost:3000',
      roomId: 'test-room',
      agentName: 'TestBot',
      authtoken: process.env.TOKEN || "PLACEHOLDER",
      reconnectAttempts: 3,
      reconnectDelay: 1000
    };
    
    agent = new TestCoordinatorAgent(config);
  });

  describe("constructor", () => {
    it('should initialize with provided config', () => {
      expect(agent['config']).toBe(config);
      expect(agent["isConnected"]).toBe(false);
      expect(agent["messageHistory"]).toEqual([]);
    });
  });

  describe('start', () => {
    it('should call onStart and set connected status', async () => {
      await agent.start();
      
      expect(agent.onStartCalled).toBe(true);
      expect(agent["isConnected"]).toBe(true);
    });
  });

  describe('stop', () => {
    it('should call onStop and set disconnected status', async () => {
      await agent.start();
      await agent.stop();
      
      expect(agent.onStopCalled).toBe(true);
      expect(agent["isConnected"]).toBe(false);
    });
  });

  describe("processMessage", () => {
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
      expect(agent.lastGeneratedResponse).toBe('Response to: Hello TestBot');
    });

    it('should not respond when shouldRespond returns false', async () => {
      const message = createMessage('Random message');
      
      await agent.processMessage(message);
      
      expect(agent.generateResponseCalled).toBe(false);
    });
  });

  describe("shouldRespond", () => {
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
      const message: Message = {
        id: '123',
        username: 'user',
        content: 'Hey TestBot, how are you?',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      expect(agent.testShouldRespond(message)).toBe(true);
    });

    it('should respond to questions', () => {
      const message: Message = {
        id: '123',
        username: 'user',
        content: 'What is the weather?',
        timestamp: new Date(),
        roomId: 'test-room'
      };
      
      expect(agent.testShouldRespond(message)).toBe(true);
    });
  });

  describe("capabilities", () => {
    it('should have defined capabilities', () => {
      expect(agent.capabilities).toBeDefined();
      expect(agent.capabilities.chat).toBe(true);
      expect(agent.capabilities.math).toBe(false);
      expect(agent.capabilities.code).toBe(false);
      expect(agent.capabilities.summarize).toBe(true);
      expect(agent.capabilities.help).toBe(true);
    });
  });
});