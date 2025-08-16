#!/usr/bin/env node
import { Command } from "commander";
import chalk from 'chalk';
import { demoCommand } from './commands/demo';
import { epicCommand } from './commands/epic';
import { themeCommand } from './commands/theme';
import { storyCommand } from './commands/story';
import { releaseCommand } from './commands/release';
import { testCommand } from './commands/test';
import { listCommand } from './commands/list';
import { linkCommand } from './commands/link';
import { initCommand } from './commands/init';
import { configCommand } from './commands/config';
import { mcpConfigCommand } from './commands/mcp-config';
const packageJson = require('../../../../../../../../package.json');

const program = new Command();

program
  .name('aidev-setup')
  .description('AI Dev Portal Setup - Unified setup interface with VF mode default')
  .version(packageJson.version)
  .option('--md-mode', 'Use MD mode instead of default VF mode')
  .addHelpText('after', `
Port Allocations (from PORT_POLICY.md):
  - Test:         3100-3199 (main: 3100)
  - Agile:        3200-3299 (main: 3200)  
  - General Demo: 3300-3399 (main: 3300)
  - Production:   3400-3499 (main: 3456)

Examples:
  # Setup demo with VF mode (default)
  $ aidev-setup demo ai_dev_portal

  # Setup an epic
  $ aidev-setup epic payment_system --title "Payment System Integration"

  # Setup a theme
  $ aidev-setup theme user_experience --name "User Experience Improvements"

  # Setup a user story
  $ aidev-setup story login_feature --title "User Login" --epic auth_epic

  # Setup production release
  $ aidev-setup release ai_dev_portal --domain example.com

  # Interactive mode
  $ aidev-setup
`);

// Add commands
program.addCommand(demoCommand);
program.addCommand(epicCommand);
program.addCommand(themeCommand);
program.addCommand(storyCommand);
program.addCommand(releaseCommand);
program.addCommand(testCommand);
program.addCommand(listCommand);
program.addCommand(linkCommand);
program.addCommand(initCommand);
program.addCommand(configCommand);
program.addCommand(mcpConfigCommand);

// Interactive mode if no command provided
if (process.argv.length === 2) {
  import('./interactive').then(({ runInteractive }) => {
    runInteractive();
  });
} else {
  program.parse();
}