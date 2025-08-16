import { VFFileWrapper } from './VFFileWrapper';
import { fsPromises as fs } from '../../infra_external-log-lib/dist';
import { path } from '../../infra_external-log-lib/src';

// Generate UUID without external dependency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface DistributedFeatureMetadata {
  level: 'root' | 'epic' | 'theme' | 'user_story';
  parent_id?: string;
  common_epic?: string;
  path: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface DistributedFeature {
  id: string;
  name: string;
  data: {
    title: string;
    description: string;
    level: 'root' | 'epic' | 'theme' | 'user_story';
    parent_feature_id?: string;
    epic_id?: string;
    status: 'planned' | 'in-progress' | 'completed' | 'blocked';
    priority: 'critical' | 'high' | 'medium' | 'low';
    tags?: string[];
    assignee?: string;
    dueDate?: string;
    dependencies?: string[];
    components?: string[];
    acceptanceCriteria?: string[];
    child_features?: string[];
    virtual_path: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DistributedFeatureFile {
  metadata: DistributedFeatureMetadata;
  features: Record<string, DistributedFeature[]>;
  children?: string[];
  aggregated_view?: Record<string, DistributedFeature[]>;
}

export class VFDistributedFeatureWrapper extends VFFileWrapper {
  private commonEpicPrefix = 'common-';
  private featureFileLocations = {
    root: '/FEATURE.vf.json',
    epic: '/layer/themes/{theme_name}/FEATURE.vf.json',
    theme: '/layer/themes/{theme_name}/FEATURE.vf.json',
    user_story: '/layer/themes/{theme_name}/user-stories/{story_name}/FEATURE.vf.json'
  };

  constructor(filePath: string, schemaPath?: string) {
    super(filePath);
    this.filePath = filePath;
  }

  private filePath: string;

  /**
   * Read distributed feature file with aggregated view from children
   */
  async read(queryPath: string): Promise<DistributedFeatureFile> {
    const { path: cleanPath, params } = this.parseQueryParams(queryPath);
    
    // Read the base file
    const baseContent = await super.read(cleanPath) as DistributedFeatureFile;
    
    // Handle case when file doesn't exist or is null
    if (!baseContent) {
      return {
        metadata: {
          level: 'root',
          path: cleanPath,
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        features: {}
      };
    }
    
    // If this file has children, aggregate them
    if (baseContent.children && baseContent.children.length > 0) {
      baseContent.aggregated_view = await this.aggregateChildFeatures(baseContent);
    }
    
    // Apply filters if any
    if (params.level) {
      const level = Array.isArray(params.level) ? params.level[0] : params.level;
      return this.filterByLevel(baseContent, level);
    }
    
    return baseContent;
  }

  /**
   * Write distributed feature file with automatic parent-child relationship management
   */
  async write(queryPath: string, content: DistributedFeatureFile): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(queryPath);
    
    // Ensure metadata is properly set
    content.metadata.updated_at = new Date().toISOString();
    if (!content.metadata.created_at) {
      content.metadata.created_at = content.metadata.updated_at;
    }
    
    // Process features to ensure proper parent-child relationships
    await this.processParentChildRelationships(content);
    
    // Validate and save
    await super.write(cleanPath, content);
    
    // Update parent references if this has a parent
    if (content.metadata.parent_id) {
      await this.updateParentReferences(content);
    }
  }

  /**
   * Add a new feature with automatic epic assignment
   */
  async addFeature(
    categoryName: string, 
    feature: Omit<DistributedFeature, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const featureFile = await this.read(this.filePath) as DistributedFeatureFile;
    
    // Generate ID and timestamps
    const newFeature: DistributedFeature = {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...feature
    };
    
    // Ensure epic assignment
    await this.ensureEpicAssignment(newFeature, featureFile);
    
    // Add to the appropriate category
    if (!featureFile.features[categoryName]) {
      featureFile.features[categoryName] = [];
    }
    featureFile.features[categoryName].push(newFeature);
    
    // Save the updated file
    await this.write(this.filePath, featureFile);
    
    return newFeature.id;
  }

  /**
   * Create a common epic if feature doesn't have a parent epic
   */
  private async ensureEpicAssignment(
    feature: DistributedFeature, 
    featureFile: DistributedFeatureFile
  ): Promise<void> {
    // If feature is at root or epic level, it doesn't need epic assignment
    if (feature.data.level === 'root' || feature.data.level === 'epic') {
      return;
    }
    
    // If feature already has an epic_id, use it
    if (feature.data.epic_id) {
      return;
    }
    
    // Try to find parent epic
    const parentEpic = await this.findParentEpic(feature, featureFile);
    if (parentEpic) {
      feature.data.epic_id = parentEpic.id;
      feature.data.parent_feature_id = parentEpic.id;
      return;
    }
    
    // Create or find common epic
    const commonEpic = await this.getOrCreateCommonEpic(featureFile);
    feature.data.epic_id = commonEpic.id;
    feature.data.parent_feature_id = commonEpic.id;
  }

  /**
   * Find parent epic by traversing up the hierarchy
   */
  private async findParentEpic(
    feature: DistributedFeature, 
    featureFile: DistributedFeatureFile
  ): Promise<DistributedFeature | null> {
    // Look for epic in current file
    for (const [, features] of Object.entries(featureFile.features)) {
      const epic = features.find(f => 
        f.data.level === 'epic' && 
        f.data.virtual_path === this.getExpectedEpicPath(feature.data.virtual_path)
      );
      if (epic) return epic;
    }
    
    // Look in parent files if this file has a parent
    if (featureFile.metadata.parent_id) {
      const parentPath = this.getParentPath(featureFile.metadata.path);
      if (parentPath) {
        const parentFile = await this.read(parentPath) as DistributedFeatureFile;
        return this.findParentEpic(feature, parentFile);
      }
    }
    
    return null;
  }

  /**
   * Get or create a common epic for orphaned features
   */
  private async getOrCreateCommonEpic(featureFile: DistributedFeatureFile): Promise<DistributedFeature> {
    const commonEpicId = `${this.commonEpicPrefix}${this.getThemeFromPath(featureFile.metadata.path)}`;
    
    // Look for existing common epic
    for (const [, features] of Object.entries(featureFile.features)) {
      const commonEpic = features.find(f => f.id === commonEpicId);
      if (commonEpic) return commonEpic;
    }
    
    // Create new common epic
    const commonEpic: DistributedFeature = {
      id: commonEpicId,
      name: 'Common Features',
      data: {
        title: `Common Features - ${this.getThemeFromPath(featureFile.metadata.path)}`,
        description: 'Auto-generated epic for features without explicit parent epic',
        level: 'epic',
        status: 'in-progress',
        priority: 'medium',
        tags: ['auto-generated', 'common'],
        child_features: [],
        virtual_path: featureFile.metadata.path
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to common category
    if (!featureFile.features.common) {
      featureFile.features.common = [];
    }
    featureFile.features.common.push(commonEpic);
    
    return commonEpic;
  }

  /**
   * Process parent-child relationships in the feature file
   */
  private async processParentChildRelationships(content: DistributedFeatureFile): Promise<void> {
    const allFeatures: DistributedFeature[] = [];
    
    // Collect all features
    for (const [, features] of Object.entries(content.features)) {
      allFeatures.push(...features);
    }
    
    // Update child_features arrays
    for (const feature of allFeatures) {
      if (feature.data.level === 'root' || feature.data.level === 'epic') {
        const children = allFeatures.filter(f => f.data.parent_feature_id === feature.id);
        feature.data.child_features = children.map(c => c.id);
      }
    }
  }

  /**
   * Aggregate child features from all child files
   */
  private async aggregateChildFeatures(
    content: DistributedFeatureFile
  ): Promise<Record<string, DistributedFeature[]>> {
    const aggregated: Record<string, DistributedFeature[]> = {};
    
    // Start with current file's features
    for (const [category, features] of Object.entries(content.features)) {
      aggregated[category] = [...features];
    }
    
    // Add features from child files
    if (content.children) {
      for (const childPath of content.children) {
        try {
          const childFile = await this.read(childPath) as DistributedFeatureFile;
          
          // Skip if child file doesn't exist or is null
          if (!childFile || !childFile.features) {
            continue;
          }
          
          // Add child's features
          for (const [category, features] of Object.entries(childFile.features)) {
            if (!aggregated[category]) {
              aggregated[category] = [];
            }
            aggregated[category].push(...features);
          }
          
          // Recursively add child's aggregated view
          if (childFile.aggregated_view) {
            for (const [category, features] of Object.entries(childFile.aggregated_view)) {
              if (!aggregated[category]) {
                aggregated[category] = [];
              }
              aggregated[category].push(...features);
            }
          }
        } catch (error) {
          console.warn(`Failed to read child file ${childPath}:`, error);
        }
      }
    }
    
    return aggregated;
  }

  /**
   * Update parent file references when a child is modified
   */
  private async updateParentReferences(content: DistributedFeatureFile): Promise<void> {
    if (!content.metadata.parent_id) return;
    
    const parentPath = this.getParentPath(content.metadata.path);
    if (!parentPath) return;
    
    try {
      const parentFile = await this.read(parentPath) as DistributedFeatureFile;
      
      // Ensure this file is in parent's children list
      if (!parentFile.children) {
        parentFile.children = [];
      }
      
      if (!parentFile.children.includes(content.metadata.path)) {
        parentFile.children.push(content.metadata.path);
        await this.write(parentPath, parentFile);
      }
    } catch (error) {
      console.warn(`Failed to update parent references for ${parentPath}:`, error);
    }
  }

  /**
   * Filter feature file by level
   */
  private filterByLevel(content: DistributedFeatureFile, level: string): DistributedFeatureFile {
    const filtered: DistributedFeatureFile = {
      ...content,
      features: {},
      aggregated_view: {}
    };
    
    // Filter features
    for (const [category, features] of Object.entries(content.features)) {
      const levelFeatures = features.filter(f => f.data.level === level);
      if (levelFeatures.length > 0) {
        filtered.features[category] = levelFeatures;
      }
    }
    
    // Filter aggregated view
    if (content.aggregated_view) {
      if (!filtered.aggregated_view) {
        filtered.aggregated_view = {};
      }
      for (const [category, features] of Object.entries(content.aggregated_view)) {
        const levelFeatures = features.filter(f => f.data.level === level);
        if (levelFeatures.length > 0) {
          filtered.aggregated_view[category] = levelFeatures;
        }
      }
    }
    
    return filtered;
  }

  /**
   * Helper methods
   */
  private getExpectedEpicPath(virtualPath: string): string {
    const parts = virtualPath.split('/');
    if (parts.includes('themes') && parts.includes('user-stories')) {
      // Remove user-stories part to get theme level
      const themeIndex = parts.indexOf('themes');
      return parts.slice(0, themeIndex + 2).join('/') + '/FEATURE.vf.json';
    }
    return virtualPath;
  }

  private getParentPath(currentPath: string): string | null {
    const parts = currentPath.split('/');
    if (parts.length <= 2) return null;
    
    // Remove the last directory part
    parts.pop();
    if (parts[parts.length - 1] === 'user-stories') {
      parts.pop(); // Remove user-stories to get to theme level
    }
    
    return parts.join('/') + '/FEATURE.vf.json';
  }

  private getThemeFromPath(virtualPath: string): string {
    const parts = virtualPath.split('/');
    const themeIndex = parts.indexOf('themes');
    if (themeIndex >= 0 && themeIndex < parts.length - 1) {
      return parts[themeIndex + 1];
    }
    return 'unknown';
  }
}