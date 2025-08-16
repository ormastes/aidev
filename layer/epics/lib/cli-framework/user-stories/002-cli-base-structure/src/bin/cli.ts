#!/usr/bin/env node

/**
 * CLI entry point for the AI Development Platform
 */

import { CLI } from '../index.js';

// Create CLI instance
const cli = new CLI({
  name: 'aidev',
  version: '1.0.0',
  description: 'AI Development Platform CLI - Build intelligent applications with ease'
});

// Run CLI with process arguments
cli.run(process.argv.slice(2)).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});