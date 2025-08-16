import { StorySetup } from '../../children/src/setup/story-setup';
import { DemoSetup } from '../../children/src/setup/demo-setup';
import * as fs from 'fs-extra';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import chalk from 'chalk';
import { execSync } from 'child_process';

describe('All Setup Classes - Maximum Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset mocks to success state
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeJson as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (execSync as unknown as jest.Mock).mockReturnValue('');
  });

  describe('StorySetup - Complete Methods', () => {
    const story = new StorySetup({
      appName: 'full-story',
      mode: 'vf',
      title: 'Full Coverage Story',
      description: 'Testing all methods',
      themeId: 'theme-123',
      epicId: 'epic-456',
      acceptanceCriteria: ['AC1', 'AC2'],
      tasks: ['Task1', 'Task2'],
      priority: 'high',
      storyPoints: 8,
    });

    it('should create story documentation', async () => {
      await story["createStoryDocumentation"]();
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('STORY.md'),
        expect.stringContaining('Full Coverage Story')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ACCEPTANCE_CRITERIA.md'),
        expect.stringContaining('AC1')
      );
    });

    it('should create story structure', async () => {
      await story["createStoryStructure"]();
      
      const expectedDirs = ['src', 'tests', 'docs', 'assets'];
      expectedDirs.forEach(dir => {
        expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining(dir));
      });
    });

    it('should create story package.json', async () => {
      await story["createStoryPackageJson"]();
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.objectContaining({
          name: expect.stringContaining('full-story'),
          type: 'story'
        }),
        { spaces: 2 }
      );
    });

    it('should create development artifacts', async () => {
      await story["createDevelopmentArtifacts"]();
      
      // Should create TASKS.md
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('TASKS.md'),
        expect.stringContaining('Task1')
      );
      
      // Should create test template
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.test.ts'),
        expect.stringContaining('Acceptance Criteria Tests')
      );
      
      // Should create implementation stub
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.ts'),
        expect.stringContaining("Implementation")
      );
      
      // Should create README
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('README.md'),
        expect.stringContaining('Full Coverage Story')
      );
    });
  });

  describe('DemoSetup - Complete Methods', () => {
    const demo = new DemoSetup({
      appName: 'full-demo',
      mode: 'vf',
      language: "typescript",
    });

    it('should create node project', async () => {
      await demo["createNodeProject"]();
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.objectContaining({
          name: 'full-demo',
          scripts: expect.any(Object)
        }),
        { spaces: 2 }
      );
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.gitignore'),
        expect.stringContaining('node_modules')
      );
    });

    it('should create python project', async () => {
      const pythonDemo = new DemoSetup({
        appName: 'python-demo',
        mode: 'vf',
        language: 'python',
      });
      
      await pythonDemo["createPythonProject"]();
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('setup.py'),
        expect.stringContaining('python-demo')
      );
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('requirements.txt'),
        expect.any(String)
      );
    });

    it('should create TypeScript config within createNodeProject', async () => {
      await demo["createNodeProject"]();
      
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('tsconfig.json'),
        expect.objectContaining({
          compilerOptions: expect.any(Object)
        }),
        { spaces: 2 }
      );
    });

    it('should create README', async () => {
      await demo["createReadme"]();
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('README.md'),
        expect.stringContaining('Full Demo')
      );
    });

    it('should create FEATURE.md', async () => {
      await demo["createFeatureMd"]();
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('FEATURE.md'),
        expect.stringContaining('Feature Backlog')
      );
    });

    it('should handle deployment config with config file', async () => {
      const configData = { description: 'Test config', dependencies: ['express'] };
      (fs.readJsonSync as jest.Mock).mockReturnValue(configData);
      
      const demoWithConfig = new DemoSetup({
        appName: 'demo-with-config',
        mode: 'vf',
        language: "typescript",
        configFile: 'test-config.json'
      });
      
      expect(fs.readJsonSync).toHaveBeenCalledWith('test-config.json');
    });

    it('should handle Python language in createDeploymentConfig', async () => {
      const pythonDemo = new DemoSetup({
        appName: 'python-demo',
        mode: 'vf',
        language: 'python',
      });
      
      pythonDemo["createPythonProject"] = jest.fn().mockResolvedValue(undefined);
      pythonDemo["createNodeProject"] = jest.fn().mockResolvedValue(undefined);
      pythonDemo["createFeatureMd"] = jest.fn().mockResolvedValue(undefined);
      pythonDemo["createReadme"] = jest.fn().mockResolvedValue(undefined);
      
      await pythonDemo.createDeploymentConfig();
      
      expect(pythonDemo["createPythonProject"]).toHaveBeenCalled();
      expect(pythonDemo["createNodeProject"]).not.toHaveBeenCalled();
    });

    it('should handle JavaScript demo', async () => {
      const jsDemo = new DemoSetup({
        appName: 'js-demo',
        mode: 'vf',
        language: "javascript",
      });

      const result = await jsDemo.createDeploymentConfig();
      expect(result).toBe(true);
      // Should not call createTsConfig
    });
  });
});