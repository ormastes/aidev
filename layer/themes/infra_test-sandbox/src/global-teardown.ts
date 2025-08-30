import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

async function cleanupDockerContainers() {
  console.log('🧹 Cleaning up Docker containers...');
  
  try {
    // Stop all sandbox containers
    const { stdout: containers } = await execAsync(
      'docker ps -a --filter "name=sandbox-" --format "{{.Names}}"'
    );
    
    if (containers.trim()) {
      const containerList = containers.trim().split('\n');
      for (const container of containerList) {
        console.log(`  Removing ${container}...`);
        await execAsync(`docker rm -f ${container}`);
      }
    }
    
    // Clean up dangling volumes
    await execAsync('docker volume prune -f');
    
  } catch (error) {
    console.warn('  ⚠️  Docker cleanup failed:', error);
  }
}

async function cleanupQemuInstances() {
  console.log('🧹 Cleaning up QEMU instances...');
  
  try {
    // Kill any remaining QEMU processes
    await execAsync('pkill -f qemu-system || true');
    
    // Clean up QEMU disk images in test directory
    const testQemuDir = 'gen/test-sandbox/qemu';
    const files = await fs.readdir(testQemuDir).catch(() => []);
    
    for (const file of files) {
      if (file.endsWith('.qcow2') || file.endsWith('.img')) {
        await fs.unlink(`${testQemuDir}/${file}`);
        console.log(`  Removed ${file}`);
      }
    }
  } catch (error) {
    console.warn('  ⚠️  QEMU cleanup failed:', error);
  }
}

async function generateReport() {
  console.log('📊 Generating test report...');
  
  try {
    const config = await fs.readFile('gen/test-sandbox/runtime-config.json', 'utf-8');
    const results = await fs.readFile('gen/test-sandbox/results.json', 'utf-8').catch(() => '{}');
    
    const report = {
      configuration: JSON.parse(config),
      results: JSON.parse(results),
      completedAt: new Date().toISOString()
    };
    
    await fs.writeFile(
      'gen/test-sandbox/final-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('  ✅ Report saved to gen/test-sandbox/final-report.json');
  } catch (error) {
    console.warn('  ⚠️  Report generation failed:', error);
  }
}

export default async function globalTeardown() {
  console.log('\n🏁 Global Test Sandbox Teardown');
  console.log('================================\n');
  
  // Cleanup sandbox resources
  await cleanupDockerContainers();
  await cleanupQemuInstances();
  
  // Generate final report
  await generateReport();
  
  // Clean up temporary files
  console.log('🧹 Cleaning up temporary files...');
  try {
    await execAsync('rm -f /tmp/test-sandbox-* /tmp/firecracker-* 2>/dev/null || true');
  } catch {}
  
  console.log('\n✅ Global teardown complete\n');
}