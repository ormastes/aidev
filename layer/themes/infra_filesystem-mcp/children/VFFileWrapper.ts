/**
 * VFFileWrapper - Base class for virtual file operations with query parameter support
 * 
 * This class provides the foundation for handling file operations with support for
 * query parameters in file paths (e.g., /path/to/file?name=example&type=json)
 */

import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { URL } from 'url';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

export interface ParsedPath {
  path: string;
  params: QueryParams;
}

export class VFFileWrapper {
  protected basePath: string;

  constructor(basePath: string = '') {
    this.basePath = basePath;
  }

  /**
   * Parse query parameters from a file path
   * @param filePath Path that may contain query parameters
   * @returns Object containing the clean path and parsed parameters
   */
  protected async parseQueryParams(filePath: string): ParsedPath {
    try {
      // Handle the path as a URL-like string
      const questionIndex = filePath.indexOf('?');
      if (questionIndex === -1) {
        return { path: filePath, params: {} };
      }

      const cleanPath = filePath.substring(0, questionIndex);
      const queryString = filePath.substring(questionIndex + 1);
      
      // Parse query parameters
      const params: QueryParams = {};
      const urlParams = new URLSearchParams(queryString);
      
      for (const [key, value] of urlParams.entries()) {
        if (params[key]) {
          // Handle multiple values for the same key
          if (Array.isArray(params[key])) {
            (params[key] as string[]).push(value);
          } else {
            params[key] = [params[key] as string, value];
          }
        } else {
          params[key] = value;
        }
      }

      return { path: cleanPath, params };
    } catch (error) {
      // If parsing fails, return the original path
      return { path: filePath, params: {} };
    }
  }

  /**
   * Read file with query parameter support
   * @param filePath Path to file, may include query parameters
   * @returns Parsed content based on query parameters
   */
  async read(filePath: string): Promise<any> {
    const { path: cleanPath, params } = this.parseQueryParams(filePath);
    const fullPath = this.resolvePath(cleanPath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Apply query parameter filtering
      return this.applyQueryFilters(data, params);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, return null or empty based on params
        return params.createIfMissing ? {} : null;
      }
      throw error;
    }
  }

  /**
   * Write content to file
   * @param filePath Path to file
   * @param content Content to write
   */
  async write(filePath: string, content: any): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(filePath);
    const fullPath = this.resolvePath(cleanPath);
    
    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fileAPI.createDirectory(dir);
    
    // Write content as JSON
    const jsonContent = JSON.stringify(content, null, 2);
    await fileAPI.createFile(fullPath, jsonContent, { type: FileType.TEMPORARY });
  }

  /**
   * Check if file exists
   * @param filePath Path to file
   * @returns True if file exists
   */
  async exists(filePath: string): Promise<boolean> {
    const { path: cleanPath } = this.parseQueryParams(filePath);
    const fullPath = this.resolvePath(cleanPath);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file
   * @param filePath Path to file
   */
  async delete(filePath: string): Promise<void> {
    const { path: cleanPath } = this.parseQueryParams(filePath);
    const fullPath = this.resolvePath(cleanPath);
    
    await fs.unlink(fullPath);
  }

  /**
   * List files in directory
   * @param dirPath Path to directory
   * @returns Array of file names
   */
  async list(dirPath: string): Promise<string[]> {
    const { path: cleanPath } = this.parseQueryParams(dirPath);
    const fullPath = this.resolvePath(cleanPath);
    
    try {
      return await fs.readdir(fullPath);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Working on full path from relative path
   * @param relativePath Relative path
   * @returns Full Working on path
   */
  protected async resolvePath(relativePath: string): Promise<string> {
    if (this.basePath) {
      return path.resolve(this.basePath, relativePath);
    }
    return relativePath;
  }
}