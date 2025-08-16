#!/usr/bin/env ts-node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

interface DuplicationResult {
  category: string;
  percentage: number;
  duplicatedLines: number;
  totalLines: number;
  duplicates: DuplicateBlock[];
}

interface DuplicateBlock {
  hash: string;
  lines: number;
  content?: string;
  occurrences: DuplicateOccurrence[];
}

interface DuplicateOccurrence {
  file: string;
  startLine: number;
  endLine: number;
}

interface ProjectDuplicationReport {
  timestamp: string;
  summary: {
    totalDuplication: number;
    totalFiles: number;
    totalDuplicateBlocks: number;
    categories: {
      [key: string]: DuplicationResult;
    };
  };
  criticalDuplicates: DuplicateBlock[];
  recommendations: string[];
}

class ProjectWideDuplicationChecker {
  private minLines = 5;
  private minTokens = 30;
  private maxDuplicationThreshold = 5; // 5% max duplication allowed

  async analyzeProject(projectRoot: string): Promise<ProjectDuplicationReport> {
    console.log('🔍 Starting project-wide duplication analysis...\n');
    
    const timestamp = new Date().toISOString();
    const categories: { [key: string]: DuplicationResult } = {};
    
    // Analyze different categories
    categories['source'] = await this.analyzeCategory(projectRoot, 'source');
    categories['tests'] = await this.analyzeCategory(projectRoot, 'tests');
    categories['documentation'] = await this.analyzeCategory(projectRoot, 'documentation');
    categories['scripts'] = await this.analyzeCategory(projectRoot, 'scripts');
    categories['config'] = await this.analyzeCategory(projectRoot, 'config');
    
    // Find critical duplicates (across categories)
    const criticalDuplicates = await this.findCriticalDuplicates(categories);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(categories, criticalDuplicates);
    
    // Calculate totals
    const totalDuplication = this.calculateTotalDuplication(categories);
    const totalFiles = this.countTotalFiles(categories);
    const totalDuplicateBlocks = this.countTotalDuplicateBlocks(categories);
    
    const report: ProjectDuplicationReport = {
      timestamp,
      summary: {
        totalDuplication,
        totalFiles,
        totalDuplicateBlocks,
        categories
      },
      criticalDuplicates,
      recommendations
    };
    
    return report;
  }

  private async analyzeCategory(projectRoot: string, category: string): Promise<DuplicationResult> {
    console.log(`  Analyzing ${category}...`);
    
    const files = await this.findFilesForCategory(projectRoot, category);
    const blocks = await this.extractCodeBlocks(files);
    const duplicates = this.findDuplicates(blocks);
    
    const totalLines = blocks.reduce((sum, block) => sum + block.lines, 0);
    const duplicatedLines = this.countDuplicatedLines(duplicates);
    const percentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;
    
    console.log(`    ✓ Found ${files.length} files, ${duplicates.length} duplicate blocks`);
    console.log(`    ✓ Duplication: ${percentage.toFixed(2)}%\n`);
    
    return {
      category,
      percentage: Math.round(percentage * 100) / 100,
      duplicatedLines,
      totalLines,
      duplicates
    };
  }

  private async findFilesForCategory(projectRoot: string, category: string): Promise<string[]> {
    const files: string[] = [];
    
    const patterns = this.getCategoryPatterns(category);
    const ignorePatterns = ['node_modules', 'dist', 'coverage', '.git', 'temp', 'tmp', '.next', 'build'];
    
    for (const pattern of patterns) {
      await this.searchFiles(projectRoot, pattern.extensions, pattern.dirs, ignorePatterns, files);
    }
    
    return files;
  }

  private getCategoryPatterns(category: string): Array<{ dirs: string[], extensions: string[] }> {
    switch (category) {
      case 'source':
        return [
          { dirs: ['src', 'lib', 'layer', 'common', 'pipe'], extensions: ['.ts', '.tsx', '.js', '.jsx'] },
          { dirs: ['xlib'], extensions: ['.py'] }
        ];
      case 'tests':
        return [
          { dirs: ['test', 'tests', '__tests__', 'spec'], extensions: ['.test.ts', '.test.js', '.spec.ts', '.spec.js'] }
        ];
      case 'documentation':
        return [
          { dirs: ['.', 'docs', 'gen/doc', 'llm_rules'], extensions: ['.md'] }
        ];
      case 'scripts':
        return [
          { dirs: ['scripts', 'setup'], extensions: ['.sh', '.bash', '.py', '.ts', '.js'] }
        ];
      case 'config':
        return [
          { dirs: ['config', '.'], extensions: ['.json', '.yaml', '.yml', '.toml'] }
        ];
      default:
        return [];
    }
  }

  private async searchFiles(
    dir: string,
    extensions: string[],
    targetDirs: string[],
    ignorePatterns: string[],
    files: string[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(dir, fullPath);
        
        // Skip ignored patterns
        if (ignorePatterns.some(pattern => entry.name.includes(pattern))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.searchFiles(fullPath, extensions, targetDirs, ignorePatterns, files);
        } else {
          // Check if file matches our criteria
          const isInTargetDir = targetDirs.some(targetDir => 
            fullPath.includes(path.sep + targetDir + path.sep) || 
            path.dirname(fullPath).endsWith(targetDir)
          );
          
          const hasValidExtension = extensions.some(ext => entry.name.endsWith(ext));
          
          if ((targetDirs.includes('.') || isInTargetDir) && hasValidExtension) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private async extractCodeBlocks(files: string[]): Promise<any[]> {
    const blocks: any[] = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        // Skip small files
        if (lines.length < this.minLines) continue;
        
        // Extract blocks
        for (let i = 0; i <= lines.length - this.minLines; i++) {
          const blockLines = lines.slice(i, i + this.minLines);
          const blockContent = this.normalizeBlock(blockLines);
          
          if (this.isValidBlock(blockContent)) {
            const hash = crypto.createHash('md5').update(blockContent).digest('hex');
            blocks.push({
              hash,
              content: blockContent,
              file,
              startLine: i + 1,
              endLine: i + this.minLines,
              lines: this.minLines
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    }
    
    return blocks;
  }

  private normalizeBlock(lines: string[]): string {
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))
      .join('\n');
  }

  private isValidBlock(content: string): boolean {
    if (!content || content.length < 50) return false;
    
    // Skip blocks that are mostly imports
    const importCount = (content.match(/^(import|from|require)/gm) || []).length;
    const lineCount = content.split('\n').length;
    if (importCount > lineCount * 0.5) return false;
    
    // Skip blocks that are mostly comments
    const commentLines = (content.match(/^(\*|\/\/|#)/gm) || []).length;
    if (commentLines > lineCount * 0.5) return false;
    
    // Check token count
    const tokens = content.split(/\s+/).filter(t => t.length > 0);
    return tokens.length >= this.minTokens;
  }

  private findDuplicates(blocks: any[]): DuplicateBlock[] {
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
        // Merge overlapping blocks from same file
        const mergedOccurrences = this.mergeOverlappingBlocks(groupBlocks);
        
        if (mergedOccurrences.length > 1) {
          duplicates.push({
            hash,
            lines: groupBlocks[0].lines,
            content: groupBlocks[0].content,
            occurrences: mergedOccurrences
          });
        }
      }
    }
    
    return duplicates;
  }

  private mergeOverlappingBlocks(blocks: any[]): DuplicateOccurrence[] {
    const byFile = new Map<string, any[]>();
    
    // Group by file
    for (const block of blocks) {
      if (!byFile.has(block.file)) {
        byFile.set(block.file, []);
      }
      byFile.get(block.file)!.push(block);
    }
    
    const occurrences: DuplicateOccurrence[] = [];
    
    // Merge overlapping blocks in same file
    for (const [file, fileBlocks] of byFile) {
      const sorted = fileBlocks.sort((a, b) => a.startLine - b.startLine);
      let current = sorted[0];
      
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startLine <= current.endLine) {
          // Merge overlapping blocks
          current.endLine = Math.max(current.endLine, sorted[i].endLine);
        } else {
          occurrences.push({
            file: current.file,
            startLine: current.startLine,
            endLine: current.endLine
          });
          current = sorted[i];
        }
      }
      
      occurrences.push({
        file: current.file,
        startLine: current.startLine,
        endLine: current.endLine
      });
    }
    
    return occurrences;
  }

  private countDuplicatedLines(duplicates: DuplicateBlock[]): number {
    let total = 0;
    for (const dup of duplicates) {
      // Count actual duplicated lines (not counting the original)
      if (dup.occurrences.length > 1) {
        const linesPerOccurrence = dup.occurrences[0].endLine - dup.occurrences[0].startLine + 1;
        total += linesPerOccurrence * (dup.occurrences.length - 1);
      }
    }
    return total;
  }

  private async findCriticalDuplicates(categories: { [key: string]: DuplicationResult }): Promise<DuplicateBlock[]> {
    const critical: DuplicateBlock[] = [];
    const crossCategoryHashes = new Map<string, { category: string, block: DuplicateBlock }[]>();
    
    // Find duplicates across categories
    for (const [category, result] of Object.entries(categories)) {
      for (const dup of result.duplicates) {
        if (!crossCategoryHashes.has(dup.hash)) {
          crossCategoryHashes.set(dup.hash, []);
        }
        crossCategoryHashes.get(dup.hash)!.push({ category, block: dup });
      }
    }
    
    // Identify critical cross-category duplicates
    for (const [hash, items] of crossCategoryHashes) {
      const uniqueCategories = new Set(items.map(item => item.category));
      
      if (uniqueCategories.size > 1) {
        // Duplicate exists across multiple categories
        const allOccurrences: DuplicateOccurrence[] = [];
        for (const item of items) {
          allOccurrences.push(...item.block.occurrences);
        }
        
        critical.push({
          hash,
          lines: items[0].block.lines,
          content: items[0].block.content,
          occurrences: allOccurrences
        });
      } else if (items[0].block.occurrences.length > 5) {
        // Many occurrences in single category
        critical.push(items[0].block);
      }
    }
    
    // Sort by number of occurrences
    return critical.sort((a, b) => b.occurrences.length - a.occurrences.length).slice(0, 10);
  }

  private generateRecommendations(
    categories: { [key: string]: DuplicationResult },
    criticalDuplicates: DuplicateBlock[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Check overall duplication
    const totalDup = this.calculateTotalDuplication(categories);
    if (totalDup > this.maxDuplicationThreshold) {
      recommendations.push(`⚠️ Overall duplication (${totalDup.toFixed(2)}%) exceeds threshold of ${this.maxDuplicationThreshold}%`);
    }
    
    // Category-specific recommendations
    for (const [category, result] of Object.entries(categories)) {
      if (result.percentage > 10) {
        recommendations.push(`📁 High duplication in ${category}: ${result.percentage.toFixed(2)}% - Consider refactoring`);
      }
    }
    
    // Critical duplicate recommendations
    if (criticalDuplicates.length > 0) {
      recommendations.push(`🔴 Found ${criticalDuplicates.length} critical duplicate blocks across multiple files`);
      
      for (const dup of criticalDuplicates.slice(0, 3)) {
        const files = [...new Set(dup.occurrences.map(o => path.basename(o.file)))];
        recommendations.push(`  - ${dup.lines} lines duplicated in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` and ${files.length - 3} more` : ''}`);
      }
    }
    
    // Specific refactoring suggestions
    if (categories.source?.percentage > 5) {
      recommendations.push('💡 Consider extracting common utilities to shared modules');
    }
    
    if (categories.tests?.percentage > 15) {
      recommendations.push('💡 Consider creating test helper functions or fixtures');
    }
    
    if (categories.scripts?.percentage > 10) {
      recommendations.push('💡 Consider creating reusable script functions');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Duplication levels are within acceptable limits');
    }
    
    return recommendations;
  }

  private calculateTotalDuplication(categories: { [key: string]: DuplicationResult }): number {
    let totalDuplicated = 0;
    let totalLines = 0;
    
    for (const result of Object.values(categories)) {
      totalDuplicated += result.duplicatedLines;
      totalLines += result.totalLines;
    }
    
    return totalLines > 0 ? (totalDuplicated / totalLines) * 100 : 0;
  }

  private countTotalFiles(categories: { [key: string]: DuplicationResult }): number {
    const allFiles = new Set<string>();
    
    for (const result of Object.values(categories)) {
      for (const dup of result.duplicates) {
        for (const occurrence of dup.occurrences) {
          allFiles.add(occurrence.file);
        }
      }
    }
    
    return allFiles.size;
  }

  private countTotalDuplicateBlocks(categories: { [key: string]: DuplicationResult }): number {
    let total = 0;
    for (const result of Object.values(categories)) {
      total += result.duplicates.length;
    }
    return total;
  }

  async saveReport(report: ProjectDuplicationReport, outputPath: string): Promise<void> {
    const reportDir = path.dirname(outputPath);
    await await fileAPI.createDirectory(reportDir);
    
    // Save JSON report
    const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
    await await fileAPI.createFile(jsonPath, JSON.stringify(report, { type: FileType.SCRIPT }));
    
    // Generate and save markdown report
    const markdown = this.generateMarkdownReport(report);
    const mdPath = outputPath.replace(/\.[^.]+$/, '.md');
    await await fileAPI.createFile(mdPath, markdown);
    
    console.log(`\n📊 Reports saved:`);
    console.log(`  - JSON: ${jsonPath}`);
    console.log(`  - Markdown: ${mdPath}`);
  }

  private generateMarkdownReport(report: ProjectDuplicationReport): string {
    let md = `# Project-Wide Duplication Report\n\n`;
    md += `**Generated:** ${report.timestamp}\n\n`;
    
    md += `## Summary\n\n`;
    md += `- **Total Duplication:** ${report.summary.totalDuplication.toFixed(2)}%\n`;
    md += `- **Total Files Analyzed:** ${report.summary.totalFiles}\n`;
    md += `- **Total Duplicate Blocks:** ${report.summary.totalDuplicateBlocks}\n\n`;
    
    md += `## Category Breakdown\n\n`;
    md += `| Category | Duplication % | Duplicated Lines | Total Lines | Duplicate Blocks |\n`;
    md += `|----------|---------------|------------------|-------------|------------------|\n`;
    
    for (const [category, { type: FileType.TEMPORARY })) {
      md += `| ${category} | ${result.percentage.toFixed(2)}% | ${result.duplicatedLines} | ${result.totalLines} | ${result.duplicates.length} |\n`;
    }
    
    md += `\n## Critical Duplicates\n\n`;
    if (report.criticalDuplicates.length > 0) {
      for (const [index, dup] of report.criticalDuplicates.entries()) {
        md += `### Duplicate Block ${index + 1}\n\n`;
        md += `- **Lines:** ${dup.lines}\n`;
        md += `- **Occurrences:** ${dup.occurrences.length}\n`;
        md += `- **Files:**\n`;
        
        for (const occurrence of dup.occurrences.slice(0, 5)) {
          const relativePath = occurrence.file.replace(process.cwd() + '/', '');
          md += `  - ${relativePath} (lines ${occurrence.startLine}-${occurrence.endLine})\n`;
        }
        
        if (dup.occurrences.length > 5) {
          md += `  - ... and ${dup.occurrences.length - 5} more occurrences\n`;
        }
        
        if (dup.content && index < 3) {
          md += `\n**Sample Code:**\n\`\`\`\n${dup.content.split('\n').slice(0, 10).join('\n')}\n...\n\`\`\`\n`;
        }
        
        md += `\n`;
      }
    } else {
      md += `No critical duplicates found.\n\n`;
    }
    
    md += `## Recommendations\n\n`;
    for (const recommendation of report.recommendations) {
      md += `- ${recommendation}\n`;
    }
    
    return md;
  }
}

// Main execution
async function main() {
  const projectRoot = process.cwd();
  const checker = new ProjectWideDuplicationChecker();
  
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   PROJECT-WIDE DUPLICATION CHECKER');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const report = await checker.analyzeProject(projectRoot);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputPath = path.join(projectRoot, 'gen', 'doc', `duplication-report-${timestamp}.json`);
    await checker.saveReport(report, outputPath);
    
    // Print summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('   ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 Overall Results:');
    console.log(`  Total Duplication: ${report.summary.totalDuplication.toFixed(2)}%`);
    console.log(`  Status: ${report.summary.totalDuplication <= 5 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    console.log('📋 Recommendations:');
    for (const rec of report.recommendations.slice(0, 5)) {
      console.log(`  ${rec}`);
    }
    
    process.exit(report.summary.totalDuplication <= 5 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ProjectWideDuplicationChecker };