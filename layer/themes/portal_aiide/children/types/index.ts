/**
 * AIIDE Type Definitions
 * Core types and interfaces for the AI Integrated Development Environment
 */

// Chat related types
export interface ChatSession {
  id: string;
  title: string;
  provider: LLMProvider;
  messages: ChatMessage[];
  context: ContextItem[];
  createdAt: Date;
  updatedAt: Date;
  settings: ChatSettings;
}

export interface ChatMessage {
  id: string;
  role: 'user' | "assistant" | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  model?: string;
  attachments?: Attachment[];
}

export interface LLMProvider {
  id: string;
  name: string;
  type: 'claude' | 'ollama' | "deepseek" | 'openai' | 'custom';
  endpoint?: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  capabilities: ProviderCapabilities;
}

export interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  maxTokens: number;
  contextWindow: number;
}

export interface ChatSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

// File system types
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | "directory";
  children?: FileNode[];
  size?: number;
  modified?: Date;
  extension?: string;
  gitStatus?: GitStatus;
  permissions?: FilePermissions;
}

export interface OpenFile {
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
  cursor?: CursorPosition;
  selections?: Selection[];
}

export interface GitStatus {
  status: "modified" | 'added' | 'deleted' | 'renamed' | "untracked";
  staged: boolean;
}

export interface FilePermissions {
  read: boolean;
  write: boolean;
  execute: boolean;
}

// Editor types
export interface EditorState {
  activeFile: string | null;
  openFiles: OpenFile[];
  recentFiles: string[];
  breakpoints: Breakpoint[];
  bookmarks: Bookmark[];
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface Breakpoint {
  file: string;
  line: number;
  condition?: string;
  enabled: boolean;
}

export interface Bookmark {
  file: string;
  line: number;
  label?: string;
}

// Context management types
export interface ContextItem {
  id: string;
  type: 'file' | 'code' | 'url' | 'text';
  name: string;
  content: string;
  metadata?: Record<string, any>;
  tokens?: number;
}

export interface ContextTemplate {
  id: string;
  name: string;
  description: string;
  items: ContextItem[];
  tags: string[];
}

// Layout types
export interface LayoutConfig {
  id: string;
  name: string;
  panels: PanelConfig[];
  isDefault: boolean;
}

export interface PanelConfig {
  id: string;
  type: 'file-explorer' | 'editor' | 'chat' | "terminal" | 'context' | 'preview';
  position: PanelPosition;
  size: PanelSize;
  visible: boolean;
  collapsed: boolean;
}

export interface PanelPosition {
  x: number;
  y: number;
  z: number;
}

export interface PanelSize {
  width: number | string;
  height: number | string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

// UI State types
export interface UIState {
  theme: 'light' | 'dark' | 'high-contrast' | 'custom';
  fontSize: number;
  fontFamily: string;
  showLineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  breadcrumbs: boolean;
  statusBar: boolean;
}

// Settings types
export interface Settings {
  general: GeneralSettings;
  editor: EditorSettings;
  chat: ChatDefaultSettings;
  appearance: UIState;
  shortcuts: KeyboardShortcuts;
  extensions: ExtensionSettings;
}

export interface GeneralSettings {
  autoSave: boolean;
  autoSaveDelay: number;
  confirmDelete: boolean;
  telemetry: boolean;
  language: string;
}

export interface EditorSettings {
  tabSize: number;
  insertSpaces: boolean;
  formatOnSave: boolean;
  formatOnPaste: boolean;
  autoClosingBrackets: boolean;
  autoIndent: boolean;
  suggestOnTriggerCharacters: boolean;
}

export interface ChatDefaultSettings {
  defaultProvider: string;
  streamResponses: boolean;
  saveHistory: boolean;
  maxHistoryItems: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

export interface KeyboardShortcuts {
  [command: string]: string | string[];
}

export interface ExtensionSettings {
  enabled: string[];
  disabled: string[];
  config: Record<string, any>;
}

// Attachment types
export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'code';
  name: string;
  size: number;
  mimeType?: string;
  url?: string;
  content?: string;
}

// Command types
export interface Command {
  id: string;
  label: string;
  description?: string;
  category: string;
  keybinding?: string;
  handler: () => void | Promise<void>;
  when?: () => boolean;
}

// WebSocket event types
export interface SocketEvents {
  // Chat events
  'chat:message': (message: ChatMessage) => void;
  'chat:typing': (sessionId: string, isTyping: boolean) => void;
  'chat:error': (error: Error) => void;
  
  // File events
  'file:changed': (path: string) => void;
  'file:created': (path: string) => void;
  'file:deleted': (path: string) => void;
  'file:renamed': (oldPath: string, newPath: string) => void;
  
  // Collaboration events
  'collab:join': (userId: string, userName: string) => void;
  'collab:leave': (userId: string) => void;
  'collab:cursor': (userId: string, position: CursorPosition) => void;
  'collab:selection': (userId: string, selection: Selection) => void;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

// Export all types
export type * from './providers';
export type * from './components';