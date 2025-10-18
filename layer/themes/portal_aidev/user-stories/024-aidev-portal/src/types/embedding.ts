/**
 * Embedding Infrastructure Types
 * Defines interfaces for portal embedding system
 */

export interface EmbeddedServiceConfig {
  id: string;
  name: string;
  url: string;
  port: number;
  icon?: string;
  description?: string;
  healthEndpoint?: string;
  features?: string[];
}

export interface EmbeddingOptions {
  sandbox?: string[];
  allowFullscreen?: boolean;
  allowPayment?: boolean;
  allowAutoplay?: boolean;
  csp?: string;
}

export enum ServiceStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  UNLOADED = 'unloaded'
}

export interface MessagePayload {
  type: string;
  data?: any;
  source?: string;
  timestamp?: number;
}

export interface AuthTokenMessage extends MessagePayload {
  type: 'AUTH_TOKEN';
  data: {
    token: string;
    sessionId: string;
    userId: string;
    username: string;
  };
}

export interface ReadyMessage extends MessagePayload {
  type: 'READY';
  data: {
    serviceId: string;
    version?: string;
  };
}

export interface ErrorMessage extends MessagePayload {
  type: 'ERROR';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ReloadMessage extends MessagePayload {
  type: 'RELOAD';
}

export interface NavigateMessage extends MessagePayload {
  type: 'NAVIGATE';
  data: {
    path: string;
  };
}

export type EmbeddingMessage =
  | AuthTokenMessage
  | ReadyMessage
  | ErrorMessage
  | ReloadMessage
  | NavigateMessage
  | MessagePayload;

export interface EmbeddedServiceState {
  id: string;
  status: ServiceStatus;
  iframe: HTMLIFrameElement | null;
  lastError?: string;
  loadTime?: number;
  ready: boolean;
}

export interface MessageHandler {
  (message: EmbeddingMessage, serviceId: string): void | Promise<void>;
}

export interface EmbeddingManagerInterface {
  // Lifecycle
  embedService(serviceId: string, config: EmbeddedServiceConfig, container: HTMLElement): Promise<void>;
  unembedService(serviceId: string): Promise<void>;
  reloadService(serviceId: string): Promise<void>;

  // Communication
  sendMessage(serviceId: string, message: EmbeddingMessage): void;
  onMessage(type: string, handler: MessageHandler): void;

  // Authentication
  forwardAuthToken(serviceId: string, token: string, sessionId: string, userId: string, username: string): Promise<void>;

  // State
  listEmbeddedServices(): string[];
  getServiceStatus(serviceId: string): ServiceStatus;
  getServiceState(serviceId: string): EmbeddedServiceState | null;

  // Health
  checkServiceHealth(serviceId: string): Promise<boolean>;
}

export const DEFAULT_SANDBOX_PERMISSIONS = [
  'allow-same-origin',
  'allow-scripts',
  'allow-forms',
  'allow-popups',
  'allow-modals'
];

export const TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3456',
  'http://localhost:3457'
];
