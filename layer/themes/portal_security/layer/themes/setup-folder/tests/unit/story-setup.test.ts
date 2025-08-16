import { StorySetup } from '../../children/src/setup/story-setup';
import { StorySetupOptions, PORT_ALLOCATIONS } from '../../children/src/types';
import * as fs from 'fs-extra';
import { path } from '../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';

// Mocks are configured in jest.setup.js

describe("StorySetup", () => {
  let storySetup: StorySetup;
  const mockOptions: StorySetupOptions = {
    appName: 'test-story-app',
    mode: 'vf',
    title: 'Test Story',
    description: 'Test story description',
    themeId: 'theme-123',
    epicId: 'epic-456',
    acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    tasks: ['Task 1', 'Task 2'],
    priority: 'high',
    storyPoints: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storySetup = new StorySetup(mockOptions);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("constructor", () => {
    it('should initialize with story-specific properties', () => {
      expect(storySetup['title']).toBe('Test Story');
      expect(storySetup["description"]).toBe('Test story description');
      expect(storySetup['epicId']).toBe('epic-456');
      expect(storySetup['themeId']).toBe('theme-123');
      expect(storySetup["acceptanceCriteria"]).toEqual(['Criteria 1', 'Criteria 2']);
      expect(storySetup['tasks']).toEqual(['Task 1', 'Task 2']);
      expect(storySetup["priority"]).toBe('high');
      expect(storySetup["storyPoints"]).toBe(5);
      expect(storySetup["deploymentType"]).toBe('story');
    });

    it('should use default values when optional properties not provided', () => {
      const minimalSetup = new StorySetup({
        appName: 'minimal-story',
        mode: 'vf',
        title: 'Minimal Story',
        description: 'Minimal description',
      });
      
      expect(minimalSetup["acceptanceCriteria"]).toEqual([]);
      expect(minimalSetup['tasks']).toEqual([]);
      expect(minimalSetup["priority"]).toBe('medium');
      expect(minimalSetup["storyPoints"]).toBe(3);
    });
  });

  describe("getDeployDir", () => {
    it('should return correct deployment directory path', () => {
      const deployDir = storySetup.getDeployDir();
      expect(deployDir).toContain('scripts/setup/agile/stories/test-story-app');
    });
  });

  describe("getDbPassword", () => {
    it('should return story-specific database password', () => {
      const password = storySetup.getDbPassword();
      expect(password).toBe('story_password_2024');
    });
  });

  describe("getEnvConfig", () => {
    it('should generate correct environment configuration', () => {
      const envConfig = storySetup.getEnvConfig();
      
      expect(envConfig).toContain('# Agile User Story Environment Configuration');
      expect(envConfig).toContain('DB_TYPE=sqlite');
      expect(envConfig).toContain(`SQLITE_PATH=./data/test-story-app_story.db`);
      expect(envConfig).toContain('PORT=');
      expect(envConfig).toContain('AGILE_TYPE=story');
      expect(envConfig).toContain('STORY_ID=test-story-app');
      expect(envConfig).toContain('STORY_TITLE="Test Story"');
      expect(envConfig).toContain('PARENT_THEME=theme-123');
      expect(envConfig).toContain('PARENT_EPIC=epic-456');
      expect(envConfig).toContain('PRIORITY=high');
      expect(envConfig).toContain('STORY_POINTS=5');
      expect(envConfig).toContain('NODE_ENV=agile_story');
      expect(envConfig).toContain('MODE=VF');
    });

    it('should handle missing parent references', () => {
      const orphanStory = new StorySetup({
        appName: 'orphan-story',
        mode: 'vf',
        title: 'Orphan Story',
        description: 'No parents',
      });
      
      const envConfig = orphanStory.getEnvConfig();
      expect(envConfig).toContain('# No parent theme');
      expect(envConfig).toContain('# No parent epic');
    });
  });

  describe("getPortAllocation", () => {
    it('should return correct port for story deployment', () => {
      const port = storySetup["getPortAllocation"]();
      const expectedPort = PORT_ALLOCATIONS.agile.main + 20; // Offset for stories
      expect(port).toBe(expectedPort);
    });
  });

  describe("createDeploymentConfig", () => {
    beforeEach(() => {
      // Mock all the internal methods
      storySetup["createStoryDocumentation"] = jest.fn().mockResolvedValue(true);
      storySetup["createStoryStructure"] = jest.fn().mockResolvedValue(true);
      storySetup["createStoryPackageJson"] = jest.fn().mockResolvedValue(true);
      storySetup["createDevelopmentArtifacts"] = jest.fn().mockResolvedValue(true);
    });

    it('should successfully create deployment configuration', async () => {
      const result = await storySetup.createDeploymentConfig();
      
      expect(result).toBe(true);
      expect(storySetup["createStoryDocumentation"]).toHaveBeenCalled();
      expect(storySetup["createStoryStructure"]).toHaveBeenCalled();
      expect(storySetup["createStoryPackageJson"]).toHaveBeenCalled();
      expect(storySetup["createDevelopmentArtifacts"]).toHaveBeenCalled();
    });

    it('should handle errors during deployment config creation', async () => {
      storySetup["createStoryDocumentation"] = jest.fn().mockRejectedValue(new Error('Doc creation failed'));
      
      const result = await storySetup.createDeploymentConfig();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create story deployment config'));
    });
  });

  describe("printSuccessMessage", () => {
    it('should print story-specific success message', () => {
      storySetup.printSuccessMessage();
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('User story setup completed'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-story-app'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test Story'));
    });
  });
});