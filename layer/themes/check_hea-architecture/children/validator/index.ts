/**
 * HEA Validator
 * Validates files and structures against HEA architecture rules
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import * as ts from 'typescript';

export interface ValidationOptions {
  rootPath: string;
  strict?: boolean;
  fix?: boolean;
  exclude?: string[];
  include?: string[];
  customRules?: any[];
}

export interface ValidationError {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fixable?: boolean;
}

export interface ValidationWarning extends ValidationError {
  severity: 'warning';
}

export interface FileValidation {
  file: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  structure: {
    isTheme?: boolean;
    isPipe?: boolean;
    isChild?: boolean;
    layer?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  filesChecked: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fileValidations: FileValidation[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    fixableErrors: number;
    compliance: number;
  };
}

export class HEAValidator extends EventEmitter {
  private options: ValidationOptions;
  private errors: ValidationError[];
  private warnings: ValidationWarning[];
  private fileValidations: Map<string, FileValidation>;

  constructor(options: ValidationOptions) {
    super();
    this.options = options;
    this.errors = [];
    this.warnings = [];
    this.fileValidations = new Map();
  }

  async validate(): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];
    this.fileValidations.clear();

    this.emit('validation:start', { rootPath: this.options.rootPath });

    const files = await this.findFiles();
    
    for (const file of files) {
      await this.validateFile(file);
    }

    const result = this.generateResult();
    
    this.emit('validation:complete', result);
    
    return result;
  }

  private async findFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.shouldExclude(fullPath)) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext) && !this.shouldExclude(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    };

    walkDir(this.options.rootPath);
    return files;
  }

  private shouldExclude(filePath: string): boolean {
    const relativePath = path.relative(this.options.rootPath, filePath);
    
    // Default exclusions
    const defaultExclusions = ['node_modules', '.git', 'dist', 'build', 'coverage'];
    for (const exclusion of defaultExclusions) {
      if (relativePath.includes(exclusion)) {
        return true;
      }
    }

    // Custom exclusions
    if (this.options.exclude) {
      for (const pattern of this.options.exclude) {
        if (this.matchPattern(relativePath, pattern)) {
          return true;
        }
      }
    }

    // Check includes if specified
    if (this.options.include && this.options.include.length > 0) {
      let included = false;
      for (const pattern of this.options.include) {
        if (this.matchPattern(relativePath, pattern)) {
          included = true;
          break;
        }
      }
      return !included;
    }

    return false;
  }

  private matchPattern(path: string, pattern: string): boolean {
    // Simple glob matching
    const regex = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '\\/');
    return new RegExp(regex).test(path);
  }

  private async validateFile(filePath: string): Promise<void> {
    this.emit('file:validate:start', { file: filePath });

    const validation: FileValidation = {
      file: filePath,
      valid: true,
      errors: [],
      warnings: [],
      structure: this.analyzeFileStructure(filePath)
    };

    // Check file location
    this.validateFileLocation(filePath, validation);

    // Check imports
    await this.validateImports(filePath, validation);

    // Check exports
    await this.validateExports(filePath, validation);

    // Check dependencies
    this.validateDependencies(filePath, validation);

    // Update validation status
    validation.valid = validation.errors.length === 0;
    
    this.fileValidations.set(filePath, validation);
    this.errors.push(...validation.errors);
    this.warnings.push(...validation.warnings);

    this.emit('file:validate:complete', { file: filePath, validation });
  }

  private analyzeFileStructure(filePath: string): FileValidation['structure'] {
    const relativePath = path.relative(this.options.rootPath, filePath);
    const parts = relativePath.split(path.sep);

    const structure: FileValidation['structure'] = {};

    if (parts.includes('layer')) {
      const layerIndex = parts.indexOf('layer');
      structure.layer = parts[layerIndex + 1];
      
      if (parts.includes('themes')) {
        structure.isTheme = true;
      }
      
      if (parts.includes('pipe') && path.basename(filePath) === 'index.ts') {
        structure.isPipe = true;
      }
      
      if (parts.includes('children')) {
        structure.isChild = true;
      }
    }

    return structure;
  }

  private validateFileLocation(filePath: string, validation: FileValidation): void {
    const { structure } = validation;
    const fileName = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));

    // Rule: Pipe files must be named index.ts/js
    if (dirName === 'pipe' && !fileName.match(/^index\.(ts|js)$/)) {
      validation.errors.push({
        file: filePath,
        line: 1,
        column: 1,
        rule: 'pipe-index-only',
        message: 'Pipe directory must only contain index.ts or index.js',
        severity: 'error',
        fixable: false
      });
    }

    // Rule: Children must be in subdirectories
    if (dirName === 'children' && fileName.match(/^index\.(ts|js)$/)) {
      const parentDir = path.basename(path.dirname(path.dirname(filePath)));
      if (parentDir === 'children') {
        validation.errors.push({
          file: filePath,
          line: 1,
          column: 1,
          rule: 'children-subdirectory',
          message: 'Children modules must be in subdirectories',
          severity: 'error',
          fixable: false
        });
      }
    }

    // Rule: Layer structure enforcement
    if (structure.layer && !['themes', 'modules', 'services', 'utils'].includes(structure.layer)) {
      validation.warnings.push({
        file: filePath,
        line: 1,
        column: 1,
        rule: 'unknown-layer',
        message: `Unknown layer: ${structure.layer}`,
        severity: 'warning',
        fixable: false
      });
    }
  }

  private async validateImports(filePath: string, validation: FileValidation): Promise<void> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        this.validateImportPath(filePath, importPath, node, validation);
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private validateImportPath(
    filePath: string,
    importPath: string,
    node: ts.Node,
    validation: FileValidation
  ): void {
    const { structure } = validation;
    const fileDir = path.dirname(filePath);
    
    // Resolve the import
    let resolvedPath: string;
    if (importPath.startsWith('.')) {
      resolvedPath = path.resolve(fileDir, importPath);
    } else {
      resolvedPath = importPath;
    }

    // Rule: No direct cross-layer imports
    if (structure.layer && importPath.includes('../../../')) {
      const sourceFile = node.getSourceFile();
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      
      validation.errors.push({
        file: filePath,
        line: line + 1,
        column: character + 1,
        rule: 'no-cross-layer-imports',
        message: `Cross-layer import detected: ${importPath}`,
        severity: 'error',
        fixable: true
      });
    }

    // Rule: Children must import through pipe
    if (structure.isChild && importPath.includes('../children/')) {
      const sourceFile = node.getSourceFile();
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      
      validation.errors.push({
        file: filePath,
        line: line + 1,
        column: character + 1,
        rule: 'children-import-through-pipe',
        message: 'Children modules must import siblings through pipe gateway',
        severity: 'error',
        fixable: true
      });
    }

    // Rule: External modules should import from pipe
    if (!structure.isChild && !structure.isPipe && importPath.includes('/children/')) {
      const sourceFile = node.getSourceFile();
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      
      validation.errors.push({
        file: filePath,
        line: line + 1,
        column: character + 1,
        rule: 'import-from-pipe',
        message: 'External modules must import from pipe gateway, not children directly',
        severity: 'error',
        fixable: true
      });
    }
  }

  private async validateExports(filePath: string, validation: FileValidation): Promise<void> {
    const { structure } = validation;
    
    if (!structure.isPipe && !structure.isChild) {
      return;
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    let hasExports = false;
    let hasDefaultExport = false;

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        hasExports = true;
        if (ts.isExportAssignment(node) && !node.isExportEquals) {
          hasDefaultExport = true;
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Rule: Pipe must have exports
    if (structure.isPipe && !hasExports) {
      validation.errors.push({
        file: filePath,
        line: 1,
        column: 1,
        rule: 'pipe-must-export',
        message: 'Pipe gateway must export child modules',
        severity: 'error',
        fixable: false
      });
    }

    // Rule: Children should have default export
    if (structure.isChild && !hasDefaultExport) {
      validation.warnings.push({
        file: filePath,
        line: 1,
        column: 1,
        rule: 'child-default-export',
        message: 'Child modules should have a default export',
        severity: 'warning',
        fixable: false
      });
    }
  }

  private validateDependencies(filePath: string, validation: FileValidation): void {
    const { structure } = validation;
    
    // Rule: Check for circular dependencies
    // This is a simplified check - a full implementation would build a dependency graph
    if (validation.errors.some(e => e.rule === 'no-cross-layer-imports')) {
      validation.warnings.push({
        file: filePath,
        line: 1,
        column: 1,
        rule: 'potential-circular-dependency',
        message: 'Cross-layer imports may cause circular dependencies',
        severity: 'warning',
        fixable: false
      });
    }
  }

  private generateResult(): ValidationResult {
    const fileValidations = Array.from(this.fileValidations.values());
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    const fixableErrors = this.errors.filter(e => e.fixable).length;
    
    // Calculate compliance score (0-100)
    const totalIssues = totalErrors + (totalWarnings * 0.5);
    const filesChecked = fileValidations.length;
    const compliance = filesChecked > 0 
      ? Math.max(0, 100 - (totalIssues / filesChecked * 10))
      : 100;

    return {
      valid: totalErrors === 0,
      filesChecked,
      errors: this.errors,
      warnings: this.warnings,
      fileValidations,
      summary: {
        totalErrors,
        totalWarnings,
        fixableErrors,
        compliance: Math.round(compliance * 100) / 100
      }
    };
  }

  async validateSingleFile(filePath: string): Promise<FileValidation> {
    const validation: FileValidation = {
      file: filePath,
      valid: true,
      errors: [],
      warnings: [],
      structure: this.analyzeFileStructure(filePath)
    };

    await this.validateFile(filePath);
    
    return this.fileValidations.get(filePath) || validation;
  }

  getErrors(): ValidationError[] {
    return [...this.errors];
  }

  getWarnings(): ValidationWarning[] {
    return [...this.warnings];
  }

  clearResults(): void {
    this.errors = [];
    this.warnings = [];
    this.fileValidations.clear();
  }
}

export default HEAValidator;