# AIIDE API Documentation

Base URL: `http://localhost:3457`

## Authentication

Currently, the API does not require authentication. In production, implement JWT or API key authentication.

## Endpoints

### Health Check

#### `GET /api/health`

Check if the server is running and healthy.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 12345
}
```

---

### Providers

#### `GET /api/providers`

Get list of available AI providers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "claude",
      "name": "Claude",
      "type": "claude",
      "available": true
    },
    {
      "id": "ollama",
      "name": "Ollama",
      "type": "ollama",
      "available": true
    }
  ]
}
```

#### `GET /api/providers/:id/status`

Check specific provider status.

**Parameters:**
- `id` (path): Provider ID

**Response:**
```json
{
  "available": true,
  "message": "Provider is operational",
  "lastChecked": "2024-01-15T10:00:00.000Z"
}
```

#### `GET /api/providers/:id/models`

Get available models for a provider.

**Parameters:**
- `id` (path): Provider ID

**Response:**
```json
{
  "success": true,
  "models": [
    "claude-3-opus",
    "claude-3-sonnet",
    "claude-3-haiku"
  ]
}
```

---

### Chat

#### `POST /api/chat/:sessionId/message`

Send a message to a chat session.

**Parameters:**
- `sessionId` (path): Chat session ID

**Request Body:**
```json
{
  "content": "Hello, AI!",
  "context": [
    {
      "id": "ctx-1",
      "type": "file",
      "name": "example.js",
      "content": "// code here"
    }
  ],
  "provider": "claude",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 4096
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg-123",
    "role": "assistant",
    "content": "Hello! How can I help you today?",
    "timestamp": "2024-01-15T10:00:00.000Z",
    "provider": "claude",
    "model": "claude-3-sonnet",
    "usage": {
      "promptTokens": 10,
      "completionTokens": 15,
      "totalTokens": 25
    }
  }
}
```

#### `GET /api/chat/sessions`

Get all chat sessions.

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-1",
      "name": "Project Discussion",
      "provider": "claude",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "messages": 10
    }
  ]
}
```

#### `GET /api/chat/sessions/:id`

Get specific chat session with messages.

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session-1",
    "name": "Project Discussion",
    "provider": "claude",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Hello"
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "Hi there!"
      }
    ]
  }
}
```

#### `DELETE /api/chat/sessions/:id`

Delete a chat session.

**Parameters:**
- `id` (path): Session ID

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

### Files

#### `GET /api/files/tree`

Get file tree structure.

**Query Parameters:**
- `path` (optional): Base path (default: workspace)

**Response:**
```json
{
  "name": "workspace",
  "path": "/workspace",
  "type": "directory",
  "children": [
    {
      "name": "example.js",
      "path": "/workspace/example.js",
      "type": "file",
      "size": 1024,
      "modified": "2024-01-15T10:00:00.000Z"
    },
    {
      "name": "src",
      "path": "/workspace/src",
      "type": "directory",
      "children": []
    }
  ]
}
```

#### `GET /api/files/read`

Read file content.

**Query Parameters:**
- `path`: File path

**Response:**
```json
{
  "success": true,
  "content": "console.log('Hello World');",
  "path": "/workspace/example.js",
  "encoding": "utf8"
}
```

#### `POST /api/files/write`

Write content to file.

**Request Body:**
```json
{
  "path": "/workspace/example.js",
  "content": "console.log('Updated content');"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File saved",
  "path": "/workspace/example.js"
}
```

#### `POST /api/files/create`

Create new file or directory.

**Request Body:**
```json
{
  "path": "/workspace/newfile.js",
  "type": "file",
  "content": "// Initial content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File created",
  "path": "/workspace/newfile.js"
}
```

#### `DELETE /api/files/delete`

Delete file or directory.

**Query Parameters:**
- `path`: File/directory path

**Response:**
```json
{
  "success": true,
  "message": "File deleted"
}
```

#### `POST /api/files/rename`

Rename file or directory.

**Request Body:**
```json
{
  "oldPath": "/workspace/old.js",
  "newPath": "/workspace/new.js"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File renamed"
}
```

#### `GET /api/files/search`

Search files by name or content.

**Query Parameters:**
- `query`: Search query
- `path` (optional): Base path

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "name": "example.js",
      "path": "/workspace/example.js",
      "type": "file",
      "matches": [
        {
          "line": 5,
          "content": "function example() {"
        }
      ]
    }
  ]
}
```

#### `GET /api/files/info`

Get detailed file information.

**Query Parameters:**
- `path`: File path

**Response:**
```json
{
  "success": true,
  "info": {
    "name": "example.js",
    "path": "/workspace/example.js",
    "size": 1024,
    "created": "2024-01-15T09:00:00.000Z",
    "modified": "2024-01-15T10:00:00.000Z",
    "type": "file",
    "mimeType": "application/javascript",
    "permissions": "rw-r--r--"
  }
}
```

---

## WebSocket Events

Connect to WebSocket at `ws://localhost:3457`

### Events from Server

#### `file:changed`
```json
{
  "type": "file:changed",
  "data": {
    "path": "/workspace/example.js",
    "action": "modified"
  }
}
```

#### `file:created`
```json
{
  "type": "file:created",
  "data": {
    "path": "/workspace/new.js"
  }
}
```

#### `file:deleted`
```json
{
  "type": "file:deleted",
  "data": {
    "path": "/workspace/old.js"
  }
}
```

#### `chat:message`
```json
{
  "type": "chat:message",
  "data": {
    "sessionId": "session-1",
    "message": {
      "id": "msg-123",
      "role": "assistant",
      "content": "Response from AI"
    }
  }
}
```

### Events to Server

#### `subscribe:files`
```json
{
  "type": "subscribe:files",
  "data": {
    "path": "/workspace"
  }
}
```

#### `subscribe:chat`
```json
{
  "type": "subscribe:chat",
  "data": {
    "sessionId": "session-1"
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "The requested file does not exist",
    "details": {
      "path": "/workspace/missing.js"
    }
  }
}
```

### Common Error Codes

- `INVALID_REQUEST`: Missing or invalid parameters
- `FILE_NOT_FOUND`: File or directory doesn't exist
- `FILE_EXISTS`: File already exists
- `PERMISSION_DENIED`: Insufficient permissions
- `PROVIDER_ERROR`: AI provider error
- `RATE_LIMIT`: Rate limit exceeded
- `SERVER_ERROR`: Internal server error

---

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Headers returned:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## CORS

CORS is enabled for development. Configure allowed origins in production:

```javascript
{
  origin: ['http://localhost:5173'],
  credentials: true
}
```

---

## Examples

### Create and Send Chat Message

```bash
# Create session
SESSION_ID="session-$(date +%s)"

# Send message
curl -X POST "http://localhost:3457/api/chat/$SESSION_ID/message" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain async/await in JavaScript",
    "provider": "claude"
  }'
```

### Upload and Read File

```bash
# Create file
curl -X POST "http://localhost:3457/api/files/create" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/workspace/test.js",
    "type": "file",
    "content": "console.log(\"test\");"
  }'

# Read file
curl "http://localhost:3457/api/files/read?path=/workspace/test.js"
```

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3457');

ws.on('open', () => {
  // Subscribe to file changes
  ws.send(JSON.stringify({
    type: 'subscribe:files',
    data: { path: '/workspace' }
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Event:', event);
});
```