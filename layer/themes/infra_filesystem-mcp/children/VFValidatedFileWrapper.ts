/**
 * VFValidatedFileWrapper - File operations with structure validation
 * 
 * This wrapper intercepts file write operations and validates them against
 * the FILE_STRUCTURE.vf.json before allowing the operation.
 */

import { VFFileWrapper } from './VFFileWrapper';
import { VFFileStructureWrapper } from './VFFileStructureWrapper';
import { path } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export class VFValidatedFileWrapper extends VFFileWrapper {
  private structureWrapper: VFFileStructureWrapper;
  private validationEnabled: boolean = true;

  constructor(basePath: string = '', structureFile: string = 'FILE_STRUCTURE.vf.json') {
    super(basePath);
    this.structureWrapper = new VFFileStructureWrapper(basePath);
  }

  /**
   * Enable or disable validation
   */
  async setValidationEnabled(enabled: boolean): void {
    this.validationEnabled = enabled;
  }

  /**
   * Override write to add validation
   */
  async write(filePath: string, content: any): Promise<void> {
    if (!this.validationEnabled) {
      return super.write(filePath, content);
    }

    // Check if file structure exists
    try {
      await this.structureWrapper.loadStructure();
    } catch (error) {
      // If no structure file exists, allow write
      console.warn('FILE_STRUCTURE.vf.json not found, skipping validation');
      return super.write(filePath, content);
    }

    // Validate the path
    const validation = await this.structureWrapper.validateWrite(filePath, false);
    
    if (!validation.valid) {
      throw new Error(validation.message || 'File write validation failed');
    }

    // Ensure parent directories exist
    const dir = path.dirname(filePath);
    await fileAPI.createDirectory(path.join(this.basePath), { recursive: true });

    // Perform the write
    return super.write(filePath, content);
  }

  /**
   * Create a directory with validation
   */
  async mkdir(dirPath: string): Promise<void> {
    if (!this.validationEnabled) {
      await fileAPI.createDirectory(path.join(this.basePath), { recursive: true });
      return;
    }

    // Validate the path
    const validation = await this.structureWrapper.validateWrite(dirPath, true);
    
    if (!validation.valid) {
      throw new Error(validation.message || 'Directory creation validation failed');
    }

    // Create the directory
    await fileAPI.createDirectory(path.join(this.basePath), { recursive: true });
  }

  /**
   * Create required structure for a path
   */
  async createStructure(targetPath: string): Promise<string[]> {
    return this.structureWrapper.createRequiredStructure(targetPath);
  }

  /**
   * Get allowed children for a directory
   */
  async getAllowedChildren(dirPath: string): Promise<any[]> {
    return this.structureWrapper.getAllowedChildren(dirPath);
  }

  /**
   * Generate tree view of the structure
   */
  async generateStructureTree(maxDepth: number = 3): Promise<string> {
    return this.structureWrapper.generateTree(maxDepth);
  }

  /**
   * Validate a path without writing
   */
  async validatePath(filePath: string, isDirectory: boolean = false): Promise<{ valid: boolean; message?: string }> {
    return this.structureWrapper.validatePath(filePath, isDirectory);
  }
}