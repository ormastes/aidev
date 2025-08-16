import { fileAPI } from '../utils/file-api';
import * as fs from 'fs/promises';
import { readFileSync } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';

interface SystemTestClassCoverageResult {
  percentage: number;
  coveredClasses: number;
  totalClasses: number;
  details: ClassCoverageDetail[];
}

interface ClassCoverageDetail {
  className: string;
  filePath: string;
  covered: boolean;
  testFiles: string[];
}

export class SystemTestClassCoverageAnalyzer {
  async analyze(targetPath: string, mode: string): Promise<SystemTestClassCoverageResult> {
    const sourceFiles = await this.findSourceFiles(targetPath, mode);
    const classFiles = sourceFiles.filter(file => this.containsClassSync(file));
    const systemTests = await this.findSystemTests(targetPath, mode);
    
    const details: ClassCoverageDetail[] = [];
    let coveredClasses = 0;

    for (const classFile of classFiles) {
      const className = this.extractClassName(classFile);
      const testFiles = this.findTestsForClass(classFile, systemTests);
      const covered = testFiles.length > 0;
      
      if (covered) {
        coveredClasses++;
      }

      details.push({
        className,
        filePath: classFile,
        covered,
        testFiles
      });
    }

    const percentage = classFiles.length > 0 ? (coveredClasses / classFiles.length) * 100 : 0;

    return {
      percentage: Math.round(percentage * 100) / 100,
      coveredClasses,
      totalClasses: classFiles.length,
      details
    };
  }

  private async findSourceFiles(targetPath: string, mode: string): Promise<string[]> {
    const patterns = this.getSourcePatterns(targetPath, mode);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await this.findFilesByPattern(pattern);
      files.push(...matches);
    }

    return files;
  }

  private async findFilesByPattern(pattern: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    
    try {
      await this.searchDirectoryForSources(path.dirname(pattern), extensions, files);
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  private async searchDirectoryForSources(dir: string, extensions: string[], files: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name.includes('.test.') || entry.name.includes('.spec.') || entry.name === 'tests') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.searchDirectoryForSources(fullPath, extensions, files);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private containsClassSync(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf8');
      return /\bclass\s+\w+/.test(content) || /\bexport\s+class\s+\w+/.test(content);
    } catch {
      return false;
    }
  }

  private async findSystemTests(targetPath: string, mode: string): Promise<string[]> {
    const patterns = this.getSystemTestPatterns(targetPath, mode);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await this.findFilesByPattern(pattern);
      files.push(...matches);
    }

    return files;
  }

  private findTestsForClass(classFile: string, systemTests: string[]): string[] {
    const className = path.basename(classFile, path.extname(classFile));
    const testFiles: string[] = [];

    for (const testFile of systemTests) {
      const testContent = readFileSync(testFile, 'utf8');
      
      // Check if test file imports or references the class
      if (testContent.includes(className) || 
          testContent.includes(classFile.replace(/\\/g, '/')) ||
          this.isRelatedTest(classFile, testFile)) {
        testFiles.push(testFile);
      }
    }

    return testFiles;
  }

  private isRelatedTest(classFile: string, testFile: string): boolean {
    const classDir = path.dirname(classFile);
    const testDir = path.dirname(testFile);
    const className = path.basename(classFile, path.extname(classFile));
    const testName = path.basename(testFile, path.extname(testFile));

    // Check if test is in related directory or has similar name
    return testDir.includes(classDir) || 
           testName.toLowerCase().includes(className.toLowerCase()) ||
           className.toLowerCase().includes(testName.replace(/\.test|\.spec/, '').toLowerCase());
  }

  private extractClassName(filePath: string): string {
    try {
      const sourceFileContent = readFileSync(filePath, 'utf8');
      const classMatch = sourceFileContent.match(/(?:export\s+)?class\s+(\w+)/);
      return classMatch ? classMatch[1] : path.basename(filePath, path.extname(filePath));
    } catch {
      return path.basename(filePath, path.extname(filePath));
    }
  }

  private getSourcePatterns(targetPath: string, mode: string): string[] {
    switch (mode) {
      case 'app':
        return [path.join(targetPath, 'src')];
      case 'epic':
        return [
          path.join(targetPath, 'apps'),
          path.join(targetPath, 'layers')
        ];
      case 'theme':
        return [path.join(targetPath, 'src')];
      case 'story':
        return [
          path.join(targetPath, 'src'),
          path.join(targetPath, 'user-stories')
        ];
      default:
        return [targetPath];
    }
  }

  private getSystemTestPatterns(targetPath: string, mode: string): string[] {
    switch (mode) {
      case 'app':
        return [path.join(targetPath, 'tests/system')];
      case 'epic':
        return [
          path.join(targetPath, 'tests/system'),
          path.join(targetPath, 'apps/*/tests/system'),
          path.join(targetPath, 'layers/*/tests/system')
        ];
      case 'theme':
        return [path.join(targetPath, 'tests/system')];
      case 'story':
        return [
          path.join(targetPath, 'tests/system'),
          path.join(targetPath, 'user-stories/*/tests/system')
        ];
      default:
        return [path.join(targetPath, 'tests')];
    }
  }
}