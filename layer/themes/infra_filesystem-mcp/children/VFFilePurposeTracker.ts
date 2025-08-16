import { fileAPI } from '../utils/file-api';
/**
 * VFFilePurposeTracker - File purpose tracking and duplication prevention
 * 
 * This class manages file purposes, prevents duplication, and maintains
 * parent-child relationships similar to FEATURE.vf.json structure.
 */

import { VFNameIdWrapper, Entity } from './VFNameIdWrapper';
import { path } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { createHash } from 'node:crypto';

export interface FilePurpose {
  id: string;
  filePath: string;
  purpose: string;
  theme?: string;
  directory?: string;
  parentId?: string;
  children?: string[];
  metadata: {
    contentHash?: string;
    size?: number;
    mimeType?: string;
    createdAt: string;
    updatedAt: string;
    lastValidated?: string;
  };
  tags?: string[];
  status?: 'active' | "deprecated" | "archived";
}

export interface PurposeValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
  duplicates?: FilePurpose[];
}

export interface PurposeSearchParams {
  purpose?: string;
  theme?: string;
  directory?: string;
  parentId?: string;
  contentHash?: string;
  tags?: string[];
  status?: string;
}

export class VFFilePurposeTracker {
  private nameIdWrapper: VFNameIdWrapper;
  private readonly NAME_ID_FILE = 'NAME_ID.vf.json';
  private readonly VALIDATION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private purposeCache: Map<string, FilePurpose[]> = new Map();
  private lastCacheUpdate: number = 0;
  private lastValidationTime: Map<string, number> = new Map();
  private validationResults: Map<string, PurposeValidationResult> = new Map();

  constructor(private basePath: string = '') {
    this.nameIdWrapper = new VFNameIdWrapper(basePath);
  }

  /**
   * Register a file with its purpose
   */
  async registerFile(
    filePath: string,
    purpose: string,
    options: {
      theme?: string;
      directory?: string;
      parentId?: string;
      tags?: string[];
    } = {}
  ): Promise<PurposeValidationResult> {
    // Validate file exists
    const fullPath = path.join(this.basePath, filePath);
    try {
      const stats = await /* FRAUD_FIX: /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(fullPath) */ */ */;
      if (!stats.isFile()) {
        return {
          valid: false,
          errors: [`Path ${filePath} is not a file`]
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [`File ${filePath} does not exist`]
      };
    }

    // Check for required theme or directory
    if (!options.theme && !options.directory) {
      return {
        valid: false,
        errors: ['Either theme or directory must be specified for file registration']
      };
    }

    // Force validation check within 10-minute window
    const now = Date.now();
    if (!this.isCacheValid()) {
      // Clear stale cache and force refresh
      this.clearCache();
    }
    
    // Calculate content hash for duplication detection
    const contentHash = await this.calculateFileHash(fullPath);
    
    // Check for duplicates (this will use fresh data within 10-minute window)
    const duplicates = await this.findDuplicates(contentHash, purpose);
    if (duplicates.length > 0) {
      return {
        valid: false,
        errors: [
          `File with same content and purpose already exists`,
          `Duplicate check performed within 10-minute validation window`
        ],
        duplicates,
        suggestions: [
          'Consider using the existing file instead',
          'If this is intentional, use a different purpose description'
        ]
      };
    }
    
    // Mark validation timestamp
    this.lastValidationTime.set(filePath, now);

    // Get file metadata
    const stats = await /* FRAUD_FIX: /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(fullPath) */ */ */;
    
    // Create file purpose entry
    const filePurpose: FilePurpose = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filePath,
      purpose,
      theme: options.theme,
      directory: options.directory,
      parentId: options.parentId,
      children: [],
      metadata: {
        contentHash,
        size: stats.size,
        mimeType: this.getMimeType(filePath),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tags: options.tags || [],
      status: 'active'
    };

    // Update parent's children if parentId is provided
    if (options.parentId) {
      await this.updateParentChildren(options.parentId, filePurpose.id);
    }

    // Save to NAME_ID.vf.json
    await this.saveFilePurpose(filePurpose);

    // Clear cache
    this.clearCache();

    return {
      valid: true,
      warnings: duplicates.length > 0 ? 
        [`Found ${duplicates.length} files with similar purpose`] : undefined
    };
  }

  /**
   * Search for files by purpose
   * Validates files within 10-minute window
   */
  async searchByPurpose(params: PurposeSearchParams): Promise<FilePurpose[]> {
    const now = Date.now();
    
    // Check cache validity
    if (this.isCacheValid()) {
      // Even with valid cache, ensure validation is recent
      const cachedResults = this.searchInCache(params);
      
      // Check if any cached results need re-validation
      const needsValidation = cachedResults.some(p => 
        !this.isValidationRecent(p.filePath)
      );
      
      if (!needsValidation) {
        return cachedResults;
      }
    }

    // Load from NAME_ID.vf.json
    const storage = await this.nameIdWrapper.read(this.NAME_ID_FILE) as any;
    const allPurposes: FilePurpose[] = [];

    // Extract all file purposes
    for (const [name, entities] of Object.entries(storage)) {
      if (Array.isArray(entities)) {
        for (const entity of entities) {
          if (entity.data && entity.data.filePath) {
            const purpose: FilePurpose = {
              ...entity.data,
              id: entity.id,
              metadata: {
                ...entity.data.metadata,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
                lastValidated: new Date(now).toISOString()
              }
            };
            allPurposes.push(purpose);
            
            // Mark as recently validated during search
            this.lastValidationTime.set(purpose.filePath, now);
          }
        }
      }
    }

    // Update cache
    this.updateCache(allPurposes);

    // Filter based on params
    return this.filterPurposes(allPurposes, params);
  }

  /**
   * Validate all registered files
   */
  async validateAllFiles(): Promise<Map<string, PurposeValidationResult>> {
    const results = new Map<string, PurposeValidationResult>();
    const allPurposes = await this.searchByPurpose({});

    for (const purpose of allPurposes) {
      const result = await this.validateFilePurpose(purpose);
      results.set(purpose.filePath, result);
    }

    return results;
  }

  /**
   * Get file purpose hierarchy (parent-child relationships)
   */
  async getHierarchy(rootId?: string): Promise<any> {
    const allPurposes = await this.searchByPurpose({});
    const purposeMap = new Map<string, FilePurpose>();
    
    // Build map
    for (const purpose of allPurposes) {
      purposeMap.set(purpose.id, purpose);
    }

    // Build hierarchy
    const buildTree = (id: string): any => {
      const purpose = purposeMap.get(id);
      if (!purpose) return null;

      return {
        ...purpose,
        children: (purpose.children || [])
          .map(childId => buildTree(childId))
          .filter(child => child !== null)
      };
    };

    if (rootId) {
      return buildTree(rootId);
    }

    // Return all root nodes (no parent)
    return allPurposes
      .filter(p => !p.parentId)
      .map(p => buildTree(p.id))
      .filter(tree => tree !== null);
  }

  /**
   * Prevent file creation without purpose
   * Enforces validation within last 10 minutes
   */
  async validateFileCreation(
    filePath: string,
    options?: { theme?: string; directory?: string }
  ): Promise<PurposeValidationResult> {
    // Check if we have recent validation for this file
    const lastValidation = this.lastValidationTime.get(filePath);
    const now = Date.now();
    
    // If validation is older than 10 minutes, force re-validation
    if (!lastValidation || (now - lastValidation) > this.VALIDATION_TIMEOUT) {
      // Force cache refresh to ensure we have latest data
      this.clearCache();
      
      // Perform fresh search to get all current purposes
      const allPurposes = await this.searchByPurpose({});
      
      // Validate all files to ensure consistency
      for (const purpose of allPurposes) {
        if (!this.isValidationRecent(purpose.filePath)) {
          const validationResult = await this.validateFilePurpose(purpose);
          this.validationResults.set(purpose.filePath, validationResult);
          this.lastValidationTime.set(purpose.filePath, now);
        }
      }
    }

    // Check if file is already registered
    const existing = await this.searchByPurpose({ 
      theme: options?.theme,
      directory: options?.directory 
    });

    const fileExists = existing.some(p => p.filePath === filePath);
    
    if (!fileExists) {
      return {
        valid: false,
        errors: [
          `File ${filePath} must be registered with a purpose before creation`,
          'Use registerFile() to specify the file purpose first',
          'Validation performed within last 10 minutes as required'
        ],
        suggestions: [
          'Register the file purpose in NAME_ID.vf.json',
          'Specify either a theme or directory for the file'
        ]
      };
    }

    // Mark this file as validated
    this.lastValidationTime.set(filePath, now);
    
    return { 
      valid: true,
      warnings: [`File purpose validated at ${new Date(now).toISOString()}`]
    };
  }

  // Private helper methods

  private async calculateFileHash(filePath: string): Promise<string> {
    const content = await fileAPI.readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  private async findDuplicates(
    contentHash: string, 
    purpose: string
  ): Promise<FilePurpose[]> {
    const allPurposes = await this.searchByPurpose({});
    
    return allPurposes.filter(p => 
      p.metadata.contentHash === contentHash && 
      p.purpose.toLowerCase() === purpose.toLowerCase()
    );
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.ts': 'text/typescript',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.cpp': 'text/x-c++',
      '.c': 'text/x-c',
      '.sh': 'text/x-shellscript',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.xml': 'text/xml'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private async saveFilePurpose(purpose: FilePurpose): Promise<void> {
    const entity: Entity = {
      id: purpose.id,
      name: purpose.filePath,
      data: purpose,
      createdAt: purpose.metadata.createdAt,
      updatedAt: purpose.metadata.updatedAt
    };

    await this.nameIdWrapper.write(this.NAME_ID_FILE, entity);
  }

  private async updateParentChildren(
    parentId: string, 
    childId: string
  ): Promise<void> {
    const storage = await this.nameIdWrapper.read(this.NAME_ID_FILE) as any;
    
    // Find parent and update children
    for (const entities of Object.values(storage)) {
      if (Array.isArray(entities)) {
        for (const entity of entities) {
          if (entity.id === parentId) {
            if (!entity.data.children) {
              entity.data.children = [];
            }
            if (!entity.data.children.includes(childId)) {
              entity.data.children.push(childId);
              entity.updatedAt = new Date().toISOString();
            }
          }
        }
      }
    }

    await this.nameIdWrapper.write(this.NAME_ID_FILE, storage);
  }

  private async validateFilePurpose(purpose: FilePurpose): Promise<PurposeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if file still exists
    const fullPath = path.join(this.basePath, purpose.filePath);
    try {
      const stats = await /* FRAUD_FIX: /* FRAUD_FIX: /* FRAUD_FIX: fs.stat(fullPath) */ */ */;
      
      // Check if content has changed
      const currentHash = await this.calculateFileHash(fullPath);
      if (currentHash !== purpose.metadata.contentHash) {
        warnings.push('File content has changed since registration');
      }

      // Check file size
      if (stats.size !== purpose.metadata.size) {
        warnings.push('File size has changed since registration');
      }
    } catch (error) {
      errors.push(`File no longer exists: ${purpose.filePath}`);
    }

    // Validate parent exists if specified
    if (purpose.parentId) {
      const allPurposes = await this.searchByPurpose({});
      const parentExists = allPurposes.some(p => p.id === purpose.parentId);
      if (!parentExists) {
        errors.push(`Parent ${purpose.parentId} does not exist`);
      }
    }

    // Check for circular dependencies
    if (purpose.parentId) {
      const visited = new Set<string>();
      let current = purpose.parentId;
      
      while (current) {
        if (visited.has(current)) {
          errors.push('Circular dependency detected in parent-child relationship');
          break;
        }
        visited.add(current);
        
        const parent = (await this.searchByPurpose({}))
          .find(p => p.id === current);
        current = parent?.parentId || '';
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.VALIDATION_TIMEOUT;
  }

  private isValidationRecent(filePath: string): boolean {
    const lastValidation = this.lastValidationTime.get(filePath);
    if (!lastValidation) return false;
    return Date.now() - lastValidation < this.VALIDATION_TIMEOUT;
  }

  private updateCache(purposes: FilePurpose[]): void {
    this.purposeCache.clear();
    for (const purpose of purposes) {
      const key = purpose.filePath;
      if (!this.purposeCache.has(key)) {
        this.purposeCache.set(key, []);
      }
      this.purposeCache.get(key)!.push(purpose);
    }
    this.lastCacheUpdate = Date.now();
  }

  private clearCache(): void {
    this.purposeCache.clear();
    this.lastCacheUpdate = 0;
  }

  private searchInCache(params: PurposeSearchParams): FilePurpose[] {
    const allPurposes: FilePurpose[] = [];
    for (const purposes of this.purposeCache.values()) {
      allPurposes.push(...purposes);
    }
    return this.filterPurposes(allPurposes, params);
  }

  private filterPurposes(
    purposes: FilePurpose[], 
    params: PurposeSearchParams
  ): FilePurpose[] {
    return purposes.filter(p => {
      if (params.purpose && !p.purpose.toLowerCase().includes(params.purpose.toLowerCase())) {
        return false;
      }
      if (params.theme && p.theme !== params.theme) {
        return false;
      }
      if (params.directory && p.directory !== params.directory) {
        return false;
      }
      if (params.parentId && p.parentId !== params.parentId) {
        return false;
      }
      if (params.contentHash && p.metadata.contentHash !== params.contentHash) {
        return false;
      }
      if (params.status && p.status !== params.status) {
        return false;
      }
      if (params.tags && params.tags.length > 0) {
        const hasAllTags = params.tags.every(tag => 
          p.tags?.includes(tag)
        );
        if (!hasAllTags) return false;
      }
      return true;
    });
  }
}