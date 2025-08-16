import { ThemeSetup } from '../../src/layer/themes/init_setup-folder/src/setup/theme-setup';
import { BaseSetup } from '../../src/layer/themes/init_setup-folder/src/setup/base-setup'; 
import * as fs from 'fs-extra';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';
import * as os from 'os';

// Mock child_process for testing
jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation((cmd) => {
    if (cmd.includes('node --version')) return 'v18.0.0';
    if (cmd.includes('npm --version')) return '8.0.0';
    if (cmd.includes('psql --version')) return 'psql (PostgreSQL) 14.0';
    if (cmd.includes('lsof -i:')) throw new Error('Port available');
    return '';
  })
}));

describe('Setup Folder System Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-test-'));
    process.chdir(tempDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    // Clean temp directory for each test
    const entries = fs.readdirSync(tempDir);
    entries.forEach(entry => {
      const fullPath = path.join(tempDir, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
    });
  });

  describe('ThemeSetup System Tests', () => {
    test('should create complete theme structure in VF mode', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'test-theme',
        mode: 'vf',
        themeName: 'Test Theme',
        description: 'A test theme for system testing',
        epicId: 'test-epic-001'
      });

      const success = await themeSetup.run();
      expect(success).toBe(true);

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'test-theme');
      
      // Verify directory structure
      expect(fs.existsSync(deployDir)).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'config'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'logs'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'data'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'public'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'test'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'stories'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'designs'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'documentation'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'tests'))).toBe(true);
      expect(fs.existsSync(path.join(deployDir, 'resources'))).toBe(true);
    });

    test('should create proper .env file with theme configuration', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'env-test-theme',
        mode: 'vf',
        themeName: 'Environment Test Theme',
        description: 'Testing environment configuration'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'env-test-theme');
      const envPath = path.join(deployDir, '.env');
      
      expect(fs.existsSync(envPath)).toBe(true);
      
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('DB_TYPE=sqlite');
      expect(envContent).toContain('SQLITE_PATH=./data/env-test-theme_theme.db');
      expect(envContent).toContain('THEME_ID=env-test-theme');
      expect(envContent).toContain('THEME_NAME="Environment Test Theme"');
      expect(envContent).toContain('AGILE_TYPE=theme');
      expect(envContent).toContain('NODE_ENV=agile_theme');
      expect(envContent).toContain('MODE=VF');
    });

    test('should create theme.json with proper metadata', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'metadata-theme',
        mode: 'md',
        themeName: 'Metadata Theme',
        description: 'Theme for metadata testing',
        epicId: 'epic-123'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'metadata-theme');
      const themeJsonPath = path.join(deployDir, 'theme.json');
      
      expect(fs.existsSync(themeJsonPath)).toBe(true);
      
      const themeData = fs.readJsonSync(themeJsonPath);
      expect(themeData.theme.id).toBe('metadata-theme');
      expect(themeData.theme.name).toBe('Metadata Theme');
      expect(themeData.theme.description).toBe('Theme for metadata testing');
      expect(themeData.theme.epicId).toBe('epic-123');
      expect(themeData.theme.status).toBe('planning');
      expect(themeData.theme.stories).toEqual([]);
      expect(themeData.theme.createdAt).toBeDefined();
      expect(themeData.theme.updatedAt).toBeDefined();
    });

    test('should create VF mode task queue files', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'vf-theme',
        mode: 'vf',
        themeName: 'VF Mode Theme'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'vf-theme');
      
      // Check TASK_QUEUE.vf.json
      const taskQueuePath = path.join(deployDir, 'TASK_QUEUE.vf.json');
      expect(fs.existsSync(taskQueuePath)).toBe(true);
      
      const taskQueue = fs.readJsonSync(taskQueuePath);
      expect(taskQueue.workingItem).toBeNull();
      expect(taskQueue.queues).toBeDefined();
      expect(taskQueue.queues.high).toEqual([]);
      expect(taskQueue.queues.medium).toEqual([]);
      expect(taskQueue.queues.low).toEqual([]);
      expect(taskQueue.metadata.processedCount).toBe(0);
      expect(taskQueue.metadata.failedCount).toBe(0);
      expect(taskQueue.metadata.lastUpdated).toBeDefined();

      // Check NAME_ID.vf.json
      const nameIdPath = path.join(deployDir, 'NAME_ID.vf.json');
      expect(fs.existsSync(nameIdPath)).toBe(true);
      
      const nameId = fs.readJsonSync(nameIdPath);
      expect(nameId).toEqual({});
    });

    test('should create MD mode task queue file', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'md-theme',
        mode: 'md', 
        themeName: 'MD Mode Theme'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'md-theme');
      const taskQueuePath = path.join(deployDir, 'TASK_QUEUE.md');
      
      expect(fs.existsSync(taskQueuePath)).toBe(true);
      
      const taskQueueContent = fs.readFileSync(taskQueuePath, 'utf-8');
      expect(taskQueueContent).toContain('# Task Queue');
      expect(taskQueueContent).toContain('## Working Item');
      expect(taskQueueContent).toContain('## High Priority Queue');
      expect(taskQueueContent).toContain('## Medium Priority Queue');
      expect(taskQueueContent).toContain('## Low Priority Queue');
      expect(taskQueueContent).toMatch(/Generated on \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    test('should create MCP configuration for VF mode', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'mcp-theme',
        mode: 'vf',
        themeName: 'MCP Theme'  
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'mcp-theme');
      const mcpConfigPath = path.join(deployDir, 'config', 'mcp-agent.json');
      
      expect(fs.existsSync(mcpConfigPath)).toBe(true);
      
      const mcpConfig = fs.readJsonSync(mcpConfigPath);
      expect(mcpConfig.mcpServers).toBeDefined();
      expect(mcpConfig.mcpServers.filesystem_mcp).toBeDefined();
      expect(mcpConfig.mcpServers.filesystem_mcp.command).toBe('node');
      expect(mcpConfig.mcpServers.filesystem_mcp.args).toEqual(['../../../layer/themes/filesystem_mcp/mcp-server.js']);
      expect(mcpConfig.mcpServers.filesystem_mcp.env.NODE_ENV).toBe('theme');
      expect(mcpConfig.mcpServers.filesystem_mcp.env.VF_BASE_PATH).toBe('.');
      
      expect(mcpConfig.globalShortcuts).toBeDefined();
      expect(mcpConfig.globalShortcuts.vf_read).toBe('filesystem_mcp');
      expect(mcpConfig.globalShortcuts.vf_write).toBe('filesystem_mcp');
      expect(mcpConfig.globalShortcuts.vf_list_features).toBe('filesystem_mcp');
    });

    test('should not create MCP configuration for MD mode', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'no-mcp-theme',
        mode: 'md',
        themeName: 'No MCP Theme'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'no-mcp-theme');
      const mcpConfigPath = path.join(deployDir, 'config', 'mcp-agent.json');
      
      expect(fs.existsSync(mcpConfigPath)).toBe(false);
    });

    test('should create proper package.json for theme', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'package-theme',
        mode: 'vf',
        themeName: 'Package Theme',
        epicId: 'epic-package'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'package-theme');
      const packageJsonPath = path.join(deployDir, 'package.json');
      
      expect(fs.existsSync(packageJsonPath)).toBe(true);
      
      const packageJson = fs.readJsonSync(packageJsonPath);
      expect(packageJson.name).toBe('@agile/theme-package-theme');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.description).toBe('Package Theme');
      expect(packageJson.type).toBe('theme');
      expect(packageJson.theme.id).toBe('package-theme');
      expect(packageJson.theme.name).toBe('Package Theme');
      expect(packageJson.theme.epicId).toBe('epic-package');
      
      expect(packageJson.scripts.status).toBe('node scripts/theme-status.js');
      expect(packageJson.scripts['add:story']).toBe('node scripts/add-story.js');
      expect(packageJson.scripts['list:stories']).toBe('node scripts/list-stories.js');
      expect(packageJson.scripts.report).toBe('node scripts/generate-theme-report.js');
    });

    test('should create story templates and backlog', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'story-theme',
        mode: 'md',
        themeName: 'Story Template Theme',
        description: 'Theme for testing story templates'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'story-theme');
      
      // Check story template
      const storyTemplatePath = path.join(deployDir, 'stories', 'STORY_TEMPLATE.md');
      expect(fs.existsSync(storyTemplatePath)).toBe(true);
      
      const storyTemplate = fs.readFileSync(storyTemplatePath, 'utf-8');
      expect(storyTemplate).toContain('# User Story Template');
      expect(storyTemplate).toContain('## User Story');
      expect(storyTemplate).toContain('As a [type of user]');
      expect(storyTemplate).toContain('I want [goal/desire]');
      expect(storyTemplate).toContain('So that [benefit/value]');
      expect(storyTemplate).toContain('## Acceptance Criteria');
      expect(storyTemplate).toContain('Template for stories under theme: Story Template Theme');

      // Check story backlog
      const backlogPath = path.join(deployDir, 'STORY_BACKLOG.md');
      expect(fs.existsSync(backlogPath)).toBe(true);
      
      const backlog = fs.readFileSync(backlogPath, 'utf-8');
      expect(backlog).toContain('# Story Template Theme - Story Backlog');
      expect(backlog).toContain('Theme for testing story templates');
      expect(backlog).toContain('### To Do');
      expect(backlog).toContain('### In Progress');
      expect(backlog).toContain('### In Review');
      expect(backlog).toContain('### Done');
      expect(backlog).toContain('Total Stories: 0');
    });

    test('should create theme documentation', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'doc-theme',
        mode: 'vf',
        themeName: 'Documentation Theme',
        description: 'A comprehensive theme for documentation testing',
        epicId: 'doc-epic-001'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'doc-theme');
      const themeDocPath = path.join(deployDir, 'THEME.md');
      
      expect(fs.existsSync(themeDocPath)).toBe(true);
      
      const themeDoc = fs.readFileSync(themeDocPath, 'utf-8');
      expect(themeDoc).toContain('# Theme: Documentation Theme');
      expect(themeDoc).toContain('A comprehensive theme for documentation testing');
      expect(themeDoc).toContain('- **ID**: doc-theme');
      expect(themeDoc).toContain('- **Name**: Documentation Theme');
      expect(themeDoc).toContain('- **Parent Epic**: doc-epic-001');
      expect(themeDoc).toContain('## Theme Objectives');
      expect(themeDoc).toContain('## User Stories');
      expect(themeDoc).toContain('## Success Criteria');
      expect(themeDoc).toContain('*This theme is managed in VF mode*');
    });

    test('should handle theme without epic ID', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'no-epic-theme',
        mode: 'md',
        themeName: 'No Epic Theme'
      });

      await themeSetup.run();

      const deployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'no-epic-theme');
      
      // Check .env file
      const envPath = path.join(deployDir, '.env');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('# No parent epic');

      // Check theme documentation
      const themeDocPath = path.join(deployDir, 'THEME.md');
      const themeDoc = fs.readFileSync(themeDocPath, 'utf-8');
      expect(themeDoc).toContain('- **Parent Epic**: None (standalone theme)');

      // Check theme.json
      const themeJsonPath = path.join(deployDir, 'theme.json');
      const themeData = fs.readJsonSync(themeJsonPath);
      expect(themeData.theme.epicId).toBeUndefined();

      // Check package.json
      const packageJsonPath = path.join(deployDir, 'package.json');
      const packageJson = fs.readJsonSync(packageJsonPath);
      expect(packageJson.theme.epicId).toBeUndefined();
    });
  });

  describe('BaseSetup Branch Coverage Tests', () => {
    test('should cover all port allocation branches', () => {
      // Test different deployment types for port allocation
      const testCases = [
        { deploymentType: 'release', expectedKey: 'production' },
        { deploymentType: 'epic', expectedKey: 'agile' },
        { deploymentType: 'theme', expectedKey: 'agile' },
        { deploymentType: 'story', expectedKey: 'agile' },
        { deploymentType: 'test', expectedKey: 'test' },
        { deploymentType: 'demo', expectedKey: 'demo' },
        { deploymentType: 'unknown', expectedKey: 'demo' } // default case
      ];

      testCases.forEach(({ deploymentType, expectedKey }) => {
        const themeSetup = new ThemeSetup({
          appName: 'port-test',
          mode: 'md',
          themeName: 'Port Test Theme'
        });

        // Access protected method via type assertion
        const baseSetup = themeSetup as any;
        baseSetup.deploymentType = deploymentType;
        
        const port = baseSetup.getPortAllocation();
        expect(typeof port).toBe('number');
        expect(port).toBeGreaterThan(0);
      });
    });

    test('should test requirements checking branches', async () => {
      const { execSync } = require('child_process');
      
      // Test successful requirements check
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('node --version')) return 'v18.0.0';
        if (cmd.includes('npm --version')) return '9.0.0';
        if (cmd.includes('psql --version')) return 'psql (PostgreSQL) 15.0';
        return '';
      });

      const themeSetup = new ThemeSetup({
        appName: 'req-test',
        mode: 'md',
        themeName: 'Requirements Test'
      });

      const baseSetup = themeSetup as any;
      const result = await baseSetup.checkRequirements();
      expect(result).toBe(true);

      // Test missing Node.js
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('node --version')) throw new Error('command not found');
        return '';
      });

      const result2 = await baseSetup.checkRequirements();
      expect(result2).toBe(false);

      // Test missing PostgreSQL (should still pass)
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('node --version')) return 'v18.0.0';
        if (cmd.includes('npm --version')) return '9.0.0';
        if (cmd.includes('psql --version')) throw new Error('command not found');
        return '';
      });

      const result3 = await baseSetup.checkRequirements();
      expect(result3).toBe(true);
    });

    test('should test port availability checking branches', async () => {
      const { execSync } = require('child_process');
      
      const themeSetup = new ThemeSetup({
        appName: 'port-check-test',
        mode: 'md',
        themeName: 'Port Check Test'
      });

      const baseSetup = themeSetup as any;

      // Test port in use (lsof returns result)
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('lsof -i:3000')) return 'process using port';
        return '';
      });

      const portInUse = await baseSetup.checkPortAvailability(3000);
      expect(portInUse).toBe(false);

      // Test port available (lsof throws error)
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('lsof -i:3001')) throw new Error('no process found');
        return '';
      });

      const portAvailable = await baseSetup.checkPortAvailability(3001);
      expect(portAvailable).toBe(true);
    });

    test('should test task queue creation branches for different modes', async () => {
      // Test VF mode
      const vfTheme = new ThemeSetup({
        appName: 'vf-queue-test',
        mode: 'vf',
        themeName: 'VF Queue Test'
      });

      await vfTheme.run();

      const vfDeployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'vf-queue-test');
      expect(fs.existsSync(path.join(vfDeployDir, 'TASK_QUEUE.vf.json'))).toBe(true);
      expect(fs.existsSync(path.join(vfDeployDir, 'NAME_ID.vf.json'))).toBe(true);
      expect(fs.existsSync(path.join(vfDeployDir, 'TASK_QUEUE.md'))).toBe(false);

      // Clean up for next test
      fs.rmSync(vfDeployDir, { recursive: true, force: true });

      // Test MD mode
      const mdTheme = new ThemeSetup({
        appName: 'md-queue-test',
        mode: 'md',
        themeName: 'MD Queue Test'
      });

      await mdTheme.run();

      const mdDeployDir = path.join(tempDir, 'scripts', 'setup', 'agile', 'themes', 'md-queue-test');
      expect(fs.existsSync(path.join(mdDeployDir, 'TASK_QUEUE.md'))).toBe(true);
      expect(fs.existsSync(path.join(mdDeployDir, 'TASK_QUEUE.vf.json'))).toBe(false);
      expect(fs.existsSync(path.join(mdDeployDir, 'NAME_ID.vf.json'))).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle directory creation failures', async () => {
      // Create a theme setup that will try to write to a read-only location
      const themeSetup = new ThemeSetup({
        appName: 'fail-test',
        mode: 'md',
        themeName: 'Failure Test'
      });

      const baseSetup = themeSetup as any;
      
      // Mock fs.ensureDir to throw an error
      const originalEnsureDir = fs.ensureDir;
      fs.ensureDir = jest.fn().mockRejectedValue(new Error('Permission denied'));

      try {
        const result = await baseSetup.createDirectoryStructure();
        expect(result).toBe(false);
      } finally {
        // Restore original function
        fs.ensureDir = originalEnsureDir;
      }
    });

    test('should handle environment file creation failures', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'env-fail-test',
        mode: 'md',
        themeName: 'Env Fail Test'
      });

      const baseSetup = themeSetup as any;
      
      // Mock fs.writeFile to throw an error
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Disk full'));

      try {
        const result = await baseSetup.createEnvFile();
        expect(result).toBe(false);
      } finally {
        // Restore original function
        fs.writeFile = originalWriteFile;
      }
    });

    test('should handle task queue creation failures', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'queue-fail-test',
        mode: 'vf',
        themeName: 'Queue Fail Test'
      });

      const baseSetup = themeSetup as any;
      
      // Mock fs.writeJson to throw an error
      const originalWriteJson = fs.writeJson;
      fs.writeJson = jest.fn().mockRejectedValue(new Error('Write error'));

      try {
        const result = await baseSetup.createTaskQueue();
        expect(result).toBe(false);
      } finally {
        // Restore original function
        fs.writeJson = originalWriteJson;
      }
    });

    test('should handle MCP config creation failures', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'mcp-fail-test',
        mode: 'vf',
        themeName: 'MCP Fail Test'
      });

      const baseSetup = themeSetup as any;
      
      // Mock fs.writeJson to throw an error for MCP config
      const originalWriteJson = fs.writeJson;
      let callCount = 0;
      fs.writeJson = jest.fn().mockImplementation(async (file, data, options) => {
        callCount++;
        if (file.includes('mcp-agent.json')) {
          throw new Error('MCP config write error');
        }
        return originalWriteJson(file, data, options);
      });

      try {
        const result = await baseSetup.createMcpConfig();
        expect(result).toBe(false);
      } finally {
        // Restore original function
        fs.writeJson = originalWriteJson;
      }
    });

    test('should fail gracefully when step fails during run', async () => {
      const themeSetup = new ThemeSetup({
        appName: 'run-fail-test',
        mode: 'md',
        themeName: 'Run Fail Test'
      });

      // Mock checkRequirements to fail
      const baseSetup = themeSetup as any;
      const originalCheckRequirements = baseSetup.checkRequirements;
      baseSetup.checkRequirements = jest.fn().mockResolvedValue(false);

      try {
        const result = await themeSetup.run();
        expect(result).toBe(false);
      } finally {
        // Restore original method
        baseSetup.checkRequirements = originalCheckRequirements;
      }
    });
  });
});