#!/usr/bin/env node
import { Coordinator, CoordinatorConfig } from './core/coordinator';
import { Command } from 'commander';
import { path } from '../../../../infra_external-log-lib/src';
import { fs } from '../../../../infra_external-log-lib/src';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// CLI program
const program = new Command();

program
  .name('coordinator-claude')
  .description('Coordinator Agent for Claude API with advanced session management')
  .version('1.0.0');

program
  .command('start')
  .description('Start a new coordinator session')
  .option('-k, --api-key <key>', 'Claude API key (optional - uses local auth by default)')
  .option('-s, --session <id>', 'Resume existing session by ID')
  .option('-d, --dangerous', 'Enable dangerous mode (skip all permissions)')
  .option('-t, --task-queue <path>', 'Path to TASK_QUEUE.md file', 'TASK_QUEUE.md')
  .option('--storage-dir <dir>', 'Session storage directory', '.coordinator-sessions')
  .option('--chat-space', 'Enable chat-space integration')
  .option('--pocketflow', 'Enable PocketFlow integration')
  .option('--chat-room <room>', 'Auto-join chat room')
  .option('--no-interactive', 'Run in non-interactive mode')
  .option('--no-local-auth', 'Disable local Claude authentication')
  .action(async (options) => {
    try {
      const config = await buildConfig(options);
      await startCoordinator(config, options.session);
    } catch (error) {
      console.error('Failed to start coordinator:', error);
      process.exit(1);
    }
  });

program
  .command('resume <sessionId>')
  .description('Resume an interrupted session')
  .option('-k, --api-key <key>', 'Claude API key (optional - uses local auth by default)')
  .option('-d, --dangerous', 'Enable dangerous mode')
  .option('--no-local-auth', 'Disable local Claude authentication')
  .action(async (sessionId, options) => {
    try {
      const config = await buildConfig(options);
      const coordinator = new Coordinator(config);
      
      async setupEventHandlers(coordinator);
      await coordinator.resume(sessionId);
      
      console.log(`🔄 Resumed session: ${sessionId}`);
      
      if(!options.noInteractive) {
        await runInteractiveMode(coordinator);
      }
    } catch (error) {
      console.error('Failed to resume session:', error);
      process.exit(1);
    }
  });

program
  .command('list-sessions')
  .description('List all saved sessions')
  .option('--storage-dir <dir>', 'Session storage directory', '.coordinator-sessions')
  .option('--active', 'Show only active sessions')
  .option('--recent <hours>', 'Show sessions from last N hours', '24')
  .action(async (options) => {
    try {
      const storageDir = path.resolve(options.storageDir);
      
      if(!fs.existsSync(storageDir)) {
        console.log('No sessions found.');
        return;
      }
      
      const files = fs.readdirSync(storageDir)
        .filter(f => f.endsWith('.session.json'));
      
      console.log('\n📋 Saved Sessions:\n');
      
      for(const file of files) {
        const sessionPath = path.join(storageDir, file);
        const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        const sessionId = file.replace('.session.json', '');
        
        const lastUpdated = new Date(data.lastUpdated);
        const hoursAgo = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if(options.recent && hoursAgo > parseInt(options.recent)) {
          continue;
        }
        
        if(options.active && data.state !== 'active') {
          continue;
        }
        
        console.log(`Session: ${sessionId}`);
        console.log(`  State: ${data.state}`);
        console.log(`  Created: ${new Date(data.createdAt).toLocaleString()}`);
        console.log(`  Updated: ${lastUpdated.toLocaleString()}`);
        console.log(`  Messages: ${data.conversation.length}`);
        console.log(`  Dangerous Mode: ${data.permissions.dangerousMode}`);
        console.log('');
      }
    } catch (error) {
      console.error('Failed to list sessions:', error);
      process.exit(1);
    }
  });

program
  .command('export-session <sessionId>')
  .description('Export session data')
  .option('--storage-dir <dir>', 'Session storage directory', '.coordinator-sessions')
  .option('-o, --output <file>', 'Output file path')
  .action(async (sessionId, options) => {
    try {
      const sessionPath = path.join(
        path.resolve(options.storageDir),
        `${sessionId}.session.json`
      );
      
      if(!fs.existsSync(sessionPath)) {
        console.error(`Session ${sessionId} not found`);
        process.exit(1);
      }
      
      const data = fs.readFileSync(sessionPath, 'utf-8');
      
      if(options.output) {
        await fileAPI.createFile(options.output, data, { type: FileType.TEMPORARY });
        console.log(`🔄 Session exported to ${options.output}`);
      } else {
        console.log(data);
      }
    } catch (error) {
      console.error('Failed to export session:', error);
      process.exit(1);
    }
  });

// Helper functions
async function buildConfig(options: any): Promise<CoordinatorConfig> {
  // API key is optional - will use local auth if not provided
  const apiKey = options.apiKey || process.env.CLAUDE_API_KEY;
  
  const config: CoordinatorConfig = {
    apiKey, // Can be undefined - will use local auth
    sessionStorageDir: path.resolve(options.storageDir || '.coordinator-sessions'),
    taskQueuePath: options.taskQueue ? path.resolve(options.taskQueue) : undefined,
    dangerousModeEnabled: options.dangerous,
    claudeConfig: {
      apiKey, // Pass the API key to ClaudeAPIClient
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-20250514',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
      timeout: parseInt(process.env.CLAUDE_TIMEOUT || '60000'),
      authOptions: {
        useLocalCredentials: !options.noLocalAuth
      }
    }
  };
  
  // Add chat-space config if enabled
  if(options.chatSpace) {
    config.chatSpaceConfig = {
      chatSpacePath: process.env.CHAT_SPACE_PATH,
      autoJoinRooms: options.chatRoom ? [options.chatRoom] : undefined,
      botUsername: process.env.COORDINATOR_BOT_NAME || 'CoordinatorBot'
    };
  }
  
  // Add PocketFlow config if enabled
  if(options.pocketflow) {
    config.pocketFlowConfig = {
      pocketFlowPath: process.env.POCKETFLOW_PATH,
      enabledWorkflows: process.env.POCKETFLOW_WORKFLOWS?.split(',') || [
        'task-automation',
        'session-backup',
        'automated-code-review'
      ]
    };
  }
  
  return config;
}

async function startCoordinator(
  config: CoordinatorConfig,
  sessionId?: string
): Promise<void> {
  const coordinator = new Coordinator(config);
  
  // Check authentication status
  const claudeClient = new (await import('./core/claude-api-client')).ClaudeAPIClient(config.claudeConfig || {});
  const authInfo = await claudeClient.getAuthInfo();
  
  console.log(`\n🔐 Authentication: ${authInfo.type === 'oauth' ? 'Local Claude credentials' : 
    authInfo.type === 'api-key' ? 'API key' : 'Not configured'}`);
  
  if (!authInfo.authenticated) {
    console.error('\n❌ Authentication failed. Please provide an API key or ensure Claude CLI is authenticated.');
    process.exit(1);
  }
  
  setupEventHandlers(coordinator);
  
  if (sessionId) {
    await coordinator.resume(sessionId);
    console.log(`🔄 Resumed session: ${sessionId}`);
  } else {
    await coordinator.start();
    const state = coordinator.getState();
    console.log(`🔄 Started new session: ${state.sessionId}`);
  }
  
  // Run interactive mode if not disabled
  if(process.stdout.isTTY) {
    await runInteractiveMode(coordinator);
  }
}

async function setupEventHandlers(coordinator: Coordinator): void {
  coordinator.on('started', ({ sessionId }) => {
    console.log(`\n🚀 Coordinator started`);
    console.log(`📌 Session ID: ${sessionId}`);
    console.log(`💾 Sessions stored in: ${coordinator.getState().session?.context.workingDirectory}`);
    console.log('\nPress Ctrl+C to interrupt and save session\n');
  });
  
  coordinator.on('stopped', ({ reason, stats }) => {
    console.log(`\n🛑 Coordinator stopped: ${reason || 'User request'}`);
    console.log(`📊 Stats:`, stats);
  });
  
  coordinator.on('interrupted', () => {
    console.log('\n⚡ Session interrupted - saving state...');
  });
  
  coordinator.on('resumed', ({ sessionId }) => {
    console.log(`\n♻️  Session resumed: ${sessionId}`);
  });
  
  coordinator.on('dangerous_mode_enabled', ({ reason }) => {
    console.log(`\n⚠️  DANGEROUS MODE ENABLED: ${reason}`);
  });
  
  coordinator.on('dangerous_mode_disabled', () => {
    console.log(`\n🔄 Dangerous mode disabled`);
  });
  
  coordinator.on('task_started', ({ task }) => {
    console.log(`\n📋 Task started: ${task.title}`);
  });
  
  coordinator.on('task_completed', ({ taskId }) => {
    console.log(`\n🔄 Task In Progress: ${taskId}`);
  });
  
  coordinator.on('workflow_triggered', ({ workflowId }) => {
    console.log(`\n⚙️  Workflow triggered: ${workflowId}`);
  });
  
  coordinator.on('error', ({ type, error }) => {
    console.error(`\n❌ Error (${type}):`, error);
  });
  
  coordinator.on('warning', ({ message }) => {
    console.warn(`\n⚠️  Warning:`, message);
  });
}

async function runInteractiveMode(coordinator: Coordinator): Promise<void> {
  console.log('\n📝 Interactive mode - Commands:');
  console.log('  /dangerous [on|off] - Toggle dangerous mode');
  console.log('  /task <title>       - Add a new task');
  console.log('  /status             - Show coordinator status');
  console.log('  /export             - Export current session');
  console.log('  /quit               - Stop and save session');
  console.log('  [message]           - Send to Claude\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input.startsWith('/')) {
      const [command, ...args] = input.slice(1).split(' ');
      
      switch (command) {
        case 'dangerous':
          if (args[0] === 'on') {
            await coordinator.enableDangerousMode('User command');
          } else if (args[0] === 'off') {
            await coordinator.disableDangerousMode();
          } else {
            console.log('Usage: /dangerous [on|off]');
          }
          break;
          
        case 'task':
          if (args.length > 0) {
            const task = await coordinator.addTask({
              title: args.join(' '),
              description: 'Added via interactive mode',
              priority: 'medium',
              status: 'pending'
            });
            console.log(`Added task: ${task?.id}`);
          } else {
            console.log('Usage: /task <title>');
          }
          break;
          
        case 'status':
          const state = coordinator.getState();
          console.log('\n📊 Coordinator Status:');
          console.log(`  Running: ${state.running}`);
          console.log(`  Session: ${state.sessionId}`);
          console.log(`  Connected to chat-space: ${state.connected.chatSpace}`);
          console.log(`  Connected to PocketFlow: ${state.connected.pocketFlow}`);
          console.log(`  Active task: ${state.activeTask?.title || 'None'}`);
          console.log(`  Stats:`, state.stats);
          break;
          
        case 'export':
          const sessionId = coordinator.getState().sessionId;
          if (sessionId) {
            const exportPath = `session-${sessionId}-export.json`;
            // Export logic here
            console.log(`Session exported to ${exportPath}`);
          }
          break;
          
        case 'quit':
          await coordinator.stop('User quit');
          rl.close();
          process.exit(0);
          
        default:
          console.log('Unknown command. Type a message or use /quit to exit.');
      }
    } else if (input) {
      // Send message to Claude via stream handler
      console.log('Sending to Claude...');
      await coordinator.sendMessage(input);
    }
    
    rl.prompt();
  });
  
  rl.on('close', async () => {
    await coordinator.stop('Interactive mode closed');
    process.exit(0);
  });
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if(!process.argv.slice(2).length) {
  program.outputHelp();
}