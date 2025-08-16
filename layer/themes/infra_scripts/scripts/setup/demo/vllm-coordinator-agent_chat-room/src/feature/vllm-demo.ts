#!/usr/bin/env node
/**
 * vLLM Coordinator Demo
 * Demonstrates vLLM coordinator agent with DeepSeek R1 model
 * using OpenAI API compatible interface
 */

import { http } from '../../../../../../../infra_external-log-lib/src';
import { Server as SocketIOServer } from 'socket.io';
import { Server as SocketIOClient } from 'socket.io-client';
import chalk from 'chalk';
import { createVLLMCoordinator } from './agents/vllm-coordinator';
import { VLLMInstaller } from './services/vllm-installer';
import { VLLMClient } from './services/vllm-client';

// Configuration
const CHAT_SERVER_PORT = 3303;
const VLLM_SERVER_PORT = 8000;
const ROOM_ID = 'vllm-demo-room';
const VLLM_MODEL = 'deepseek-ai/DeepSeek-R1-32B'; // Full model name for vLLM

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

// Simple in-memory chat server
class ChatServer {
  private io: SocketIOServer;
  private messages: Message[] = [];
  
  constructor(port: number) {
    const server = http.createServer();
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    this.setupHandlers();
    
    server.listen(port, () => {
      console.log(chalk.green(`✅ Chat server running on port ${port}`));
    });
  }
  
  private setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(chalk.gray(`Client connected: ${socket.id}`));
      
      socket.on('join', (data) => {
        const { roomId, username } = data;
        socket.join(roomId);
        console.log(chalk.blue(`${username} joined room: ${roomId}`));
        
        // Send room history
        const roomMessages = this.messages.filter(m => m.roomId === roomId);
        socket.emit('history', roomMessages);
        
        // Notify others
        socket.to(roomId).emit('user-joined', { username });
      });
      
      socket.on('message', (data) => {
        const message: Message = {
          id: Date.now().toString(),
          username: data.username,
          content: data.content,
          timestamp: new Date(),
          roomId: data.roomId
        };
        
        this.messages.push(message);
        console.log(chalk.cyan(`[${data.roomId}] ${data.username}: ${data.content}`));
        
        // Broadcast to room
        this.io.to(data.roomId).emit('message', message);
      });
      
      socket.on('disconnect', () => {
        console.log(chalk.gray(`Client disconnected: ${socket.id}`));
      });
    });
  }
}

// Demo client to interact with chat
class DemoClient {
  private socket: any;
  private username: string;
  private roomId: string;
  
  constructor(serverUrl: string, username: string, roomId: string) {
    this.username = username;
    this.roomId = roomId;
    
    const io = require('socket.io-client');
    this.socket = io(serverUrl);
    
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.socket.on('connect', () => {
      console.log(chalk.green(`✅ ${this.username} connected to server`));
      this.socket.emit('join', { roomId: this.roomId, username: this.username });
    });
    
    this.socket.on('message', (message: Message) => {
      if (message.username !== this.username) {
        console.log(chalk.yellow(`\n[${message.username}]: ${message.content}`));
      }
    });
    
    this.socket.on('user-joined', (data: any) => {
      console.log(chalk.gray(`${data.username} joined the room`));
    });
  }
  
  sendMessage(content: string) {
    this.socket.emit('message', {
      username: this.username,
      content,
      roomId: this.roomId
    });
  }
}

// Main demo function
async function runDemo() {
  console.log(chalk.blue.bold('\n🚀 vLLM Coordinator Demo with DeepSeek R1'));
  console.log(chalk.gray('=' .repeat(60)));
  
  // Start chat server
  console.log(chalk.blue('\n1️⃣  Starting chat server...'));
  const chatServer = new ChatServer(CHAT_SERVER_PORT);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check/Install vLLM
  console.log(chalk.blue('\n2️⃣  Checking vLLM installation...'));
  const installer = new VLLMInstaller();
  
  // Check if vLLM is installed
  const isInstalled = await installer.isInstalled();
  if (!isInstalled) {
    console.log(chalk.yellow('⚠️  vLLM not installed. Installing now...'));
    const success = await installer.autoInstall();
    if (!success) {
      console.error(chalk.red('❌ Failed to install vLLM. Please install manually.'));
      process.exit(1);
    }
  }
  
  // Check if vLLM server is running
  console.log(chalk.blue('\n3️⃣  Checking vLLM server...'));
  const vllmClient = new VLLMClient({
    baseUrl: `http://localhost:${VLLM_SERVER_PORT}`
  });
  
  let serverRunning = await vllmClient.checkHealth();
  if (!serverRunning) {
    console.log(chalk.yellow('Starting vLLM server with DeepSeek R1...'));
    const started = await installer.startServer(VLLM_MODEL, VLLM_SERVER_PORT);
    if (!started) {
      console.error(chalk.red('❌ Failed to start vLLM server'));
      process.exit(1);
    }
  }
  
  // Wait for vLLM to be ready
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Create vLLM coordinator
  console.log(chalk.blue('\n4️⃣  Creating vLLM coordinator agent...'));
  const coordinator = createVLLMCoordinator(
    `http://localhost:${CHAT_SERVER_PORT}`,
    ROOM_ID,
    'DeepSeek-R1',
    'deepseek-r1:32b',
    {
      vllmConfig: {
        serverUrl: `http://localhost:${VLLM_SERVER_PORT}`,
        autoInstall: false, // Already handled
        streaming: true,
        parameters: {
          temperature: 0.7,
          maxTokens: 2048,
        }
      }
    }
  );
  
  // Start coordinator
  await coordinator.start();
  
  // Create demo user
  console.log(chalk.blue('\n5️⃣  Creating demo user...'));
  const demoUser = new DemoClient(
    `http://localhost:${CHAT_SERVER_PORT}`,
    'DemoUser',
    ROOM_ID
  );
  
  // Wait for connections
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Interactive demo
  console.log(chalk.green('\n✨ Demo ready! vLLM Coordinator with DeepSeek R1 is active.'));
  console.log(chalk.gray('The coordinator will respond to:'));
  console.log(chalk.gray('- Direct mentions: @DeepSeek-R1'));
  console.log(chalk.gray('- Questions (messages with ?)'));
  console.log(chalk.gray('- Commands: /help, /model, /info'));
  console.log(chalk.gray('\nType your messages below (or "exit" to quit):\n'));
  
  // Setup readline for user input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('You> ')
  });
  
  rl.prompt();
  
  rl.on('line', (line: string) => {
    const input = line.trim();
    
    if (input.toLowerCase() === 'exit') {
      console.log(chalk.yellow('\nShutting down demo...'));
      rl.close();
      process.exit(0);
    }
    
    if (input) {
      demoUser.sendMessage(input);
    }
    
    rl.prompt();
  });
  
  // Demo scenarios
  setTimeout(() => {
    console.log(chalk.magenta('\n📝 Running demo scenarios...'));
    
    // Scenario 1: Test basic response
    setTimeout(() => {
      console.log(chalk.gray('\n[Demo] Testing basic greeting...'));
      demoUser.sendMessage('Hello @DeepSeek-R1! Can you introduce yourself?');
    }, 1000);
    
    // Scenario 2: Test code generation
    setTimeout(() => {
      console.log(chalk.gray('\n[Demo] Testing code generation...'));
      demoUser.sendMessage('Can you write a Python function to calculate fibonacci numbers?');
    }, 10000);
    
    // Scenario 3: Test reasoning
    setTimeout(() => {
      console.log(chalk.gray('\n[Demo] Testing reasoning capabilities...'));
      demoUser.sendMessage('@DeepSeek-R1 If I have 3 apples and give away half, then buy 5 more, how many do I have?');
    }, 20000);
    
    // Scenario 4: Test commands
    setTimeout(() => {
      console.log(chalk.gray('\n[Demo] Testing commands...'));
      demoUser.sendMessage('/info');
    }, 30000);
    
    setTimeout(() => {
      demoUser.sendMessage('/model');
    }, 35000);
    
  }, 5000);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Run the demo
runDemo().catch(error => {
  console.error(chalk.red('Demo failed:'), error);
  process.exit(1);
});