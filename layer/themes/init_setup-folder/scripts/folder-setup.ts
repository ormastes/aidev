#!/usr/bin/env bun
/**
 * Setup script for deploying aidev folder structure with MCP configuration
 * Converted from shell script to TypeScript for better maintainability and security
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, readdirSync, statSync } from '../../layer/themes/infra_external-log-lib/src';
import { join, dirname, basename } from 'node:path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Colors for output
const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  NC: '\x1b[0m', // No Color
};

// Logging functions
const log = {
  info: (msg: string) => console.log(`${colors.BLUE}[INFO]${colors.NC} ${msg}`),
  success: (msg: string) => console.log(`${colors.GREEN}[SUCCESS]${colors.NC} ${msg}`),
  warning: (msg: string) => console.log(`${colors.YELLOW}[WARNING]${colors.NC} ${msg}`),
  error: (msg: string) => console.log(`${colors.RED}[ERROR]${colors.NC} ${msg}`),
};

class FolderSetup {
  private scriptDir: string;
  private projectRoot: string;
  private targetDir: string;
  private mode: string;

  constructor() {
    // Get script directory and project root
    this.scriptDir = dirname(fileURLToPath(import.meta.url));
    this.projectRoot = join(this.scriptDir, '..', '..');
    
    // Parse arguments
    const args = process.argv.slice(2);
    this.targetDir = args[0] || './aidev';
    this.mode = args[1] || 'demo';
  }

  // Check if bun is available
  checkBun(): boolean {
    try {
      execSync('bun --version', { stdio: 'ignore' });
      log.success('Using bun as package manager');
      return true;
    } catch {
      log.error('Bun is required but not found!');
      console.log('Please install bun: curl -fsSL https://bun.sh/install | bash');
      return false;
    }
  }

  // Check if target directory already exists
  checkTargetDirectory(): boolean {
    if (existsSync(this.targetDir)) {
      log.warning(`Target directory ${this.targetDir} already exists`);
      console.log('Do you want to overwrite it? (y/N): ');
      // In TypeScript/Node, we need to handle user input differently
      // For now, we'll skip the prompt and return false
      log.info('Aborting setup - directory exists');
      return false;
    }
    return true;
  }

  // Create directory structure
  createDirectoryStructure(): void {
    log.info(`Creating directory structure at ${this.targetDir}`);
    
    // Core directories
    const dirs = [
      this.targetDir,
      join(this.targetDir, 'scripts'),
      join(this.targetDir, 'scripts', 'core'),
      join(this.targetDir, 'scripts', 'setup'),
      join(this.targetDir, 'scripts', 'utils'),
      join(this.targetDir, 'config'),
      join(this.targetDir, 'config', 'mcp'),
      join(this.targetDir, 'config', "typescript"),
      join(this.targetDir, 'config', 'testing'),
      join(this.targetDir, 'docs'),
      join(this.targetDir, 'llm_rules'),
      join(this.targetDir, "templates"),
      join(this.targetDir, "templates", 'llm_rules'),
      join(this.targetDir, 'gen'),
      join(this.targetDir, 'gen', 'doc'),
      join(this.targetDir, 'gen', 'history', "retrospect"),
      join(this.targetDir, 'layer'),
      join(this.targetDir, 'layer', 'themes'),
      join(this.targetDir, 'src'),
      join(this.targetDir, 'tests'),
    ];

    dirs.forEach(dir => {
      mkdirSync(dir, { recursive: true });
    });
    
    log.success('Directory structure created');
  }

  // Copy a directory recursively
  copyDirRecursive(src: string, dest: string): void {
    if (!existsSync(src)) return;
    
    mkdirSync(dest, { recursive: true });
    
    const entries = readdirSync(src);
    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      
      if (statSync(srcPath).isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  // Copy essential files
  copyEssentialFiles(): void {
    log.info('Copying essential files');
    
    // Copy CLAUDE.md
    const claudePath = join(this.projectRoot, 'CLAUDE.md');
    if (existsSync(claudePath)) {
      copyFileSync(claudePath, join(this.targetDir, 'CLAUDE.md'));
      log.success('Copied CLAUDE.md');
    } else {
      log.error('CLAUDE.md not found in source');
    }
    
    // Copy llm_rules directory
    const llmRulesPath = join(this.projectRoot, 'llm_rules');
    if (existsSync(llmRulesPath)) {
      this.copyDirRecursive(llmRulesPath, join(this.targetDir, 'llm_rules'));
      log.success('Copied llm_rules directory');
    } else {
      log.warning('llm_rules directory not found in source');
    }
    
    // Copy other essential files
    const files = ['README.md', 'FEATURE.vf.json', 'TASK_QUEUE.vf.json', 'FILE_STRUCTURE.vf.json', 'NAME_ID.vf.json'];
    files.forEach(file => {
      const srcPath = join(this.projectRoot, file);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, join(this.targetDir, file));
        log.success(`Copied ${file}`);
      } else {
        log.warning(`${file} not found in source`);
      }
    });
    
    // Copy documentation
    const docsPath = join(this.projectRoot, 'docs');
    if (existsSync(docsPath)) {
      this.copyDirRecursive(docsPath, join(this.targetDir, 'docs'));
      log.success('Copied documentation');
    }
    
    // Copy templates
    const templatesPath = join(this.projectRoot, "templates");
    if (existsSync(templatesPath)) {
      this.copyDirRecursive(templatesPath, join(this.targetDir, "templates"));
      log.success('Copied templates');
    }
    
    // Copy setup-folder theme
    const setupFolderPath = join(this.projectRoot, 'layer', 'themes', 'setup-folder');
    if (existsSync(setupFolderPath)) {
      const destPath = join(this.targetDir, 'layer', 'themes', 'setup-folder');
      this.copyDirRecursive(setupFolderPath, destPath);
      log.success('Copied setup-folder theme');
    } else {
      log.warning('setup-folder theme not found in source');
    }
  }

  // Create MCP configuration
  createMCPConfiguration(): void {
    log.info('Creating MCP configuration');
    
    // Create Claude Desktop configuration directory
    const claudeConfigDir = join(this.targetDir, 'config', 'claude');
    mkdirSync(claudeConfigDir, { recursive: true });
    
    // Create MCP server configuration
    const mcpConfig = {
      mcpServers: {
        aidev: {
          command: 'node',
          args: ['${AIDEV_PATH}/scripts/mcp-server.js'],
          env: {
            AIDEV_ROOT: '${AIDEV_PATH}'
          }
        },
        filesystem: {
          command: 'bunx',
          args: ['@modelcontextprotocol/server-filesystem', '${AIDEV_PATH}']
        }
      }
    };
    
    writeFileSync(
      join(claudeConfigDir, 'claude_desktop_config.json'),
      JSON.stringify(mcpConfig, null, 2)
    );
    
    // Create MCP agent configuration
    const agentConfig = {
      agents: {
        architect: {
          description: 'System architecture and design',
          capabilities: ['design', "architecture", "patterns"],
          tools: ["filesystem", 'search', 'edit']
        },
        developer: {
          description: 'Implementation and coding',
          capabilities: ['coding', 'testing', "debugging"],
          tools: ["filesystem", 'edit', 'bash', 'git']
        },
        tester: {
          description: 'Testing and quality assurance',
          capabilities: ['testing', "coverage", 'e2e'],
          tools: ["filesystem", 'bash', "playwright"]
        },
        gui: {
          description: 'GUI design and implementation',
          capabilities: ['ui', 'ux', 'design'],
          tools: ["filesystem", 'edit', 'preview']
        }
      }
    };
    
    writeFileSync(
      join(this.targetDir, 'config', 'mcp', 'mcp-agent.json'),
      JSON.stringify(agentConfig, null, 2)
    );
    
    log.success('Created MCP configuration');
  }

  // Create package.json for MCP server
  createPackageJson(): void {
    log.info('Creating package.json for MCP server');
    
    const packageJson = {
      name: 'aidev-mcp-server',
      version: '1.0.0',
      description: 'MCP server for aidev environment',
      main: 'mcp-server.js',
      scripts: {
        start: 'node mcp-server.js'
      },
      dependencies: {
        '@modelcontextprotocol/sdk': '^0.5.0'
      },
      engines: {
        node: '>=18.0.0'
      }
    };
    
    writeFileSync(
      join(this.targetDir, 'scripts', 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    log.success('Created package.json');
  }

  // Install dependencies if in release mode
  installDependencies(): void {
    if (this.mode === 'release') {
      log.info('Installing MCP server dependencies');
      const scriptsDir = join(this.targetDir, 'scripts');
      
      try {
        execSync('bun install', { cwd: scriptsDir, stdio: 'inherit' });
        log.success('Dependencies installed');
      } catch (error) {
        log.warning('Failed to install dependencies');
      }
    }
  }

  // Main execution
  async run(): Promise<void> {
    console.log(`${colors.BLUE}=== Aidev Folder Setup ===${colors.NC}`);
    console.log(`Target directory: ${this.targetDir}`);
    console.log(`Mode: ${this.mode}`);
    console.log();
    
    // Check requirements
    if (!this.checkBun()) {
      process.exit(1);
    }
    
    if (!this.checkTargetDirectory()) {
      process.exit(1);
    }
    
    // Execute setup steps
    this.createDirectoryStructure();
    this.copyEssentialFiles();
    this.createMCPConfiguration();
    this.createPackageJson();
    this.installDependencies();
    
    // Success message
    console.log();
    console.log(`${colors.GREEN}=== Setup Complete ===${colors.NC}`);
    console.log(`${colors.GREEN}✅ Aidev environment created at: ${this.targetDir}${colors.NC}`);
    console.log();
    console.log('Next steps:');
    console.log(`1. cd ${this.targetDir}`);
    console.log('2. ./setup.sh');
    console.log('3. Restart Claude Desktop');
    console.log();
    
    if (this.mode === 'demo') {
      console.log('This is a DEMO setup - perfect for testing and evaluation');
    } else {
      console.log('This is a RELEASE setup - ready for production deployment');
    }
  }
}

// Run the setup
const setup = new FolderSetup();
setup.run().catch(error => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});