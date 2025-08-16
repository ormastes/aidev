import { fileAPI } from '../utils/file-api';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { crypto } from '../../../infra_external-log-lib/src';

interface DuplicationCheckResult {
  percentage: number;
  duplicatedLines: number;
  totalLines: number;
  duplicates: DuplicateBlock[];
}

interface DuplicateBlock {
  hash: string;
  lines: number;
  occurrences: DuplicateOccurrence[];
}

interface DuplicateOccurrence {
  file: string;
  startLine: number;
  endLine: number;
}

export class DuplicationChecker {
  async analyze(targetPath: string, mode: string, config: any = {}): Promise<DuplicationCheckResult> {
    const minTokens = config.minTokens || 50;
    const minLines = config.minLines || 5;
    
    const sourceFiles = await this.findSourceFiles(targetPath, mode);
    const blocks = await this.extractCodeBlocks(sourceFiles, minLines);
    const duplicates = this.findDuplicates(blocks, minTokens);
    
    const totalLines = blocks.reduce((sum, block) => sum + block.lines, 0);
    const duplicatedLines = duplicates.reduce((sum, dup) => sum + (dup.lines * dup.occurrences.length), 0);
    const percentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;

    return {
      percentage: Math.round(percentage * 100) / 100,
      duplicatedLines,
      totalLines,
      duplicates
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
    // Support both TypeScript/JavaScript and C++ files
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.cpp', '.cc', '.cxx', '.c++', '.hpp', '.h', '.hxx'];
    
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
        
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === "coverage") {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.searchDirectoryForSources(fullPath, extensions, files);
        } else if (extensions.some(ext => entry.name.endsWith(ext)) && !entry.name.includes('.min.')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private async extractCodeBlocks(files: string[], minLines: number): Promise<any[]> {
    const blocks: any[] = [];

    for (const file of files) {
      try {
        const content = await fileAPI.readFile(file, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i <= lines.length - minLines; i++) {
          const blockLines = lines.slice(i, i + minLines);
          const blockContent = blockLines.join('\n').trim();
          
          if (blockContent.length > 0) {
            const hash = crypto.createHash('md5').update(blockContent).digest('hex');
            blocks.push({
              hash,
              content: blockContent,
              file,
              startLine: i + 1,
              endLine: i + minLines,
              lines: minLines
            });
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read file ${file}:`, error);
      }
    }

    return blocks;
  }

  private findDuplicates(blocks: any[], minTokens: number): DuplicateBlock[] {
    const hashGroups = new Map<string, any[]>();
    
    // Group blocks by hash
    for (const block of blocks) {
      if (!hashGroups.has(block.hash)) {
        hashGroups.set(block.hash, []);
      }
      hashGroups.get(block.hash)!.push(block);
    }

    const duplicates: DuplicateBlock[] = [];

    // Find duplicates
    for (const [hash, groupBlocks] of hashGroups) {
      if (groupBlocks.length > 1) {
        const tokenCount = groupBlocks[0].content.split(/\s+/).length;
        if (tokenCount >= minTokens) {
          duplicates.push({
            hash,
            lines: groupBlocks[0].lines,
            occurrences: groupBlocks.map((block: any) => ({
              file: block.file,
              startLine: block.startLine,
              endLine: block.endLine
            }))
          });
        }
      }
    }

    return duplicates;
  }

  private getSourcePatterns(targetPath: string, mode: string): string[] {
    switch (mode) {
      case 'app':
        return [
          path.join(targetPath, 'src/**/*.ts'),
          path.join(targetPath, 'src/**/*.js'),
          path.join(targetPath, 'lib/**/*.ts')
        ];
      case 'epic':
        return [
          path.join(targetPath, 'apps/*/src/**/*.ts'),
          path.join(targetPath, 'layers/*/src/**/*.ts')
        ];
      case 'theme':
        return [
          path.join(targetPath, 'src/**/*.ts'),
          path.join(targetPath, '**/*.ts')
        ];
      case 'story':
        return [
          path.join(targetPath, 'src/**/*.ts'),
          path.join(targetPath, 'user-stories/**/*.ts')
        ];
      default:
        return [
          path.join(targetPath, '**/*.ts'),
          path.join(targetPath, '**/*.js')
        ];
    }
  }
}