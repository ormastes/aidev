#!/usr/bin/env node

/**
 * Enhanced Chat Server with Coordinator Support
 * Supports room configuration and automatic coordinator initialization
 */

import { EnhancedChatServer } from './server/enhanced-chat-server';
import { fs } from '../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../infra_external-log-lib/src';
import { RoomConfig, CoordinatorType } from './config/room-config.schema';

const PORT = parseInt(process.env.CHAT_PORT || '3000');
const CONFIG_DIR = process.env.ROOM_CONFIG_DIR || './config/rooms';

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Create default room configuration if it doesn't exist
const defaultConfigPath = path.join(CONFIG_DIR, 'default.json');
if (!fs.existsSync(defaultConfigPath)) {
  const defaultConfig: RoomConfig = {
    id: 'default',
    name: 'Default Room',
    coordinator: {
      type: CoordinatorType.NONE
    },
    features: {
      allowAgents: true,
      maxUsers: 50,
      messageHistory: 1000,
      enableCommands: true
    },
    metadata: {
      createdAt: new Date().toISOString(),
      description: 'Default room configuration'
    }
  };
  
  fs.writeFileSync(defaultConfigPath, JSON.stringify(defaultConfig, null, 2));
  console.log('Created default room configuration');
}

// Create example configurations
const examples = [
  {
    filename: 'claude-room.json',
    config: {
      id: 'claude-demo',
      name: 'Claude Demo Room',
      coordinator: {
        type: CoordinatorType.CLAUDE,
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful AI assistant in a chat room. Be concise and friendly.'
      },
      features: {
        allowAgents: true,
        maxUsers: 20,
        messageHistory: 500,
        enableCommands: true
      }
    }
  },
  {
    filename: 'ollama-room.json',
    config: {
      id: 'ollama-demo',
      name: 'Ollama DeepSeek Demo Room',
      coordinator: {
        type: CoordinatorType.OLLAMA,
        model: 'deepseek-r1:32b',
        endpoint: 'http://localhost:11434',
        temperature: 0.7,
        systemPrompt: 'You are DeepSeek, an AI assistant. Help users with their questions.'
      },
      features: {
        allowAgents: true,
        maxUsers: 20,
        messageHistory: 500,
        enableCommands: true
      }
    }
  }
];

// Create example configs if they don't exist
examples.forEach(({ filename, config }) => {
  const configPath = path.join(CONFIG_DIR, filename);
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Created example configuration: ${filename}`);
  }
});

// Start the server
console.log(`
🚀 Starting Enhanced CLI Chat Room Server
════════════════════════════════════════════
Port: ${PORT}
Config Directory: ${CONFIG_DIR}

Available Room Configurations:
`);

// List available configurations
const configFiles = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json'));
configFiles.forEach(file => {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8'));
    console.log(`  - ${file}: ${config.name || config.id} (Coordinator: ${config.coordinator?.type || 'none'})`);
  } catch (error) {
    console.log(`  - ${file}: (invalid configuration)`);
  }
});

console.log(`
To use a specific configuration, create a room with the same ID as the config file (without .json)
Example: Room ID 'claude-demo' will use claude-room.json configuration

🔄 Server is ready!

Clients can connect using:
  npm run client <username> <roomId>
  npm run agent <roomId> [agentName]

Press Ctrl+C to stop the server
`);

const server = new EnhancedChatServer(PORT, CONFIG_DIR);
server.start();

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  server.stop();
  process.exit(0);
});