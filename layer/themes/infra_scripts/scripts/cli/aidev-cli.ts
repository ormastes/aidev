#!/usr/bin/env node

/**
 * AI Development Platform - Unified CLI
 * Central command-line interface for all platform features
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { path } from '../../../infra_external-log-lib/src';
import { spawn } from 'child_process';
import { fs } from '../../../infra_external-log-lib/src';

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║     ╔═╗╦  ╔╦╗╔═╗╦  ╦  ╔═╗╦  ╔═╗╔╦╗╔═╗╔═╗╦═╗╔╦╗                    ║
║     ╠═╣║   ║║║╣ ╚╗╔╝  ╠═╝║  ╠═╣ ║ ╠╣ ║ ║╠╦╝║║║                    ║
║     ╩ ╩╩  ═╩╝╚═╝ ╚╝   ╩  ╩═╝╩ ╩ ╩ ╚  ╚═╝╩╚═╩ ╩                    ║
║                                                                      ║
║              Unified Command-Line Interface v1.0.0                  ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
`;

interface ServiceInfo {
  name: string;
  description: string;
  path: string;
  command: string;
  port?: number;
  status?: 'implemented' | 'in_progress' | 'planned';
}

const SERVICES: ServiceInfo[] = [
  {
    name: 'chat-space',
    description: '💬 Interactive Chat Room CLI',
    path: 'layer/themes/llm-agent_chat-space/user-stories/007-chat-room-cli',
    command: 'npm run dev',
    port: 3200,
    status: 'implemented'
  },
  {
    name: 'mcp-agent',
    description: '🤖 MCP Agent Orchestrator',
    path: 'layer/themes/mcp_agent',
    command: 'npm start',
    port: 3100,
    status: 'implemented'
  },
  {
    name: 'ollama-coordinator',
    description: '🦙 Ollama Local LLM Coordinator',
    path: 'layer/themes/llm-agent_coordinator-ollama',
    command: 'npm run dev',
    port: 11434,
    status: 'implemented'
  },
  {
    name: 'claude-coordinator',
    description: '🧠 Claude AI Coordinator',
    path: 'layer/themes/llm-agent_coordinator-claude/user-stories/010-coordinator-agent',
    command: 'npm run dev',
    port: 3300,
    status: 'implemented'
  },
  {
    name: 'vllm-coordinator',
    description: '⚡ vLLM GPU Coordinator',
    path: 'layer/themes/llm-agent_coordinator-vllm/user-stories/027-vllm-coordinator',
    command: 'npm run dev',
    port: 8000,
    status: 'implemented'
  },
  {
    name: 'story-reporter',
    description: '📊 Story Reporter & Test Documentation',
    path: 'layer/themes/infra_story-reporter/user-stories/007-story-reporter',
    command: 'npm start',
    port: 3456,
    status: 'implemented'
  },
  {
    name: 'pocketflow',
    description: '🔄 Workflow Automation Engine',
    path: 'layer/themes/llm-agent_pocketflow',
    command: 'npm run demo',
    status: 'implemented'
  },
  {
    name: 'mate-dealer',
    description: '🧉 Mate Dealer Mobile App (React Native)',
    path: 'layer/themes/mate-dealer/user-stories/001-mobile-app',
    command: 'npm start',
    port: 19000,
    status: 'implemented'
  },
  {
    name: 'portal',
    description: '🌐 AI Dev Portal Web Interface',
    path: 'layer/themes/portal_aidev/user-stories/024-aidev-portal',
    command: 'npm run dev',
    port: 3000,
    status: 'in_progress'
  },
  {
    name: 'test-manual',
    description: '📝 Test-as-Manual Documentation Generator',
    path: 'layer/themes/infra_test-as-manual/user-stories/001-mftod-converter',
    command: 'npm run demo',
    status: 'implemented'
  }
];

class AiDevCLI {
  private program: Command;
  private rootDir: string;

  constructor() {
    this.rootDir = process.cwd();
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('aidev')
      .description('AI Development Platform - Unified CLI')
      .version('1.0.0');

    // Start command - interactive service starter
    this.program
      .command('start [service]')
      .description('Start a platform service')
      .action(async (service?: string) => {
        if (service) {
          await this.startService(service);
        } else {
          await this.interactiveStart();
        }
      });

    // List command - show all services
    this.program
      .command('list')
      .alias('ls')
      .description('List all available services')
      .action(() => this.listServices());

    // Status command - check service status
    this.program
      .command('status')
      .description('Check status of all services')
      .action(() => this.checkStatus());

    // Test command - run tests
    this.program
      .command('test [type]')
      .description('Run platform tests (unit|integration|system|all)')
      .action((type = 'all') => this.runTests(type));

    // Build command - build the platform
    this.program
      .command('build')
      .description('Build all TypeScript projects')
      .action(() => this.buildPlatform());

    // Setup command - initial setup
    this.program
      .command('setup')
      .description('Setup the development environment')
      .action(() => this.setupEnvironment());

    // Docs command - open documentation
    this.program
      .command('docs')
      .description('Open platform documentation')
      .action(() => this.openDocs());

    // Interactive mode - main menu
    this.program
      .command('interactive')
      .alias('i')
      .description('Launch interactive mode')
      .action(() => this.interactiveMode());
  }

  private async interactiveMode(): Promise<void> {
    console.clear();
    console.log(chalk.cyan(BANNER));
    
    const choices = [
      { name: '🚀 Start a Service', value: 'start' },
      { name: '📋 List Services', value: 'list' },
      { name: '📊 Check Status', value: 'status' },
      { name: '🧪 Run Tests', value: 'test' },
      { name: '🔨 Build Platform', value: 'build' },
      { name: '📚 View Documentation', value: 'docs' },
      { name: '⚙️  Setup Environment', value: 'setup' },
      new inquirer.Separator(),
      { name: '❌ Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    switch (action) {
      case 'start':
        await this.interactiveStart();
        break;
      case 'list':
        this.listServices();
        await this.promptContinue();
        break;
      case 'status':
        await this.checkStatus();
        await this.promptContinue();
        break;
      case 'test':
        await this.interactiveTest();
        break;
      case 'build':
        await this.buildPlatform();
        await this.promptContinue();
        break;
      case 'docs':
        this.openDocs();
        await this.promptContinue();
        break;
      case 'setup':
        await this.setupEnvironment();
        await this.promptContinue();
        break;
      case 'exit':
        console.log(chalk.yellow('\n👋 Goodbye!\n'));
        process.exit(0);
    }

    // Loop back to menu
    await this.interactiveMode();
  }

  private async interactiveStart(): Promise<void> {
    const implementedServices = SERVICES.filter(s => s.status === 'implemented');
    
    const choices = implementedServices.map(service => ({
      name: `${service.description} ${service.port ? chalk.gray(`(port ${service.port})`) : ''}`,
      value: service.name
    }));

    choices.push(
      new inquirer.Separator(),
      { name: '← Back to Main Menu', value: 'back' }
    );

    const { service } = await inquirer.prompt([
      {
        type: 'list',
        name: 'service',
        message: 'Which service would you like to start?',
        choices
      }
    ]);

    if (service === 'back') {
      return;
    }

    await this.startService(service);
  }

  private async startService(serviceName: string): Promise<void> {
    const service = SERVICES.find(s => s.name === serviceName);
    
    if (!service) {
      console.error(chalk.red(`Service "${serviceName}" not found`));
      return;
    }

    if (service.status !== 'implemented') {
      console.log(chalk.yellow(`⚠️  Service "${serviceName}" is ${service.status}`));
      return;
    }

    const servicePath = path.join(this.rootDir, service.path);
    
    if (!fs.existsSync(servicePath)) {
      console.error(chalk.red(`Service path not found: ${servicePath}`));
      return;
    }

    const spinner = ora(`Starting ${service.description}...`).start();

    try {
      // Check if package.json exists
      const packagePath = path.join(servicePath, 'package.json');
      if (!fs.existsSync(packagePath)) {
        spinner.fail(chalk.red('package.json not found'));
        return;
      }

      // Install dependencies if needed
      const nodeModulesPath = path.join(servicePath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        spinner.text = 'Installing dependencies...';
        await this.runCommand('npm', ['install'], servicePath);
      }

      spinner.succeed(chalk.green(`${service.description} ready!`));
      
      console.log(chalk.cyan('\n📍 Service Information:'));
      console.log(chalk.gray(`   Path: ${servicePath}`));
      if (service.port) {
        console.log(chalk.gray(`   Port: ${service.port}`));
        console.log(chalk.gray(`   URL:  http://localhost:${service.port}`));
      }
      console.log(chalk.gray(`   Cmd:  ${service.command}\n`));

      // Start the service
      console.log(chalk.yellow('Starting service (Ctrl+C to stop)...\n'));
      
      const [cmd, ...args] = service.command.split(' ');
      const child = spawn(cmd, args, {
        cwd: servicePath,
        stdio: 'inherit',
        shell: true
      });

      child.on('error', (error) => {
        console.error(chalk.red(`Failed to start: ${error.message}`));
      });

      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.log(chalk.red(`Service exited with code ${code}`));
        }
      });

    } catch (error) {
      spinner.fail(chalk.red(`Failed to start service: ${error.message}`));
    }
  }

  private listServices(): void {
    console.log(chalk.cyan('\n📦 Available Services:\n'));
    
    const groups = {
      implemented: SERVICES.filter(s => s.status === 'implemented'),
      in_progress: SERVICES.filter(s => s.status === 'in_progress'),
      planned: SERVICES.filter(s => s.status === 'planned')
    };

    if (groups.implemented.length > 0) {
      console.log(chalk.green('✅ Implemented:'));
      groups.implemented.forEach(service => {
        const port = service.port ? chalk.gray(` (port ${service.port})`) : '';
        console.log(`   ${chalk.white(service.name.padEnd(20))} ${service.description}${port}`);
      });
    }

    if (groups.in_progress.length > 0) {
      console.log(chalk.yellow('\n🔧 In Progress:'));
      groups.in_progress.forEach(service => {
        console.log(`   ${chalk.white(service.name.padEnd(20))} ${service.description}`);
      });
    }

    if (groups.planned.length > 0) {
      console.log(chalk.gray('\n📋 Planned:'));
      groups.planned.forEach(service => {
        console.log(`   ${chalk.white(service.name.padEnd(20))} ${service.description}`);
      });
    }

    console.log('');
  }

  private async checkStatus(): Promise<void> {
    console.log(chalk.cyan('\n🔍 Checking Service Status...\n'));
    
    for (const service of SERVICES) {
      if (service.status !== 'implemented' || !service.port) continue;
      
      const status = await this.checkPort(service.port);
      const statusIcon = status ? '🟢' : '⚫';
      const statusText = status ? chalk.green('Running') : chalk.gray('Stopped');
      
      console.log(`${statusIcon} ${service.name.padEnd(20)} ${statusText}`);
    }
    
    console.log('');
  }

  private async checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(port, 'localhost');
    });
  }

  private async interactiveTest(): Promise<void> {
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Which tests would you like to run?',
        choices: [
          { name: '🧪 All Tests', value: 'all' },
          { name: '📦 Unit Tests', value: 'unit' },
          { name: '🔗 Integration Tests', value: 'integration' },
          { name: '🌐 System Tests', value: 'system' },
          { name: '🌍 External Tests', value: 'external' },
          { name: '🌿 Environment Tests', value: 'env' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' }
        ]
      }
    ]);

    if (type === 'back') return;
    
    await this.runTests(type);
    await this.promptContinue();
  }

  private async runTests(type: string): Promise<void> {
    const spinner = ora(`Running ${type} tests...`).start();
    
    try {
      const testCommand = type === 'all' ? 'test' : `test:${type}`;
      await this.runCommand('npm', ['run', testCommand], this.rootDir);
      spinner.succeed(chalk.green(`${type} tests completed`));
    } catch (error) {
      spinner.fail(chalk.red(`Tests failed: ${error.message}`));
    }
  }

  private async buildPlatform(): Promise<void> {
    const spinner = ora('Building platform...').start();
    
    try {
      await this.runCommand('npm', ['run', 'build'], this.rootDir);
      spinner.succeed(chalk.green('Build completed successfully'));
    } catch (error) {
      spinner.fail(chalk.red(`Build failed: ${error.message}`));
    }
  }

  private async setupEnvironment(): Promise<void> {
    console.log(chalk.cyan('\n🔧 Setting up development environment...\n'));
    
    const steps = [
      { name: 'Installing dependencies', cmd: 'npm', args: ['install'] },
      { name: 'Setting up TypeScript', cmd: 'npx', args: ['tsc', '--init'] },
      { name: 'Creating .env file', cmd: 'cp', args: ['.env.example', '.env'] }
    ];

    for (const step of steps) {
      const spinner = ora(step.name).start();
      try {
        await this.runCommand(step.cmd, step.args, this.rootDir);
        spinner.succeed(chalk.green(step.name));
      } catch (error) {
        spinner.warn(chalk.yellow(`${step.name} - skipped or already done`));
      }
    }

    console.log(chalk.green('\n✅ Environment setup complete!\n'));
  }

  private openDocs(): void {
    console.log(chalk.cyan('\n📚 Documentation:\n'));
    console.log('  Main README:', chalk.blue('README.md'));
    console.log('  Architecture:', chalk.blue('llm_rules/HIERARCHICALLY_ENCAPSULATED_ARCHITECTURE.md'));
    console.log('  Testing Guide:', chalk.blue('llm_rules/ROLE_TESTER.md'));
    console.log('  Claude Config:', chalk.blue('CLAUDE.md'));
    console.log('  Feature Status:', chalk.blue('FEATURE.vf.json'));
    console.log('  Task Queue:', chalk.blue('TASK_QUEUE.vf.json'));
    console.log('');
  }

  private async promptContinue(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...')
      }
    ]);
  }

  private runCommand(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, stdio: 'pipe' });
      
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  public run(): void {
    this.program.parse(process.argv);
    
    // If no command provided, show interactive mode
    if (process.argv.length === 2) {
      this.interactiveMode();
    }
  }
}

// Main execution
const cli = new AiDevCLI();
cli.run();