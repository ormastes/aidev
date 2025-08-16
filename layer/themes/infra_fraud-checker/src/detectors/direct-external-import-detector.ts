/**
 * Direct External Import Detector
 * Detects direct imports of Node.js built-in modules that should use external-log-lib
 */

import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { BaseDetector } from './base-detector';
import { DetectionResult, Severity } from '../types';

export class DirectExternalImportDetector extends BaseDetector {
  name = 'DirectExternalImport';
  description = 'Detects direct imports of Node.js modules that should use external-log-lib';

  // Node.js built-in modules that should be imported from external-log-lib
  private readonly RESTRICTED_MODULES = [
    'fs',
    'fs/promises',
    'path',
    'child_process',
    'http',
    'https',
    'net',
    'os',
    'crypto',
    'stream',
    'events',
    'url',
    'querystring',
    'zlib',
    'dns',
    'cluster',
    'readline',
    'vm',
    'util',
    'buffer'
  ];

  // Patterns to detect direct imports
  private readonly IMPORT_PATTERNS = [
    // ES6 imports
    /^import\s+(?:\*\s+as\s+\w+|\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/gm,
    // Require statements
    /(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
    // Dynamic imports
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
    // Specific destructured requires
    /(?:const|let|var)\s+\{[^}]+\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm
  ];

  // Files/paths to exclude from checking
  private readonly EXCLUSIONS = [
    'node_modules',
    'infra_external-log-lib', // The external-log-lib itself can use direct imports
    '.test.ts',
    '.test.js',
    '.spec.ts',
    '.spec.js',
    'dist/',
    'build/',
    '.git/',
    '.jj/'
  ];

  async detect(rootPath: string): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    const files = this.findSourceFiles(rootPath);

    for (const file of files) {
      if (this.shouldExclude(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const violations = this.detectDirectImports(content, file);
      
      if (violations.length > 0) {
        results.push(...violations);
      }
    }

    return results;
  }

  private findSourceFiles(rootPath: string): string[] {
    const files: string[] = [];
    
    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!this.shouldExclude(fullPath)) {
              walk(fullPath);
            }
          } else if (entry.isFile() && this.isSourceFile(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    walk(rootPath);
    return files;
  }

  private isSourceFile(filename: string): boolean {
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename);
  }

  private shouldExclude(filePath: string): boolean {
    return this.EXCLUSIONS.some(exclusion => filePath.includes(exclusion));
  }

  private detectDirectImports(content: string, filePath: string): DetectionResult[] {
    const results: DetectionResult[] = [];
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const pattern of this.IMPORT_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex
        let match;
        
        while ((match = pattern.exec(line)) !== null) {
          const importedModule = match[1];
          
          if (this.isRestrictedModule(importedModule)) {
            results.push({
              type: 'DirectExternalImport',
              severity: Severity.HIGH,
              message: `Direct import of Node.js module '${importedModule}' detected. Should use external-log-lib instead.`,
              file: filePath,
              line: lineNum + 1,
              column: match.index,
              code: line.trim(),
              suggestion: this.getSuggestion(line, importedModule)
            });
          }
        }
      }
    }

    return results;
  }

  private isRestrictedModule(moduleName: string): boolean {
    // Check if it's a Node.js built-in module
    const baseModule = moduleName.split('/')[0];
    return this.RESTRICTED_MODULES.includes(moduleName) || 
           this.RESTRICTED_MODULES.includes(baseModule);
  }

  private getSuggestion(line: string, moduleName: string): string {
    // Provide suggestions for fixing the import
    if (line.includes('import * as fs from')) {
      return "import { fs } from '../path/to/infra_external-log-lib/src';";
    } else if (line.includes('import * as path from')) {
      return "import { path } from '../path/to/infra_external-log-lib/src';";
    } else if (line.includes('import * as')) {
      const module = moduleName.replace('/', '').replace('-', '');
      return `import { ${module} } from '../path/to/infra_external-log-lib/src';`;
    } else if (line.includes('require(')) {
      const varName = line.match(/(?:const|let|var)\s+(\w+)/)?.[1] || moduleName;
      return `const { ${varName} } = require('../path/to/infra_external-log-lib/src');`;
    } else if (line.includes('import {')) {
      return line.replace(
        new RegExp(`from\\s+['"]${moduleName}['"]`),
        "from '../path/to/infra_external-log-lib/src'"
      );
    }
    
    return "Use external-log-lib imports instead of direct Node.js modules";
  }

  async fix(file: string, line: number, suggestion: string): Promise<boolean> {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      if (line > 0 && line <= lines.length) {
        // Calculate proper relative path
        const relativePath = this.calculateRelativePath(file);
        const fixedSuggestion = suggestion.replace(
          '../path/to/infra_external-log-lib/src',
          relativePath
        );
        
        lines[line - 1] = fixedSuggestion;
        await fileAPI.createFile(file, lines.join('\n', { type: FileType.TEMPORARY }));
        return true;
      }
    } catch (error) {
      console.error(`Failed to fix ${file}:${line}:`, error);
    }
    
    return false;
  }

  private calculateRelativePath(fromFile: string): string {
    const fromDir = path.dirname(fromFile);
    const toDir = path.join(process.cwd(), 'layer/themes/infra_external-log-lib/src');
    let relativePath = path.relative(fromDir, toDir);
    
    // Ensure forward slashes for imports
    relativePath = relativePath.replace(/\\/g, '/');
    
    // Add ./ if it doesn't start with ../
    if (!relativePath.startsWith('../') && !relativePath.startsWith('./')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath;
  }
}