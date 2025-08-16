/**
 * Mock Free Test for BaseSetup
 * Uses real file system, real processes, real operations
 * NO MOCKS - Following Mock Free Test Oriented Development
 */

import { BaseSetup } from '../../children/src/setup/base-setup';
import { BaseSetupOptions, Mode, DeploymentType } from '../../children/src/types';
import * as fs from 'fs-extra';
import { path } from '../../../../../../infra_external-log-lib/src';
import { os } from '../../../../../../infra_external-log-lib/src';
import { net } from '../../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

// Test implementation using real operations
class TestSetup extends BaseSetup {
  getDeployDir(): string {
    return path.join(this.baseDir, 'test-deploy');
  }

  getDbPassword(): string {
    return 'test-password-' + Date.now();
  }

  getEnvConfig(): string {
    return `TEST_ENV=true
NODE_ENV=test
TIMESTAMP=${Date.now()}`;
  }

  async createDeploymentConfig(): Promise<boolean> {
    const configPath = path.join(this.getDeployDir(), 'deployment.json');
    const config = {
      deployment: this["deploymentType"],
      appName: this['appName'],
      mode: this['mode'],
      timestamp: Date.now()
    };
    
    try {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJson(configPath, config, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Failed to create deployment config:', error);
      return false;
    }
  }

  printSuccessMessage(): void {
    console.log(`✅ Test setup completed for ${this['appName']}`);
  }
}

describe('BaseSetup - Mock Free Tests', () => {
  let testDir: string;
  let setup: TestSetup;
  
  beforeEach(async () => {
    // Create real temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'base-setup-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up real files
    process.chdir('/tmp');
    await fs.remove(testDir);
  });

  describe('Real Port Availability Check', () => {
    it('should correctly identify available port', async () => {
      const setup = new TestSetup({
        appName: 'test-app',
        mode: 'vf' as Mode,
        skipDb: false
      }, 'demo');

      // Get a truly available port
      const port = await getAvailablePort();
      const isAvailable = await setup["checkPortAvailability"](port);
      expect(isAvailable).toBe(true);
    });

    it('should correctly identify occupied port', async () => {
      const setup = new TestSetup({
        appName: 'test-app',
        mode: 'vf' as Mode,
        skipDb: false
      }, 'demo');

      // Actually occupy a port
      const server = net.createServer();
      const port = await new Promise<number>((resolve) => {
        server.listen(0, () => {
          const assignedPort = (server.address() as net.AddressInfo).port;
          resolve(assignedPort);
        });
      });

      // Check if occupied port is detected
      const isAvailable = await setup["checkPortAvailability"](port);
      expect(isAvailable).toBe(false);

      // Clean up
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
  });

  describe('Real Directory Structure Creation', () => {
    it('should create actual directory structure', async () => {
      const setup = new TestSetup({
        appName: 'real-test-app',
        mode: 'vf' as Mode,
        skipDb: false
      }, 'demo');

      // Create real directories
      const result = await setup["createDirectoryStructure"]();
      expect(result).toBe(true);

      // Verify directories actually exist
      const expectedDirs = [
        'layer/themes',
        'layer/epics',
        'layer/infra',
        'layer/lib',
        'layer/llm-agent',
        'layer/shared'
      ];

      for (const dir of expectedDirs) {
        const fullPath = path.join(testDir, dir);
        const exists = await fs.pathExists(fullPath);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Real Environment File Creation', () => {
    it('should create actual .env file with real content', async () => {
      const setup = new TestSetup({
        appName: 'env-test-app',
        mode: 'vf' as Mode,
        skipDb: false
      }, "development" as DeploymentType);

      // Create real .env file
      const result = await setup["createEnvFile"]();
      expect(result).toBe(true);

      // Verify file exists and has content
      const envPath = path.join(testDir, '.env');
      const exists = await fs.pathExists(envPath);
      expect(exists).toBe(true);

      // Read and verify real content
      const content = await fs.readFile(envPath, 'utf-8');
      expect(content).toContain('NODE_ENV=development');
      expect(content).toContain('APP_NAME=env-test-app');
      expect(content).toContain('PORT=');
      
      // Verify port is actually valid
      const portMatch = content.match(/PORT=(\d+)/);
      expect(portMatch).toBeTruthy();
      const port = parseInt(portMatch![1]);
      expect(port).toBeGreaterThanOrEqual(3000);
      expect(port).toBeLessThanOrEqual(9999);
    });
  });

  describe('Real Task Queue Creation', () => {
    it('should create actual TASK_QUEUE.vf.json file', async () => {
      const setup = new TestSetup({
        appName: 'queue-test-app',
        mode: 'vf' as Mode,
        skipDb: false
      }, 'demo');

      // Create real task queue file
      const result = await setup["createTaskQueue"]();
      expect(result).toBe(true);

      // Verify file exists
      const queuePath = path.join(testDir, 'TASK_QUEUE.vf.json');
      const exists = await fs.pathExists(queuePath);
      expect(exists).toBe(true);

      // Read and parse real JSON
      const content = await fs.readJson(queuePath);
      expect(content).toHaveProperty('tasks');
      expect(content).toHaveProperty("metadata");
      expect(content.metadata.mode).toBe('vf');
    });

    it('should create actual TASK_QUEUE.md file for md mode', async () => {
      const setup = new TestSetup({
        appName: 'queue-test-app',
        mode: 'md' as Mode,
        skipDb: false
      }, 'demo');

      // Create real task queue file
      const result = await setup["createTaskQueue"]();
      expect(result).toBe(true);

      // Verify file exists
      const queuePath = path.join(testDir, 'TASK_QUEUE.md');
      const exists = await fs.pathExists(queuePath);
      expect(exists).toBe(true);

      // Read and verify real content
      const content = await fs.readFile(queuePath, 'utf-8');
      expect(content).toContain('# Task Queue');
      expect(content).toContain('## Active Tasks');
    });
  });

  describe('Real Requirements Check', () => {
    it('should check actual system requirements', async () => {
      const setup = new TestSetup({
        appName: 'req-test-app',
        mode: 'vf' as Mode,
        skipDb: false
      }, 'demo');

      // Check real requirements
      const result = await setup["checkRequirements"]();
      
      // Should pass because we have node and npm
      expect(result).toBe(true);

      // Verify we can actually run these commands
      const nodeVersion = execSync('node --version').toString().trim();
      expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);

      const npmVersion = execSync('npm --version').toString().trim();
      expect(npmVersion).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Full Real Setup Run', () => {
    it('should complete entire setup with real operations', async () => {
      const setup = new TestSetup({
        appName: 'full-test-app',
        mode: 'vf' as Mode,
        skipDb: true // Skip DB for speed
      }, 'demo');

      // Run full real setup
      const result = await setup.run();
      expect(result).toBe(true);

      // Verify all artifacts were created
      const artifacts = [
        '.env',
        'TASK_QUEUE.vf.json',
        'layer/themes',
        'layer/shared',
        'test-deploy/deployment.json'
      ];

      for (const artifact of artifacts) {
        const fullPath = path.join(testDir, artifact);
        const exists = await fs.pathExists(fullPath);
        expect(exists).toBe(true);
      }
    });
  });
});

// Helper function to get truly available port
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}