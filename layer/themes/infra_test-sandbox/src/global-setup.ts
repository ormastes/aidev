import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

async function checkDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

async function checkQemuAvailable(): Promise<boolean> {
  try {
    await execAsync('qemu-system-x86_64 --version');
    return true;
  } catch {
    return false;
  }
}

async function pullRequiredImages() {
  console.log('📦 Pulling required Docker images...');
  
  const images = [
    'node:18-alpine',
    'alpine:latest'
  ];
  
  for (const image of images) {
    try {
      console.log(`  Pulling ${image}...`);
      await execAsync(`docker pull ${image}`);
    } catch (error) {
      console.warn(`  ⚠️  Failed to pull ${image}:`, error);
    }
  }
}

async function setupTestDirectories() {
  const dirs = [
    'gen/test-sandbox',
    'gen/test-sandbox/docker',
    'gen/test-sandbox/qemu',
    'gen/test-sandbox/logs',
    'gen/test-sandbox/reports'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

export default async function globalSetup() {
  console.log('🚀 Global Test Sandbox Setup');
  console.log('============================\n');
  
  // Check available sandbox providers
  const dockerAvailable = await checkDockerAvailable();
  const qemuAvailable = await checkQemuAvailable();
  
  console.log('Sandbox Providers:');
  console.log(`  Docker: ${dockerAvailable ? '✅' : '❌'}`);
  console.log(`  QEMU:   ${qemuAvailable ? '✅' : '❌'}`);
  
  if (!dockerAvailable && !qemuAvailable) {
    throw new Error('No sandbox providers available! Please install Docker or QEMU.');
  }
  
  // Setup test infrastructure
  await setupTestDirectories();
  
  if (dockerAvailable) {
    await pullRequiredImages();
  }
  
  // Save runtime configuration
  const config = {
    docker: dockerAvailable,
    qemu: qemuAvailable,
    defaultProvider: dockerAvailable ? 'docker' : 'qemu',
    timestamp: new Date().toISOString()
  };
  
  await fs.writeFile(
    'gen/test-sandbox/runtime-config.json',
    JSON.stringify(config, null, 2)
  );
  
  console.log('\n✅ Global setup complete\n');
  
  return () => {
    // Return cleanup function for globalTeardown
    console.log('Test sandbox setup completed');
  };
}