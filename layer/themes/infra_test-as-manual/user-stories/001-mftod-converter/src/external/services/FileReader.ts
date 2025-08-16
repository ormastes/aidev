/**
 * File Reader Service - Reads feature files from file system
 */

import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../../../infra_external-log-lib/src';

export interface FeatureFile {
  path: string;
  content: string;
  name: string;
}

export class FileReader {
  /**
   * Read feature files from a directory or single file
   */
  async readFeatureFiles(inputPath: string): Promise<FeatureFile[]> {
    const stats = await fs.stat(inputPath);
    
    if (stats.isFile()) {
      return [await this.readSingleFile(inputPath)];
    } else if (stats.isDirectory()) {
      return this.readDirectory(inputPath);
    } else {
      throw new Error(`Invalid input path: ${inputPath}`);
    }
  }

  /**
   * Read a single feature file
   */
  private async readSingleFile(filePath: string): Promise<FeatureFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    const name = path.basename(filePath, path.extname(filePath));
    
    return {
      path: filePath,
      content,
      name
    };
  }

  /**
   * Read all feature files from a directory
   */
  private async readDirectory(dirPath: string): Promise<FeatureFile[]> {
    const files = await this.findFeatureFiles(dirPath);
    const featureFiles: FeatureFile[] = [];
    
    for (const filePath of files) {
      try {
        const file = await this.readSingleFile(filePath);
        featureFiles.push(file);
      } catch (error) {
        console.warn(`Failed to read ${filePath}:`, error);
      }
    }
    
    return featureFiles;
  }

  /**
   * Find all feature files in a directory recursively
   */
  private async findFeatureFiles(dirPath: string): Promise<string[]> {
    const featureFiles: string[] = [];
    
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await walk(fullPath);
        } else if (entry.isFile() && this.isFeatureFile(entry.name)) {
          featureFiles.push(fullPath);
        }
      }
    };
    
    await walk(dirPath);
    return featureFiles;
  }

  /**
   * Check if a file is a feature file
   */
  private isFeatureFile(filename: string): boolean {
    const extensions = ['.feature', '.spec.ts', '.spec.js', '.test.ts', '.test.js'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Read test files (Jest/Mocha format)
   */
  async readTestFiles(inputPath: string): Promise<FeatureFile[]> {
    const stats = await fs.stat(inputPath);
    
    if (stats.isFile()) {
      return [await this.readSingleFile(inputPath)];
    }
    
    const testFiles: FeatureFile[] = [];
    const files = await this.findTestFiles(inputPath);
    
    for (const filePath of files) {
      try {
        const file = await this.readSingleFile(filePath);
        testFiles.push(file);
      } catch (error) {
        console.warn(`Failed to read ${filePath}:`, error);
      }
    }
    
    return testFiles;
  }

  /**
   * Find test files in directory
   */
  private async findTestFiles(dirPath: string): Promise<string[]> {
    const testFiles: string[] = [];
    
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && 
            entry.name !== 'node_modules' && entry.name !== 'dist') {
          await walk(fullPath);
        } else if (entry.isFile() && this.isTestFile(entry.name)) {
          testFiles.push(fullPath);
        }
      }
    };
    
    await walk(dirPath);
    return testFiles;
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filename: string): boolean {
    return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename);
  }
}