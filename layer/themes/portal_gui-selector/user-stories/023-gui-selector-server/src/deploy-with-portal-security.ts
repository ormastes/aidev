#!/usr/bin/env bunx tsx

/**
 * Proper deployment integration with portal_security theme
 * This is the ONLY correct way to deploy apps - through EnhancedPortManager
 */

import { spawn, ChildProcess } from 'child_process';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';

// Import portal_security's port management
async function deployWithPortalSecurity(deployType: string, appId: string) {
  try {
    // Dynamic import to avoid build-time issues
    const { EnhancedPortManager } = await import('../../../../portal_security/children/EnhancedPortManager');
    
    const portManager = EnhancedPortManager.getInstance();
    
    // Register app with portal_security
    const registration = portManager.registerApp({
      appId,
      deployType: deployType as any,
    });
    
    if (!registration.success) {
      throw new Error(`Failed to register app: ${registration.message}`);
    }
    
    return registration.port;
  } catch (error) {
    console.error('❌ Failed to integrate with portal_security:', error);
    throw error;
  }
}

async function main() {
  const deployType = process.argv[2] || 'release';
  const appId = 'gui-selector';
  const appName = 'GUI Selector Server';
  
  console.log(`🚀 Deploying ${appName} using portal_security theme`);
  console.log(`📋 Deploy type: ${deployType}`);
  console.log('');
  
  try {
    // Get port from portal_security
    const port = await deployWithPortalSecurity(deployType, appId);
    console.log(`✅ Portal Security allocated port: ${port}`);
    
    // Build application
    console.log('📦 Building application...');
    await new Promise<void>((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true
      });
      
      build.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
    
    // Kill existing process on port
    console.log(`🔧 Checking for existing processes on port ${port}...`);
    await new Promise<void>((resolve) => {
      const kill = spawn('lsof', ['-ti:' + port], {
        shell: true
      });
      
      kill.on('close', () => resolve());
    });
    
    // Start server
    console.log(`🌐 Starting server on port ${port}...`);
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: deployType,
      DEPLOY_TYPE: deployType,
      APP_ID: appId
    };
    
    const server = spawn('node', ['dist/server.js'], {
      env,
      detached: true,
      stdio: 'inherit'
    });
    
    const pid = server.pid;
    console.log(`✨ Server started with PID: ${pid}`);
    
    // Display URLs
    setTimeout(() => {
      console.log('');
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
      console.log(`✅ No hardcoded ports - all managed centrally`);
      
      server.unref();
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);