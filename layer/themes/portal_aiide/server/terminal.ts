/**
 * Terminal WebSocket Handler
 * Manages terminal sessions via WebSocket connections
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { Server } from '../utils/http-wrapper';
import { os } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  ws: WebSocket;
  cwd: string;
}

export class TerminalManager {
  private wss: WebSocketServer;
  private sessions: Map<string, TerminalSession> = new Map();
  private shell: string;

  constructor(server: Server) {
    // Determine shell based on platform
    this.shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
    
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: '/terminal'
    });

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log('New terminal connection established');
      
      let session: TerminalSession | null = null;

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'init':
              session = this.createTerminalSession(ws, message);
              break;
              
            case 'input':
              if (session) {
                session.pty.write(message.data);
              }
              break;
              
            case 'resize':
              if (session && message.cols && message.rows) {
                session.pty.resize(message.cols, message.rows);
              }
              break;
              
            case 'kill':
              if (session) {
                this.killSession(session.id);
              }
              break;
          }
        } catch (error) {
          console.error('Terminal message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            data: 'Failed to process message'
          }));
        }
      });

      ws.on('close', () => {
        console.log('Terminal connection closed');
        if (session) {
          this.killSession(session.id);
        }
      });

      ws.on('error', (error) => {
        console.error('Terminal WebSocket error:', error);
        if (session) {
          this.killSession(session.id);
        }
      });
    });
  }

  private createTerminalSession(ws: WebSocket, config: any): TerminalSession {
    const sessionId = `term-${Date.now()}`;
    const cwd = config.cwd || process.cwd();
    
    // Create pseudo-terminal
    const ptyProcess = pty.spawn(this.shell, [], {
      name: 'xterm-256color',
      cols: config.cols || 80,
      rows: config.rows || 24,
      cwd: cwd,
      env: {
        ...process.env,
        COLORTERM: "truecolor",
        TERM: 'xterm-256color'
      }
    });

    // Handle PTY output
    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          data: data
        }));
      }
    });

    // Handle PTY exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal process exited: code=${exitCode}, signal=${signal}`);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'exit',
          exitCode,
          signal
        }));
        ws.close();
      }
      
      this.sessions.delete(sessionId);
    });

    // Create session
    const session: TerminalSession = {
      id: sessionId,
      pty: ptyProcess,
      ws,
      cwd
    };

    this.sessions.set(sessionId, session);
    
    // Send initialization success
    ws.send(JSON.stringify({
      type: "initialized",
      sessionId,
      shell: this.shell
    }));

    return session;
  }

  private killSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.pty.kill();
      } catch (error) {
        console.error('Error killing terminal process:', error);
      }
      
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }
      
      this.sessions.delete(sessionId);
    }
  }

  public killAllSessions() {
    this.sessions.forEach((session) => {
      this.killSession(session.id);
    });
  }

  public getSessionCount(): number {
    return this.sessions.size;
  }

  public getSessions(): Array<{ id: string; cwd: string }> {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      cwd: session.cwd
    }));
  }
}

// Export factory function
export function setupTerminalWebSocket(server: Server): TerminalManager {
  return new TerminalManager(server);
}