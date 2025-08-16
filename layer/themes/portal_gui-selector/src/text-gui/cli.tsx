#!/usr/bin/env node
/**
 * CLI Entry Point for Text-based GUI
 * Run the Ink application
 */

import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import TextGuiApp from './TextGuiApp';

const cli = meow(`
  Usage
    $ gui-selector-tui

  Options
    --user, -u       Set username
    --theme, -t      Set initial theme
    --server, -s     API server URL
    --mode, -m       Start in specific mode (main|templates|themes|projects)

  Examples
    $ gui-selector-tui
    $ gui-selector-tui --user "John Doe"
    $ gui-selector-tui --mode templates
    $ gui-selector-tui --server http://localhost:3456
`, {
  flags: {
    user: {
      type: 'string',
      alias: 'u',
      default: 'Guest'
    },
    theme: {
      type: 'string',
      alias: 't',
      default: 'dark-mode'
    },
    server: {
      type: 'string',
      alias: 's',
      default: 'http://localhost:3456'
    },
    mode: {
      type: 'string',
      alias: 'm',
      default: 'main'
    }
  }
});

// Set environment variables from flags
if (cli.flags.server) {
  process.env.API_SERVER = cli.flags.server;
}

// Render the Ink app
const { waitUntilExit } = render(
  <TextGuiApp 
    initialUser={cli.flags.user}
    initialTheme={cli.flags.theme}
    initialMode={cli.flags.mode}
  />
);

waitUntilExit().then(() => {
  console.log('\nThank you for using GUI Selector!');
});