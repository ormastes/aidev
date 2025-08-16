/**
 * Infrastructure interfaces for cross-component communication
 */

// Event Bus Interface
export interface IEventBus {
  // Publishing
  publish(topic: string, event: Event): Promise<void>;
  publishAsync(topic: string, event: Event): void;
  
  // Subscription
  subscribe(topic: string, handler: EventHandler): Subscription;
  unsubscribe(subscription: Subscription): void;
  
  // Topics
  createTopic(topic: string, options?: TopicOptions): Promise<void>;
  deleteTopic(topic: string): Promise<void>;
  listTopics(): string[];
}

export interface Event {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  topic: string;
  handler: EventHandler;
  filter?: EventFilter;
}

export type EventHandler = (event: Event) => void | Promise<void>;

export interface EventFilter {
  type?: string | string[];
  source?: string | string[];
  metadata?: Record<string, any>;
}

export interface TopicOptions {
  persistent?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// Authentication Interface
export interface IAuthService {
  // Authentication
  authenticate(credentials: Credentials): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  logout(token: string): Promise<void>;
  
  // Validation
  validateToken(token: string): Promise<TokenInfo>;
  hasPermission(token: string, permission: string): Promise<boolean>;
  
  // User Management
  getUser(token: string): Promise<User>;
  updateUser(token: string, updates: Partial<User>): Promise<User>;
}

export interface Credentials {
  username?: string;
  password?: string;
  apiKey?: string;
  type: "password" | 'apiKey' | 'oauth';
}

export interface AuthResult {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface TokenInfo {
  valid: boolean;
  expiresAt: Date;
  user: User;
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, any>;
}

// Session Manager Interface
export interface ISessionManager {
  // Session lifecycle
  createSession(agentId: string, options?: SessionOptions): Promise<Session>;
  loadSession(sessionId: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Session queries
  listSessions(agentId?: string): Promise<SessionInfo[]>;
  getActiveSessionCount(): number;
  
  // Session cleanup
  cleanupExpiredSessions(): Promise<number>;
}

export interface Session {
  id: string;
  agentId: string;
  created: Date;
  updated: Date;
  expires?: Date;
  messages: Message[];
  context: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SessionOptions {
  expiresIn?: number;
  persistent?: boolean;
  initialContext?: Record<string, any>;
}

export interface SessionInfo {
  id: string;
  agentId: string;
  created: Date;
  updated: Date;
  messageCount: number;
  active: boolean;
}

export interface Message {
  id?: string;
  role: 'user' | "assistant" | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

// Permission Manager Interface
export interface IPermissionManager {
  // Permission checks
  checkPermission(operation: Operation, context: PermissionContext): Promise<boolean>;
  requestPermission(operation: Operation, reason: string): Promise<boolean>;
  
  // Dangerous mode
  enableDangerousMode(reason: string, duration?: number): Promise<void>;
  disableDangerousMode(): Promise<void>;
  isDangerousModeEnabled(): boolean;
  
  // Audit
  auditOperation(operation: Operation, result: any, context: PermissionContext): Promise<void>;
  getAuditLog(filter?: AuditFilter): Promise<AuditEntry[]>;
}

export interface Operation {
  type: 'read' | 'write' | 'execute' | 'delete' | 'admin';
  resource: string;
  action: string;
  params?: Record<string, any>;
}

export interface PermissionContext {
  user?: User;
  agent?: string;
  session?: string;
  environment?: string;
  metadata?: Record<string, any>;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  operation: Operation;
  result: 'success' | 'failure' | 'denied';
  context: PermissionContext;
  details?: any;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  user?: string;
  agent?: string;
  operation?: string;
  result?: 'success' | 'failure' | 'denied';
}