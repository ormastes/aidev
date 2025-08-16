/**
 * MCP Configuration Setup
 * Handles MCP server configuration for Claude Desktop integration
 */

import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import * as os from 'os';
import chalk from 'chalk';

export interface MCPSetupOptions {
  targetDir: string;
  userWide?: boolean;
  deployedEnvironment?: boolean;
}

export class MCPSetup {
  private targetDir: string;
  private userWide: boolean;
  private deployedEnvironment: boolean;

  constructor(options: MCPSetupOptions) {
    this.targetDir = options.targetDir;
    this.userWide = options.userWide || false;
    this.deployedEnvironment = options.deployedEnvironment || false;
  }

  /**
   * Log informational message
   */
  private log(message: string): void {
    console.log(chalk.blue(`[INFO] ${message}`));
  }

  /**
   * Log success message
   */
  private logSuccess(message: string): void {
    console.log(chalk.green(`[SUCCESS] ${message}`));
  }

  /**
   * Log error message
   */
  private logError(message: string): void {
    console.error(chalk.red(`[ERROR] ${message}`));
  }

  /**
   * Get the Claude configuration directory based on the current OS
   */
  private getClaudeConfigDir(): string {
    const platform = os.platform();
    const homeDir = os.homedir();

    switch (platform) {
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Claude');
      case 'linux':
        return path.join(homeDir, '.config', 'Claude');
      case 'win32':
        return path.join(process.env.APPDATA || '', 'Claude');
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Generate MCP configuration JSON
   */
  private generateMCPConfig(aidevPath: string): any {
    return {
      mcpServers: {
        aidev: {
          command: 'node',
          args: [path.join(aidevPath, 'scripts', 'mcp-server.js')],
          env: {
            AIDEV_ROOT: aidevPath,
            IS_DEPLOYED: this.deployedEnvironment ? 'true' : 'false'
          }
        },
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', aidevPath]
        }
      }
    };
  }

  /**
   * Install MCP configuration locally
   */
  private async installLocal(): Promise<void> {
    this.log('Installing MCP configuration locally...');
    
    const localConfigDir = path.join(this.targetDir, 'config', 'claude');
    await fs.promises.mkdir(localConfigDir, { recursive: true });

    const configPath = path.join(localConfigDir, 'claude_desktop_config.json');
    const config = this.generateMCPConfig(this.targetDir);
    
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    this.logSuccess(`MCP configuration installed locally at: ${localConfigDir}`);
    this.log('Note: To use this local configuration, you need to:');
    this.log('1. Copy the config to your Claude directory');
    this.log('2. Or run with --user-wide flag for automatic installation');
  }

  /**
   * Install MCP configuration system-wide
   */
  private async installUserWide(): Promise<void> {
    this.log('Installing MCP configuration system-wide...');
    
    const claudeConfigDir = this.getClaudeConfigDir();
    await fs.promises.mkdir(claudeConfigDir, { recursive: true });

    const configPath = path.join(claudeConfigDir, 'claude_desktop_config.json');
    
    // Backup existing config if present
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.backup`;
      this.log('Backing up existing configuration...');
      await fs.promises.copyFile(configPath, backupPath);
    }

    const config = this.generateMCPConfig(this.targetDir);
    
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    this.logSuccess('MCP configuration installed system-wide');
  }

  /**
   * Set up MCP configuration
   */
  async setup(): Promise<void> {
    try {
      this.log('Setting up MCP configuration...');

      if (this.userWide) {
        await this.installUserWide();
      } else {
        await this.installLocal();
      }

      this.logSuccess('MCP configuration setup complete');
      
      // Display next steps
      this.log('\nNext steps:');
      if (this.userWide) {
        this.log('1. Restart Claude Desktop');
        this.log('2. The aidev MCP server will be available');
        this.log('3. Start using the aidev tools!');
      } else {
        this.log('1. Copy the local config to your Claude directory (or rerun with --user-wide)');
        this.log('2. Restart Claude Desktop');
        this.log('3. The aidev MCP server will be available');
      }
      this.log('\nTo verify installation, check for MCP icon in Claude Desktop');

    } catch (error) {
      this.logError(`Failed to set up MCP configuration: ${error}`);
      throw error;
    }
  }

  /**
   * Check if deployed environment setup is needed
   */
  isDeployedEnvironment(): boolean {
    return this.deployedEnvironment;
  }
}