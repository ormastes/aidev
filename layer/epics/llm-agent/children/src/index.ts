/**
 * LLM Agent Epic - Main entry point
 */

// Export all interfaces
export * from '../xlib/interfaces/base.interfaces';
export * from '../xlib/interfaces/infrastructure.interfaces';

// Export base classes
export * from '../xlib/base';

// Export infrastructure components
export * from './infrastructure';

// Version
export const VERSION = '1.0.0';

// Theme configuration
export const THEME_CONFIG = {
  name: 'llm-agent',
  version: VERSION,
  description: 'Unified LLM Agent ecosystem with common interfaces',
  author: 'AI Dev Platform',
  
  // Default ports
  ports: {
    eventBus: 9000,
    authService: 9001,
    coordinatorApi: 9002,
    agentRegistry: 9003
  },
  
  // Component configuration
  components: {
    eventBus: {
      enabled: true,
      persistent: true
    },
    authService: {
      enabled: true,
      tokenExpiry: 3600000, // 1 hour
      refreshTokenExpiry: 604800000 // 7 days
    },
    sessionManager: {
      enabled: true,
      autoSave: true,
      sessionPath: './sessions',
      maxMessageHistory: 1000
    },
    permissionManager: {
      enabled: true,
      maxAuditEntries: 10000
    }
  }
};