/**
 * Room Configuration Schema
 * Defines the structure for configuring chat rooms with different coordinator agents
 */

export interface RoomConfig {
  /** Room identifier */
  id: string;
  
  /** Room display name */
  name?: string;
  
  /** Room description */
  description?: string;
  
  /** Server configuration */
  server?: ServerConfig;
  
  /** Coordinator agent configuration */
  coordinator?: CoordinatorConfig;
  
  /** Client configuration */
  client?: ClientConfig;
  
  /** Room rules and permissions */
  rules?: RoomRules;
  
  /** Advanced settings */
  advanced?: AdvancedConfig;
}

export interface ServerConfig {
  /** WebSocket server port */
  port?: number;
  
  /** Host address */
  host?: string;
  
  /** Enable TLS/SSL */
  secure?: boolean;
  
  /** Maximum clients per room */
  maxClients?: number;
  
  /** Message history size */
  historySize?: number;
  
  /** Connection timeout in ms */
  connectionTimeout?: number;
}

export interface CoordinatorConfig {
  /** Coordinator agent type */
  type: CoordinatorType;
  
  /** Agent display name */
  name?: string;
  
  /** Enable coordinator */
  enabled?: boolean;
  
  /** Agent-specific configuration */
  config?: ClaudeConfig | OllamaConfig | CustomConfig;
  
  /** Response behavior */
  behavior?: CoordinatorBehavior;
  
  /** Authentication configuration */
  auth?: AuthConfig;
}

export enum CoordinatorType {
  CLAUDE = 'claude',
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  CUSTOM = 'custom',
  NONE = 'none'
}

export interface ClaudeConfig {
  /** Claude model to use */
  model?: string;
  
  /** API endpoint override */
  apiEndpoint?: string;
  
  /** Max tokens in response */
  maxTokens?: number;
  
  /** Temperature (0-1) */
  temperature?: number;
  
  /** System prompt override */
  systemPrompt?: string;
}

export interface OllamaConfig {
  /** Ollama model name (e.g., 'deepseek-r1:latest') */
  model: string;
  
  /** Ollama server URL */
  serverUrl?: string;
  
  /** Model parameters */
  parameters?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
  
  /** Enable streaming responses */
  streaming?: boolean;
  
  /** Model context size */
  contextSize?: number;
}

export interface CustomConfig {
  /** Custom agent implementation path */
  implementationPath: string;
  
  /** Custom configuration object */
  customConfig?: Record<string, any>;
}

export interface CoordinatorBehavior {
  /** Auto-respond to mentions */
  respondToMentions?: boolean;
  
  /** Auto-respond to questions */
  respondToQuestions?: boolean;
  
  /** Response delay range in ms */
  responseDelay?: {
    min: number;
    max: number;
  };
  
  /** Typing indicator */
  showTypingIndicator?: boolean;
  
  /** Maximum conversation context */
  maxContextMessages?: number;
  
  /** Agent actions enabled */
  enabledActions?: AgentAction[];
}

export enum AgentAction {
  SUMMARIZE = 'summarize',
  MODERATE = 'moderate',
  ANALYZE = 'analyze',
  HELP = 'help',
  CLEAR = 'clear',
  TRANSLATE = 'translate',
  CODE_REVIEW = 'code_review',
  EXPLAIN = 'explain'
}

export interface AuthConfig {
  /** Authentication method */
  method?: AuthMethod;
  
  /** API key source */
  apiKeySource?: ApiKeySource;
  
  /** Custom auth provider */
  customAuthProvider?: string;
}

export enum AuthMethod {
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  SESSION = 'session',
  LOCAL_SHARED = 'local_shared',
  NONE = 'none'
}

export enum ApiKeySource {
  ENVIRONMENT = 'environment',
  CONFIG_FILE = 'config_file',
  SHARED_LOCAL = 'shared_local',
  PROMPT = 'prompt'
}

export interface ClientConfig {
  /** Default username prefix */
  usernamePrefix?: string;
  
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  
  /** Enable message encryption */
  encryption?: boolean;
}

export interface RoomRules {
  /** Allow guests (non-authenticated users) */
  allowGuests?: boolean;
  
  /** Require user authentication */
  requireAuth?: boolean;
  
  /** Message rate limiting */
  rateLimit?: {
    messages: number;
    window: number; // in seconds
  };
  
  /** Profanity filter */
  profanityFilter?: boolean;
  
  /** Maximum message length */
  maxMessageLength?: number;
  
  /** Allowed message types */
  allowedMessageTypes?: string[];
}

export interface AdvancedConfig {
  /** Enable message persistence */
  persistence?: {
    enabled: boolean;
    backend: 'memory' | 'file' | 'database';
    config?: Record<string, any>;
  };
  
  /** Webhook configuration */
  webhooks?: {
    onMessage?: string;
    onJoin?: string;
    onLeave?: string;
    onError?: string;
  };
  
  /** Monitoring and metrics */
  monitoring?: {
    enabled: boolean;
    metricsEndpoint?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
  
  /** Plugin system */
  plugins?: Array<{
    name: string;
    path: string;
    config?: Record<string, any>;
  }>;
}

/**
 * Example configurations
 */
export const exampleConfigs = {
  // Basic Claude configuration
  basicClaude: {
    id: 'general-chat',
    name: 'General Chat Room',
    coordinator: {
      type: CoordinatorType.CLAUDE,
      name: 'Claude Assistant',
      config: {
        model: 'claude-3-haiku-20240307',
        temperature: 0.7
      }
    }
  } as RoomConfig,
  
  // Ollama with DeepSeek R1
  ollamaDeepSeek: {
    id: 'coding-help',
    name: 'Coding Help Room',
    coordinator: {
      type: CoordinatorType.OLLAMA,
      name: 'DeepSeek Coder',
      config: {
        model: 'deepseek-r1:latest',
        serverUrl: 'http://localhost:11434',
        parameters: {
          temperature: 0.1,
          num_predict: 2048
        }
      } as OllamaConfig,
      behavior: {
        respondToMentions: true,
        respondToQuestions: true,
        enabledActions: [
          AgentAction.CODE_REVIEW,
          AgentAction.EXPLAIN,
          AgentAction.HELP
        ]
      }
    }
  } as RoomConfig,
  
  // All-in-one configuration
  allInOne: {
    id: 'demo-room',
    name: 'Demo Chat Room',
    server: {
      port: 3000,
      maxClients: 50,
      historySize: 100
    },
    coordinator: {
      type: CoordinatorType.CLAUDE,
      enabled: true,
      auth: {
        method: AuthMethod.LOCAL_SHARED,
        apiKeySource: ApiKeySource.SHARED_LOCAL
      }
    },
    client: {
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5
    },
    rules: {
      allowGuests: true,
      rateLimit: {
        messages: 10,
        window: 60
      },
      maxMessageLength: 1000
    }
  } as RoomConfig
};

/**
 * Configuration validation
 */
export function validateRoomConfig(config: any): config is RoomConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  if (!config.id || typeof config.id !== 'string') {
    return false;
  }
  
  if (config.coordinator) {
    if (!Object.values(CoordinatorType).includes(config.coordinator.type)) {
      return false;
    }
    
    if (config.coordinator.type === CoordinatorType.OLLAMA) {
      const ollamaConfig = config.coordinator.config as OllamaConfig;
      if (!ollamaConfig?.model) {
        return false;
      }
    }
    
    if (config.coordinator.type === CoordinatorType.CUSTOM) {
      const customConfig = config.coordinator.config as CustomConfig;
      if (!customConfig?.implementationPath) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Default configuration
 */
export const defaultRoomConfig: Partial<RoomConfig> = {
  server: {
    port: 3000,
    host: 'localhost',
    maxClients: 100,
    historySize: 50,
    connectionTimeout: 30000
  },
  coordinator: {
    type: CoordinatorType.NONE,
    enabled: false,
    behavior: {
      respondToMentions: true,
      respondToQuestions: true,
      responseDelay: {
        min: 500,
        max: 2000
      },
      showTypingIndicator: true,
      maxContextMessages: 50
    }
  },
  client: {
    autoReconnect: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5
  },
  rules: {
    allowGuests: true,
    profanityFilter: false,
    maxMessageLength: 5000
  }
};