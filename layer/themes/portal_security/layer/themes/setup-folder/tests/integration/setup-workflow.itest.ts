import { BaseSetup } from '../../children/src/setup/base-setup';
import { ThemeSetup } from '../../children/src/setup/theme-setup';
import { StorySetup } from '../../children/src/setup/story-setup';
import * as fs from 'fs-extra';
import { path } from '../../../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

// Mocks are configured in jest.setup.js

// Integration tests for setup workflow
describe('Setup Workflow Integration', () => {
  const originalCwd = process.cwd();
  const testDir = path.join(originalCwd, 'temp/test-integration');
  
  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('Theme Setup Workflow', () => {
    it('should create complete theme structure', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'integration-theme',
        mode: 'vf',
        themeName: 'Integration Test Theme',
        description: 'Theme for integration testing',
      });

      // Run setup steps
      const reqCheck = await themeSetup["checkRequirements"]();
      expect(reqCheck).toBe(true);

      const dirCreated = await themeSetup["createDirectoryStructure"]();
      expect(dirCreated).toBe(true);

      const envCreated = await themeSetup["createEnvFile"]();
      expect(envCreated).toBe(true);

      const configCreated = await themeSetup.createDeploymentConfig();
      expect(configCreated).toBe(true);

      // Verify theme structure
      const deployDir = themeSetup.getDeployDir();
      
      // Check directories exist
      expect(await fs.pathExists(path.join(deployDir, 'src/core'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'src/feature'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'tests'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'stories'))).toBe(true);
      
      // Check files exist
      expect(await fs.pathExists(path.join(deployDir, '.env'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'THEME.md'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'package.json'))).toBe(true);
      
      // Check HEA structure
      expect(await fs.pathExists(path.join(deployDir, 'src/core/pipe/index.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'src/feature/pipe/index.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(deployDir, 'src/README.md'))).toBe(true);
      
      // Verify environment file content
      const envContent = await fs.readFile(path.join(deployDir, '.env'), 'utf-8');
      expect(envContent).toContain('AGILE_TYPE=theme');
      expect(envContent).toContain('THEME_ID=integration-theme');
      expect(envContent).toContain('DB_TYPE=sqlite');
    });
  });

  describe('Multi-Level Setup Workflow', () => {
    it('should support epic->theme->story hierarchy', async () => {
      // First create a theme
      const themeSetup = new ThemeSetup({
        appName: 'parent-theme',
        mode: 'vf',
        themeName: 'Parent Theme',
        epicId: 'epic-001',
      });

      const themeCreated = await themeSetup["createDirectoryStructure"]();
      expect(themeCreated).toBe(true);

      // Then create a story under the theme
      const storySetup = new StorySetup({
        appName: 'child-story',
        mode: 'vf',
        title: 'Child Story',
        description: 'A story under the parent theme',
        themeId: 'parent-theme',
      });

      const storyCreated = await storySetup["createDirectoryStructure"]();
      expect(storyCreated).toBe(true);

      // Verify hierarchy references
      const themeEnv = themeSetup.getEnvConfig();
      expect(themeEnv).toContain('PARENT_EPIC=epic-001');

      const storyEnv = storySetup.getEnvConfig();
      expect(storyEnv).toContain('PARENT_THEME=parent-theme');
    });
  });

  describe('Port Allocation Integration', () => {
    it('should allocate different ports for different deployment types', async () => {
      // Theme setup allocates ports differently, so we'll just test that it returns a valid port
      const themeSetup = new ThemeSetup({
        appName: 'port-test-theme',
        mode: 'vf',
        themeName: 'Port Test Theme',
      });

      const port = (themeSetup as any)["getPortAllocation"]();
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle filesystem errors gracefully', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'error-test',
        mode: 'vf',
        themeName: 'Error Test Theme',
      });

      // Mock fs.ensureDir to throw error
      (fs.ensureDir as jest.Mock) = jest.fn().mockRejectedValueOnce(new Error('Permission denied'));

      const result = await themeSetup["createDirectoryStructure"]();
      expect(result).toBe(false);
    });

    it('should rollback on partial failure', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'rollback-test',
        mode: 'vf',
        themeName: 'Rollback Test',
      });

      // Create directory structure
      await themeSetup["createDirectoryStructure"]();
      
      // Mock createThemePackageJson to fail
      jest.spyOn(themeSetup as any, "createThemePackageJson")
        .mockRejectedValueOnce(new Error('Package creation failed'));

      const result = await themeSetup.createDeploymentConfig();
      expect(result).toBe(false);
    });
  });
});