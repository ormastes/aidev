#!/usr/bin/env ts-node
/**
 * Deployment script for GUI Selector Server
 * Uses portal_security theme for centralized port management
 */

import { EnhancedPortManager } from '../../../portal_security/children/EnhancedPortManager';
import { spawn } from 'child_process';
import { path } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';

interface DeploymentOptions {
  deployType: 'local' | 'dev' | 'demo' | 'release' | 'production';
  appId: string;
  appName: string;
}

class GuiSelectorDeployer {
  private portManager: EnhancedPortManager;
  
  constructor() {
    this.portManager = EnhancedPortManager.getInstance();
  }
  
  async deploy(options: DeploymentOptions): Promise<void> {
    const { deployType, appId, appName } = options;
    
    console.log(`🚀 Deploying ${appName} in ${deployType} mode...`);
    
    // Register with port manager to get assigned port
    const registration = this.portManager.registerApp({
      appId,
      deployType
    });
    
    if (!registration.success) {
      console.error(`❌ Failed to register app: ${registration.message}`);
      process.exit(1);
    }
    
    const assignedPort = registration.port;
    console.log(`✅ Assigned port: ${assignedPort}`);
    
    // Update server configuration to use assigned port
    await this.updateServerConfig(assignedPort);
    
    // Build the application
    console.log('📦 Building application...');
    await this.runCommand('npm', ['run', 'build']);
    
    // Start the server with the assigned port
    console.log(`🌐 Starting server on port ${assignedPort}...`);
    const env = {
      ...process.env,
      PORT: String(assignedPort),
      NODE_ENV: deployType === 'production' ? 'production' : deployType,
      DEPLOY_TYPE: deployType
    };
    
    // Start server in background
    const serverProcess = spawn('node', ['dist/server.js'], {
      env,
      cwd: path.resolve(__dirname),
      detached: true,
      stdio: 'inherit'
    });
    
    serverProcess.unref();
    
    console.log(`✨ ${appName} deployed successfully!`);
    console.log(`🔗 Access at: http://localhost:${assignedPort}`);
    console.log(`📊 Liquid Glass UI available at: http://localhost:${assignedPort}/login-modern.html`);
  }
  
  private async updateServerConfig(port: number): Promise<void> {
    // Read current server.ts
    const serverPath = path.join(__dirname, 'src/server.ts');
    let serverContent = fs.readFileSync(serverPath, 'utf-8');
    
    // Replace hardcoded port logic with environment variable
    serverContent = serverContent.replace(
      /const PORT = process\.env\.PORT \|\| \([\s\S]*?\);/,
      `const PORT = process.env.PORT || ${port};`
    );
    
    // Write back
    await fileAPI.createFile(serverPath, serverContent, { type: FileType.TEMPORARY });
  }
  
  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: path.resolve(__dirname),
        stdio: 'inherit'
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }
}

// Main execution
async function main() {
  const deployType = (process.argv[2] || 'release') as any;
  
  const deployer = new GuiSelectorDeployer();
  await deployer.deploy({
    deployType,
    appId: 'gui-selector',
    appName: 'GUI Selector Server'
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
}

export { GuiSelectorDeployer };