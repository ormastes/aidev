import { Command } from 'commander';
import chalk from 'chalk';
import { ThemeSetupOptions } from '../types';
import { ThemeSetup } from '../setup/theme-setup';
import { getMode } from '../utils/mode';

export const themeCommand = new Command('theme')
  .description('Setup an Agile theme environment (ports 3200-3299)')
  .argument('[app-name]', 'Theme identifier/name', 'ai_dev_portal_theme')
  .option('--name <name>', 'Theme name', 'New Theme')
  .option('--description <desc>', 'Theme description')
  .option('--epic <epic>', 'Parent epic ID (if theme belongs to an epic)')
  .option('--skip-db', 'Skip database setup')
  .option('--md-mode', 'Use MD mode instead of VF mode')
  .action(async (appName: string, options: any) => {
    try {
      const mode = getMode(options);
      
      const setupOptions: ThemeSetupOptions = {
        appName,
        mode,
        skipDb: options.skipDb,
        themeName: options.name || 'New Theme',
        description: options.description || `Agile theme for ${appName}`,
        epicId: options.epic
      };

      console.log(chalk.blue(`🎯 Setting up Agile theme '${setupOptions.themeName}' in ${mode.toUpperCase()} mode...`));
      
      const setup = new ThemeSetup(setupOptions);
      const success = await setup.run();
      
      if (success) {
        console.log(chalk.green('✅ Agile theme setup completed successfully!'));
      } else {
        console.log(chalk.red('❌ Agile theme setup failed!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });