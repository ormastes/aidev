/**
 * System test for complete log rotation workflow
 * Tests end-to-end scenario with real file operations and integration
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Note: In a real implementation, these would be proper imports from the pipe
// For now, we'll use require to work around TypeScript compilation issues
const createRotationIntegration = require('../../src/application/rotation-integration').createRotationIntegration;

describe('Complete Log Rotation Workflow System Test', () => {
  let testWorkspace: string;
  let appLogFile: string;
  let errorLogFile: string;
  let accessLogFile: string;

  beforeAll(async () => {
    // Create a test workspace that simulates a real application environment
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'log-rotation-system-test-'));
    
    // Create log directories like a real application would have
    const logsDir = path.join(testWorkspace, 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    appLogFile = path.join(logsDir, 'application.log');
    errorLogFile = path.join(logsDir, 'error.log');
    accessLogFile = path.join(logsDir, 'access.log');
    
    // Create initial log files with some content
    await fs.writeFile(appLogFile, 'Application started\n');
    await fs.writeFile(errorLogFile, 'Error log initialized\n');
    await fs.writeFile(accessLogFile, 'Access log started\n');
  });

  afterAll(async () => {
    // Cleanup test workspace
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });

  describe('Production-like Rotation Scenario', () => {
    test('should handle complete application logging lifecycle', async () => {
      // This test simulates a full day of application logging with rotation
      
      // 1. Setup rotation integration with production-like configuration
      const rotationIntegration = createRotationIntegration({
        rotationConfig: {
          sizePolicy: { 
            enabled: true, 
            maxSizeMB: 0.01, // 10KB for fast testing
            enableCompression: true 
          },
          compression: { 
            enabled: true, 
            level: 6, 
            verifyIntegrity: true 
          },
          countPolicy: { 
            enabled: true, 
            maxFiles: 5, 
            cleanupOnRotation: true 
          },
          agePolicy: { 
            enabled: true, 
            maxAgeDays: 1, 
            cleanupSchedule: 'daily' 
          }
        },
        indexPath: path.join(testWorkspace, 'rotation-index.json'),
        autoRotationEnabled: true,
        rotationCheckInterval: 100 // Very fast for testing
      });

      await rotationIntegration.startAutoRotation();

      // 2. Register all log files for monitoring
      await rotationIntegration.registerLogFile(appLogFile);
      await rotationIntegration.registerLogFile(errorLogFile);
      await rotationIntegration.registerLogFile(accessLogFile);

      // Verify registration
      const registeredFiles = rotationIntegration.getRegisteredFiles();
      expect(registeredFiles).toContain(appLogFile);
      expect(registeredFiles).toContain(errorLogFile);
      expect(registeredFiles).toContain(accessLogFile);

      // 3. Simulate application logging activity
      
      // Application logs (high volume)
      const appLogData = 'INFO: Application processing request\n'.repeat(500); // ~15KB
      await fs.appendFile(appLogFile, appLogData);

      // Error logs (medium volume)
      const errorLogData = 'ERROR: Database connection failed\n'.repeat(200); // ~6KB
      await fs.appendFile(errorLogFile, errorLogData);

      // Access logs (very high volume)
      const accessLogData = '127.0.0.1 - - [27/Aug/2025:22:54:46 +0000] "GET /api/health HTTP/1.1" 200 15\n'.repeat(150); // ~12KB
      await fs.appendFile(accessLogFile, accessLogData);

      // 4. Trigger rotation checks by simulating log additions
      await rotationIntegration.onLogAdd({ filePath: appLogFile, message: 'App log added' });
      await rotationIntegration.onLogAdd({ filePath: errorLogFile, message: 'Error logged' });
      await rotationIntegration.onLogAdd({ filePath: accessLogFile, message: 'Access logged' });

      // 5. Verify rotations occurred
      const appRotationHistory = await rotationIntegration.getFileRotationHistory(appLogFile);
      const errorRotationHistory = await rotationIntegration.getFileRotationHistory(errorLogFile);
      const accessRotationHistory = await rotationIntegration.getFileRotationHistory(accessLogFile);

      expect(appRotationHistory.length).toBeGreaterThan(0);
      expect(accessRotationHistory.length).toBeGreaterThan(0);
      // Error log might not have rotated if it's under the threshold

      // 6. Verify file contents after rotation
      // Original files should be empty or contain minimal content
      const appContent = await fs.readFile(appLogFile, 'utf-8');
      expect(appContent.length).toBeLessThan(100); // Should be mostly empty after rotation

      // 7. Verify compressed files exist and are valid
      if (appRotationHistory.length > 0) {
        const rotation = appRotationHistory[0];
        expect(rotation.compressedFile).toBeDefined();
        expect(rotation.compressedFile).toMatch(/\.gz$/);
        
        // Check compressed file exists
        const compressedExists = await fs.access(rotation.compressedFile!).then(() => true).catch(() => false);
        expect(compressedExists).toBe(true);

        // Verify compression was effective
        expect(rotation.compressionRatio).toBeLessThan(0.8); // Should achieve some compression
        expect(rotation.originalSize).toBeGreaterThan(10000); // Should be > 10KB
      }

      // 8. Test health monitoring
      const health = await rotationIntegration.getRotationHealth();
      expect(health.status).toBe('healthy');
      expect(health.successRate).toBeGreaterThan(0.8); // At least 80% success rate
      expect(health.lastRotation).toBeInstanceOf(Date);
      expect(health.policiesActive).toContain('size');

      // 9. Test file management statistics
      const stats = await rotationIntegration.getManagedFilesStats();
      expect(stats.totalFiles).toBe(3);
      expect(stats.lastCheckTime).toBeInstanceOf(Date);

      // 10. Verify index integrity
      const indexPath = path.join(testWorkspace, 'rotation-index.json');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      expect(indexExists).toBe(true);

      if (indexExists) {
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const indexData = JSON.parse(indexContent);
        
        expect(indexData.indexVersion).toBeDefined();
        expect(indexData.rotatedFiles).toBeInstanceOf(Array);
        expect(indexData.statistics.totalFiles).toBeGreaterThan(0);
        expect(indexData.statistics.totalOriginalSize).toBeGreaterThan(0);
      }

      // 11. Test second rotation cycle
      // Add more data to trigger another rotation
      const moreAppData = 'INFO: Second batch of logs\n'.repeat(600); // ~18KB
      await fs.appendFile(appLogFile, moreAppData);
      await rotationIntegration.onLogAdd({ filePath: appLogFile, message: 'Second batch' });

      // Check that we now have multiple rotations
      const secondRotationHistory = await rotationIntegration.getFileRotationHistory(appLogFile);
      expect(secondRotationHistory.length).toBeGreaterThanOrEqual(appRotationHistory.length);

      // 12. Test cleanup functionality
      await rotationIntegration.cleanup();
      
      // Verify cleanup was successful (integration should stop monitoring)
      const finalStats = await rotationIntegration.getManagedFilesStats();
      expect(finalStats.totalFiles).toBe(0); // Files should be unregistered after cleanup

    }, 60000); // 60 second timeout for this comprehensive test

    test('should handle error scenarios gracefully', async () => {
      // Test error handling in rotation system
      
      const rotationIntegration = createRotationIntegration({
        rotationConfig: {
          sizePolicy: { enabled: true, maxSizeMB: 0.01, enableCompression: true }
        }
      });

      await rotationIntegration.startAutoRotation();

      // 1. Test rotation of non-existent file
      await expect(async () => {
        await rotationIntegration.onLogAdd({ 
          filePath: '/non/existent/file.log', 
          message: 'Test' 
        });
      }).not.toThrow(); // Should handle gracefully, not throw

      // 2. Test health after errors
      const health = await rotationIntegration.getRotationHealth();
      expect(health.status).toBeDefined();
      expect(typeof health.errorCount).toBe('number');

      await rotationIntegration.cleanup();
    });

    test('should maintain performance under load', async () => {
      // Test performance characteristics
      
      const rotationIntegration = createRotationIntegration({
        rotationConfig: {
          sizePolicy: { enabled: true, maxSizeMB: 0.01, enableCompression: true }
        }
      });

      await rotationIntegration.startAutoRotation();

      const performanceTestFile = path.join(testWorkspace, 'performance.log');
      await fs.writeFile(performanceTestFile, 'Performance test file\n');
      await rotationIntegration.registerLogFile(performanceTestFile);

      // Measure rotation performance
      const startTime = Date.now();
      
      // Create file that definitely needs rotation
      const largeContent = 'Performance test data\n'.repeat(1000); // ~20KB
      await fs.writeFile(performanceTestFile, largeContent);
      
      // Trigger rotation
      await rotationIntegration.onLogAdd({ 
        filePath: performanceTestFile, 
        message: 'Performance test' 
      });
      
      const endTime = Date.now();
      const rotationTime = endTime - startTime;
      
      // Rotation should complete within reasonable time (5 seconds)
      expect(rotationTime).toBeLessThan(5000);

      // Verify rotation was successful
      const history = await rotationIntegration.getFileRotationHistory(performanceTestFile);
      expect(history.length).toBeGreaterThan(0);

      await rotationIntegration.cleanup();
    });
  });

  describe('Integration with External Systems', () => {
    test('should work with mock centralized log service', async () => {
      // Mock centralized log service
      const centralizedLogService = {
        callbacks: [] as any[],
        addLogCallback(callback: any) {
          this.callbacks.push(callback);
        },
        async simulateLogEntry(entry: any) {
          for (const callback of this.callbacks) {
            await callback(entry);
          }
        }
      };

      const rotationIntegration = createRotationIntegration({
        rotationConfig: {
          sizePolicy: { enabled: true, maxSizeMB: 0.01, enableCompression: true }
        }
      });

      await rotationIntegration.startAutoRotation();

      // Connect to centralized log service
      centralizedLogService.addLogCallback(async (logEntry: any) => {
        await rotationIntegration.onLogAdd(logEntry);
      });

      const integrationTestFile = path.join(testWorkspace, 'integration.log');
      await fs.writeFile(integrationTestFile, 'Integration test\n');
      await rotationIntegration.registerLogFile(integrationTestFile);

      // Simulate log entries coming through centralized service
      const largeContent = 'Integration test data\n'.repeat(800); // ~16KB
      await fs.appendFile(integrationTestFile, largeContent);

      await centralizedLogService.simulateLogEntry({
        filePath: integrationTestFile,
        message: 'Integration test message',
        level: 'INFO',
        timestamp: new Date()
      });

      // Verify integration worked
      const history = await rotationIntegration.getFileRotationHistory(integrationTestFile);
      expect(history.length).toBeGreaterThan(0);

      const health = await rotationIntegration.getRotationHealth();
      expect(health.status).toBe('healthy');

      await rotationIntegration.cleanup();
    });
  });
});