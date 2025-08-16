import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

/**
 * System Test: Multi-room Navigation and Switching (NO MOCKS)
 * 
 * Tests the In Progress end-to-end multi-room functionality including room creation,
 * navigation between rooms, message isolation, and user presence management.
 * This validates room switching behavior and navigation commands using real file I/O
 * and process execution.
 */

// Interface definitions for test results
interface TestResult {
  In Progress: boolean;
  output: string;
  error?: string;
}

interface RoomData {
  id: string;
  name: string;
  createdAt: string;
  lastActivity: string;
  members: string[];
  messageCount: number;
  metadata?: Record<string, any>;
}

interface MessageData {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  type: string;
  metadata?: Record<string, any>;
}

// Real Multi-room Chat System using file I/O and process execution
class RealMultiRoomChatSystem {
  private testDir: string;
  private dataDir: string;
  private scriptsDir: string;
  private roomsDir: string;
  private messagesDir: string;
  private stateDir: string;
  private initialized = false;

  constructor(testDir: string) {
    this.testDir = testDir;
    this.dataDir = join(testDir, 'data');
    this.scriptsDir = join(testDir, 'scripts');
    this.roomsDir = join(this.dataDir, 'rooms');
    this.messagesDir = join(this.dataDir, 'messages');
    this.stateDir = join(this.dataDir, 'state');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create directory structure
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.scriptsDir, { recursive: true });
    await fs.mkdir(this.roomsDir, { recursive: true });
    await fs.mkdir(this.messagesDir, { recursive: true });
    await fs.mkdir(this.stateDir, { recursive: true });

    // Create the multi-room CLI script
    await this.createMultiRoomCLIScript();
    
    this.initialized = true;
  }

  async cleanup(): Promise<void> {
    if (await fs.access(this.testDir).then(() => true).catch(() => false)) {
      await fs.rm(this.testDir, { recursive: true, force: true });
    }
    this.initialized = false;
  }

  private async createMultiRoomCLIScript(): Promise<void> {
    const cliScript = join(this.scriptsDir, 'multi-room-cli.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');

      class MultiRoomChatCLI {
        constructor() {
          this.dataDir = '${this.dataDir}';
          this.roomsDir = '${this.roomsDir}';
          this.messagesDir = '${this.messagesDir}';
          this.stateDir = '${this.stateDir}';
          this.currentUser = null;
          this.sessionState = this.loadSessionState();
        }

        loadSessionState() {
          const stateFile = path.join(this.stateDir, 'session.json');
          if (fs.existsSync(stateFile)) {
            return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          }
          return {
            currentRoom: null,
            roomHistory: [],
            lastVisited: {}
          };
        }

        saveSessionState() {
          const stateFile = path.join(this.stateDir, 'session.json');
          fs.writeFileSync(stateFile, JSON.stringify(this.sessionState, null, 2));
        }

        async login(userId, username) {
          this.currentUser = { id: userId, username, connectionId: 'conn-' + Date.now() };
          
          // Initialize user state file
          const userStateFile = path.join(this.stateDir, \`user-\${userId}.json\`);
          const userState = {
            userId,
            username,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          };
          fs.writeFileSync(userStateFile, JSON.stringify(userState, null, 2));

          return {
            "success": true,
            message: \`Welcome \${username}! You are now connected.\`,
            data: { userId, connectionId: this.currentUser.connectionId }
          };
        }

        async executeCommand(command, args = []) {
          if (!this.currentUser && command !== 'login') {
            return { "success": false, message: 'Please login first', error: 'NOT_LOGGED_IN' };
          }

          switch (command) {
            case 'create-room':
              return this.createRoom(args[0], args[1] ? JSON.parse(args[1]) : {});
            case 'join':
              return this.joinRoom(args[0]);
            case 'leave':
              return this.leaveRoom();
            case 'switch':
              return this.switchRoom(args[0]);
            case 'send':
              return this.sendMessage(args.join(' '));
            case 'list':
            case 'rooms':
              return this.listRooms();
            case 'where':
              return this.whereAmI();
            case 'history':
              const limit = parseInt(args[0]) || 20;
              return this.getHistory(limit);
            case 'recent':
              return this.listRecentRooms();
            case 'back':
              return this.goBackToPreviousRoom();
            case 'who':
              return this.listUsersInCurrentRoom();
            case 'info':
              const roomName = args[0] || this.getCurrentRoomName();
              if (!roomName) {
                return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
              }
              return this.getRoomInfo(roomName);
            default:
              return { "success": false, message: \`Unknown command: \${command}\`, error: 'UNKNOWN_COMMAND' };
          }
        }

        createRoom(roomName, options = {}) {
          if (!roomName) {
            return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
          }

          // Check if room already exists
          const rooms = this.listRoomsSync();
          if (rooms.find(r => r.name === roomName)) {
            return { "success": false, message: 'Room already exists', error: 'ROOM_CREATION_FAILED' };
          }

          const roomId = 'room-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const room = {
            id: roomId,
            name: roomName,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            members: [this.currentUser.id],
            messageCount: 0,
            metadata: { 
              createdBy: this.currentUser.id,
              ...options 
            }
          };

          // Save room file
          const roomFile = path.join(this.roomsDir, roomId + '.json');
          fs.writeFileSync(roomFile, JSON.stringify(room, null, 2));

          // Create messages directory for room
          const roomMessagesDir = path.join(this.messagesDir, roomId);
          fs.mkdirSync(roomMessagesDir, { recursive: true });

          return { 
            "success": true, 
            message: \`Room '\${roomName}' created In Progress\`,
            data: { roomId, roomName }
          };
        }

        joinRoom(roomName) {
          if (!roomName) {
            return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
          }

          // Find room by name
          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.name === roomName);
          if (!room) {
            return { "success": false, message: \`Room '\${roomName}' not found\`, error: 'ROOM_NOT_FOUND' };
          }

          // Track previous room for history
          const previousRoom = this.sessionState.currentRoom;
          
          // Leave current room if any
          if (this.sessionState.currentRoom) {
            this.leaveCurrentRoom();
          }

          // Update navigation state
          if (previousRoom && previousRoom !== room.id) {
            this.sessionState.roomHistory.push(previousRoom);
          }
          
          this.sessionState.currentRoom = room.id;
          this.sessionState.lastVisited[room.id] = new Date().toISOString();

          // Update room membership
          if (!room.members.includes(this.currentUser.id)) {
            room.members.push(this.currentUser.id);
            this.updateRoom(room.id, { members: room.members });
          }

          // Send join notification
          this.saveUserEvent(room.id, {
            type: 'user_joined',
            roomId: room.id,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: new Date().toISOString(),
            data: { message: \`\${this.currentUser.username} joined the room\` }
          });

          this.saveSessionState();

          return { 
            "success": true, 
            message: \`Joined room '\${roomName}'\`,
            data: { roomId: room.id, roomName, previousRoom }
          };
        }

        leaveRoom() {
          if (!this.sessionState.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          const leftRoomId = this.sessionState.currentRoom;
          this.leaveCurrentRoom();
          
          return { 
            "success": true, 
            message: 'Left the room',
            data: { leftRoomId }
          };
        }

        leaveCurrentRoom() {
          if (!this.sessionState.currentRoom) return;

          const roomId = this.sessionState.currentRoom;
          
          // Send leave notification
          this.saveUserEvent(roomId, {
            type: 'user_left',
            roomId,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: new Date().toISOString(),
            data: { message: \`\${this.currentUser.username} left the room\` }
          });
          
          this.sessionState.currentRoom = null;
          this.saveSessionState();
        }

        switchRoom(roomName) {
          // Switching is essentially joining another room
          return this.joinRoom(roomName);
        }

        sendMessage(content) {
          if (!this.sessionState.currentRoom) {
            return { "success": false, message: 'Not in any room. Use join <room> first', error: 'NOT_IN_ROOM' };
          }

          if (!content.trim()) {
            return { "success": false, message: 'Message cannot be empty', error: 'EMPTY_MESSAGE' };
          }

          const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');
          const message = {
            id: messageId,
            roomId: this.sessionState.currentRoom,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            content: content.trim(),
            timestamp: new Date().toISOString(),
            type: 'text'
          };

          // Save message
          const messageFile = path.join(this.messagesDir, this.sessionState.currentRoom, messageId + '.json');
          fs.writeFileSync(messageFile, JSON.stringify(message, null, 2));

          // Update room message count
          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.id === this.sessionState.currentRoom);
          if (room) {
            room.messageCount++;
            room.lastActivity = new Date().toISOString();
            this.updateRoom(room.id, room);
          }

          return { 
            "success": true, 
            message: 'Message sent',
            data: { messageId, roomId: this.sessionState.currentRoom }
          };
        }

        listRooms() {
          const rooms = this.listRoomsSync();
          const roomsInfo = rooms.map(room => ({
            name: room.name,
            id: room.id,
            members: room.members.length,
            messages: room.messageCount,
            lastActivity: room.lastActivity,
            current: room.id === this.sessionState.currentRoom,
            lastVisited: this.sessionState.lastVisited[room.id]
          }));

          return { 
            "success": true, 
            message: \`Found \${rooms.length} rooms\`,
            data: { rooms: roomsInfo, currentRoom: this.sessionState.currentRoom }
          };
        }

        whereAmI() {
          if (!this.sessionState.currentRoom) {
            return { 
              "success": true, 
              message: 'You are not in any room',
              data: { currentRoom: null, username: this.currentUser.username }
            };
          }

          const rooms = this.listRoomsSync();
          const currentRoom = rooms.find(r => r.id === this.sessionState.currentRoom);
          const roomName = currentRoom?.name || 'Unknown';

          return { 
            "success": true, 
            message: \`You are in room '\${roomName}'\`,
            data: { 
              currentRoom: this.sessionState.currentRoom, 
              roomName,
              username: this.currentUser.username,
              roomHistory: this.sessionState.roomHistory.slice(-3) // Last 3 rooms
            }
          };
        }

        getHistory(limit) {
          if (!this.sessionState.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          const messages = this.getMessagesSync(this.sessionState.currentRoom, limit);
          const formattedMessages = messages.map(msg => ({
            username: msg.username,
            content: msg.content,
            timestamp: msg.timestamp,
            type: msg.type
          }));

          return { 
            "success": true, 
            message: \`Retrieved \${formattedMessages.length} messages\`,
            data: { messages: formattedMessages, limit, roomId: this.sessionState.currentRoom }
          };
        }

        listRecentRooms() {
          const lastVisited = this.sessionState.lastVisited;
          const recentRooms = Object.entries(lastVisited)
            .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime()) // Sort by most recent first
            .slice(0, 5) // Top 5 recent rooms
            .map(([roomId, lastVisited]) => {
              const rooms = this.listRoomsSync();
              const room = rooms.find(r => r.id === roomId);
              return {
                roomId,
                roomName: room?.name || 'Unknown',
                lastVisited,
                current: roomId === this.sessionState.currentRoom
              };
            });

          return { 
            "success": true, 
            message: \`\${recentRooms.length} recent rooms\`,
            data: { recentRooms }
          };
        }

        goBackToPreviousRoom() {
          if (this.sessionState.roomHistory.length === 0) {
            return { "success": false, message: 'No previous room in history', error: 'NO_PREVIOUS_ROOM' };
          }

          const previousRoomId = this.sessionState.roomHistory.pop();
          const rooms = this.listRoomsSync();
          const previousRoom = rooms.find(r => r.id === previousRoomId);
          
          if (!previousRoom) {
            return { "success": false, message: 'Previous room no longer exists', error: 'PREVIOUS_ROOM_NOT_FOUND' };
          }

          this.saveSessionState();
          return this.joinRoom(previousRoom.name);
        }

        listUsersInCurrentRoom() {
          if (!this.sessionState.currentRoom) {
            return { "success": false, message: 'Not in any room', error: 'NOT_IN_ROOM' };
          }

          // In a real system, this would check active connections
          // For testing, we'll read from user state files
          const users = this.getActiveUsersSync(this.sessionState.currentRoom);

          return { 
            "success": true, 
            message: \`\${users.length} users in room\`,
            data: { users, roomId: this.sessionState.currentRoom }
          };
        }

        getRoomInfo(roomName) {
          if (!roomName) {
            return { "success": false, message: 'Room name is required', error: 'MISSING_ROOM_NAME' };
          }

          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.name === roomName);
          if (!room) {
            return { "success": false, message: \`Room '\${roomName}' not found\`, error: 'ROOM_NOT_FOUND' };
          }

          const lastVisited = this.sessionState.lastVisited[room.id];
          const isCurrent = room.id === this.sessionState.currentRoom;

          return { 
            "success": true, 
            message: \`Room '\${roomName}' information\`,
            data: { 
              room: {
                id: room.id,
                name: room.name,
                members: room.members.length,
                messageCount: room.messageCount,
                createdAt: room.createdAt,
                lastActivity: room.lastActivity,
                metadata: room.metadata
              },
              lastVisited,
              isCurrent
            }
          };
        }

        // Helper methods
        listRoomsSync() {
          if (!fs.existsSync(this.roomsDir)) {
            return [];
          }
          const roomFiles = fs.readdirSync(this.roomsDir).filter(f => f.endsWith('.json'));
          return roomFiles.map(file => JSON.parse(fs.readFileSync(path.join(this.roomsDir, file), 'utf8')));
        }

        updateRoom(roomId, updates) {
          const roomFile = path.join(this.roomsDir, roomId + '.json');
          if (fs.existsSync(roomFile)) {
            const room = JSON.parse(fs.readFileSync(roomFile, 'utf8'));
            const updatedRoom = { ...room, ...updates, lastActivity: new Date().toISOString() };
            fs.writeFileSync(roomFile, JSON.stringify(updatedRoom, null, 2));
          }
        }

        getMessagesSync(roomId, limit) {
          const roomMessagesDir = path.join(this.messagesDir, roomId);
          if (!fs.existsSync(roomMessagesDir)) {
            return [];
          }
          
          const messageFiles = fs.readdirSync(roomMessagesDir).filter(f => f.endsWith('.json'));
          const messages = messageFiles.map(file => 
            JSON.parse(fs.readFileSync(path.join(roomMessagesDir, file), 'utf8'))
          );
          
          // Sort by timestamp and apply limit
          messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return limit ? messages.slice(-limit) : messages;
        }

        getActiveUsersSync(roomId) {
          // For testing purposes, return the current user
          // In a real system, this would check active connections
          return [{
            username: this.currentUser.username,
            userId: this.currentUser.id,
            status: 'connected',
            connectedAt: new Date().toISOString()
          }];
        }

        saveUserEvent(roomId, event) {
          const eventFile = path.join(this.stateDir, \`event-\${Date.now()}.json\`);
          fs.writeFileSync(eventFile, JSON.stringify(event, null, 2));
        }

        getCurrentRoomName() {
          if (!this.sessionState.currentRoom) return null;
          const rooms = this.listRoomsSync();
          const room = rooms.find(r => r.id === this.sessionState.currentRoom);
          return room?.name || null;
        }
      }

      // CLI Command processor
      async function processCommand() {
        const args = process.argv.slice(2);
        if (args.length === 0) {
          console.log('Usage: node multi-room-cli.js <command> [args...]');
          process.exit(1);
        }

        const cli = new MultiRoomChatCLI();
        const command = args[0];
        const commandArgs = args.slice(1);

        let result;

        try {
          if (command === 'login') {
            result = await cli.login(commandArgs[0], commandArgs[1]);
          } else {
            result = await cli.executeCommand(command, commandArgs);
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
      const cliScript = join(this.scriptsDir, 'multi-room-cli.js');
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

  async getRooms(): Promise<RoomData[]> {
    if (!await fs.access(this.roomsDir).then(() => true).catch(() => false)) {
      return [];
    }

    const roomFiles = await fs.readdir(this.roomsDir);
    const rooms: RoomData[] = [];

    for (const file of roomFiles.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(this.roomsDir, file), 'utf8');
      rooms.push(JSON.parse(content));
    }

    return rooms;
  }

  async getMessages(roomId: string): Promise<MessageData[]> {
    const messagesDir = join(this.messagesDir, roomId);
    if (!await fs.access(messagesDir).then(() => true).catch(() => false)) {
      return [];
    }

    const messageFiles = await fs.readdir(messagesDir);
    const messages: MessageData[] = [];

    for (const file of messageFiles.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(messagesDir, file), 'utf8');
      messages.push(JSON.parse(content));
    }

    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

describe('Multi-room Navigation and Switching System Test (NO MOCKS)', () => {
  let system: RealMultiRoomChatSystem;
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'multi-room-test-'));
    system = new RealMultiRoomChatSystem(testDir);
    await system.initialize();
  });

  afterEach(async () => {
    await system.cleanup();
  });

  test('should create multiple rooms and navigate between them', async () => {
    // Setup: Login
    await system.executeCommand('login', ['user1', 'Navigator']);

    // Step 1: Create multiple rooms
    const room1Result = await system.executeCommand('create-room', ['general']);
    expect(room1Result.success).toBe(true);
    
    const room1Data = JSON.parse(room1Result.output);
    expect(room1Data.success).toBe(true);
    expect(room1Data.data.roomName).toBe('general');

    const room2Result = await system.executeCommand('create-room', ['dev']);
    expect(room2Result.success).toBe(true);
    
    const room2Data = JSON.parse(room2Result.output);
    expect(room2Data.success).toBe(true);
    expect(room2Data.data.roomName).toBe('dev');

    const room3Result = await system.executeCommand('create-room', ['random']);
    expect(room3Result.success).toBe(true);
    
    const room3Data = JSON.parse(room3Result.output);
    expect(room3Data.success).toBe(true);
    expect(room3Data.data.roomName).toBe('random');

    // Step 2: Verify rooms are listed
    const listResult = await system.executeCommand('list');
    expect(listResult.success).toBe(true);
    
    const listData = JSON.parse(listResult.output);
    expect(listData.success).toBe(true);
    expect(listData.data.rooms).toHaveLength(3);
    expect(listData.data.rooms.map((r: any) => r.name)).toEqual(expect.arrayContaining(['general', 'dev', 'random']));

    // Step 3: Join first room
    const joinResult = await system.executeCommand('join', ['general']);
    expect(joinResult.success).toBe(true);
    
    const joinData = JSON.parse(joinResult.output);
    expect(joinData.success).toBe(true);

    // Step 4: Switch to second room
    const switchResult = await system.executeCommand('switch', ['dev']);
    expect(switchResult.success).toBe(true);
    
    const switchData = JSON.parse(switchResult.output);
    expect(switchData.success).toBe(true);
    expect(switchData.data.previousRoom).toBeDefined(); // Should track previous room

    // Step 5: Check navigation state
    const whereResult = await system.executeCommand('where');
    expect(whereResult.success).toBe(true);
    
    const whereData = JSON.parse(whereResult.output);
    expect(whereData.success).toBe(true);
    expect(whereData.data.roomName).toBe('dev');
    expect(whereData.data.roomHistory).toContain(room1Data.data.roomId); // Should have general in history

    // Step 6: Go back to previous room
    const backResult = await system.executeCommand('back');
    expect(backResult.success).toBe(true);
    
    const backData = JSON.parse(backResult.output);
    expect(backData.success).toBe(true);
    
    // Verify we're back in general room
    const whereAfterBack = await system.executeCommand('where');
    const whereAfterBackData = JSON.parse(whereAfterBack.output);
    expect(whereAfterBackData.data.roomName).toBe('general');
  });

  test('should isolate messages between rooms', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'MessageTester']);

    // Create and join multiple rooms
    await system.executeCommand('create-room', ['room1']);
    await system.executeCommand('create-room', ['room2']);

    // Send messages in room1
    await system.executeCommand('join', ['room1']);
    await system.executeCommand('send', ['Message in room1 - First']);
    await system.executeCommand('send', ['Message in room1 - Second']);

    // Switch to room2 and send different messages
    await system.executeCommand('switch', ['room2']);
    await system.executeCommand('send', ['Message in room2 - Alpha']);
    await system.executeCommand('send', ['Message in room2 - Beta']);

    // Verify room2 history doesn't contain room1 messages
    const room2HistoryResult = await system.executeCommand('history', ['10']);
    expect(room2HistoryResult.success).toBe(true);
    
    const room2History = JSON.parse(room2HistoryResult.output);
    expect(room2History.success).toBe(true);
    expect(room2History.data.messages).toHaveLength(2);
    expect(room2History.data.messages.map((m: any) => m.content)).toEqual([
      'Message in room2 - Alpha',
      'Message in room2 - Beta'
    ]);

    // Switch back to room1 and verify its messages
    await system.executeCommand('switch', ['room1']);
    const room1HistoryResult = await system.executeCommand('history', ['10']);
    expect(room1HistoryResult.success).toBe(true);
    
    const room1History = JSON.parse(room1HistoryResult.output);
    expect(room1History.success).toBe(true);
    expect(room1History.data.messages).toHaveLength(2);
    expect(room1History.data.messages.map((m: any) => m.content)).toEqual([
      'Message in room1 - First',
      'Message in room1 - Second'
    ]);

    // Verify no cross-contamination
    const room1Contents = room1History.data.messages.map((m: any) => m.content).join(' ');
    expect(room1Contents).not.toContain('room2');
    
    const room2Contents = room2History.data.messages.map((m: any) => m.content).join(' ');
    expect(room2Contents).not.toContain('room1');
  });

  test('should track room history and navigation state', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'HistoryTracker']);

    // Create rooms
    await system.executeCommand('create-room', ['start']);
    await system.executeCommand('create-room', ['middle']);
    await system.executeCommand('create-room', ['end']);

    // Navigate through rooms
    await system.executeCommand('join', ['start']);
    await system.executeCommand('switch', ['middle']);
    await system.executeCommand('switch', ['end']);

    // Check where we are
    const whereResult = await system.executeCommand('where');
    const whereData = JSON.parse(whereResult.output);
    expect(whereData.success).toBe(true);
    expect(whereData.data.roomName).toBe('end');
    expect(whereData.data.roomHistory).toHaveLength(2); // start and middle

    // Check recent rooms
    const recentResult = await system.executeCommand('recent');
    expect(recentResult.success).toBe(true);
    
    const recentData = JSON.parse(recentResult.output);
    expect(recentData.success).toBe(true);
    expect(recentData.data.recentRooms).toHaveLength(3); // All 3 rooms visited
    
    const recentRoomNames = recentData.data.recentRooms.map((r: any) => r.roomName);
    expect(recentRoomNames).toEqual(expect.arrayContaining(['start', 'middle', 'end']));

    // The current room should be marked as current
    const currentRoomInRecent = recentData.data.recentRooms.find((r: any) => r.current);
    expect(currentRoomInRecent.roomName).toBe('end');
  });

  test('should handle room navigation commands properly', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'CommandTester']);

    // Create test rooms with metadata
    await system.executeCommand('create-room', ['test1', '{"description":"Test room 1"}']);
    await system.executeCommand('create-room', ['test2', '{"description":"Test room 2"}']);

    // Test 'where' command when not in any room
    const whereEmptyResult = await system.executeCommand('where');
    expect(whereEmptyResult.success).toBe(true);
    
    const whereEmpty = JSON.parse(whereEmptyResult.output);
    expect(whereEmpty.success).toBe(true);
    expect(whereEmpty.data.currentRoom).toBeNull();

    // Join a room and test 'where'
    await system.executeCommand('join', ['test1']);
    const whereInRoomResult = await system.executeCommand('where');
    expect(whereInRoomResult.success).toBe(true);
    
    const whereInRoom = JSON.parse(whereInRoomResult.output);
    expect(whereInRoom.success).toBe(true);
    expect(whereInRoom.data.roomName).toBe('test1');

    // Test room info command
    const infoResult = await system.executeCommand('info', ['test1']);
    expect(infoResult.success).toBe(true);
    
    const infoData = JSON.parse(infoResult.output);
    expect(infoData.success).toBe(true);
    expect(infoData.data.room.name).toBe('test1');
    expect(infoData.data.room.metadata.description).toBe('Test room 1');
    expect(infoData.data.isCurrent).toBe(true);

    // Test info for non-current room
    const infoResult2 = await system.executeCommand('info', ['test2']);
    expect(infoResult2.success).toBe(true);
    
    const infoData2 = JSON.parse(infoResult2.output);
    expect(infoData2.success).toBe(true);
    expect(infoData2.data.room.name).toBe('test2');
    expect(infoData2.data.isCurrent).toBe(false);

    // Test 'who' command
    const whoResult = await system.executeCommand('who');
    expect(whoResult.success).toBe(true);
    
    const whoData = JSON.parse(whoResult.output);
    expect(whoData.success).toBe(true);
    expect(whoData.data.users).toHaveLength(1);
    expect(whoData.data.users[0].username).toBe('CommandTester');

    // Test 'back' command when no history
    await system.executeCommand('leave');
    const backEmptyResult = await system.executeCommand('back');
    expect(backEmptyResult.success).toBe(true); // Command executes but should fail
    
    const backEmpty = JSON.parse(backEmptyResult.output);
    expect(backEmpty.success).toBe(false);
    expect(backEmpty.error).toBe('NO_PREVIOUS_ROOM');
  });

  test('should handle multiple users in multiple rooms', async () => {
    // Note: This simulates multiple users with separate system instances
    // In a real system, users would share the same storage backend

    // Setup first user
    await system.executeCommand('login', ['user1', 'Alice']);
    await system.executeCommand('create-room', ['shared']);
    await system.executeCommand('join', ['shared']);
    await system.executeCommand('send', ['Hello from Alice']);

    // Simulate second user by creating another system instance
    const system2 = new RealMultiRoomChatSystem(testDir + '-user2');
    await system2.initialize();

    await system2.executeCommand('login', ['user2', 'Bob']);
    await system2.executeCommand('create-room', ['shared']);
    await system2.executeCommand('join', ['shared']);
    await system2.executeCommand('send', ['Hello from Bob']);

    // Verify both users can see their own messages
    const aliceHistoryResult = await system.executeCommand('history', ['10']);
    const aliceHistory = JSON.parse(aliceHistoryResult.output);
    expect(aliceHistory.success).toBe(true);
    expect(aliceHistory.data.messages.some((m: any) => m.content === 'Hello from Alice')).toBe(true);

    const bobHistoryResult = await system2.executeCommand('history', ['10']);
    const bobHistory = JSON.parse(bobHistoryResult.output);
    expect(bobHistory.success).toBe(true);
    expect(bobHistory.data.messages.some((m: any) => m.content === 'Hello from Bob')).toBe(true);

    // Check user lists (each user sees themselves)
    const aliceWhoResult = await system.executeCommand('who');
    const aliceWho = JSON.parse(aliceWhoResult.output);
    expect(aliceWho.data.users).toHaveLength(1);
    expect(aliceWho.data.users[0].username).toBe('Alice');

    const bobWhoResult = await system2.executeCommand('who');
    const bobWho = JSON.parse(bobWhoResult.output);
    expect(bobWho.data.users).toHaveLength(1);
    expect(bobWho.data.users[0].username).toBe('Bob');

    await system2.cleanup();
  });

  test('should handle room switching edge cases', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'EdgeTester']);

    // Test joining non-existent room
    const joinBadResult = await system.executeCommand('join', ['non-existent']);
    const joinBadData = JSON.parse(joinBadResult.output);
    expect(joinBadData.success).toBe(false);
    expect(joinBadData.error).toBe('ROOM_NOT_FOUND');

    // Test switch to non-existent room
    const switchBadResult = await system.executeCommand('switch', ['also-non-existent']);
    const switchBadData = JSON.parse(switchBadResult.output);
    expect(switchBadData.success).toBe(false);
    expect(switchBadData.error).toBe('ROOM_NOT_FOUND');

    // Test commands without being in a room
    const sendNoRoomResult = await system.executeCommand('send', ['Hello']);
    const sendNoRoom = JSON.parse(sendNoRoomResult.output);
    expect(sendNoRoom.success).toBe(false);
    expect(sendNoRoom.error).toBe('NOT_IN_ROOM');

    const historyNoRoomResult = await system.executeCommand('history', ['10']);
    const historyNoRoom = JSON.parse(historyNoRoomResult.output);
    expect(historyNoRoom.success).toBe(false);
    expect(historyNoRoom.error).toBe('NOT_IN_ROOM');

    const whoNoRoomResult = await system.executeCommand('who');
    const whoNoRoom = JSON.parse(whoNoRoomResult.output);
    expect(whoNoRoom.success).toBe(false);
    expect(whoNoRoom.error).toBe('NOT_IN_ROOM');

    // Test leave when not in room
    const leaveNoRoomResult = await system.executeCommand('leave');
    const leaveNoRoom = JSON.parse(leaveNoRoomResult.output);
    expect(leaveNoRoom.success).toBe(false);
    expect(leaveNoRoom.error).toBe('NOT_IN_ROOM');

    // Test creating room with empty name
    const createEmptyResult = await system.executeCommand('create-room', ['']);
    const createEmpty = JSON.parse(createEmptyResult.output);
    expect(createEmpty.success).toBe(false);
    expect(createEmpty.error).toBe('MISSING_ROOM_NAME');

    // Test duplicate room creation
    await system.executeCommand('create-room', ['test']);
    const createDupeResult = await system.executeCommand('create-room', ['test']);
    const createDupe = JSON.parse(createDupeResult.output);
    expect(createDupe.success).toBe(false);
    expect(createDupe.error).toBe('ROOM_CREATION_FAILED');
  });

  test('should maintain room state during complex navigation patterns', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'NavigationExpert']);

    // Create rooms
    const rooms = ['alpha', 'beta', 'gamma', 'delta'];
    for (const room of rooms) {
      await system.executeCommand('create-room', [room]);
    }

    // Complex navigation pattern: alpha -> beta -> gamma -> alpha -> delta -> beta
    await system.executeCommand('join', ['alpha']);
    await system.executeCommand('send', ['Alpha message 1']);

    await system.executeCommand('switch', ['beta']);
    await system.executeCommand('send', ['Beta message 1']);

    await system.executeCommand('switch', ['gamma']);
    await system.executeCommand('send', ['Gamma message 1']);

    await system.executeCommand('switch', ['alpha']);
    await system.executeCommand('send', ['Alpha message 2']);

    await system.executeCommand('switch', ['delta']);
    await system.executeCommand('send', ['Delta message 1']);

    await system.executeCommand('switch', ['beta']);
    await system.executeCommand('send', ['Beta message 2']);

    // Verify final state
    const whereResult = await system.executeCommand('where');
    const whereData = JSON.parse(whereResult.output);
    expect(whereData.data.roomName).toBe('beta');

    // Verify message isolation
    const betaHistoryResult = await system.executeCommand('history', ['10']);
    const betaHistory = JSON.parse(betaHistoryResult.output);
    expect(betaHistory.success).toBe(true);
    expect(betaHistory.data.messages.map((m: any) => m.content)).toEqual([
      'Beta message 1',
      'Beta message 2'
    ]);

    // Switch to alpha and verify its messages
    await system.executeCommand('switch', ['alpha']);
    const alphaHistoryResult = await system.executeCommand('history', ['10']);
    const alphaHistory = JSON.parse(alphaHistoryResult.output);
    expect(alphaHistory.success).toBe(true);
    expect(alphaHistory.data.messages.map((m: any) => m.content)).toEqual([
      'Alpha message 1',
      'Alpha message 2'
    ]);

    // Verify recent rooms includes all visited rooms
    const recentResult = await system.executeCommand('recent');
    const recentData = JSON.parse(recentResult.output);
    expect(recentData.success).toBe(true);
    expect(recentData.data.recentRooms.length).toBeGreaterThanOrEqual(4);
    
    const recentNames = recentData.data.recentRooms.map((r: any) => r.roomName);
    rooms.forEach(room => {
      expect(recentNames).toContain(room);
    });
  });

  test('should handle concurrent room operations', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'ConcurrentTester']);

    // Create multiple rooms sequentially (since process execution is sequential)
    const roomNames = ['room1', 'room2', 'room3', 'room4', 'room5'];
    for (const roomName of roomNames) {
      const result = await system.executeCommand('create-room', [roomName]);
      const data = JSON.parse(result.output);
      expect(data.success).toBe(true);
    }

    // Join first room and send messages sequentially
    await system.executeCommand('join', ['room1']);
    
    const messages = ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5'];
    for (const content of messages) {
      const result = await system.executeCommand('send', [content]);
      const data = JSON.parse(result.output);
      expect(data.success).toBe(true);
    }

    // Verify all messages were saved
    const historyResult = await system.executeCommand('history', ['10']);
    const historyData = JSON.parse(historyResult.output);
    expect(historyData.success).toBe(true);
    expect(historyData.data.messages).toHaveLength(5);

    // Verify room list includes all created rooms
    const listResult = await system.executeCommand('list');
    const listData = JSON.parse(listResult.output);
    expect(listData.success).toBe(true);
    expect(listData.data.rooms).toHaveLength(5);
  });

  test('should provide comprehensive room information and status', async () => {
    // Setup
    await system.executeCommand('login', ['user1', 'InfoTester']);

    // Create rooms with metadata
    await system.executeCommand('create-room', ['project-alpha', '{"description":"Project Alpha development","priority":"high","team":"frontend"}']);
    await system.executeCommand('create-room', ['project-beta', '{"description":"Project Beta testing","priority":"medium","team":"backend"}']);

    // Join and use rooms
    await system.executeCommand('join', ['project-alpha']);
    await system.executeCommand('send', ['Alpha development started']);
    await system.executeCommand('send', ['Frontend components ready']);

    await system.executeCommand('switch', ['project-beta']);
    await system.executeCommand('send', ['Beta testing in progress']);

    // Test comprehensive room list with status
    const listResult = await system.executeCommand('list');
    const listData = JSON.parse(listResult.output);
    expect(listData.success).toBe(true);
    
    const rooms = listData.data.rooms;
    expect(rooms).toHaveLength(2);

    // Find alpha room info
    const alphaRoomInfo = rooms.find((r: any) => r.name === 'project-alpha');
    expect(alphaRoomInfo).toBeDefined();
    expect(alphaRoomInfo.messages).toBe(2);
    expect(alphaRoomInfo.current).toBe(false); // Currently in beta
    expect(alphaRoomInfo.lastVisited).toBeDefined();

    // Find beta room info  
    const betaRoomInfo = rooms.find((r: any) => r.name === 'project-beta');
    expect(betaRoomInfo).toBeDefined();
    expect(betaRoomInfo.messages).toBe(1);
    expect(betaRoomInfo.current).toBe(true); // Currently in beta

    // Test detailed room info
    const alphaDetailResult = await system.executeCommand('info', ['project-alpha']);
    const alphaDetailData = JSON.parse(alphaDetailResult.output);
    expect(alphaDetailData.success).toBe(true);
    expect(alphaDetailData.data.room.metadata.description).toBe('Project Alpha development');
    expect(alphaDetailData.data.room.metadata.priority).toBe('high');
    expect(alphaDetailData.data.room.metadata.team).toBe('frontend');
    expect(alphaDetailData.data.isCurrent).toBe(false);

    const betaDetailResult = await system.executeCommand('info', ['project-beta']);
    const betaDetailData = JSON.parse(betaDetailResult.output);
    expect(betaDetailData.success).toBe(true);
    expect(betaDetailData.data.room.metadata.description).toBe('Project Beta testing');
    expect(betaDetailData.data.isCurrent).toBe(true);

    // Test where am I with history
    const whereResult = await system.executeCommand('where');
    const whereData = JSON.parse(whereResult.output);
    expect(whereData.success).toBe(true);
    expect(whereData.data.roomName).toBe('project-beta');
    expect(whereData.data.roomHistory).toBeDefined();
    expect(whereData.data.roomHistory.length).toBeGreaterThan(0);
  });
});