#!/usr/bin/env bunx tsx

/**
 * Deployment script that properly uses portal_security theme for port management
 * This ensures all port allocations go through the central EnhancedPortManager
 */

import { spawn } from 'child_process';
import { EnhancedPortManager } from '../../../portal_security/children/EnhancedPortManager';
import { path } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';

// Get deployment type from command line
const deployType = (process.argv[2] || 'release') as any;
const appId = 'gui-selector';
const appName = 'GUI Selector Server';

console.log(`🚀 Deploying ${appName} in ${deployType} mode...`);

// Validate deploy type
const validTypes = ['local', 'dev', 'demo', 'release', 'production'];
if (!validTypes.includes(deployType)) {
  console.error(`❌ Invalid deploy type: ${deployType}`);
  console.error(`Usage: bunx tsx deploy-with-security.ts [${validTypes.join('|')}]`);
  process.exit(1);
}

// Get port from EnhancedPortManager
const portManager = EnhancedPortManager.getInstance();
const registration = portManager.registerApp({
  appId,
  deployType
});

if (!registration.success) {
  console.error(`❌ Failed to register app: ${registration.message}`);
  process.exit(1);
}

const port = registration.port!;
console.log(`✅ Allocated port: ${port} from portal_security theme`);

// Build the application
console.log('📦 Building application...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed');
    // Unregister the app if build fails
    portManager.unregisterApp(appId);
    process.exit(1);
  }

  // Kill any existing process on the port
  console.log(`🔧 Checking for existing processes on port ${port}...`);
  const killProcess = spawn('lsof', ['-ti:' + port], {
    shell: true
  });

  killProcess.on('close', () => {
    // Start the server with the allocated port
    console.log(`🌐 Starting server on port ${port}...`);
    
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: deployType,
      DEPLOY_TYPE: deployType,
      APP_ID: appId
    };

    const serverProcess = spawn('node', ['dist/server.js'], {
      env,
      detached: true,
      stdio: 'inherit'
    });

    const pid = serverProcess.pid;
    console.log(`✨ Server started with PID: ${pid}`);
    
    // Mark app as active in port manager
    portManager.markAppActive(appId, pid!);

    // Display success message
    setTimeout(() => {
      console.log(`✅ ${appName} deployed successfully!`);
      console.log(`🔗 Access at: http://localhost:${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}/dashboard.html`);
      console.log(`🔐 Login (Standard): http://localhost:${port}/login.html`);
      console.log(`✨ Login (Liquid Glass): http://localhost:${port}/login-modern.html`);
      console.log(`🎨 GUI Selector: http://localhost:${port}/gui-selector.html`);
      console.log('');
      console.log(`To stop the server, run: kill ${pid}`);
      console.log('');
      console.log('🔒 Port allocation managed by portal_security theme');
      console.log(`📋 App registered as: ${appId} (${deployType})`);
      
      // Unref to allow script to exit
      serverProcess.unref();
      process.exit(0);
    }, 2000);
  });
});