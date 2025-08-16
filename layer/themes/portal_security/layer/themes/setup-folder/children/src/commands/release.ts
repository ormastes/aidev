import { Command } from 'commander';
import chalk from 'chalk';
import { ReleaseSetupOptions, ReleaseTypeSchema } from '../types';
import { ReleaseSetup } from '../setup/release-setup';
import { getMode } from '../utils/mode';

export const releaseCommand = new Command('release')
  .description('Setup production release (ports 3400-3499)')
  .argument('[app-name]', 'Application name', 'ai_dev_portal')
  .option('--type <type>', 'Release type (web-server, mcp, cli, api, library)', 'web-server')
  .option('--domain <domain>', 'Production domain name')
  .option('--db-host <host>', 'PostgreSQL host')
  .option('--db-port <port>', 'PostgreSQL port')
  .option('--port <port>', 'Application port')
  .option('--md-mode', 'Use MD mode instead of VF mode')
  .action(async (appName: string, options: any) => {
    try {
      const releaseType = ReleaseTypeSchema.parse(options.type);
      const mode = getMode(options);
      
      const setupOptions: ReleaseSetupOptions = {
        appName,
        mode,
        releaseType,
        domain: options.domain,
        dbHost: options.dbHost,
        dbPort: options.dbPort,
        port: options.port
      };

      console.log(chalk.blue(`📦 Setting up ${releaseType} release for '${appName}' in ${mode.toUpperCase()} mode...`));
      
      const setup = new ReleaseSetup(setupOptions);
      const success = await setup.run();
      
      if (success) {
        console.log(chalk.green('✅ Release setup completed successfully!'));
      } else {
        console.log(chalk.red('❌ Release setup failed!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });