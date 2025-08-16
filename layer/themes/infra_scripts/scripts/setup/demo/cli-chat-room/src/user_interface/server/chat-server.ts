import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Message,
  Room,
  MessageType,
  WSEventType,
  WSMessage,
  ChatCommand
  // AgentAction
} from '../types/chat';

interface ClientConnection {
  ws: WebSocket;
  user: User;
  roomId?: string;
}

export class ChatServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private rooms: Map<string, Room> = new Map();
  private clients: Map<string, ClientConnection> = new Map();
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.setupWebSocketServer();
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

  private handleMessage(clientId: string, ws: WebSocket, message: WSMessage) {
    switch (message.type) {
      case WSEventType.JOIN_ROOM:
        this.handleJoinRoom(clientId, ws, message.payload);
        break;
      
      case WSEventType.SEND_MESSAGE:
        this.handleSendMessage(clientId, message.payload);
        break;
      
      case WSEventType.SEND_COMMAND:
        this.handleCommand(clientId, message.payload);
        break;
      
      case WSEventType.LEAVE_ROOM:
        this.handleLeaveRoom(clientId);
        break;
      
      case WSEventType.AGENT_REQUEST:
        // Claude handles its own responses
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private handleJoinRoom(clientId: string, ws: WebSocket, payload: {
    roomId: string;
    username: string;
    isAgent?: boolean;
  }) {
    const { roomId, username, isAgent } = payload;

    // Create or get room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        users: [],
        messages: [],
        createdAt: new Date()
      };
      this.rooms.set(roomId, room);
      console.log(`[Server] Created new room: ${roomId}`);
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

    // Set coordinator if agent
    if (isAgent && !room.coordinator) {
      room.coordinator = user;
      console.log(`[Server] ${username} is now room coordinator`);
    }

    // Send room state to joining user
    this.sendToClient(ws, {
      type: WSEventType.ROOM_STATE,
      payload: room,
      timestamp: new Date()
    });

    // Notify other users
    const joinMessage: Message = {
      id: uuidv4(),
      userId: 'system',
      username: 'System',
      content: `${username} joined the room${isAgent ? ' as coordinator agent' : ''}`,
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

    const room = this.rooms.get(client.roomId);
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

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    // Process commands
    switch (payload.command) {
      case '/users':
        this.sendToClient(client.ws, {
          type: WSEventType.NEW_MESSAGE,
          payload: {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            content: `Users in room: ${room.users.map(u => u.username).join(', ')}`,
            timestamp: new Date(),
            type: MessageType.SYSTEM_MESSAGE
          },
          timestamp: new Date()
        });
        break;

      case '/stats':
        this.sendToClient(client.ws, {
          type: WSEventType.NEW_MESSAGE,
          payload: {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            content: `Room stats: ${room.users.length} users, ${room.messages.length} messages`,
            timestamp: new Date(),
            type: MessageType.SYSTEM_MESSAGE
          },
          timestamp: new Date()
        });
        break;

      case '/help':
        this.sendToClient(client.ws, {
          type: WSEventType.NEW_MESSAGE,
          payload: {
            id: uuidv4(),
            userId: 'system',
            username: 'System',
            content: 'Commands: /users, /stats, /help, /clear',
            timestamp: new Date(),
            type: MessageType.SYSTEM_MESSAGE
          },
          timestamp: new Date()
        });
        break;

      case '/clear':
        if (client.user.isAgent || room.users.length === 1) {
          room.messages = [];
          this.broadcastToRoom(client.roomId, {
            type: WSEventType.ROOM_STATE,
            payload: room,
            timestamp: new Date()
          });
        }
        break;
    }
  }

  /*
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _handleAgentRequest(_clientId: string, _action: AgentAction) {
    const client = this.clients.get(_clientId);
    if (!client || !client.user.isAgent || !client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    // Process agent actions
    let responseMessage: Message;

    switch (_action.type) {
      case 'summarize':
        const summary = this.summarizeMessages(room.messages.slice(-20));
        responseMessage = {
          id: uuidv4(),
          userId: client.user.id,
          username: client.user.username,
          content: `📊 Summary of last 20 messages:\n${summary}`,
          timestamp: new Date(),
          type: MessageType.AGENT_ACTION,
          metadata: { action: 'summarize' }
        };
        break;

      case 'moderate':
        responseMessage = {
          id: uuidv4(),
          userId: client.user.id,
          username: client.user.username,
          content: '🛡️ Moderation: All messages are appropriate',
          timestamp: new Date(),
          type: MessageType.AGENT_ACTION,
          metadata: { action: 'moderate' }
        };
        break;

      case 'analyze':
        const analysis = this.analyzeConversation(room.messages);
        responseMessage = {
          id: uuidv4(),
          userId: client.user.id,
          username: client.user.username,
          content: `📈 Conversation Analysis:\n${analysis}`,
          timestamp: new Date(),
          type: MessageType.AGENT_ACTION,
          metadata: { action: 'analyze' }
        };
        break;

      default:
        responseMessage = {
          id: uuidv4(),
          userId: client.user.id,
          username: client.user.username,
          content: `Agent action: ${_action.type}`,
          timestamp: new Date(),
          type: MessageType.AGENT_ACTION,
          metadata: { action: _action.type }
        };
    }

    room.messages.push(responseMessage);
    this.broadcastToRoom(client.roomId, {
      type: WSEventType.NEW_MESSAGE,
      payload: responseMessage,
      timestamp: new Date()
    });
  }
  */

  private handleLeaveRoom(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client || !client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    // Remove user from room
    room.users = room.users.filter(u => u.id !== clientId);

    // Remove coordinator if leaving
    if (room.coordinator?.id === clientId) {
      room.coordinator = undefined;
      // Assign new coordinator if there's another agent
      const newCoordinator = room.users.find(u => u.isAgent);
      if (newCoordinator) {
        room.coordinator = newCoordinator;
      }
    }

    // Notify others
    const leaveMessage: Message = {
      id: uuidv4(),
      userId: 'system',
      username: 'System',
      content: `${client.user.username} left the room`,
      timestamp: new Date(),
      type: MessageType.USER_LEFT
    };
    room.messages.push(leaveMessage);

    this.broadcastToRoom(client.roomId, {
      type: WSEventType.USER_LEFT,
      payload: { userId: clientId, message: leaveMessage },
      timestamp: new Date()
    });

    // Clean up
    this.clients.delete(clientId);

    // Remove empty rooms
    if (room.users.length === 0) {
      this.rooms.delete(client.roomId);
      console.log(`[Server] Removed empty room: ${client.roomId}`);
    }
  }

  private handleDisconnect(clientId: string) {
    console.log(`[Server] Client disconnected: ${clientId}`);
    this.handleLeaveRoom(clientId);
  }

  private sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
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

  /*
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _forwardToAgent(_agentId: string, _action: AgentAction) {
    const agent = this.clients.get(_agentId);
    if (agent && agent.user.isAgent) {
      this.sendToClient(agent.ws, {
        type: WSEventType.AGENT_REQUEST,
        payload: _action,
        timestamp: new Date()
      });
    }
  }
  */

  private sendError(ws: WebSocket, error: string) {
    this.sendToClient(ws, {
      type: WSEventType.ERROR,
      payload: { error },
      timestamp: new Date()
    });
  }

  /*
  private summarizeMessages(messages: Message[]): string {
    const userMessages = messages.filter(m => 
      m.type === MessageType.USER_MESSAGE || 
      m.type === MessageType.AGENT_MESSAGE
    );

    if (userMessages.length === 0) return 'No messages to summarize';

    const topics = new Set<string>();
    const users = new Set<string>();

    userMessages.forEach(msg => {
      users.add(msg.username);
      // Simple topic extraction
      if (msg.content.toLowerCase().includes('help')) topics.add('help requests');
      if (msg.content.toLowerCase().includes('test')) topics.add('testing');
      if (msg.content.toLowerCase().includes('demo')) topics.add('demonstrations');
    });

    return `- ${userMessages.length} messages from ${users.size} users
- Topics discussed: ${topics.size > 0 ? Array.from(topics).join(', ') : 'general chat'}
- Most active user: ${this.getMostActiveUser(userMessages)}`;
  }

  private analyzeConversation(messages: Message[]): string {
    const userMessages = messages.filter(m => 
      m.type === MessageType.USER_MESSAGE || 
      m.type === MessageType.AGENT_MESSAGE
    );

    const avgMessageLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    const messageFrequency = this.calculateMessageFrequency(userMessages);

    return `- Total messages: ${messages.length}
- User messages: ${userMessages.length}
- Average message length: ${Math.round(avgMessageLength)} characters
- Message frequency: ${messageFrequency}
- System events: ${messages.length - userMessages.length}`;
  }

  private getMostActiveUser(messages: Message[]): string {
    const userCounts = new Map<string, number>();
    messages.forEach(msg => {
      userCounts.set(msg.username, (userCounts.get(msg.username) || 0) + 1);
    });

    let maxCount = 0;
    let mostActive = 'N/A';
    userCounts.forEach((count, username) => {
      if (count > maxCount) {
        maxCount = count;
        mostActive = username;
      }
    });

    return `${mostActive} (${maxCount} messages)`;
  }

  private calculateMessageFrequency(messages: Message[]): string {
    if (messages.length < 2) return 'N/A';

    const firstTime = new Date(messages[0].timestamp).getTime();
    const lastTime = new Date(messages[messages.length - 1].timestamp).getTime();
    const durationMinutes = (lastTime - firstTime) / (1000 * 60);

    if (durationMinutes === 0) return 'Instant';

    const messagesPerMinute = messages.length / durationMinutes;
    return `${messagesPerMinute.toFixed(1)} messages/minute`;
  }
  */

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`[Server] Chat server running on ws://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.httpServer.close(() => {
          console.log('[Server] Chat server stopped');
          resolve();
        });
      });
    });
  }
}