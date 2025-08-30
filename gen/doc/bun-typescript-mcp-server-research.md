# Bun + TypeScript MCP Server Implementation Research

## Executive Summary

This document outlines a modern approach to implementing MCP (Model Context Protocol) servers using Bun and TypeScript without any JavaScript compilation step. The approach leverages Bun's native TypeScript support and the official MCP SDK's dual transport capabilities (stdio and Streamable HTTP).

## Key Features

### 1. No Build Step Required
- Bun executes TypeScript files directly (`.ts` files)
- No transpilation to JavaScript needed
- Simplifies development workflow

### 2. Dual Transport Support
- **stdio mode**: Used by Claude Desktop/Code applications
- **HTTP mode**: Used for remote agents and web applications
- Single codebase serves both transport modes

### 3. Technology Stack
- **Runtime**: Bun (latest version)
- **Language**: TypeScript (ES2022 target)
- **SDK**: @modelcontextprotocol/sdk
- **Schema Validation**: Zod
- **HTTP Server**: Express (for HTTP mode)

## Implementation Architecture

### Setup Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "types": ["bun-types"]
  }
}
```

### Core Components

#### 1. Server Definition (`src/server.ts`)
- Centralized MCP server creation
- Tool registration (e.g., sum, run commands)
- Resource management
- Leverages Bun-specific features (e.g., `Bun.spawn`)

#### 2. Dual-Mode Entry Point (`src/main.ts`)
- Mode selection based on CLI arguments
- stdio transport for local development
- HTTP transport with security features:
  - Origin validation
  - DNS rebinding protection
  - Session management support

### Transport Modes

#### stdio Mode
- Direct process communication
- Used by Claude Desktop/Code
- Blocks on stdio (no stdout writes allowed)
- Command: `bun run src/main.ts stdio`

#### HTTP Mode (Streamable HTTP)
- RESTful endpoint (`/mcp`)
- Supports both stateless and session-based operations
- Security features:
  - Origin checking (`MCP_ALLOW_ORIGIN`)
  - Localhost binding for development
  - CORS headers management
- Command: `bun run src/main.ts http`

### Security Considerations

1. **Origin Validation**
   - Strict checking against allowed origins
   - Environment-based configuration

2. **DNS Rebinding Protection**
   - Enabled by default for local development
   - Prevents external access to localhost services

3. **Session Management**
   - Optional session support with UUID generation
   - Proper cleanup on connection close

## Advantages Over Current Implementation

### Current Implementation Issues
- Requires TypeScript compilation step
- Separate Node.js and Bun entry points
- Complex build configuration

### New Approach Benefits
1. **Simplified Development**: Direct TypeScript execution
2. **Unified Codebase**: Single entry point for both modes
3. **Better Performance**: Bun's faster startup and execution
4. **Modern Features**: Native async/await, ESM modules
5. **Reduced Dependencies**: No build tools required

## Migration Strategy

### Phase 1: Setup
1. Install Bun runtime
2. Update package.json with Bun dependencies
3. Configure TypeScript for Bun

### Phase 2: Core Implementation
1. Create unified server definition
2. Implement dual-mode entry point
3. Maintain backward compatibility with existing tools

### Phase 3: Testing
1. Test stdio mode with Claude applications
2. Verify HTTP mode security features
3. Performance benchmarking

### Phase 4: Deployment
1. Update documentation
2. Create migration scripts
3. Gradual rollout

## Implementation Example

### Minimal Working Server
```typescript
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createServer() {
  const server = new McpServer({
    name: "bun-mcp-multi",
    version: "0.1.0",
  });

  // Register tools
  server.registerTool("sum", {
    inputSchema: { a: z.number(), b: z.number() },
  }, async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }));

  return server;
}
```

## Future Enhancements

1. **Pure Bun.serve Implementation**
   - Replace Express with native Bun HTTP server
   - Further performance improvements

2. **Enhanced Session Store**
   - Persistent session management
   - Redis/SQLite integration

3. **WebSocket Support**
   - Real-time bidirectional communication
   - Lower latency for interactive tools

4. **Clustering**
   - Multi-core utilization
   - Load balancing for high-traffic scenarios

## Conclusion

The Bun + TypeScript approach represents a significant modernization of the MCP server implementation, offering:
- Simplified development workflow
- Better performance characteristics
- Unified codebase for multiple transport modes
- Native TypeScript support without compilation

This approach aligns with modern JavaScript ecosystem trends and provides a solid foundation for future enhancements while maintaining compatibility with existing MCP clients.

## References

- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh)
- [TypeScript ESM Configuration](https://www.typescriptlang.org/docs/handbook/esm-node.html)