import { DuplicationMetrics, DuplicatedBlock } from './index';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';
import { createHash } from 'crypto';

export class DuplicationDetector {
  private minTokens = 50;
  private minLines = 5;

  async detect(): Promise<DuplicationMetrics> {
    const files = await this.collectSourceFiles();
    const codeBlocks = await this.extractCodeBlocks(files);
    const duplicates = this.findDuplicates(codeBlocks);
    
    return this.calculateMetrics(duplicates, codeBlocks);
  }

  private async collectSourceFiles(): Promise<string[]> {
    const sourceFiles: string[] = [];
    const srcDir = path.join(process.cwd(), 'src');
    
    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
          sourceFiles.push(fullPath);
        }
      }
    }
    
    await walk(srcDir);
    return sourceFiles;
  }

  private async extractCodeBlocks(files: string[]): Promise<CodeBlock[]> {
    const blocks: CodeBlock[] = [];
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i <= lines.length - this.minLines; i++) {
        const block = lines.slice(i, i + this.minLines).join('\n');
        const tokens = this.tokenize(block);
        
        if (tokens.length >= this.minTokens) {
          blocks.push({
            file,
            startLine: i + 1,
            endLine: i + this.minLines,
            content: block,
            tokens,
            hash: this.hashBlock(block)
          });
        }
      }
    }
    
    return blocks;
  }

  private tokenize(code: string): string[] {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .replace(/["'].*?["']/g, 'STRING')
      .replace(/\d+/g, 'NUMBER')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private hashBlock(block: string): string {
    return createHash('md5').update(block).digest('hex');
  }

  private findDuplicates(blocks: CodeBlock[]): Map<string, CodeBlock[]> {
    const duplicates = new Map<string, CodeBlock[]>();
    
    blocks.forEach(block => {
      if (!duplicates.has(block.hash)) {
        duplicates.set(block.hash, []);
      }
      duplicates.get(block.hash)!.push(block);
    });
    
    const actualDuplicates = new Map<string, CodeBlock[]>();
    duplicates.forEach((blocks, hash) => {
      if (blocks.length > 1) {
        actualDuplicates.set(hash, blocks);
      }
    });
    
    return actualDuplicates;
  }

  private calculateMetrics(
    duplicates: Map<string, CodeBlock[]>,
    allBlocks: CodeBlock[]
  ): DuplicationMetrics {
    let duplicatedLines = 0;
    const duplicatedBlocks: DuplicatedBlock[] = [];
    const processedLines = new Set<string>();
    
    duplicates.forEach((blocks) => {
      const files = [...new Set(blocks.map(b => b.file))];
      const lineCount = blocks[0].endLine - blocks[0].startLine + 1;
      
      blocks.forEach(block => {
        for (let line = block.startLine; line <= block.endLine; line++) {
          const lineKey = `${block.file}:${line}`;
          if (!processedLines.has(lineKey)) {
            processedLines.add(lineKey);
            duplicatedLines++;
          }
        }
      });
      
      duplicatedBlocks.push({
        files,
        lines: lineCount,
        tokens: blocks[0].tokens.length
      });
    });
    
    const totalLines = await this.countTotalLines();
    
    return {
      percentage: totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0,
      duplicatedLines,
      totalLines,
      duplicatedBlocks
    };
  }

  private async countTotalLines(): Promise<number> {
    const files = await this.collectSourceFiles();
    let totalLines = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      totalLines += content.split('\n').length;
    }
    
    return totalLines;
  }
}

interface CodeBlock {
  file: string;
  startLine: number;
  endLine: number;
  content: string;
  tokens: string[];
  hash: string;
}