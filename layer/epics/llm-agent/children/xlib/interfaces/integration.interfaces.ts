/**
 * Integration interfaces for Chat Space and PocketFlow
 */

import { IServer } from './base.interfaces';
import { Message } from './infrastructure.interfaces';

// Chat Space interfaces
export interface IChatSpace extends IServer {
  // Room management
  createRoom(name: string, options?: RoomOptions): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;
  getRoom(roomId: string): Promise<Room | null>;
  listRooms(): Promise<RoomInfo[]>;
  
  // User management
  joinRoom(roomId: string, userId: string): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  getUsersInRoom(roomId: string): Promise<UserInfo[]>;
  
  // Messaging
  sendMessage(roomId: string, message: ChatMessage): Promise<void>;
  getMessages(roomId: string, options?: MessageQuery): Promise<ChatMessage[]>;
  
  // Events
  onCommand(handler: CommandHandler): void;
  onMessage(handler: MessageHandler): void;
  onUserJoin(handler: UserEventHandler): void;
  onUserLeave(handler: UserEventHandler): void;
}

export interface Room {
  id: string;
  name: string;
  created: Date;
  options: RoomOptions;
  userCount: number;
  lastActivity: Date;
}

export interface RoomOptions {
  persistent?: boolean;
  maxUsers?: number;
  private?: boolean;
  password?: string;
  metadata?: Record<string, any>;
}

export interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  created: Date;
  lastActivity: Date;
}

export interface UserInfo {
  id: string;
  username: string;
  joinedAt: Date;
  status: 'online' | 'away' | 'busy';
  isTyping?: boolean;
}

export interface ChatMessage extends Message {
  roomId: string;
  userId: string;
  username: string;
  mentions?: string[];
  attachments?: Attachment[];
  replyTo?: string;
}

export interface Attachment {
  id: string;
  type: 'file' | 'image' | 'code';
  name: string;
  url?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface MessageQuery {
  limit?: number;
  before?: Date;
  after?: Date;
  userId?: string;
}

export type CommandHandler = (command: Command) => void | Promise<void>;
export type MessageHandler = (message: ChatMessage) => void | Promise<void>;
export type UserEventHandler = (event: UserEvent) => void | Promise<void>;

export interface Command {
  command: string;
  args: string[];
  roomId: string;
  userId: string;
  raw: string;
}

export interface UserEvent {
  userId: string;
  username: string;
  roomId: string;
  timestamp: Date;
}

// PocketFlow interfaces
export interface IPocketFlow extends IServer {
  // Task management
  createTask(task: PocketTask): Promise<string>;
  updateTask(taskId: string, updates: Partial<PocketTask>): Promise<void>;
  getTask(taskId: string): Promise<PocketTask | null>;
  listTasks(filter?: TaskFilter): Promise<PocketTask[]>;
  deleteTask(taskId: string): Promise<void>;
  
  // Task status
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  getTasksByStatus(status: TaskStatus): Promise<PocketTask[]>;
  
  // Automation flows
  createFlow(flow: AutomationFlow): Promise<string>;
  updateFlow(flowId: string, updates: Partial<AutomationFlow>): Promise<void>;
  executeFlow(flowId: string, context?: FlowContext): Promise<FlowResult>;
  listFlows(filter?: FlowFilter): Promise<AutomationFlow[]>;
  deleteFlow(flowId: string): Promise<void>;
  
  // Dashboard
  getDashboard(): Promise<Dashboard>;
  getTaskSummary(): Promise<TaskSummary>;
  getFlowSummary(): Promise<FlowSummary>;
  
  // Quick actions
  executeQuickAction(action: QuickAction): Promise<any>;
}

export interface PocketTask {
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  assignee?: string;
  dueDate?: Date;
  created?: Date;
  updated?: Date;
  metadata?: Record<string, any>;
}

export type TaskStatus = 'pending' | 'in_progress' | "completed" | "cancelled";

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: string | string[];
  tags?: string[];
  assignee?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface AutomationFlow {
  id?: string;
  name: string;
  description?: string;
  triggers: Trigger[];
  actions: Action[];
  conditions?: Condition[];
  enabled?: boolean;
  created?: Date;
  updated?: Date;
  lastRun?: Date;
  metadata?: Record<string, any>;
}

export interface Trigger {
  id: string;
  type: "schedule" | 'event' | 'webhook' | 'manual';
  config: TriggerConfig;
}

export interface TriggerConfig {
  // For schedule
  cron?: string;
  timezone?: string;
  
  // For event
  eventType?: string;
  eventSource?: string;
  
  // For webhook
  webhookUrl?: string;
  webhookSecret?: string;
  
  // Common
  filters?: Record<string, any>;
}

export interface Action {
  id: string;
  type: 'task' | "notification" | 'webhook' | 'script' | 'agent';
  config: ActionConfig;
  onError?: 'stop' | "continue" | 'retry';
}

export interface ActionConfig {
  // For task
  taskTemplate?: Partial<PocketTask>;
  
  // For notification
  notificationType?: 'email' | 'slack' | 'discord';
  notificationTemplate?: string;
  recipients?: string[];
  
  // For webhook
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  
  // For script
  script?: string;
  language?: string;
  
  // For agent
  agentId?: string;
  agentRequest?: any;
}

export interface Condition {
  id: string;
  type: "expression" | 'state' | 'time';
  operator: 'eq' | 'neq' | 'gt' | 'lt' | "contains" | 'regex';
  value: any;
  target?: string;
}

export interface FlowContext {
  variables?: Record<string, any>;
  trigger?: any;
  metadata?: Record<string, any>;
}

export interface FlowResult {
  flowId: string;
  executionId: string;
  status: 'success' | 'failed' | 'partial';
  startTime: Date;
  endTime: Date;
  actions: ActionResult[];
  error?: string;
}

export interface ActionResult {
  actionId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  duration: number;
}

export interface FlowFilter {
  enabled?: boolean;
  tags?: string[];
  lastRunBefore?: Date;
  lastRunAfter?: Date;
}

export interface Dashboard {
  tasks: TaskSummary;
  flows: FlowSummary;
  activity: ActivityItem[];
  quickActions: QuickAction[];
}

export interface TaskSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<string, number>;
  overdue: number;
  dueToday: number;
}

export interface FlowSummary {
  total: number;
  enabled: number;
  lastExecutions: FlowExecution[];
  upcomingTriggers: ScheduledTrigger[];
}

export interface FlowExecution {
  flowId: string;
  flowName: string;
  executionId: string;
  status: 'success' | 'failed';
  timestamp: Date;
}

export interface ScheduledTrigger {
  flowId: string;
  flowName: string;
  nextRun: Date;
  schedule: string;
}

export interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'flow_executed' | 'error';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QuickAction {
  id: string;
  name: string;
  icon?: string;
  action: 'create_task' | 'execute_flow' | 'custom';
  config?: any;
}

// Cross-integration interfaces
export interface IChatFlowIntegration {
  // Chat to Flow
  triggerFlowFromChat(flowId: string, message: ChatMessage): Promise<FlowResult>;
  createTaskFromChat(message: ChatMessage): Promise<string>;
  
  // Flow to Chat
  notifyChat(roomId: string, notification: FlowNotification): Promise<void>;
  updateChatStatus(roomId: string, status: string): Promise<void>;
}

export interface FlowNotification {
  type: 'flow_started' | 'flow_completed' | 'flow_failed' | 'task_update';
  title: string;
  description?: string;
  flowId?: string;
  taskId?: string;
  result?: any;
  error?: string;
}