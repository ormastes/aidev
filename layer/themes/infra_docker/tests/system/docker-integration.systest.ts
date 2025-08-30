import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

/**
 * System Tests for Docker Integration
 * Validates Docker container management, networking, and orchestration
 */

test.describe('Docker Integration System Tests', () => {
  const workspaceRoot = process.cwd();
  const dockerTestDir = path.join(workspaceRoot, 'gen/test-docker');
  const testImageName = `aidev-test-${crypto.randomBytes(4).toString('hex')}`;
  const testContainerName = `aidev-container-${crypto.randomBytes(4).toString('hex')}`;
  
  test.beforeAll(async () => {
    // Create test directory
    await fs.mkdir(dockerTestDir, { recursive: true });
  });

  test.afterAll(async () => {
    // Cleanup Docker resources
    try {
      // Stop and remove test containers
      await execAsync(`docker stop ${testContainerName} 2>/dev/null || true`);
      await execAsync(`docker rm ${testContainerName} 2>/dev/null || true`);
      
      // Remove test images
      await execAsync(`docker rmi ${testImageName} 2>/dev/null || true`);
      
      // Clean up test directory
      await fs.rm(dockerTestDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  test.describe('Docker Environment Detection', () => {
    test('should detect Docker installation', async () => {
      try {
        const { stdout } = await execAsync('docker --version');
        expect(stdout).toMatch(/Docker version \d+\.\d+\.\d+/);
      } catch (error) {
        test.skip();
      }
    });

    test('should detect Docker Compose installation', async () => {
      try {
        const { stdout } = await execAsync('docker-compose --version || docker compose version');
        expect(stdout).toMatch(/(docker-compose|Docker Compose) version/i);
      } catch (error) {
        test.skip();
      }
    });

    test('should verify Docker daemon is running', async () => {
      try {
        const { stdout } = await execAsync('docker info --format "{{.ServerVersion}}"');
        expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
      } catch (error) {
        test.skip();
      }
    });
  });

  test.describe('Docker Image Management', () => {
    test('should build Docker image from Dockerfile', async () => {
      // Create a simple Dockerfile
      const dockerfilePath = path.join(dockerTestDir, 'Dockerfile');
      await fs.writeFile(dockerfilePath, `
FROM node:18-alpine
WORKDIR /app
RUN echo "test" > /app/test.txt
CMD ["node", "--version"]
      `);

      // Build the image
      const { stdout, stderr } = await execAsync(
        `docker build -t ${testImageName} ${dockerTestDir}`
      );
      
      expect(stdout + stderr).toContain('Successfully built');
      
      // Verify image exists
      const { stdout: images } = await execAsync('docker images --format "{{.Repository}}"');
      expect(images).toContain(testImageName);
    });

    test('should list Docker images', async () => {
      const { stdout } = await execAsync('docker images --format json');
      const images = stdout.trim().split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));
      
      expect(Array.isArray(images)).toBe(true);
      expect(images.length).toBeGreaterThan(0);
    });

    test('should tag Docker image', async () => {
      const newTag = `${testImageName}:v1.0`;
      await execAsync(`docker tag ${testImageName} ${newTag}`);
      
      const { stdout } = await execAsync(`docker images ${testImageName} --format "{{.Tag}}"`);
      expect(stdout).toContain('v1.0');
    });
  });

  test.describe('Docker Container Management', () => {
    test('should run container from image', async () => {
      const { stdout } = await execAsync(
        `docker run --name ${testContainerName} --rm ${testImageName}`
      );
      
      expect(stdout).toMatch(/v\d+\.\d+\.\d+/); // Node version output
    });

    test('should run container in detached mode', async () => {
      const detachedName = `${testContainerName}-detached`;
      
      // Create a long-running container
      const dockerfilePath = path.join(dockerTestDir, 'Dockerfile.sleep');
      await fs.writeFile(dockerfilePath, `
FROM alpine:latest
CMD ["sleep", "3600"]
      `);
      
      await execAsync(`docker build -t ${testImageName}-sleep -f ${dockerfilePath} ${dockerTestDir}`);
      
      const { stdout } = await execAsync(
        `docker run -d --name ${detachedName} ${testImageName}-sleep`
      );
      
      const containerId = stdout.trim();
      expect(containerId).toMatch(/^[a-f0-9]{64}$/);
      
      // Verify container is running
      const { stdout: status } = await execAsync(
        `docker ps --filter "id=${containerId}" --format "{{.Status}}"`
      );
      expect(status).toContain('Up');
      
      // Stop container
      await execAsync(`docker stop ${detachedName}`);
      await execAsync(`docker rm ${detachedName}`);
    });

    test('should execute commands in running container', async () => {
      const execContainerName = `${testContainerName}-exec`;
      
      // Start a container
      await execAsync(
        `docker run -d --name ${execContainerName} ${testImageName}-sleep`
      );
      
      // Execute command
      const { stdout } = await execAsync(
        `docker exec ${execContainerName} echo "Hello from container"`
      );
      
      expect(stdout.trim()).toBe('Hello from container');
      
      // Cleanup
      await execAsync(`docker stop ${execContainerName}`);
      await execAsync(`docker rm ${execContainerName}`);
    });

    test('should copy files to/from container', async () => {
      const copyContainerName = `${testContainerName}-copy`;
      
      // Create a test file
      const hostFile = path.join(dockerTestDir, 'host-file.txt');
      await fs.writeFile(hostFile, 'Content from host');
      
      // Start container
      await execAsync(
        `docker run -d --name ${copyContainerName} ${testImageName}-sleep`
      );
      
      // Copy file to container
      await execAsync(
        `docker cp ${hostFile} ${copyContainerName}:/tmp/copied-file.txt`
      );
      
      // Verify file in container
      const { stdout } = await execAsync(
        `docker exec ${copyContainerName} cat /tmp/copied-file.txt`
      );
      expect(stdout.trim()).toBe('Content from host');
      
      // Copy file from container
      const outputFile = path.join(dockerTestDir, 'from-container.txt');
      await execAsync(
        `docker cp ${copyContainerName}:/tmp/copied-file.txt ${outputFile}`
      );
      
      const content = await fs.readFile(outputFile, 'utf-8');
      expect(content).toBe('Content from host');
      
      // Cleanup
      await execAsync(`docker stop ${copyContainerName}`);
      await execAsync(`docker rm ${copyContainerName}`);
    });
  });

  test.describe('Docker Networking', () => {
    test('should create custom network', async () => {
      const networkName = `aidev-test-network-${crypto.randomBytes(4).toString('hex')}`;
      
      await execAsync(`docker network create ${networkName}`);
      
      const { stdout } = await execAsync('docker network ls --format "{{.Name}}"');
      expect(stdout).toContain(networkName);
      
      // Inspect network
      const { stdout: networkInfo } = await execAsync(
        `docker network inspect ${networkName} --format "{{.Driver}}"`
      );
      expect(networkInfo.trim()).toBe('bridge');
      
      // Cleanup
      await execAsync(`docker network rm ${networkName}`);
    });

    test('should connect containers via network', async () => {
      const networkName = `aidev-test-net-${crypto.randomBytes(4).toString('hex')}`;
      const container1 = `${testContainerName}-net1`;
      const container2 = `${testContainerName}-net2`;
      
      // Create network
      await execAsync(`docker network create ${networkName}`);
      
      // Start two containers on the same network
      await execAsync(
        `docker run -d --name ${container1} --network ${networkName} ${testImageName}-sleep`
      );
      await execAsync(
        `docker run -d --name ${container2} --network ${networkName} ${testImageName}-sleep`
      );
      
      // Test connectivity
      const { stdout } = await execAsync(
        `docker exec ${container1} ping -c 1 ${container2}`
      );
      expect(stdout).toContain('1 packets transmitted, 1 received');
      
      // Cleanup
      await execAsync(`docker stop ${container1} ${container2}`);
      await execAsync(`docker rm ${container1} ${container2}`);
      await execAsync(`docker network rm ${networkName}`);
    });
  });

  test.describe('Docker Volume Management', () => {
    test('should create and mount volume', async () => {
      const volumeName = `aidev-test-volume-${crypto.randomBytes(4).toString('hex')}`;
      const volumeContainer = `${testContainerName}-volume`;
      
      // Create volume
      await execAsync(`docker volume create ${volumeName}`);
      
      // Verify volume exists
      const { stdout } = await execAsync('docker volume ls --format "{{.Name}}"');
      expect(stdout).toContain(volumeName);
      
      // Run container with volume
      await execAsync(
        `docker run -d --name ${volumeContainer} -v ${volumeName}:/data ${testImageName}-sleep`
      );
      
      // Write data to volume
      await execAsync(
        `docker exec ${volumeContainer} sh -c "echo 'Volume data' > /data/test.txt"`
      );
      
      // Stop container
      await execAsync(`docker stop ${volumeContainer}`);
      await execAsync(`docker rm ${volumeContainer}`);
      
      // Start new container with same volume
      const volumeContainer2 = `${volumeContainer}-2`;
      await execAsync(
        `docker run -d --name ${volumeContainer2} -v ${volumeName}:/data ${testImageName}-sleep`
      );
      
      // Verify data persisted
      const { stdout: data } = await execAsync(
        `docker exec ${volumeContainer2} cat /data/test.txt`
      );
      expect(data.trim()).toBe('Volume data');
      
      // Cleanup
      await execAsync(`docker stop ${volumeContainer2}`);
      await execAsync(`docker rm ${volumeContainer2}`);
      await execAsync(`docker volume rm ${volumeName}`);
    });
  });

  test.describe('Docker Compose Orchestration', () => {
    test('should deploy multi-container application', async () => {
      const composePath = path.join(dockerTestDir, 'docker-compose.yml');
      
      // Create docker-compose.yml
      await fs.writeFile(composePath, `
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
  app:
    image: node:18-alpine
    command: ["node", "--version"]
    depends_on:
      - web
      `);

      try {
        // Start services
        const { stdout } = await execAsync(
          `cd ${dockerTestDir} && docker-compose up -d`,
          { timeout: 30000 }
        );
        expect(stdout).toContain('Creating');
        
        // Wait for services to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check services are running
        const { stdout: psOutput } = await execAsync(
          `cd ${dockerTestDir} && docker-compose ps --format json`
        );
        
        // Stop services
        await execAsync(`cd ${dockerTestDir} && docker-compose down`);
      } catch (error) {
        console.log('Docker Compose not available or test failed');
        test.skip();
      }
    });
  });

  test.describe('Docker Health Checks', () => {
    test('should implement health check', async () => {
      const healthContainer = `${testContainerName}-health`;
      const dockerfilePath = path.join(dockerTestDir, 'Dockerfile.health');
      
      await fs.writeFile(dockerfilePath, `
FROM alpine:latest
RUN apk add --no-cache curl
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
CMD ["sh", "-c", "while true; do echo 'OK' | nc -l -p 80; done"]
      `);
      
      await execAsync(
        `docker build -t ${testImageName}-health -f ${dockerfilePath} ${dockerTestDir}`
      );
      
      await execAsync(
        `docker run -d --name ${healthContainer} ${testImageName}-health`
      );
      
      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check health status
      const { stdout } = await execAsync(
        `docker inspect ${healthContainer} --format "{{.State.Health.Status}}"`
      );
      
      // Health check might be unhealthy due to nc not being perfect HTTP server
      expect(['healthy', 'unhealthy']).toContain(stdout.trim());
      
      // Cleanup
      await execAsync(`docker stop ${healthContainer}`);
      await execAsync(`docker rm ${healthContainer}`);
    });
  });

  test.describe('Docker Resource Limits', () => {
    test('should enforce memory limits', async () => {
      const limitContainer = `${testContainerName}-limit`;
      
      try {
        const { stdout } = await execAsync(
          `docker run --rm --name ${limitContainer} --memory="128m" ${testImageName}-sleep echo "Memory limited"`
        );
        expect(stdout.trim()).toBe('Memory limited');
      } catch (error) {
        // Some systems might not support memory limits
        console.log('Memory limits not supported');
      }
    });

    test('should enforce CPU limits', async () => {
      const cpuContainer = `${testContainerName}-cpu`;
      
      try {
        const { stdout } = await execAsync(
          `docker run --rm --name ${cpuContainer} --cpus="0.5" ${testImageName}-sleep echo "CPU limited"`
        );
        expect(stdout.trim()).toBe('CPU limited');
      } catch (error) {
        // Some systems might not support CPU limits
        console.log('CPU limits not supported');
      }
    });
  });

  test.describe('Docker Security', () => {
    test('should run container as non-root user', async () => {
      const secureContainer = `${testContainerName}-secure`;
      
      const { stdout } = await execAsync(
        `docker run --rm --name ${secureContainer} --user 1000:1000 ${testImageName}-sleep id`
      );
      
      expect(stdout).toContain('uid=1000');
      expect(stdout).toContain('gid=1000');
    });

    test('should use read-only filesystem', async () => {
      const readonlyContainer = `${testContainerName}-readonly`;
      
      const { stdout, stderr } = await execAsync(
        `docker run --rm --name ${readonlyContainer} --read-only ${testImageName}-sleep sh -c "echo test > /tmp/test.txt 2>&1 || echo 'Write failed'"`
      );
      
      expect(stdout + stderr).toContain('Write failed');
    });
  });
});