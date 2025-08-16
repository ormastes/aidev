/**
 * Utility functions for MCP LSP
 */

import { LSPServer, ServerConfig } from '../children/server';
import { LSPClient, ClientConfig } from '../children/client';
import { MCPProtocol, MCPMessage } from '../children/protocol';
import { Transport, TransportConfig, createTransport } from '../children/transport';

/**
 * Create an LSP server
 */
export function createServer(config: {
  transport: TransportConfig;
  capabilities?: any;
  name?: string;
  version?: string;
}): LSPServer {
  const transport = createTransport(config.transport);
  
  return new LSPServer({
    transport,
    options: {
      name: config.name,
      version: config.version,
      capabilities: config.capabilities,
    },
  });
}

/**
 * Create an LSP client
 */
export function createClient(config: {
  transport: TransportConfig;
  rootUri?: string;
  capabilities?: any;
  name?: string;
  version?: string;
}): LSPClient {
  const transport = createTransport(config.transport);
  
  return new LSPClient({
    transport,
    options: {
      name: config.name,
      version: config.version,
      rootUri: config.rootUri,
      capabilities: config.capabilities,
    },
  });
}

/**
 * Create a bidirectional connection
 */
export async function createConnection(config: {
  serverTransport: TransportConfig;
  clientTransport: TransportConfig;
}): Promise<{ server: LSPServer; client: LSPClient }> {
  const server = createServer({ transport: config.serverTransport });
  const client = createClient({ transport: config.clientTransport });
  
  await server.start();
  await client.connect();
  
  return { server, client };
}

/**
 * Parse an LSP message
 */
export function parseMessage(data: string | Buffer): MCPMessage {
  const protocol = new MCPProtocol();
  return protocol.parse(data);
}

/**
 * Format an LSP message
 */
export function formatMessage(message: MCPMessage): string {
  const protocol = new MCPProtocol();
  return protocol.format(message);
}

/**
 * Validate protocol compatibility
 */
export function validateProtocol(
  clientVersion: string,
  serverVersion: string
): boolean {
  // Simple version check - can be enhanced
  const clientMajor = parseInt(clientVersion.split('.')[0], 10);
  const serverMajor = parseInt(serverVersion.split('.')[0], 10);
  
  return clientMajor === serverMajor;
}

/**
 * Create a message ID
 */
export function createMessageId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Extract method from message
 */
export function getMessageMethod(message: MCPMessage): string | undefined {
  if ('method' in message) {
    return (message as any).method;
  }
  return undefined;
}

/**
 * Check if message is a request
 */
export function isRequest(message: MCPMessage): boolean {
  return message.type === 'request';
}

/**
 * Check if message is a response
 */
export function isResponse(message: MCPMessage): boolean {
  return message.type === "response";
}

/**
 * Check if message is a notification
 */
export function isNotification(message: MCPMessage): boolean {
  return message.type === "notification";
}

/**
 * Check if message has an error
 */
export function hasError(message: MCPMessage): boolean {
  return message.type === "response" && 'error' in message;
}

/**
 * Create a range from two positions
 */
export function createRange(
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number
) {
  return {
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
  };
}

/**
 * Create a location
 */
export function createLocation(uri: string, range: any) {
  return { uri, range };
}

/**
 * Convert offset to position in text
 */
export function offsetToPosition(text: string, offset: number) {
  const lines = text.substring(0, offset).split('\n');
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}

/**
 * Convert position to offset in text
 */
export function positionToOffset(text: string, position: { line: number; character: number }) {
  const lines = text.split('\n');
  let offset = 0;
  
  for (let i = 0; i < position.line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  if (position.line < lines.length) {
    offset += Math.min(position.character, lines[position.line].length);
  }
  
  return offset;
}

/**
 * Apply text edits to a document
 */
export function applyTextEdits(
  text: string,
  edits: Array<{ range: any; newText: string }>
): string {
  // Sort edits by position (reverse order to maintain offsets)
  const sortedEdits = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });
  
  let result = text;
  
  for (const edit of sortedEdits) {
    const startOffset = positionToOffset(result, edit.range.start);
    const endOffset = positionToOffset(result, edit.range.end);
    
    result = 
      result.substring(0, startOffset) +
      edit.newText +
      result.substring(endOffset);
  }
  
  return result;
}

/**
 * Debounce function for diagnostics
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Create a completion item
 */
export function createCompletionItem(config: {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}) {
  return {
    label: config.label,
    kind: config.kind,
    detail: config.detail,
    documentation: config.documentation,
    insertText: config.insertText || config.label,
    sortText: config.sortText || config.label,
  };
}

/**
 * Create a diagnostic
 */
export function createDiagnostic(config: {
  range: any;
  message: string;
  severity?: number;
  code?: string | number;
  source?: string;
}) {
  return {
    range: config.range,
    message: config.message,
    severity: config.severity || 2, // Warning by default
    code: config.code,
    source: config.source,
  };
}

export default {
  createServer,
  createClient,
  createConnection,
  parseMessage,
  formatMessage,
  validateProtocol,
  createMessageId,
  getMessageMethod,
  isRequest,
  isResponse,
  isNotification,
  hasError,
  createRange,
  createLocation,
  offsetToPosition,
  positionToOffset,
  applyTextEdits,
  debounce,
  createCompletionItem,
  createDiagnostic,
};