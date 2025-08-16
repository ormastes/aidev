import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { ClaudeAPIClient, ClaudeAPIConfig } from './claude-api-client';
import { SessionManager, SessionData, SessionManagerConfig } from './session-manager';
import { StreamHandler, StreamHandlerConfig } from '../streaming/stream-handler';
import { PermissionManager } from '../permissions/permission-manager';
import { DangerousModeManager } from '../permissions/dangerous-mode';
import { ChatSpaceConnector, ChatSpaceConfig } from '../integration/chat-space-connector';
import { PocketFlowBridge, PocketFlowBridgeConfig } from '../integration/pocketflow-bridge';
import { TaskQueueManager, TaskQueueConfig, Task } from '../integration/task-queue-manager';
import { MessageBuilder } from '../streaming/json-stream-parser';

export interface CoordinatorConfig {
  apiKey?: string;  // Now optional - will use local auth if not provided
  sessionStorageDir?: string;
  taskQueuePath?: string;
  claudeConfig?: Partial<ClaudeAPIConfig>;
  chatSpaceConfig?: ChatSpaceConfig;
  pocketFlowConfig?: PocketFlowBridgeConfig;
  autoStart?: boolean;
  dangerousModeEnabled?: boolean;
}

export interface CoordinatorState {
  running: boolean;
  sessionId?: string;
  session?: SessionData;
  connected: {
    chatSpace: boolean;
    pocketFlow: boolean;
  };
  activeTask?: Task;
  stats: {
    messagesProcessed: number;
    taskscompleted: number;
    workflowsExecuted: number;
    errors: number;
  };
}

export class Coordinator extends EventEmitter {
  private config: CoordinatorConfig;
  private state: CoordinatorState;
  private claudeClient: ClaudeAPIClient;
  private sessionManager: SessionManager;
  private streamHandler?: StreamHandler;
  private permissionManager: PermissionManager;
  private dangerousModeManager: DangerousModeManager;
  private chatSpaceConnector?: ChatSpaceConnector;
  private pocketFlowBridge?: PocketFlowBridge;
  private taskQueueManager?: TaskQueueManager;
  private interruptHandler?: NodeJS.SignalsListener;
  private shutdownInProgress: boolean;

  constructor(config: CoordinatorConfig) {
    super();
    
    this.config = config;
    this.shutdownInProgress = false;
    
    this.state = {
      running: false,
      connected: {
        chatSpace: false,
        pocketFlow: false
      },
      stats: {
        messagesProcessed: 0,
        taskscompleted: 0,
        workflowsExecuted: 0,
        errors: 0
      }
    };

    // Initialize core components
    this.claudeClient = new ClaudeAPIClient({
      apiKey: config.apiKey,
      ...config.claudeConfig
    });

    this.sessionManager = new SessionManager({
      storageDir: config.sessionStorageDir || path.join(process.cwd(), '.coordinator-sessions'),
      autoSaveInterval: 30000
    });

    this.permissionManager = new PermissionManager();
    this.dangerousModeManager = new DangerousModeManager(this.permissionManager);

    // Set up event handlers
    this.setupEventHandlers();
  }

  async start(sessionId?: string): Promise<void> {
    if (this.state.running) {
      throw new Error('Coordinator is already running');
    }

    try {
      this.emit('starting');

      // Initialize session manager
      await this.sessionManager.initialize();

      // Load or create session
      if (sessionId) {
        const session = await this.sessionManager.loadSession(sessionId);
        if (!session) {
          throw new Error(`Session '${sessionId}' not found`);
        }
        this.state.session = session;
        this.state.sessionId = sessionId;
      } else {
        const session = await this.sessionManager.createSession({
          taskQueuePath: this.config.taskQueuePath
        });
        this.state.session = session;
        this.state.sessionId = session.id;
      }

      // Initialize stream handler
      this.streamHandler = new StreamHandler({
        sessionId: this.state.sessionId,
        claudeClient: this.claudeClient,
        eventEmitter: this
      });

      // Initialize integrations
      await this.initializeIntegrations();

      // Set up interrupt handling
      this.setupInterruptHandling();

      // Start stream handler
      await this.streamHandler.start();

      this.state.running = true;
      this.emit('started', {
        sessionId: this.state.sessionId,
        session: this.state.session
      });

      // Enable dangerous mode if configured
      if (this.config.dangerousModeEnabled) {
        await this.dangerousModeManager.enable({
          reason: 'Configured at startup',
          skipWarning: true
        });
      }

      // Process any pending tasks
      if (this.taskQueueManager) {
        this.checkForNextTask();
      }

    } catch (error) {
      this.emit('error', {
        type: 'startup_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async stop(reason?: string): Promise<void> {
    if (!this.state.running || this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;
    this.emit('stopping', { reason });

    try {
      // Create checkpoint before stopping
      if (this.state.sessionId) {
        await this.sessionManager.createCheckpoint(
          this.state.sessionId,
          reason === 'interrupt' ? 'interrupt' : 'manual'
        );
      }

      // Stop stream handler
      if (this.streamHandler) {
        await this.streamHandler.stop();
      }

      // Disconnect integrations
      await this.disconnectIntegrations();

      // Save session
      if (this.state.sessionId) {
        await this.sessionManager.saveSession(this.state.sessionId);
      }

      // Shut down managers
      await this.sessionManager.shutdown();
      if (this.taskQueueManager) {
        await this.taskQueueManager.shutdown();
      }

      this.state.running = false;
      this.shutdownInProgress = false;
      
      this.emit('stopped', {
        reason,
        sessionId: this.state.sessionId,
        stats: this.state.stats
      });

    } catch (error) {
      this.shutdownInProgress = false;
      this.emit('error', {
        type: 'shutdown_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async interrupt(): Promise<void> {
    if (!this.state.running) {
      return;
    }

    this.emit('interrupted');

    // Mark session as interrupted
    if (this.state.sessionId) {
      await this.sessionManager.interruptSession(this.state.sessionId);
    }

    // Stop coordinator
    await this.stop('interrupt');
  }

  async resume(sessionId: string): Promise<void> {
    if (this.state.running) {
      throw new Error('Coordinator is already running');
    }

    // Resume session
    const session = await this.sessionManager.resumeSession(sessionId);
    
    // Restore state from session
    if (session.context.variables.coordinatorState) {
      Object.assign(this.state.stats, session.context.variables.coordinatorState.stats || {});
    }

    // Start with resumed session
    await this.start(sessionId);

    this.emit('resumed', {
      sessionId,
      session
    });

    // Resume task if one was active
    if (session.context.currentTask) {
      const task = await this.taskQueueManager?.getTask(session.context.currentTask);
      if (task && task.status === 'in_progress') {
        this.emit('task_resumed', { task });
      }
    }
  }

  private async initializeIntegrations(): Promise<void> {
    // Initialize chat-space connector
    if (this.config.chatSpaceConfig) {
      this.chatSpaceConnector = new ChatSpaceConnector({
        ...this.config.chatSpaceConfig,
        eventBus: this
      });

      try {
        await this.chatSpaceConnector.connect();
        this.state.connected.chatSpace = true;
      } catch (error) {
        this.emit('warning', {
          message: 'Failed to connect to chat-space',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Initialize PocketFlow bridge
    if (this.config.pocketFlowConfig) {
      this.pocketFlowBridge = new PocketFlowBridge({
        ...this.config.pocketFlowConfig,
        eventBus: this,
        coordinatorContext: {
          sessionId: this.state.sessionId
        }
      });

      try {
        await this.pocketFlowBridge.connect();
        this.state.connected.pocketFlow = true;
        
        // Register action handlers
        this.registerPocketFlowActions();
      } catch (error) {
        this.emit('warning', {
          message: 'Failed to connect to PocketFlow',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Initialize task queue manager
    if (this.config.taskQueuePath) {
      this.taskQueueManager = new TaskQueueManager({
        queuePath: this.config.taskQueuePath,
        maxConcurrentTasks: 1
      });

      await this.taskQueueManager.initialize();
    }
  }

  private async disconnectIntegrations(): Promise<void> {
    if (this.chatSpaceConnector?.isConnected()) {
      await this.chatSpaceConnector.disconnect();
      this.state.connected.chatSpace = false;
    }

    if (this.pocketFlowBridge?.isConnected()) {
      await this.pocketFlowBridge.disconnect();
      this.state.connected.pocketFlow = false;
    }
  }

  private setupEventHandlers(): void {
    // Claude API events
    this.claudeClient.on('error', (error) => {
      this.state.stats.errors++;
      this.emit('claude_error', error);
    });

    // Session manager events
    this.sessionManager.on('session_saved', ({ sessionId }) => {
      this.emit('session_saved', { sessionId });
    });

    // Permission events
    this.permissionManager.on('permission_checked', (data) => {
      this.emit('permission_checked', data);
    });

    this.dangerousModeManager.on('enabled', (data) => {
      this.emit('dangerous_mode_enabled', data);
    });

    this.dangerousModeManager.on('disabled', (data) => {
      this.emit('dangerous_mode_disabled', data);
    });

    // Stream handler events
    this.on('message_received', async (data) => {
      this.state.stats.messagesProcessed++;
      
      // Add to conversation history
      if (this.state.sessionId && data.message) {
        await this.sessionManager.addConversationEntry(this.state.sessionId, {
          role: data.message.type as any,
          content: JSON.stringify(data.message)
        });
      }
    });

    // Task queue events
    if (this.taskQueueManager) {
      this.taskQueueManager.on('next_task_ready', ({ task }) => {
        this.handleNextTask(task);
      });

      this.taskQueueManager.on('task_completed', ({ taskId }) => {
        this.state.stats.taskscompleted++;
        this.state.activeTask = undefined;
        this.checkForNextTask();
      });
    }

    // Chat-space events
    this.on('chat_message', async ({ message }) => {
      if (message.content.toLowerCase().includes('coordinator')) {
        await this.handleChatMessage(message);
      }
    });

    // PocketFlow events
    this.on('workflow_triggered', ({ workflowId }) => {
      this.state.stats.workflowsExecuted++;
    });
  }

  private setupInterruptHandling(): void {
    // Handle Ctrl+C
    this.interruptHandler = async () => {
      console.log('\nInterrupt received, saving session...');
      await this.interrupt();
      process.exit(0);
    };

    process.on('SIGINT', this.interruptHandler);
    process.on('SIGTERM', this.interruptHandler);

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      this.state.stats.errors++;
      
      try {
        await this.sessionManager.createCheckpoint(
          this.state.sessionId!,
          'error'
        );
      } catch (e) {
        console.error('Failed to create error checkpoint:', e);
      }
    });
  }

  private registerPocketFlowActions(): void {
    if (!this.pocketFlowBridge) return;

    // Register Claude execution action
    this.pocketFlowBridge.registerActionHandler(
      'execute_with_claude',
      async (params, context) => {
        const { prompt, dangerousMode } = params;
        
        if (dangerousMode && !this.dangerousModeManager.isEnabled()) {
          await this.dangerousModeManager.enable({
            reason: 'PocketFlow workflow requested',
            duration: 300000 // 5 minutes
          });
        }

        const response = await this.claudeClient.createMessage(
          [{ role: 'user', content: prompt }],
          {
            sessionId: context.sessionId,
            dangerousMode
          }
        );

        return { response };
      }
    );

    // Register checkpoint action
    this.pocketFlowBridge.registerActionHandler(
      'create_checkpoint',
      async (params, context) => {
        const checkpoint = await this.sessionManager.createCheckpoint(
          context.sessionId || this.state.sessionId!,
          params.reason || 'workflow'
        );
        return { checkpointId: checkpoint.id };
      }
    );
  }

  private async handleNextTask(task: Task): Promise<void> {
    if (this.state.activeTask) {
      return; // Already processing a task
    }

    this.state.activeTask = task;
    
    try {
      await this.taskQueueManager!.startTask(task.id);
      
      // Update session context
      if (this.state.session) {
        this.state.session.context.currentTask = task.id;
        await this.sessionManager.saveSession(this.state.sessionId!);
      }

      // Trigger task automation workflow if connected to PocketFlow
      if (this.pocketFlowBridge?.isConnected()) {
        await this.pocketFlowBridge.triggerTaskAutomation(task.id, task);
      } else {
        // Process task directly
        await this.processTask(task);
      }
    } catch (error) {
      await this.taskQueueManager!.failTask(
        task.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async processTask(task: Task): Promise<void> {
    // Send task to Claude for processing
    const prompt = `
Task: ${task.title}
Description: ${task.description}
Priority: ${task.priority}

Please analyze this task and provide a solution or implementation plan.
`;

    const response = await this.claudeClient.createMessage(
      [{ role: 'user', content: prompt }],
      {
        sessionId: this.state.sessionId,
        dangerousMode: this.dangerousModeManager.isEnabled()
      }
    );

    // Report progress
    await this.taskQueueManager!.reportProgress(task.id, 100, 'Task In Progress');
    
    // In Progress task
    await this.taskQueueManager!.completeTask(task.id, response);
  }

  private checkForNextTask(): void {
    if (!this.taskQueueManager || this.state.activeTask) {
      return;
    }

    const nextTask = this.taskQueueManager.getNextTask();
    if (nextTask) {
      this.handleNextTask(nextTask);
    }
  }

  private async handleChatMessage(message: any): Promise<void> {
    // Respond to chat messages mentioning coordinator
    if (this.chatSpaceConnector?.isConnected()) {
      const room = this.chatSpaceConnector.getCurrentRoom();
      if (room) {
        await this.chatSpaceConnector.sendMessage(
          `Coordinator received: ${message.content}`,
          { roomId: room }
        );
      }
    }
  }

  // Public methods for external control
  async enableDangerousMode(reason: string): Promise<boolean> {
    return await this.dangerousModeManager.enable({ reason });
  }

  async disableDangerousMode(): Promise<void> {
    await this.dangerousModeManager.disable();
  }

  getState(): CoordinatorState {
    return { ...this.state };
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | undefined> {
    if (!this.taskQueueManager) {
      throw new Error('Task queue manager not initialized');
    }
    
    const newTask = await this.taskQueueManager.addTask(task);
    this.checkForNextTask();
    return newTask;
  }

  async sendToChatSpace(message: string, roomId?: string): Promise<void> {
    if (!this.chatSpaceConnector?.isConnected()) {
      throw new Error('Not connected to chat-space');
    }
    
    await this.chatSpaceConnector.sendMessage(message, { roomId });
  }

  async triggerWorkflow(
    workflowId: string,
    params?: Record<string, any>
  ): Promise<void> {
    if (!this.pocketFlowBridge?.isConnected()) {
      throw new Error('Not connected to PocketFlow');
    }
    
    await this.pocketFlowBridge.triggerWorkflow(workflowId, params, {
      sessionId: this.state.sessionId
    });
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.streamHandler) {
      throw new Error('Stream handler not initialized');
    }
    
    await this.streamHandler.sendSystemMessage(content);
  }
}