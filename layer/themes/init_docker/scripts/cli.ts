import { fileAPI } from '../utils/file-api';
#!/usr/bin/env node

import { Command } from "commander";
import { containerEnv } from '../pipe';
import chalk from 'chalk';
import ora from 'ora';
import { path } from '../../infra_external-log-lib/src';
import { fs } from '../../infra_external-log-lib/src';

const program = new Command();

program
  .name('container-env')
  .description('Container environment management CLI')
  .version('1.0.0');

// Build command
program
  .command('build <theme>')
  .description('Build Docker image for a theme')
  .option('-t, --tag <tag>', 'Custom image tag')
  .option('--no-cache', 'Build without cache')
  .action(async (theme, options) => {
    const spinner = ora(`Building ${theme}...`).start();
    try {
      const tag = await containerEnv.buildImage(theme, {
        tag: options.tag,
        noCache: options.noCache
      });
      spinner.succeed(chalk.green(`✅ Built ${tag}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to build ${theme}: ${error}`));
      process.exit(1);
    }
  });

// Dev command
program
  .command('dev <theme>')
  .description('Start development environment')
  .option('-p, --port <port>', 'Port to expose', '3000')
  .option('-d, --debug-port <port>', 'Debug port', '9229')
  .option('--hot-reload', 'Enable hot reload', true)
  .option('--watch', 'Enable file watching', true)
  .action(async (theme, options) => {
    const spinner = ora('Starting development environment...').start();
    try {
      const session = await containerEnv.startDevelopment({
        themeName: theme,
        port: parseInt(options.port),
        debugPort: parseInt(options.debugPort),
        hotReload: options.hotReload,
        watchMode: options.watch
      });
      
      spinner.succeed(chalk.green('✅ Development environment started'));
      console.log(chalk.cyan(`   📍 URL: http://localhost:${session.port}`));
      console.log(chalk.cyan(`   🐛 Debug: chrome://inspect`));
      console.log(chalk.yellow(`   Session ID: ${session.id}`));
      
      // Keep process alive
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n⏹️  Stopping development environment...'));
        await containerEnv.stopDevelopment(session.id);
        process.exit(0);
      });
      
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error}`));
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy <environment>')
  .description('Deploy to environment (local, dev, dev-demo, demo, release)')
  .option('-t, --themes <themes...>', 'Themes to deploy')
  .option('--rebuild', 'Force rebuild images')
  .option('--detach', 'Run in background')
  .action(async (env, options) => {
    const spinner = ora(`Deploying to ${env}...`).start();
    try {
      // Get themes from option or detect from directory
      const themes = options.themes || await detectThemes();
      
      const deployment = await containerEnv.deployToEnvironment(
        env as any,
        themes,
        {
          rebuild: options.rebuild,
          detach: options.detach
        }
      );
      
      spinner.succeed(chalk.green(`✅ Deployed to ${env}`));
      console.log(chalk.cyan(`   ID: ${deployment.id}`));
      console.log(chalk.cyan(`   Services: ${deployment.services.join(', ')}`));
      
    } catch (error) {
      spinner.fail(chalk.red(`Deployment failed: ${error}`));
      process.exit(1);
    }
  });

// Release command
program
  .command('release')
  .description('Deploy to production/release environment')
  .option('-t, --themes <themes...>', 'Themes to release', ['portal_aidev', 'mate-dealer'])
  .option('-r, --replicas <n>', 'Number of replicas', '2')
  .option('--ssl', 'Enable SSL', true)
  .option('--domain <domain>', 'Domain name')
  .option('--monitoring', 'Enable monitoring', true)
  .action(async (options) => {
    const spinner = ora('Deploying to production...').start();
    try {
      const release = await containerEnv.deployRelease({
        themes: options.themes,
        environment: "production",
        replicas: parseInt(options.replicas),
        ssl: options.ssl,
        domain: options.domain,
        monitoring: options.monitoring,
        resources: {
          memory: '2G',
          cpu: '2'
        }
      });
      
      spinner.succeed(chalk.green('✅ Production deployment successful'));
      console.log(chalk.cyan(`   🌐 URL: ${release.url}`));
      console.log(chalk.cyan(`   📊 Version: ${release.version}`));
      console.log(chalk.cyan(`   🚀 Deployment ID: ${release.id}`));
      
    } catch (error) {
      spinner.fail(chalk.red(`Release failed: ${error}`));
      process.exit(1);
    }
  });

// Stop command
program
  .command('stop <environment>')
  .description('Stop environment')
  .action(async (env) => {
    const spinner = ora(`Stopping ${env}...`).start();
    try {
      await containerEnv.stopEnvironment(env as any);
      spinner.succeed(chalk.green(`✅ Stopped ${env}`));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to stop: ${error}`));
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List running containers')
  .option('-a, --all', 'Show all containers')
  .action(async (options) => {
    try {
      const containers = await containerEnv.listContainers(options.all);
      
      if (containers.length === 0) {
        console.log(chalk.yellow('No containers found'));
        return;
      }
      
      console.log(chalk.cyan('\n📦 Containers:\n'));
      containers.forEach(c => {
        const status = c.status.includes('Up') ? chalk.green('●') : chalk.red('●');
        console.log(`${status} ${chalk.white(c.name.padEnd(30))} ${chalk.gray(c.image)}`);
        console.log(`  ${chalk.gray(`ID: ${c.id.slice(0, 12)}`)}`);
        console.log(`  ${chalk.gray(`Status: ${c.status}`)}`);
        if (c.ports.length > 0) {
          console.log(`  ${chalk.gray(`Ports: ${c.ports.join(', ')}`)}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red(`Failed to list containers: ${error}`));
      process.exit(1);
    }
  });

// Logs command
program
  .command('logs <container>')
  .description('Show container logs')
  .option('-f, --follow', 'Follow log output')
  .option('-t, --tail <lines>', 'Number of lines to show', '100')
  .action(async (container, options) => {
    try {
      const logs = await containerEnv.getLogs(container, {
        tail: parseInt(options.tail),
        follow: options.follow
      });
      console.log(logs);
      
      if (options.follow) {
        // Keep process alive for streaming
        process.on('SIGINT', () => {
          process.exit(0);
        });
      }
    } catch (error) {
      console.error(chalk.red(`Failed to get logs: ${error}`));
      process.exit(1);
    }
  });

// Shell command
program
  .command('shell <session-id>')
  .description('Open shell in development container')
  .action(async (sessionId) => {
    try {
      await containerEnv.openDevShell(sessionId);
    } catch (error) {
      console.error(chalk.red(`Failed to open shell: ${error}`));
      process.exit(1);
    }
  });

// Test command
program
  .command('test <session-id>')
  .description('Run tests in development container')
  .option('-w, --watch', 'Run in watch mode')
  .action(async (sessionId, options) => {
    const spinner = ora('Running tests...').start();
    try {
      const result = await containerEnv.runDevTests(sessionId, options.watch);
      spinner.stop();
      console.log(result);
    } catch (error) {
      spinner.fail(chalk.red(`Tests failed: ${error}`));
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats <container>')
  .description('Show container statistics')
  .action(async (container) => {
    try {
      const stats = await containerEnv.getStats(container);
      
      console.log(chalk.cyan('\n📊 Container Statistics:\n'));
      console.log(`  CPU Usage: ${chalk.yellow(`${stats.cpu.toFixed(2)}%`)}`);
      console.log(`  Memory: ${chalk.yellow(formatBytes(stats.memory.usage))} / ${chalk.gray(formatBytes(stats.memory.limit))}`);
      console.log(`  Network RX: ${chalk.green(formatBytes(stats.network.rx))}`);
      console.log(`  Network TX: ${chalk.blue(formatBytes(stats.network.tx))}`);
      console.log(`  Block I/O Read: ${chalk.gray(formatBytes(stats.blockIO.read))}`);
      console.log(`  Block I/O Write: ${chalk.gray(formatBytes(stats.blockIO.write))}`);
      
    } catch (error) {
      console.error(chalk.red(`Failed to get stats: ${error}`));
      process.exit(1);
    }
  });

// Clean command
program
  .command('clean')
  .description('Clean up stopped containers and unused volumes')
  .option('-v, --volumes', 'Also remove volumes')
  .action(async (options) => {
    const spinner = ora('Cleaning up...').start();
    try {
      // Get all containers
      const containers = await containerEnv.listContainers(true);
      const stopped = containers.filter(c => !c.status.includes('Up'));
      
      // Remove stopped containers
      for (const container of stopped) {
        await containerEnv.removeContainer(container.id, true);
      }
      
      spinner.succeed(chalk.green(`✅ Cleaned up ${stopped.length} containers`));
      
      if (options.volumes) {
        console.log(chalk.yellow('Volume cleanup must be done manually with: docker volume prune'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Cleanup failed: ${error}`));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate <theme>')
  .description('Validate theme folder structure')
  .action(async (theme) => {
    const spinner = ora('Validating...').start();
    try {
      const result = await containerEnv.validateFolderStructure(theme);
      
      if (result.valid) {
        spinner.succeed(chalk.green('✅ Folder structure is valid'));
      } else {
        spinner.fail(chalk.red('❌ Invalid folder structure'));
        console.log(chalk.red(`   Missing: ${result.missing.join(', ')}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(w => console.log(`   ${w}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Validation failed: ${error}`));
      process.exit(1);
    }
  });

// Helper functions
async function detectThemes(): Promise<string[]> {
  const themesDir = path.join(process.cwd(), 'layer', 'themes');
  const entries = await fs.promises.readdir(themesDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => !name.startsWith('.'));
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size > 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}