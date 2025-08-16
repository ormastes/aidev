/**
 * MANDATORY: How ALL web themes MUST open ports
 * 
 * No web theme should directly use:
 * - app.listen(PORT)
 * - server.listen(PORT)
 * - net.createServer().listen(PORT)
 * 
 * Instead, they MUST use EnhancedPortManager
 */

import express from 'express';
import { EnhancedPortManager, DeployType } from '../pipe';

// ❌ WRONG - This will be BLOCKED
async function wrongWay() {
  const app = express();
  const PORT = 3456;  // Choosing own port
  
  // This will throw: "PORT SECURITY VIOLATION: Port 3456 not authorized"
  app.listen(PORT, () => {
    console.log(`Server on ${PORT}`);
  });
}

// ✅ CORRECT - Use EnhancedPortManager
async function correctWay() {
  const app = express();
  const portManager = EnhancedPortManager.getInstance();
  
  // Determine deploy type from environment
  const deployType: DeployType = (process.env.DEPLOY_TYPE as DeployType) || 'local';
  
  // Register and get port assignment
  const result = portManager.registerApp({
    appId: 'portal',  // Your app ID
    deployType: deployType,
    ipAddress: process.env.SERVER_IP  // Optional for multi-server
  });
  
  if (!result.success || !result.port) {
    console.error('Failed to register app:', result.message);
    process.exit(1);
  }
  
  // Now you can use the assigned port
  app.listen(result.port, () => {
    console.log(`✅ Portal running on authorized port ${result.port} (${deployType})`);
  });
}

// ✅ EVEN BETTER - Use openPort() helper
async function bestWay() {
  const app = express();
  const portManager = EnhancedPortManager.getInstance();
  
  try {
    // This handles everything - registration, port assignment, server creation
    const server = await portManager.openPort(
      'portal',  // App ID
      'release', // Deploy type
      {
        requestedPort: 3456,  // Optional: request specific port
        ipAddress: '192.168.1.100'  // Optional: for specific IP
      }
    );
    
    // Attach Express app to server
    server.on('request', app);
    
    console.log('✅ Portal started with proper port management');
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 📝 For dynamic apps (not predefined)
async function dynamicApp() {
  const portManager = EnhancedPortManager.getInstance();
  
  // Dynamic apps get assigned ports from x60-x99 range
  const result = portManager.registerApp({
    appId: 'my-custom-app',
    deployType: 'dev',
    ipAddress: '10.0.0.5'
  });
  
  if (result.success && result.port) {
    console.log(`Dynamic app assigned port ${result.port}`);
    // Port will be something like 3260 (dev prefix 32 + dynamic range 60+)
  }
}

// 🔄 Update registration if needed
async function updatePort() {
  const portManager = EnhancedPortManager.getInstance();
  
  // If port manager doesn't like current setup, update it
  const updated = portManager.updateRegistration(
    'portal',
    'release',
    3456  // New port (optional)
  );
  
  if (updated) {
    console.log('Registration updated');
  }
}

// 📊 Generate usage report
function getReport() {
  const portManager = EnhancedPortManager.getInstance();
  const report = portManager.generateReport();
  console.log(report);
}

// Example usage
if (require.main === module) {
  // This demonstrates the correct way
  correctWay().catch(console.error);
  
  // Show report after 2 seconds
  setTimeout(() => {
    getReport();
  }, 2000);
}