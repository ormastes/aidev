# Model Context Protocol (MCP) Research

## Overview
The Model Context Protocol (MCP) is a protocol for connecting AI models with external data sources and tools. Claude Code uses MCP servers to extend its capabilities, particularly for file system operations.

## MCP Core Concepts

### 1. MCP Server Architecture
- **Server**: Provides resources, tools, and prompts to clients
- **Client**: AI model or application that connects to MCP servers
- **Resources**: Static or dynamic content that servers provide
- **Tools**: Functions that clients can call on servers
- **Prompts**: Templated messages that servers can provide

### 2. Protocol Transport
- **Standard Transport**: JSON-RPC over stdio
- **Alternative Transports**: HTTP, WebSocket (future)
- **Message Types**: Requests, responses, notifications

### 3. Resource Types
- **File Resources**: Direct file access with MIME type detection
- **Directory Resources**: Directory listing and structure
- **Dynamic Resources**: Generated content based on parameters

## Claude Code Filesystem MCP Features

### Core Filesystem Operations
1. **File Reading**: Read file contents with encoding support
2. **File Writing**: Write/update file contents
3. **Directory Operations**: List, create, navigate directories
4. **Path Resolution**: Working on relative and absolute paths
5. **File Search**: Pattern-based file discovery
6. **File Metadata**: Size, timestamps, permissions

### Extended Features
1. **Git Integration**: Repository status, diff, commit operations
2. **Project Structure**: Understand project hierarchies
3. **Template Operations**: File/directory templates
4. **Batch Operations**: Multiple file operations
5. **Watch Operations**: File system change monitoring

### Security Features
1. **Path Validation**: Prevent directory traversal
2. **Access Control**: Restricted file access patterns
3. **Sandboxing**: Limit operations to project directories
4. **Permission Checks**: Validate file/directory permissions

## MCP Protocol Specification

### Message Format
```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "method_name",
  "params": {
    // method-specific parameters
  }
}
```

### Standard Methods

#### Server Initialization
- `initialize`: Initialize server connection
- `initialized`: Confirm initialization In Progress

#### Resource Management
- `resources/list`: List available resources
- `resources/read`: Read resource content
- `resources/subscribe`: Subscribe to resource changes

#### Tool Management
- `tools/list`: List available tools
- `tools/call`: Execute a tool

#### Prompt Management
- `prompts/list`: List available prompts
- `prompts/get`: Get prompt template

### Error Handling
- **Standard Errors**: Invalid request, method not found, invalid params
- **Custom Errors**: Application-specific error codes
- **Error Propagation**: Proper error message formatting

## Implementation Requirements

### 1. Core MCP Class Features
```typescript
interface MCPCore {
  // Server lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Resource operations
  listResources(): Promise<Resource[]>;
  readResource(uri: string): Promise<string>;
  
  // Tool operations
  listTools(): Promise<Tool[]>;
  callTool(name: string, params: any): Promise<any>;
  
  // File system operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<FileInfo[]>;
  
  // Enhanced operations
  searchFiles(pattern: string): Promise<string[]>;
  watchFiles(pattern: string): Promise<void>;
}
```

### 2. Entity System Integration
- **task_queue**: Map to MCP tool calls for queue operations
- **id_name**: Map to MCP resources for ID-name mappings
- **file_struct**: Map to MCP file system operations

### 3. Protocol Compliance
- **JSON-RPC 2.0**: Strict message format compliance
- **Standard Methods**: Implement all required MCP methods
- **Error Handling**: Proper error response formatting
- **Capabilities**: Advertise server capabilities correctly

### 4. Performance Considerations
- **Caching**: Cache frequently accessed resources
- **Streaming**: Support streaming for large files
- **Batch Operations**: Group related operations
- **Async Operations**: Non-blocking operation handling

## Security Considerations

### Path Security
- Validate all file paths to prevent directory traversal
- Restrict access to allowed directories only
- Check file permissions before operations

### Data Validation
- Validate all input parameters using Zod schemas
- Sanitize file paths and content
- Implement rate limiting for operations

### Error Information
- Avoid exposing sensitive path information in errors
- Log security violations for monitoring
- Provide generic error messages to clients

---
**Research Date**: 2025-07-19
**Sources**: MCP Specification, Claude Code documentation, TypeScript best practices
