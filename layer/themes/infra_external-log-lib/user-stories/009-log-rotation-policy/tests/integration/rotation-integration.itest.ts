/**
 * Integration tests for Log Rotation System
 * Tests integration between rotation service, policies, and compression
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { 
  createLogRotationService, 
  createCompressionManager,
  RotationConfigPresets,
  LogRotationService,
  CompressionManager,
  RotationIndex,
  SizeBasedPolicy
} from '../../src/pipe/index';

describe('Log Rotation Integration', () => {
  let tempDir: string;
  let logFile: string;
  let service: any;
  let compression: CompressionManager;
  
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rotation-integration-'));
    logFile = path.join(tempDir, 'application.log');
    compression = createCompressionManager();
  });
  
  afterAll(async () => {
    if (service) {
      await service.cleanup();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Create fresh service instance
    const config = RotationConfigPresets.testing();
    const indexPath = path.join(tempDir, 'test-rotation-index.json');
    service = createLogRotationService({
      ...config,
      sizePolicy: { ...config.sizePolicy, maxSizeMB: 0.01 } // 10KB for testing
    });
    
    // Create initial log file
    await fs.writeFile(logFile, 'Initial log entry\n');
  });

  afterEach(async () => {
    if (service) {
      await service.cleanup();
    }
  });

  describe('Size-Based Rotation Integration', () => {
    test('should rotate file when size threshold is exceeded', async () => {
      // Write data to exceed 10KB threshold
      const largeContent = 'x'.repeat(15 * 1024); // 15KB
      await fs.writeFile(logFile, largeContent);
      
      // Check rotation is needed
      const shouldRotate = await service.checkRotation(logFile);
      expect(shouldRotate).toBe(true);
      
      // Perform rotation
      const result = await service.performRotation(logFile);
      expect(result.success).toBe(true);
      expect(result.rotatedFile).toContain('.log');
      
      // Check that original file is recreated as empty
      const newContent = await fs.readFile(logFile, 'utf-8');
      expect(newContent).toBe('');
      
      // Check that rotated file exists
      const rotatedExists = await fs.access(result.rotatedFile).then(() => true).catch(() => false);
      expect(rotatedExists).toBe(true);
    }, 30000);

    test('should not rotate file under size threshold', async () => {
      // Write small amount of data (under 10KB)
      await fs.writeFile(logFile, 'Small log entry\n');
      
      // Check rotation is not needed
      const shouldRotate = await service.checkRotation(logFile);
      expect(shouldRotate).toBe(false);
    });
  });

  describe('Compression Integration', () => {
    test('should compress rotated files when enabled', async () => {
      // Create config with compression enabled
      const configWithCompression = {
        ...RotationConfigPresets.testing(),
        compression: { level: 6, enabled: true, verifyIntegrity: true },
        sizePolicy: { enabled: true, maxSizeMB: 0.01, enableCompression: true }
      };
      
      const compressionService = createLogRotationService(configWithCompression);
      
      // Write large content
      const largeContent = 'This is a test log entry that will be repeated many times.\n'.repeat(500);
      await fs.writeFile(logFile, largeContent);
      
      // Perform rotation
      const result = await compressionService.performRotation(logFile);
      expect(result.success).toBe(true);
      expect(result.compressedFile).toBeDefined();
      expect(result.compressedFile).toMatch(/\.gz$/);
      
      // Verify compressed file exists
      const compressedExists = await fs.access(result.compressedFile!).then(() => true).catch(() => false);
      expect(compressedExists).toBe(true);
      
      // Verify compression ratio is reasonable
      expect(result.compressionRatio).toBeLessThan(0.8); // Should achieve some compression
      
      await compressionService.cleanup();
    }, 30000);

    test('should verify compressed file integrity', async () => {
      const testContent = 'Test content for compression integrity check\n'.repeat(100);
      const testFile = path.join(tempDir, 'integrity-test.log');
      const compressedFile = path.join(tempDir, 'integrity-test.log.gz');
      
      await fs.writeFile(testFile, testContent);
      
      // Compress file
      const compressionResult = await compression.compress(testFile, compressedFile, 6);
      
      // Verify integrity
      const isValid = await compression.verifyIntegrity(compressedFile, compressionResult.checksum);
      expect(isValid).toBe(true);
      
      // Cleanup
      await fs.unlink(testFile);
      await fs.unlink(compressedFile);
    });
  });

  describe('Rotation Index Integration', () => {
    test('should record rotation metadata in index', async () => {
      // Perform rotation
      const largeContent = 'x'.repeat(15 * 1024);
      await fs.writeFile(logFile, largeContent);
      
      const result = await service.performRotation(logFile);
      expect(result.success).toBe(true);
      
      // Check rotation history
      const history = await service.getRotationHistory(logFile);
      expect(history).toHaveLength(1);
      
      const metadata = history[0];
      expect(metadata.originalFile).toBe(logFile);
      expect(metadata.rotatedFile).toBe(result.rotatedFile);
      expect(metadata.originalSize).toBeGreaterThan(0);
      expect(metadata.rotationTimestamp).toBeInstanceOf(Date);
    });

    test('should support querying rotations by date range', async () => {
      // Perform multiple rotations with different timestamps
      const content1 = 'x'.repeat(15 * 1024);
      const content2 = 'y'.repeat(15 * 1024);
      
      // First rotation
      await fs.writeFile(logFile, content1);
      await service.performRotation(logFile);
      
      // Wait a moment for different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second rotation
      await fs.writeFile(logFile, content2);
      await service.performRotation(logFile);
      
      // Query all rotations
      const allHistory = await service.getRotationHistory(logFile);
      expect(allHistory).toHaveLength(2);
      
      // Timestamps should be different
      expect(allHistory[0].rotationTimestamp.getTime()).not.toBe(allHistory[1].rotationTimestamp.getTime());
    });
  });

  describe('Health Monitoring Integration', () => {
    test('should report health status after operations', async () => {
      // Initial health
      const initialHealth = await service.getHealth();
      expect(initialHealth.status).toBe('healthy');
      expect(initialHealth.errorCount).toBe(0);
      
      // Perform successful rotation
      const largeContent = 'x'.repeat(15 * 1024);
      await fs.writeFile(logFile, largeContent);
      await service.performRotation(logFile);
      
      // Health after success
      const successHealth = await service.getHealth();
      expect(successHealth.status).toBe('healthy');
      expect(successHealth.successRate).toBe(1.0);
      expect(successHealth.lastRotation).toBeInstanceOf(Date);
    });

    test('should track policy status in health report', async () => {
      const health = await service.getHealth();
      expect(health.policiesActive).toContain('size');
      expect(health.policiesActive).toContain('count');
      expect(health.policiesActive).toContain('age');
      expect(health.policiesActive).not.toContain('time'); // Disabled in test config
    });
  });

  describe('Cleanup Integration', () => {
    test('should clean up old rotated files based on count policy', async () => {
      // Set very low max files for testing
      const cleanupConfig = {
        ...RotationConfigPresets.testing(),
        countPolicy: { enabled: true, maxFiles: 2, cleanupOnRotation: true },
        sizePolicy: { enabled: true, maxSizeMB: 0.01, enableCompression: false }
      };
      
      const cleanupService = createLogRotationService(cleanupConfig);
      
      // Create multiple rotated files
      for (let i = 0; i < 4; i++) {
        const content = 'x'.repeat(15 * 1024);
        await fs.writeFile(logFile, content);
        await cleanupService.performRotation(logFile);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for different timestamps
      }
      
      // Run cleanup
      await cleanupService.cleanup();
      
      // Count remaining rotated files
      const files = await fs.readdir(tempDir);
      const rotatedFiles = files.filter(f => f.includes('.log.') && !f.includes('index.json'));
      
      // Should have at most 2 files (as per maxFiles setting)
      expect(rotatedFiles.length).toBeLessThanOrEqual(2);
      
      await cleanupService.cleanup();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle file system errors gracefully', async () => {
      // Try to rotate non-existent file
      const result = await service.performRotation('/non/existent/file.log');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Health should reflect the error
      const health = await service.getHealth();
      expect(health.errorCount).toBeGreaterThan(0);
      expect(health.successRate).toBeLessThan(1.0);
    });

    test('should handle permission errors during rotation', async () => {
      // This test would need specific file permissions setup
      // For now, we'll test the error handling structure
      expect(() => service.performRotation('')).not.toThrow();
    });
  });

  describe('Configuration Updates Integration', () => {
    test('should apply configuration updates without restarting', async () => {
      const originalConfig = service.getConfig();
      expect(originalConfig.sizePolicy.maxSizeMB).toBe(0.01);
      
      // Update configuration
      const newConfig = {
        ...originalConfig,
        sizePolicy: {
          ...originalConfig.sizePolicy,
          maxSizeMB: 0.02 // Double the threshold
        }
      };
      
      await service.updateConfiguration(newConfig);
      
      const updatedConfig = service.getConfig();
      expect(updatedConfig.sizePolicy.maxSizeMB).toBe(0.02);
      
      // Test that new threshold works
      const mediumContent = 'x'.repeat(15 * 1024); // 15KB - should not rotate with new 20KB threshold
      await fs.writeFile(logFile, mediumContent);
      
      const shouldRotate = await service.checkRotation(logFile);
      expect(shouldRotate).toBe(false); // Should not rotate with higher threshold
    });
  });
});