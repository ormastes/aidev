import * as fs from 'fs-extra';
import { path } from '../../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { BaseSetupOptions, Mode, DeploymentType, PORT_ALLOCATIONS } from '../types';
import { getFileAPI, FileType } from '../../../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export abstract class BaseSetup {
  protected appName: string;
  protected mode: Mode;
  protected skipDb: boolean;
  protected deploymentType: DeploymentType;
  protected baseDir: string;
  protected deployDir: string;
  protected dbName: string;
  protected dbUser: string;
  protected dbPassword: string;

  constructor(options: BaseSetupOptions, deploymentType: DeploymentType) {
    this.appName = options.appName;
    this.mode = options.mode;
    this.skipDb = options.skipDb || false;
    this.deploymentType = deploymentType;
    this.baseDir = process.cwd();
    this.deployDir = this.getDeployDir();
    this.dbName = `${this.appName}_${deploymentType}`;
    this.dbUser = `${this.appName}_user`;
    this.dbPassword = this.getDbPassword();
  }

  abstract getDeployDir(): string;
  abstract getDbPassword(): string;
  abstract getEnvConfig(): string;
  abstract createDeploymentConfig(): Promise<boolean>;
  abstract printSuccessMessage(): void;

  protected async getPortAllocation(): number {
    let key: keyof typeof PORT_ALLOCATIONS = 'demo';
    if (this.deploymentType === 'release') {
      key = "production";
    } else if (['epic', 'theme', 'story'].includes(this.deploymentType)) {
      key = 'agile';
    } else if (this.deploymentType === 'test') {
      key = 'test';
    } else if (this.deploymentType === 'demo') {
      key = 'demo';
    }
    const allocation = PORT_ALLOCATIONS[key];
    return allocation.main;
  }

  protected async checkPortAvailability(port: number): Promise<boolean> {
    try {
      execSync(`lsof -i:${port}`, { stdio: 'ignore' });
      return false; // Port is in use
    } catch {
      return true; // Port is available
    }
  }

  protected async checkRequirements(): Promise<boolean> {
    const spinner = ora('Checking requirements...').start();
    
    const requirements = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' }
    ];

    for (const req of requirements) {
      try {
        const version = execSync(req.command, { encoding: 'utf-8' }).trim();
        spinner.succeed(`${req.name} is installed: ${version}`);
      } catch {
        spinner.fail(`${req.name} is not installed`);
        return false;
      }
    }

    // PostgreSQL is optional
    try {
      const pgVersion = execSync('psql --version', { encoding: 'utf-8' }).trim();
      spinner.succeed(`PostgreSQL is installed: ${pgVersion}`);
    } catch {
      spinner.warn('PostgreSQL not found. Will use SQLite fallback.');
    }

    return true;
  }

  protected async createDirectoryStructure(): Promise<boolean> {
    const spinner = ora('Creating directory structure...').start();
    
    try {
      const dirs = [
        this.deployDir,
        path.join(this.deployDir, 'config'),
        path.join(this.deployDir, 'logs'),
        path.join(this.deployDir, 'data'),
        path.join(this.deployDir, 'public'),
        // HEA structure for src
        path.join(this.deployDir, 'src'),
        path.join(this.deployDir, 'src/core'),
        path.join(this.deployDir, 'src/core/pipe'),
        path.join(this.deployDir, 'src/feature'),
        path.join(this.deployDir, 'src/feature/pipe'),
        path.join(this.deployDir, 'src/external_interface'),
        path.join(this.deployDir, 'src/external_interface/pipe'),
        path.join(this.deployDir, 'src/user_interface'),
        path.join(this.deployDir, 'src/user_interface/pipe'),
        // HEA structure for tests
        path.join(this.deployDir, 'tests'),
        path.join(this.deployDir, 'tests/environment'),
        path.join(this.deployDir, 'tests/external'),
        path.join(this.deployDir, 'tests/unit/core'),
        path.join(this.deployDir, 'tests/unit/feature'),
        path.join(this.deployDir, 'tests/unit/external_interface'),
        path.join(this.deployDir, 'tests/unit/user_interface'),
        path.join(this.deployDir, 'tests/feature'),
        path.join(this.deployDir, 'tests/system/cli'),
        path.join(this.deployDir, 'tests/system/gui')
      ];

      for (const dir of dirs) {
        await fs.ensureDir(dir);
      }

      spinner.succeed('Created directory structure');
      
      // Create pipe gateway files
      await this.createPipeGateways();
      
      return true;
    } catch (error) {
      spinner.fail(`Failed to create directories: ${error}`);
      return false;
    }
  }

  protected async createPipeGateways(): Promise<void> {
    const layers = ['core', 'feature', 'external_interface', 'user_interface'];
    
    for (const layer of layers) {
      const pipeContent = `/**
 * ${layer.charAt(0).toUpperCase() + layer.slice(1).replace('_', ' ')} layer pipe gateway
 * All external access to ${layer} layer must go through this file
 */

// Export ${layer} functionality here
export {};
`;
      
      await fileAPI.createFile(path.join(this.deployDir, 'src', { type: FileType.TEMPORARY }),
        pipeContent
      );
    }
    
    // Create HEA README
    const heaReadme = `# HEA (Hierarchical Encapsulation Architecture) Structure

This project follows the HEA pattern with these layers:

## Layer Structure

### core/
Business logic (shared) - The heart of the application
- Pure business rules
- No external dependencies
- Testable in isolation

### feature/
Application features - Orchestrates business logic
- Uses core layer functionality
- Implements use cases
- Feature-specific logic

### external_interface/
External integrations - Connects to outside world
- API clients
- Database connections
- Third-party services

### user_interface/
User interaction layer - How users interact
- CLI interfaces
- GUI components
- Network endpoints

## Dependency Rules

The dependency flow is unidirectional:
\`\`\`
user_interface → external_interface → feature → core
\`\`\`

- Core has no dependencies on other layers
- Feature depends only on core
- External interface depends on feature and core
- User interface depends on all other layers

## Pipe Gateways

Each layer has a \`pipe/index.ts\` file that serves as the single entry point.
All cross-layer communication must go through these gateways.
`;
    
    await fileAPI.createFile(path.join(this.deployDir, 'src', { type: FileType.TEMPORARY });
  }

  protected async createEnvFile(): Promise<boolean> {
    const spinner = ora('Creating environment configuration...').start();
    
    try {
      const envContent = this.getEnvConfig();
      const envPath = path.join(this.deployDir, '.env');
      await fileAPI.createFile(envPath, envContent);
      
      spinner.succeed(`Created .env file for ${this.deploymentType} environment`);
      return true;
    } catch (error) {
      spinner.fail(`Failed to create .env file: ${error}`);
      return false;
    }
  }

  protected async createTaskQueue(): Promise<boolean> {
    const spinner = ora(`Creating task queue in ${this.mode.toUpperCase()} mode...`).start();
    
    try {
      if (this.mode === 'vf') {
        // Create TASK_QUEUE.vf.json following filesystem MCP schema
        const taskQueue = {
          taskQueues: {
            critical: [], { type: FileType.TEMPORARY }).toISOString(),
            totalTasks: 0,
            completedTasks: 0,
            workflowSteps: {
              "1": "Adhoc/Temp User Request Queue",
              "2": "User Story Queue",
              "3": "Scenarios Queue",
              "4": "Main Implementation Queue",
              "5": "Tests Implementation Queue", 
              "6": "Integration Tests Implement Queue",
              "7": "Test Fixes Queue",
              "8": "UI Implementation Queue",
              "9": "System Tests Queue",
              "10": "Coverage and Duplication Queue",
              "11": "Documentation Queue",
              "12": "Post Implementation Queue"
            }
          }
        };
        
        await fs.writeJson(
          path.join(this.deployDir, 'TASK_QUEUE.vf.json'),
          taskQueue,
          { spaces: 2 }
        );
        
        // Create NAME_ID.vf.json
        await fs.writeJson(
          path.join(this.deployDir, 'NAME_ID.vf.json'),
          {},
          { spaces: 2 }
        );
        
        spinner.succeed('Created VF mode task queue files');
      } else {
        // Create TASK_QUEUE.md
        const taskQueueMd = `# Task Queue

## Working Item
None

## High Priority Queue

## Medium Priority Queue

## Low Priority Queue

---
*Generated on ${new Date().toISOString()}*
`;
        await fileAPI.createFile(path.join(this.deployDir, 'TASK_QUEUE.md'), { type: FileType.TEMPORARY })
      );
      
      const mcpConfig = {
        mcpServers: {
          filesystem_mcp: {
            command: 'node',
            args: [mcpServerPath],
            env: {
              NODE_ENV: this.deploymentType,
              VF_BASE_PATH: '.'
            }
          }
        },
        globalShortcuts: {
          vf_read: 'filesystem_mcp',
          vf_write: 'filesystem_mcp',
          vf_list_features: 'filesystem_mcp',
          vf_get_tasks: 'filesystem_mcp',
          vf_pop_task: 'filesystem_mcp',
          vf_complete_task: 'filesystem_mcp',
          vf_push_task: 'filesystem_mcp',
          vf_get_name_id: 'filesystem_mcp',
          vf_set_name_id: 'filesystem_mcp'
        }
      };
      
      // Create both config files for compatibility
      await fs.writeJson(
        path.join(this.deployDir, 'config', 'mcp-agent.json'),
        mcpConfig,
        { spaces: 2 }
      );
      
      // Also create claude_config.json at the root of the deploy dir
      await fs.writeJson(
        path.join(this.deployDir, 'claude_config.json'),
        mcpConfig,
        { spaces: 2 }
      );
      
      // Create default FEATURE.vf.json following filesystem MCP schema
      const featureVf = {
        [this.appName]: [],
        metadata: {
          version: "2.0.0",
          description: `${this.appName} ${this.deploymentType} deployment features`,
          lastUpdated: new Date().toISOString(),
          level: this.deploymentType === 'theme' ? 'theme' : 'root',
          aggregatesChildren: false
        }
      };
      
      await fs.writeJson(
        path.join(this.deployDir, 'FEATURE.vf.json'),
        featureVf,
        { spaces: 2 }
      );
      
      // Create default FILE_STRUCTURE.vf.json following filesystem MCP schema
      const fileStructure = {
        metadata: {
          level: this.deploymentType === 'theme' ? 'theme' : 'root',
          version: "2.1.0",
          description: `File structure definition for ${this.appName} ${this.deploymentType}`,
          supports_distributed_features: true,
          supports_freeze: true,
          freeze_validation: "When freeze is true on a directory, filesystem-mcp will reject file creation and show the allowed structure"
        },
        templates: {
          [this.deploymentType]: {
            id: this.deploymentType,
            type: "directory",
            feature_level: this.deploymentType === 'theme' ? 'theme' : 'root',
            has_feature_file: true,
            freeze: false,
            description: `${this.deploymentType} root directory`,
            comment: `Root folder for ${this.appName}`,
            required_children: [
              { name: "src", type: "directory", comment: "Source code" },
              { name: "test", type: "directory", comment: "Test files" },
              { name: "config", type: "directory", comment: "Configuration files" },
              { name: "data", type: "directory", comment: "Data storage" },
              { name: "logs", type: "directory", comment: "Log files" },
              { name: "public", type: "directory", comment: "Public assets" },
              { name: "TASK_QUEUE.vf.json", type: "file", comment: "Virtual filesystem task queue with priority support" },
              { name: "FEATURE.vf.json", type: "feature_file", feature_level: this.deploymentType === 'theme' ? 'theme' : 'root', comment: "Feature definitions" },
              { name: "FILE_STRUCTURE.vf.json", type: "file", comment: "File structure definition" },
              { name: "NAME_ID.vf.json", type: "file", comment: "Name-based entity storage" }
            ]
          }
        }
      };
      
      await fs.writeJson(
        path.join(this.deployDir, 'FILE_STRUCTURE.vf.json'),
        fileStructure,
        { spaces: 2 }
      );
      
      spinner.succeed('Created MCP configuration and VF files');
      return true;
    } catch (error) {
      spinner.fail(`Failed to create MCP config: ${error}`);
      return false;
    }
  }

  public async run(): Promise<boolean> {
    console.log(chalk.yellow(`\n${'='.repeat(50)}`));
    console.log(chalk.yellow(`Setting up ${this.deploymentType} environment for '${this.appName}'`));
    console.log(chalk.yellow(`Mode: ${this.mode.toUpperCase()}`));
    console.log(chalk.yellow(`${'='.repeat(50)}\n`));

    const steps = [
      { name: 'Check Requirements', fn: () => this.checkRequirements() },
      { name: 'Create Directories', fn: () => this.createDirectoryStructure() },
      { name: 'Create Environment', fn: () => this.createEnvFile() },
      { name: 'Create Task Queue', fn: () => this.createTaskQueue() },
      { name: 'Create MCP Config', fn: () => this.createMcpConfig() },
      { name: 'Create Deployment Config', fn: () => this.createDeploymentConfig() }
    ];

    for (const step of steps) {
      const success = await step.fn();
      if (!success) {
        console.error(chalk.red(`\n❌ Failed at step: ${step.name}`));
        return false;
      }
    }

    this.printSuccessMessage();
    return true;
  }
}