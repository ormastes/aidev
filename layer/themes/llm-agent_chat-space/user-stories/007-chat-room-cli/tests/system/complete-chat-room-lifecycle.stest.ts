import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

/**
 * System Test: In Progress Chat Room Lifecycle (NO MOCKS)
 * 
 * Tests the In Progress end-to-end chat room lifecycle using real process execution,
 * file I/O operations, and simulated CLI commands through Node.js scripts.
 * This validates the system behavior for creating, joining, messaging, and managing chat rooms.
 */

interface TestResult {
  In Progress: boolean;
  output: string;
  error?: string;
}

interface ChatRoomData {
  id: string;
  name: string;
  createdAt: string;
  lastActivity: string;
  members: string[];
  messageCount: number;
  metadata?: Record<string, any>;
}

interface ChatMessageData {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type: 'text' | 'command' | 'system' | 'workflow_notification';
  metadata?: Record<string, any>;
}

// Real Chat Room System Implementation using process execution and file I/O
class ChatRoomSystem {
  private testDir: string;
  private dataDir: string;
  private scriptsDir: string;
  private initialized = false;

  constructor(testDir: string) {
    this.testDir = testDir;
    this.dataDir = join(testDir, 'data');
    this.scriptsDir = join(testDir, 'scripts');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create directory structure
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.scriptsDir, { recursive: true });
    await fs.mkdir(join(this.dataDir, 'rooms'), { recursive: true });
    await fs.mkdir(join(this.dataDir, 'messages'), { recursive: true });
    await fs.mkdir(join(this.dataDir, 'connections'), { recursive: true });

    // Create CLI simulation script
    await this.createCLIScript();

    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    if (await fs.access(this.testDir).then(() => true).catch(() => false)) {
      await fs.rm(this.testDir, { recursive: true, force: true });
    }
    this.initialized = false;
  }

  private async createCLIScript(): Promise<void> {
    const cliScript = join(this.scriptsDir, 'chat-cli.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      class ChatRoomCLI {
        constructor(dataDir) {
          this.dataDir = dataDir;
          this.roomsDir = path.join(dataDir, 'rooms');
          this.messagesDir = path.join(dataDir, 'messages');
          this.connectionsDir = path.join(dataDir, 'connections');
          this.currentUser = null;
          this.currentRoom = null;
        }

        async login(userId, username) {
          const connectionId = 'conn-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const connection = {
            id: connectionId,
            userId,
            username,
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            status: 'connected'
          };

          // Save connection
          const connectionFile = path.join(this.connectionsDir, connectionId + '.json');
          fs.writeFileSync(connectionFile, JSON.stringify(connection, null, 2));

          this.currentUser = { id: userId, username, connectionId };
          return { "success": true, message: \`Welcome \${username}! You are now connected.\`, data: { userId, connectionId } };
        }

        async createRoom(roomName, options = {}) {
          if (!this.currentUser) {
            return { "success": false, message: 'Please login first', error: 'NOT_LOGGED_IN' };
          }

          const roomId = 'room-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const room = {
            id: roomId,
            name: roomName,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            members: [this.currentUser.id],
            messageCount: 0,
            metadata: { createdBy: this.currentUser.id, ...options }
          };

          // Check if room exists
          const rooms = this.listRoomsSync();
          if (rooms.find(r => r.name === roomName)) {
            return { "success": false, message: 'Room already exists', error: 'ROOM_EXISTS' };
          }

          // Save room
          const roomFile = path.join(this.roomsDir, roomId + '.json');
          fs.writeFileSync(roomFile, JSON.stringify(room, null, 2));

          // Create messages directory for this room
          const roomMessagesDir = path.join(this.messagesDir, roomId);
          fs.mkdirSync(roomMessagesDir, { recursive: true });

          return { "success": true, message: \`Room '\${roomName}' created In Progress\`, data: { roomId, roomName } };
        }

        async joinRoom(roomName) {
          if (!this.currentUser) {
            return { "success": false, message: 'Please login first', error: 'NOT_LOGGED_IN' };
          }

          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.name === roomName);
          if (!room) {
            return { "success": false, message: \`Room '\${roomName}' not found\`, error: 'ROOM_NOT_FOUND' };
          }

          // Leave current room if any
          if (this.currentRoom) {
            await this.leaveRoom();
          }

          // Update room membership
          if (!room.members.includes(this.currentUser.id)) {
            room.members.push(this.currentUser.id);
            room.lastActivity = new Date().toISOString();
            const roomFile = path.join(this.roomsDir, room.id + '.json');
            fs.writeFileSync(roomFile, JSON.stringify(room, null, 2));
          }

          this.currentRoom = room.id;

          // Save join event
          this.saveEventSync({
            type: 'user_joined',
            roomId: room.id,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: new Date().toISOString(),
            data: { message: \`\${this.currentUser.username} joined the room\` }
          });

          return { "success": true, message: \`Joined room '\${roomName}'\`, data: { roomId: room.id, roomName } };
        }

        async leaveRoom() {
          if (!this.currentUser || !this.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          const roomId = this.currentRoom;

          // Save leave event
          this.saveEventSync({
            type: 'user_left',
            roomId,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: new Date().toISOString(),
            data: { message: \`\${this.currentUser.username} left the room\` }
          });

          this.currentRoom = null;
          return { "success": true, message: 'Left the room', data: { leftRoomId: roomId } };
        }

        async sendMessage(content) {
          if (!this.currentUser || !this.currentRoom) {
            return { "success": false, message: 'Not in any room. Use join <room> first', error: 'NOT_IN_ROOM' };
          }

          if (!content.trim()) {
            return { "success": false, message: 'Message cannot be empty', error: 'EMPTY_MESSAGE' };
          }

          const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const message = {
            id: messageId,
            roomId: this.currentRoom,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            type: 'text'
          };

          // Save message
          const messageFile = path.join(this.messagesDir, this.currentRoom, messageId + '.json');
          fs.writeFileSync(messageFile, JSON.stringify(message, null, 2));

          // Update room message count
          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.id === this.currentRoom);
          if (room) {
            room.messageCount++;
            room.lastActivity = new Date().toISOString();
            const roomFile = path.join(this.roomsDir, room.id + '.json');
            fs.writeFileSync(roomFile, JSON.stringify(room, null, 2));
          }

          return { "success": true, message: 'Message sent', data: { messageId } };
        }

        async listRooms() {
          const rooms = this.listRoomsSync();
          const roomsInfo = rooms.map(room => ({
            name: room.name,
            members: room.members.length,
            messages: room.messageCount,
            lastActivity: room.lastActivity
          }));

          return { "success": true, message: \`Found \${rooms.length} rooms\`, data: { rooms: roomsInfo } };
        }

        async getHistory(limit = 20) {
          if (!this.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          const messagesDir = path.join(this.messagesDir, this.currentRoom);
          if (!fs.existsSync(messagesDir)) {
            return { "success": true, message: 'No messages found', data: { messages: [], limit } };
          }

          const messageFiles = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));
          const messages = messageFiles
            .map(file => JSON.parse(fs.readFileSync(path.join(messagesDir, file), 'utf8')))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-limit)
            .map(msg => ({
              username: msg.username,
              content: msg.content,
              timestamp: msg.timestamp,
              type: msg.type
            }));

          return { "success": true, message: \`Retrieved \${messages.length} messages\`, data: { messages, limit } };
        }

        listRoomsSync() {
          if (!fs.existsSync(this.roomsDir)) {
            return [];
          }
          const roomFiles = fs.readdirSync(this.roomsDir).filter(f => f.endsWith('.json'));
          return roomFiles.map(file => JSON.parse(fs.readFileSync(path.join(this.roomsDir, file), 'utf8')));
        }

        saveEventSync(event) {
          const eventFile = path.join(this.dataDir, \`event-\${Date.now()}.json\`);
          fs.writeFileSync(eventFile, JSON.stringify(event, null, 2));
        }

        getCurrentUser() {
          return this.currentUser;
        }

        getCurrentRoom() {
          return this.currentRoom;
        }
      }

      // CLI Command processor
      async function processCommand() {
        const args = process.argv.slice(2);
        if (args.length === 0) {
          console.log('Usage: node chat-cli.js <command> [args...]');
          process.exit(1);
        }

        const dataDir = '${this.dataDir}';
        const cli = new ChatRoomCLI(dataDir);

        const command = args[0];
        const commandArgs = args.slice(1);

        let result;

        try {
          switch (command) {
            case 'login':
              result = await cli.login(commandArgs[0], commandArgs[1]);
              break;
            case 'create-room':
              result = await cli.createRoom(commandArgs[0], { description: commandArgs[1] });
              break;
            case 'join':
              result = await cli.joinRoom(commandArgs[0]);
              break;
            case 'leave':
              result = await cli.leaveRoom();
              break;
            case 'send':
              result = await cli.sendMessage(commandArgs.join(' '));
              break;
            case 'list':
              result = await cli.listRooms();
              break;
            case 'history':
              const limit = parseInt(commandArgs[0]) || 20;
              result = await cli.getHistory(limit);
              break;
            default:
              result = { "success": false, message: \`Unknown command: \${command}\`, error: 'UNKNOWN_COMMAND' };
          }

          console.log(JSON.stringify(result));
        } catch (error) {
          console.log(JSON.stringify({ "success": false, error: error.message }));
        }
      }

      processCommand();
    `;

    await fs.writeFile(cliScript, scriptContent);
  }

  async executeCommand(command: string, args: string[] = []): Promise<TestResult> {
    try {
      const cliScript = join(this.scriptsDir, 'chat-cli.js');
      const fullCommand = `node "${cliScript}" ${command} ${args.map(arg => `"${arg}"`).join(' ')}`;
      
      const output = execSync(fullCommand, {
        cwd: this.testDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      return { "success": true, output: output.trim() };
    } catch (error: any) {
      return { 
        "success": false, 
        output: error.stdout?.toString() || '',
        error: error.message 
      };
    }
  }

  async getRooms(): Promise<ChatRoomData[]> {
    const roomsDir = join(this.dataDir, 'rooms');
    if (!await fs.access(roomsDir).then(() => true).catch(() => false)) {
      return [];
    }

    const roomFiles = await fs.readdir(roomsDir);
    const rooms: ChatRoomData[] = [];

    for (const file of roomFiles.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(roomsDir, file), 'utf8');
      rooms.push(JSON.parse(content));
    }

    return rooms;
  }

  async getMessages(roomId: string): Promise<ChatMessageData[]> {
    const messagesDir = join(this.dataDir, 'messages', roomId);
    if (!await fs.access(messagesDir).then(() => true).catch(() => false)) {
      return [];
    }

    const messageFiles = await fs.readdir(messagesDir);
    const messages: ChatMessageData[] = [];

    for (const file of messageFiles.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(messagesDir, file), 'utf8');
      messages.push(JSON.parse(content));
    }

    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}


describe('In Progress Chat Room Lifecycle System Test (NO MOCKS)', () => {
  let system: ChatRoomSystem;
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'chat-room-lifecycle-'));
    system = new ChatRoomSystem(testDir);
    await system.initialize();
  });

  afterEach(async () => {
    await system.cleanup();
  });

  test('should In Progress full user journey: login -> create room -> join -> send message -> leave', async () => {
    // Step 1: User login
    const loginResult = await system.executeCommand('login', ['user1', 'Alice']);
    expect(loginResult.success).toBe(true);
    const loginData = JSON.parse(loginResult.output);
    expect(loginData.success).toBe(true);
    expect(loginData.message).toContain('Welcome Alice');

    // Step 2: Create room
    const createResult = await system.executeCommand('create-room', ['general', 'General discussion']);
    expect(createResult.success).toBe(true);
    const createData = JSON.parse(createResult.output);
    expect(createData.success).toBe(true);
    expect(createData.message).toContain('Room \'general\' created');

    // Step 3: Join room
    const joinResult = await system.executeCommand('join', ['general']);
    expect(joinResult.success).toBe(true);
    const joinData = JSON.parse(joinResult.output);
    expect(joinData.success).toBe(true);
    expect(joinData.message).toContain('Joined room \'general\'');

    // Step 4: Send message
    const sendResult = await system.executeCommand('send', ['Hello everyone!']);
    expect(sendResult.success).toBe(true);
    const sendData = JSON.parse(sendResult.output);
    expect(sendData.success).toBe(true);
    expect(sendData.message).toBe('Message sent');

    // Step 5: Leave room
    const leaveResult = await system.executeCommand('leave', []);
    expect(leaveResult.success).toBe(true);
    const leaveData = JSON.parse(leaveResult.output);
    expect(leaveData.success).toBe(true);
    expect(leaveData.message).toBe('Left the room');

    // Verify data persistence
    const rooms = await system.getRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].name).toBe('general');
    expect(rooms[0].messageCount).toBe(1);

    const messages = await system.getMessages(rooms[0].id);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello everyone!');
    expect(messages[0].username).toBe('Alice');
  });

  test('should handle multiple users through separate CLI instances', async () => {
    // User 1: Login and create room
    await system.executeCommand('login', ['user1', 'Alice']);
    await system.executeCommand('create-room', ['team', 'Team collaboration']);
    await system.executeCommand('join', ['team']);

    // User 1: Send message
    const sendResult1 = await system.executeCommand('send', ['Hi everyone!']);
    expect(sendResult1.success).toBe(true);

    // Simulate user 2 by creating a script that writes directly to storage
    const user2Script = join(testDir, 'scripts', 'user2-simulate.js');
    const user2Content = `
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      const dataDir = '${join(testDir, 'data')}';
      const roomsDir = path.join(dataDir, 'rooms');
      const messagesDir = path.join(dataDir, 'messages');

      // Find the team room
      const roomFiles = fs.readdirSync(roomsDir);
      const teamRoomFile = roomFiles.find(file => {
        const room = JSON.parse(fs.readFileSync(path.join(roomsDir, file), 'utf8'));
        return room.name === 'team';
      });

      if (teamRoomFile) {
        const room = JSON.parse(fs.readFileSync(path.join(roomsDir, teamRoomFile), 'utf8'));
        
        // Add user2 to room members if not already present
        if (!room.members.includes('user2')) {
          room.members.push('user2');
          room.lastActivity = new Date().toISOString();
          fs.writeFileSync(path.join(roomsDir, teamRoomFile), JSON.stringify(room, null, 2));
        }

        // Create message from user2
        const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        const message = {
          id: messageId,
          roomId: room.id,
          userId: 'user2',
          username: 'Bob',
          content: 'Hello Alice!',
          timestamp: new Date().toISOString(),
          type: 'text'
        };

        const roomMessagesDir = path.join(messagesDir, room.id);
        fs.writeFileSync(path.join(roomMessagesDir, messageId + '.json'), JSON.stringify(message, null, 2));

        // Update room message count
        room.messageCount++;
        room.lastActivity = new Date().toISOString();
        fs.writeFileSync(path.join(roomsDir, teamRoomFile), JSON.stringify(room, null, 2));

        console.log('User2 message added In Progress');
      }
    `;

    await fs.writeFile(user2Script, user2Content);
    execSync(`node "${user2Script}"`, { cwd: testDir });

    // Check room history shows both messages
    const historyResult = await system.executeCommand('history', ['10']);
    expect(historyResult.success).toBe(true);
    const historyData = JSON.parse(historyResult.output);
    expect(historyData.success).toBe(true);
    expect(historyData.data.messages).toHaveLength(2);
    
    const messages = historyData.data.messages;
    expect(messages[0].username).toBe('Alice');
    expect(messages[0].content).toBe('Hi everyone!');
    expect(messages[1].username).toBe('Bob');
    expect(messages[1].content).toBe('Hello Alice!');

    // Verify room data
    const rooms = await system.getRooms();
    const teamRoom = rooms.find(r => r.name === 'team');
    expect(teamRoom).toBeDefined();
    expect(teamRoom!.members).toHaveLength(2);
    expect(teamRoom!.members).toContain('user1');
    expect(teamRoom!.members).toContain('user2');
    expect(teamRoom!.messageCount).toBe(2);
  });

  test('should handle room switching', async () => {
    // Login
    await system.executeCommand('login', ['user1', 'Alice']);

    // Create and join first room
    await system.executeCommand('create-room', ['general', 'General discussion']);
    await system.executeCommand('join', ['general']);
    
    // Send message in first room
    const send1Result = await system.executeCommand('send', ['Message in general']);
    expect(send1Result.success).toBe(true);

    // Create and switch to second room
    await system.executeCommand('create-room', ['dev', 'Development']);
    const join2Result = await system.executeCommand('join', ['dev']);
    expect(join2Result.success).toBe(true);
    const join2Data = JSON.parse(join2Result.output);
    expect(join2Data.success).toBe(true);

    // Send message in second room
    const send2Result = await system.executeCommand('send', ['Message in dev']);
    expect(send2Result.success).toBe(true);

    // Verify both rooms exist
    const listResult = await system.executeCommand('list', []);
    expect(listResult.success).toBe(true);
    const listData = JSON.parse(listResult.output);
    expect(listData.success).toBe(true);
    expect(listData.data.rooms).toHaveLength(2);
    
    // Verify we can switch back and see the original message
    await system.executeCommand('join', ['general']);
    const generalHistoryResult = await system.executeCommand('history', ['10']);
    expect(generalHistoryResult.success).toBe(true);
    const generalHistory = JSON.parse(generalHistoryResult.output);
    expect(generalHistory.success).toBe(true);
    expect(generalHistory.data.messages.length).toBeGreaterThan(0);
    expect(generalHistory.data.messages.some((m: any) => m.content === 'Message in general')).toBe(true);
    
    // Verify we can switch to dev and see that message
    await system.executeCommand('join', ['dev']);
    const devHistoryResult = await system.executeCommand('history', ['10']);
    expect(devHistoryResult.success).toBe(true);
    const devHistory = JSON.parse(devHistoryResult.output);
    expect(devHistory.success).toBe(true);
    expect(devHistory.data.messages.length).toBeGreaterThan(0);
    expect(devHistory.data.messages.some((m: any) => m.content === 'Message in dev')).toBe(true);

    // Verify rooms are separate
    expect(generalHistory.data.messages.some((m: any) => m.content === 'Message in dev')).toBe(false);
    expect(devHistory.data.messages.some((m: any) => m.content === 'Message in general')).toBe(false);
  });

  test('should handle error scenarios gracefully', async () => {
    // Test command without login
    const noLoginResult = await system.executeCommand('list', []);
    expect(noLoginResult.success).toBe(true); // Command executes but returns error in output
    const noLoginData = JSON.parse(noLoginResult.output);
    expect(noLoginData.success).toBe(false);
    expect(noLoginData.error).toBe('NOT_LOGGED_IN');

    // Login
    await system.executeCommand('login', ['user1', 'Alice']);

    // Test join non-existent room
    const joinBadResult = await system.executeCommand('join', ['nonexistent']);
    expect(joinBadResult.success).toBe(true);
    const joinBadData = JSON.parse(joinBadResult.output);
    expect(joinBadData.success).toBe(false);
    expect(joinBadData.error).toBe('ROOM_NOT_FOUND');

    // Test send message without joining room
    const sendNoRoomResult = await system.executeCommand('send', ['hello']);
    expect(sendNoRoomResult.success).toBe(true);
    const sendNoRoomData = JSON.parse(sendNoRoomResult.output);
    expect(sendNoRoomData.success).toBe(false);
    expect(sendNoRoomData.error).toBe('NOT_IN_ROOM');

    // Test create room with duplicate name
    await system.executeCommand('create-room', ['test', 'Test room']);
    const duplicateResult = await system.executeCommand('create-room', ['test', 'Another test']);
    expect(duplicateResult.success).toBe(true);
    const duplicateData = JSON.parse(duplicateResult.output);
    expect(duplicateData.success).toBe(false);
    expect(duplicateData.error).toBe('ROOM_EXISTS');

    // Test leave room without being in one
    const leaveNoRoomResult = await system.executeCommand('leave', []);
    expect(leaveNoRoomResult.success).toBe(true);
    const leaveNoRoomData = JSON.parse(leaveNoRoomResult.output);
    expect(leaveNoRoomData.success).toBe(false);
    expect(leaveNoRoomData.error).toBe('NOT_IN_ROOM');

    // Test empty message
    await system.executeCommand('join', ['test']);
    const emptyMessageResult = await system.executeCommand('send', ['']);
    expect(emptyMessageResult.success).toBe(true);
    const emptyMessageData = JSON.parse(emptyMessageResult.output);
    expect(emptyMessageData.success).toBe(false);
    expect(emptyMessageData.error).toBe('EMPTY_MESSAGE');
  });

  test('should maintain data consistency across operations', async () => {
    // Login and create room
    await system.executeCommand('login', ['user1', 'Alice']);
    const createResult = await system.executeCommand('create-room', ['consistency-test', 'Consistency testing']);
    expect(createResult.success).toBe(true);
    const createData = JSON.parse(createResult.output);
    const roomId = createData.data.roomId;

    // Join room and send multiple messages
    await system.executeCommand('join', ['consistency-test']);
    
    for (let i = 1; i <= 5; i++) {
      await system.executeCommand('send', [`Message ${i}`]);
    }

    // Check storage consistency through direct file access
    const rooms = await system.getRooms();
    const room = rooms.find(r => r.id === roomId);
    expect(room!.messageCount).toBe(5);

    const messages = await system.getMessages(roomId);
    expect(messages).toHaveLength(5);

    // Check CLI history consistency
    const historyResult = await system.executeCommand('history', ['10']);
    expect(historyResult.success).toBe(true);
    const historyData = JSON.parse(historyResult.output);
    expect(historyData.success).toBe(true);
    expect(historyData.data.messages).toHaveLength(5);

    // Verify message content and ordering
    const cliMessages = historyData.data.messages;
    for (let i = 0; i < 5; i++) {
      expect(cliMessages[i].content).toBe(`Message ${i + 1}`);
      expect(cliMessages[i].username).toBe('Alice');
    }

    // Verify storage messages match CLI messages
    for (let i = 0; i < 5; i++) {
      expect(messages[i].content).toBe(`Message ${i + 1}`);
      expect(messages[i].username).toBe('Alice');
    }
  });

  test('should demonstrate workspace integration through file operations', async () => {
    // Login
    await system.executeCommand('login', ['user1', 'Alice']);

    // Create workspace context simulation
    const contextScript = join(testDir, 'scripts', 'workspace-context.js');
    const contextContent = `
      const fs = require('fs');
      const path = require('path');

      // Create a simulated workspace context file
      const workspaceContext = {
        workspace: 'Chat Room AIdev Workspace',
        path: '${testDir}',
        themes: [
          { id: 'pocketflow', enabled: true },
          { id: 'chat-space', enabled: true }
        ],
        features: { 
          crossThemeIntegration: true,
          realTimeMessaging: true 
        }
      };

      const contextFile = path.join('${testDir}', 'workspace-context.json');
      fs.writeFileSync(contextFile, JSON.stringify(workspaceContext, null, 2));
      console.log('Workspace context created');
    `;

    await fs.writeFile(contextScript, contextContent);
    execSync(`node "${contextScript}"`, { cwd: testDir });

    // Create and join room
    await system.executeCommand('create-room', ['workspace-test', 'Workspace integration test']);
    await system.executeCommand('join', ['workspace-test']);

    // Send message with workspace reference
    await system.executeCommand('send', ['Testing workspace integration']);

    // Verify workspace context file exists
    const contextFile = join(testDir, 'workspace-context.json');
    expect(await fs.access(contextFile).then(() => true).catch(() => false)).toBe(true);

    const contextData = JSON.parse(await fs.readFile(contextFile, 'utf8'));
    expect(contextData.workspace).toBe('Chat Room AIdev Workspace');
    expect(contextData.themes).toHaveLength(2);
    expect(contextData.themes.find((t: any) => t.id === 'chat-space')).toBeDefined();

    // Verify room and message were created
    const rooms = await system.getRooms();
    const workspaceRoom = rooms.find(r => r.name === 'workspace-test');
    expect(workspaceRoom).toBeDefined();
    expect(workspaceRoom!.messageCount).toBe(1);

    const messages = await system.getMessages(workspaceRoom!.id);
    expect(messages[0].content).toBe('Testing workspace integration');
  });

  test('should handle concurrent operations through parallel script execution', async () => {
    // Login and setup
    await system.executeCommand('login', ['user1', 'Alice']);
    await system.executeCommand('create-room', ['concurrent-test', 'Concurrency testing']);
    await system.executeCommand('join', ['concurrent-test']);

    // Create multiple scripts that send messages concurrently
    const concurrentScripts: Promise<void>[] = [];
    
    for (let i = 1; i <= 5; i++) {
      const scriptPromise = (async () => {
        const script = join(testDir, 'scripts', `concurrent-${i}.js`);
        const scriptContent = `
          const { execSync } = require('child_process');
          const cliScript = '${join(testDir, 'scripts', 'chat-cli.js')}';
          
          // Login for this script instance
          execSync(\`node "\${cliScript}" login user${i} User${i}\`);
          
          // Join the concurrent test room
          execSync(\`node "\${cliScript}" join concurrent-test\`);
          
          // Send message
          execSync(\`node "\${cliScript}" send "Concurrent message ${i}"\`);
          
          console.log('Script ${i} In Progress');
        `;
        
        await fs.writeFile(script, scriptContent);
        execSync(`node "${script}"`, { cwd: testDir, stdio: 'pipe' });
      })();
      
      concurrentScripts.push(scriptPromise);
    }

    // Wait for all scripts to complete
    await Promise.all(concurrentScripts);

    // Check final message count through history
    const historyResult = await system.executeCommand('history', ['20']);
    expect(historyResult.success).toBe(true);
    const historyData = JSON.parse(historyResult.output);
    expect(historyData.success).toBe(true);
    
    // Should have at least 5 messages (from concurrent scripts)
    expect(historyData.data.messages.length).toBeGreaterThanOrEqual(5);

    // Verify room state through direct access
    const rooms = await system.getRooms();
    const concurrentRoom = rooms.find(r => r.name === 'concurrent-test');
    expect(concurrentRoom).toBeDefined();
    expect(concurrentRoom!.messageCount).toBeGreaterThanOrEqual(5);

    // Verify messages contain concurrent content
    const messages = await system.getMessages(concurrentRoom!.id);
    const concurrentMessages = messages.filter(m => m.content.includes('Concurrent message'));
    expect(concurrentMessages.length).toBeGreaterThanOrEqual(5);
  });

  test('should handle room lifecycle edge cases', async () => {
    // Login
    await system.executeCommand('login', ['user1', 'Alice']);

    // Create room with special characters (should be handled)
    const createSpecialResult = await system.executeCommand('create-room', ['test-room_123', 'Special room']);
    expect(createSpecialResult.success).toBe(true);
    const createSpecialData = JSON.parse(createSpecialResult.output);
    expect(createSpecialData.success).toBe(true);

    // Try to create room with empty name
    const createEmptyResult = await system.executeCommand('create-room', ['', 'Empty name']);
    expect(createEmptyResult.success).toBe(true);
    const createEmptyData = JSON.parse(createEmptyResult.output);
    expect(createEmptyData.success).toBe(false);

    // Join valid room and test empty messages
    await system.executeCommand('join', ['test-room_123']);
    
    // Send empty message
    const sendEmptyResult = await system.executeCommand('send', ['']);
    expect(sendEmptyResult.success).toBe(true);
    const sendEmptyData = JSON.parse(sendEmptyResult.output);
    expect(sendEmptyData.success).toBe(false);
    expect(sendEmptyData.error).toBe('EMPTY_MESSAGE');

    // Send whitespace-only message
    const sendWhitespaceResult = await system.executeCommand('send', ['   ']);
    expect(sendWhitespaceResult.success).toBe(true);
    const sendWhitespaceData = JSON.parse(sendWhitespaceResult.output);
    expect(sendWhitespaceData.success).toBe(false);
    expect(sendWhitespaceData.error).toBe('EMPTY_MESSAGE');

    // Send valid message to ensure system still works
    const sendValidResult = await system.executeCommand('send', ['Valid message']);
    expect(sendValidResult.success).toBe(true);
    const sendValidData = JSON.parse(sendValidResult.output);
    expect(sendValidData.success).toBe(true);
  });

  test('should maintain event ordering through file timestamps', async () => {
    // Login
    await system.executeCommand('login', ['user1', 'Alice']);

    // Perform sequence of operations with delays to ensure ordering
    await system.executeCommand('create-room', ['sequence-test', 'Sequence testing']);
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    
    await system.executeCommand('join', ['sequence-test']);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await system.executeCommand('send', ['First message']);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await system.executeCommand('send', ['Second message']);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await system.executeCommand('leave', []);

    // Check event files in the data directory for ordering
    const eventFiles = await fs.readdir(join(testDir, 'data'));
    const events = eventFiles
      .filter(f => f.startsWith('event-') && f.endsWith('.json'))
      .sort(); // Should be chronologically sorted by filename timestamp

    expect(events.length).toBeGreaterThan(0);

    // Verify event content ordering
    const eventData = [];
    for (const eventFile of events) {
      const content = await fs.readFile(join(testDir, 'data', eventFile), 'utf8');
      eventData.push(JSON.parse(content));
    }

    // Should have user_joined and user_left events
    const joinEvents = eventData.filter(e => e.type === 'user_joined');
    const leftEvents = eventData.filter(e => e.type === 'user_left');
    
    expect(joinEvents.length).toBeGreaterThan(0);
    expect(leftEvents.length).toBeGreaterThan(0);

    // Verify room exists and has correct message count
    const rooms = await system.getRooms();
    const sequenceRoom = rooms.find(r => r.name === 'sequence-test');
    expect(sequenceRoom).toBeDefined();
    expect(sequenceRoom!.messageCount).toBe(2);

    // Verify message ordering
    const messages = await system.getMessages(sequenceRoom!.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('First message');
    expect(messages[1].content).toBe('Second message');
  });
});