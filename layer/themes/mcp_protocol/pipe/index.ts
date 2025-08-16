/**
 * MCP Protocol - Gateway
 * Model Context Protocol implementation for inter-component communication
 */

export { MCPManager } from '../children/manager';
export { MessageHandler } from '../children/messages';
export { Transport } from '../children/transport';
export { SchemaValidator } from '../children/schema';
export { MessageRouter } from '../children/router';

// Export types
export type {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MessageType,
  ProtocolVersion
} from '../children/messages';

export type {
  TransportType,
  TransportConfig,
  Connection,
  ConnectionState,
  TransportEvent
} from '../children/transport';

export type {
  Schema,
  SchemaDefinition,
  ValidationResult,
  SchemaRegistry,
  TypeDefinition
} from '../children/schema';

export type {
  Route,
  RouteHandler,
  RouterConfig,
  MiddlewareFunction,
  RouteMatch
} from '../children/router';

export type {
  MCPConfig,
  MCPSession,
  MCPCapability,
  ProtocolOptions,
  HandshakeData
} from '../children/manager';

// Export constants
export const MCP_CONSTANTS = {
  VERSION: '1.0.0',
  DEFAULT_PORT: 3456,
  DEFAULT_TIMEOUT: 30000,
  MAX_MESSAGE_SIZE: 10 * 1024 * 1024, // 10MB
  PROTOCOLS: ['mcp', 'mcp-ws', 'mcp-http'],
  CONTENT_TYPES: ['application/json', 'application/mcp+json']
};

// Export utilities
export { createMCPServer, createMCPClient, validateMessage, routeMessage } from './utils';