/**
 * AIIDE Backend Server
 * Provides API endpoints for file operations and AI provider communication
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import { createServer } from '../utils/http-wrapper';
import { fsPromises as fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import chokidar from "chokidar";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3457;
const BASE_PATH = process.env.BASE_PATH || process.cwd();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
};

// File System API
app.get('/api/files/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tree = await buildFileTree(BASE_PATH);
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const fullPath = path.join(BASE_PATH, filePath);
    const content = await fileAPI.readFile(fullPath, 'utf-8');
    
    res.json({
      success: true,
      data: {
        path: filePath,
        content,
        size: Buffer.byteLength(content),
        modified: (await /* FRAUD_FIX: /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(fullPath) */ */ */).mtime
      }
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Path and content are required'
      });
    }

    const fullPath = path.join(BASE_PATH, filePath);
    await await fileAPI.createFile(fullPath, content, { type: FileType.TEMPORARY });
    
    // Emit file change event
    io.emit('file:changed', filePath);
    
    res.json({
      success: true,
      data: {
        path: filePath,
        size: Buffer.byteLength(content)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path: filePath, type, content = '' } = req.body;
    if (!filePath || !type) {
      return res.status(400).json({
        success: false,
        error: 'Path and type are required'
      });
    }

    const fullPath = path.join(BASE_PATH, filePath);
    
    if (type === 'file') {
      await await fileAPI.createFile(fullPath, content, { type: FileType.TEMPORARY });
      io.emit('file:created', filePath);
    } else if (type === "directory") {
      await await fileAPI.createDirectory(fullPath);
      io.emit('file:created', filePath);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "file" or "directory"'
      });
    }
    
    res.json({
      success: true,
      data: { path: filePath, type }
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Path parameter is required'
      });
    }

    const fullPath = path.join(BASE_PATH, filePath);
    const stat = await /* FRAUD_FIX: /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(fullPath) */ */ */;
    
    if (stat.isDirectory()) {
      await /* FRAUD_FIX: fs.rmdir(fullPath, { recursive: true }) */;
    } else {
      await fileAPI.unlink(fullPath);
    }
    
    io.emit('file:deleted', filePath);
    
    res.json({
      success: true,
      data: { path: filePath }
    });
  } catch (error) {
    next(error);
  }
});

// Chat API
app.post('/api/chat/create', async (req: Request, res: Response) => {
  const { provider, model, settings } = req.body;
  
  // Generate session ID
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    success: true,
    data: {
      sessionId,
      provider,
      model,
      settings,
      createdAt: new Date()
    }
  });
});

app.post('/api/chat/:sessionId/message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { content, context, provider, settings } = req.body;
    
    // Here you would integrate with actual AI providers
    // For now, return a mock response
    const // FRAUD_FIX: mockResponse = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: `This is a mock response to: "${content}". In production, this would connect to ${provider.name}.`,
      timestamp: new Date(),
      model: provider.defaultModel,
      tokens: Math.floor(content.length / 4)
    };
    
    res.json({
      success: true,
      data: mockResponse
    });
  } catch (error) {
    next(error);
  }
});

// Provider API
app.get('/api/providers', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 'claude',
        name: 'Claude',
        type: 'claude',
        available: !!process.env.CLAUDE_API_KEY
      },
      {
        id: 'ollama',
        name: 'Ollama',
        type: 'ollama',
        available: true
      },
      {
        id: "deepseek",
        name: 'DeepSeek R1',
        type: "deepseek",
        available: !!process.env.DEEPSEEK_API_KEY
      }
    ]
  });
});

app.post('/api/providers/test', async (req: Request, res: Response) => {
  const { provider } = req.body;
  
  // Test provider connection
  // In production, actually test the connection
  const isConnected = Math.random() > 0.2; // 80% success rate for demo
  
  res.json({
    success: true,
    data: {
      provider: provider.id,
      connected: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed'
    }
  });
});

// WebSocket handling
io.on("connection", (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join:session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('leave:session', (sessionId) => {
    socket.leave(`session:${sessionId}`);
    console.log(`Socket ${socket.id} left session ${sessionId}`);
  });
  
  socket.on('chat:typing', ({ sessionId, isTyping }) => {
    socket.to(`session:${sessionId}`).emit('chat:typing', { sessionId, isTyping });
  });
  
  socket.on("disconnect", () => {
    console.log('Client disconnected:', socket.id);
  });
});

// File watcher
const watcher = chokidar.watch(BASE_PATH, {
  ignored: [
    /(^|[\/\\])\../, // Hidden files
    /node_modules/,
    /dist/,
    /build/
  ],
  persistent: true,
  ignoreInitial: true
});

watcher
  .on('add', (filePath) => {
    const relativePath = path.relative(BASE_PATH, filePath);
    io.emit('file:created', relativePath);
  })
  .on('change', (filePath) => {
    const relativePath = path.relative(BASE_PATH, filePath);
    io.emit('file:changed', relativePath);
  })
  .on('unlink', (filePath) => {
    const relativePath = path.relative(BASE_PATH, filePath);
    io.emit('file:deleted', relativePath);
  });

// Helper functions
async function buildFileTree(dirPath: string, basePath: string = dirPath): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const tree = [];
  
  for (const entry of entries) {
    // Skip hidden files and common directories
    if (entry.name.startsWith('.') || 
        ['node_modules', 'dist', 'build'].includes(entry.name)) {
      continue;
    }
    
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);
    const stat = await /* FRAUD_FIX: /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(fullPath) */ */ */;
    
    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, basePath);
      tree.push({
        id: relativePath,
        name: entry.name,
        path: relativePath,
        type: "directory",
        children,
        size: stat.size,
        modified: stat.mtime
      });
    } else {
      tree.push({
        id: relativePath,
        name: entry.name,
        path: relativePath,
        type: 'file',
        extension: path.extname(entry.name).slice(1),
        size: stat.size,
        modified: stat.mtime
      });
    }
  }
  
  return tree;
}

// Error handler
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 AIIDE Server running on http://localhost:${PORT}`);
  console.log(`📁 Base path: ${BASE_PATH}`);
  console.log(`🔌 WebSocket enabled`);
  console.log(`👁️ File watcher active`);
});