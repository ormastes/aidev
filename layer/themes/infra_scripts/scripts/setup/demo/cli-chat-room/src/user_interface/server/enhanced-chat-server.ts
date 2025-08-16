import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import {
  User,
  Message,
  Room,
  MessageType,
  WSEventType,
  WSMessage,
  ChatCommand
} from '../types/chat';
import { RoomConfig, CoordinatorType } from '../config/room-config.schema';
import { createCoordinatorAgent } from '../agents/coordinator-factory';
import { BaseCoordinatorAgent } from '../agents/coordinator-interface';

interface ClientConnection {
  ws: WebSocket;
  user: User;
  roomId?: string;
}

interface EnhancedRoom extends Room {
  config?: RoomConfig;
  coordinatorAgent?: BaseCoordinatorAgent;
}

export class EnhancedChatServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private rooms: Map<string, EnhancedRoom> = new Map();
  private clients: Map<string, ClientConnection> = new Map();
  private port: number;
  private configDir: string;

  constructor(port: number = 3000, configDir: string = './config/rooms') {
    this.port = port;
    this.configDir = configDir;
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocketServer();
    this.ensureConfigDir();
  }

  private ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  private loadRoomConfig(roomId: string): RoomConfig | null {
    const configPath = path.join(this.configDir, `${roomId}.json`);
    
    if (fs.existsSync(configPath)) {
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData) as RoomConfig;
      } catch (error) {
        console.error(`[Server] Error loading room config for ${roomId}:`, error);
      }
    }
    
    // Check for default config
    const defaultConfigPath = path.join(this.configDir, 'default.json');
    if (fs.existsSync(defaultConfigPath)) {
      try {
        const configData = fs.readFileSync(defaultConfigPath, 'utf8');
        return JSON.parse(configData) as RoomConfig;
      } catch (error) {
        console.error('[Server] Error loading default room config:', error);
      }
    }
    
    return null;
  }

  private async initializeCoordinator(room: EnhancedRoom): Promise<void> {
    if (!room.config || room.config.coordinator.type === CoordinatorType.NONE) {
      return;
    }

    try {
      const serverUrl = `ws://localhost:${this.port}`;
      room.coordinatorAgent = await createCoordinatorAgent(
        room.config.coordinator,
        serverUrl,
        room.id
      );
      
      console.log(`[Server] Initialized ${room.config.coordinator.type} coordinator for room ${room.id}`);
    } catch (error) {
      console.error(`[Server] Failed to initialize coordinator for room ${room.id}:`, error);
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      console.log(`[Server] New connection: ${clientId}`);

      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, ws, message);
        } catch (error) {
          console.error('[Server] Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`[Server] WebSocket error for ${clientId}:`, error);
      });
    });
  }

  private async handleMessage(clientId: string, ws: WebSocket, message: WSMessage) {
    switch (message.type) {
      case WSEventType.JOIN_ROOM:
        await this.handleJoinRoom(clientId, ws, message.payload);
        break;
      case WSEventType.SEND_MESSAGE:
        this.handleSendMessage(clientId, message.payload);
        break;
      case WSEventType.COMMAND:
        this.handleCommand(clientId, message.payload);
        break;
      default:
        console.warn(`[Server] Unknown message type: ${message.type}`);
    }
  }

  private async handleJoinRoom(clientId: string, ws: WebSocket, payload: {
    roomId: string;
    username: string;
    isAgent?: boolean;
  }) {
    const { roomId, username, isAgent } = payload;

    // Create or get room
    let room = this.rooms.get(roomId) as EnhancedRoom;
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        users: [],
        messages: [],
        createdAt: new Date()
      };
      
      // Load room configuration
      const config = this.loadRoomConfig(roomId);
      if (config) {
        room.config = config;
        room.name = config.name || room.name;
        
        // Initialize coordinator if configured
        await this.initializeCoordinator(room);
      }
      
      this.rooms.set(roomId, room);
      console.log(`[Server] Created new room: ${roomId} with config: ${config ? 'yes' : 'no'}`);
    }

    // Create user
    const user: User = {
      id: clientId,
      username,
      isAgent,
      joinedAt: new Date()
    };

    // Store client connection
    this.clients.set(clientId, { ws, user, roomId });

    // Add user to room
    room.users.push(user);

    // Set coordinator if agent and no coordinator yet
    if (isAgent && !room.coordinator && !room.coordinatorAgent) {
      room.coordinator = user;
      console.log(`[Server] ${username} is now room coordinator`);
    }

    // Send room state to joining user
    this.sendToClient(ws, {
      type: WSEventType.ROOM_STATE,
      payload: {
        ...room,
        hasCoordinator: !!room.coordinatorAgent || !!room.coordinator,
        coordinatorType: room.config?.coordinator.type
      },
      timestamp: new Date()
    });

    // Notify other users
    const joinMessage: Message = {
      id: uuidv4(),
      userId: 'system',
      username: 'System',
      content: `${username} joined the room${isAgent ? ' as agent' : ''}`,
      timestamp: new Date(),
      type: MessageType.USER_JOINED
    };
    room.messages.push(joinMessage);

    this.broadcastToRoom(roomId, {
      type: WSEventType.USER_JOINED,
      payload: { user, message: joinMessage },
      timestamp: new Date()
    }, clientId);

    console.log(`[Server] ${username} joined room ${roomId}`);
  }

  private handleSendMessage(clientId: string, payload: {
    content: string;
  }) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) {
      console.error(`[Server] Client ${clientId} not in a room`);
      return;
    }

    const room = this.rooms.get(client.roomId) as EnhancedRoom;
    if (!room) return;

    const message: Message = {
      id: uuidv4(),
      userId: client.user.id,
      username: client.user.username,
      content: payload.content,
      timestamp: new Date(),
      type: client.user.isAgent ? MessageType.AGENT_MESSAGE : MessageType.USER_MESSAGE
    };

    room.messages.push(message);

    // Broadcast to all users in room
    this.broadcastToRoom(client.roomId, {
      type: WSEventType.NEW_MESSAGE,
      payload: message,
      timestamp: new Date()
    });

    console.log(`[Server] ${client.user.username}: ${payload.content}`);
  }

  private handleCommand(clientId: string, payload: ChatCommand) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;

    const room = this.rooms.get(client.roomId) as EnhancedRoom;
    if (!room) return;

    switch (payload.command) {
      case 'help':
        this.sendHelpMessage(client.ws, room);
        break;
      case 'users':
        this.sendUserList(client.ws, room);
        break;
      case 'config':
        this.sendRoomConfig(client.ws, room);
        break;
      case 'coordinator':
        this.sendCoordinatorInfo(client.ws, room);
        break;
      default:
        this.sendError(client.ws, `Unknown command: ${payload.command}`);
    }
  }

  private sendHelpMessage(ws: WebSocket, room: EnhancedRoom) {
    const helpText = `Available commands:
/help - Show this help message
/users - List users in room
/config - Show room configuration
/coordinator - Show coordinator information`;

    this.sendToClient(ws, {
      type: WSEventType.SYSTEM_MESSAGE,
      payload: {
        content: helpText,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  private sendUserList(ws: WebSocket, room: EnhancedRoom) {
    const userList = room.users.map(u => 
      `${u.username}${u.isAgent ? ' (agent)' : ''}${u.id === room.coordinator?.id ? ' (coordinator)' : ''}`
    ).join('\n');

    this.sendToClient(ws, {
      type: WSEventType.SYSTEM_MESSAGE,
      payload: {
        content: `Users in room:\n${userList}`,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  private sendRoomConfig(ws: WebSocket, room: EnhancedRoom) {
    if (!room.config) {
      this.sendToClient(ws, {
        type: WSEventType.SYSTEM_MESSAGE,
        payload: {
          content: 'No configuration loaded for this room',
          timestamp: new Date()
        },
        timestamp: new Date()
      });
      return;
    }

    const configInfo = `Room Configuration:
Name: ${room.config.name}
Coordinator: ${room.config.coordinator.type}
${room.config.coordinator.model ? `Model: ${room.config.coordinator.model}` : ''}
Features: ${JSON.stringify(room.config.features)}`;

    this.sendToClient(ws, {
      type: WSEventType.SYSTEM_MESSAGE,
      payload: {
        content: configInfo,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  private sendCoordinatorInfo(ws: WebSocket, room: EnhancedRoom) {
    let info = 'Coordinator Information:\n';
    
    if (room.coordinatorAgent) {
      info += `Type: ${room.config?.coordinator.type || 'configured'}\n`;
      info += `Status: Active\n`;
      if (room.config?.coordinator.model) {
        info += `Model: ${room.config.coordinator.model}\n`;
      }
    } else if (room.coordinator) {
      info += `Type: User Agent\n`;
      info += `Agent: ${room.coordinator.username}\n`;
    } else {
      info += 'No coordinator assigned';
    }

    this.sendToClient(ws, {
      type: WSEventType.SYSTEM_MESSAGE,
      payload: {
        content: info,
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { user, roomId } = client;
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      // Remove user from room
      room.users = room.users.filter(u => u.id !== clientId);

      // Notify others
      const leaveMessage: Message = {
        id: uuidv4(),
        userId: 'system',
        username: 'System',
        content: `${user.username} left the room`,
        timestamp: new Date(),
        type: MessageType.USER_LEFT
      };
      room.messages.push(leaveMessage);

      this.broadcastToRoom(roomId, {
        type: WSEventType.USER_LEFT,
        payload: { userId: clientId, message: leaveMessage },
        timestamp: new Date()
      });

      // Clean up empty rooms
      if (room.users.length === 0) {
        // Shutdown coordinator if present
        const enhancedRoom = room as EnhancedRoom;
        if (enhancedRoom.coordinatorAgent) {
          enhancedRoom.coordinatorAgent.shutdown();
        }
        this.rooms.delete(roomId);
        console.log(`[Server] Removed empty room: ${roomId}`);
      }
    }

    this.clients.delete(clientId);
    console.log(`[Server] Client disconnected: ${clientId}`);
  }

  private sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendToClient(ws, {
      type: WSEventType.ERROR,
      payload: { error },
      timestamp: new Date()
    });
  }

  private broadcastToRoom(roomId: string, message: WSMessage, excludeClientId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.users.forEach(user => {
      if (user.id !== excludeClientId) {
        const client = this.clients.get(user.id);
        if (client) {
          this.sendToClient(client.ws, message);
        }
      }
    });
  }

  public start() {
    this.httpServer.listen(this.port, () => {
      console.log(`[Server] Enhanced chat server running on ws://localhost:${this.port}`);
      console.log(`[Server] Room configs directory: ${this.configDir}`);
    });
  }

  public stop() {
    // Shutdown all coordinator agents
    this.rooms.forEach(room => {
      const enhancedRoom = room as EnhancedRoom;
      if (enhancedRoom.coordinatorAgent) {
        enhancedRoom.coordinatorAgent.shutdown();
      }
    });

    this.wss.close(() => {
      this.httpServer.close(() => {
        console.log('[Server] Enhanced chat server stopped');
      });
    });
  }
}