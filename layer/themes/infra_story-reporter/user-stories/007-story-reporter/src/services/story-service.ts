import { EventEmitter } from 'node:events';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';
import { 
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

  Story, 
  StoryStatus, 
  createDefaultStory, 
  validateStory,
  Requirement,
  UserStory,
  TestCase,
  RoleComment,
  CoverageReport,
  FraudCheckResult,
  verifyQualityGates
} from '../domain/story';

/**
 * Story Service - Core CRUD operations for story management
 * 
 * Provides persistence, retrieval, and lifecycle management for stories.
 * Emits events for all operations to enable reactive updates.
 */
export class StoryService extends EventEmitter {
  private storiesPath: string;
  private stories: Map<string, Story> = new Map();

  constructor(storiesPath: string = './stories') {
    super();
    this.storiesPath = storiesPath;
  }

  /**
   * Initialize the service and load existing stories
   */
  async initialize(): Promise<void> {
    try {
      // Ensure stories directory exists
      await fileAPI.createDirectory(this.storiesPath);
      
      // Load existing stories
      const files = await fs.readdir(this.storiesPath);
      const storyFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of storyFiles) {
        try {
          const content = await fileAPI.readFile(join(this.storiesPath, file), 'utf8');
          const story = JSON.parse(content);
          
          // Convert date strings back to Date objects
          story.createdAt = new Date(story.createdAt);
          story.updatedAt = new Date(story.updatedAt);
          story.comments.forEach((c: any) => c.timestamp = new Date(c.timestamp));
          story.requirements.forEach((r: any) => {
            r.clarifications.forEach((cl: any) => cl.timestamp = new Date(cl.timestamp));
          });
          
          this.stories.set(story.id, story);
        } catch (error) {
          this.emit('error', { 
            operation: "loadStory", 
            file, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      this.emit("initialized", { storyCount: this.stories.size });
    } catch (error) {
      this.emit('error', { 
        operation: "initialize", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Create a new story
   */
  async createStory(title: string, description: string = ''): Promise<Story> {
    const story = createDefaultStory(title);
    story.description = description;
    
    await this.saveStory(story);
    this.emit("storyCreated", { story });
    
    return story;
  }

  /**
   * Get a story by ID
   */
  async getStory(id: string): Promise<Story | null> {
    const story = this.stories.get(id);
    if (!story) {
      // Try loading from disk in case it was created externally
      try {
        const content = await fileAPI.readFile(join(this.storiesPath, `${id}.json`), 'utf8');
        const loadedStory = JSON.parse(content);
        this.stories.set(id, loadedStory);
        return loadedStory;
      } catch (error) {
        return null;
      }
    }
    return story;
  }

  /**
   * Get all stories
   */
  async getAllStories(): Promise<Story[]> {
    return Array.from(this.stories.values());
  }

  /**
   * Update a story
   */
  async updateStory(id: string, updates: Partial<Story>): Promise<Story | null> {
    const story = await this.getStory(id);
    if (!story) {
      return null;
    }
    
    // Merge updates
    const updatedStory: Story = {
      ...story,
      ...updates,
      id: story.id, // Prevent ID change
      createdAt: story.createdAt, // Preserve creation date
      updatedAt: new Date()
    };
    
    // Validate updated story
    validateStory(updatedStory);
    
    await this.saveStory(updatedStory);
    this.emit("storyUpdated", { story: updatedStory, updates });
    
    return updatedStory;
  }

  /**
   * Delete a story
   */
  async deleteStory(id: string): Promise<boolean> {
    const story = await this.getStory(id);
    if (!story) {
      return false;
    }
    
    try {
      await fileAPI.unlink(join(this.storiesPath, `${id}.json`));
      this.stories.delete(id);
      this.emit("storyDeleted", { id, story });
      return true;
    } catch (error) {
      this.emit('error', { 
        operation: "deleteStory", 
        id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Update story status
   */
  async updateStatus(id: string, status: StoryStatus): Promise<Story | null> {
    return this.updateStory(id, { status });
  }

  /**
   * Add a requirement to a story
   */
  async addRequirement(storyId: string, requirement: Requirement): Promise<Story | null> {
    const story = await this.getStory(storyId);
    if (!story) {
      return null;
    }
    
    const requirements = [...story.requirements, requirement];
    return this.updateStory(storyId, { requirements });
  }

  /**
   * Add a user story
   */
  async addUserStory(storyId: string, userStory: UserStory): Promise<Story | null> {
    const story = await this.getStory(storyId);
    if (!story) {
      return null;
    }
    
    const userStories = [...story.userStories, userStory];
    return this.updateStory(storyId, { userStories });
  }

  /**
   * Add a test case
   */
  async addTestCase(storyId: string, testCase: TestCase): Promise<Story | null> {
    const story = await this.getStory(storyId);
    if (!story) {
      return null;
    }
    
    const tests = [...story.tests, testCase];
    return this.updateStory(storyId, { tests });
  }

  /**
   * Add a role comment
   */
  async addComment(storyId: string, comment: RoleComment): Promise<Story | null> {
    const story = await this.getStory(storyId);
    if (!story) {
      return null;
    }
    
    // Remove existing comment from same role if any
    const comments = story.comments.filter(c => c.role !== comment.role);
    comments.push(comment);
    
    return this.updateStory(storyId, { comments });
  }

  /**
   * Update coverage report
   */
  async updateCoverage(storyId: string, coverage: CoverageReport): Promise<Story | null> {
    return this.updateStory(storyId, { coverage });
  }

  /**
   * Update fraud check result
   */
  async updateFraudCheck(storyId: string, fraudCheck: FraudCheckResult): Promise<Story | null> {
    return this.updateStory(storyId, { fraudCheck });
  }

  /**
   * Verify story quality gates
   */
  async verifyStory(storyId: string): Promise<{ story: Story; verification: any } | null> {
    const story = await this.getStory(storyId);
    if (!story) {
      return null;
    }
    
    const verification = verifyQualityGates(story);
    this.emit("storyVerified", { story, verification });
    
    return { story, verification };
  }

  /**
   * Search stories by criteria
   */
  async searchStories(criteria: {
    status?: StoryStatus;
    tags?: string[];
    project?: string;
    text?: string;
  }): Promise<Story[]> {
    let stories = Array.from(this.stories.values());
    
    if (criteria.status) {
      stories = stories.filter(s => s.status === criteria.status);
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      stories = stories.filter(s => 
        criteria.tags!.some(tag => s.metadata.tags.includes(tag))
      );
    }
    
    if (criteria.project) {
      stories = stories.filter(s => s.metadata.project === criteria.project);
    }
    
    if (criteria.text) {
      const searchText = criteria.text.toLowerCase();
      stories = stories.filter(s => 
        s.title.toLowerCase().includes(searchText) ||
        s.description.toLowerCase().includes(searchText)
      );
    }
    
    return stories;
  }

  /**
   * Get stories by status
   */
  async getStoriesByStatus(status: StoryStatus): Promise<Story[]> {
    return this.searchStories({ status });
  }

  /**
   * Get incomplete stories
   */
  async getIncompleteStories(): Promise<Story[]> {
    return Array.from(this.stories.values()).filter(s => 
      s.status !== StoryStatus.success
    );
  }

  /**
   * Get stories failing quality gates
   */
  async getFailingStories(): Promise<Array<{ story: Story; issues: string[] }>> {
    const failing: Array<{ story: Story; issues: string[] }> = [];
    
    for (const story of this.stories.values()) {
      const verification = verifyQualityGates(story);
      if (!verification.valid) {
        failing.push({ story, issues: verification.issues });
      }
    }
    
    return failing;
  }

  /**
   * Save a story to disk
   */
  private async saveStory(story: Story): Promise<void> {
    validateStory(story);
    
    const filePath = join(this.storiesPath, `${story.id}.json`);
    await fileAPI.createFile(filePath, JSON.stringify(story, { type: FileType.TEMPORARY }));
    
    this.stories.set(story.id, story);
    this.emit("storySaved", { story, filePath });
  }

  /**
   * Export story data for reporting
   */
  async exportStoryData(storyId: string): Promise<any> {
    const story = await this.getStory(storyId);
    if (!story) {
      return null;
    }
    
    const verification = verifyQualityGates(story);
    
    return {
      story,
      verification,
      summary: {
        requirementsCount: story.requirements.length,
        userStoriesCount: story.userStories.length,
        testsTotal: story.tests.length,
        testscompleted: story.tests.filter(t => t.status === 'In Progress').length,
        testsFailed: story.tests.filter(t => t.status === 'failed').length,
        coverage: story.coverage.overall,
        commentsCount: story.comments.length,
        qualityGatescompleted: verification.valid
      }
    };
  }

  /**
   * Import story from external source
   */
  async importStory(storyData: any): Promise<Story> {
    validateStory(storyData);
    
    // Ensure unique ID
    if (this.stories.has(storyData.id)) {
      storyData.id = `${storyData.id}_imported_${Date.now()}`;
    }
    
    await this.saveStory(storyData);
    this.emit("storyImported", { story: storyData });
    
    return storyData;
  }
}