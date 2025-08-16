/**
 * AIIDE Pipe - Cross-layer communication gateway
 * Exports public APIs for the AI Integrated Development Environment
 */

// Export main components
export { AIIDEApp } from '../children/AIIDEApp';
export { ChatSpace } from '../children/components/ChatSpace/ChatSpace';
export { FileExplorer } from '../children/components/FileExplorer/FileExplorer';
export { CodeEditor } from '../children/components/CodeEditor/CodeEditor';

// Export stores
export { useChatStore } from '../children/stores/chatStore';
export { useFileStore } from '../children/stores/fileStore';
export { useLayoutStore } from '../children/stores/layoutStore';

// Export services
export { ChatService } from '../children/services/ChatService';
export { FileService } from '../children/services/FileService';
export { ProviderService } from '../children/services/ProviderService';

// Export types
export type {
  ChatSession,
  ChatMessage,
  LLMProvider,
  FileNode,
  OpenFile,
  LayoutConfig,
  Settings
} from '../children/types';

// Export utilities
export { 
  getFileSize as formatFileSize,
  getFileExtension,
  getFileLanguage as getLanguageFromExtension 
} from '../children/utils/fileUtils';

export {
  estimateTokens,
  truncateToTokenLimit
} from '../children/utils/tokenUtils';

// Export constants
export const AIIDE_VERSION = '1.0.0';
export const DEFAULT_PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude',
    type: 'claude' as const,
    config: {
      apiKey: '',
      model: 'claude-3-sonnet',
    },
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    enabled: true,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama' as const,
    config: {
      endpoint: 'http://localhost:11434',
      model: 'llama2',
    },
    models: ['llama2', 'codellama', 'mistral'],
    enabled: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek R1',
    type: 'deepseek' as const,
    config: {
      apiKey: '',
      model: 'deepseek-coder',
    },
    models: ['deepseek-coder', 'deepseek-chat'],
    enabled: true,
  }
];

// Export configuration
export const AIIDE_CONFIG = {
  defaultTheme: 'dark' as const,
  defaultLayout: 'ide' as const,
  autoSave: true,
  autoSaveDelay: 1000,
  maxChatHistory: 100,
  maxOpenFiles: 20,
  enableTelemetry: false
};

// Public API for AIIDE
export class AIIDE {
  private static instance: AIIDE;
  
  private constructor() {}
  
  public static getInstance(): AIIDE {
    if (!AIIDE.instance) {
      AIIDE.instance = new AIIDE();
    }
    return AIIDE.instance;
  }
  
  /**
   * Initialize AIIDE with configuration
   */
  public async initialize(config?: Partial<typeof AIIDE_CONFIG>): Promise<void> {
    // Merge config with defaults
    const finalConfig = { ...AIIDE_CONFIG, ...config };
    
    // Initialize stores
    await this.initializeStores(finalConfig);
    
    // Initialize services
    await this.initializeServices(finalConfig);
  }
  
  /**
   * Open a file in the editor
   */
  public async openFile(path: string): Promise<void> {
    const fileStore = useFileStore.getState();
    await fileStore.openFile(path);
  }
  
  /**
   * Create a new chat session
   */
  public createChatSession(provider?: LLMProvider): string {
    const chatStore = useChatStore.getState();
    return chatStore.createSession({ provider });
  }
  
  /**
   * Send a message to the active chat
   */
  public async sendMessage(content: string, sessionId?: string): Promise<void> {
    const chatStore = useChatStore.getState();
    const targetSession = sessionId || chatStore.activeSessionId;
    
    if (!targetSession) {
      throw new Error('No active chat session');
    }
    
    await chatStore.sendMessage(targetSession, {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    });
  }
  
  /**
   * Get current state snapshot
   */
  public getState() {
    return {
      chat: useChatStore.getState(),
      files: useFileStore.getState(),
      layout: useLayoutStore.getState()
    };
  }
  
  private async initializeStores(config: typeof AIIDE_CONFIG): Promise<void> {
    // Initialize stores with config
    // This would be implemented based on your store setup
  }
  
  private async initializeServices(config: typeof AIIDE_CONFIG): Promise<void> {
    // Initialize services with config
    // This would be implemented based on your service setup
  }
}

// Export singleton instance
export const aiide = AIIDE.getInstance();