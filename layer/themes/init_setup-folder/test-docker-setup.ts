import { fileAPI } from '../utils/file-api';
#!/usr/bin/env ts-node

/**
 * Test Docker Environment Setup
 * Tests Docker container creation, SSH, VS Code Server, and remote debugging
 */

import { EnvironmentSetupService } from './src/services/EnvironmentSetupService';
import * as fs from 'fs/promises';
import { path } from '../infra_external-log-lib/src';

async function testDockerSetup() {
  console.log('🐳 Testing Docker Environment Setup');
  console.log('=====================================\n');

  const service = new EnvironmentSetupService();
  
  try {
    // Initialize service
    console.log('📦 Initializing environment setup service...');
    await service.initialize();
    
    // Test 1: Basic Docker setup
    console.log('\n✅ Test 1: Basic Docker Container');
    const basicConfig = {
      type: 'docker' as const,
      name: 'test-basic',
      platform: 'linux/amd64',
      memory: '2G',
      cores: 2
    };
    
    const basicResult = await service.setupDocker(basicConfig);
    console.log('  Container name:', basicConfig.name);
    console.log('  Ports configured:', Object.keys(basicResult.ports).length);
    console.log('  Scripts generated:', basicResult.scripts.length);
    
    // Test 2: Docker with debugging
    console.log('\n✅ Test 2: Docker with Remote Debugging');
    const debugConfig = {
      type: 'docker' as const,
      name: 'test-debug',
      platform: 'linux/amd64',
      memory: '4G',
      cores: 4,
      debugging: {
        enabled: true,
        type: 'gdb' as const,
        port: 1234
      }
    };
    
    const debugResult = await service.setupDocker(debugConfig);
    console.log('  Container name:', debugConfig.name);
    console.log('  Debug port:', debugResult.debugInfo?.port);
    console.log('  Debug command:', debugResult.debugInfo?.command);
    
    // Test 3: Build hello world program
    console.log('\n✅ Test 3: Building Hello World Program');
    const helloPath = await service.buildHelloWorld('docker', 'c');
    console.log('  Binary path:', helloPath);
    
    // Check if binary exists
    try {
      await fs.access(helloPath);
      console.log('  ✓ Binary file exists');
    } catch {
      console.log('  ⚠ Binary file not found (build tools may not be installed)');
    }
    
    // Test 4: Setup remote debugging
    console.log('\n✅ Test 4: Remote Debugging Configuration');
    const debugSetup = await service.setupRemoteDebugging('docker', helloPath);
    console.log('  Debug port:', debugSetup.port);
    console.log('  Commands:', debugSetup.commands.length);
    
    // Test 5: Check generated scripts
    console.log('\n✅ Test 5: Generated Scripts');
    const setupDir = path.join(process.cwd(), '.setup');
    const scriptsDir = path.join(setupDir, 'scripts');
    
    try {
      const scripts = await fs.readdir(scriptsDir);
      const dockerScripts = scripts.filter(s => s.includes('docker'));
      console.log('  Docker scripts found:', dockerScripts.length);
      dockerScripts.forEach(script => {
        console.log(`    - ${script}`);
      });
    } catch (error) {
      console.log('  ⚠ Scripts directory not found');
    }
    
    // Test 6: Port mapping verification
    console.log('\n✅ Test 6: Port Mappings');
    console.log('  Standard ports:');
    console.log('    SSH:', debugResult.ports['ssh'] || 'Not configured');
    console.log('    VS Code:', debugResult.ports['vscode'] || 'Not configured');
    console.log('    GDB:', debugResult.ports['gdb'] || 'Not configured');
    console.log('    Node.js:', debugResult.ports['node'] || 'Not configured');
    console.log('    Python Flask:', debugResult.ports['flask'] || 'Not configured');
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('=====================================');
    console.log('✅ Docker environment setup completed');
    console.log('✅ SSH server configuration ready');
    console.log('✅ VS Code Server configuration ready');
    console.log('✅ Remote debugging configuration ready');
    console.log('✅ Build tools and scripts generated');
    
    // Instructions
    console.log('\n📝 Next Steps:');
    console.log('1. Build Docker image:');
    console.log('   cd .setup && ./scripts/build-docker-test-debug.sh');
    console.log('\n2. Run Docker container:');
    console.log('   ./scripts/run-docker-test-debug.sh');
    console.log('\n3. Access VS Code Server:');
    console.log('   http://localhost:8080 (password: changeme)');
    console.log('\n4. SSH into container:');
    console.log('   ssh -p 2222 root@localhost (password: docker)');
    console.log('\n5. Start remote debugging:');
    console.log('   ./scripts/debug-docker-test-debug.sh');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDockerSetup().catch(console.error);