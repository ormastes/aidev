import { fileAPI } from '../utils/file-api';
/**
 * Track coverage at the class and method level for Python code
 */

import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import { execSync } from 'child_process';
import { ClassMetrics, MethodMetrics } from '../pipe/types';

export class ClassCoverageTracker {
  private classMetricsCache: Map<string, ClassMetrics[]>;

  constructor() {
    this.classMetricsCache = new Map();
  }

  /**
   * Analyze class-level coverage for a source directory
   */
  async analyzeClasses(sourcePath: string): Promise<Map<string, ClassMetrics>> {
    const classMetrics = new Map<string, ClassMetrics>();
    const pythonFiles = await this.findPythonFiles(sourcePath);

    for (const file of pythonFiles) {
      const classes = await this.extractClassesFromFile(file);
      
      for (const cls of classes) {
        const metrics = await this.calculateClassMetrics(cls, file);
        classMetrics.set(`${file}::${cls.name}`, metrics);
      }
    }

    return classMetrics;
  }

  /**
   * Get coverage metrics for a specific class
   */
  async getClassCoverage(
    className: string,
    coverageData: any
  ): Promise<ClassMetrics> {
    const [file, name] = this.parseClassName(className);
    const fileData = coverageData.files[file];
    
    if (!fileData) {
      throw new Error(`No coverage data for file: ${file}`);
    }

    const classInfo = await this.extractClassInfo(file, name);
    const methods = classInfo.methods;
    const coveredMethods = this.countCoveredMethods(methods, fileData);

    return {
      name,
      file,
      lineCoverage: this.calculateLineCoverage(classInfo.lines, fileData),
      methodCoverage: (coveredMethods / methods.length) * 100,
      totalMethods: methods.length,
      coveredMethods,
      totalLines: classInfo.lines.length,
      coveredLines: this.countCoveredLines(classInfo.lines, fileData),
      uncoveredMethods: this.findUncoveredMethods(methods, fileData),
      complexity: classInfo.complexity
    };
  }

  /**
   * Find methods that are not covered by tests
   */
  async findUncoveredMethods(
    className: string,
    coverageData: any
  ): Promise<string[]> {
    const metrics = await this.getClassCoverage(className, coverageData);
    return metrics.uncoveredMethods;
  }

  /**
   * Get method-level coverage metrics
   */
  async getMethodCoverage(
    className: string,
    methodName: string,
    coverageData: any
  ): Promise<MethodMetrics> {
    const [file, name] = this.parseClassName(className);
    const fileData = coverageData.files[file];
    
    if (!fileData) {
      throw new Error(`No coverage data for file: ${file}`);
    }

    const methodInfo = await this.extractMethodInfo(file, name, methodName);
    
    return {
      name: methodName,
      className: name,
      coverage: this.calculateLineCoverage(methodInfo.lines, fileData),
      complexity: methodInfo.complexity,
      lines: methodInfo.lines.length,
      coveredLines: this.countCoveredLines(methodInfo.lines, fileData),
      branches: methodInfo.branches,
      coveredBranches: this.countCoveredBranches(methodInfo.branchLines, fileData)
    };
  }

  /**
   * Find all Python files in a directory
   */
  private async findPythonFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && 
          entry.name !== '__pycache__' && entry.name !== 'node_modules') {
        const subFiles = await this.findPythonFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Extract class definitions from a Python file
   */
  private async extractClassesFromFile(filePath: string): Promise<any[]> {
    const content = await fileAPI.readFile(filePath, 'utf-8');
    const classes: any[] = [];
    
    // Use Python AST to extract class information
    const pythonScript = `
import ast
import sys

with open('${filePath}', 'r') as f:
    tree = ast.parse(f.read())

for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef):
        methods = []
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                methods.append({
                    'name': item.name,
                    'lineno': item.lineno,
                    'end_lineno': item.end_lineno or item.lineno
                })
        print(f"{node.name}|{node.lineno}|{node.end_lineno or node.lineno}|{len(methods)}")
`;

    try {
      const output = execSync(`python -c "${pythonScript}"`, { encoding: 'utf-8' });
      const lines = output.trim().split('\n').filter(line => line);
      
      for (const line of lines) {
        const [name, startLine, endLine, methodCount] = line.split('|');
        classes.push({
          name,
          startLine: parseInt(startLine),
          endLine: parseInt(endLine),
          methodCount: parseInt(methodCount)
        });
      }
    } catch (error) {
      console.error(`Error extracting classes from ${filePath}:`, error);
    }

    return classes;
  }

  /**
   * Calculate metrics for a class
   */
  private async calculateClassMetrics(
    classInfo: any,
    filePath: string
  ): Promise<ClassMetrics> {
    // This is a simplified version - in production, you'd use coverage data
    return {
      name: classInfo.name,
      file: filePath,
      lineCoverage: 0,
      methodCoverage: 0,
      totalMethods: classInfo.methodCount,
      coveredMethods: 0,
      totalLines: classInfo.endLine - classInfo.startLine + 1,
      coveredLines: 0,
      uncoveredMethods: [],
      complexity: 1
    };
  }

  /**
   * Parse class name into file and name components
   */
  private parseClassName(className: string): [string, string] {
    const parts = className.split('::');
    if (parts.length !== 2) {
      throw new Error(`Invalid class name format: ${className}`);
    }
    return [parts[0], parts[1]];
  }

  /**
   * Extract detailed class information
   */
  private async extractClassInfo(
    filePath: string,
    className: string
  ): Promise<any> {
    const pythonScript = `
import ast
import sys

with open('${filePath}', 'r') as f:
    tree = ast.parse(f.read())

for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef) and node.name == '${className}':
        methods = []
        lines = list(range(node.lineno, (node.end_lineno or node.lineno) + 1))
        
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                methods.append({
                    'name': item.name,
                    'lines': list(range(item.lineno, (item.end_lineno or item.lineno) + 1))
                })
        
        complexity = len([n for n in ast.walk(node) if isinstance(n, (ast.If, ast.While, ast.For, ast.ExceptHandler))])
        
        import json
        print(json.dumps({
            'lines': lines,
            'methods': methods,
            "complexity": complexity + 1
        }))
        break
`;

    try {
      const output = execSync(`python -c "${pythonScript}"`, { encoding: 'utf-8' });
      return JSON.parse(output);
    } catch (error) {
      console.error(`Error extracting class info:`, error);
      return { lines: [], methods: [], complexity: 1 };
    }
  }

  /**
   * Extract method information
   */
  private async extractMethodInfo(
    filePath: string,
    className: string,
    methodName: string
  ): Promise<any> {
    const pythonScript = `
import ast
import sys

with open('${filePath}', 'r') as f:
    tree = ast.parse(f.read())

for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef) and node.name == '${className}':
        for item in node.body:
            if isinstance(item, ast.FunctionDef) and item.name == '${methodName}':
                lines = list(range(item.lineno, (item.end_lineno or item.lineno) + 1))
                branches = len([n for n in ast.walk(item) if isinstance(n, (ast.If, ast.While, ast.For))])
                complexity = branches + 1
                
                branch_lines = []
                for n in ast.walk(item):
                    if isinstance(n, (ast.If, ast.While, ast.For)):
                        branch_lines.append(n.lineno)
                
                import json
                print(json.dumps({
                    'lines': lines,
                    "branches": branches,
                    "branchLines": branch_lines,
                    "complexity": complexity
                }))
                break
`;

    try {
      const output = execSync(`python -c "${pythonScript}"`, { encoding: 'utf-8' });
      return JSON.parse(output);
    } catch (error) {
      console.error(`Error extracting method info:`, error);
      return { lines: [], branches: 0, branchLines: [], complexity: 1 };
    }
  }

  /**
   * Calculate line coverage for a set of lines
   */
  private calculateLineCoverage(lines: number[], fileData: any): number {
    if (lines.length === 0) return 100;
    
    const missingLines = fileData.missing_lines || [];
    const coveredLines = lines.filter(line => !missingLines.includes(line));
    
    return (coveredLines.length / lines.length) * 100;
  }

  /**
   * Count covered lines
   */
  private countCoveredLines(lines: number[], fileData: any): number {
    const missingLines = fileData.missing_lines || [];
    return lines.filter(line => !missingLines.includes(line)).length;
  }

  /**
   * Count covered methods
   */
  private countCoveredMethods(methods: any[], fileData: any): number {
    const missingLines = fileData.missing_lines || [];
    let coveredCount = 0;
    
    for (const method of methods) {
      const methodLines = method.lines;
      const hasAnyCoveredLine = methodLines.some(
        (line: number) => !missingLines.includes(line)
      );
      
      if (hasAnyCoveredLine) {
        coveredCount++;
      }
    }
    
    return coveredCount;
  }

  /**
   * Find uncovered methods
   */
  private findUncoveredMethods(methods: any[], fileData: any): string[] {
    const missingLines = fileData.missing_lines || [];
    const uncovered: string[] = [];
    
    for (const method of methods) {
      const methodLines = method.lines;
      const allLinesUncovered = methodLines.every(
        (line: number) => missingLines.includes(line)
      );
      
      if (allLinesUncovered) {
        uncovered.push(method.name);
      }
    }
    
    return uncovered;
  }

  /**
   * Count covered branches
   */
  private countCoveredBranches(branchLines: number[], fileData: any): number {
    const missingLines = fileData.missing_lines || [];
    return branchLines.filter(line => !missingLines.includes(line)).length;
  }
}