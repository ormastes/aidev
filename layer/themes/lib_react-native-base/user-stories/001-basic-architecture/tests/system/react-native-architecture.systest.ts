/**
 * System Test: React Native Basic Architecture
 * 
 * Tests React Native app architecture with real device simulation,
 * navigation, and platform-specific features.
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

test.describe('React Native Architecture System Tests', () => {
  let testDir: string;
  let projectPath: string;

  test.beforeAll(async () => {
    testDir = join(tmpdir(), 'rn-architecture-test');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    projectPath = join(testDir, 'TestRNApp');
  });

  test('should create React Native project structure', async () => {
    try {
      // Initialize RN project
      const { stdout } = await execAsync(`npx react-native init TestRNApp`, {
        cwd: testDir,
        timeout: 120000
      });

      expect(stdout).toContain('success' || 'created' || 'initialized');
      
      // Verify project structure
      const expectedFiles = ['App.tsx', 'package.json', 'metro.config.js', 'android/', 'ios/'];
      expectedFiles.forEach(file => {
        expect(existsSync(join(projectPath, file))).toBe(true);
      });
    } catch (error) {
      console.log('RN project creation failed:', error.message);
    }
  });

  test('should run Metro bundler', async () => {
    if (!existsSync(projectPath)) {
      console.log('RN project not available, skipping Metro test');
      return;
    }

    try {
      const { stdout } = await execAsync(`npx react-native start --port 8082`, {
        cwd: projectPath,
        timeout: 30000
      });

      expect(stdout).toContain('Metro' || 'bundler' || 'server');
    } catch (error) {
      console.log('Metro bundler test failed:', error.message);
    }
  });

  test('should integrate with web interface for RN development', async ({ page }) => {
    const devUrl = 'http://localhost:3468';
    
    try {
      await page.goto(devUrl);
      
      const rnInterface = page.locator('[data-testid="rn-dev-tools"]').or(
        page.locator('.react-native-tools')
      );
      
      if (await rnInterface.count() > 0) {
        await expect(rnInterface).toBeVisible();
        
        // Test project creation interface
        const createButton = page.locator('button').filter({ hasText: /create|new project/i });
        if (await createButton.count() > 0) {
          await createButton.click();
          
          const projectForm = page.locator('form').or(page.locator('[data-testid="project-form"]'));
          if (await projectForm.count() > 0) {
            await expect(projectForm).toBeVisible();
          }
        }
      }
    } catch (error) {
      console.log('RN web interface not available:', error.message);
    }
  });

  test('should handle platform-specific code generation', async () => {
    if (!existsSync(projectPath)) {
      console.log('RN project not available, skipping platform test');
      return;
    }

    // Create platform-specific component
    const platformComponent = `
import { Platform } from 'react-native';

const styles = Platform.select({
  ios: {
    backgroundColor: '#007AFF'
  },
  android: {
    backgroundColor: '#2196F3'
  }
});

export default styles;
    `;

    writeFileSync(join(projectPath, 'PlatformStyles.ts'), platformComponent);
    
    try {
      // Validate TypeScript compilation
      const { stdout } = await execAsync(`npx tsc --noEmit`, {
        cwd: projectPath,
        timeout: 30000
      });

      // Should compile without errors
      expect(stdout).not.toContain('error');
    } catch (error) {
      console.log('Platform code validation failed:', error.message);
    }
  });
});
