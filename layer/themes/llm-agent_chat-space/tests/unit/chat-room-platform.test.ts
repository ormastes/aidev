import { EventEmitter } from 'node:events';
import { 
  ChatRoomPlatform, 
  User, 
  Room, 
  Message,
  StorageInterface,
  BrokerInterface,
  PocketFlowInterface,
  ContextInterface
} from '../../user-stories/007-chat-room-cli/src/application/chat-room-platform';

describe("ChatRoomPlatform", () => {
  let platform: ChatRoomPlatform;
  let eventBus: EventEmitter;
  let mockStorage: jest.Mocked<StorageInterface>;
  let mockBroker: jest.Mocked<BrokerInterface>;
  let mockPocketFlow: jest.Mocked<PocketFlowInterface>;
  let mockContext: jest.Mocked<ContextInterface>;

  beforeEach(() => {
    eventBus = new EventEmitter();

    mockStorage = {
      saveUser: jest.fn(),
      saveRoom: jest.fn(),
      saveMessage: jest.fn(),
      loadUser: jest.fn(),
      loadRoom: jest.fn(),
      loadMessages: jest.fn(),
      getAllRooms: jest.fn(),
    };

    mockBroker = {
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      broadcastMessage: jest.fn(),
      getRoomUsers: jest.fn(),
    };

    mockPocketFlow = {
      executeWorkflow: jest.fn(),
      getFlowStatus: jest.fn(),
    };

    mockContext = {
      getCurrentContext: jest.fn(),
      getFileContent: jest.fn(),
      loadAidevContext: jest.fn(),
    };

    platform = new ChatRoomPlatform(
      eventBus,
      mockStorage,
      mockBroker,
      mockPocketFlow,
      mockContext
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    eventBus.removeAllListeners();
  });

  describe("initialization", () => {
    it('should initialize platform successfully', async () => {
      const mockWorkspaceContext = { workspace: 'test' };
      mockContext.loadAidevContext.mockResolvedValue(mockWorkspaceContext);

      const initializedPromise = new Promise(resolve => {
        eventBus.once('platform:initialized', resolve);
      });

      await platform.initialize();
      const event = await initializedPromise;

      expect(mockContext.loadAidevContext).toHaveBeenCalled();
      expect(platform.isInitialized()).toBe(true);
      expect(event).toEqual({ workspaceContext: mockWorkspaceContext });
    });
  });

  describe('user registration', () => {
    it('should register user successfully', async () => {
      const registeredPromise = new Promise<any>(resolve => {
        eventBus.once('platform:user_registered', resolve);
      });

      eventBus.emit('cli:register_user', { username: "testuser" });
      const event = await registeredPromise;

      expect(mockStorage.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "testuser",
          id: expect.stringMatching(/^user-\d+-[a-z0-9]{5}$/),
          registeredAt: expect.any(Date),
        })
      );
      expect(event.user.username).toBe("testuser");
    });
  });

  describe('room management', () => {
    it('should create room successfully', async () => {
      const createdPromise = new Promise<any>(resolve => {
        eventBus.once('platform:room_created', resolve);
      });

      eventBus.emit('cli:create_room', {
        name: 'Test Room',
        description: 'A test room',
        userId: 'user-123',
      });
      const event = await createdPromise;

      expect(mockStorage.saveRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Room',
          description: 'A test room',
          createdBy: 'user-123',
          id: expect.stringMatching(/^room-\d+-[a-z0-9]{5}$/),
          messageCount: 0,
          userCount: 0,
        })
      );
      expect(event.room.name).toBe('Test Room');
    });

    it('should handle room join successfully', async () => {
      const mockRoom: Room = {
        id: 'room-123',
        name: 'Test Room',
        createdBy: 'user-456',
        createdAt: new Date(),
        messageCount: 5,
        userCount: 2,
        lastActivity: new Date(),
      };

      const mockUser: User = {
        id: 'user-123',
        username: "testuser",
        connectionId: 'conn-123',
        registeredAt: new Date(),
      };

      const mockHistory: Message[] = [
        {
          id: 'msg-1',
          roomId: 'room-123',
          userId: 'user-456',
          username: "otheruser",
          content: 'Hello!',
          timestamp: new Date(),
          type: 'text',
        },
      ];

      mockStorage.loadRoom.mockResolvedValue(mockRoom);
      mockStorage.loadUser.mockResolvedValue(mockUser);
      mockStorage.loadMessages.mockResolvedValue(mockHistory);

      const joinedPromise = new Promise<any>(resolve => {
        eventBus.once('platform:room_joined', resolve);
      });

      eventBus.emit('cli:join_room', { roomId: 'room-123', userId: 'user-123' });
      const event = await joinedPromise;

      expect(mockBroker.joinRoom).toHaveBeenCalledWith('conn-123', 'room-123');
      expect(mockStorage.loadMessages).toHaveBeenCalledWith('room-123', 50);
      expect(mockStorage.saveRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          userCount: 3,
          lastActivity: expect.any(Date),
        })
      );
      expect(event).toEqual({ room: expect.any(Object), user: mockUser, history: mockHistory });
    });

    it('should handle room not found error', async () => {
      mockStorage.loadRoom.mockResolvedValue(null);

      const errorPromise = new Promise<any>(resolve => {
        eventBus.once('platform:error', resolve);
      });

      eventBus.emit('cli:join_room', { roomId: 'non-existent', userId: 'user-123' });
      const error = await errorPromise;

      expect(error).toEqual({
        error: 'room_not_found',
        message: 'Room non-existent not found',
      });
    });

    it('should handle room leave successfully', async () => {
      const mockRoom: Room = {
        id: 'room-123',
        name: 'Test Room',
        createdBy: 'user-456',
        createdAt: new Date(),
        messageCount: 5,
        userCount: 3,
        lastActivity: new Date(),
      };

      const mockUser: User = {
        id: 'user-123',
        username: "testuser",
        connectionId: 'conn-123',
        registeredAt: new Date(),
      };

      mockStorage.loadRoom.mockResolvedValue(mockRoom);
      mockStorage.loadUser.mockResolvedValue(mockUser);

      const leftPromise = new Promise<any>(resolve => {
        eventBus.once('platform:room_left', resolve);
      });

      eventBus.emit('cli:leave_room', { roomId: 'room-123', userId: 'user-123' });
      const event = await leftPromise;

      expect(mockBroker.leaveRoom).toHaveBeenCalledWith('conn-123', 'room-123');
      expect(mockStorage.saveRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          userCount: 2,
          lastActivity: expect.any(Date),
        })
      );
      expect(event).toEqual({ roomId: 'room-123', userId: 'user-123' });
    });

    it('should list all rooms', async () => {
      const mockRooms: Room[] = [
        {
          id: 'room-1',
          name: 'Room 1',
          createdBy: 'user-1',
          createdAt: new Date(),
          messageCount: 10,
          userCount: 5,
          lastActivity: new Date(),
        },
        {
          id: 'room-2',
          name: 'Room 2',
          createdBy: 'user-2',
          createdAt: new Date(),
          messageCount: 20,
          userCount: 3,
          lastActivity: new Date(),
        },
      ];

      mockStorage.getAllRooms.mockResolvedValue(mockRooms);

      const listedPromise = new Promise<any>(resolve => {
        eventBus.once('platform:rooms_listed', resolve);
      });

      eventBus.emit('cli:list_rooms', { userId: 'user-123' });
      const event = await listedPromise;

      expect(mockStorage.getAllRooms).toHaveBeenCalled();
      expect(event).toEqual({ rooms: mockRooms, userId: 'user-123' });
    });
  });

  describe("messaging", () => {
    it('should send message successfully', async () => {
      const mockRoom: Room = {
        id: 'room-123',
        name: 'Test Room',
        createdBy: 'user-456',
        createdAt: new Date(),
        messageCount: 5,
        userCount: 2,
        lastActivity: new Date(),
      };

      const mockUser: User = {
        id: 'user-123',
        username: "testuser",
        registeredAt: new Date(),
      };

      mockStorage.loadRoom.mockResolvedValue(mockRoom);
      mockStorage.loadUser.mockResolvedValue(mockUser);

      const sentPromise = new Promise<any>(resolve => {
        eventBus.once('platform:message_sent', resolve);
      });

      eventBus.emit('cli:send_message', {
        roomId: 'room-123',
        content: 'Hello world!',
        userId: 'user-123',
      });
      const event = await sentPromise;

      expect(mockStorage.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'room-123',
          userId: 'user-123',
          username: "testuser",
          content: 'Hello world!',
          type: 'text',
        })
      );
      expect(mockBroker.broadcastMessage).toHaveBeenCalled();
      expect(mockStorage.saveRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          messageCount: 6,
          lastActivity: expect.any(Date),
        })
      );
      expect(event.message.content).toBe('Hello world!');
    });

    it('should handle invalid message error', async () => {
      mockStorage.loadRoom.mockResolvedValue(null);

      const errorPromise = new Promise<any>(resolve => {
        eventBus.once('platform:error', resolve);
      });

      eventBus.emit('cli:send_message', {
        roomId: 'room-123',
        content: 'Hello',
        userId: 'user-123',
      });
      const error = await errorPromise;

      expect(error).toEqual({
        error: 'invalid_message',
        message: 'Room or user not found',
      });
    });

    it('should send system message', async () => {
      const mockRoom: Room = {
        id: 'room-123',
        name: 'Test Room',
        createdBy: 'user-456',
        createdAt: new Date(),
        messageCount: 5,
        userCount: 2,
        lastActivity: new Date(),
      };

      mockStorage.loadRoom.mockResolvedValue(mockRoom);

      const sentPromise = new Promise<any>(resolve => {
        eventBus.once('platform:system_message_sent', resolve);
      });

      await platform.sendSystemMessage('room-123', 'User joined the room');
      const event = await sentPromise;

      expect(mockStorage.saveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'room-123',
          userId: 'system',
          username: 'System',
          content: 'User joined the room',
          type: 'system',
        })
      );
      expect(mockBroker.broadcastMessage).toHaveBeenCalled();
      expect(event.message.type).toBe('system');
    });

    it('should get message history', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg-1',
          roomId: 'room-123',
          userId: 'user-1',
          username: 'user1',
          content: 'Message 1',
          timestamp: new Date(),
          type: 'text',
        },
        {
          id: 'msg-2',
          roomId: 'room-123',
          userId: 'user-2',
          username: 'user2',
          content: 'Message 2',
          timestamp: new Date(),
          type: 'text',
        },
      ];

      mockStorage.loadMessages.mockResolvedValue(mockMessages);

      const historyPromise = new Promise<any>(resolve => {
        eventBus.once('platform:history_loaded', resolve);
      });

      eventBus.emit('cli:get_history', { roomId: 'room-123', limit: 10 });
      const event = await historyPromise;

      expect(mockStorage.loadMessages).toHaveBeenCalledWith('room-123', 10);
      expect(event).toEqual({ messages: mockMessages, roomId: 'room-123' });
    });
  });

  describe('workflow integration', () => {
    it('should execute workflow command', async () => {
      const mockContextData = { workspace: 'test' };
      const mockResult = { status: 'success', data: {} };

      mockContext.getCurrentContext.mockResolvedValue(mockContextData);
      mockPocketFlow.executeWorkflow.mockResolvedValue(mockResult);

      const completedPromise = new Promise<any>(resolve => {
        eventBus.once('platform:workflow_completed', resolve);
      });

      eventBus.emit('cli:workflow_command', {
        workflow: 'test-workflow',
        args: { param: 'value' },
        userId: 'user-123',
        roomId: 'room-123',
      });
      const event = await completedPromise;

      expect(mockPocketFlow.executeWorkflow).toHaveBeenCalledWith('test-workflow', {
        param: 'value',
        context: mockContextData,
        userId: 'user-123',
        roomId: 'room-123',
      });
      expect(event).toEqual({ workflow: 'test-workflow', result: mockResult });
    });

    it('should handle workflow error', async () => {
      mockContext.getCurrentContext.mockResolvedValue({});
      mockPocketFlow.executeWorkflow.mockRejectedValue(new Error('Workflow failed'));

      const errorPromise = new Promise<any>(resolve => {
        eventBus.once('platform:error', resolve);
      });

      eventBus.emit('cli:workflow_command', {
        workflow: 'failing-workflow',
        args: {},
        userId: 'user-123',
      });
      const error = await errorPromise;

      expect(error).toEqual({
        error: 'workflow_failed',
        message: 'Workflow failed',
      });
    });

    it('should get flow status', async () => {
      const mockStatus = { flowId: 'flow-123', status: 'running' };
      mockPocketFlow.getFlowStatus.mockResolvedValue(mockStatus);

      const statusPromise = new Promise<any>(resolve => {
        eventBus.once('platform:flow_status', resolve);
      });

      eventBus.emit('cli:flow_command', {
        action: 'status',
        args: ['flow-123'],
        userId: 'user-123',
      });
      const event = await statusPromise;

      expect(mockPocketFlow.getFlowStatus).toHaveBeenCalledWith('flow-123');
      expect(event).toEqual({ action: 'status', result: mockStatus });
    });
  });

  describe('context operations', () => {
    it('should get current context', async () => {
      const mockContextData = { files: [], workspace: 'test' };
      mockContext.getCurrentContext.mockResolvedValue(mockContextData);

      const contextPromise = new Promise<any>(resolve => {
        eventBus.once('platform:context_loaded', resolve);
      });

      eventBus.emit('cli:get_context', { userId: 'user-123' });
      const event = await contextPromise;

      expect(mockContext.getCurrentContext).toHaveBeenCalled();
      expect(event).toEqual({ context: mockContextData, userId: 'user-123' });
    });

    it('should get workspace info', async () => {
      const mockWorkspaceInfo = { name: 'aidev', version: '1.0.0' };
      mockContext.loadAidevContext.mockResolvedValue(mockWorkspaceInfo);

      const workspacePromise = new Promise<any>(resolve => {
        eventBus.once('platform:workspace_info_loaded', resolve);
      });

      eventBus.emit('cli:get_workspace_info', { userId: 'user-123' });
      const event = await workspacePromise;

      expect(mockContext.loadAidevContext).toHaveBeenCalled();
      expect(event).toEqual({ workspace: mockWorkspaceInfo, userId: 'user-123' });
    });
  });

  describe('utility methods', () => {
    it('should get room by id', async () => {
      const mockRoom: Room = {
        id: 'room-123',
        name: 'Test Room',
        createdBy: 'user-456',
        createdAt: new Date(),
        messageCount: 5,
        userCount: 2,
        lastActivity: new Date(),
      };

      mockStorage.loadRoom.mockResolvedValue(mockRoom);

      const room = await platform.getRoom('room-123');
      expect(room).toEqual(mockRoom);
    });

    it('should get user by id', async () => {
      const mockUser: User = {
        id: 'user-123',
        username: "testuser",
        registeredAt: new Date(),
      };

      mockStorage.loadUser.mockResolvedValue(mockUser);

      const user = await platform.getUser('user-123');
      expect(user).toEqual(mockUser);
    });

    it('should list room users', async () => {
      const mockUsers = ['user-1', 'user-2', 'user-3'];
      mockBroker.getRoomUsers.mockResolvedValue(mockUsers);

      const usersPromise = new Promise<any>(resolve => {
        eventBus.once('platform:users_listed', resolve);
      });

      eventBus.emit('cli:list_users', { roomId: 'room-123' });
      const event = await usersPromise;

      expect(mockBroker.getRoomUsers).toHaveBeenCalledWith('room-123');
      expect(event).toEqual({ users: mockUsers, roomId: 'room-123' });
    });
  });
});