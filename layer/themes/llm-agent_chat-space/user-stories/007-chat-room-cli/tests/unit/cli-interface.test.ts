import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { CLIInterface } from '../../src/external/cli-interface';
import type { CLIResponse, Message } from '../../src/external/cli-interface';

// Unit tests
describe('CLI Interface Unit Tests', () => {
  let eventBus: EventEmitter;
  let cli: CLIInterface;
  let emittedEvents: Array<{ event: string; data: any }>;

  beforeEach(() => {
    eventBus = new EventEmitter();
    cli = new CLIInterface(eventBus);
    emittedEvents = [];

    // Capture all events
    const originalEmit = eventBus.emit;
    eventBus.emit = jest.fn((event: string, data?: any) => {
      emittedEvents.push({ event, data });
      return originalEmit.call(eventBus, event, data);
    });
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('Command Parsing', () => {
    test('should parse simple command', () => {
      const cmd = cli.parseCommand('/help');
      
      expect(cmd.name).toBe('/help');
      expect(cmd.args).toEqual([]);
      expect(cmd.options).toEqual({});
      expect(cmd.rawInput).toBe('/help');
    });

    test('should parse command with arguments', () => {
      const cmd = cli.parseCommand('/register alice');
      
      expect(cmd.name).toBe('/register');
      expect(cmd.args).toEqual(['alice']);
      expect(cmd.options).toEqual({});
    });

    test('should parse command with multiple arguments', () => {
      const cmd = cli.parseCommand('/create dev team room');
      
      expect(cmd.name).toBe('/create');
      expect(cmd.args).toEqual(['dev', 'team', 'room']);
    });

    test('should parse command with options', () => {
      const cmd = cli.parseCommand('/list --all');
      
      expect(cmd.name).toBe('/list');
      expect(cmd.args).toEqual([]);
      expect(cmd.options).toEqual({ all: true });
    });

    test('should parse command with key-value options', () => {
      const cmd = cli.parseCommand('/history --limit=10');
      
      expect(cmd.name).toBe('/history');
      expect(cmd.args).toEqual([]);
      expect(cmd.options).toEqual({ limit: '10' });
    });

    test('should parse complex command', () => {
      const cmd = cli.parseCommand('/create myroom --description="A test room" --private');
      
      expect(cmd.name).toBe('/create');
      expect(cmd.args).toEqual(['myroom']);
      expect(cmd.options).toEqual({
        description: '"A test room"',
        private: true
      });
    });

    test('should throw error for non-command input', () => {
      expect(() => cli.parseCommand('hello')).toThrow('Commands must start with /');
    });
  });

  describe('Command Processing', () => {
    test('should process register command', async () => {
      const response = await cli.processCommand('/register alice');
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('alice');
      expect(emittedEvents).toEqual([{
        event: 'cli:register_user',
        data: { username: 'alice' }
      }]);
    });

    test('should handle register without username', async () => {
      const response = await cli.processCommand('/register');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Usage');
    });

    test('should process login command', async () => {
      const response = await cli.processCommand('/login alice');
      
      expect(response.success).toBe(true);
      expect(cli.getState().authenticated).toBe(true);
      expect(cli.getState().currentUser).toBe('alice');
    });

    test('should handle unknown command', async () => {
      const response = await cli.processCommand('/unknown');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Unknown command');
    });

    test('should add commands to history', async () => {
      await cli.processCommand('/help');
      await cli.processCommand('/register alice');
      
      const history = cli.getState().commandHistory;
      expect(history).toEqual(['/help', '/register alice']);
    });
  });

  describe('Authentication Flow', () => {
    test('should require authentication for room commands', async () => {
      const response = await cli.processCommand('/create test-room');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('login first');
    });

    test('should allow room creation after login', async () => {
      await cli.processCommand('/login alice');
      const response = await cli.processCommand('/create test-room');
      
      expect(response.success).toBe(true);
      expect(emittedEvents.some(e => e.event === 'cli:create_room')).toBe(true);
    });
  });

  describe('Room Management', () => {
    beforeEach(async () => {
      await cli.processCommand('/login alice');
    });

    test('should create room with description', async () => {
      const response = await cli.processCommand('/create testroom --description="Test room"');
      
      expect(response.success).toBe(true);
      const createEvent = emittedEvents.find(e => e.event === 'cli:create_room');
      expect(createEvent?.data.name).toBe('testroom');
      expect(createEvent?.data.description).toBe('"Test room"');
    });

    test('should join room', async () => {
      const response = await cli.processCommand('/join general');
      
      expect(response.success).toBe(true);
      expect(cli.getState().currentRoom).toBe('general');
    });

    test('should leave room', async () => {
      cli.setState({ currentRoom: 'general' });
      const response = await cli.processCommand('/leave');
      
      expect(response.success).toBe(true);
      expect(cli.getState().currentRoom).toBeUndefined();
    });

    test('should handle leave without room', async () => {
      const response = await cli.processCommand('/leave');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Not currently in any room');
    });
  });

  describe('Text Message Processing', () => {
    beforeEach(async () => {
      await cli.processCommand('/login alice');
      cli.setState({ currentRoom: 'general' });
    });

    test('should process regular text message', () => {
      const result = cli.processTextMessage('Hello world');
      
      expect(result.isCommand).toBe(false);
      expect(emittedEvents.some(e => e.event === 'cli:send_message')).toBe(true);
    });

    test('should identify command message', () => {
      const result = cli.processTextMessage('/help');
      
      expect(result.isCommand).toBe(true);
    });

    test('should handle message without room', async () => {
      cli.setState({ currentRoom: undefined });
      const result = cli.processTextMessage('Hello');
      
      expect(result.isCommand).toBe(false);
      expect(result.message).toContain('No room selected');
    });

    test('should handle empty message', () => {
      const result = cli.processTextMessage('   ');
      
      expect(result.isCommand).toBe(false);
      expect(result.message).toBeUndefined();
    });
  });

  describe('Message Formatting', () => {
    test('should format basic message', () => {
      const message: Message = {
        id: 'msg1',
        roomId: 'general',
        userId: 'alice',
        username: 'alice',
        content: 'Hello world',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        type: 'text'
      };

      const formatted = cli.formatMessage(message);
      
      expect(formatted).toContain('[general]');
      expect(formatted).toContain('alice: Hello world');
      expect(formatted).toContain('12:00:00');
    });

    test('should format system message with prefix', () => {
      const message: Message = {
        id: 'msg1',
        roomId: 'general',
        userId: 'system',
        username: 'system',
        content: 'User joined',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        type: 'system'
      };

      const formatted = cli.formatMessage(message);
      
      expect(formatted).toContain('🔧');
    });

    test('should format workflow message with prefix', () => {
      const message: Message = {
        id: 'msg1',
        roomId: 'general',
        userId: 'workflow',
        username: 'workflow',
        content: 'Code review in progress',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        type: 'workflow'
      };

      const formatted = cli.formatMessage(message);
      
      expect(formatted).toContain('🔄');
    });

    test('should respect timestamp setting', () => {
      cli.setState({ 
        settings: { 
          ...cli.getState().settings, 
          showTimestamps: false 
        } 
      });

      const message: Message = {
        id: 'msg1',
        roomId: 'general',
        userId: 'alice',
        username: 'alice',
        content: 'Hello',
        timestamp: new Date(),
        type: 'text'
      };

      const formatted = cli.formatMessage(message);
      
      expect(formatted).not.toMatch(/\[\d+:\d+:\d+\]/);
    });
  });

  describe('Response Formatting', () => {
    test('should format success response', () => {
      const response: CLIResponse = {
        success: true,
        message: 'Operation successful'
      };

      const lines = cli.formatResponse(response);
      
      expect(lines[0]).toContain('🔄');
      expect(lines[0]).toContain('Operation successful');
    });

    test('should format error response', () => {
      const response: CLIResponse = {
        success: false,
        message: 'Operation failed'
      };

      const lines = cli.formatResponse(response);
      
      expect(lines[0]).toContain('✗');
      expect(lines[0]).toContain('Operation failed');
    });

    test('should format list data', () => {
      const response: CLIResponse = {
        success: true,
        message: 'Available rooms',
        data: [
          { name: 'general', description: 'General chat' },
          { name: 'dev', description: 'Development team' }
        ],
        displayType: 'list'
      };

      const lines = cli.formatResponse(response);
      
      expect(lines).toHaveLength(3); // message + 2 items
      expect(lines[1]).toContain('1. general - General chat');
      expect(lines[2]).toContain('2. dev - Development team');
    });

    test('should format table data', () => {
      const response: CLIResponse = {
        success: true,
        message: 'Settings',
        data: {
          showTimestamps: true,
          colorOutput: false,
          autoComplete: true
        },
        displayType: 'table'
      };

      const lines = cli.formatResponse(response);
      
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.some(line => line.includes('showTimestamps: true'))).toBe(true);
    });
  });

  describe('Auto-completion', () => {
    test('should provide command completions', () => {
      const completions = cli.getCompletions('/reg');
      
      expect(completions).toContain('/register');
    });

    test('should provide multiple completions', () => {
      const completions = cli.getCompletions('/');
      
      expect(completions.length).toBeGreaterThan(5);
      expect(completions).toContain('/help');
      expect(completions).toContain('/login');
      expect(completions).toContain('/create');
    });

    test('should return empty for non-commands', () => {
      const completions = cli.getCompletions('hello');
      
      expect(completions).toEqual([]);
    });

    test('should be case insensitive', () => {
      const completions = cli.getCompletions('/REG');
      
      expect(completions).toContain('/register');
    });
  });

  describe('Settings Management', () => {
    test('should show current settings', async () => {
      const response = await cli.processCommand('/settings');
      
      expect(response.success).toBe(true);
      expect(response.displayType).toBe('table');
      expect(response.data).toEqual(cli.getState().settings);
    });

    test('should update boolean setting', async () => {
      const response = await cli.processCommand('/settings showTimestamps false');
      
      expect(response.success).toBe(true);
      expect(cli.getState().settings.showTimestamps).toBe(false);
    });

    test('should handle unknown setting', async () => {
      const response = await cli.processCommand('/settings unknownSetting value');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Unknown setting');
    });
  });

  describe('Workflow Commands', () => {
    beforeEach(async () => {
      await cli.processCommand('/login alice');
      cli.setState({ currentRoom: 'general' });
    });

    test('should handle review command', async () => {
      const response = await cli.processCommand('/review src/main.ts');
      
      expect(response.success).toBe(true);
      const workflowEvent = emittedEvents.find(e => e.event === 'cli:workflow_command');
      expect(workflowEvent?.data.workflow).toBe('code-review');
      expect(workflowEvent?.data.args.file).toBe('src/main.ts');
    });

    test('should handle search command', async () => {
      const response = await cli.processCommand('/search TODO items');
      
      expect(response.success).toBe(true);
      const workflowEvent = emittedEvents.find(e => e.event === 'cli:workflow_command');
      expect(workflowEvent?.data.workflow).toBe('file-search');
      expect(workflowEvent?.data.args.pattern).toBe('TODO items');
    });

    test('should handle flow command', async () => {
      const response = await cli.processCommand('/flow status backup-flow');
      
      expect(response.success).toBe(true);
      const flowEvent = emittedEvents.find(e => e.event === 'cli:flow_command');
      expect(flowEvent?.data.action).toBe('status');
      expect(flowEvent?.data.args).toEqual(['backup-flow']);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed command input', async () => {
      const response = await cli.processCommand('/');
      
      expect(response.success).toBe(false);
    });

    test('should handle commands with missing required arguments', async () => {
      await cli.processCommand('/login alice'); // Ensure authenticated first
      const response = await cli.processCommand('/join');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('Usage');
    });
  });

  describe('State Management', () => {
    test('should maintain state correctly', () => {
      const initialState = cli.getState();
      
      cli.setState({ currentRoom: 'test-room' });
      
      expect(cli.getState().currentRoom).toBe('test-room');
      expect(cli.getState().authenticated).toBe(initialState.authenticated);
    });

    test('should not mutate original state', () => {
      const state1 = cli.getState();
      const state2 = cli.getState();
      
      state1.currentRoom = 'modified';
      
      expect(state2.currentRoom).not.toBe('modified');
    });
  });
});