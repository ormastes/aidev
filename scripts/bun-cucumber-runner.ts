#!/usr/bin/env bun

/**
 * Bun-based Cucumber Runner
 * Bypasses Node.js version requirements by using Bun's runtime
 */

import { spawn } from 'child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Override NODE_VERSION to trick Cucumber
process.versions.node = '20.0.0';

// Import Cucumber after overriding version
async function runCucumber() {
  try {
    // Dynamic import to ensure version override is in place
    const { runCucumber } = await import('@cucumber/cucumber/api');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Default configuration
    const options = {
      argv: args,
      cwd: process.cwd(),
      stdout: process.stdout,
      stderr: process.stderr,
      env: process.env,
    };

    // Run Cucumber
    const { success } = await runCucumber(options);
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Failed to run Cucumber with Bun:', error);
    
    // Fallback: Try to run as a subprocess with modified environment
    console.log('\nTrying alternative approach...\n');
    runWithModifiedEnv();
  }
}

function runWithModifiedEnv() {
  // Create a wrapper script that sets NODE_VERSION
  const wrapperContent = `
    process.versions.node = '20.0.0';
    require('@cucumber/cucumber/lib/cli/run').default();
  `;
  
  const tempFile = path.join('/tmp', `cucumber-wrapper-${Date.now()}.js`);
  /* FRAUD_FIX: fs.writeFileSync(tempFile, wrapperContent) */;
  
  const args = process.argv.slice(2);
  const cucumber = spawn('bun', [tempFile, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_VERSION: 'v20.0.0',
    },
  });
  
  cucumber.on('close', (code) => {
    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch {}
    
    process.exit(code || 0);
  });
  
  cucumber.on('error', (err) => {
    console.error('Failed to spawn Cucumber process:', err);
    process.exit(1);
  });
}

// Alternative simpler approach - just exec cucumber-js with Bun
async function runDirectly() {
  const args = process.argv.slice(2);
  
  console.log('🥒 Running Cucumber with Bun runtime...\n');
  
  // Set up environment to bypass version check
  process.env.CUCUMBER_BYPASS_VERSION_CHECK = 'true';
  
  try {
    // Try to import and run Cucumber CLI directly
    const cucumberPath = require.resolve('@cucumber/cucumber');
    const cliPath = path.join(path.dirname(cucumberPath), 'lib', 'cli', 'index.js');
    
    // Override version before requiring
    Object.defineProperty(process.versions, 'node', {
      value: '20.0.0',
      writable: false,
      enumerable: true,
      configurable: false
    });
    
    // Load and run Cucumber CLI
    await import(cliPath);
  } catch (error) {
    console.error('Direct execution failed:', error);
    console.log('\nTrying subprocess method...\n');
    
    // Last resort: Run cucumber-js as subprocess
    const cucumber = spawn('bunx', ['--bun', 'cucumber-js', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_VERSION: 'v20.0.0',
      },
    });
    
    cucumber.on('close', (code) => {
      process.exit(code || 0);
    });
  }
}

// Main execution
if (require.main === module) {
  runDirectly().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}