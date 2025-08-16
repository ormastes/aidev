# Filesystem MCP (Model Context Protocol)

## Overview

The Filesystem MCP provides a standardized interface for managing virtual files (.vf.json) in the AI Development Platform. It offers both basic and enhanced servers with features like task queue management, feature tracking, and content validation.

## Installation

### Quick Setup

```bash
# Run the automated setup script
./setup-filesystem-mcp.sh
```

This will:
- Install Node.js dependencies
- Configure MCP servers
- Create Claude Desktop configuration
- Set up test files
- Validate the installation

### Manual Installation

```bash
# Install dependencies
npm install

# Make servers executable
chmod +x mcp-server.js mcp-server-enhanced.js

# Configure paths (edit mcp-config.json)
# Set VF_BASE_PATH to your project root
```

## Features

### Standard Server (`mcp-server.js`)
- Read/write .vf.json files
- List files in directories
- Delete virtual files
- Basic validation

### Enhanced Server (`mcp-server-enhanced.js`)
- All standard features plus:
- Task queue management (TASK_QUEUE.vf.json)
- Feature management (FEATURE.vf.json)
- Content search across files
- Metadata aggregation
- Strict validation mode
- Advanced querying

## Available Tools

### Basic Operations

#### `read_vf_file`
Read a virtual file (.vf.json)
```json
{
  "path": "path/to/file.vf.json"
}
```

#### `write_vf_file`
Write content to a virtual file
```json
{
  "path": "path/to/file.vf.json",
  "content": {
    "metadata": {...},
    "data": {...}
  },
  "validate": true
}
```

#### `list_vf_files`
List all .vf.json files in a directory
```json
{
  "directory": ".",
  "recursive": true,
  "filter": "TASK_*"
}
```

### Task Management (Enhanced Only)

#### `read_task_queue`
Read and analyze TASK_QUEUE.vf.json
```json
{}
```

#### `add_task`
Add a new task to the queue
```json
{
  "priority": "high",
  "task": {
    "id": "task-001",
    "type": "feature",
    "content": {...}
  }
}
```

#### `update_task_status`
Update task status
```json
{
  "taskId": "task-001",
  "status": "completed"
}
```

### Feature Management (Enhanced Only)

#### `read_features`
Read FEATURE.vf.json with statistics
```json
{}
```

#### `add_feature`
Add a new feature
```json
{
  "category": "infrastructure",
  "feature": {
    "id": "feat-001",
    "name": "New Feature",
    "data": {...}
  }
}
```

### Advanced Operations (Enhanced Only)

#### `search_vf_content`
Search across all .vf.json files
```json
{
  "query": "search term",
  "directory": ".",
  "fields": ["metadata.title", "content.description"]
}
```

#### `get_vf_metadata`
Get metadata for all virtual files
```json
{
  "directory": "."
}
```

#### `validate_vf_file`
Validate file structure and content
```json
{
  "path": "file.vf.json",
  "strict": true
}
```

## Configuration

### Environment Variables

```bash
# Base path for all file operations
VF_BASE_PATH=/home/user/project

# Enable strict validation mode
VF_STRICT_MODE=true

# Node environment
NODE_ENV=production
```

### Configuration File (mcp-config.json)

```json
{
  "mcpServers": {
    "filesystem-mcp": {
      "command": "node",
      "args": ["./mcp-server.js"],
      "env": {
        "VF_BASE_PATH": "/path/to/project"
      }
    }
  },
  "defaultServer": "filesystem-mcp-enhanced",
  "features": {
    "artifactValidation": true,
    "taskDependencyChecking": true
  }
}
```

## Virtual File Structure (.vf.json)

### Required Fields

```json
{
  "metadata": {
    "level": "root|layer|module|user",
    "path": "/relative/path/to/file.vf.json",
    "version": "1.0.0"
  }
}
```

### Recommended Fields

```json
{
  "metadata": {
    "created_at": "2025-08-14T12:00:00.000Z",
    "updated_at": "2025-08-14T12:00:00.000Z",
    "author": "username",
    "tags": ["tag1", "tag2"]
  },
  "content": {
    // Your actual data
  }
}
```

## Special Files

### TASK_QUEUE.vf.json
Manages project tasks with priority queues:
```json
{
  "taskQueues": {
    "critical": [],
    "high": [],
    "medium": [],
    "low": []
  }
}
```

### FEATURE.vf.json
Tracks project features by category:
```json
{
  "features": {
    "platform": [],
    "infrastructure": [],
    "tools": [],
    "themes": []
  }
}
```

### FILE_STRUCTURE.vf.json
Documents project file organization:
```json
{
  "structure": {
    "directories": {},
    "files": {}
  }
}
```

### NAME_ID.vf.json
Maps names to IDs for quick lookup:
```json
{
  "mappings": {
    "name": "id"
  }
}
```

## Usage Examples

### With Claude Desktop

Once configured, Claude will have access to the MCP tools automatically. You can use them in conversations:

```
"Please read the TASK_QUEUE.vf.json file"
"Add a new high-priority task for implementing user authentication"
"Search for all files containing 'security' in their metadata"
```

### Programmatic Usage

```javascript
// Start server programmatically
const { spawn } = require('child_process');

const mcp = spawn('node', ['mcp-server-enhanced.js'], {
  env: {
    ...process.env,
    VF_BASE_PATH: '/path/to/project'
  }
});

// Send commands via stdio
mcp.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: 'read_vf_file',
    arguments: {
      path: 'TASK_QUEUE.vf.json'
    }
  },
  id: 1
}));
```

### Command Line Testing

```bash
# Test server connection
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node mcp-server.js

# Read a file
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"read_vf_file","arguments":{"path":"test.vf.json"}},"id":2}' | node mcp-server.js
```

## Validation Rules

### Standard Mode
- Requires: metadata (level, path, version)
- Validates: JSON syntax
- Checks: File extension (.vf.json)

### Strict Mode (VF_STRICT_MODE=true)
- All standard checks plus:
- Requires: created_at, updated_at timestamps
- Validates: ISO 8601 date formats
- Checks: Semantic versioning
- Enforces: Consistent path references

## Error Handling

The MCP servers provide detailed error messages:

```json
{
  "success": false,
  "error": "File must have .vf.json extension"
}
```

Common errors:
- `File not found`: Path doesn't exist
- `Invalid JSON`: Malformed JSON syntax
- `Validation failed`: Content doesn't meet requirements
- `Permission denied`: Insufficient file permissions

## Performance

- **File Operations**: O(1) for single files
- **Directory Listing**: O(n) where n = number of files
- **Search**: O(n*m) where m = content size
- **Validation**: O(1) for basic, O(n) for deep validation

Optimizations:
- Async I/O for all file operations
- Streaming for large files
- Caching for frequently accessed files (planned)

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "validation"

# Coverage report
npm run test:coverage
```

### Adding New Tools

1. Edit the server file (mcp-server.js or mcp-server-enhanced.js)
2. Add tool definition in `setupHandlers()`
3. Implement handler method
4. Update documentation

Example:
```javascript
// In setupHandlers()
tools.push({
  name: 'my_new_tool',
  description: 'Does something new',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' }
    }
  }
});

// Handler method
async myNewTool({ param1 }) {
  // Implementation
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ success: true })
    }]
  };
}
```

## Troubleshooting

### Server won't start
- Check Node.js version (requires 18+)
- Verify dependencies: `npm install`
- Check file permissions

### Files not found
- Verify VF_BASE_PATH is correct
- Use relative paths from base path
- Ensure .vf.json extension

### Validation errors
- Check required metadata fields
- Validate JSON syntax
- Review strict mode requirements

### Claude Desktop integration issues
- Restart Claude after config changes
- Check config file location: `~/.config/claude/claude_desktop_config.json`
- Verify server paths are absolute

## Security

- File operations restricted to VF_BASE_PATH
- No execution of arbitrary code
- JSON validation prevents injection
- Path traversal protection enabled

## License

Part of the AI Development Platform project.

## Support

For issues or questions:
- Check this README
- Review example files in `examples/`
- Submit issues to the project repository

---
*Version: 2.0.0*
*Last Updated: 2025-08-14*