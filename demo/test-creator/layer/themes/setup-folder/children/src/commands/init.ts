import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../../layer/themes/infra_external-log-lib/dist';
import ora from 'ora';

export const initCommand = new Command('init')
  .description('Initialize VF mode for existing projects or themes')
  .argument('[path]', 'Path to project or theme (default: current directory)', '.')
  .option('--all-themes', 'Initialize VF mode for all themes in layer/themes')
  .option('--convert', 'Convert existing project to VF mode')
  .action(async (targetPath: string, options: any) => {
    try {
      if (options.allThemes) {
        await initAllThemes();
      } else if (options.convert) {
        await convertToVfMode(targetPath);
      } else {
        await initVfMode(targetPath);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function initAllThemes() {
  const spinner = ora('Initializing VF mode for all themes...').start();
  
  const baseDir = process.cwd();
  const themesDir = path.join(baseDir, 'layer', 'themes');
  
  if (!await fs.pathExists(themesDir)) {
    spinner.fail('No themes directory found at layer/themes/');
    return;
  }
  
  const themeDirs = await fs.readdir(themesDir);
  let initialized = 0;
  let skipped = 0;
  
  for (const themeDir of themeDirs) {
    const themePath = path.join(themesDir, themeDir);
    const stat = await fs.stat(themePath);
    
    if (stat.isDirectory() && !themeDir.startsWith('.')) {
      if (await initTaskQueue(themePath)) {
        initialized++;
      } else {
        skipped++;
      }
    }
  }
  
  // Also check root
  if (await fs.pathExists(path.join(baseDir, 'TASK_QUEUE.md'))) {
    spinner.text = 'Checking root directory...';
    if (await initTaskQueue(baseDir)) {
      initialized++;
    }
  }
  
  // Initialize NAME_ID.vf.json
  const nameIdPath = path.join(baseDir, 'NAME_ID.vf.json');
  if (!await fs.pathExists(nameIdPath)) {
    await fs.writeJson(nameIdPath, {}, { spaces: 2 });
    spinner.text = 'Created NAME_ID.vf.json';
  }
  
  spinner.succeed(`Initialized ${initialized} task queues, skipped ${skipped}`);
}

async function initTaskQueue(targetPath: string): Promise<boolean> {
  const taskQueueMd = path.join(targetPath, 'TASK_QUEUE.md');
  const taskQueueVf = path.join(targetPath, 'TASK_QUEUE.vf.json');
  
  if (await fs.pathExists(taskQueueMd) && !await fs.pathExists(taskQueueVf)) {
    const defaultTaskQueue = {
      workingItem: null,
      queues: {
        high: [],
        medium: [],
        low: []
      },
      metadata: {
        processedCount: 0,
        failedCount: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    await fs.writeJson(taskQueueVf, defaultTaskQueue, { spaces: 2 });
    console.log(chalk.green(`✅ Created TASK_QUEUE.vf.json for: ${path.basename(targetPath)}`));
    return true;
  } else if (await fs.pathExists(taskQueueVf)) {
    console.log(chalk.blue(`✅ TASK_QUEUE.vf.json already exists for: ${path.basename(targetPath)}`));
    return true;
  } else {
    console.log(chalk.gray(`⏭️  No TASK_QUEUE.md found in: ${path.basename(targetPath)}`));
    return false;
  }
}

async function convertToVfMode(projectPath: string) {
  const spinner = ora('Converting project to VF mode...').start();
  
  const targetPath = path.resolve(projectPath);
  
  if (!await fs.pathExists(targetPath)) {
    spinner.fail(`Project path does not exist: ${targetPath}`);
    return;
  }
  
  spinner.text = 'Copying CLAUDE_vf.md...';
  
  // Copy CLAUDE_vf.md as CLAUDE.md
  const sourceClause = path.join(process.cwd(), 'CLAUDE_vf.md');
  if (await fs.pathExists(sourceClause)) {
    const destClaude = path.join(targetPath, 'CLAUDE.md');
    await fs.copy(sourceClause, destClaude);
    spinner.text = 'Copied CLAUDE_vf.md as CLAUDE.md';
  } else {
    spinner.warn('CLAUDE_vf.md not found in current directory');
  }
  
  // Create MCP configuration
  spinner.text = 'Creating MCP configuration...';
  const configDir = path.join(targetPath, 'config');
  await fs.ensureDir(configDir);
  
  const relPath = path.relative(
    targetPath,
    path.join(process.cwd(), 'layer', 'themes', 'filesystem_mcp', 'mcp-server.js')
  );
  
  const mcpConfig = {
    mcpServers: {
      filesystem_mcp: {
        command: 'node',
        args: [relPath],
        env: {
          NODE_ENV: 'demo',
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
  
  await fs.writeJson(path.join(configDir, 'mcp-agent.json'), mcpConfig, { spaces: 2 });
  
  // Initialize task queue
  spinner.text = 'Initializing task queue...';
  await initTaskQueue(targetPath);
  
  // Create NAME_ID.vf.json
  const nameIdPath = path.join(targetPath, 'NAME_ID.vf.json');
  if (!await fs.pathExists(nameIdPath)) {
    await fs.writeJson(nameIdPath, {}, { spaces: 2 });
  }
  
  spinner.succeed(`Converted project to VF mode: ${targetPath}`);
  
  console.log(chalk.yellow('\n📌 Next steps:'));
  console.log(chalk.yellow('   1. Review config/mcp-agent.json'));
  console.log(chalk.yellow('   2. Update your .env file if needed'));
  console.log(chalk.yellow('   3. Test MCP connection'));
}

async function initVfMode(targetPath: string) {
  const resolvedPath = path.resolve(targetPath);
  
  if (!await fs.pathExists(resolvedPath)) {
    console.error(chalk.red(`Path does not exist: ${resolvedPath}`));
    return;
  }
  
  const success = await initTaskQueue(resolvedPath);
  
  if (success) {
    console.log(chalk.green('\n✅ VF mode initialization complete!'));
  }
}