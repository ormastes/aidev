#!/usr/bin/env bun
/**
 * Migration script from npm to bun
 * This script helps migrate the AI Development Platform from npm to bun
 * Converted to TypeScript for better security and maintainability
 */

import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { glob } from 'glob';
import readline from 'readline';

// Colors for output
const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  CYAN: '\x1b[0;36m',
  NC: '\x1b[0m',
};

// Logging functions
const log = {
  info: (msg: string) => console.log(`${colors.BLUE}[INFO]${colors.NC} ${msg}`),
  success: (msg: string) => console.log(`${colors.GREEN}[SUCCESS]${colors.NC} ${msg}`),
  warning: (msg: string) => console.log(`${colors.YELLOW}[WARNING]${colors.NC} ${msg}`),
  error: (msg: string) => console.log(`${colors.RED}[ERROR]${colors.NC} ${msg}`),
};

class BunMigrator {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Check if bun is installed
  checkBunInstallation(): boolean {
    try {
      const version = execSync('bun --version', { encoding: 'utf8' }).trim();
      log.success(`Bun is installed: v${version}`);
      return true;
    } catch {
      log.error('Bun is not installed');
      console.log('\nPlease install bun first:');
      console.log('  curl -fsSL https://bun.sh/install | bash');
      console.log('  OR');
      console.log('  npm install -g bun');
      console.log('\nFor more information: https://bun.sh');
      return false;
    }
  }

  // Ask user for confirmation
  async askConfirmation(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  // Clean node_modules directories
  async cleanNodeModules(): Promise<void> {
    log.info('Cleaning existing node_modules directories...');
    
    const nodeModuleDirs = glob.sync('**/node_modules', {
      ignore: ['**/node_modules/**/node_modules'],
      dot: true
    });
    
    let count = 0;
    for (const dir of nodeModuleDirs) {
      if (existsSync(dir)) {
        log.info(`Removing ${dir}`);
        rmSync(dir, { recursive: true, force: true });
        count++;
      }
    }
    
    if (count > 0) {
      log.success(`Removed ${count} node_modules directories`);
    } else {
      log.info('No node_modules directories found');
    }
  }

  // Clean package-lock.json files
  async cleanPackageLocks(): Promise<void> {
    log.info('Cleaning package-lock.json files...');
    
    const lockFiles = glob.sync('**/package-lock.json', {
      ignore: ['**/node_modules/**']
    });
    
    let count = 0;
    for (const file of lockFiles) {
      if (existsSync(file)) {
        log.info(`Removing ${file}`);
        rmSync(file);
        count++;
      }
    }
    
    if (count > 0) {
      log.success(`Removed ${count} package-lock.json files`);
    } else {
      log.info('No package-lock.json files found');
    }
  }

  // Install dependencies with bun
  async installWithBun(): Promise<void> {
    log.info('Installing dependencies with bun...');
    
    // Install root dependencies
    if (existsSync('package.json')) {
      log.info('Installing root dependencies...');
      execSync('bun install', { stdio: 'inherit' });
      log.success('Root dependencies installed');
    }
    
    // Find and install theme dependencies
    const themeDirs = glob.sync('layer/themes/*/package.json');
    for (const packageFile of themeDirs) {
      const dir = packageFile.replace('/package.json', '');
      log.info(`Installing dependencies for ${dir}...`);
      execSync('bun install', { cwd: dir, stdio: 'inherit' });
    }
    
    // Find and install user story dependencies
    const storyDirs = glob.sync('layer/themes/*/user-stories/*/package.json');
    for (const packageFile of storyDirs) {
      const dir = packageFile.replace('/package.json', '');
      log.info(`Installing dependencies for ${dir}...`);
      execSync('bun install', { cwd: dir, stdio: 'inherit' });
    }
    
    log.success('All dependencies installed with bun');
  }

  // Create bun configuration
  createBunConfig(): void {
    log.info('Creating bun configuration...');
    
    if (!existsSync('bunfig.toml')) {
      const config = `# Bun configuration for AI Development Platform

[install]
# Use the local node_modules folder
globalDir = "~/.bun/install/global"
# Install peer dependencies automatically
peer = true
# Production mode - skip devDependencies in production
production = false

[install.lockfile]
# Save exact versions
save = true
# Print a yarn-like lockfile
print = "yarn"

[install.cache]
# Use a shared global cache
dir = "~/.bun/install/cache"
# Disable cache for CI
disable = false

[test]
# Test runner configuration
preload = ["./test-setup.ts"]
coverage = true
coverageThreshold = {
  line = 80,
  function = 80,
  branch = 80,
  statement = 80
}

[run]
# Auto-install missing packages when running scripts
autoInstall = true`;

      writeFileSync('bunfig.toml', config);
      log.success('Created bunfig.toml');
    } else {
      log.info('bunfig.toml already exists');
    }
  }

  // Verify migration
  verifyMigration(): boolean {
    log.info('Verifying migration...');
    
    // Test basic bun commands
    try {
      execSync('bun --version', { stdio: 'ignore' });
      log.success('Bun command works');
    } catch {
      log.error('Bun command failed');
      return false;
    }
    
    // Check if bun.lockb was created
    if (existsSync('bun.lockb')) {
      log.success('Bun lockfile created');
    } else {
      log.warning('Bun lockfile not found (will be created on first install)');
    }
    
    // Try running a simple test
    if (existsSync('package.json')) {
      try {
        execSync('bun run --help', { stdio: 'ignore' });
        log.success('Bun run command works');
      } catch {
        log.error('Bun run command failed');
        return false;
      }
    }
    
    log.success('Migration verification completed');
    return true;
  }

  // Main migration process
  async run(): Promise<void> {
    console.log(`${colors.CYAN}=== Bun Migration Script ===${colors.NC}`);
    console.log('This script will migrate your AI Development Platform from npm to bun\n');
    
    // Check if bun is installed
    if (!this.checkBunInstallation()) {
      process.exit(1);
    }
    
    console.log();
    const cleanFiles = await this.askConfirmation('Do you want to clean existing node_modules and package-lock.json files? (y/N): ');
    
    if (cleanFiles) {
      await this.cleanNodeModules();
      await this.cleanPackageLocks();
    }
    
    console.log();
    const installDeps = await this.askConfirmation('Do you want to install all dependencies with bun? (Y/n): ');
    
    if (installDeps) {
      await this.installWithBun();
    }
    
    // Create bun configuration
    this.createBunConfig();
    
    // Verify migration
    this.verifyMigration();
    
    console.log(`\n${colors.GREEN}=== Migration Complete ===${colors.NC}\n`);
    console.log('Next steps:');
    console.log('1. Test your setup: bun test');
    console.log('2. Run development: bun run dev');
    console.log('3. Build project: bun run build\n');
    console.log('Bun commands reference:');
    console.log('  bun install         - Install dependencies');
    console.log('  bun run <script>    - Run package.json scripts');
    console.log('  bun test            - Run tests');
    console.log('  bun x <package>     - Execute package (like npx)\n');
    console.log('For more information: https://bun.sh/docs');
    
    this.rl.close();
  }
}

// Run the migrator
const migrator = new BunMigrator();
migrator.run().catch(error => {
  log.error(`Migration failed: ${error.message}`);
  process.exit(1);
});