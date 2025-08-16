import { fileAPI } from '../utils/file-api';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import * as ts from "typescript";
import { ModuleInfo, MethodInfo, ParameterInfo } from '../interfaces/layer';

export class ModuleAnalyzer {
  /**
   * Analyze a TypeScript module
   */
  analyzeModule(modulePath: string): ModuleInfo {
    const name = path.basename(modulePath);
    const files = this.findTypeScriptFiles(modulePath);
    const exports = this.extractExports(path.join(modulePath, 'src', 'index.ts'));
    const imports = this.extractAllImports(files);
    const hasTests = fs.existsSync(path.join(modulePath, 'tests')) || 
                    fs.existsSync(path.join(modulePath, '__tests__'));

    return {
      name,
      path: modulePath,
      exports,
      imports: [...new Set(imports)],
      hasTests,
    };
  }

  /**
   * Find all TypeScript files in a directory
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const srcDir = path.join(dir, 'src');

    if (!fs.existsSync(srcDir)) {
      return files;
    }

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    };

    walk(srcDir);
    return files;
  }

  /**
   * Extract exports from index file
   */
  private extractExports(indexPath: string): string[] {
    if (!fs.existsSync(indexPath)) {
      return [];
    }

    const content = fileAPI.readFileSync(indexPath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      indexPath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const exports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            exports.push(element.name.text);
          }
        } else if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          exports.push(`* from ${node.moduleSpecifier.text}`);
        }
      } else if (ts.isExportAssignment(node)) {
        exports.push('default');
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  /**
   * Extract imports from all files
   */
  private extractAllImports(files: string[]): string[] {
    const imports: string[] = [];

    for (const file of files) {
      const fileImports = this.extractImports(file);
      imports.push(...fileImports);
    }

    return imports;
  }

  /**
   * Extract imports from a file
   */
  private extractImports(filePath: string): string[] {
    const content = fileAPI.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const imports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push(node.moduleSpecifier.text);
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Analyze a pipe interface
   */
  analyzePipeInterface(filePath: string, interfaceName: string): MethodInfo[] {
    const content = fileAPI.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const methods: MethodInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
        for (const member of node.members) {
          if (ts.isMethodSignature(member) && member.name && ts.isIdentifier(member.name)) {
            const methodInfo = this.extractMethodInfo(member);
            if (methodInfo) {
              methods.push(methodInfo);
            }
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return methods;
  }

  /**
   * Extract method information
   */
  private extractMethodInfo(method: ts.MethodSignature): MethodInfo | null {
    if (!method.name || !ts.isIdentifier(method.name)) {
      return null;
    }

    const name = method.name.text;
    const parameters: ParameterInfo[] = [];
    
    for (const param of method.parameters) {
      if (ts.isIdentifier(param.name)) {
        parameters.push({
          name: param.name.text,
          type: param.type ? this.typeToString(param.type) : 'any',
          optional: !!param.questionToken,
          defaultValue: param.initializer ? param.initializer.getText() : undefined,
        });
      }
    }

    const returnType = method.type ? this.typeToString(method.type) : 'void';
    const async = returnType.includes('Promise');

    return {
      name,
      async,
      parameters,
      returnType,
    };
  }

  /**
   * Convert TypeScript type to string
   */
  private typeToString(type: ts.TypeNode): string {
    // Simple type string extraction
    // In a real implementation, this would use the TypeScript type checker
    return type.getText();
  }

  /**
   * Calculate test coverage (simplified)
   */
  async calculateCoverage(modulePath: string): Promise<number | undefined> {
    const coveragePath = path.join(modulePath, "coverage", 'coverage-summary.json');
    
    if (!fs.existsSync(coveragePath)) {
      return undefined;
    }

    try {
      const coverageData = JSON.parse(fileAPI.readFileSync(coveragePath, 'utf-8'));
      const total = coverageData.total;
      
      if (total && total.lines) {
        return total.lines.pct;
      }
    } catch (error) {
      console.error('Failed to read coverage data:', error);
    }

    return undefined;
  }
}