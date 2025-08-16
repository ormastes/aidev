/**
 * Terminal WebSocket Server
 * Streams terminal output to web UI
 */

import { Server } from 'socket.io';
import { spawn, ChildProcess } from 'child_process';
import * as pty from 'node-pty';
import express from 'express';
import { http } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

interface TerminalSession {
  id: string;
  process: any; // PTY process
  output: string[];
  active: boolean;
}

export class TerminalServer {
  private app: express.Application;
  private server: http.Server;
  private io: Server;
  private sessions: Map<string, TerminalSession> = new Map();
  private port: number;

  constructor(port: number = 3457) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: ['http://localhost:3456', 'http://localhost:3356', 'http://localhost:3256'],
        methods: ['GET', 'POST']
      }
    });

    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    // Serve static files for terminal emulator
    this.app.use(express.static(path.join(__dirname, 'public')));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        sessions: this.sessions.size,
        uptime: process.uptime()
      });
    });

    // Get active sessions
    this.app.get('/sessions', (req, res) => {
      const sessionList = Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        active: session.active,
        outputLines: session.output.length
      }));
      res.json(sessionList);
    });
  }

  private setupWebSocket(): void {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Create new terminal session
      socket.on('create-session', (options: any) => {
        const sessionId = this.createTerminalSession(socket, options);
        socket.emit('session-created', { sessionId });
      });

      // Attach to existing session
      socket.on('attach-session', (sessionId: string) => {
        this.attachToSession(socket, sessionId);
      });

      // Send input to terminal
      socket.on('terminal-input', (data: { sessionId: string; input: string }) => {
        const session = this.sessions.get(data.sessionId);
        if (session && session.process) {
          session.process.write(data.input);
        }
      });

      // Resize terminal
      socket.on('terminal-resize', (data: { sessionId: string; cols: number; rows: number }) => {
        const session = this.sessions.get(data.sessionId);
        if (session && session.process) {
          session.process.resize(data.cols, data.rows);
        }
      });

      // Close session
      socket.on('close-session', (sessionId: string) => {
        this.closeSession(sessionId);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private createTerminalSession(socket: any, options: any = {}): string {
    const sessionId = `session-${Date.now()}`;
    
    // Create PTY process for text GUI app
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: process.cwd(),
      env: process.env
    });

    const session: TerminalSession = {
      id: sessionId,
      process: ptyProcess,
      output: [],
      active: true
    };

    // Handle PTY output
    ptyProcess.onData((data: string) => {
      session.output.push(data);
      
      // Limit output buffer
      if (session.output.length > 1000) {
        session.output = session.output.slice(-500);
      }

      // Send to connected clients
      socket.emit('terminal-output', {
        sessionId,
        data
      });
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      session.active = false;
      socket.emit('session-closed', {
        sessionId,
        exitCode,
        signal
      });
    });

    this.sessions.set(sessionId, session);

    // Automatically start the text GUI app
    if (options.autoStart) {
      setTimeout(() => {
        ptyProcess.write('bunx tsx ./src/text-gui/cli.tsx\r');
      }, 100);
    }

    return sessionId;
  }

  private attachToSession(socket: any, sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // Send buffered output
    socket.emit('terminal-output', {
      sessionId,
      data: session.output.join('')
    });

    // Forward future output
    if (session.process) {
      session.process.onData((data: string) => {
        socket.emit('terminal-output', {
          sessionId,
          data
        });
      });
    }
  }

  private closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.process) {
        session.process.kill();
      }
      this.sessions.delete(sessionId);
    }
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`Terminal server running on port ${this.port}`);
      console.log(`WebSocket endpoint: ws://localhost:${this.port}`);
    });
  }

  public stop(): void {
    // Close all sessions
    for (const [sessionId] of this.sessions) {
      this.closeSession(sessionId);
    }

    this.server.close();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new TerminalServer(3457);
  server.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down terminal server...');
    server.stop();
    process.exit(0);
  });
}