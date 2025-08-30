/**
 * Unit tests for LogRotationService
 * Following Mock Free Test Oriented Development
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { LogRotationService } from '../../src/domain/log-rotation-service';
import { SizeBasedPolicy } from '../../src/domain/size-based-policy';
import { TimeBasedPolicy } from '../../src/domain/time-based-policy';
import { CountBasedPolicy } from '../../src/domain/count-based-policy';
import { AgeBasedPolicy } from '../../src/domain/age-based-policy';
import { RotationIndex } from '../../src/domain/rotation-index';
import { DEFAULT_ROTATION_CONFIG, RotationConfig } from '../../src/domain/interfaces';

describe('LogRotationService', () => {
  let tempDir: string;
  let service: LogRotationService;
  let testLogFile: string;
  let config: RotationConfig;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-rotation-test-'));
    testLogFile = path.join(tempDir, 'test.log');
    
    // Create test configuration
    config = {
      ...DEFAULT_ROTATION_CONFIG,
      sizePolicy: {
        ...DEFAULT_ROTATION_CONFIG.sizePolicy,
        maxSizeMB: 1 // 1MB for testing
      }
    };

    // Initialize service with test configuration
    const indexPath = path.join(tempDir, 'rotation-index.json');
    const rotationIndex = new RotationIndex(indexPath);
    service = new LogRotationService(config, rotationIndex);

    // Create a test log file
    await fs.writeFile(testLogFile, 'Initial log content\n');
  });

  afterEach(async () => {
    // Cleanup
    if (service) {
      await service.cleanup();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Construction', () => {
    test('should initialize with default configuration', () => {
      const defaultService = new LogRotationService();
      expect(defaultService).toBeDefined();
      expect(defaultService.getConfig()).toEqual(DEFAULT_ROTATION_CONFIG);
    });

    test('should initialize with custom configuration', () => {
      expect(service.getConfig()).toEqual(config);
    });

    test('should initialize with default policies when enabled', () => {
      const policies = service.getActivePolicies();
      expect(policies).toContain('size');
      expect(policies).toContain('count');
      expect(policies).toContain('age');
      expect(policies).not.toContain('time'); // disabled in config
    });
  });

  describe('Policy Management', () => {
    test('should add custom policy', async () => {
      const customPolicy = new SizeBasedPolicy({ 
        enabled: true, 
        maxSizeMB: 5, 
        enableCompression: false 
      });
      
      service.addPolicy(customPolicy);
      const policies = service.getActivePolicies();
      expect(policies).toContain('size-based');
    });

    test('should remove policy by name', async () => {
      service.removePolicy('size');
      const policies = service.getActivePolicies();
      expect(policies).not.toContain('size');
    });

    test('should handle adding duplicate policy names', async () => {
      const policy1 = new SizeBasedPolicy({ enabled: true, maxSizeMB: 5, enableCompression: false });
      const policy2 = new SizeBasedPolicy({ enabled: true, maxSizeMB: 10, enableCompression: true });
      
      service.addPolicy(policy1);
      service.addPolicy(policy2); // Should replace the first one
      
      const policies = service.getActivePolicies();
      expect(policies.filter(p => p === 'size-based')).toHaveLength(1);
    });
  });

  describe('Rotation Checking', () => {
    test('should return false for non-existent file', async () => {
      const shouldRotate = await service.checkRotation('/non/existent/file.log');
      expect(shouldRotate).toBe(false);
    });

    test('should return false for small file under size threshold', async () => {
      // File is only a few bytes, well under 1MB threshold
      const shouldRotate = await service.checkRotation(testLogFile);
      expect(shouldRotate).toBe(false);
    });

    test('should return true for file over size threshold', async () => {
      // Create a file larger than 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 1000); // ~1MB + 1000 bytes
      await fs.writeFile(testLogFile, largeContent);
      
      const shouldRotate = await service.checkRotation(testLogFile);
      expect(shouldRotate).toBe(true);
    });

    test('should consider multiple policies', async () => {
      // Enable time policy with immediate rotation
      const timeConfig = {
        ...config,
        timePolicy: {
          enabled: true,
          schedule: 'daily' as const,
          rotationTime: new Date(Date.now() - 1000).toTimeString().slice(0, 5) // 1 second ago
        }
      };
      
      const timeService = new LogRotationService(timeConfig, service['rotationIndex']);
      const shouldRotate = await timeService.checkRotation(testLogFile);
      expect(shouldRotate).toBe(true);
    });
  });

  describe('Rotation Performance', () => {
    test('should perform rotation within time limit', async () => {
      // Create file that needs rotation
      const largeContent = 'x'.repeat(1024 * 1024 + 1000);
      await fs.writeFile(testLogFile, largeContent);
      
      const startTime = Date.now();
      const result = await service.performRotation(testLogFile);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent rotations gracefully', async () => {
      // Create multiple files that need rotation
      const files = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const filePath = path.join(tempDir, `test-${i}.log`);
          const content = 'x'.repeat(1024 * 1024 + 1000); // > 1MB
          await fs.writeFile(filePath, content);
          return filePath;
        })
      );

      // Perform concurrent rotations
      const rotationPromises = files.map(file => service.performRotation(file));
      const results = await Promise.all(rotationPromises);
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    test('should report healthy status initially', async () => {
      const health = await service.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.successRate).toBe(0); // No rotations yet
      expect(health.errorCount).toBe(0);
    });

    test('should update health after successful rotation', async () => {
      // Create file that needs rotation
      const largeContent = 'x'.repeat(1024 * 1024 + 1000);
      await fs.writeFile(testLogFile, largeContent);
      
      await service.performRotation(testLogFile);
      
      const health = await service.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.successRate).toBe(1.0);
      expect(health.lastRotation).not.toBeNull();
    });

    test('should track errors in health status', async () => {
      // Try to rotate a non-existent file
      try {
        await service.performRotation('/non/existent/file.log');
      } catch (error) {
        // Expected to fail
      }
      
      const health = await service.getHealth();
      expect(health.errorCount).toBeGreaterThan(0);
      expect(health.successRate).toBeLessThan(1.0);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup rotated files according to count policy', async () => {
      // Set count policy to keep only 2 files
      const countConfig = {
        ...config,
        countPolicy: {
          enabled: true,
          maxFiles: 2,
          cleanupOnRotation: true
        }
      };
      
      const countService = new LogRotationService(countConfig, service['rotationIndex']);
      
      // Create multiple files and rotate them
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, `test-${i}.log`);
        const content = 'x'.repeat(1024 * 1024 + 1000);
        await fs.writeFile(filePath, content);
        await countService.performRotation(filePath);
      }
      
      await countService.cleanup();
      
      // Check that only 2 rotated files remain
      const files = await fs.readdir(tempDir);
      const rotatedFiles = files.filter(f => f.includes('.log.'));
      expect(rotatedFiles.length).toBeLessThanOrEqual(2);
    });

    test('should cleanup old files according to age policy', async () => {
      // Create old rotated file by manipulating timestamp
      const oldRotatedFile = path.join(tempDir, 'old.log.2023-01-01-000000');
      await fs.writeFile(oldRotatedFile, 'old content');
      
      // Set file modification time to be very old
      const oldDate = new Date('2023-01-01');
      await fs.utimes(oldRotatedFile, oldDate, oldDate);
      
      await service.cleanup();
      
      // Old file should be removed
      const exists = await fs.access(oldRotatedFile).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration at runtime', async () => {
      const newConfig = {
        ...config,
        sizePolicy: {
          ...config.sizePolicy,
          maxSizeMB: 50
        }
      };
      
      await service.updateConfiguration(newConfig);
      expect(service.getConfig().sizePolicy.maxSizeMB).toBe(50);
    });

    test('should re-initialize policies after configuration update', async () => {
      const newConfig = {
        ...config,
        timePolicy: {
          ...config.timePolicy,
          enabled: true
        }
      };
      
      await service.updateConfiguration(newConfig);
      const policies = service.getActivePolicies();
      expect(policies).toContain('time');
    });
  });

  describe('Integration with Rotation Index', () => {
    test('should record rotation in index', async () => {
      const largeContent = 'x'.repeat(1024 * 1024 + 1000);
      await fs.writeFile(testLogFile, largeContent);
      
      const result = await service.performRotation(testLogFile);
      
      const index = await service['rotationIndex'].getIndex();
      expect(index.rotatedFiles).toHaveLength(1);
      expect(index.rotatedFiles[0].originalFile).toBe(testLogFile);
    });

    test('should provide rotation history', async () => {
      const largeContent = 'x'.repeat(1024 * 1024 + 1000);
      await fs.writeFile(testLogFile, largeContent);
      
      await service.performRotation(testLogFile);
      
      const history = await service.getRotationHistory(testLogFile);
      expect(history).toHaveLength(1);
      expect(history[0].originalFile).toBe(testLogFile);
    });
  });
});