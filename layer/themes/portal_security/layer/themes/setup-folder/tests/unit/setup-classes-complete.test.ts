import { StorySetup } from '../../children/src/setup/story-setup';
import { DemoSetup } from '../../children/src/setup/demo-setup';
import { ThemeSetup } from '../../children/src/setup/theme-setup';
import * as fs from 'fs-extra';

describe('Setup Classes - Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('StorySetup - Full Coverage', () => {
    it('should run complete story setup', async () => {
      const story = new StorySetup({
        appName: 'test-story',
        mode: 'vf',
        title: 'Test Story',
        description: 'Test description',
      });

      // Mock all internal methods
      jest.spyOn(story as any, 'checkRequirements').mockResolvedValue(true);
      jest.spyOn(story as any, 'createDirectoryStructure').mockResolvedValue(true);
      jest.spyOn(story as any, 'createEnvFile').mockResolvedValue(true);
      jest.spyOn(story as any, 'createTaskQueue').mockResolvedValue(true);
      jest.spyOn(story as any, 'createMcpConfig').mockResolvedValue(true);
      jest.spyOn(story as any, 'createStoryDocumentation').mockResolvedValue(undefined);
      jest.spyOn(story as any, 'createStoryStructure').mockResolvedValue(undefined);
      jest.spyOn(story as any, 'createStoryPackageJson').mockResolvedValue(undefined);
      jest.spyOn(story as any, 'createStoryTaskBoard').mockResolvedValue(undefined);
      jest.spyOn(story as any, 'createTestStructure').mockResolvedValue(undefined);

      const result = await story.run();
      expect(result).toBe(true);
    });

    it('should handle story setup error', async () => {
      const story = new StorySetup({
        appName: 'error-story',
        mode: 'vf',
        title: 'Error Story',
        description: 'Test error',
      });

      jest.spyOn(story as any, 'checkRequirements').mockResolvedValue(true);
      jest.spyOn(story as any, 'createDirectoryStructure').mockResolvedValue(true);
      jest.spyOn(story as any, 'createEnvFile').mockResolvedValue(true);
      jest.spyOn(story as any, 'createTaskQueue').mockResolvedValue(true);
      jest.spyOn(story as any, 'createMcpConfig').mockResolvedValue(true);
      jest.spyOn(story as any, 'createStoryDocumentation').mockRejectedValue(new Error('Failed'));

      const result = await story.createDeploymentConfig();
      expect(result).toBe(false);
    });
  });

  describe('DemoSetup - Full Coverage', () => {
    it('should run complete demo setup', async () => {
      const demo = new DemoSetup({
        appName: 'test-demo',
        mode: 'vf',
        language: 'typescript',
      });

      // Mock all internal methods
      jest.spyOn(demo as any, 'checkRequirements').mockResolvedValue(true);
      jest.spyOn(demo as any, 'createDirectoryStructure').mockResolvedValue(true);
      jest.spyOn(demo as any, 'createEnvFile').mockResolvedValue(true);
      jest.spyOn(demo as any, 'createTaskQueue').mockResolvedValue(true);
      jest.spyOn(demo as any, 'createMcpConfig').mockResolvedValue(true);
      jest.spyOn(demo as any, 'createGitignore').mockResolvedValue(undefined);
      jest.spyOn(demo as any, 'createPackageJson').mockResolvedValue(undefined);
      jest.spyOn(demo as any, 'createTsConfig').mockResolvedValue(undefined);
      jest.spyOn(demo as any, 'createReadme').mockResolvedValue(undefined);
      jest.spyOn(demo as any, 'createSampleCode').mockResolvedValue(undefined);
      jest.spyOn(demo as any, 'installDependencies').mockResolvedValue(undefined);

      const result = await demo.run();
      expect(result).toBe(true);
    });

    it('should handle Python demo setup', async () => {
      const demo = new DemoSetup({
        appName: 'python-demo',
        mode: 'vf',
        language: 'python',
      });

      jest.spyOn(demo as any, 'createRequirementsTxt').mockResolvedValue(undefined);
      jest.spyOn(demo as any, 'createPythonSampleCode').mockResolvedValue(undefined);

      // The method should handle Python-specific setup
      await demo['createSampleCode']();
      expect(demo['createPythonSampleCode']).toHaveBeenCalled();
    });
  });

  describe('ThemeSetup - Error Cases', () => {
    it('should handle theme creation with all errors', async () => {
      const theme = new ThemeSetup({
        appName: 'error-theme',
        mode: 'vf',
        themeName: 'Error Theme',
      });

      jest.spyOn(theme as any, 'checkRequirements').mockResolvedValue(false);

      const result = await theme.run();
      expect(result).toBe(false);
    });
  });
});