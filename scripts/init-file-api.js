#!/usr/bin/env node

/**
 * Initialize File API enforcement for the project
 * This script should be loaded at the start of any Node.js process
 * to ensure all file operations go through the FileCreationAPI
 */

const path = require('path');

// Check if we're in a test environment
const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test');
const isDevelopment = process.env.NODE_ENV === 'development';

// Determine enforcement mode
let mode = 'bypass'; // Default to bypass for backward compatibility

if (process.env.ENFORCE_FILE_API === 'true') {
  mode = 'enforce';
} else if (process.env.WARN_FILE_API === 'true') {
  mode = 'warn';
} else if (isDevelopment && !isTest) {
  mode = 'monitor'; // Silent monitoring in development
}

if (mode !== 'bypass') {
  try {
    // Dynamic import to avoid issues if the module doesn't exist yet
    const interceptorPath = path.join(
      __dirname,
      '../layer/themes/infra_external-log-lib/src/interceptors/fs-interceptor'
    );
    
    const { FSInterceptor, InterceptMode } = require(interceptorPath);
    
    const modeMap = {
      'enforce': InterceptMode.ENFORCE,
      'warn': InterceptMode.WARN,
      'monitor': InterceptMode.MONITOR,
      'bypass': InterceptMode.BYPASS
    };
    
    const interceptor = FSInterceptor.getInstance({
      mode: modeMap[mode],
      allowedCallers: [
        'FileCreationAPI',
        'MCPIntegratedFileManager',
        'node_modules',
        'test-setup',
        'jest',
        'mocha',
        'vitest'
      ],
      throwOnViolation: mode === 'enforce' && !isTest
    });
    
    interceptor.initialize();
    
    console.log(`[File API] Initialized with mode: ${mode}`);
    
    // Register cleanup on exit
    process.on('exit', () => {
      const violations = interceptor.getViolations();
      if (violations.size > 0 && mode !== 'monitor') {
        console.log('\n[File API] Violations detected:');
        console.log(interceptor.generateReport());
      }
    });
    
  } catch (error) {
    console.warn('[File API] Could not initialize interceptor:', error.message);
  }
}

// Export for programmatic use
module.exports = {
  mode,
  isInitialized: mode !== 'bypass'
};