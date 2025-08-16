import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

// Interface definitions
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
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | "workflow";
}

export class FileStorage {
  private dataDir: string;
  private usersDir: string;
  private roomsDir: string;
  private messagesDir: string;

  constructor(baseDir: string = './chat-data') {
    this.dataDir = baseDir;
    this.usersDir = path.join(baseDir, 'users');
    this.roomsDir = path.join(baseDir, 'rooms');
    this.messagesDir = path.join(baseDir, "messages");
  }

  async initialize(): Promise<void> {
    await this.ensureDirectory(this.dataDir);
    await this.ensureDirectory(this.usersDir);
    await this.ensureDirectory(this.roomsDir);
    await this.ensureDirectory(this.messagesDir);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fileAPI.createDirectory(dirPath);
    }
  }

  async saveUser(user: User): Promise<void> {
    const userPath = path.join(this.usersDir, `${user.id}.json`);
    const userData = {
      ...user,
      registeredAt: user.registeredAt.toISOString()
    };
    await fileAPI.createFile(userPath, JSON.stringify(userData, { type: FileType.TEMPORARY }));
  }

  async loadUser(userId: string): Promise<User | null> {
    try {
      const userPath = path.join(this.usersDir, `${userId}.json`);
      const data = await fileAPI.readFile(userPath, 'utf-8');
      const userData = JSON.parse(data);
      
      return {
        ...userData,
        registeredAt: new Date(userData.registeredAt)
      };
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async saveRoom(room: Room): Promise<void> {
    const roomPath = path.join(this.roomsDir, `${room.id}.json`);
    const roomData = {
      ...room,
      createdAt: room.createdAt.toISOString(),
      lastActivity: room.lastActivity.toISOString()
    };
    await fileAPI.createFile(roomPath, JSON.stringify(roomData, { type: FileType.TEMPORARY }));
  }

  async loadRoom(roomId: string): Promise<Room | null> {
    try {
      const roomPath = path.join(this.roomsDir, `${roomId}.json`);
      const data = await fileAPI.readFile(roomPath, 'utf-8');
      const roomData = JSON.parse(data);
      
      return {
        ...roomData,
        createdAt: new Date(roomData.createdAt),
        lastActivity: new Date(roomData.lastActivity)
      };
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllRooms(): Promise<Room[]> {
    try {
      const files = await fs.readdir(this.roomsDir);
      const roomFiles = files.filter(file => file.endsWith('.json'));
      
      const rooms: Room[] = [];
      for(const file of roomFiles) {
        const roomId = file.replace('.json', '');
        const room = await this.loadRoom(roomId);
        if(room) {
          rooms.push(room);
        }
      }
      
      return rooms.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async saveMessage(message: Message): Promise<void> {
    // Create room message directory if it doesn't exist
    const roomMessageDir = path.join(this.messagesDir, message.roomId);
    await this.ensureDirectory(roomMessageDir);
    
    const messagePath = path.join(roomMessageDir, `${message.id}.json`);
    const messageData = {
      ...message,
      timestamp: message.timestamp.toISOString()
    };
    await fileAPI.createFile(messagePath, JSON.stringify(messageData, { type: FileType.TEMPORARY }));
    
    // Also append to room message log for easy chronological access
    const logPath = path.join(roomMessageDir, 'messages.log');
    const logEntry = JSON.stringify(messageData) + '\n';
    await fileAPI.appendFile(logPath, logEntry);
  }

  async loadMessages(roomId: string): Promise<Message[]> {
    try {
      const roomMessageDir = path.join(this.messagesDir, roomId);
      const logPath = path.join(roomMessageDir, 'messages.log');
      
      const data = await fileAPI.readFile(logPath, 'utf-8');
      const lines = data.trim().split('\n').filter(line => line.trim());
      
      // Get the last `limit` messages
      const recentLines = lines.slice(-limit);
      
      const messages: Message[] = recentLines.map(line => {
        const messageData = JSON.parse(line);
        return {
          ...messageData,
          timestamp: new Date(messageData.timestamp)
        };
      });
      
      return messages;
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const userPath = path.join(this.usersDir, `${userId}.json`);
      await fileAPI.unlink(userPath);
      return true;
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const roomPath = path.join(this.roomsDir, `${roomId}.json`);
      await fileAPI.unlink(roomPath);
      
      // Also remove messages directory
      const roomMessageDir = path.join(this.messagesDir, roomId);
      try {
        await fs.rm(roomMessageDir, { recursive: true });
      } catch {
        // Ignore if messages directory doesn't exist
      }
      
      return true;
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async getMessageCount(roomId: string): Promise<number> {
    try {
      const roomMessageDir = path.join(this.messagesDir, roomId);
      const logPath = path.join(roomMessageDir, 'messages.log');
      
      const data = await fileAPI.readFile(logPath, 'utf-8');
      const lines = data.trim().split('\n').filter(line => line.trim());
      
      return lines.length;
    } catch (error) {
      if((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  async searchMessages(roomId: string, query: string, limit: number = 20): Promise<Message[]> {
    const messages = await this.loadMessages(roomId, 1000); // Load more for searching
    const lowercaseQuery = query.toLowerCase();
    
    const matchingMessages = messages.filter(message => 
      message.content.toLowerCase().includes(lowercaseQuery) ||
      message.username.toLowerCase().includes(lowercaseQuery)
    );
    
    return matchingMessages.slice(-limit);
  }

  async getStorageStats(): Promise<{
    totalUsers: number;
    totalRooms: number;
    totalMessages: number;
    diskUsage: number;
  }> {
    try {
      const usersFiles = await fs.readdir(this.usersDir);
      const roomsFiles = await fs.readdir(this.roomsDir);
      
      let totalMessages = 0;
      const roomDirs = await fs.readdir(this.messagesDir);
      for(const roomDir of roomDirs) {
        const count = await this.getMessageCount(roomDir);
        totalMessages += count;
      }
      
      // Calculate disk usage (simplified)
      const stats = await /* FRAUD_FIX: fs.stat(this.dataDir) */;
      
      return {
        totalUsers: usersFiles.filter(f => f.endsWith('.json')).length,
        totalRooms: roomsFiles.filter(f => f.endsWith('.json')).length,
        totalMessages,
        diskUsage: stats.size
      };
    } catch (error) {
      return {
        totalUsers: 0,
        totalRooms: 0,
        totalMessages: 0,
        diskUsage: 0
      };
    }
  }

  getDataDirectory(): string {
    return this.dataDir;
  }
}