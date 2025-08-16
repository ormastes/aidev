import { Command } from "commander";
import chalk from 'chalk';
import { TestSetupOptions } from '../types';
import { TestSetup } from '../setup/test-setup';
import { getMode } from '../utils/mode';

export const testCommand = new Command('test')
  .description('Setup test environment (ports 3100-3199)')
  .argument('[app-name]', 'Application name', 'ai_dev_portal')
  .option('--skip-db', 'Skip database setup')
  .option('--framework <framework>', 'Test framework', 'jest')
  .option('--md-mode', 'Use MD mode instead of VF mode')
  .action(async (appName: string, options: any) => {
    try {
      const mode = getMode(options);
      
      const setupOptions: TestSetupOptions = {
        appName,
        mode,
        skipDb: options.skipDb,
        testFramework: options.framework
      };

      console.log(chalk.blue(`🧪 Setting up test environment for '${appName}' in ${mode.toUpperCase()} mode...`));
      
      const setup = new TestSetup(setupOptions);
      const success = await setup.run();
      
      if (success) {
        console.log(chalk.green('✅ Test setup completed successfully!'));
      } else {
        console.log(chalk.red('❌ Test setup failed!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });