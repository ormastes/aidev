import { fileAPI } from '../utils/file-api';
/**
 * VFSearchWrapper - Unified search across themes, epics, and user stories
 * 
 * This class provides both local (current + children) and global (top-level) search
 * capabilities across distributed features and NAME_ID virtual files.
 */

import { VFFileWrapper, QueryParams } from './VFFileWrapper';
import { VFDistributedFeatureWrapper, DistributedFeature, DistributedFeatureFile } from './VFDistributedFeatureWrapper';
import { VFNameIdWrapper, Entity, NameIdStorage } from './VFNameIdWrapper';
import { fsPromises as fs } from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

export interface SearchCriteria {
  query?: string;           // Text search in title/description/name
  tags?: string[];         // Tag filtering (OR operation)
  level?: string[];        // Filter by level (epic, theme, user_story)
  status?: string[];       // Filter by status
  assignee?: string;       // Filter by assignee
  epicId?: string;         // Find all stories under an epic
  type?: string;           // Entity type for NAME_ID search
  namespace?: string;      // Namespace for NAME_ID search
}

export interface SearchResult {
  type: 'feature' | 'entity';
  source: string;          // File path where found
  item: DistributedFeature | Entity;
  relevance: number;       // 0-1 relevance score
  highlight?: {            // Matching text snippets
    field: string;
    snippet: string;
  }[];
}

export interface SearchResponse {
  results: SearchResult[];
  facets: {
    levels: Record<string, number>;
    tags: Record<string, number>;
    status: Record<string, number>;
    sources: Record<string, number>;
  };
  totalResults: number;
  searchType: 'local' | 'global';
}

export class VFSearchWrapper extends VFFileWrapper {
  private featureWrapper: VFDistributedFeatureWrapper;
  private nameIdWrapper: VFNameIdWrapper;
  
  constructor(basePath: string = '') {
    super(basePath);
    this.featureWrapper = new VFDistributedFeatureWrapper(basePath);
    this.nameIdWrapper = new VFNameIdWrapper(basePath);
  }

  /**
   * Perform a search with specified criteria
   * @param criteria Search criteria
   * @param searchType 'local' for current+children, 'global' for top-level
   * @param startPath Starting path for search (defaults to basePath)
   */
  async search(
    criteria: SearchCriteria,
    searchType: 'local' | 'global' = 'local',
    startPath?: string
  ): Promise<SearchResponse> {
    const searchPath = startPath || this.basePath;
    const results: SearchResult[] = [];
    const facets = {
      levels: {} as Record<string, number>,
      tags: {} as Record<string, number>,
      status: {} as Record<string, number>,
      sources: {} as Record<string, number>
    };

    // Determine search scope
    const searchPaths = searchType === 'global' 
      ? await this.getGlobalSearchPaths()
      : await this.getLocalSearchPaths(searchPath);

    // Search in FEATURE.vf.json files
    for (const featurePath of searchPaths.features) {
      const featureResults = await this.searchFeatureFile(featurePath, criteria);
      results.push(...featureResults);
    }

    // Search in NAME_ID.vf.json files
    for (const nameIdPath of searchPaths.nameIds) {
      const entityResults = await this.searchNameIdFile(nameIdPath, criteria);
      results.push(...entityResults);
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Build facets
    for (const result of results) {
      // Update source facet
      facets.sources[result.source] = (facets.sources[result.source] || 0) + 1;

      if (result.type === 'feature') {
        const feature = result.item as DistributedFeature;
        
        // Level facet
        if (feature.data.level) {
          facets.levels[feature.data.level] = (facets.levels[feature.data.level] || 0) + 1;
        }
        
        // Status facet
        if (feature.data.status) {
          facets.status[feature.data.status] = (facets.status[feature.data.status] || 0) + 1;
        }
        
        // Tags facet
        if (feature.data.tags) {
          for (const tag of feature.data.tags) {
            facets.tags[tag] = (facets.tags[tag] || 0) + 1;
          }
        }
      } else if (result.type === 'entity') {
        const entity = result.item as Entity;
        
        // Tags from entity data
        const tags = entity.tags || (entity.data && entity.data.tags) || [];
        for (const tag of tags) {
          facets.tags[tag] = (facets.tags[tag] || 0) + 1;
        }
      }
    }

    return {
      results,
      facets,
      totalResults: results.length,
      searchType
    };
  }

  /**
   * Search for themes
   */
  async searchThemes(query?: string, tags?: string[]): Promise<SearchResult[]> {
    const criteria: SearchCriteria = {
      query,
      tags,
      level: ['theme']
    };
    const response = await this.search(criteria, 'global');
    return response.results;
  }

  /**
   * Search for epics
   */
  async searchEpics(query?: string, tags?: string[]): Promise<SearchResult[]> {
    const criteria: SearchCriteria = {
      query,
      tags,
      level: ['epic']
    };
    const response = await this.search(criteria, 'global');
    return response.results;
  }

  /**
   * Search for user stories
   */
  async searchUserStories(
    query?: string, 
    epicId?: string,
    tags?: string[]
  ): Promise<SearchResult[]> {
    const criteria: SearchCriteria = {
      query,
      tags,
      epicId,
      level: ['user_story']
    };
    const response = await this.search(criteria, 'global');
    return response.results;
  }

  /**
   * Get all stories under a specific theme
   */
  async getStoriesByTheme(themeName: string): Promise<SearchResult[]> {
    const themePath = path.join(this.basePath, 'layer', 'themes', themeName);
    const criteria: SearchCriteria = {
      level: ['user_story']
    };
    const response = await this.search(criteria, 'local', themePath);
    return response.results;
  }

  /**
   * Get feature hierarchy starting from a feature ID
   */
  async getFeatureHierarchy(featureId: string): Promise<any> {
    // Search globally for the feature
    const response = await this.search({ query: featureId }, 'global');
    
    if (response.results.length === 0) {
      return null;
    }

    const feature = response.results[0].item as DistributedFeature;
    const hierarchy: any = {
      feature,
      children: []
    };

    // Find all children
    if (feature.data.child_features) {
      for (const childId of feature.data.child_features) {
        const childHierarchy = await this.getFeatureHierarchy(childId);
        if (childHierarchy) {
          hierarchy.children.push(childHierarchy);
        }
      }
    }

    return hierarchy;
  }

  /**
   * Search in a FEATURE.vf.json file
   */
  private async searchFeatureFile(
    filePath: string,
    criteria: SearchCriteria
  ): Promise<SearchResult[]> {
    try {
      const featureFile = await this.featureWrapper.read(filePath);
      const results: SearchResult[] = [];

      // Search in features
      const allFeatures = this.extractAllFeatures(featureFile);
      
      for (const feature of allFeatures) {
        const relevance = this.calculateFeatureRelevance(feature, criteria);
        
        if (relevance > 0) {
          const highlights = this.getHighlights(feature, criteria.query);
          results.push({
            type: 'feature',
            source: filePath,
            item: feature,
            relevance,
            highlight: highlights
          });
        }
      }

      return results;
    } catch (error) {
      // File doesn't exist or is invalid
      return [];
    }
  }

  /**
   * Search in a NAME_ID.vf.json file
   */
  private async searchNameIdFile(
    filePath: string,
    criteria: SearchCriteria
  ): Promise<SearchResult[]> {
    try {
      // Build query string for NAME_ID search
      let queryPath = filePath;
      const queryParams: string[] = [];
      
      if (criteria.tags && criteria.tags.length > 0) {
        queryParams.push(...criteria.tags.map(tag => `tag=${encodeURIComponent(tag)}`));
      }
      
      if (criteria.type) {
        queryParams.push(`type=${encodeURIComponent(criteria.type)}`);
      }
      
      if (criteria.namespace) {
        queryParams.push(`namespace=${encodeURIComponent(criteria.namespace)}`);
      }
      
      if (queryParams.length > 0) {
        queryPath += '?' + queryParams.join('&');
      }

      const entities = await this.nameIdWrapper.read(queryPath);
      const results: SearchResult[] = [];

      // Handle both array results (filtered) and storage object (unfiltered)
      const entityList = Array.isArray(entities) 
        ? entities 
        : Object.values(entities as NameIdStorage).flat();

      for (const entity of entityList) {
        const relevance = this.calculateEntityRelevance(entity, criteria);
        
        if (relevance > 0) {
          const highlights = this.getEntityHighlights(entity, criteria.query);
          results.push({
            type: 'entity',
            source: filePath,
            item: entity,
            relevance,
            highlight: highlights
          });
        }
      }

      return results;
    } catch (error) {
      // File doesn't exist or is invalid
      return [];
    }
  }

  /**
   * Extract all features from a distributed feature file
   */
  private extractAllFeatures(featureFile: DistributedFeatureFile): DistributedFeature[] {
    const features: DistributedFeature[] = [];
    
    // Add features from main content
    if (featureFile.features) {
      for (const category of Object.values(featureFile.features)) {
        features.push(...category);
      }
    }
    
    // Add features from aggregated view
    if (featureFile.aggregated_view) {
      for (const category of Object.values(featureFile.aggregated_view)) {
        features.push(...category);
      }
    }
    
    return features;
  }

  /**
   * Calculate relevance score for a feature
   */
  private calculateFeatureRelevance(
    feature: DistributedFeature,
    criteria: SearchCriteria
  ): number {
    let score = 0;
    let matchCount = 0;
    let criteriaCount = 0;

    // Level filter
    if (criteria.level && criteria.level.length > 0) {
      criteriaCount++;
      if (criteria.level.includes(feature.data.level)) {
        score += 0.3;
        matchCount++;
      } else {
        return 0; // Hard filter
      }
    }

    // Status filter
    if (criteria.status && criteria.status.length > 0) {
      criteriaCount++;
      if (criteria.status.includes(feature.data.status)) {
        score += 0.2;
        matchCount++;
      } else {
        return 0; // Hard filter
      }
    }

    // Assignee filter
    if (criteria.assignee) {
      criteriaCount++;
      if (feature.data.assignee === criteria.assignee) {
        score += 0.2;
        matchCount++;
      } else {
        return 0; // Hard filter
      }
    }

    // Epic ID filter
    if (criteria.epicId) {
      criteriaCount++;
      if (feature.data.epic_id === criteria.epicId || 
          feature.data.parent_feature_id === criteria.epicId) {
        score += 0.3;
        matchCount++;
      } else {
        return 0; // Hard filter
      }
    }

    // Tag filter (OR operation)
    if (criteria.tags && criteria.tags.length > 0) {
      criteriaCount++;
      const featureTags = feature.data.tags || [];
      const hasMatchingTag = criteria.tags.some(tag => 
        featureTags.some(ft => ft.toLowerCase() === tag.toLowerCase())
      );
      
      if (hasMatchingTag) {
        score += 0.2;
        matchCount++;
      }
    }

    // Text search
    if (criteria.query) {
      criteriaCount++;
      const query = criteria.query.toLowerCase();
      const titleMatch = feature.data.title.toLowerCase().includes(query);
      const descMatch = feature.data.description.toLowerCase().includes(query);
      const nameMatch = feature.name.toLowerCase().includes(query);
      
      if (titleMatch) score += 0.4;
      if (descMatch) score += 0.3;
      if (nameMatch) score += 0.3;
      
      if (titleMatch || descMatch || nameMatch) {
        matchCount++;
      }
    }

    // If no criteria specified, include all
    if (criteriaCount === 0) {
      return 1;
    }

    // Calculate final score
    return matchCount > 0 ? score / criteriaCount : 0;
  }

  /**
   * Calculate relevance score for an entity
   */
  private calculateEntityRelevance(
    entity: Entity,
    criteria: SearchCriteria
  ): number {
    let score = 0;
    let matchCount = 0;
    let criteriaCount = 0;

    // Type filter
    if (criteria.type) {
      criteriaCount++;
      if (entity.data && entity.data.type === criteria.type) {
        score += 0.3;
        matchCount++;
      } else {
        return 0; // Hard filter
      }
    }

    // Namespace filter
    if (criteria.namespace) {
      criteriaCount++;
      if (entity.data && entity.data.namespace === criteria.namespace) {
        score += 0.3;
        matchCount++;
      } else {
        return 0; // Hard filter
      }
    }

    // Tag filter (handled by NAME_ID query params)
    if (criteria.tags && criteria.tags.length > 0) {
      // Tags are pre-filtered by VFNameIdWrapper
      score += 0.2;
      matchCount++;
      criteriaCount++;
    }

    // Text search
    if (criteria.query) {
      criteriaCount++;
      const query = criteria.query.toLowerCase();
      const nameMatch = entity.name.toLowerCase().includes(query);
      const dataMatch = JSON.stringify(entity.data).toLowerCase().includes(query);
      
      if (nameMatch) score += 0.5;
      if (dataMatch) score += 0.3;
      
      if (nameMatch || dataMatch) {
        matchCount++;
      }
    }

    // If no criteria specified, include all
    if (criteriaCount === 0) {
      return 1;
    }

    // Calculate final score
    return matchCount > 0 ? score / criteriaCount : 0;
  }

  /**
   * Get text highlights for a feature
   */
  private getHighlights(
    feature: DistributedFeature,
    query?: string
  ): { field: string; snippet: string }[] {
    if (!query) return [];
    
    const highlights: { field: string; snippet: string }[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Check title
    if (feature.data.title.toLowerCase().includes(lowerQuery)) {
      highlights.push({
        field: 'title',
        snippet: this.createSnippet(feature.data.title, query)
      });
    }
    
    // Check description
    if (feature.data.description.toLowerCase().includes(lowerQuery)) {
      highlights.push({
        field: "description",
        snippet: this.createSnippet(feature.data.description, query)
      });
    }
    
    return highlights;
  }

  /**
   * Get text highlights for an entity
   */
  private getEntityHighlights(
    entity: Entity,
    query?: string
  ): { field: string; snippet: string }[] {
    if (!query) return [];
    
    const highlights: { field: string; snippet: string }[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Check name
    if (entity.name.toLowerCase().includes(lowerQuery)) {
      highlights.push({
        field: 'name',
        snippet: this.createSnippet(entity.name, query)
      });
    }
    
    return highlights;
  }

  /**
   * Create a text snippet with the query highlighted
   */
  private createSnippet(text: string, query: string): string {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + query.length + 30);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  }

  /**
   * Get search paths for global search
   */
  private async getGlobalSearchPaths(): Promise<{
    features: string[];
    nameIds: string[];
  }> {
    const features: string[] = [];
    const nameIds: string[] = [];

    // Root level files
    features.push(path.join(this.basePath, 'FEATURE.vf.json'));
    nameIds.push(path.join(this.basePath, 'NAME_ID.vf.json'));

    // Theme level files
    const themesDir = path.join(this.basePath, 'layer', 'themes');
    try {
      const themes = await fs.readdir(themesDir);
      for (const theme of themes) {
        const themePath = path.join(themesDir, theme);
        const stat = await /* FRAUD_FIX: fs.stat(themePath) */;
        
        if (stat.isDirectory()) {
          features.push(path.join(themePath, 'FEATURE.vf.json'));
          nameIds.push(path.join(themePath, 'NAME_ID.vf.json'));
          
          // User stories
          const storiesDir = path.join(themePath, 'user-stories');
          try {
            const stories = await fs.readdir(storiesDir);
            for (const story of stories) {
              const storyPath = path.join(storiesDir, story);
              const storyStat = await /* FRAUD_FIX: fs.stat(storyPath) */;
              
              if (storyStat.isDirectory()) {
                features.push(path.join(storyPath, 'FEATURE.vf.json'));
                nameIds.push(path.join(storyPath, 'NAME_ID.vf.json'));
              }
            }
          } catch {
            // No user-stories directory
          }
        }
      }
    } catch {
      // No themes directory
    }

    return { features, nameIds };
  }

  /**
   * Get search paths for local search (current + children)
   */
  private async getLocalSearchPaths(
    startPath: string
  ): Promise<{
    features: string[];
    nameIds: string[];
  }> {
    const features: string[] = [];
    const nameIds: string[] = [];

    // Add current directory files
    features.push(path.join(startPath, 'FEATURE.vf.json'));
    nameIds.push(path.join(startPath, 'NAME_ID.vf.json'));

    // Recursively add children
    await this.addChildPaths(startPath, features, nameIds);

    return { features, nameIds };
  }

  /**
   * Recursively add child paths
   */
  private async addChildPaths(
    dirPath: string,
    features: string[],
    nameIds: string[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stat = await /* FRAUD_FIX: fs.stat(entryPath) */;
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          // Add VF files in this directory
          features.push(path.join(entryPath, 'FEATURE.vf.json'));
          nameIds.push(path.join(entryPath, 'NAME_ID.vf.json'));
          
          // Recurse into subdirectories
          await this.addChildPaths(entryPath, features, nameIds);
        }
      }
    } catch {
      // Directory not accessible
    }
  }
}