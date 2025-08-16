import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { 
  setupWebSecurity,
  AuthService,
  TokenService,
  SecurityConstants,
  User,
  NavigationHelper
} from '../../../web-security/pipe';

// Extend Request with user
interface AuthRequest extends Request {
  user?: User;
}

// Socket data
interface SocketData {
  userId: string;
  username: string;
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3300;
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: SecurityConstants.CORS.ALLOWED_ORIGINS,
    credentials: true
  }
});

// Basic middleware
app.use(express.json());
app.use(express.static('public'));

// Setup web security
const { authService, sessionManager, appRegistry } = setupWebSecurity(app, {
  requireAuth: false,
  enableRateLimit: true,
  authMiddlewareConfig: {
    loginPath: 'http://localhost:3400/login',
    publicPaths: ['/', '/health', '/api/auth/*']
  },
  sessionConfig: {
    cookieDomain: 'localhost',
    cookieName: SecurityConstants.SESSION.COOKIE_NAME
  }
});

// Initialize token service for WebSocket auth
const tokenService = new TokenService();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'Chat Space',
    port: PORT,
    activeConnections: io.engine.clientsCount
  });
});

// Get chat token for WebSocket authentication
app.get('/api/auth/chat-token', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: 'http://localhost:3400/login?returnUrl=http://localhost:3300'
    });
  }
  
  // Generate a token specifically for WebSocket
  const token = await tokenService.generateToken({
    userId: user.id,
    username: user.username,
    roles: user.roles
  }, {
    expiresIn: '4h' // Shorter expiry for chat sessions
  });
  
  res.json({ token });
});

// Chat rooms API
app.get('/api/rooms', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Return available chat rooms
  res.json({
    rooms: [
      { id: 'general', name: 'General', description: 'General discussion' },
      { id: 'dev', name: 'Development', description: 'Development topics' },
      { id: 'design', name: 'Design', description: 'Design discussions' },
      { id: 'support', name: 'Support', description: 'Get help here' }
    ]
  });
});

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    const payload = await tokenService.verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }
    
    // Attach user data to socket
    socket.data.userId = payload.userId;
    socket.data.username = payload.username;
    
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.data.username} connected`);
  
  // Join user to their personal room
  socket.join(`user:${socket.data.userId}`);
  
  // Handle joining rooms
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', {
      userId: socket.data.userId,
      username: socket.data.username,
      roomId
    });
  });
  
  // Handle leaving rooms
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', {
      userId: socket.data.userId,
      username: socket.data.username,
      roomId
    });
  });
  
  // Handle messages
  socket.on('message', (data: { roomId: string; message: string }) => {
    const messageData = {
      id: `msg-${Date.now()}`,
      userId: socket.data.userId,
      username: socket.data.username,
      message: data.message,
      timestamp: new Date(),
      roomId: data.roomId
    };
    
    // Send to room including sender
    io.to(data.roomId).emit('message', messageData);
  });
  
  // Handle typing indicators
  socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
    socket.to(data.roomId).emit('typing', {
      userId: socket.data.userId,
      username: socket.data.username,
      isTyping: data.isTyping
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.data.username} disconnected`);
    
    // Notify all rooms the user was in
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('user-disconnected', {
          userId: socket.data.userId,
          username: socket.data.username
        });
      }
    });
  });
});

// Serve the chat app
app.get('/', async (req: Request, res: Response) => {
  const navigation = await NavigationHelper.generateNavigationHTML('chat-space', authService, req);
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Chat Space - AI Dev Platform</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #2c3e50;
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 250px;
      background: #34495e;
      color: white;
      padding: 1rem;
      overflow-y: auto;
    }
    .room {
      padding: 0.5rem;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }
    .room:hover, .room.active {
      background: #2c3e50;
    }
    .chat-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #ecf0f1;
    }
    .messages {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
    }
    .message {
      background: white;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      border-radius: 4px;
    }
    .message .username {
      font-weight: bold;
      color: #2c3e50;
    }
    .message .time {
      font-size: 0.8em;
      color: #7f8c8d;
      margin-left: 0.5rem;
    }
    .input-area {
      background: white;
      padding: 1rem;
      border-top: 1px solid #bdc3c7;
      display: flex;
      gap: 0.5rem;
    }
    .input-area input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #bdc3c7;
      border-radius: 4px;
    }
    .input-area button {
      padding: 0.5rem 1rem;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .auth-required {
      text-align: center;
      padding: 2rem;
    }
    .login-btn {
      background: #3498db;
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
  </style>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>
  ${navigation}
  <div class="header">
    <h1>Chat Space</h1>
    <div id="userInfo"></div>
  </div>
  
  <div id="authRequired" class="auth-required" style="display:none;">
    <h2>Authentication Required</h2>
    <p>Please log in to access the chat</p>
    <button class="login-btn" onclick="window.location.href='http://localhost:3400/login?returnUrl=http://localhost:3300'">
      Login
    </button>
  </div>
  
  <div id="chatApp" class="container" style="display:none;">
    <div class="sidebar">
      <h3>Rooms</h3>
      <div id="roomList"></div>
    </div>
    
    <div class="chat-area">
      <div id="messages" class="messages"></div>
      <div class="input-area">
        <input type="text" id="messageInput" placeholder="Type a message..." />
        <button onclick="sendMessage()">Send</button>
      </div>
    </div>
  </div>
  
  <script>
    let socket;
    let currentRoom = 'general';
    let authToken;
    
    // Check authentication and get chat token
    async function initialize() {
      try {
        const response = await fetch('/api/auth/chat-token');
        const data = await response.json();
        
        if (response.status === 401) {
          document.getElementById('authRequired').style.display = 'block';
          return;
        }
        
        authToken = data.token;
        document.getElementById('chatApp').style.display = 'flex';
        
        // Decode token to get user info (simple base64 decode)
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        document.getElementById('userInfo').textContent = \`Logged in as \${payload.username}\`;
        
        // Initialize socket connection
        connectSocket();
        
        // Load rooms
        loadRooms();
      } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('authRequired').style.display = 'block';
      }
    }
    
    function connectSocket() {
      socket = io({
        auth: {
          token: authToken
        }
      });
      
      socket.on('connect', () => {
        console.log('Connected to chat server');
        socket.emit('join-room', currentRoom);
      });
      
      socket.on('message', (data) => {
        displayMessage(data);
      });
      
      socket.on('user-joined', (data) => {
        displaySystemMessage(\`\${data.username} joined the room\`);
      });
      
      socket.on('user-left', (data) => {
        displaySystemMessage(\`\${data.username} left the room\`);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Connection error:', error.message);
      });
    }
    
    async function loadRooms() {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      
      const roomList = document.getElementById('roomList');
      roomList.innerHTML = data.rooms.map(room => \`
        <div class="room \${room.id === currentRoom ? 'active' : ''}" 
             onclick="switchRoom('\${room.id}')">
          <strong>\${room.name}</strong>
          <div style="font-size: 0.8em;">\${room.description}</div>
        </div>
      \`).join('');
    }
    
    function switchRoom(roomId) {
      if (roomId === currentRoom) return;
      
      socket.emit('leave-room', currentRoom);
      currentRoom = roomId;
      socket.emit('join-room', currentRoom);
      
      document.getElementById('messages').innerHTML = '';
      loadRooms();
    }
    
    function sendMessage() {
      const input = document.getElementById('messageInput');
      const message = input.value.trim();
      
      if (message) {
        socket.emit('message', {
          roomId: currentRoom,
          message
        });
        input.value = '';
      }
    }
    
    function displayMessage(data) {
      const messages = document.getElementById('messages');
      const time = new Date(data.timestamp).toLocaleTimeString();
      
      messages.innerHTML += \`
        <div class="message">
          <span class="username">\${data.username}</span>
          <span class="time">\${time}</span>
          <div>\${data.message}</div>
        </div>
      \`;
      
      messages.scrollTop = messages.scrollHeight;
    }
    
    function displaySystemMessage(text) {
      const messages = document.getElementById('messages');
      messages.innerHTML += \`
        <div class="message" style="background: #95a5a6; color: white;">
          <em>\${text}</em>
        </div>
      \`;
      messages.scrollTop = messages.scrollHeight;
    }
    
    // Handle enter key
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
      
      initialize();
    });
  </script>
</body>
</html>
  `);
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Chat Space is running on http://localhost:${PORT}`);
  console.log('Using web-security theme for authentication');
  console.log('WebSocket authentication enabled');
});