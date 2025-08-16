import { EventEmitter } from 'node:events';

// Interface definitions
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | "workflow";
}

export interface Connection {
  id: string;
  userId: string;
  rooms: Set<string>;
  lastActivity: Date;
  isActive: boolean;
}

export interface BroadcastStats {
  totalMessages: number;
  activeConnections: number;
  roomActivity: Map<string, number>;
}

export class MessageBroker {
  private connections: Map<string, Connection>;
  private roomConnections: Map<string, Set<string>>;
  private eventBus: EventEmitter;
  private messageHistory: Map<string, Message[]>;
  private broadcastStats: BroadcastStats;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.connections = new Map();
    this.roomConnections = new Map();
    this.messageHistory = new Map();
    this.broadcastStats = {
      totalMessages: 0,
      activeConnections: 0,
      roomActivity: new Map()
    };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('broker:connect', this.handleConnect.bind(this));
    this.eventBus.on('broker:disconnect', this.handleDisconnect.bind(this));
    this.eventBus.on('broker:join_room', this.handleJoinRoom.bind(this));
    this.eventBus.on('broker:leave_room', this.handleLeaveRoom.bind(this));
    this.eventBus.on('broker:broadcast', this.handleBroadcast.bind(this));
  }

  // Connection management
  async connect(connectionId: string, userId: string): Promise<void> {
    const connection: Connection = {
      id: connectionId,
      userId,
      rooms: new Set(),
      lastActivity: new Date(),
      isActive: true
    };

    this.connections.set(connectionId, connection);
    this.updateStats();
    
    this.eventBus.emit('connection:established', {
      connectionId,
      userId,
      timestamp: new Date()
    });
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Remove from all rooms
    for (const roomId of connection.rooms) {
      await this.leaveRoom(connectionId, roomId);
    }

    this.connections.delete(connectionId);
    this.updateStats();

    this.eventBus.emit('connection:closed', {
      connectionId,
      userId: connection.userId,
      timestamp: new Date()
    });
  }

  // Room management
  async joinRoom(connectionId: string, roomId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // Add connection to room
    connection.rooms.add(roomId);
    connection.lastActivity = new Date();

    if (!this.roomConnections.has(roomId)) {
      this.roomConnections.set(roomId, new Set());
    }
    this.roomConnections.get(roomId)!.add(connectionId);

    this.eventBus.emit('room:user_joined', {
      roomId,
      userId: connection.userId,
      connectionId,
      timestamp: new Date()
    });
  }

  async leaveRoom(connectionId: string, roomId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return; // Silent fail for non-existent connections
    }

    connection.rooms.delete(roomId);
    connection.lastActivity = new Date();

    const roomConnections = this.roomConnections.get(roomId);
    if (roomConnections) {
      roomConnections.delete(connectionId);
      
      // Clean up empty rooms
      if (roomConnections.size === 0) {
        this.roomConnections.delete(roomId);
      }
    }

    this.eventBus.emit('room:user_left', {
      roomId,
      userId: connection.userId,
      connectionId,
      timestamp: new Date()
    });
  }

  // Message broadcasting
  async broadcastMessage(roomId: string, message: Message): Promise<void> {
    const roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections || roomConnections.size === 0) {
      // Store message even if no active connections
      this.storeMessage(roomId, message);
      return;
    }

    const deliveredTo: string[] = [];
    const failedDeliveries: string[] = [];

    for (const connectionId of roomConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isActive) {
        try {
          // Deliver message via event system
          this.deliverMessage(connectionId, message);
          deliveredTo.push(connectionId);
          connection.lastActivity = new Date();
        } catch (error) {
          failedDeliveries.push(connectionId);
        }
      }
    }

    // Store message in history
    this.storeMessage(roomId, message);

    // Update statistics
    this.broadcastStats.totalMessages++;
    const roomActivity = this.broadcastStats.roomActivity.get(roomId) || 0;
    this.broadcastStats.roomActivity.set(roomId, roomActivity + 1);

    this.eventBus.emit('message:broadcasted', {
      message,
      deliveredTo,
      failedDeliveries,
      timestamp: new Date()
    });
  }

  private deliverMessage(connectionId: string, message: Message): void {
    // Deliver message through event bus for real-time communication
    // The actual WebSocket/transport layer subscribes to these events
    this.eventBus.emit('message:delivered', {
      connectionId,
      message,
      timestamp: new Date()
    });
  }

  private storeMessage(roomId: string, message: Message): void {
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }
    
    const history = this.messageHistory.get(roomId)!;
    history.push(message);
    
    // Keep only last 100 messages per room
    if (history.length > 100) {
      history.shift();
    }
  }

  // Query methods
  async getRoomUsers(roomId: string): Promise<string[]> {
    const roomConnections = this.roomConnections.get(roomId);
    if (!roomConnections) {
      return [];
    }

    const users: string[] = [];
    for (const connectionId of roomConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isActive) {
        users.push(connection.userId);
      }
    }

    return Array.from(new Set(users)); // Remove duplicates
  }

  async getActiveConnections(): Promise<Connection[]> {
    const activeConnections: Connection[] = [];
    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        activeConnections.push({ ...connection });
      }
    }
    return activeConnections;
  }

  async getRoomStats(roomId: string): Promise<{
    connectionCount: number;
    messageCount: number;
    lastActivity?: Date;
  }> {
    const roomConnections = this.roomConnections.get(roomId);
    const connectionCount = roomConnections ? roomConnections.size : 0;
    const messageCount = this.broadcastStats.roomActivity.get(roomId) || 0;

    let lastActivity: Date | undefined;
    if (roomConnections) {
      for (const connectionId of roomConnections) {
        const connection = this.connections.get(connectionId);
        if (connection && (!lastActivity || connection.lastActivity > lastActivity)) {
          lastActivity = connection.lastActivity;
        }
      }
    }

    return {
      connectionCount,
      messageCount,
      lastActivity
    };
  }

  // Health and maintenance
  async performHealthCheck(): Promise<{
    totalConnections: number;
    activeConnections: number;
    totalRooms: number;
    averageRoomSize: number;
    systemHealth: 'healthy' | "degraded" | "critical";
  }> {
    const totalConnections = this.connections.size;
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;
    const totalRooms = this.roomConnections.size;
    
    let totalRoomConnections = 0;
    for (const roomConns of this.roomConnections.values()) {
      totalRoomConnections += roomConns.size;
    }
    const averageRoomSize = totalRooms > 0 ? totalRoomConnections / totalRooms : 0;

    let systemHealth: 'healthy' | "degraded" | "critical" = 'healthy';
    if (activeConnections < totalConnections * 0.8) {
      systemHealth = "degraded";
    }
    if (activeConnections < totalConnections * 0.5) {
      systemHealth = "critical";
    }

    return {
      totalConnections,
      activeConnections,
      totalRooms,
      averageRoomSize,
      systemHealth
    };
  }

  async cleanupInactiveConnections(maxIdleTime: number = 300000): Promise<number> {
    const now = new Date();
    const disconnectedConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const idleTime = now.getTime() - connection.lastActivity.getTime();
      if (idleTime > maxIdleTime) {
        disconnectedConnections.push(connectionId);
      }
    }

    for (const connectionId of disconnectedConnections) {
      await this.disconnect(connectionId);
    }

    return disconnectedConnections.length;
  }

  // Statistics and monitoring
  getBroadcastStats(): BroadcastStats {
    return {
      totalMessages: this.broadcastStats.totalMessages,
      activeConnections: Array.from(this.connections.values())
        .filter(conn => conn.isActive).length,
      roomActivity: new Map(this.broadcastStats.roomActivity)
    };
  }

  private updateStats(): void {
    this.broadcastStats.activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;
  }

  // Event handlers
  private async handleConnect(data: { connectionId: string; userId: string }): Promise<void> {
    await this.connect(data.connectionId, data.userId);
  }

  private async handleDisconnect(data: { connectionId: string }): Promise<void> {
    try {
      await this.disconnect(data.connectionId);
    } catch (error) {
      // Log error but don't throw
      this.eventBus.emit('broker:error', { 
        error: 'disconnect_failed', 
        message: error instanceof Error ? error.message : 'Unknown disconnect error' 
      });
    }
  }

  private async handleJoinRoom(data: { connectionId: string; roomId: string }): Promise<void> {
    try {
      await this.joinRoom(data.connectionId, data.roomId);
    } catch (error) {
      this.eventBus.emit('broker:error', { 
        error: 'join_room_failed', 
        message: error instanceof Error ? error.message : 'Unknown join room error' 
      });
    }
  }

  private async handleLeaveRoom(data: { connectionId: string; roomId: string }): Promise<void> {
    await this.leaveRoom(data.connectionId, data.roomId);
  }

  private async handleBroadcast(data: { roomId: string; message: Message }): Promise<void> {
    await this.broadcastMessage(data.roomId, data.message);
  }

  // Utility methods
  isConnectionActive(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    return connection ? connection.isActive : false;
  }

  getConnectionRooms(connectionId: string): string[] {
    const connection = this.connections.get(connectionId);
    return connection ? Array.from(connection.rooms) : [];
  }

  async getMessageHistory(roomId: string, limit?: number): Promise<Message[]> {
    const history = this.messageHistory.get(roomId) || [];
    if (limit === undefined) {
      return [...history]; // Return all messages if no limit specified
    }
    return history.slice(-limit);
  }

  // Lifecycle management
  startHeartbeat(interval: number = 30000): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, interval);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private performHeartbeat(): void {
    this.eventBus.emit('broker:heartbeat', {
      timestamp: new Date(),
      stats: this.getBroadcastStats()
    });
  }

  async shutdown(): Promise<void> {
    this.stopHeartbeat();
    
    // Disconnect all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      await this.disconnect(connectionId);
    }

    this.eventBus.emit('broker:shutdown', {
      timestamp: new Date()
    });
  }
}