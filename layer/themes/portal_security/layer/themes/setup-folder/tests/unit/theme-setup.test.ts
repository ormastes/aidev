import { ThemeSetup } from '../../children/src/setup/theme-setup';
import { ThemeSetupOptions, PORT_ALLOCATIONS } from '../../children/src/types';
import * as fs from 'fs-extra';
import { path } from '../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';

// Mocks are configured in jest.setup.js

describe('ThemeSetup', () => {
  let themeSetup: ThemeSetup;
  const mockOptions: ThemeSetupOptions = {
    appName: 'test-theme-app',
    mode: 'vf',
    themeName: 'Test Theme',
    description: 'Test theme description',
    epicId: 'epic-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    themeSetup = new ThemeSetup(mockOptions);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with theme-specific properties', () => {
      expect(themeSetup['themeName']).toBe('Test Theme');
      expect(themeSetup['description']).toBe('Test theme description');
      expect(themeSetup['epicId']).toBe('epic-123');
      expect(themeSetup['deploymentType']).toBe('theme');
    });

    it('should generate default description when not provided', () => {
      const setupWithoutDesc = new ThemeSetup({
        ...mockOptions,
        description: undefined,
      });
      expect(setupWithoutDesc['description']).toBe('Agile theme: Test Theme');
    });

    it('should handle missing epicId', () => {
      const setupWithoutEpic = new ThemeSetup({
        ...mockOptions,
        epicId: undefined,
      });
      expect(setupWithoutEpic['epicId']).toBeUndefined();
    });
  });

  describe('getDeployDir', () => {
    it('should return correct deployment directory path', () => {
      const deployDir = themeSetup.getDeployDir();
      expect(deployDir).toContain('scripts/setup/agile/themes/test-theme-app');
    });
  });

  describe('getDbPassword', () => {
    it('should return theme-specific database password', () => {
      const password = themeSetup.getDbPassword();
      expect(password).toBe('theme_password_2024');
    });
  });

  describe('getEnvConfig', () => {
    it('should generate correct environment configuration with epic', () => {
      const envConfig = themeSetup.getEnvConfig();
      
      expect(envConfig).toContain('# Agile Theme Environment Configuration');
      expect(envConfig).toContain('DB_TYPE=sqlite');
      expect(envConfig).toContain(`SQLITE_PATH=./data/test-theme-app_theme.db`);
      expect(envConfig).toContain('PORT=');
      expect(envConfig).toContain('AGILE_TYPE=theme');
      expect(envConfig).toContain('THEME_ID=test-theme-app');
      expect(envConfig).toContain('THEME_NAME="Test Theme"');
      expect(envConfig).toContain('PARENT_EPIC=epic-123');
      expect(envConfig).toContain('NODE_ENV=agile_theme');
      expect(envConfig).toContain('MODE=VF');
    });

    it('should handle missing epic in env config', () => {
      const setupWithoutEpic = new ThemeSetup({
        ...mockOptions,
        epicId: undefined,
      });
      const envConfig = setupWithoutEpic.getEnvConfig();
      
      expect(envConfig).toContain('# No parent epic');
      expect(envConfig).not.toContain('PARENT_EPIC=');
    });
  });

  describe('getPortAllocation', () => {
    it('should return correct port for theme deployment', () => {
      const port = themeSetup['getPortAllocation']();
      const expectedPort = PORT_ALLOCATIONS.agile.main + 10;
      expect(port).toBe(expectedPort);
    });
  });

  describe('createDeploymentConfig', () => {
    beforeEach(() => {
      // Mock all the internal methods
      themeSetup['createThemeDocumentation'] = jest.fn().mockResolvedValue(true);
      themeSetup['createThemeStructure'] = jest.fn().mockResolvedValue(true);
      themeSetup['createThemePackageJson'] = jest.fn().mockResolvedValue(true);
      themeSetup['createStoryTemplates'] = jest.fn().mockResolvedValue(true);
    });

    it('should successfully create deployment configuration', async () => {
      const result = await themeSetup.createDeploymentConfig();
      
      expect(result).toBe(true);
      expect(themeSetup['createThemeDocumentation']).toHaveBeenCalled();
      expect(themeSetup['createThemeStructure']).toHaveBeenCalled();
      expect(themeSetup['createThemePackageJson']).toHaveBeenCalled();
      expect(themeSetup['createStoryTemplates']).toHaveBeenCalled();
    });

    it('should handle errors during deployment config creation', async () => {
      themeSetup['createThemeDocumentation'] = jest.fn().mockRejectedValue(new Error('Doc creation failed'));
      
      const result = await themeSetup.createDeploymentConfig();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create theme deployment config'));
    });
  });

  describe('createThemeDocumentation', () => {
    it('should create theme documentation files', async () => {
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
      
      await themeSetup['createThemeDocumentation']();
      
      // Check THEME.md creation
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('THEME.md'),
        expect.stringContaining('Test Theme')
      );
    });
  });

  describe('createThemeStructure', () => {
    it('should create theme directory structure', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      
      await themeSetup['createThemeStructure']();
      
      // Check that theme directories are created
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('stories'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('designs'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('documentation'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('tests'));
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('resources'));
    });
  });

  describe('createThemePackageJson', () => {
    it('should create theme-specific package.json', async () => {
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
      
      await themeSetup['createThemePackageJson']();
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.objectContaining({
          name: '@agile/theme-test-theme-app'
        }),
        { spaces: 2 }
      );
    });
  });

  describe('createStoryTemplates', () => {
    it('should create story template files', async () => {
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
      
      await themeSetup['createStoryTemplates']();
      
      // Check story template creation
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('stories/STORY_TEMPLATE.md'),
        expect.stringContaining('User Story Template')
      );
    });
  });

  describe('printSuccessMessage', () => {
    it('should print theme-specific success message', () => {
      themeSetup.printSuccessMessage();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Theme setup completed'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-theme-app'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test Theme'));
    });
  });
});