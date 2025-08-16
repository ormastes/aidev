import express, { Express, Request, Response } from 'express';
import { Server as HTTPServer } from '../utils/http-wrapper';
import { Server as SocketIOServer } from 'socket.io';
import { ChatSpace, ChatMessage } from './ChatSpace';
import { ChatSpaceMCPBridge } from './mcp/ChatSpaceMCPBridge';
import cors from 'cors';
import { path } from '../../infra_external-log-lib/src';

export interface ChatSpaceServerConfig {
  port?: number;
  mcpServerUrl?: string;
  enableMCP?: boolean;
  corsOrigin?: string | string[];
}

/**
 * Chat Space Server with Socket.IO and MCP integration
 */
export class ChatSpaceServer {
  private app: Express;
  private server: HTTPServer;
  private io: SocketIOServer;
  private chatSpace: ChatSpace;
  private mcpBridge?: ChatSpaceMCPBridge;
  private config: ChatSpaceServerConfig;
  private port: number;

  constructor(config: ChatSpaceServerConfig = {}) {
    this.config = config;
    this.port = config.port || 3456;
    
    // Initialize Express app
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors({
      origin: config.corsOrigin || '*'
    }));

    // Create HTTP server
    this.server = new HTTPServer(this.app);

    // Initialize Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.corsOrigin || '*',
        methods: ['GET', 'POST']
      }
    });

    // Initialize ChatSpace
    this.chatSpace = new ChatSpace({
      name: 'Main Chat Space',
      description: 'AI Development Platform Chat Space with MCP Integration',
      allowCommands: true
    });

    // Initialize MCP Bridge if enabled
    if (config.enableMCP !== false) {
      this.mcpBridge = new ChatSpaceMCPBridge(
        this.chatSpace,
        config.mcpServerUrl
      );
    }

    // Setup routes and Socket.IO handlers
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupChatSpaceHandlers();
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        chatSpace: this.chatSpace.getInfo(),
        mcp: {
          enabled: !!this.mcpBridge,
          connected: this.mcpBridge?.mcpClient?.isConnected() || false
        }
      });
    });

    // Get chat info
    this.app.get('/api/info', (req: Request, res: Response) => {
      res.json(this.chatSpace.getInfo());
    });

    // Get messages
    this.app.get('/api/messages/:spaceId', (req: Request, res: Response) => {
      const { spaceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const messages = this.chatSpace.getMessages(spaceId, limit);
      res.json(messages);
    });

    // Send message via REST
    this.app.post('/api/messages', async (req: Request, res: Response) => {
      try {
        const { userId, userName, spaceId, content } = req.body;
        
        if (!userId || !spaceId || !content) {
          return res.status(400).json({
            error: 'Missing required fields: userId, spaceId, content'
          });
        }

        const message = await this.chatSpace.sendMessage({
          userId,
          userName,
          spaceId,
          content
        });

        res.json(message);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // MCP status
    this.app.get('/api/mcp/status', (req: Request, res: Response) => {
      if (!this.mcpBridge) {
        return res.json({ enabled: false });
      }

      res.json({
        enabled: true,
        connected: this.mcpBridge.mcpClient?.isConnected() || false,
        serverUrl: this.config.mcpServerUrl || 'ws://localhost:8080'
      });
    });

    // MCP tools
    this.app.get('/api/mcp/tools', async (req: Request, res: Response) => {
      if (!this.mcpBridge || !this.mcpBridge.mcpClient?.isConnected()) {
        return res.status(503).json({ error: 'MCP not connected' });
      }

      try {
        const tools = await this.mcpBridge.mcpClient.listTools();
        res.json(tools);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve static files (if UI exists)
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  /**
   * Setup Socket.IO handlers
   */
  private setupSocketHandlers(): void {
    this.io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle join space
      socket.on('join_space', (data: { userId: string; spaceId: string }) => {
        const { userId, spaceId } = data;
        socket.join(spaceId);
        this.chatSpace.joinSpace(userId, spaceId);
        
        // Send recent messages
        const messages = this.chatSpace.getMessages(spaceId, 50);
        socket.emit('messages_history', messages);
        
        // Notify others
        socket.to(spaceId).emit('user_joined', { userId, spaceId });
      });

      // Handle leave space
      socket.on('leave_space', (data: { userId: string; spaceId: string }) => {
        const { userId, spaceId } = data;
        socket.leave(spaceId);
        this.chatSpace.leaveSpace(userId, spaceId);
        
        // Notify others
        socket.to(spaceId).emit('user_left', { userId, spaceId });
      });

      // Handle send message
      socket.on('send_message', async (data: {
        userId: string;
        userName?: string;
        spaceId: string;
        content: string;
      }) => {
        try {
          const message = await this.chatSpace.sendMessage(data);
          
          // Broadcast to all users in the space
          this.io.to(data.spaceId).emit('new_message', message);
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      // Handle typing indicator
      socket.on('typing', (data: { userId: string; spaceId: string; isTyping: boolean }) => {
        socket.to(data.spaceId).emit('user_typing', data);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });

      // MCP-specific events
      if (this.mcpBridge) {
        // Handle MCP command
        socket.on('mcp_command', async (data: {
          command: string;
          args: any;
          userId: string;
          spaceId: string;
        }) => {
          try {
            const result = await this.handleMCPCommand(data);
            socket.emit('mcp_response', result);
          } catch (error: any) {
            socket.emit('mcp_error', { error: error.message });
          }
        });

        // Handle MCP connection
        socket.on('mcp_connect', async (data: { serverUrl?: string }) => {
          try {
            if (data.serverUrl) {
              // Reconnect to different server
              await this.reconnectMCP(data.serverUrl);
            }
            
            const status = {
              connected: this.mcpBridge!.mcpClient?.isConnected() || false,
              serverUrl: this.config.mcpServerUrl
            };
            
            socket.emit('mcp_status', status);
          } catch (error: any) {
            socket.emit('mcp_error', { error: error.message });
          }
        });
      }
    });
  }

  /**
   * Setup ChatSpace event handlers
   */
  private setupChatSpaceHandlers(): void {
    // Forward chat space events to Socket.IO
    this.chatSpace.on('message', (message: ChatMessage) => {
      this.io.to(message.spaceId).emit('new_message', message);
    });

    this.chatSpace.on('command_executed', (data: any) => {
      console.log('Command executed:', data.command);
    });

    this.chatSpace.on('user_joined', (data: any) => {
      this.io.to(data.spaceId).emit('user_joined', data);
    });

    this.chatSpace.on('user_left', (data: any) => {
      this.io.to(data.spaceId).emit('user_left', data);
    });

    // MCP Bridge events
    if (this.mcpBridge) {
      this.mcpBridge.on('mcp_connected', () => {
        console.log('MCP Bridge connected');
        this.io.emit('mcp_status', { connected: true });
      });

      this.mcpBridge.on('mcp_disconnected', () => {
        console.log('MCP Bridge disconnected');
        this.io.emit('mcp_status', { connected: false });
      });

      this.mcpBridge.on('error', (error: Error) => {
        console.error('MCP Bridge error:', error);
      });
    }
  }

  /**
   * Handle MCP command
   */
  private async handleMCPCommand(data: {
    command: string;
    args: any;
    userId: string;
    spaceId: string;
  }): Promise<any> {
    if (!this.mcpBridge || !this.mcpBridge.mcpClient?.isConnected()) {
      throw new Error('MCP not connected');
    }

    // Execute MCP command through bridge
    const message = await this.chatSpace.sendMessage({
      userId: data.userId,
      spaceId: data.spaceId,
      content: `${data.command} ${JSON.stringify(data.args)}`
    });

    return message;
  }

  /**
   * Reconnect MCP to different server
   */
  private async reconnectMCP(serverUrl: string): Promise<void> {
    if (this.mcpBridge) {
      this.mcpBridge.shutdown();
    }

    this.config.mcpServerUrl = serverUrl;
    this.mcpBridge = new ChatSpaceMCPBridge(this.chatSpace, serverUrl);
    await this.mcpBridge.initialize();
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Initialize MCP Bridge if configured
    if (this.mcpBridge) {
      try {
        await this.mcpBridge.initialize();
        console.log('MCP Bridge initialized');
      } catch (error: any) {
        console.error('Failed to initialize MCP Bridge:', error.message);
        console.log('Chat Space will run without MCP integration');
        // Don't let MCP failure stop the server
        this.mcpBridge = undefined;
      }
    }

    // Start HTTP server
    this.server.listen(this.port, () => {
      console.log(`Chat Space Server running on http://localhost:${this.port}`);
      console.log(`MCP Integration: ${this.mcpBridge ? 'Enabled' : "Disabled"}`);
      
      if (this.mcpBridge) {
        console.log(`MCP Server: ${this.config.mcpServerUrl || 'ws://localhost:8080'}`);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    // Shutdown MCP Bridge
    if (this.mcpBridge) {
      this.mcpBridge.shutdown();
    }

    // Shutdown ChatSpace
    this.chatSpace.shutdown();

    // Close Socket.IO
    this.io.close();

    // Close HTTP server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Chat Space Server stopped');
        resolve();
      });
    });
  }
}