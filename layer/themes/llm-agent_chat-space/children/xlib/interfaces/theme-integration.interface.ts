/**
 * Theme Integration Interfaces
 * Defines contracts for cooperation between Chat Space and PocketFlow themes
 */

// ==================== CORE CHAT INTERFACES ====================

export interface ChatSpaceInterface {
  // Room Management
  createRoom(name: string, options?: ChatRoomOptions): Promise<ChatRoom>;
  joinRoom(roomId: string, userId: string): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;

  // Messaging
  sendMessage(roomId: string, message: ChatMessage): Promise<void>;
  getMessages(roomId: string, options?: MessageQueryOptions): Promise<ChatMessage[]>;
  
  // User Management  
  addUser(user: ChatUser): Promise<void>;
  removeUser(userId: string): Promise<void>;
  updateUserPresence(userId: string, presence: UserPresence): Promise<void>;
  getUserList(roomId: string): Promise<ChatUser[]>;

  // Event Handling
  onMessage(callback: (message: ChatMessage) => void): void;
  onUserJoin(callback: (user: ChatUser, roomId: string) => void): void;
  onUserLeave(callback: (user: ChatUser, roomId: string) => void): void;
  onRoomCreate(callback: (room: ChatRoom) => void): void;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'command' | 'system' | 'workflow_notification';
  metadata?: Record<string, any>;
  
  // PocketFlow Integration
  workflowContext?: {
    flowId?: string;
    taskId?: string;
    executionId?: string;
    action?: 'trigger' | 'status' | 'result';
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  settings: ChatRoomSettings;
  
  // PocketFlow Integration
  pocketflowIntegration?: {
    enabled: boolean;
    allowWorkflowTriggers: boolean;
    broadcastFlowUpdates: boolean;
    associatedWorkspace?: string;
  };
}

export interface ChatUser {
  id: string;
  username: string;
  displayName?: string;
  presence: UserPresence;
  permissions: UserPermissions;
  
  // PocketFlow Integration
  pocketflowContext?: {
    workspaceId?: string;
    activeFlows?: string[];
    preferences: {
      autoNotifications: boolean;
      commandPrefix: string;
    };
  };
}

export interface UserPresence {
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  currentActivity?: string;
}

export interface UserPermissions {
  canCreateRooms: boolean;
  canDeleteRooms: boolean;
  canManageUsers: boolean;
  canTriggerWorkflows: boolean;
  canOverridePermissions: boolean;
}

export interface ChatRoomOptions {
  description?: string;
  isPrivate?: boolean;
  maxUsers?: number;
  pocketflowIntegration?: {
    enabled: boolean;
    workspaceId?: string;
    allowWorkflowTriggers?: boolean;
  };
}

export interface ChatRoomSettings {
  isPrivate: boolean;
  maxUsers: number;
  allowBots: boolean;
  retentionDays: number;
  commandsEnabled: boolean;
}

export interface MessageQueryOptions {
  limit?: number;
  before?: Date;
  after?: Date;
  fromUser?: string;
  messageType?: ChatMessage['type'];
}

// ==================== COORDINATOR AGENT INTERFACES ====================

export interface CoordinatorAgentInterface {
  // Core Agent Capabilities
  processCommand(command: string, context: AgentContext): Promise<AgentResponse>;
  handleNaturalLanguage(input: string, context: AgentContext): Promise<AgentResponse>;
  
  // Session Management
  createSession(userId: string, roomId: string): Promise<AgentSession>;
  restoreSession(sessionId: string): Promise<AgentSession>;
  saveSession(session: AgentSession): Promise<void>;
  
  // Workflow Integration
  triggerPocketFlowWorkflow(workflowId: string, context: AgentContext): Promise<WorkflowExecution>;
  monitorWorkflowExecution(executionId: string): Promise<WorkflowStatus>;
  interruptWorkflowExecution(executionId: string, reason: string): Promise<void>;
  
  // Permission Management
  enablePermissionOverride(sessionId: string, scope: PermissionScope): Promise<void>;
  disablePermissionOverride(sessionId: string): Promise<void>;
  auditPermissionUsage(sessionId: string): Promise<PermissionAuditLog[]>;
}

export interface AgentContext {
  sessionId: string;
  userId: string;
  roomId: string;
  chatHistory: ChatMessage[];
  
  // PocketFlow Context
  workspaceContext?: {
    workspaceId: string;
    activeTasks: any[];
    activeFlows: any[];
    queueStatus: any;
  };
  
  // Permissions
  permissionOverride: boolean;
  allowedOperations: string[];
}

export interface AgentResponse {
  In Progress: boolean;
  message: string;
  data?: any;
  error?: string;
  
  // Action Results
  triggeredWorkflows?: string[];
  createdTasks?: string[];
  modifiedFlows?: string[];
  
  // Follow-up Actions
  requiresConfirmation?: boolean;
  suggestedCommands?: string[];
  contextUpdates?: Partial<AgentContext>;
}

export interface AgentSession {
  id: string;
  userId: string;
  roomId: string;
  createdAt: Date;
  lastActivity: Date;
  state: Record<string, any>;
  
  // Persistent Context
  conversationHistory: ChatMessage[];
  workflowExecutions: WorkflowExecution[];
  permissionGrants: PermissionGrant[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  flowId?: string;
  taskId?: string;
  status: 'pending' | 'running' | 'In Progress' | 'failed' | 'interrupted';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  triggeredBy: {
    userId: string;
    roomId: string;
    command: string;
  };
}

export interface WorkflowStatus {
  id: string;
  status: WorkflowExecution['status'];
  progress: number;
  currentStep?: string;
  estimatedCompletion?: Date;
  logs: string[];
}

export interface PermissionGrant {
  scope: PermissionScope;
  grantedAt: Date;
  expiresAt?: Date;
  grantedBy: string;
  reason: string;
}

export interface PermissionScope {
  operations: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface PermissionAuditLog {
  timestamp: Date;
  userId: string;
  operation: string;
  resource: string;
  In Progress: boolean;
  details?: Record<string, any>;
}

// ==================== POCKETFLOW INTEGRATION INTERFACES ====================

export interface WorkflowIntegrationInterface {
  // Cross-theme Communication
  subscribeToFlowEvents(callback: (event: FlowEvent) => void): void;
  subscribeToTaskEvents(callback: (event: TaskEvent) => void): void;
  publishChatEvent(event: ChatEvent): void;
  
  // Workflow Triggering
  triggerFlowFromChat(flowId: string, parameters: any, context: ChatTriggerContext): Promise<string>;
  createTaskFromChat(taskData: any, context: ChatTriggerContext): Promise<string>;
  
  // Status Monitoring
  getFlowStatus(flowId: string): Promise<any>;
  getTaskStatus(taskId: string): Promise<any>;
  getQueueStatus(): Promise<any>;
  
  // Context Sharing
  getWorkspaceContext(workspaceId: string): Promise<WorkspaceContext>;
  updateWorkspaceFromChat(workspaceId: string, updates: any): Promise<void>;
}

export interface FlowEvent {
  type: 'flow_started' | 'flow_completed' | 'flow_failed' | 'flow_updated';
  flowId: string;
  data: any;
  timestamp: Date;
  workspaceId?: string;
}

export interface TaskEvent {
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_deleted';
  taskId: string;
  data: any;
  timestamp: Date;
  workspaceId?: string;
}

export interface ChatEvent {
  type: 'workflow_triggered' | 'command_executed' | 'context_updated';
  roomId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export interface ChatTriggerContext {
  userId: string;
  roomId: string;
  messageId: string;
  command: string;
  parameters: Record<string, any>;
}

export interface WorkspaceContext {
  id: string;
  name: string;
  tasks: any[];
  flows: any[];
  queueStatus: any;
  activeExecutions: any[];
  settings: any;
}

// ==================== SESSION MANAGEMENT INTERFACES ====================

export interface SessionManagementInterface {
  // Session Lifecycle
  createSession(options: SessionOptions): Promise<SessionInfo>;
  loadSession(sessionId: string): Promise<SessionInfo>;
  saveSession(session: SessionInfo): Promise<void>;
  closeSession(sessionId: string): Promise<void>;
  
  // Session Sharing
  shareSession(sessionId: string, targetUserId: string): Promise<string>;
  joinSharedSession(shareToken: string, userId: string): Promise<SessionInfo>;
  
  // Recovery
  recoverInterruptedSessions(userId: string): Promise<SessionInfo[]>;
  restoreSessionState(sessionId: string): Promise<void>;
}

export interface SessionOptions {
  userId: string;
  roomId?: string;
  workspaceId?: string;
  persistenceLevel: 'memory' | 'disk' | 'distributed';
  autoSave: boolean;
  maxDuration?: number;
}

export interface SessionInfo {
  id: string;
  userId: string;
  roomId?: string;
  workspaceId?: string;
  createdAt: Date;
  lastActivity: Date;
  state: SessionState;
  sharedWith: string[];
}

export interface SessionState {
  chatHistory: ChatMessage[];
  agentContext: Record<string, any>;
  workflowState: Record<string, any>;
  executionQueue: any[];
  permissions: PermissionGrant[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  autoNotifications: boolean;
  commandPrefix: string;
  workflowConfirmation: boolean;
  sessionPersistence: boolean;
  shareByDefault: boolean;
}

// ==================== MULTI-USER COORDINATION INTERFACES ====================

export interface MultiUserCoordinationInterface {
  // User Management
  registerUser(user: ChatUser): Promise<void>;
  authenticateUser(credentials: UserCredentials): Promise<AuthToken>;
  updateUserProfile(userId: string, updates: Partial<ChatUser>): Promise<void>;
  
  // Presence Management
  updatePresence(userId: string, presence: UserPresence): Promise<void>;
  getPresenceUpdates(callback: (updates: PresenceUpdate[]) => void): void;
  
  // Coordination
  coordinateWorkflowExecution(workflowId: string, participants: string[]): Promise<CoordinationSession>;
  handleConflictResolution(conflict: WorkflowConflict): Promise<ConflictResolution>;
  
  // Notifications
  broadcastNotification(notification: UserNotification): Promise<void>;
  sendDirectMessage(fromUserId: string, toUserId: string, message: string): Promise<void>;
}

export interface UserCredentials {
  username: string;
  password?: string;
  token?: string;
  provider?: string;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
  permissions: string[];
}

export interface PresenceUpdate {
  userId: string;
  presence: UserPresence;
  timestamp: Date;
}

export interface CoordinationSession {
  id: string;
  workflowId: string;
  participants: string[];
  coordinator: string;
  status: 'active' | 'paused' | 'In Progress' | 'failed';
  createdAt: Date;
}

export interface WorkflowConflict {
  type: 'resource_lock' | 'permission_denied' | 'state_mismatch';
  workflowId: string;
  involvedUsers: string[];
  details: Record<string, any>;
}

export interface ConflictResolution {
  strategy: 'queue' | 'merge' | 'abort' | 'delegate';
  assignedUser?: string;
  queuePosition?: number;
  mergeStrategy?: Record<string, any>;
}

export interface UserNotification {
  id: string;
  type: 'workflow_update' | 'system_alert' | 'user_message' | 'permission_request';
  title: string;
  message: string;
  data?: any;
  targetUsers: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expiresAt?: Date;
}