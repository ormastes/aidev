/**
 * MCP LSP Integration - Main Export
 * Gateway for Model Context Protocol with Language Server Protocol
 */

// Server components
export { LSPServer } from '../children/server';
export type { 
  ServerConfig,
  ServerOptions,
  ServerCapabilities,
  ServerStatus 
} from '../children/server';

// Client components
export { LSPClient } from '../children/client';
export type { 
  ClientConfig,
  ClientOptions,
  ClientCapabilities,
  ConnectionState 
} from '../children/client';

// Protocol handlers
export { MCPProtocol } from '../children/protocol';
export type { 
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  ProtocolVersion 
} from '../children/protocol';

// Transport layer
export { Transport } from '../children/transport';
export type { 
  TransportType,
  TransportConfig,
  StdioTransport,
  WebSocketTransport,
  TCPTransport 
} from '../children/transport';

// Language features
export { LanguageFeatures } from '../children/features';
export type { 
  CompletionProvider,
  HoverProvider,
  DiagnosticsProvider,
  DefinitionProvider,
  ReferencesProvider,
  DocumentSymbolProvider,
  CodeActionProvider,
  FormattingProvider 
} from '../children/features';

// Utilities
export {
  createServer,
  createClient,
  createConnection,
  parseMessage,
  formatMessage,
  validateProtocol
} from '../utils';

// Constants
export const PROTOCOL_VERSION = '1.0.0';

export const MESSAGE_TYPES = {
  REQUEST: 'request',
  RESPONSE: "response",
  NOTIFICATION: "notification",
  ERROR: 'error',
} as const;

export const METHODS = {
  // Lifecycle
  INITIALIZE: "initialize",
  INITIALIZED: "initialized",
  SHUTDOWN: "shutdown",
  EXIT: 'exit',
  
  // Document synchronization
  DID_OPEN: 'textDocument/didOpen',
  DID_CHANGE: 'textDocument/didChange',
  DID_SAVE: 'textDocument/didSave',
  DID_CLOSE: 'textDocument/didClose',
  
  // Language features
  COMPLETION: 'textDocument/completion',
  HOVER: 'textDocument/hover',
  DEFINITION: 'textDocument/definition',
  REFERENCES: 'textDocument/references',
  DOCUMENT_SYMBOL: 'textDocument/documentSymbol',
  CODE_ACTION: 'textDocument/codeAction',
  FORMATTING: 'textDocument/formatting',
  
  // MCP specific
  MODEL_REQUEST: 'model/request',
  MODEL_RESPONSE: 'model/response',
  CONTEXT_UPDATE: 'context/update',
  CAPABILITY_QUERY: 'capability/query',
} as const;

// Version
export const VERSION = '1.0.0';

// Default export
const MCPLSP = {
  LSPServer,
  LSPClient,
  MCPProtocol,
  Transport,
  LanguageFeatures,
  PROTOCOL_VERSION,
  MESSAGE_TYPES,
  METHODS,
  VERSION,
};

export default MCPLSP;