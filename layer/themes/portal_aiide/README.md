# AIIDE - AI Integrated Development Environment

A web-based AI-powered development environment with multi-provider chat support, file explorer, and code editing capabilities.

## Features

- **Multi-Provider AI Chat**: Support for Claude (Anthropic), Ollama (local), DeepSeek R1, and OpenAI
- **File Explorer**: Browse, create, edit, and delete files
- **Code Editor**: Monaco-based editor with syntax highlighting
- **Multiple Layouts**: IDE, Chat-only, and Split views
- **Real-time Collaboration**: WebSocket-based updates
- **Context Management**: Add files and code snippets to chat context
- **Theme Support**: Light and dark themes

## Installation

```bash
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure API keys in `.env`:
- `CLAUDE_API_KEY`: Your Anthropic API key
- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `OPENAI_API_KEY`: Your OpenAI API key (optional)
- `OLLAMA_ENDPOINT`: Local Ollama endpoint (default: http://localhost:11434)

## Running the Application

### Development Mode

Start both frontend and backend:
```bash
npm start
```

Or run them separately:

Frontend (Vite dev server):
```bash
npm run dev
```

Backend (Express server):
```bash
npm run server
```

### Production Mode

Build the application:
```bash
npm run build
```

Run in production:
```bash
npm run start:prod
```

### Docker

Build and run with Docker:
```bash
npm run docker:build
npm run docker:run
```

## Accessing the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3457
- **API Documentation**: http://localhost:3457/api-docs

## Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:unit       # Unit tests
npm run test:integration # Integration tests
npm run test:system     # System tests (Playwright)
npm run test:coverage   # With coverage report
```

## Project Structure

```
portal_aiide/
├── children/           # React components and frontend code
│   ├── components/     # UI components
│   ├── services/       # API services
│   ├── stores/         # State management (Zustand)
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── server/             # Express backend
├── tests/              # Test files
├── pipe/               # Public API exports
└── scripts/            # Build and deployment scripts
```

## API Endpoints

### Chat
- `POST /api/chat/:sessionId/message` - Send message
- `GET /api/chat/sessions` - List sessions
- `DELETE /api/chat/sessions/:id` - Delete session

### Files
- `GET /api/files/tree` - Get file tree
- `GET /api/files/read` - Read file content
- `POST /api/files/write` - Write file
- `POST /api/files/create` - Create file/directory
- `DELETE /api/files/delete` - Delete file
- `POST /api/files/rename` - Rename file

### Providers
- `GET /api/providers` - List available providers
- `GET /api/providers/:id/status` - Check provider status
- `GET /api/providers/:id/models` - Get available models

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
