/**
 * HEA Fixer
 * Automatically fixes HEA architecture violations
 */

import { EventEmitter } from 'node:events';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import * as ts from "typescript";
import { ValidationError } from '../validator';

export interface FixOptions {
  dryRun?: boolean;
  interactive?: boolean;
  backup?: boolean;
  autoApprove?: boolean;
  fixTypes?: string[];
}

export interface FixResult {
  success: boolean;
  filesFixed: number;
  fixesApplied: number;
  errors: string[];
  changes: FileChange[];
}

export interface FileChange {
  file: string;
  originalContent: string;
  newContent: string;
  fixes: Fix[];
}

export interface Fix {
  type: string;
  line: number;
  column: number;
  original: string;
  replacement: string;
  description: string;
}

export interface AutoFixable {
  rule: string;
  canFix: boolean;
  fixFunction?: (error: ValidationError, content: string) => string;
}

export interface FixSuggestion {
  error: ValidationError;
  suggestion: string;
  automated: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface RefactorPlan {
  description: string;
  steps: RefactorStep[];
  estimatedImpact: 'minimal' | "moderate" | "significant";
  breakingChanges: boolean;
}

export interface RefactorStep {
  order: number;
  action: string;
  target: string;
  details: string;
}

export class HEAFixer extends EventEmitter {
  private options: FixOptions;
  private fixableRules: Map<string, AutoFixable>;
  private changes: FileChange[];

  constructor(options: FixOptions = {}) {
    async super();
    this.options = options;
    this.changes = [];
    this.fixableRules = new Map();
    this.registerFixableRules();
  }

  async private registerFixableRules(): void {
    // Register auto-fixable rules
    this.fixableRules.set('no-cross-layer-imports', {
      rule: 'no-cross-layer-imports',
      canFix: true,
      fixFunction: this.fixCrossLayerImport.bind(this)
    });

    this.fixableRules.set('children-import-through-pipe', {
      rule: 'children-import-through-pipe',
      canFix: true,
      fixFunction: this.fixChildrenImport.bind(this)
    });

    this.fixableRules.set('import-from-pipe', {
      rule: 'import-from-pipe',
      canFix: true,
      fixFunction: this.fixDirectChildImport.bind(this)
    });

    this.fixableRules.set('pipe-index-only', {
      rule: 'pipe-index-only',
      canFix: false // Requires file rename
    });

    this.fixableRules.set('pipe-must-export', {
      rule: 'pipe-must-export',
      canFix: true,
      fixFunction: this.addPipeExports.bind(this)
    });
  }

  async fix(errors: ValidationError[]): Promise<FixResult> {
    this.changes = [];
    const result: FixResult = {
      success: true,
      filesFixed: 0,
      fixesApplied: 0,
      errors: [],
      changes: []
    };

    this.emit('fix:start', { errors: errors.length, dryRun: this.options.dryRun });

    // Group errors by file
    const errorsByFile = this.groupErrorsByFile(errors);

    for(const [filePath, fileErrors] of errorsByFile) {
      try {
        const change = await this.fixFile(filePath, fileErrors);
        if(change) {
          result.changes.push(change);
          result.filesFixed++;
          result.fixesApplied += change.fixes.length;
        }
      } catch (error: any) {
        result.errors.push(`Failed to fix ${filePath}: ${error.message}`);
        result.success = false;
      }
    }

    this.emit('fix:complete', result);
    return result;
  }

  async private groupErrorsByFile(errors: ValidationError[]): Map<string, ValidationError[]> {
    const grouped = new Map<string, ValidationError[]>();

    for(const error of errors) {
      if(!error.fixable) continue;
      if(this.options.fixTypes && !this.options.fixTypes.includes(error.rule)) continue;

      if(!grouped.has(error.file)) {
        grouped.set(error.file, []);
      }
      grouped.get(error.file)!.push(error);
    }

    return grouped;
  }

  private async fixFile(filePath: string, errors: ValidationError[]): Promise<FileChange | null> {
    this.emit('file:fix:start', { file: filePath, errors: errors.length });

    const originalContent = await fs.promises.readFile(filePath, 'utf8');
    let newContent = originalContent;
    const fixes: Fix[] = [];

    // Sort errors by line/column in reverse order to avoid position shifts
    errors.sort((a, b) => {
      if(a.line === b.line) {
        return b.column - a.column;
      }
      return b.line - a.line;
    });

    for(const error of errors) {
      const fixable = this.fixableRules.get(error.rule);
      if(!fixable || !fixable.canFix || !fixable.fixFunction) {
        continue;
      }

      const fixedContent = fixable.fixFunction(error, newContent);
      if(fixedContent !== newContent) {
        fixes.push({
          type: error.rule,
          line: error.line,
          column: error.column,
          original: this.getLineContent(newContent, error.line),
          replacement: this.getLineContent(fixedContent, error.line),
          description: error.message
        });
        newContent = fixedContent;
      }
    }

    if(fixes.length === 0) {
      return null;
    }

    const change: FileChange = {
      file: filePath,
      originalContent,
      newContent,
      fixes
    };

    if(!this.options.dryRun) {
      if(this.options.backup) {
        await this.createBackup(filePath, originalContent);
      }

      if(this.options.interactive && !this.options.autoApprove) {
        const approved = await this.promptForApproval(change);
        if(!approved) {
          return null;
        }
      }

      await fileAPI.createFile(filePath, newContent, { type: FileType.TEMPORARY });
    }

    this.emit('file:fix:complete', { file: filePath, fixes: fixes.length });
    return change;
  }

  async private fixCrossLayerImport(error: ValidationError, content: string): string {
    const sourceFile = ts.createSourceFile(
      error.file,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const printer = ts.createPrinter();
    const result = ts.transform(sourceFile, [this.createImportTransformer(error)]);
    const transformedSourceFile = result.transformed[0];
    
    return printer.printFile(transformedSourceFile as ts.SourceFile);
  }

  async private fixChildrenImport(error: ValidationError, content: string): string {
    // Replace ../children/ imports with ../pipe imports
    const lines = content.split('\n');
    const line = lines[error.line - 1];
    
    const newLine = line.replace(
      /from\s+['"]\.\.\/children\/([^'"]+)['"]/,
      'from \'../pipe\''
    );
    
    lines[error.line - 1] = newLine;
    return lines.join('\n');
  }

  async private fixDirectChildImport(error: ValidationError, content: string): string {
    // Replace /children/ imports with /pipe imports
    const lines = content.split('\n');
    const line = lines[error.line - 1];
    
    const newLine = line.replace(
      /from\s+['"]([^'"]*?)\/children\/[^'"]+['"]/,
      'from \'$1/pipe\''
    );
    
    lines[error.line - 1] = newLine;
    return lines.join('\n');
  }

  async private addPipeExports(error: ValidationError, content: string): string {
    const pipeDir = path.dirname(error.file);
    const childrenDir = path.join(path.dirname(pipeDir), "children");
    
    if(!fs.existsSync(childrenDir)) {
      return content;
    }

    const children = fs.readdirSync(childrenDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const exports: string[] = [];
    for(const child of children) {
      exports.push(`export * from '../children/${child}';`);
    }

    return content + '\n' + exports.join('\n') + '\n';
  }

  async private createImportTransformer(error: ValidationError): ts.TransformerFactory<ts.SourceFile> {
    async return(context) => {
      const visit: ts.Visitor = (node) => {
        if(ts.isImportDeclaration(node)) {
          const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
          
          if(importPath.includes('../../../')) {
            // Fix cross-layer import
            const newPath = this.resolveCrossLayerImport(error.file, importPath);
            if(newPath !== importPath) {
              return ts.factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                ts.factory.createStringLiteral(newPath),
                node.assertClause
              );
            }
          }
        }
        
        return ts.visitEachChild(node, visit, context);
      };
      
      async return(node) => ts.visitNode(node, visit) as ts.SourceFile;
    };
  }

  async private resolveCrossLayerImport(fromFile: string, importPath: string): string {
    // Try to resolve through pipe gateway
    const parts = importPath.split('/');
    const pipeIndex = parts.indexOf('pipe');
    
    if(pipeIndex !== -1) {
      return importPath;
    }
    
    // Look for pipe in the target module
    const resolved = path.resolve(path.dirname(fromFile), importPath);
    const moduleRoot = this.findModuleRoot(resolved);
    
    if(moduleRoot) {
      const pipeGateway = path.join(moduleRoot, 'pipe');
      if(fs.existsSync(pipeGateway)) {
        const relativePath = path.relative(path.dirname(fromFile), pipeGateway);
        return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
      }
    }
    
    return importPath;
  }

  async private findModuleRoot(filePath: string): string | null {
    let current = filePath;
    
    while(current !== path.dirname(current)) {
      if(fs.existsSync(path.join(current, 'pipe'))) {
        return current;
      }
      
      const basename = path.basename(current);
      if(basename === 'themes' || basename === 'layer') {
        break;
      }
      
      current = path.dirname(current);
    }
    
    return null;
  }

  async private getLineContent(content: string, lineNumber: number): string {
    const lines = content.split('\n');
    return lines[lineNumber - 1] || '';
  }

  private async createBackup(filePath: string, content: string): Promise<void> {
    const backupPath = `${filePath}.bak.${Date.now()}`;
    await fileAPI.createFile(backupPath, content, { type: FileType.TEMPORARY });
    this.emit('backup:created', { original: filePath, backup: backupPath });
  }

  private async promptForApproval(change: FileChange): Promise<boolean> {
    // In a real implementation, this would show a diff and prompt the user
    // For now, we'll auto-approve if autoApprove is true
    return this.options.autoApprove || false;
  }

  async generateRefactorPlan(errors: ValidationError[]): Promise<RefactorPlan> {
    const steps: RefactorStep[] = [];
    let order = 1;

    // Analyze errors to determine refactoring needs
    const hasCrossLayerImports = errors.some(e => e.rule === 'no-cross-layer-imports');
    const hasDirectChildImports = errors.some(e => e.rule === 'import-from-pipe');
    const missingPipes = errors.some(e => e.rule === 'pipe-must-export');

    if(missingPipes) {
      steps.push({
        order: order++,
        action: 'create-pipe-gateways',
        target: 'themes with children',
        details: 'Create pipe/index.ts files to export child modules'
      });
    }

    if(hasDirectChildImports) {
      steps.push({
        order: order++,
        action: 'refactor-imports',
        target: 'external modules',
        details: 'Update imports to use pipe gateways instead of direct children imports'
      });
    }

    if(hasCrossLayerImports) {
      steps.push({
        order: order++,
        action: 'restructure-dependencies',
        target: 'cross-layer imports',
        details: 'Restructure modules to eliminate cross-layer dependencies'
      });
    }

    const estimatedImpact = steps.length > 2 ? "significant" :
                           steps.length > 0 ? "moderate" : 'minimal';

    const breakingChanges = hasCrossLayerImports || missingPipes;

    return {
      description: 'Refactor plan to achieve HEA compliance',
      steps,
      estimatedImpact,
      breakingChanges
    };
  }

  generateSuggestions(errors: ValidationError[]): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    for(const error of errors) {
      const fixable = this.fixableRules.get(error.rule);
      
      if (fixable && fixable.canFix) {
        suggestions.push({
          error,
          suggestion: `Auto-fix available: Run fixer to automatically resolve this issue`,
          automated: true,
          confidence: 'high'
        });
      } else {
        const manualSuggestion = this.getManualFixSuggestion(error);
        if(manualSuggestion) {
          suggestions.push({
            error,
            suggestion: manualSuggestion,
            automated: false,
            confidence: 'medium'
          });
        }
      }
    }

    return suggestions;
  }

  private getManualFixSuggestion(error: ValidationError): string | null {
    switch (error.rule) {
      case 'pipe-index-only':
        return 'Rename the file to index.ts or move it out of the pipe directory';
      
      case 'children-subdirectory':
        return 'Move the module into a subdirectory under children/';
      
      case 'potential-circular-dependency':
        return 'Review module dependencies and consider using dependency injection or events';
      
      case 'child-default-export':
        return 'Add a default export to the child module';
      
      default:
        return null;
    }
  }

  canAutoFix(rule: string): boolean {
    const fixable = this.fixableRules.get(rule);
    return fixable?.canFix || false;
  }

  getFixableRules(): string[] {
    return Array.from(this.fixableRules.entries())
      .filter(([_, fixable]) => fixable.canFix)
      .map(([rule]) => rule);
  }
}

export default HEAFixer;