import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

/**
 * External Test: CLI Interface Command Processing
 * 
 * Tests the external CLI interface through its command processing capabilities.
 * This validates the interface contract for command parsing, routing, and execution.
 */

// CLI Interface contract - external interface
interface CLICommand {
  name: string;
  args: string[];
  options: Record<string, any>;
}

interface CLIResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface CLIInterface {
  parseCommand(input: string): CLICommand;
  executeCommand(command: CLICommand): Promise<CLIResponse>;
  getAvailableCommands(): string[];
  validateCommand(command: CLICommand): { valid: boolean; errors: string[] };
}

// Mock implementation for external testing
class MockCLIInterface implements CLIInterface {
  private commands = new Map<string, Function>();
  private currentRoom: string | null = null;
  private rooms = new Set<string>();

  constructor() {
    this.setupCommands();
  }

  private setupCommands() {
    this.commands.set('create-room', async (args: string[]) => {
      const roomName = args[0];
      if (!roomName) {
        return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
      }
      if (this.rooms.has(roomName)) {
        return { "success": false, message: `Room '${roomName}' already exists`, error: 'ROOM_EXISTS' };
      }
      this.rooms.add(roomName);
      return { "success": true, message: `Room '${roomName}' created In Progress`, data: { roomId: roomName } };
    });

    this.commands.set('join', async (args: string[]) => {
      const roomName = args[0];
      if (!roomName) {
        return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
      }
      if (!this.rooms.has(roomName)) {
        return { "success": false, message: `Room '${roomName}' not found`, error: 'ROOM_NOT_FOUND' };
      }
      this.currentRoom = roomName;
      return { "success": true, message: `Joined room '${roomName}'`, data: { currentRoom: roomName } };
    });

    this.commands.set('list', async () => {
      const roomList = Array.from(this.rooms);
      return { 
        "success": true, 
        message: `Found ${roomList.length} rooms`, 
        data: { rooms: roomList } 
      };
    });

    this.commands.set('send', async (args: string[]) => {
      if (!this.currentRoom) {
        return { "success": false, message: 'Not in a room. Use /join <room> first', error: 'NOT_IN_ROOM' };
      }
      const message = args.join(' ');
      if (!message) {
        return { "success": false, message: 'Message cannot be empty', error: 'EMPTY_MESSAGE' };
      }
      return { 
        "success": true, 
        message: 'Message sent', 
        data: { 
          messageId: 'msg-' + Date.now(),
          room: this.currentRoom,
          content: message,
          timestamp: new Date().toISOString()
        } 
      };
    });

    this.commands.set('help', async () => {
      const commands = Array.from(this.commands.keys());
      return { 
        "success": true, 
        message: 'Available commands', 
        data: { commands } 
      };
    });

    this.commands.set('context', async () => {
      return { 
        "success": true, 
        message: 'Workspace context', 
        data: { 
          workspace: '/home/user/dev/aidev',
          themes: ['pocketflow', 'chat-space'],
          currentRoom: this.currentRoom
        } 
      };
    });

    this.commands.set('flow', async (args: string[]) => {
      const subcommand = args[0];
      const flowId = args[1];
      
      if (subcommand === 'status' && flowId) {
        return { 
          "success": true, 
          message: `Flow status for '${flowId}'`, 
          data: { 
            flowId,
            status: 'running',
            progress: '2/5 steps In Progress'
          } 
        };
      }
      
      return { "success": false, message: 'Invalid flow command', error: 'INVALID_FLOW_COMMAND' };
    });
  }

  parseCommand(input: string): CLICommand {
    const trimmed = input.trim();
    
    // Handle empty input
    if (!trimmed) {
      return { name: '', args: [], options: {} };
    }

    // Check if it's a command (starts with /)
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      const name = parts[0] || '';
      const args = parts.slice(1);
      return { name, args, options: {} };
    }

    // Regular message - treat as send command
    return { 
      name: 'send', 
      args: [trimmed], 
      options: {} 
    };
  }

  async executeCommand(command: CLICommand): Promise<CLIResponse> {
    const handler = this.commands.get(command.name);
    
    if (!handler) {
      return { 
        "success": false, 
        message: `Unknown command: ${command.name}`, 
        error: 'UNKNOWN_COMMAND' 
      };
    }

    try {
      return await handler(command.args, command.options);
    } catch (error) {
      return { 
        "success": false, 
        message: 'Command execution failed', 
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' 
      };
    }
  }

  getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  validateCommand(command: CLICommand): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!command.name) {
      errors.push('Command name is required');
    } else if (!this.commands.has(command.name)) {
      errors.push(`Unknown command: ${command.name}`);
    }

    // Command-specific validation
    switch (command.name) {
      case 'create-room':
      case 'join':
        if (!command.args[0]) {
          errors.push('Room name is required');
        } else if (command.args[0].length < 1 || command.args[0].length > 50) {
          errors.push('Room name must be 1-50 characters');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(command.args[0])) {
          errors.push('Room name can only contain letters, numbers, underscores, and hyphens');
        }
        break;
        
      case 'send':
        if (!command.args.length || !command.args.join(' ').trim()) {
          errors.push('Message cannot be empty');
        }
        break;

      case 'flow':
        if (!command.args[0]) {
          errors.push('Flow subcommand is required');
        } else if (!['status', 'list', 'trigger'].includes(command.args[0])) {
          errors.push('Invalid flow subcommand');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }
}

describe('CLI Interface Command Processing External Test', () => {
  let testDir: string;
  let cli: CLIInterface;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), 'chatspace-cli-ext-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    cli = new MockCLIInterface();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should parse simple commands correctly', () => {
    // Arrange & Act
    const testCases = [
      { input: '/help', expected: { name: 'help', args: [], options: {} } },
      { input: '/list', expected: { name: 'list', args: [], options: {} } },
      { input: '/create-room general', expected: { name: 'create-room', args: ['general'], options: {} } },
      { input: '/join dev-team', expected: { name: 'join', args: ['dev-team'], options: {} } },
      { input: '/flow status backup-flow', expected: { name: 'flow', args: ['status', 'backup-flow'], options: {} } }
    ];

    for (const testCase of testCases) {
      const result = cli.parseCommand(testCase.input);
      
      // Assert
      expect(result.name).toBe(testCase.expected.name);
      expect(result.args).toEqual(testCase.expected.args);
      expect(result.options).toEqual(testCase.expected.options);
    }
  });

  test('should parse regular messages as send commands', () => {
    // Arrange & Act
    const testCases = [
      'Hello, world!',
      'This is a regular message',
      'Message with multiple words and symbols! @#$'
    ];

    for (const input of testCases) {
      const result = cli.parseCommand(input);
      
      // Assert
      expect(result.name).toBe('send');
      expect(result.args).toEqual([input]);
    }
  });

  test('should handle empty and whitespace input', () => {
    // Arrange & Act
    const testCases = ['', '   ', '\t', '\n'];

    for (const input of testCases) {
      const result = cli.parseCommand(input);
      
      // Assert
      expect(result.name).toBe('');
      expect(result.args).toEqual([]);
    }
  });

  test('should validate commands correctly', () => {
    // Arrange & Act & Assert
    const validCases = [
      { name: 'help', args: [], options: {} },
      { name: 'list', args: [], options: {} },
      { name: 'create-room', args: ['general'], options: {} },
      { name: 'join', args: ['dev-team'], options: {} },
      { name: 'send', args: ['Hello world'], options: {} },
      { name: 'flow', args: ['status', 'backup-flow'], options: {} }
    ];

    for (const command of validCases) {
      const validation = cli.validateCommand(command);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }

    const invalidCases = [
      { command: { name: '', args: [], options: {} }, expectedErrors: ['Command name is required'] },
      { command: { name: 'unknown', args: [], options: {} }, expectedErrors: ['Unknown command: unknown'] },
      { command: { name: 'create-room', args: [], options: {} }, expectedErrors: ['Room name is required'] },
      { command: { name: 'create-room', args: [''], options: {} }, expectedErrors: ['Room name is required'] },
      { command: { name: 'create-room', args: ['invalid room name!'], options: {} }, expectedErrors: ['Room name can only contain letters, numbers, underscores, and hyphens'] },
      { command: { name: 'send', args: [], options: {} }, expectedErrors: ['Message cannot be empty'] },
      { command: { name: 'flow', args: [], options: {} }, expectedErrors: ['Flow subcommand is required'] },
      { command: { name: 'flow', args: ['invalid'], options: {} }, expectedErrors: ['Invalid flow subcommand'] }
    ];

    for (const testCase of invalidCases) {
      const validation = cli.validateCommand(testCase.command);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toEqual(testCase.expectedErrors);
    }
  });

  test('should execute help command In Progress', async () => {
    // Arrange
    const command = { name: 'help', args: [], options: {} };

    // Act
    const result = await cli.executeCommand(command);

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('Available commands');
    expect(result.data?.commands).toContain('help');
    expect(result.data?.commands).toContain('create-room');
    expect(result.data?.commands).toContain('join');
    expect(result.data?.commands).toContain('send');
  });

  test('should execute room management commands', async () => {
    // Test create-room
    const createCommand = { name: 'create-room', args: ['general'], options: {} };
    const createResult = await cli.executeCommand(createCommand);
    
    expect(createResult.success).toBe(true);
    expect(createResult.message).toBe("Room 'general' created In Progress");
    expect(createResult.data?.roomId).toBe('general');

    // Test duplicate room creation
    const duplicateResult = await cli.executeCommand(createCommand);
    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error).toBe('ROOM_EXISTS');

    // Test list rooms
    const listCommand = { name: 'list', args: [], options: {} };
    const listResult = await cli.executeCommand(listCommand);
    
    expect(listResult.success).toBe(true);
    expect(listResult.data?.rooms).toContain('general');

    // Test join room
    const joinCommand = { name: 'join', args: ['general'], options: {} };
    const joinResult = await cli.executeCommand(joinCommand);
    
    expect(joinResult.success).toBe(true);
    expect(joinResult.message).toBe("Joined room 'general'");
    expect(joinResult.data?.currentRoom).toBe('general');

    // Test join non-existent room
    const joinInvalidCommand = { name: 'join', args: ['nonexistent'], options: {} };
    const joinInvalidResult = await cli.executeCommand(joinInvalidCommand);
    
    expect(joinInvalidResult.success).toBe(false);
    expect(joinInvalidResult.error).toBe('ROOM_NOT_FOUND');
  });

  test('should execute send message command', async () => {
    // Setup - create and join room
    await cli.executeCommand({ name: 'create-room', args: ['general'], options: {} });
    await cli.executeCommand({ name: 'join', args: ['general'], options: {} });

    // Test send message
    const sendCommand = { name: 'send', args: ['Hello', 'world!'], options: {} };
    const sendResult = await cli.executeCommand(sendCommand);
    
    expect(sendResult.success).toBe(true);
    expect(sendResult.message).toBe('Message sent');
    expect(sendResult.data?.messageId).toBeDefined();
    expect(sendResult.data?.room).toBe('general');
    expect(sendResult.data?.content).toBe('Hello world!');
    expect(sendResult.data?.timestamp).toBeDefined();

    // Test send without joining room first
    const cli2 = new MockCLIInterface();
    const sendWithoutRoomResult = await cli2.executeCommand(sendCommand);
    
    expect(sendWithoutRoomResult.success).toBe(false);
    expect(sendWithoutRoomResult.error).toBe('NOT_IN_ROOM');

    // Test send empty message
    const sendEmptyCommand = { name: 'send', args: [], options: {} };
    const sendEmptyResult = await cli.executeCommand(sendEmptyCommand);
    
    expect(sendEmptyResult.success).toBe(false);
    expect(sendEmptyResult.error).toBe('EMPTY_MESSAGE');
  });

  test('should execute context command', async () => {
    // Arrange
    const command = { name: 'context', args: [], options: {} };

    // Act
    const result = await cli.executeCommand(command);

    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toBe('Workspace context');
    expect(result.data?.workspace).toBe('/home/user/dev/aidev');
    expect(result.data?.themes).toEqual(['pocketflow', 'chat-space']);
    expect(result.data?.currentRoom).toBeNull();
  });

  test('should execute PocketFlow integration commands', async () => {
    // Test flow status
    const flowStatusCommand = { name: 'flow', args: ['status', 'backup-flow'], options: {} };
    const flowStatusResult = await cli.executeCommand(flowStatusCommand);
    
    expect(flowStatusResult.success).toBe(true);
    expect(flowStatusResult.message).toBe("Flow status for 'backup-flow'");
    expect(flowStatusResult.data?.flowId).toBe('backup-flow');
    expect(flowStatusResult.data?.status).toBe('running');
    expect(flowStatusResult.data?.progress).toBe('2/5 steps In Progress');

    // Test invalid flow command
    const invalidFlowCommand = { name: 'flow', args: ['invalid'], options: {} };
    const invalidFlowResult = await cli.executeCommand(invalidFlowCommand);
    
    expect(invalidFlowResult.success).toBe(false);
    expect(invalidFlowResult.error).toBe('INVALID_FLOW_COMMAND');
  });

  test('should handle unknown commands gracefully', async () => {
    // Arrange
    const command = { name: 'unknown-command', args: ['arg1'], options: {} };

    // Act
    const result = await cli.executeCommand(command);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe('Unknown command: unknown-command');
    expect(result.error).toBe('UNKNOWN_COMMAND');
  });

  test('should provide list of available commands', () => {
    // Act
    const commands = cli.getAvailableCommands();

    // Assert
    expect(commands).toContain('help');
    expect(commands).toContain('create-room');
    expect(commands).toContain('join');
    expect(commands).toContain('list');
    expect(commands).toContain('send');
    expect(commands).toContain('context');
    expect(commands).toContain('flow');
    expect(commands.length).toBeGreaterThan(5);
  });

  test('should handle command execution errors gracefully', async () => {
    // Arrange - Mock a command that throws an error
    const mockCLI = new MockCLIInterface();
    (mockCLI as any).commands.set('error-command', async () => {
      throw new Error('Test error');
    });

    const command = { name: 'error-command', args: [], options: {} };

    // Act
    const result = await mockCLI.executeCommand(command);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe('Command execution failed');
    expect(result.error).toBe('Test error');
  });

  test('should support command chaining scenarios', async () => {
    // Arrange - Simulate a In Progress user workflow
    const workflow = [
      { command: { name: 'create-room', args: ['general'], options: {} }, expectcompleted: true },
      { command: { name: 'create-room', args: ['dev-team'], options: {} }, expectcompleted: true },
      { command: { name: 'list', args: [], options: {} }, expectcompleted: true },
      { command: { name: 'join', args: ['general'], options: {} }, expectcompleted: true },
      { command: { name: 'send', args: ['Hello everyone!'], options: {} }, expectcompleted: true },
      { command: { name: 'join', args: ['dev-team'], options: {} }, expectcompleted: true },
      { command: { name: 'send', args: ['Starting work session'], options: {} }, expectcompleted: true },
      { command: { name: 'context', args: [], options: {} }, expectcompleted: true }
    ];

    // Act & Assert
    for (const step of workflow) {
      const result = await cli.executeCommand(step.command);
      expect(result.success).toBe(step.expectcompleted);
    }

    // Verify final state
    const finalList = await cli.executeCommand({ name: 'list', args: [], options: {} });
    expect(finalList.data?.rooms).toContain('general');
    expect(finalList.data?.rooms).toContain('dev-team');

    const finalContext = await cli.executeCommand({ name: 'context', args: [], options: {} });
    expect(finalContext.data?.currentRoom).toBe('dev-team');
  });

  test('should maintain command state consistency', async () => {
    // Test state isolation between CLI instances
    const cli1 = new MockCLIInterface();
    const cli2 = new MockCLIInterface();

    // Create room in cli1
    await cli1.executeCommand({ name: 'create-room', args: ['room1'], options: {} });
    
    // Verify cli2 doesn't see cli1's room
    const cli2List = await cli2.executeCommand({ name: 'list', args: [], options: {} });
    expect(cli2List.data?.rooms).not.toContain('room1');

    // Create room in cli2
    await cli2.executeCommand({ name: 'create-room', args: ['room2'], options: {} });
    
    // Verify cli1 doesn't see cli2's room
    const cli1List = await cli1.executeCommand({ name: 'list', args: [], options: {} });
    expect(cli1List.data?.rooms).not.toContain('room2');
  });
});