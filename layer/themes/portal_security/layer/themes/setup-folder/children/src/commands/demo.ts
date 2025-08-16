import { Command } from "commander";
import chalk from 'chalk';
import { DemoSetupOptions, LanguageSchema } from '../types';
import { DemoSetup } from '../setup/demo-setup';
import { getMode } from '../utils/mode';

export const demoCommand = new Command('demo')
  .description('Setup general demo environment (ports 3300-3399)')
  .argument('[app-name]', 'Application name', 'ai_dev_portal')
  .option('--skip-db', 'Skip database setup')
  .option('--language <lang>', 'Programming language (typescript, javascript, python)', "typescript")
  .option('--config <path>', 'Path to setup.json configuration file')
  .option('--md-mode', 'Use MD mode instead of VF mode')
  .action(async (appName: string, options: any) => {
    try {
      const language = LanguageSchema.parse(options.language);
      const mode = getMode(options);
      
      const setupOptions: DemoSetupOptions = {
        appName,
        mode,
        skipDb: options.skipDb,
        language,
        configFile: options.config
      };

      console.log(chalk.blue(`🚀 Setting up demo environment for '${appName}' in ${mode.toUpperCase()} mode...`));
      
      const setup = new DemoSetup(setupOptions);
      const success = await setup.run();
      
      if (success) {
        console.log(chalk.green('✅ Demo setup completed successfully!'));
      } else {
        console.log(chalk.red('❌ Demo setup failed!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });