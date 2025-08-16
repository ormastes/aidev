import { themeCommand } from '../../../children/src/commands/theme';
import { ThemeSetup } from '../../../children/src/setup/theme-setup';
import chalk from 'chalk';

// Mock dependencies
jest.mock('../../../children/src/setup/theme-setup');
jest.mock('../../../children/src/utils/mode', () => ({
  getMode: jest.fn((options) => options.mdMode ? 'md' : 'vf')
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('theme command', () => {
  let mockThemeSetup: jest.Mocked<ThemeSetup>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create mock instance
    mockThemeSetup = {
      run: jest.fn().mockResolvedValue(true),
    } as any;
    
    (ThemeSetup as jest.MockedClass<typeof ThemeSetup>).mockImplementation(() => mockThemeSetup);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('command configuration', () => {
    it('should have correct command name and description', () => {
      expect(themeCommand.name()).toBe('theme');
      expect(themeCommand.description()).toBe('Setup an Agile theme environment (ports 3200-3299)');
    });

    it('should have correct arguments and options', () => {
      const args = themeCommand.args;
      expect(args[0].name()).toBe('app-name');
      expect(args[0].defaultValue).toBe('ai_dev_portal_theme');

      const options = themeCommand.options;
      expect(options.find(o => o.long === '--name')).toBeDefined();
      expect(options.find(o => o.long === '--description')).toBeDefined();
      expect(options.find(o => o.long === '--epic')).toBeDefined();
      expect(options.find(o => o.long === '--skip-db')).toBeDefined();
      expect(options.find(o => o.long === '--md-mode')).toBeDefined();
    });
  });

  describe('action handler', () => {
    it('should create theme setup with default options', async () => {
      await themeCommand.parseAsync(['node', 'test', 'my-theme']);
      
      expect(ThemeSetup).toHaveBeenCalledWith({
        appName: 'my-theme',
        mode: 'vf',
        skipDb: undefined,
        themeName: 'New Theme',
        description: 'Agile theme for my-theme',
        epicId: undefined
      });
      
      expect(mockThemeSetup.run).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up Agile theme')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully')
      );
    });

    it('should handle custom options', async () => {
      await themeCommand.parseAsync([
        'node', 'test', 'custom-theme',
        '--name', 'Custom Theme',
        '--description', 'Custom description',
        '--epic', 'epic-123',
        '--skip-db',
        '--md-mode'
      ]);
      
      expect(ThemeSetup).toHaveBeenCalledWith({
        appName: 'custom-theme',
        mode: 'md',
        skipDb: true,
        themeName: 'Custom Theme',
        description: 'Custom description',
        epicId: 'epic-123'
      });
    });

    it('should handle setup failure', async () => {
      mockThemeSetup.run.mockResolvedValue(false);
      
      try {
        await themeCommand.parseAsync(['node', 'test', 'fail-theme']);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('setup failed')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle setup error', async () => {
      mockThemeSetup.run.mockRejectedValue(new Error('Setup error'));
      
      try {
        await themeCommand.parseAsync(['node', 'test', 'error-theme']);
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }
      
      expect(console.error).toHaveBeenCalledWith(
        chalk.red('Error:'),
        expect.any(Error)
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});