# Bun + TypeScript MCP Server Migration

## Overview

This document describes the migration to a modern Bun + TypeScript based MCP server implementation that requires no build step and supports both stdio and HTTP transports.

## Key Changes

### 1. Direct TypeScript Execution
- No compilation step required
- Bun executes `.ts` files directly
- Faster development iteration

### 2. Unified Server Architecture
- Single server definition (`src/unified-server.ts`)
- Shared between all transport modes
- Consistent tool implementation

### 3. Multi-Transport Support
- **stdio**: For Claude Desktop/Code integration
- **http**: Full session management with SSE support
- **stateless-http**: Simple request/response without sessions

## File Structure

```
src/
├── unified-server.ts    # Core MCP server definition
├── main.ts              # Multi-mode entry point
├── mcp-bun.ts          # Legacy Bun entry (kept for compatibility)
└── MCPServer.ts        # Original implementation (preserved)
```

## Quick Start

### Install Dependencies

```bash
bun install
```

### Run in Different Modes

#### stdio Mode (Claude Desktop/Code)
```bash
bun run dev:stdio
# or
bun run src/main.ts stdio
```

#### HTTP Mode (with sessions)
```bash
bun run dev:http
# or
PORT=3457 MCP_ALLOW_ORIGIN=http://localhost bun run src/main.ts http
```

#### Stateless HTTP Mode
```bash
bun run dev:stateless
# or
bun run src/main.ts stateless-http
```

## Environment Variables

- `VF_BASE_PATH`: Base directory for VF files (default: current directory)
- `PORT`: HTTP server port (default: 3457)
- `MCP_ALLOW_ORIGIN`: Comma-separated list of allowed origins (default: http://localhost)

## Available Tools

### 1. read_vf_file
Read a `.vf.json` file from the filesystem.

### 2. write_vf_file
Write content to a `.vf.json` file with automatic metadata management.

### 3. list_vf_files
List all `.vf.json` files in a directory (with recursive option).

### 4. delete_vf_file
Delete a `.vf.json` file.

### 5. run_command (Bun only)
Execute system commands using Bun.spawn for better performance.

## Security Features

### Path Traversal Protection
All file operations validate paths to prevent directory traversal attacks.

### Origin Validation (HTTP mode)
Strict checking of request origins against allowed list.

### DNS Rebinding Protection
Enabled by default for local development.

### File Extension Enforcement
Only `.vf.json` files can be accessed/modified.

## HTTP Endpoints

### `/mcp` (POST/GET)
Main MCP protocol endpoint.

### `/health` (GET)
Health check endpoint returning:
- Server status
- Runtime version
- Active sessions count

### `/sessions` (GET)
Debug endpoint showing active session information.

## Migration Notes

### From Node.js
1. Replace `node` commands with `bun`
2. No need to compile TypeScript
3. Better performance and faster startup

### From Previous MCP Implementation
1. Update client configurations to use new endpoints
2. Session management now built-in for HTTP mode
3. Improved error handling and logging

## Testing

### Unit Tests
```bash
bun test
```

### Integration Testing
```bash
# Start server in HTTP mode
bun run dev:http

# In another terminal, test with curl
curl -X POST http://localhost:3457/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

## Performance Improvements

### Bun Advantages
- 4x faster startup than Node.js
- Native TypeScript execution
- Built-in hot reload support
- Optimized file I/O operations

### Memory Usage
- Lower memory footprint
- Efficient garbage collection
- Native streaming support

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3457
# Change port via environment variable
PORT=3458 bun run dev:http
```

#### Permission Denied
```bash
# Ensure script is executable
chmod +x src/main.ts
```

#### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

## Future Enhancements

1. **WebSocket Support**: Real-time bidirectional communication
2. **Clustering**: Multi-core utilization for high load
3. **Persistent Sessions**: Redis/SQLite backed session storage
4. **Rate Limiting**: Protection against abuse
5. **Metrics Collection**: Prometheus/Grafana integration

## Compatibility

### Runtime Requirements
- Bun 1.0+ (recommended: latest)
- Node.js 18+ (fallback support)

### Client Compatibility
- Claude Desktop: ✅ (stdio mode)
- Claude Code: ✅ (stdio mode)
- Web Applications: ✅ (HTTP modes)
- Remote Agents: ✅ (HTTP modes)

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh)
- [Research Document](../../gen/doc/bun-typescript-mcp-server-research.md)