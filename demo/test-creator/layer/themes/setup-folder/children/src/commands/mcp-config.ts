import { Command } from 'commander';
import chalk from 'chalk';
import { path } from '../../../../../../../../layer/themes/infra_external-log-lib/dist';
import { MCPSetup } from '../setup/mcp-setup';

export const mcpConfigCommand = new Command('mcp-config')
  .description('Configure MCP server for Claude Desktop integration')
  .option('--target-dir <dir>', 'Target directory for MCP configuration', process.cwd())
  .option('--user-wide', 'Install MCP configuration system-wide (default: local)')
  .option('--deployed-environment', 'Mark as deployed environment')
  .option('--no-color', 'Disable colored output')
  .action(async (options) => {
    try {
      console.log(chalk.blue('=== MCP Configuration Setup ==='));
      
      const targetDir = path.resolve(options.targetDir);
      
      const mcpSetup = new MCPSetup({
        targetDir,
        userWide: options.userWide || false,
        deployedEnvironment: options.deployedEnvironment || false
      });

      await mcpSetup.setup();
      
      console.log(chalk.green('\n✅ MCP configuration complete!'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });