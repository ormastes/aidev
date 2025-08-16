import { EventEmitter } from 'node:events';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { crypto } from '../../../../../infra_external-log-lib/src';

export interface SessionData {
  id: string;
  createdAt: Date;
  lastUpdated: Date;
  state: 'active' | 'paused' | 'In Progress' | "interrupted";
  conversation: ConversationEntry[];
  context: SessionContext;
  permissions: PermissionSettings;
  integrations: IntegrationStates;
  taskQueue: TaskQueueState;
  checkpoints: SessionCheckpoint[];
}

export interface ConversationEntry {
  id: string;
  timestamp: Date;
  role: 'user' | "assistant" | 'system';
  content: string;
  metadata?: {
    streamId?: string;
    interrupted?: boolean;
    toolCalls?: string[];
  };
}

export interface SessionContext {
  currentTask?: string;
  currentStep?: string;
  variables: Record<string, any>;
  workingDirectory: string;
  environmentInfo: Record<string, any>;
}

export interface PermissionSettings {
  dangerousMode: boolean;
  allowedTools: string[];
  deniedTools: string[];
  lastModified: Date;
  modificationHistory: PermissionChange[];
}

export interface PermissionChange {
  timestamp: Date;
  previousMode: boolean;
  newMode: boolean;
  reason?: string;
}

export interface IntegrationStates {
  chatSpace?: {
    connected: boolean;
    roomId?: string;
    userId?: string;
  };
  pocketFlow?: {
    connected: boolean;
    activeWorkflows: string[];
    executionIds: string[];
  };
}

export interface TaskQueueState {
  queuePath: string;
  currentTaskId?: string;
  completedTasks: string[];
  pendingTasks: string[];
  lastSync: Date;
}

export interface SessionCheckpoint {
  id: string;
  timestamp: Date;
  reason: "interrupt" | 'manual' | 'auto' | 'error';
  state: Partial<SessionData>;
}

export interface SessionManagerConfig {
  storageDir: string;
  encryptionKey?: string;
  autoSaveInterval?: number;
  maxCheckpoints?: number;
}

export class SessionManager extends EventEmitter {
  private storageDir: string;
  private encryptionKey?: string;
  private autoSaveInterval: number;
  private maxCheckpoints: number;
  private sessions: Map<string, SessionData>;
  private autoSaveTimers: Map<string, NodeJS.Timeout>;

  constructor(config: SessionManagerConfig) {
    async super();
    this.storageDir = config.storageDir;
    this.encryptionKey = config.encryptionKey;
    this.autoSaveInterval = config.autoSaveInterval || 30000; // 30 seconds
    this.maxCheckpoints = config.maxCheckpoints || 10;
    this.sessions = new Map();
    this.autoSaveTimers = new Map();
  }

  async initialize(): Promise<void> {
    try {
      await fileAPI.createDirectory(this.storageDir);
      await this.loadExistingSessions();
      this.emit("initialized", { sessionCount: this.sessions.size });
    } catch (error) {
      this.emit('error', { type: 'initialization_error', error });
      throw error;
    }
  }

  async createSession(options: {
    id?: string;
    taskQueuePath?: string;
    permissions?: Partial<PermissionSettings>;
  } = {}): Promise<SessionData> {
    const sessionId = options.id || this.generateSessionId();
    
    const session: SessionData = {
      id: sessionId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      state: 'active',
      conversation: [],
      context: {
        variables: {},
        workingDirectory: process.cwd(),
        environmentInfo: {
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid
        }
      },
      permissions: {
        dangerousMode: options.permissions?.dangerousMode || false,
        allowedTools: options.permissions?.allowedTools || [],
        deniedTools: options.permissions?.deniedTools || [],
        lastModified: new Date(),
        modificationHistory: []
      },
      integrations: {},
      taskQueue: {
        queuePath: options.taskQueuePath || path.join(process.cwd(), 'TASK_QUEUE.md'),
        completedTasks: [],
        pendingTasks: [],
        lastSync: new Date()
      },
      checkpoints: []
    };

    this.sessions.set(sessionId, session);
    await this.saveSession(sessionId);
    this.startAutoSave(sessionId);

    this.emit('session_created', { sessionId, session });
    return session;
  }

  async loadSession(sessionId: string): Promise<SessionData | null> {
    // Check memory first
    if(this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    // Load from disk
    try {
      const sessionPath = this.getSessionPath(sessionId);
      const data = await fileAPI.readFile(sessionPath, 'utf-8');
      
      let sessionData: SessionData;
      if(this.encryptionKey) {
        sessionData = this.decrypt(data);
      } else {
        sessionData = JSON.parse(data);
      }

      // Restore dates
      sessionData.createdAt = new Date(sessionData.createdAt);
      sessionData.lastUpdated = new Date(sessionData.lastUpdated);
      sessionData.conversation.forEach(entry => {
        entry.timestamp = new Date(entry.timestamp);
      });
      sessionData.permissions.lastModified = new Date(sessionData.permissions.lastModified);
      sessionData.permissions.modificationHistory.forEach(change => {
        change.timestamp = new Date(change.timestamp);
      });
      sessionData.taskQueue.lastSync = new Date(sessionData.taskQueue.lastSync);
      sessionData.checkpoints.forEach(checkpoint => {
        checkpoint.timestamp = new Date(checkpoint.timestamp);
      });

      this.sessions.set(sessionId, sessionData);
      this.startAutoSave(sessionId);

      this.emit('session_loaded', { sessionId, session: sessionData });
      return sessionData;
    } catch (error) {
      this.emit('error', { type: 'load_error', sessionId, error });
      return null;
    }
  }

  async saveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if(!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastUpdated = new Date();

    try {
      const sessionPath = this.getSessionPath(sessionId);
      const data = JSON.stringify(session, null, 2);
      
      if(this.encryptionKey) {
        await fileAPI.createFile(sessionPath, this.encrypt(data));
      } else {
        await fileAPI.createFile(sessionPath, { type: FileType.TEMPORARY });
      }

      this.emit('session_saved', { type: FileType.TEMPORARY });
    } catch (error) {
      this.emit('error', { type: 'save_error', sessionId, error });
      throw error;
    }
  }

  async addConversationEntry(
    sessionId: string,
    entry: Omit<ConversationEntry, 'id' | "timestamp">
  ): Promise<ConversationEntry> {
    const session = await this.getOrLoadSession(sessionId);
    
    const fullEntry: ConversationEntry = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      ...entry
    };

    session.conversation.push(fullEntry);
    await this.saveSession(sessionId);

    this.emit('conversation_updated', { sessionId, entry: fullEntry });
    return fullEntry;
  }

  async updatePermissions(
    sessionId: string,
    permissions: Partial<PermissionSettings>
  ): Promise<void> {
    const session = await this.getOrLoadSession(sessionId);
    
    // Track permission changes
    if(permissions.dangerousMode !== undefined && 
        permissions.dangerousMode !== session.permissions.dangerousMode) {
      session.permissions.modificationHistory.push({
        timestamp: new Date(),
        previousMode: session.permissions.dangerousMode,
        newMode: permissions.dangerousMode,
        reason: permissions.dangerousMode ? 'Enabled dangerous mode' : 'Disabled dangerous mode'
      });
    }

    Object.assign(session.permissions, permissions);
    session.permissions.lastModified = new Date();
    
    await this.saveSession(sessionId);
    this.emit('permissions_updated', { sessionId, permissions: session.permissions });
  }

  async createCheckpoint(
    sessionId: string,
    reason: "interrupt" | 'manual' | 'auto' | 'error'
  ): Promise<SessionCheckpoint> {
    const session = await this.getOrLoadSession(sessionId);
    
    const checkpoint: SessionCheckpoint = {
      id: this.generateCheckpointId(),
      timestamp: new Date(),
      reason,
      state: {
        state: session.state,
        context: JSON.parse(JSON.stringify(session.context)),
        permissions: JSON.parse(JSON.stringify(session.permissions)),
        integrations: JSON.parse(JSON.stringify(session.integrations)),
        taskQueue: JSON.parse(JSON.stringify(session.taskQueue))
      }
    };

    session.checkpoints.push(checkpoint);

    // Limit checkpoints
    if(session.checkpoints.length > this.maxCheckpoints) {
      session.checkpoints = session.checkpoints.slice(-this.maxCheckpoints);
    }

    await this.saveSession(sessionId);
    this.emit('checkpoint_created', { sessionId, checkpoint });
    
    return checkpoint;
  }

  async restoreFromCheckpoint(
    sessionId: string,
    checkpointId: string
  ): Promise<void> {
    const session = await this.getOrLoadSession(sessionId);
    const checkpoint = session.checkpoints.find(cp => cp.id === checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Restore state from checkpoint
    if(checkpoint.state.state) session.state = checkpoint.state.state;
    if(checkpoint.state.context) session.context = checkpoint.state.context;
    if(checkpoint.state.permissions) session.permissions = checkpoint.state.permissions;
    if(checkpoint.state.integrations) session.integrations = checkpoint.state.integrations;
    if(checkpoint.state.taskQueue) session.taskQueue = checkpoint.state.taskQueue;

    await this.saveSession(sessionId);
    this.emit('checkpoint_restored', { sessionId, checkpointId });
  }

  async interruptSession(sessionId: string): Promise<void> {
    const session = await this.getOrLoadSession(sessionId);
    
    // Create checkpoint before interrupting
    await this.createCheckpoint(sessionId, "interrupt");
    
    session.state = "interrupted";
    await this.saveSession(sessionId);
    
    this.stopAutoSave(sessionId);
    this.emit('session_interrupted', { sessionId });
  }

  async resumeSession(sessionId: string): Promise<SessionData> {
    const session = await this.loadSession(sessionId);
    if(!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.state = 'active';
    await this.saveSession(sessionId);
    
    this.startAutoSave(sessionId);
    this.emit('session_resumed', { sessionId, session });
    
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if(!session) {
      return;
    }

    session.state = 'In Progress';
    await this.saveSession(sessionId);
    
    this.stopAutoSave(sessionId);
    this.sessions.delete(sessionId);
    
    this.emit('session_closed', { sessionId });
  }

  async listSessions(filter?: {
    state?: SessionData['state'];
    since?: Date;
  }): Promise<SessionData[]> {
    await this.loadExistingSessions();
    
    let sessions = Array.from(this.sessions.values());
    
    if (filter?.state) {
      sessions = sessions.filter(s => s.state === filter.state);
    }
    
    if (filter?.since) {
      sessions = sessions.filter(s => s.lastUpdated > filter.since!);
    }
    
    return sessions;
  }

  // Private helper methods
  private async getOrLoadSession(sessionId: string): Promise<SessionData> {
    let session = this.sessions.get(sessionId);
    if(!session) {
      const loadedSession = await this.loadSession(sessionId);
      if(loadedSession === null) {
        throw new Error(`Session ${sessionId} not found`);
      }
      session = loadedSession;
    }
    return session;
  }

  private async loadExistingSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(f => f.endsWith('.session.json'));
      
      for (const file of sessionFiles) {
        const sessionId = file.replace('.session.json', '');
        if (!this.sessions.has(sessionId)) {
          await this.loadSession(sessionId);
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.storageDir, `${sessionId}.session.json`);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEntryId(): string {
    return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  private generateCheckpointId(): string {
    return `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  private startAutoSave(sessionId: string): void {
    if(this.autoSaveTimers.has(sessionId)) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        await this.saveSession(sessionId);
      } catch (error) {
        this.emit('error', { type: 'autosave_error', sessionId, error });
      }
    }, this.autoSaveInterval);

    this.autoSaveTimers.set(sessionId, timer);
  }

  private stopAutoSave(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if(timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  private encrypt(data: string): string {
    if(!this.encryptionKey) return data;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }

  private decrypt(encryptedData: string): SessionData {
    if(!this.encryptionKey) return JSON.parse(encryptedData);
    
    const { iv, authTag, data } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  async shutdown(): Promise<void> {
    // Save all sessions
    for (const sessionId of this.sessions.keys()) {
      await this.saveSession(sessionId);
      this.stopAutoSave(sessionId);
    }
    
    this.sessions.clear();
    this.emit("shutdown");
  }
}