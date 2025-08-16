#!/usr/bin/env node
/**
 * Environment Setup CLI
 * Initialize and manage development environments
 */

import { Command } from "commander";
import chalk from 'chalk';
import { EnvironmentSetupService, EnvironmentConfig } from '../services/EnvironmentSetupService';
import { QEMURuntimeManager } from '../managers/QEMURuntimeManager';
import { path } from '../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


const program = new Command();
const setupService = new EnvironmentSetupService();
const qemuManager = new QEMURuntimeManager();

program
  .name('setup-env')
  .description('Setup and manage development environments')
  .version('1.0.0');

// Initialize setup folder
program
  .command('init')
  .description('Initialize setup folder')
  .option('-d, --dir <path>', 'Setup directory', '.setup')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🔧 Initializing setup folder...'));
      
      await setupService.initialize();
      await qemuManager.initialize();
      
      console.log(chalk.green('✅ Setup folder initialized'));
      console.log(chalk.gray(`   Directory: ${options.dir}`));
      
      // Create example config
      const exampleConfig = {
        environments: {
          qemu: {
            name: 'dev-vm',
            platform: 'x86_64',
            memory: '4G',
            cores: 2,
            debugging: true
          },
          docker: {
            name: 'dev-container',
            image: 'ubuntu:22.04',
            debugging: true
          }
        }
      };
      
      const configPath = path.join(options.dir, 'setup.json');
      await fileAPI.createFile(configPath, JSON.stringify(exampleConfig, { type: FileType.TEMPORARY }));
      console.log(chalk.gray(`   Config: ${configPath}`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Setup QEMU environment
program
  .command('qemu <name>')
  .description('Setup QEMU environment')
  .option('-p, --platform <platform>', 'Platform (x86_64, aarch64)', 'x86_64')
  .option('-m, --memory <size>', 'Memory size', '4G')
  .option('-c, --cores <num>', 'CPU cores', '2')
  .option('-o, --os <os>', 'Operating system', 'ubuntu')
  .option('-d, --debug', 'Enable debugging')
  .option('--port <port>', 'Debug port', '1234')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`🖥️  Setting up QEMU environment: ${name}`));
      
      const config: EnvironmentConfig = {
        type: 'qemu',
        name,
        platform: options.platform,
        architecture: options.platform as any,
        os: options.os,
        memory: options.memory,
        cores: parseInt(options.cores),
        debugging: options.debug ? {
          enabled: true,
          type: 'gdb',
          port: parseInt(options.port)
        } : undefined
      };
      
      const result = await setupService.setupQEMU(config);
      
      console.log(chalk.green('\n✅ QEMU environment ready'));
      console.log(chalk.white('\n📋 Configuration:'));
      console.log(chalk.gray(`   Platform: ${config.platform}`));
      console.log(chalk.gray(`   Memory: ${config.memory}`));
      console.log(chalk.gray(`   Cores: ${config.cores}`));
      
      if (result.ports && Object.keys(result.ports).length > 0) {
        console.log(chalk.white('\n🔌 Ports:'));
        for (const [name, port] of Object.entries(result.ports)) {
          console.log(chalk.gray(`   ${name}: ${port}`));
        }
      }
      
      if (result.scripts.length > 0) {
        console.log(chalk.white('\n📜 Scripts:'));
        for (const script of result.scripts) {
          console.log(chalk.gray(`   ${script}`));
        }
      }
      
      if (result.debugInfo) {
        console.log(chalk.white('\n🐛 Debug Info:'));
        console.log(chalk.gray(`   Port: ${result.debugInfo.port}`));
        console.log(chalk.gray(`   Command: ${result.debugInfo.command}`));
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Setup Docker environment
program
  .command('docker <name>')
  .description('Setup Docker environment')
  .option('-i, --image <image>', 'Docker image', 'ubuntu:22.04')
  .option('-p, --platform <platform>', "Platform", 'linux/amd64')
  .option('-m, --memory <size>', 'Memory limit')
  .option('-c, --cores <num>', 'CPU limit')
  .option('-d, --debug', 'Enable debugging')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`🐳 Setting up Docker environment: ${name}`));
      
      const config: EnvironmentConfig = {
        type: 'docker',
        name,
        os: options.image,
        platform: options.platform,
        memory: options.memory,
        cores: options.cores ? parseInt(options.cores) : undefined,
        debugging: options.debug ? {
          enabled: true,
          type: 'gdb'
        } : undefined
      };
      
      const result = await setupService.setupDocker(config);
      
      console.log(chalk.green('\n✅ Docker environment ready'));
      console.log(chalk.white('\n📋 Command:'));
      console.log(chalk.gray(`   ${result.commands.join(' ')}`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Setup UV Python environment
program
  .command('uv <name>')
  .description('Setup UV Python environment')
  .option('-v, --version <version>', 'Python version', '3.11')
  .option('-d, --debug', 'Install debug packages')
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`🐍 Setting up UV Python environment: ${name}`));
      
      const config: EnvironmentConfig = {
        type: 'uv',
        name,
        version: options.version,
        debugging: options.debug ? {
          enabled: true,
          type: 'dap'
        } : undefined
      };
      
      const result = await setupService.setupUV(config);
      
      console.log(chalk.green('\n✅ UV environment ready'));
      console.log(chalk.white('\n📋 Commands:'));
      for (const cmd of result.commands) {
        console.log(chalk.gray(`   ${cmd}`));
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Build program
program
  .command('build')
  .description('Build hello world program')
  .option('-l, --language <lang>', 'Language (c, cpp, rust, python)', 'c')
  .option('-e, --env <env>', "Environment", 'qemu')
  .action(async (options) => {
    try {
      console.log(chalk.cyan(`🔨 Building hello world (${options.language})...`));
      
      const binary = await setupService.buildHelloWorld(options.env, options.language);
      
      console.log(chalk.green('✅ Build complete'));
      console.log(chalk.gray(`   Binary: ${binary}`));
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Run system test
program
  .command('test')
  .description('Run system test: build and debug in QEMU')
  .action(async () => {
    try {
      await qemuManager.initialize();
      const success = await qemuManager.runSystemTest();
      
      if (success) {
        console.log(chalk.green('\n✅ All tests passed!'));
      } else {
        console.log(chalk.red('\n❌ Tests failed'));
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// List environments
program
  .command('list')
  .description('List configured environments')
  .action(async () => {
    try {
      await qemuManager.initialize();
      const instances = qemuManager.listInstances();
      
      if (instances.length === 0) {
        console.log(chalk.yellow('No environments configured'));
        return;
      }
      
      console.log(chalk.cyan('\n📦 Configured Environments:\n'));
      
      for (const instance of instances) {
        console.log(chalk.white(`${instance.name} (${instance.id})`));
        console.log(chalk.gray(`  Type: ${instance.config.type}`));
        console.log(chalk.gray(`  Status: ${instance.status}`));
        console.log(chalk.gray(`  Platform: ${instance.config.platform || 'default'}`));
        
        if (Object.keys(instance.ports).length > 0) {
          console.log(chalk.gray(`  Ports: ${JSON.stringify(instance.ports)}`));
        }
        console.log();
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}