#!/usr/bin/env node

/**
 * Ollama Coordinator CLI
 * Run DeepSeek R1 32B coordinator agent from command line
 */

import { createOllamaCoordinator } from '../agents/ollama-coordinator';
import chalk from 'chalk';
import { program } from 'commander';

program
  .name('ollama-coordinator')
  .description('Run Ollama-based coordinator agent for chat rooms')
  .argument('[roomId]', 'Room ID to join', 'demo-room')
  .argument('[agentName]', 'Agent display name', 'DeepSeek-R1')
  .option('-s, --server <url>', 'WebSocket server URL', 'ws://localhost:3000')
  .option('-m, --model <model>', 'Ollama model to use', 'deepseek-r1:32b')
  .option('-o, --ollama-url <url>', 'Ollama server URL', 'http://localhost:11434')
  .option('-t, --temperature <temp>', 'Temperature (0-1)', '0.7')
  .option('--no-stream', 'Disable streaming responses')
  .option('--context-size <size>', 'Context window size', '20')
  .option('--gpu-info', 'Show GPU information and exit')
  .option('--install', 'Install Ollama if not present')
  .option('--pull', 'Pull model if not present')
  .action(async (roomId, agentName, options) => {
    console.log(chalk.bold.blue(`
🦙 Ollama Coordinator Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`));

    try {
      // Handle special commands
      if (options.gpuInfo) {
        const { OllamaClient } = await import('../services/ollama-client');
        const client = new OllamaClient({ baseUrl: options.ollamaUrl });
        const gpuInfo = await client.checkGPU();
        
        console.log(chalk.cyan('GPU Information:'));
        if (gpuInfo.available) {
          console.log(chalk.green(`🔄 GPU Available`));
          console.log(`   Type: ${gpuInfo.type}`);
          if (gpuInfo.name) console.log(`   Name: ${gpuInfo.name}`);
          if (gpuInfo.memory) console.log(`   Memory: ${gpuInfo.memory}MB`);
        } else {
          console.log(chalk.yellow('⚠️  No GPU detected - CPU mode only'));
        }
        process.exit(0);
      }
      
      if (options.install) {
        const { OllamaClient } = await import('../services/ollama-client');
        const client = new OllamaClient({ baseUrl: options.ollamaUrl });
        await client.autoInstall();
        process.exit(0);
      }
      
      if (options.pull) {
        const { OllamaClient } = await import('../services/ollama-client');
        const client = new OllamaClient({ baseUrl: options.ollamaUrl });
        await client.ensureModel(options.model);
        process.exit(0);
      }
      
      // Create and start coordinator
      console.log(chalk.white('Configuration:'));
      console.log(chalk.gray(`  Server: ${options.server}`));
      console.log(chalk.gray(`  Room: ${roomId}`));
      console.log(chalk.gray(`  Agent: ${agentName}`));
      console.log(chalk.gray(`  Model: ${options.model}`));
      console.log(chalk.gray(`  Ollama: ${options.ollamaUrl}`));
      console.log(chalk.gray(`  Streaming: ${options.stream ? 'enabled' : 'disabled'}`));
      console.log('');
      
      const coordinator = createOllamaCoordinator(
        options.server,
        roomId,
        agentName,
        options.model,
        {
          ollamaConfig: {
            serverUrl: options.ollamaUrl,
            streaming: options.stream,
            contextSize: parseInt(options.contextSize),
            parameters: {
              temperature: parseFloat(options.temperature)
            },
            systemPrompt: `You are ${agentName}, an AI assistant powered by ${options.model}. You are helpful, friendly, and knowledgeable. Provide clear, concise answers and engage naturally in conversations.`
          }
        }
      );
      
      // Start the coordinator
      await coordinator.start();
      
      console.log(chalk.green('\n🔄 Coordinator is running!'));
      console.log(chalk.gray('Press Ctrl+C to stop\n'));
      
      // Handle shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n🛑 Shutting down...'));
        await coordinator.stop();
        process.exit(0);
      });
      
      // Keep the process running
      await new Promise(() => {});
      
    } catch (error: any) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      
      if (error.message.includes('Ollama server is not running')) {
        console.log(chalk.yellow('\nℹ️  To start Ollama:'));
        console.log(chalk.gray('   1. Install: curl -fsSL https://ollama.com/install.sh | sh'));
        console.log(chalk.gray('   2. Start: ollama serve'));
        console.log(chalk.gray('   3. Or use: bunx ollama-coordinator --install'));
      } else if (error.message.includes('model not found')) {
        console.log(chalk.yellow('\nℹ️  To download the model:'));
        console.log(chalk.gray(`   ollama pull ${options.model}`));
        console.log(chalk.gray(`   Or use: bunx ollama-coordinator --pull --model ${options.model}`));
      }
      
      process.exit(1);
    }
  });

program.parse();

// Show help if no arguments
if (process.argv.length === 2) {
  program.help();
}