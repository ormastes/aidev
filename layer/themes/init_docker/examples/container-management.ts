#!/usr/bin/env ts-node
/**
 * Example: Container management operations
 * Usage: ts-node container-management.ts
 */

import { containerEnv } from '../pipe';

async function demonstrateContainerManagement() {
  console.log('\n🐳 Container Management Operations Demo\n');

  try {
    // Check Docker availability
    if (!await containerEnv.isDockerAvailable()) {
      throw new Error('Docker is not installed or not running');
    }

    // Example container configuration
    const testImageName = 'nginx:alpine';
    const containerName = 'test-nginx-container';

    console.log(`📦 Using test image: ${testImageName}\n`);

    // 1. Run a container
    console.log('1️⃣ Running a container...');
    const containerId = await containerEnv.runContainer(testImageName, {
      name: containerName,
      detach: true,
      ports: ['8080:80'],
      env: {
        NGINX_HOST: 'localhost',
        NGINX_PORT: '80'
      },
      restart: 'unless-stopped'
    });
    console.log(`✅ Container started with ID: ${containerId}\n`);

    // 2. List running containers
    console.log('2️⃣ Listing containers...');
    const containers = await containerEnv.listContainers();
    console.log('Running containers:');
    containers.forEach(container => {
      console.log(`   - ${container.name} (${container.image}): ${container.status}`);
    });
    console.log();

    // 3. Get container stats
    console.log('3️⃣ Getting container stats...');
    try {
      const stats = await containerEnv.getStats(containerId);
      console.log('Container resource usage:');
      console.log(`   CPU: ${stats.cpu}%`);
      console.log(`   Memory: ${stats.memory.usage / 1024 / 1024}MB / ${stats.memory.limit / 1024 / 1024}MB (${stats.memory.percentage}%)`);
      console.log(`   Network RX/TX: ${stats.network.rx / 1024}KB / ${stats.network.tx / 1024}KB`);
      console.log();
    } catch (error) {
      console.log('   Stats not available yet (container may still be starting)\n');
    }

    // 4. Execute command in container
    console.log('4️⃣ Executing command in container...');
    const execResult = await containerEnv.exec(containerId, ['nginx', '-v']);
    console.log(`   Command output: ${execResult}`);

    // 5. Get container logs
    console.log('5️⃣ Getting container logs...');
    const logs = await containerEnv.getLogs(containerId, { tail: 10 });
    console.log('Recent logs:');
    console.log('---');
    console.log(logs || '   (no logs yet)');
    console.log('---\n');

    // 6. Wait for container to be healthy
    console.log('6️⃣ Checking container health...');
    const isHealthy = await containerEnv.waitForHealthy(containerId, 10000);
    console.log(`   Container health: ${isHealthy ? '✅ Healthy' : '⚠️ Not healthy'}\n`);

    // 7. Stop the container
    console.log('7️⃣ Stopping container...');
    await containerEnv.stopContainer(containerId, 10);
    console.log('✅ Container stopped\n');

    // 8. Remove the container
    console.log('8️⃣ Removing container...');
    await containerEnv.removeContainer(containerId);
    console.log('✅ Container removed\n');

    // 9. List all containers (including stopped)
    console.log('9️⃣ Final container list (including stopped):');
    const allContainers = await containerEnv.listContainers(true);
    if (allContainers.length === 0) {
      console.log('   No containers found');
    } else {
      allContainers.forEach(container => {
        console.log(`   - ${container.name} (${container.image}): ${container.state}`);
      });
    }

    console.log('\n✨ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    
    // Cleanup on error
    try {
      console.log('\n🧹 Cleaning up...');
      const containers = await containerEnv.listContainers(true);
      const testContainer = containers.find(c => c.name === 'test-nginx-container');
      if (testContainer) {
        await containerEnv.removeContainer(testContainer.id, true);
        console.log('✅ Cleanup completed');
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the demo
demonstrateContainerManagement();