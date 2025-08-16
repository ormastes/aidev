import { Command } from 'commander';
import chalk from 'chalk';
import { EpicSetupOptions } from '../types';
import { EpicSetup } from '../setup/epic-setup';
import { getMode } from '../utils/mode';

export const epicCommand = new Command('epic')
  .description('Setup an Agile epic environment (ports 3200-3299)')
  .argument('[app-name]', 'Epic identifier/name', 'ai_dev_portal_epic')
  .option('--title <title>', 'Epic title', 'New Epic')
  .option('--description <desc>', 'Epic description')
  .option('--themes <themes>', 'Comma-separated list of themes')
  .option('--target-release <release>', 'Target release version')
  .option('--priority <priority>', 'Priority level (high, medium, low)', 'medium')
  .option('--points <points>', 'Story points estimation', '0')
  .option('--skip-db', 'Skip database setup')
  .option('--md-mode', 'Use MD mode instead of VF mode')
  .action(async (appName: string, options: any) => {
    try {
      const mode = getMode(options);
      
      const setupOptions: EpicSetupOptions = {
        appName,
        mode,
        skipDb: options.skipDb,
        title: options.title || 'New Epic',
        description: options.description || `Epic for ${appName}`,
        themes: options.themes ? options.themes.split(',').map((t: string) => t.trim()) : [],
        targetRelease: options.targetRelease,
        priority: options.priority,
        storyPoints: parseInt(options.points) || 0
      };

      console.log(chalk.blue(`📚 Setting up epic '${setupOptions.title}' in ${mode.toUpperCase()} mode...`));
      
      const setup = new EpicSetup(setupOptions);
      const success = await setup.run();
      
      if (success) {
        console.log(chalk.green('✅ Epic setup completed successfully!'));
      } else {
        console.log(chalk.red('❌ Epic setup failed!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });