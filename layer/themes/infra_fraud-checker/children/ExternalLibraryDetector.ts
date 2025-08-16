/**
 * External Library Direct Usage Detector
 * Detects when code directly imports external libraries instead of using wrapped versions
 */

import * as ts from 'typescript';
import { path } from '../../infra_external-log-lib/src';

export interface ExternalLibraryViolation {
  file: string;
  line: number;
  column: number;
  library: string;
  importStatement: string;
  suggestion: string;
}

export class ExternalLibraryDetector {
  // Libraries that should use wrapped versions
  private readonly WRAPPED_LIBRARIES = new Map<string, string>([
    // File system
    ['fs', '@aidev/external-log-lib/fs'],
    ['fs/promises', '@aidev/external-log-lib/fs/promises'],
    ['node:fs', '@aidev/external-log-lib/fs'],
    ['node:fs/promises', '@aidev/external-log-lib/fs/promises'],
    
    // Database
    ['sqlite3', '@aidev/external-log-lib/sqlite3'],
    
    // HTTP/Network
    ['axios', '@aidev/external-log-lib/axios'],
    ['http', '@aidev/external-log-lib/http'],
    ['https', '@aidev/external-log-lib/https'],
    ['node:http', '@aidev/external-log-lib/http'],
    ['node:https', '@aidev/external-log-lib/https'],
    ['node-fetch', '@aidev/external-log-lib/fetch'],
    ['got', '@aidev/external-log-lib/got'],
    ['request', '@aidev/external-log-lib/request'],
    
    // WebSocket
    ['ws', '@aidev/external-log-lib/ws'],
    ['socket.io', '@aidev/external-log-lib/socket.io'],
    ['socket.io-client', '@aidev/external-log-lib/socket.io-client'],
  ]);

  // Paths that are allowed to use direct imports (like external-log-lib itself)
  private readonly ALLOWED_PATHS = [
    'layer/themes/external-log-lib/',
    'node_modules/',
    '.test.ts',
    '.test.js',
    '.spec.ts',
    '.spec.js'
  ];

  constructor() {}

  /**
   * Check if a file path is allowed to use direct imports
   */
  private isAllowedPath(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    
    return this.ALLOWED_PATHS.some(allowed => {
      if (allowed.startsWith('.')) {
        // File extension check
        return normalizedPath.endsWith(allowed);
      }
      // Path contains check
      return normalizedPath.includes(allowed);
    });
  }

  /**
   * Detect external library usage violations in TypeScript code
   */
  detectViolations(sourceCode: string, filePath: string): ExternalLibraryViolation[] {
    // Skip if file is in allowed paths
    if (this.isAllowedPath(filePath)) {
      return [];
    }

    const violations: ExternalLibraryViolation[] = [];
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node) => {
      // Check import declarations
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          const violation = this.checkImportPath(importPath, node, sourceFile, filePath);
          if (violation) {
            violations.push(violation);
          }
        }
      }

      // Check require calls
      if (ts.isCallExpression(node) && 
          node.expression.getText() === 'require' && 
          node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          const requirePath = firstArg.text;
          const violation = this.checkImportPath(requirePath, node, sourceFile, filePath);
          if (violation) {
            violations.push(violation);
          }
        }
      }

      // Check dynamic imports
      if (ts.isCallExpression(node) && 
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isStringLiteral(firstArg)) {
          const importPath = firstArg.text;
          const violation = this.checkImportPath(importPath, node, sourceFile, filePath);
          if (violation) {
            violations.push(violation);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return violations;
  }

  /**
   * Check if an import path is a wrapped library
   */
  private checkImportPath(
    importPath: string, 
    node: ts.Node, 
    sourceFile: ts.SourceFile,
    filePath: string
  ): ExternalLibraryViolation | null {
    // Check if this is a wrapped library
    const wrappedVersion = this.WRAPPED_LIBRARIES.get(importPath);
    if (!wrappedVersion) {
      return null;
    }

    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    
    return {
      file: filePath,
      line: line + 1,
      column: character + 1,
      library: importPath,
      importStatement: node.getText(),
      suggestion: `Use wrapped version: import from '${wrappedVersion}' instead`
    };
  }

  /**
   * Generate a detailed report of violations
   */
  generateReport(violations: ExternalLibraryViolation[]): string {
    if (violations.length === 0) {
      return 'No external library direct usage violations found.';
    }

    let report = `Found ${violations.length} external library direct usage violations:\n\n`;

    // Group by file
    const byFile = new Map<string, ExternalLibraryViolation[]>();
    violations.forEach(v => {
      const list = byFile.get(v.file) || [];
      list.push(v);
      byFile.set(v.file, list);
    });

    byFile.forEach((fileViolations, file) => {
      report += `File: ${file}\n`;
      fileViolations.forEach(v => {
        report += `  Line ${v.line}:${v.column} - Direct import of '${v.library}'\n`;
        report += `    Statement: ${v.importStatement}\n`;
        report += `    ${v.suggestion}\n\n`;
      });
    });

    report += '\nHow to fix:\n';
    report += '1. Replace direct imports with wrapped versions from @aidev/external-log-lib\n';
    report += '2. The wrapped versions maintain the same API but add logging\n';
    report += '3. Example: Replace `import { fs } from '../../infra_external-log-lib/dist';` with `import { fs } from "@aidev/external-log-lib"`\n';

    return report;
  }

  /**
   * Check if code has any violations
   */
  hasViolations(sourceCode: string, filePath: string): boolean {
    return this.detectViolations(sourceCode, filePath).length > 0;
  }

  /**
   * Get suggested fix for a specific library
   */
  getSuggestedImport(library: string): string | null {
    return this.WRAPPED_LIBRARIES.get(library) || null;
  }
}