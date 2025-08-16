import { EventEmitter } from 'node:events';
import { LocalLLMConnector, LLMResponse } from '../external/local-llm-connector';

// Interface definitions based on sequence diagrams
export interface User {
  id: string;
  username: string;
  connectionId?: string;
  registeredAt: Date;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  messageCount: number;
  userCount: number;
  lastActivity: Date;
  aiEnabled?: boolean;  // Flag to enable AI responses in this room
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | "workflow" | 'ai';
  llmResponse?: LLMResponse;  // Optional LLM response metadata
}

export interface WorkflowEvent {
  workflow: string;
  args: Record<string, any>;
  userId: string;
  roomId?: string;
}

export interface StorageInterface {
  saveUser(user: User): Promise<void>;
  saveRoom(room: Room): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  loadUser(userId: string): Promise<User | null>;
  loadRoom(roomId: string): Promise<Room | null>;
  loadMessages(roomId: string, limit?: number): Promise<Message[]>;
  getAllRooms(): Promise<Room[]>;
}

export interface BrokerInterface {
  joinRoom(connectionId: string, roomId: string): Promise<void>;
  leaveRoom(connectionId: string, roomId: string): Promise<void>;
  broadcastMessage(roomId: string, message: Message): Promise<void>;
  getRoomUsers(roomId: string): Promise<string[]>;
}

export interface PocketFlowInterface {
  executeWorkflow(workflow: string, context: any): Promise<any>;
  getFlowStatus(flowId: string): Promise<any>;
}

export interface ContextInterface {
  getCurrentContext(): Promise<any>;
  getFileContent(filePath: string): Promise<string>;
  loadAidevContext(): Promise<any>;
}

export class ChatRoomPlatform {
  private eventBus: EventEmitter;
  private storage: StorageInterface;
  private broker: BrokerInterface;
  private pocketFlow: PocketFlowInterface;
  private context: ContextInterface;
  private initialized: boolean = false;

  constructor(
    eventBus: EventEmitter,
    storage: StorageInterface,
    broker: BrokerInterface,
    pocketFlow: PocketFlowInterface,
    context: ContextInterface
  ) {
    this.eventBus = eventBus;
    this.storage = storage;
    this.broker = broker;
    this.pocketFlow = pocketFlow;
    this.context = context;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('cli:register_user', this.handleRegisterUser.bind(this));
    this.eventBus.on('cli:create_room', this.handleCreateRoom.bind(this));
    this.eventBus.on('cli:join_room', this.handleJoinRoom.bind(this));
    this.eventBus.on('cli:leave_room', this.handleLeaveRoom.bind(this));
    this.eventBus.on('cli:send_message', this.handleSendMessage.bind(this));
    this.eventBus.on('cli:list_rooms', this.handleListRooms.bind(this));
    this.eventBus.on('cli:list_users', this.handleListUsers.bind(this));
    this.eventBus.on('cli:get_history', this.handleGetHistory.bind(this));
    this.eventBus.on('cli:workflow_command', this.handleWorkflowCommand.bind(this));
    this.eventBus.on('cli:flow_command', this.handleFlowCommand.bind(this));
    this.eventBus.on('cli:get_context', this.handleGetContext.bind(this));
    this.eventBus.on('cli:get_workspace_info', this.handleGetWorkspaceInfo.bind(this));
  }

  async initialize(): Promise<void> {
    const workspaceContext = await this.context.loadAidevContext();
    this.initialized = true;
    this.eventBus.emit('platform:initialized', { workspaceContext });
  }

  private async handleRegisterUser(data: { username: string }): Promise<void> {
    const user: User = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      username: data.username,
      registeredAt: new Date()
    };

    await this.storage.saveUser(user);
    this.eventBus.emit('platform:user_registered', { user });
  }

  private async handleCreateRoom(data: { name: string; description?: string; userId: string }): Promise<void> {
    const room: Room = {
      id: 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: data.name,
      description: data.description,
      createdBy: data.userId,
      createdAt: new Date(),
      messageCount: 0,
      userCount: 0,
      lastActivity: new Date()
    };

    await this.storage.saveRoom(room);
    this.eventBus.emit('platform:room_created', { room });
  }

  private async handleJoinRoom(data: { roomId: string; userId: string }): Promise<void> {
    const room = await this.storage.loadRoom(data.roomId);
    if (!room) {
      this.eventBus.emit('platform:error', { 
        error: 'room_not_found', 
        message: `Room ${data.roomId} not found` 
      });
      return;
    }

    const user = await this.storage.loadUser(data.userId);
    if (!user) {
      this.eventBus.emit('platform:error', { 
        error: 'user_not_found', 
        message: `User ${data.userId} not found` 
      });
      return;
    }

    if (user.connectionId) {
      await this.broker.joinRoom(user.connectionId, room.id);
    }

    const history = await this.storage.loadMessages(room.id, 50);
    
    // Update room user count
    room.userCount++;
    room.lastActivity = new Date();
    await this.storage.saveRoom(room);

    this.eventBus.emit('platform:room_joined', { 
      room, 
      user, 
      history 
    });
  }

  private async handleLeaveRoom(data: { roomId: string; userId: string }): Promise<void> {
    const room = await this.storage.loadRoom(data.roomId);
    const user = await this.storage.loadUser(data.userId);

    if (room && user && user.connectionId) {
      await this.broker.leaveRoom(user.connectionId, room.id);
      
      // Update room user count
      room.userCount = Math.max(0, room.userCount - 1);
      room.lastActivity = new Date();
      await this.storage.saveRoom(room);
    }

    this.eventBus.emit('platform:room_left', { roomId: data.roomId, userId: data.userId });
  }

  private async handleSendMessage(data: { roomId: string; content: string; userId: string }): Promise<void> {
    const room = await this.storage.loadRoom(data.roomId);
    const user = await this.storage.loadUser(data.userId);

    if (!room || !user) {
      this.eventBus.emit('platform:error', { 
        error: 'invalid_message', 
        message: 'Room or user not found' 
      });
      return;
    }

    const message: Message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      roomId: data.roomId,
      userId: data.userId,
      username: user.username,
      content: data.content,
      timestamp: new Date(),
      type: 'text'
    };

    await this.storage.saveMessage(message);
    await this.broker.broadcastMessage(data.roomId, message);

    // Update room stats
    room.messageCount++;
    room.lastActivity = new Date();
    await this.storage.saveRoom(room);

    this.eventBus.emit('platform:message_sent', { message });
  }

  private async handleListRooms(data: { userId: string; showAll?: boolean }): Promise<void> {
    const rooms = await this.storage.getAllRooms();
    this.eventBus.emit('platform:rooms_listed', { rooms, userId: data.userId });
  }

  private async handleListUsers(data: { roomId: string }): Promise<void> {
    const users = await this.broker.getRoomUsers(data.roomId);
    this.eventBus.emit('platform:users_listed', { users, roomId: data.roomId });
  }

  private async handleGetHistory(data: { roomId: string; limit?: number }): Promise<void> {
    const messages = await this.storage.loadMessages(data.roomId, data.limit || 50);
    this.eventBus.emit('platform:history_loaded', { messages, roomId: data.roomId });
  }

  private async handleWorkflowCommand(data: WorkflowEvent): Promise<void> {
    try {
      const context = await this.context.getCurrentContext();
      const result = await this.pocketFlow.executeWorkflow(data.workflow, {
        ...data.args,
        context,
        userId: data.userId,
        roomId: data.roomId
      });

      // Create workflow result message
      if (data.roomId) {
        const workflowMessage: Message = {
          id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          roomId: data.roomId,
          userId: "workflow",
          username: "Workflow",
          content: `${data.workflow} completed: ${JSON.stringify(result)}`,
          timestamp: new Date(),
          type: "workflow"
        };

        await this.storage.saveMessage(workflowMessage);
        await this.broker.broadcastMessage(data.roomId, workflowMessage);
      }

      this.eventBus.emit('platform:workflow_completed', { 
        workflow: data.workflow, 
        result 
      });
    } catch (error) {
      this.eventBus.emit('platform:error', { 
        error: 'workflow_failed', 
        message: error instanceof Error ? error.message : 'Unknown workflow error' 
      });
    }
  }

  private async handleFlowCommand(data: { action: string; args: string[]; userId: string }): Promise<void> {
    try {
      const result = await this.pocketFlow.getFlowStatus(data.args[0] || '');
      this.eventBus.emit('platform:flow_status', { 
        action: data.action, 
        result 
      });
    } catch (error) {
      this.eventBus.emit('platform:error', { 
        error: 'flow_command_failed', 
        message: error instanceof Error ? error.message : 'Unknown flow error' 
      });
    }
  }

  private async handleGetContext(data: { userId: string }): Promise<void> {
    try {
      const contextData = await this.context.getCurrentContext();
      this.eventBus.emit('platform:context_loaded', { 
        context: contextData, 
        userId: data.userId 
      });
    } catch (error) {
      this.eventBus.emit('platform:error', { 
        error: 'context_failed', 
        message: error instanceof Error ? error.message : 'Context loading failed' 
      });
    }
  }

  private async handleGetWorkspaceInfo(data: { userId: string }): Promise<void> {
    try {
      const workspaceInfo = await this.context.loadAidevContext();
      this.eventBus.emit('platform:workspace_info_loaded', { 
        workspace: workspaceInfo, 
        userId: data.userId 
      });
    } catch (error) {
      this.eventBus.emit('platform:error', { 
        error: 'workspace_info_failed', 
        message: error instanceof Error ? error.message : 'Workspace info loading failed' 
      });
    }
  }

  async sendSystemMessage(roomId: string, content: string): Promise<void> {
    const systemMessage: Message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      roomId,
      userId: 'system',
      username: 'System',
      content,
      timestamp: new Date(),
      type: 'system'
    };

    await this.storage.saveMessage(systemMessage);
    await this.broker.broadcastMessage(roomId, systemMessage);

    // Update room message count for system messages
    const room = await this.storage.loadRoom(roomId);
    if (room) {
      room.messageCount++;
      room.lastActivity = new Date();
      await this.storage.saveRoom(room);
    }

    this.eventBus.emit('platform:system_message_sent', { message: systemMessage });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return await this.storage.loadRoom(roomId);
  }

  async getUser(userId: string): Promise<User | null> {
    return await this.storage.loadUser(userId);
  }
}