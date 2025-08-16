#!/usr/bin/env node
/**
 * vLLM Coordinator CLI
 * Command-line interface for running vLLM coordinator agent
 */

import { Command } from "commander";
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { createVLLMCoordinator } from '../agents/vllm-coordinator';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('vllm-coordinator')
  .description('vLLM Coordinator Agent for AI Development Platform')
  .version('0.1.0');

program
  .command('start')
  .description('Start vLLM coordinator agent')
  .requiredOption('-s, --server <url>', 'Chat server URL', 'http://localhost:3200')
  .requiredOption('-r, --room <id>', 'Chat room ID to join')
  .option('-n, --name <name>', 'Agent name', 'vLLM-Assistant')
  .option('-m, --model <model>', 'Model to use', 'deepseek-r1:32b')
  .option('--vllm-server <url>', 'vLLM server URL', process.env.VLLM_SERVER_URL || 'http://localhost:8000')
  .option('--api-key <key>', 'vLLM API key', process.env.VLLM_API_KEY)
  .option('--no-auto-install', 'Disable auto-installation of vLLM')
  .option('--no-streaming', 'Disable streaming responses')
  .option('--context-size <size>', 'Context size in messages', '20')
  .option('--server-port <port>', 'Port for auto-installed vLLM server', '8000')
  .option('--system-prompt <prompt>', 'Custom system prompt')
  .option('--temperature <value>', 'Temperature for generation', '0.7')
  .option('--max-tokens <value>', 'Max tokens for generation', '2048')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🚀 vLLM Coordinator Agent'));
    console.log(chalk.gray('=' .repeat(50)));
    
    // Create coordinator
    const coordinator = createVLLMCoordinator(
      options.server,
      options.room,
      options.name,
      options.model,
      {
        vllmConfig: {
          model: options.model,
          serverUrl: options.vllmServer,
          apiKey: options.apiKey,
          autoInstall: options.autoInstall,
          streaming: options.streaming,
          contextSize: parseInt(options.contextSize),
          serverPort: parseInt(options.serverPort),
          systemPrompt: options.systemPrompt,
          parameters: {
            temperature: parseFloat(options.temperature),
            maxTokens: parseInt(options.maxTokens),
          },
        },
      }
    );
    
    try {
      // Start the coordinator
      await coordinator.start();
      
      console.log(chalk.green('\n✅ Coordinator started successfully!'));
      console.log(chalk.gray(`Room: ${options.room}`));
      console.log(chalk.gray(`Agent: ${options.name}`));
      console.log(chalk.gray(`Model: ${options.model}`));
      console.log(chalk.gray(`vLLM Server: ${options.vllmServer}`));
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\nShutting down coordinator...'));
        await coordinator.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        await coordinator.stop();
        process.exit(0);
      });
      
      // Keep the process alive
      process.stdin.resume();
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start coordinator:'), error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test vLLM server connection')
  .option('--server <url>', 'vLLM server URL', process.env.VLLM_SERVER_URL || 'http://localhost:8000')
  .option('--api-key <key>', 'vLLM API key', process.env.VLLM_API_KEY)
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🔍 Testing vLLM Server Connection'));
    console.log(chalk.gray('=' .repeat(50)));
    
    const { VLLMClient } = await import('../services/vllm-client');
    const client = new VLLMClient({
      baseUrl: options.server,
      apiKey: options.apiKey,
    });
    
    try {
      // Check health
      console.log(chalk.gray('\nChecking server health...'));
      const healthy = await client.checkHealth();
      console.log(healthy ? chalk.green('✅ Server is healthy') : chalk.red('❌ Server is unhealthy'));
      
      // List models
      console.log(chalk.gray('\nListing available models...'));
      const models = await client.listModels();
      
      if (models.length > 0) {
        console.log(chalk.green(`✅ Found ${models.length} models:`));
        models.forEach(model => {
          console.log(chalk.gray(`   - ${model.id} (${model.owned_by})`));
        });
      } else {
        console.log(chalk.yellow('⚠️  No models found'));
      }
      
      // Test chat if models available
      if (models.length > 0) {
        console.log(chalk.gray('\nTesting chat completion...'));
        const response = await client.chat({
          model: models[0].id,
          messages: [
            { role: 'system', content: 'You are a test assistant.' },
            { role: 'user', content: 'Say "Test successful" in exactly those words.' }
          ],
          max_tokens: 10,
        });
        
        console.log(chalk.green('✅ Chat test successful'));
        console.log(chalk.gray(`   Response: ${response.choices[0].message.content}`));
      }
      
      console.log(chalk.green('\n✨ All tests passed!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Test failed:'), error);
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Install vLLM server')
  .option('--gpu-memory <value>', 'GPU memory utilization (0-1)', '0.9')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n📦 Installing vLLM Server'));
    console.log(chalk.gray('=' .repeat(50)));
    
    const { VLLMInstaller } = await import('../services/vllm-installer');
    const installer = new VLLMInstaller({
      gpuMemoryUtilization: parseFloat(options.gpuMemory),
    });
    
    try {
      // Check GPU
      console.log(chalk.gray('\nChecking GPU availability...'));
      const gpuInfo = await installer.checkGPU();
      
      if (gpuInfo.available) {
        console.log(chalk.green(`✅ GPU detected: ${gpuInfo.name || gpuInfo.type}`));
        if (gpuInfo.memory) {
          console.log(chalk.gray(`   Memory: ${gpuInfo.memory}MB`));
        }
      } else {
        console.log(chalk.yellow('⚠️  No GPU detected - will install CPU version'));
      }
      
      // Install vLLM
      console.log(chalk.gray('\nInstalling vLLM...'));
      const success = await installer.autoInstall();
      
      if (success) {
        console.log(chalk.green('\n✨ vLLM installed successfully!'));
        console.log(chalk.gray('\nTo start the server, run:'));
        console.log(chalk.cyan('  vllm-coordinator start -r <room-id>'));
      } else {
        console.error(chalk.red('\n❌ Installation failed'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Installation error:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}