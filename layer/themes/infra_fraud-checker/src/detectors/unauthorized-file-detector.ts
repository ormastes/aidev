/**
 * Unauthorized File/Folder Detector
 * 
 * Detects unauthorized file and directory creation violations
 * by integrating with filesystem-mcp for platform requirements validation
 */

import { path } from '../../../infra_external-log-lib/src';
import { BaseDetector } from './base-detector';
import { auditedFS } from '../../../infra_external-log-lib/pipe';

// Import filesystem-mcp through pipe
import type { 
  VFFileStructureWrapper, 
  FileStructure,
  ValidationResult as MCPValidationResult 
} from '../../../infra_filesystem-mcp/pipe';

export interface UnauthorizedFileViolation {
  type: 'unauthorized_file' | 'unauthorized_directory' | 'frozen_directory_violation';
  path: string;
  reason: string;
  suggestedLocation?: string;
  severity: 'error' | 'warning';
  createdBy?: string[];
  platformRequired?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  violations: UnauthorizedFileViolation[];
  totalViolations: number;
  criticalViolations: number;
}

export class UnauthorizedFileDetector extends BaseDetector {
  private fileStructureWrapper: VFFileStructureWrapper | null = null;
  private rootPath: string;
  private platformRequiredFiles: Set<string>;
  
  constructor(rootPath: string = process.cwd()) {
    super('unauthorized-file');
    this.rootPath = rootPath;
    
    // Platform required files that should exist in root
    this.platformRequiredFiles = new Set([
      'CLAUDE.md',
      'README.md',
      'TASK_QUEUE.vf.json',
      'FEATURE.vf.json',
      'FILE_STRUCTURE.vf.json',
      'NAME_ID.vf.json',
      'package.json',
      'tsconfig.json',
      'pyproject.toml'
    ]);
  }
  
  /**
   * Initialize filesystem-mcp integration
   */
  private async initFilesystemMCP(): Promise<VFFileStructureWrapper> {
    if (!this.fileStructureWrapper) {
      try {
        // Dynamic import to avoid circular dependencies
        const { VFFileStructureWrapper } = await import('../../../infra_filesystem-mcp/pipe');
        this.fileStructureWrapper = new VFFileStructureWrapper(this.rootPath);
        await this.fileStructureWrapper.loadStructure();
      } catch (error) {
        console.warn('Could not load filesystem-mcp integration:', error);
        // Create a mock wrapper if filesystem-mcp is not available
        this.fileStructureWrapper = this.createMockWrapper();
      }
    }
    return this.fileStructureWrapper;
  }
  
  /**
   * Create a mock wrapper for when filesystem-mcp is not available
   */
  private createMockWrapper(): any {
    return {
      validatePath: async (filePath: string) => {
        // Basic validation when filesystem-mcp is not available
        return { valid: true, message: 'Mock validation' };
      },
      validateWrite: async (filePath: string) => {
        return { valid: true, message: 'Mock validation' };
      }
    };
  }
  
  /**
   * Detect unauthorized files and directories
   */
  async detect(targetPath?: string): Promise<ValidationResult> {
    const violations: UnauthorizedFileViolation[] = [];
    const scanPath = targetPath || this.rootPath;
    
    // Initialize filesystem-mcp integration
    const mcpWrapper = await this.initFilesystemMCP();
    
    // Scan root level
    const rootViolations = await this.scanRootLevel(scanPath, mcpWrapper);
    violations.push(...rootViolations);
    
    // Scan for forbidden patterns
    const patternViolations = await this.scanForbiddenPatterns(scanPath);
    violations.push(...patternViolations);
    
    // Scan for frozen directory violations
    const frozenViolations = await this.scanFrozenDirectories(scanPath, mcpWrapper);
    violations.push(...frozenViolations);
    
    // Find creators of violations
    for (const violation of violations) {
      if (!violation.platformRequired) {
        violation.createdBy = await this.findCreators(violation.path);
      }
    }
    
    const criticalViolations = violations.filter(v => v.severity === 'error').length;
    
    return {
      valid: violations.length === 0,
      violations,
      totalViolations: violations.length,
      criticalViolations
    };
  }
  
  /**
   * Scan root level for unauthorized files/directories
   */
  private async scanRootLevel(scanPath: string, mcpWrapper: any): Promise<UnauthorizedFileViolation[]> {
    const violations: UnauthorizedFileViolation[] = [];
    
    const forbiddenRootDirs = [
      { name: 'coverage', suggestedLocation: 'gen/coverage/' },
      { name: 'deploy', suggestedLocation: 'layer/themes/infra_deployment/' },
      { name: 'docs', suggestedLocation: 'gen/doc/' },
      { name: 'features', suggestedLocation: 'layer/themes/[theme-name]/features/' },
      { name: 'setup', suggestedLocation: 'scripts/setup/' },
      { name: 'src', suggestedLocation: 'layer/themes/[theme-name]/children/' },
      { name: 'test-output', suggestedLocation: 'gen/test-output/' },
      { name: 'test-results', suggestedLocation: 'gen/test-results/' },
      { name: 'dist', suggestedLocation: 'layer/themes/[theme-name]/dist/' },
      { name: 'build', suggestedLocation: 'layer/themes/[theme-name]/build/' }
    ];
    
    try {
      const entries = await auditedFS.readdir(scanPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(scanPath, entry.name);
        const relativePath = path.relative(this.rootPath, entryPath);
        
        if (entry.isDirectory()) {
          // Check if it's a forbidden root directory
          const forbidden = forbiddenRootDirs.find(f => f.name === entry.name);
          if (forbidden) {
            // Check with filesystem-mcp if it's platform required
            const validation = await mcpWrapper.validatePath(relativePath, true);
            
            if (!validation.valid) {
              violations.push({
                type: 'unauthorized_directory',
                path: relativePath,
                reason: `Directory "${entry.name}" should not exist at root level`,
                suggestedLocation: forbidden.suggestedLocation,
                severity: 'error',
                platformRequired: false
              });
            }
          }
        } else if (entry.isFile()) {
          // Check if it's an unauthorized root file
          if (!this.platformRequiredFiles.has(entry.name) && 
              !entry.name.endsWith('.md') && 
              !entry.name.endsWith('.json') &&
              !entry.name.endsWith('.vf.json')) {
            
            // Check with filesystem-mcp
            const validation = await mcpWrapper.validatePath(relativePath, false);
            
            if (!validation.valid) {
              violations.push({
                type: 'unauthorized_file',
                path: relativePath,
                reason: 'Unauthorized file at root level',
                suggestedLocation: 'layer/themes/[theme-name]/ or gen/',
                severity: 'warning',
                platformRequired: false
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning root level: ${error}`);
    }
    
    return violations;
  }
  
  /**
   * Scan for forbidden file patterns
   */
  private async scanForbiddenPatterns(scanPath: string): Promise<UnauthorizedFileViolation[]> {
    const violations: UnauthorizedFileViolation[] = [];
    
    const forbiddenPatterns = [
      { pattern: /\.(bak|backup|old|orig)$/, reason: 'Backup files should not exist (use git)' },
      { pattern: /\.DS_Store$/, reason: 'macOS system files should not be committed' },
      { pattern: /Thumbs\.db$/, reason: 'Windows system files should not be committed' },
      { pattern: /~$/, reason: 'Temporary files should not be committed' },
      { pattern: /\.swp$/, reason: 'Vim swap files should not be committed' }
    ];
    
    const scanDirectory = async (dirPath: string): Promise<void> => {
      try {
        const entries = await auditedFS.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(this.rootPath, fullPath);
          
          // Skip node_modules and .git
          if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
          }
          
          if (entry.isFile()) {
            for (const forbidden of forbiddenPatterns) {
              if (forbidden.pattern.test(entry.name)) {
                violations.push({
                  type: 'unauthorized_file',
                  path: relativePath,
                  reason: forbidden.reason,
                  severity: 'error',
                  platformRequired: false
                });
              }
            }
          } else if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };
    
    await scanDirectory(scanPath);
    return violations;
  }
  
  /**
   * Scan for frozen directory violations
   */
  private async scanFrozenDirectories(scanPath: string, mcpWrapper: any): Promise<UnauthorizedFileViolation[]> {
    const violations: UnauthorizedFileViolation[] = [];
    
    const frozenDirs = [
      'llm_rules',
      'layer/themes/*/pipe',
      'layer/epics/*/pipe'
    ];
    
    for (const frozenPattern of frozenDirs) {
      const dirs = await this.findMatchingDirs(scanPath, frozenPattern);
      
      for (const dir of dirs) {
        const relativePath = path.relative(this.rootPath, dir);
        
        // Check if directory has been modified recently
        const hasRecentChanges = await this.checkRecentModifications(dir);
        
        if (hasRecentChanges) {
          const validation = await mcpWrapper.validateWrite(relativePath, true);
          
          if (!validation.valid) {
            violations.push({
              type: 'frozen_directory_violation',
              path: relativePath,
              reason: `Frozen directory "${relativePath}" should not be modified`,
              severity: 'error',
              platformRequired: false
            });
          }
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Find directories matching a pattern
   */
  private async findMatchingDirs(basePath: string, pattern: string): Promise<string[]> {
    const dirs: string[] = [];
    
    if (pattern.includes('*')) {
      // Handle wildcards
      const parts = pattern.split('/');
      const searchDir = async (currentPath: string, patternParts: string[], depth: number): Promise<void> => {
        if (depth >= patternParts.length) {
          dirs.push(currentPath);
          return;
        }
        
        const part = patternParts[depth];
        
        try {
          const entries = await auditedFS.readdir(currentPath, { withFileTypes: true });
          
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            if (part === '*' || entry.name === part) {
              await searchDir(path.join(currentPath, entry.name), patternParts, depth + 1);
            }
          }
        } catch (error) {
          // Ignore errors
        }
      };
      
      await searchDir(basePath, parts, 0);
    } else {
      // Direct path
      const fullPath = path.join(basePath, pattern);
      if (await auditedFS.exists(fullPath)) {
        dirs.push(fullPath);
      }
    }
    
    return dirs;
  }
  
  /**
   * Check if directory has recent modifications
   */
  private async checkRecentModifications(dirPath: string): Promise<boolean> {
    try {
      const stats = await auditedFS.stat(dirPath);
      const hoursSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      return hoursSinceModified < 24; // Check if modified in last 24 hours
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Find files that create unauthorized directories
   */
  private async findCreators(violationPath: string): Promise<string[]> {
    const creators: string[] = [];
    const dirName = path.basename(violationPath);
    
    const patterns = [
      `mkdir.*${dirName}`,
      `mkdirSync.*${dirName}`,
      `fs\\.mkdir.*${dirName}`,
      `ensureDir.*${dirName}`,
      `outputDir.*${dirName}`,
      `outDir.*${dirName}`
    ];
    
    const searchPaths = ['layer', 'scripts', 'common'];
    
    for (const searchPath of searchPaths) {
      const fullPath = path.join(this.rootPath, searchPath);
      if (!(await auditedFS.exists(fullPath))) continue;
      
      const files = await this.findFilesRecursive(fullPath, /\.(js|ts|json)$/);
      
      for (const file of files) {
        try {
          const content = await auditedFS.readFile(file, 'utf-8');
          for (const pattern of patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(content)) {
              const relativePath = path.relative(this.rootPath, file);
              if (!creators.includes(relativePath)) {
                creators.push(relativePath);
              }
              break;
            }
          }
        } catch (error) {
          // Ignore read errors
        }
      }
    }
    
    return creators;
  }
  
  /**
   * Find files recursively
   */
  private async findFilesRecursive(dir: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (currentDir: string): Promise<void> => {
      try {
        const entries = await auditedFS.readdir(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          
          if (entry.isDirectory() && entry.name !== 'node_modules') {
            await scanDir(fullPath);
          } else if (entry.isFile() && pattern.test(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };
    
    await scanDir(dir);
    return files;
  }
  
  /**
   * Generate report of violations
   */
  async generateReport(result: ValidationResult): Promise<string> {
    let report = '# Unauthorized File/Folder Detection Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total Violations: ${result.totalViolations}\n`;
    report += `- Critical Violations: ${result.criticalViolations}\n`;
    report += `- Status: ${result.valid ? '✅ PASS' : '❌ FAIL'}\n\n`;
    
    if (result.violations.length > 0) {
      report += '## Violations\n\n';
      
      // Group by type
      const byType = {
        unauthorized_file: result.violations.filter(v => v.type === 'unauthorized_file'),
        unauthorized_directory: result.violations.filter(v => v.type === 'unauthorized_directory'),
        frozen_directory_violation: result.violations.filter(v => v.type === 'frozen_directory_violation')
      };
      
      for (const [type, violations] of Object.entries(byType)) {
        if (violations.length === 0) continue;
        
        report += `### ${type.replace(/_/g, ' ').toUpperCase()}\n\n`;
        
        for (const violation of violations) {
          report += `#### ${violation.path}\n\n`;
          report += `- **Reason:** ${violation.reason}\n`;
          report += `- **Severity:** ${violation.severity}\n`;
          
          if (violation.suggestedLocation) {
            report += `- **Suggested Location:** ${violation.suggestedLocation}\n`;
          }
          
          if (violation.createdBy && violation.createdBy.length > 0) {
            report += `- **Created By:**\n`;
            for (const creator of violation.createdBy) {
              report += `  - ${creator}\n`;
            }
          }
          
          report += '\n';
        }
      }
      
      report += '## Recommended Actions\n\n';
      report += '1. Move unauthorized directories to their proper locations\n';
      report += '2. Remove backup and temporary files\n';
      report += '3. Update configuration files to use correct paths\n';
      report += '4. Ensure frozen directories are not modified\n';
      report += '5. Use filesystem-mcp for proper file structure validation\n';
    }
    
    return report;
  }
}

export default UnauthorizedFileDetector;