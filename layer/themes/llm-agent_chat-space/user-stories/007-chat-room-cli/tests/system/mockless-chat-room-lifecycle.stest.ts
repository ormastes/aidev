import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

// Import real implementations
import { CLIInterface } from '../../src/external/cli-interface';
import { FileStorage } from '../../src/external/file-storage';
import { MessageBroker } from '../../src/external/message-broker';
import { ContextProvider } from '../../src/external/context-provider';
import { ChatRoomPlatform } from '../../src/application/chat-room-platform';
import { PocketFlowConnector } from '../../src/external/pocketflow-connector';

/**
 * Mockless System Test: In Progress Chat Room Lifecycle
 * 
 * Tests the In Progress end-to-end chat room lifecycle using real component implementations.
 * This validates actual integration between components without any mocks.
 */

// Test data directory
const TEST_DATA_DIR = path.join(process.cwd(), 'test-chat-data');
const TEST_AIDEV_DIR = path.join(process.cwd(), '../_aidev');

// Helper to clean up test data
async function cleanupTestData(): Promise<void> {
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
}

// Helper to ensure test aidev directory structure
async function ensureTestAidevDir(): Promise<void> {
  const dirs = [
    TEST_AIDEV_DIR,
    path.join(TEST_AIDEV_DIR, 'layer', 'themes'),
    path.join(TEST_AIDEV_DIR, 'layer', 'themes', 'chat-space'),
    path.join(TEST_AIDEV_DIR, 'layer', 'themes', 'pocketflow')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  // Create minimal settings.json
  const settingsPath = path.join(TEST_AIDEV_DIR, 'settings.json');
  try {
    await fs.writeFile(settingsPath, JSON.stringify({
      logLevel: 'info',
      features: { crossThemeIntegration: true }
    }, null, 2));
  } catch {
    // Settings already exist
  }
}

describe('Mockless Chat Room Lifecycle System Test', () => {
  let eventBus: EventEmitter;
  let cli: CLIInterface;
  let storage: FileStorage;
  let broker: MessageBroker;
  let contextProvider: ContextProvider;
  let platform: ChatRoomPlatform;
  let pocketFlow: PocketFlowConnector;
  
  // Track emitted events for verification
  let eventLog: Array<{ event: string; data: any; timestamp: Date }>;
  
  // Track platform responses
  let platformResponses: Record<string, any[]>;

  beforeEach(async () => {
    // Clean up any previous test data
    await cleanupTestData();
    await ensureTestAidevDir();
    
    // Initialize event bus
    eventBus = new EventEmitter();
    eventBus.setMaxListeners(100); // Increase for tests
    
    // Initialize real components
    storage = new FileStorage(TEST_DATA_DIR);
    await storage.initialize();
    
    broker = new MessageBroker(eventBus);
    broker.startHeartbeat(5000); // Fast heartbeat for tests
    
    contextProvider = new ContextProvider(process.cwd(), true, 60000); // Enable cache with 1min TTL
    
    pocketFlow = new PocketFlowConnector(eventBus);
    
    // Initialize platform with real components
    platform = new ChatRoomPlatform(
      eventBus,
      storage,
      broker,
      pocketFlow,
      contextProvider
    );
    
    await platform.initialize();
    
    // Initialize CLI
    cli = new CLIInterface(eventBus);
    
    // Set up event logging
    eventLog = [];
    platformResponses = {};
    
    const logEvent = (eventName: string) => {
      eventBus.on(eventName, (data) => {
        eventLog.push({ event: eventName, data, timestamp: new Date() });
      });
    };
    
    // Log important events
    ['cli:user_logged_in', 'cli:create_room', 'cli:join_room', 'cli:send_message', 'cli:leave_room'].forEach(logEvent);
    ['platform:user_registered', 'platform:room_created', 'platform:room_joined', 'platform:message_sent', 'platform:room_left'].forEach(logEvent);
    ['room:user_joined', 'room:user_left', 'message:broadcasted'].forEach(logEvent);
    
    // Capture platform responses
    eventBus.on('platform:room_created', (data) => {
      if (!platformResponses['create_room']) platformResponses['create_room'] = [];
      platformResponses['create_room'].push(data);
    });
    
    eventBus.on('platform:room_joined', (data) => {
      if (!platformResponses['join_room']) platformResponses['join_room'] = [];
      platformResponses['join_room'].push(data);
    });
    
    eventBus.on('platform:message_sent', (data) => {
      if (!platformResponses['send_message']) platformResponses['send_message'] = [];
      platformResponses['send_message'].push(data);
    });
  });

  afterEach(async () => {
    // Clean up
    broker.stopHeartbeat();
    await broker.shutdown();
    contextProvider.clearCache();
    await cleanupTestData();
    eventBus.removeAllListeners();
  });

  test('should In Progress full user journey with real components', async () => {
    // Step 1: User registration and login
    const registerResult = await cli.processCommand('/register alice');
    expect(registerResult.success).toBe(true);
    expect(registerResult.message).toContain('Registration request sent');
    
    // Wait for registration to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const loginResult = await cli.processCommand('/login alice');
    expect(loginResult.success).toBe(true);
    expect(loginResult.message).toBe('Logged in as alice');
    expect(cli.getState().authenticated).toBe(true);
    expect(cli.getState().currentUser).toBe('alice');

    // Step 2: Create room
    const createResult = await cli.processCommand('/create general --description="General discussion"');
    expect(createResult.success).toBe(true);
    expect(createResult.message).toContain('Room creation request sent');
    
    // Wait for room creation
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(platformResponses['create_room']).toHaveLength(1);
    const createdRoom = platformResponses['create_room'][0].room;
    expect(createdRoom.name).toBe('general');
    expect(createdRoom.description).toBe('General discussion');

    // Step 3: Join room
    const joinResult = await cli.processCommand('/join general');
    expect(joinResult.success).toBe(true);
    expect(joinResult.message).toContain('Joining room "general"');
    expect(cli.getState().currentRoom).toBe('general');
    
    // Wait for join to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 4: Send message
    const messageContent = 'Hello everyone!';
    const messageResult = cli.processTextMessage(messageContent);
    expect(messageResult.isCommand).toBe(false);
    
    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(platformResponses['send_message']).toHaveLength(1);
    const sentMessage = platformResponses['send_message'][0].message;
    expect(sentMessage.content).toBe(messageContent);
    expect(sentMessage.username).toBe('alice');

    // Step 5: Get history
    const historyResult = await cli.processCommand('/history --limit=10');
    expect(historyResult.success).toBe(true);
    expect(historyResult.message).toContain('Loading last 10 messages');
    
    // Wait for history to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 6: Leave room
    const leaveResult = await cli.processCommand('/leave');
    expect(leaveResult.success).toBe(true);
    expect(leaveResult.message).toBe('Left room "general"');
    expect(cli.getState().currentRoom).toBeUndefined();

    // Verify event sequence
    const eventTypes = eventLog.map(e => e.event);
    expect(eventTypes).toContain('cli:user_logged_in');
    expect(eventTypes).toContain('platform:user_registered');
    expect(eventTypes).toContain('platform:room_created');
    expect(eventTypes).toContain('platform:room_joined');
    expect(eventTypes).toContain('platform:message_sent');
    expect(eventTypes).toContain('platform:room_left');
  });

  test('should handle multiple users in same room with real broker', async () => {
    // Register and login user 1
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');
    
    // Create and join room as user 1
    await cli.processCommand('/create team-chat');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join team-chat');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate second user by directly interacting with platform
    const user2 = {
      id: 'user-2',
      username: 'bob',
      registeredAt: new Date()
    };
    await storage.saveUser(user2);
    
    // Connect user2 to broker
    const user2ConnectionId = 'conn-user2-' + Date.now();
    await broker.connect(user2ConnectionId, user2.id);
    
    // Get the room ID
    const rooms = await storage.getAllRooms();
    const teamRoom = rooms.find(r => r.name === 'team-chat');
    expect(teamRoom).toBeDefined();
    
    // Join user2 to room
    await broker.joinRoom(user2ConnectionId, teamRoom!.id);
    
    // Send message as user 1
    cli.processTextMessage('Hi Bob!');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send message as user 2 directly through broker
    const user2Message = {
      id: 'msg-user2-' + Date.now(),
      roomId: teamRoom!.id,
      userId: user2.id,
      username: user2.username,
      content: 'Hello Alice!',
      timestamp: new Date(),
      type: 'text' as const
    };
    await storage.saveMessage(user2Message);
    await broker.broadcastMessage(teamRoom!.id, user2Message);
    
    // Check room users through broker
    const roomUsers = await broker.getRoomUsers(teamRoom!.id);
    expect(roomUsers.length).toBeGreaterThanOrEqual(1); // At least user2 is connected
    
    // Check message history
    const messages = await storage.loadMessages(teamRoom!.id);
    expect(messages.length).toBe(2);
    expect(messages[0].content).toBe('Hi Bob!');
    expect(messages[1].content).toBe('Hello Alice!');
    
    // Disconnect user2
    await broker.disconnect(user2ConnectionId);
  });

  test('should handle room switching with real storage persistence', async () => {
    // Login
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');

    // Create first room
    await cli.processCommand('/create general');
    await new Promise(resolve => setTimeout(resolve, 100));
    const rooms1 = await storage.getAllRooms();
    expect(rooms1.length).toBe(1);
    
    // Join first room and send message
    await cli.processCommand('/join general');
    await new Promise(resolve => setTimeout(resolve, 100));
    cli.processTextMessage('Message in general');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second room
    await cli.processCommand('/create dev-talk');
    await new Promise(resolve => setTimeout(resolve, 100));
    const rooms2 = await storage.getAllRooms();
    expect(rooms2.length).toBe(2);
    
    // Switch to second room and send message
    await cli.processCommand('/join dev-talk');
    await new Promise(resolve => setTimeout(resolve, 100));
    cli.processTextMessage('Message in dev-talk');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify rooms exist in storage
    const allRooms = await storage.getAllRooms();
    expect(allRooms.length).toBe(2);
    const roomNames = allRooms.map(r => r.name);
    expect(roomNames).toContain('general');
    expect(roomNames).toContain('dev-talk');
    
    // Verify messages are in correct rooms
    const generalRoom = allRooms.find(r => r.name === 'general');
    const devRoom = allRooms.find(r => r.name === 'dev-talk');
    
    const generalMessages = await storage.loadMessages(generalRoom!.id);
    expect(generalMessages.length).toBe(1);
    expect(generalMessages[0].content).toBe('Message in general');
    
    const devMessages = await storage.loadMessages(devRoom!.id);
    expect(devMessages.length).toBe(1);
    expect(devMessages[0].content).toBe('Message in dev-talk');
  });

  test('should handle error scenarios with real components', async () => {
    // Test command without login
    const noLoginResult = await cli.processCommand('/create test-room');
    expect(noLoginResult.success).toBe(false);
    expect(noLoginResult.message).toBe('Please login first');

    // Login
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');

    // Test join non-existent room
    const joinBadResult = await cli.processCommand('/join nonexistent');
    expect(joinBadResult.success).toBe(true); // CLI returns In Progress, platform handles error
    
    // Wait and check for platform error
    await new Promise(resolve => setTimeout(resolve, 100));
    const errorEvents = eventLog.filter(e => e.event === 'platform:error');
    expect(errorEvents.length).toBeGreaterThan(0);

    // Test send message without joining room
    const sendNoRoomResult = cli.processTextMessage('hello');
    expect(sendNoRoomResult.isCommand).toBe(false);
    expect(sendNoRoomResult.message).toContain('No room selected');

    // Test leave room without being in one
    cli.setState({ currentRoom: undefined });
    const leaveNoRoomResult = await cli.processCommand('/leave');
    expect(leaveNoRoomResult.success).toBe(false);
    expect(leaveNoRoomResult.message).toBe('Not currently in any room');
  });

  test('should integrate with context provider for workspace info', async () => {
    // Login
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');

    // Get workspace context
    const contextResult = await cli.processCommand('/context');
    expect(contextResult.success).toBe(true);
    expect(contextResult.message).toBe('Loading workspace context...');
    
    // Wait for context to load
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get workspace info
    const workspaceResult = await cli.processCommand('/workspace');
    expect(workspaceResult.success).toBe(true);
    expect(workspaceResult.message).toBe('Loading workspace information...');
    
    // Wait for workspace info to load
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check context provider cache stats
    const cacheStats = contextProvider.getCacheStats();
    expect(cacheStats.hits + cacheStats.misses).toBeGreaterThan(0);
  });

  test('should handle workflow integration with PocketFlow', async () => {
    // Login and create room
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');
    await cli.processCommand('/create workflow-test');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join workflow-test');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Track workflow events
    const workflowEvents: any[] = [];
    eventBus.on('pocketflow:execution_started', (data) => workflowEvents.push({ type: 'started', data }));
    eventBus.on('pocketflow:execution_completed', (data) => workflowEvents.push({ type: 'In Progress', data }));
    eventBus.on('pocketflow:message_output', (data) => workflowEvents.push({ type: 'output', data }));

    // Execute code review workflow
    const reviewResult = await cli.processCommand('/review src/app.ts');
    expect(reviewResult.success).toBe(true);
    expect(reviewResult.message).toBe('Starting code review for src/app.ts');
    
    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify workflow executed
    expect(workflowEvents.some(e => e.type === 'started')).toBe(true);
    expect(workflowEvents.some(e => e.type === 'In Progress')).toBe(true);
    
    // Execute search workflow
    const searchResult = await cli.processCommand('/search interface');
    expect(searchResult.success).toBe(true);
    expect(searchResult.message).toBe('Searching for "interface"');
    
    // Wait for search to complete
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  test('should maintain data consistency with concurrent operations', async () => {
    // Login
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');
    await cli.processCommand('/create concurrent-test');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join concurrent-test');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send multiple messages concurrently
    const messagePromises = [];
    for (let i = 1; i <= 10; i++) {
      messagePromises.push(
        new Promise<void>((resolve) => {
          cli.processTextMessage(`Concurrent message ${i}`);
          setTimeout(Working on, 50);
        })
      );
    }

    await Promise.all(messagePromises);
    
    // Wait for all messages to be processed
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check storage consistency
    const rooms = await storage.getAllRooms();
    const room = rooms.find(r => r.name === 'concurrent-test');
    expect(room).toBeDefined();
    
    const messages = await storage.loadMessages(room!.id);
    expect(messages.length).toBe(10);
    
    // Verify all messages are unique
    const messageContents = messages.map(m => m.content);
    const uniqueContents = new Set(messageContents);
    expect(uniqueContents.size).toBe(10);
  });

  test('should handle broker connection lifecycle correctly', async () => {
    // Track broker events
    const brokerEvents: any[] = [];
    eventBus.on('connection:established', (data) => brokerEvents.push({ type: 'established', data }));
    eventBus.on('connection:closed', (data) => brokerEvents.push({ type: 'closed', data }));
    eventBus.on('broker:heartbeat', (data) => brokerEvents.push({ type: 'heartbeat', data }));

    // Connect a user
    const connectionId = 'test-conn-' + Date.now();
    await broker.connect(connectionId, 'test-user');
    
    // Verify connection established
    expect(brokerEvents.some(e => e.type === 'established')).toBe(true);
    
    // Check connection is active
    expect(broker.isConnectionActive(connectionId)).toBe(true);
    
    // Wait for heartbeat
    await new Promise(resolve => setTimeout(resolve, 6000));
    expect(brokerEvents.some(e => e.type === 'heartbeat')).toBe(true);
    
    // Check broker stats
    const stats = broker.getBroadcastStats();
    expect(stats.activeConnections).toBe(1);
    
    // Disconnect
    await broker.disconnect(connectionId);
    expect(brokerEvents.some(e => e.type === 'closed')).toBe(true);
    expect(broker.isConnectionActive(connectionId)).toBe(false);
  });

  test('should persist and retrieve data correctly across sessions', async () => {
    // Session 1: Create data
    await cli.processCommand('/register alice');
    await new Promise(resolve => setTimeout(resolve, 50));
    await cli.processCommand('/login alice');
    await cli.processCommand('/create persistent-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    await cli.processCommand('/join persistent-room');
    await new Promise(resolve => setTimeout(resolve, 100));
    cli.processTextMessage('This message should persist');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get room ID for verification
    const rooms = await storage.getAllRooms();
    const room = rooms.find(r => r.name === 'persistent-room');
    expect(room).toBeDefined();
    const roomId = room!.id;
    
    // Simulate session end by creating new instances
    const newStorage = new FileStorage(TEST_DATA_DIR);
    await newStorage.initialize();
    
    // Session 2: Verify data persisted
    const persistedRooms = await newStorage.getAllRooms();
    expect(persistedRooms.length).toBe(1);
    expect(persistedRooms[0].name).toBe('persistent-room');
    
    const persistedMessages = await newStorage.loadMessages(roomId);
    expect(persistedMessages.length).toBe(1);
    expect(persistedMessages[0].content).toBe('This message should persist');
    
    // Verify user data persisted
    const users = await newStorage.loadUser('alice');
    expect(users).toBeDefined();
    expect(users!.username).toBe('alice');
  });
});