/**
 * Partial Generator for incremental manual updates
 * Generates only changed sections to optimize performance
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { crypto } from '../../../../../infra_external-log-lib/src';
import { ManualGenerator } from '../core/ManualGenerator';
import { TestDocument, ParsedTest, TestCase, DocumentSection } from '../core/types';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface PartialGenerationOptions {
  cacheDir?: string;
  enableCache?: boolean;
  detectChanges?: boolean;
  updateStrategy?: UpdateStrategy;
  preserveUserEdits?: boolean;
  generateDiff?: boolean;
}

export interface PartialGenerationResult {
  success: boolean;
  document?: TestDocument;
  updatedSections?: string[];
  unchangedSections?: string[];
  diff?: DiffResult;
  cached?: boolean;
  error?: string;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}

export interface UpdateStrategy {
  type: 'full' | 'incremental' | 'smart';
  preserveSections?: string[];
  forceSections?: string[];
  mergeStrategy?: 'overwrite' | 'merge' | 'preserve';
}

interface CacheEntry {
  hash: string;
  document: TestDocument;
  timestamp: Date;
  filePath: string;
}

export class PartialGenerator {
  private options: PartialGenerationOptions;
  private generator: ManualGenerator;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDir: string;

  constructor(options: PartialGenerationOptions = {}) {
    this.options = {
      cacheDir: options.cacheDir || '.manual-cache',
      enableCache: options.enableCache !== false,
      detectChanges: options.detectChanges !== false,
      updateStrategy: options.updateStrategy || { type: 'smart' },
      preserveUserEdits: options.preserveUserEdits || false,
      generateDiff: options.generateDiff || false,
      ...options
    };

    this.cacheDir = this.options.cacheDir!;
    this.generator = new ManualGenerator();
    
    if (this.options.enableCache) {
      this.initializeCache();
    }
  }

  /**
   * Generate or update manual with partial generation
   */
  async generate(filePath: string): Promise<PartialGenerationResult> {
    try {
      // Check cache first
      if (this.options.enableCache) {
        const cached = await this.checkCache(filePath);
        if (cached && !await this.hasChanged(filePath, cached)) {
          return {
            success: true,
            document: cached.document,
            cached: true,
            unchangedSections: this.getSectionIds(cached.document)
          };
        }
      }

      // Generate new document
      const result = await this.generator.generateFromFile(filePath);
      if (!result.success || !result.document) {
        return {
          success: false,
          error: result.error
        };
      }

      const newDocument = result.document;

      // Detect changes if previous version exists
      if (this.options.detectChanges && this.cache.has(filePath)) {
        const oldDocument = this.cache.get(filePath)!.document;
        const diff = this.detectChanges(oldDocument, newDocument);
        
        // Apply update strategy
        const updatedDocument = await this.applyUpdateStrategy(
          oldDocument,
          newDocument,
          diff
        );

        // Update cache
        if (this.options.enableCache) {
          await this.updateCache(filePath, updatedDocument);
        }

        return {
          success: true,
          document: updatedDocument,
          updatedSections: diff.modified.concat(diff.added),
          unchangedSections: diff.unchanged,
          diff: this.options.generateDiff ? diff : undefined
        };
      }

      // Store in cache
      if (this.options.enableCache) {
        await this.updateCache(filePath, newDocument);
      }

      return {
        success: true,
        document: newDocument,
        updatedSections: this.getSectionIds(newDocument)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Partial generation failed'
      };
    }
  }

  /**
   * Generate multiple files with partial updates
   */
  async generateBatch(filePaths: string[]): Promise<Map<string, PartialGenerationResult>> {
    const results = new Map<string, PartialGenerationResult>();
    
    // Process files with change detection
    for (const filePath of filePaths) {
      const result = await this.generate(filePath);
      results.set(filePath, result);
    }
    
    return results;
  }

  /**
   * Invalidate cache for specific file
   */
  async invalidateCache(filePath: string): Promise<void> {
    this.cache.delete(filePath);
    
    const cacheFile = this.getCacheFilePath(filePath);
    try {
      await fs.unlink(cacheFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): {
    totalEntries: number;
    cacheSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: entries.length,
      cacheSize: JSON.stringify(entries).length,
      oldestEntry: entries.length > 0 
        ? entries.reduce((oldest, entry) => 
            entry.timestamp < oldest ? entry.timestamp : oldest,
            entries[0].timestamp
          )
        : undefined,
      newestEntry: entries.length > 0
        ? entries.reduce((newest, entry) =>
            entry.timestamp > newest ? entry.timestamp : newest,
            entries[0].timestamp
          )
        : undefined
    };
  }

  private async initializeCache(): Promise<void> {
    try {
      await fileAPI.createDirectory(this.cacheDir);
      
      // Load existing cache files
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.cache.json')) {
          try {
            const content = await fs.readFile(
              path.join(this.cacheDir, file),
              'utf-8'
            );
            const entry: CacheEntry = JSON.parse(content);
            this.cache.set(entry.filePath, entry);
          } catch (error) {
            // Skip invalid cache files
          }
        }
      }
    } catch (error) {
      // Continue without cache if initialization fails
    }
  }

  private async checkCache(filePath: string): Promise<CacheEntry | null> {
    // Check memory cache first
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }
    
    // Check disk cache
    const cacheFile = this.getCacheFilePath(filePath);
    try {
      const content = await fs.readFile(cacheFile, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);
      
      // Validate cache entry
      if (entry.filePath === filePath) {
        this.cache.set(filePath, entry);
        return entry;
      }
    } catch (error) {
      // Cache miss
    }
    
    return null;
  }

  private async updateCache(filePath: string, document: TestDocument): Promise<void> {
    const hash = await this.calculateHash(filePath);
    const entry: CacheEntry = {
      hash,
      document,
      timestamp: new Date(),
      filePath
    };
    
    // Update memory cache
    this.cache.set(filePath, entry);
    
    // Update disk cache
    const cacheFile = this.getCacheFilePath(filePath);
    try {
      await fileAPI.createFile(cacheFile, JSON.stringify(entry, { type: FileType.TEMPORARY }),
        'utf-8'
      );
    } catch (error) {
      // Continue without disk cache
    }
  }

  private async hasChanged(filePath: string, cached: CacheEntry): Promise<boolean> {
    const currentHash = await this.calculateHash(filePath);
    return currentHash !== cached.hash;
  }

  private async calculateHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private async detectChanges(
    oldDocument: TestDocument,
    newDocument: TestDocument
  ): DiffResult {
    const oldSections = new Map(oldDocument.sections.map(s => [s.id, s]));
    const newSections = new Map(newDocument.sections.map(s => [s.id, s]));
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];
    
    // Check for removed and modified sections
    for (const [id, oldSection] of oldSections) {
      if (!newSections.has(id)) {
        removed.push(id);
      } else {
        const newSection = newSections.get(id)!;
        if (this.sectionChanged(oldSection, newSection)) {
          modified.push(id);
        } else {
          unchanged.push(id);
        }
      }
    }
    
    // Check for added sections
    for (const [id] of newSections) {
      if (!oldSections.has(id)) {
        added.push(id);
      }
    }
    
    return { added, removed, modified, unchanged };
  }

  private async sectionChanged(
    oldSection: DocumentSection,
    newSection: DocumentSection
  ): boolean {
    // Compare section content
    if (oldSection.content !== newSection.content) {
      return true;
    }
    
    // Compare test cases
    const oldTestCases = JSON.stringify(oldSection.testCases || []);
    const newTestCases = JSON.stringify(newSection.testCases || []);
    if (oldTestCases !== newTestCases) {
      return true;
    }
    
    // Compare subsections recursively
    if (oldSection.subsections?.length !== newSection.subsections?.length) {
      return true;
    }
    
    if (oldSection.subsections && newSection.subsections) {
      for (let i = 0; i < oldSection.subsections.length; i++) {
        if (this.sectionChanged(oldSection.subsections[i], newSection.subsections[i])) {
          return true;
        }
      }
    }
    
    return false;
  }

  private async applyUpdateStrategy(
    oldDocument: TestDocument,
    newDocument: TestDocument,
    diff: DiffResult
  ): Promise<TestDocument> {
    const strategy = this.options.updateStrategy!;
    
    switch (strategy.type) {
      case 'full':
        return newDocument;
      
      case 'incremental':
        return this.mergeDocuments(oldDocument, newDocument, diff, strategy);
      
      case 'smart':
        return this.smartMerge(oldDocument, newDocument, diff, strategy);
      
      default:
        return newDocument;
    }
  }

  private async mergeDocuments(
    oldDocument: TestDocument,
    newDocument: TestDocument,
    diff: DiffResult,
    strategy: UpdateStrategy
  ): TestDocument {
    const merged = { ...newDocument };
    const oldSections = new Map(oldDocument.sections.map(s => [s.id, s]));
    const newSections = new Map(newDocument.sections.map(s => [s.id, s]));
    
    // Preserve specified sections
    if (strategy.preserveSections) {
      for (const sectionId of strategy.preserveSections) {
        if (oldSections.has(sectionId)) {
          const index = merged.sections.findIndex(s => s.id === sectionId);
          if (index >= 0) {
            merged.sections[index] = oldSections.get(sectionId)!;
          }
        }
      }
    }
    
    // Force update specified sections
    if (strategy.forceSections) {
      for (const sectionId of strategy.forceSections) {
        if (newSections.has(sectionId)) {
          const index = merged.sections.findIndex(s => s.id === sectionId);
          if (index >= 0) {
            merged.sections[index] = newSections.get(sectionId)!;
          }
        }
      }
    }
    
    return merged;
  }

  private async smartMerge(
    oldDocument: TestDocument,
    newDocument: TestDocument,
    diff: DiffResult,
    strategy: UpdateStrategy
  ): TestDocument {
    // Implement smart merging logic
    // This could include:
    // - Preserving user edits in unchanged sections
    // - Merging metadata intelligently
    // - Handling conflicts based on priorities
    
    const merged = { ...newDocument };
    
    // Preserve user edits if enabled
    if (this.options.preserveUserEdits) {
      const oldSections = new Map(oldDocument.sections.map(s => [s.id, s]));
      
      for (const sectionId of diff.unchanged) {
        const index = merged.sections.findIndex(s => s.id === sectionId);
        if (index >= 0 && oldSections.has(sectionId)) {
          // Check for user edit markers (could be implemented)
          const oldSection = oldSections.get(sectionId)!;
          if (this.hasUserEdits(oldSection)) {
            merged.sections[index] = oldSection;
          }
        }
      }
    }
    
    return merged;
  }

  private async hasUserEdits(section: DocumentSection): boolean {
    // Check for user edit markers
    // This could be implemented with special comments or metadata
    return section.content.includes('<!-- USER_EDIT -->') ||
           section.content.includes('<!-- PRESERVE -->');
  }

  private async getSectionIds(document: TestDocument): string[] {
    const ids: string[] = [];
    
    const collectIds = (sections: DocumentSection[]) => {
      for (const section of sections) {
        ids.push(section.id);
        if (section.subsections) {
          collectIds(section.subsections);
        }
      }
    };
    
    collectIds(document.sections);
    return ids;
  }

  private async getCacheFilePath(filePath: string): string {
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    return path.join(this.cacheDir, `${hash}.cache.json`);
  }
}

export default PartialGenerator;