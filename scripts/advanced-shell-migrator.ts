#!/usr/bin/env bun
/**
 * Advanced Shell Script Migration Framework
 * Handles complex shell scripts with functions, advanced patterns, and system calls
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { existsSync } from 'fs';

interface MigrationContext {
  variables: Map<string, string>;
  functions: Map<string, FunctionDefinition>;
  imports: Set<string>;
  globalCode: string[];
  mainCode: string[];
  currentIndent: number;
}

interface FunctionDefinition {
  name: string;
  params: string[];
  body: string[];
}

class AdvancedShellMigrator {
  private context: MigrationContext;

  constructor() {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      imports: new Set(['fs/promises', 'path', 'child_process']),
      globalCode: [],
      mainCode: [],
      currentIndent: 0
    };
  }

  async migrateComplexScript(scriptPath: string, outputLang: 'typescript' | 'python'): Promise<string> {
    const content = await readFile(scriptPath, 'utf-8');
    const lines = content.split('\n');
    
    // First pass: identify structure
    this.analyzeStructure(lines);
    
    // Second pass: convert code
    if (outputLang === 'typescript') {
      return this.convertToTypeScript(lines, basename(scriptPath));
    } else {
      return this.convertToPython(lines, basename(scriptPath));
    }
  }

  private analyzeStructure(lines: string[]): void {
    let inFunction = false;
    let currentFunction: FunctionDefinition | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Function detection
      const funcMatch = line.match(/^(?:function\s+)?(\w+)\s*\(\s*\)/);
      if (funcMatch) {
        currentFunction = {
          name: funcMatch[1],
          params: [],
          body: []
        };
        inFunction = true;
        continue;
      }
      
      // Function end
      if (line === '}' && inFunction) {
        if (currentFunction) {
          this.context.functions.set(currentFunction.name, currentFunction);
        }
        inFunction = false;
        currentFunction = null;
        continue;
      }
      
      // Collect function body
      if (inFunction && currentFunction) {
        currentFunction.body.push(line);
      }
      
      // Global variable detection
      const varMatch = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (varMatch && !inFunction) {
        this.context.variables.set(varMatch[1], varMatch[2]);
      }
    }
  }

  private convertToTypeScript(lines: string[], filename: string): string {
    const output: string[] = [];
    
    // Header
    output.push('#!/usr/bin/env bun');
    output.push('/**');
    output.push(` * Migrated from: ${filename}`);
    output.push(' * Advanced TypeScript migration with full feature support');
    output.push(' */');
    output.push('');
    
    // Imports
    output.push("import { readFile, writeFile, mkdir, rm, access, stat } from 'fs/promises';");
    output.push("import { join, dirname, basename, resolve } from 'path';");
    output.push("import { $ } from 'bun';");
    output.push("import { spawn } from 'child_process';");
    output.push('');
    
    // Utility functions
    output.push('// Utility functions');
    output.push(this.getTypeScriptUtilities());
    output.push('');
    
    // Global variables
    if (this.context.variables.size > 0) {
      output.push('// Global variables');
      for (const [key, value] of this.context.variables) {
        output.push(`const ${this.toCamelCase(key)} = process.env.${key} || ${JSON.stringify(value)};`);
      }
      output.push('');
    }
    
    // Convert functions
    if (this.context.functions.size > 0) {
      output.push('// Converted functions');
      for (const [name, func] of this.context.functions) {
        output.push(this.convertFunctionToTypeScript(func));
        output.push('');
      }
    }
    
    // Main logic
    output.push('async function main() {');
    
    let inFunction = false;
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip function definitions
      if (trimmed.match(/^(?:function\s+)?\w+\s*\(\s*\)/)) {
        inFunction = true;
        continue;
      }
      if (trimmed === '}' && inFunction) {
        inFunction = false;
        continue;
      }
      if (inFunction) continue;
      
      // Convert main logic
      const converted = this.convertLineToTypeScript(trimmed);
      if (converted) {
        output.push('  ' + converted);
      }
    }
    
    output.push('}');
    output.push('');
    output.push('// Execute main');
    output.push('if (import.meta.main) {');
    output.push('  main().catch(error => {');
    output.push('    console.error("Error:", error);');
    output.push('    process.exit(1);');
    output.push('  });');
    output.push('}');
    
    return output.join('\n');
  }

  private convertToPython(lines: string[], filename: string): string {
    const output: string[] = [];
    
    // Header
    output.push('#!/usr/bin/env python3');
    output.push('"""');
    output.push(`Migrated from: ${filename}`);
    output.push('Advanced Python migration with full feature support');
    output.push('"""');
    output.push('');
    
    // Imports
    output.push('import os');
    output.push('import sys');
    output.push('import subprocess');
    output.push('import shutil');
    output.push('import json');
    output.push('import re');
    output.push('import glob');
    output.push('from pathlib import Path');
    output.push('from typing import List, Dict, Optional, Any');
    output.push('');
    
    // Utility functions
    output.push('# Utility functions');
    output.push(this.getPythonUtilities());
    output.push('');
    
    // Global variables
    if (this.context.variables.size > 0) {
      output.push('# Global variables');
      for (const [key, value] of this.context.variables) {
        const pythonVar = key.toLowerCase();
        output.push(`${pythonVar} = os.environ.get('${key}', ${JSON.stringify(value)})`);
      }
      output.push('');
    }
    
    // Convert functions
    if (this.context.functions.size > 0) {
      output.push('# Converted functions');
      for (const [name, func] of this.context.functions) {
        output.push(this.convertFunctionToPython(func));
        output.push('');
      }
    }
    
    // Main logic
    output.push('def main():');
    output.push('    """Main execution function"""');
    
    let inFunction = false;
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip function definitions
      if (trimmed.match(/^(?:function\s+)?\w+\s*\(\s*\)/)) {
        inFunction = true;
        continue;
      }
      if (trimmed === '}' && inFunction) {
        inFunction = false;
        continue;
      }
      if (inFunction) continue;
      
      // Convert main logic
      const converted = this.convertLineToPython(trimmed);
      if (converted) {
        output.push('    ' + converted);
      }
    }
    
    output.push('');
    output.push('');
    output.push('if __name__ == "__main__":');
    output.push('    try:');
    output.push('        main()');
    output.push('    except Exception as e:');
    output.push('        print(f"Error: {e}", file=sys.stderr)');
    output.push('        sys.exit(1)');
    
    return output.join('\n');
  }

  private convertFunctionToTypeScript(func: FunctionDefinition): string {
    const lines: string[] = [];
    lines.push(`async function ${func.name}() {`);
    
    for (const line of func.body) {
      const converted = this.convertLineToTypeScript(line);
      if (converted) {
        lines.push('  ' + converted);
      }
    }
    
    lines.push('}');
    return lines.join('\n');
  }

  private convertFunctionToPython(func: FunctionDefinition): string {
    const lines: string[] = [];
    lines.push(`def ${func.name}():`);
    lines.push(`    """Function ${func.name}"""`);    
    for (const line of func.body) {
      const converted = this.convertLineToPython(line);
      if (converted) {
        lines.push('    ' + converted);
      }
    }
    
    if (func.body.length === 0) {
      lines.push('    pass');
    }
    
    return lines.join('\n');
  }

  private convertLineToTypeScript(line: string): string {
    if (!line || line.startsWith('#')) {
      return line.startsWith('#') ? '//' + line.substring(1) : '';
    }
    
    // Advanced patterns
    const patterns = [
      // Case statement
      { regex: /^case\s+(.*)\s+in/, convert: (m: RegExpMatchArray) => `switch (${m[1]}) {` },
      { regex: /^\s*(.+)\)/, convert: (m: RegExpMatchArray) => `  case ${JSON.stringify(m[1])}:` },
      { regex: /^esac/, convert: () => '}' },
      
      // Array operations
      { regex: /^(\w+)=\(\s*(.*)\s*\)/, convert: (m: RegExpMatchArray) => `const ${m[1]} = [${m[2].split(' ').map(s => JSON.stringify(s)).join(', ')}];` },
      { regex: /^\$\{#(\w+)\[@\]\}/, convert: (m: RegExpMatchArray) => `${m[1]}.length` },
      { regex: /^\$\{(\w+)\[@\]\}/, convert: (m: RegExpMatchArray) => `...${m[1]}` },
      
      // String operations
      { regex: /^\$\{(\w+)\/\/([^}]+)\/([^}]+)\}/, convert: (m: RegExpMatchArray) => `${m[1]}.replace(/${m[2]}/g, '${m[3]}')` },
      { regex: /^\$\{(\w+)##([^}]+)\}/, convert: (m: RegExpMatchArray) => `${m[1]}.replace(/^${m[2]}/, '')` },
      { regex: /^\$\{(\w+)%%([^}]+)\}/, convert: (m: RegExpMatchArray) => `${m[1]}.replace(/${m[2]}$/, '')` },
      
      // Process substitution
      { regex: /^<\((.*)\)/, convert: (m: RegExpMatchArray) => `await $\`${m[1]}\`.text()` },
      { regex: /^>\((.*)\)/, convert: (m: RegExpMatchArray) => `await writeToCommand(${JSON.stringify(m[1])})` },
      
      // Here document
      { regex: /^cat\s*<<\s*(\w+)/, convert: (m: RegExpMatchArray) => `const heredoc_${m[1]} = \`` },
      { regex: /^(\w+)$/, convert: (m: RegExpMatchArray) => `\`; // End of heredoc ${m[1]}` },
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return pattern.convert(match);
      }
    }
    
    // Default conversion
    return `await $\`${line}\`;`;
  }

  private convertLineToPython(line: string): string {
    if (!line || line.startsWith('#')) {
      return line ? '# ' + line.substring(1) : '';
    }
    
    // Advanced patterns
    const patterns = [
      // Case statement
      { regex: /^case\s+(.*)\s+in/, convert: (m: RegExpMatchArray) => `match ${m[1]}:` },
      { regex: /^\s*(.+)\)/, convert: (m: RegExpMatchArray) => `    case ${JSON.stringify(m[1])}:` },
      { regex: /^esac/, convert: () => '' },
      
      // Array operations
      { regex: /^(\w+)=\(\s*(.*)\s*\)/, convert: (m: RegExpMatchArray) => `${m[1].toLowerCase()} = [${m[2].split(' ').map(s => JSON.stringify(s)).join(', ')}]` },
      
      // String operations
      { regex: /^\$\{(\w+)\/\/([^}]+)\/([^}]+)\}/, convert: (m: RegExpMatchArray) => `${m[1].toLowerCase()}.replace('${m[2]}', '${m[3]}')` },
      
      // Process substitution
      { regex: /^<\((.*)\)/, convert: (m: RegExpMatchArray) => `subprocess.check_output(${JSON.stringify(m[1])}, shell=True, text=True)` },
      
      // Pipe operations
      { regex: /^(.*)\s*\|\s*(.*)/, convert: (m: RegExpMatchArray) => this.convertPipeToPython(m[1], m[2]) },
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        return pattern.convert(match);
      }
    }
    
    // Default conversion
    return `subprocess.run(${JSON.stringify(line)}, shell=True)`;
  }

  private convertPipeToPython(cmd1: string, cmd2: string): string {
    return `
p1 = subprocess.Popen(${JSON.stringify(cmd1)}, shell=True, stdout=subprocess.PIPE)
p2 = subprocess.Popen(${JSON.stringify(cmd2)}, shell=True, stdin=p1.stdout)
p1.stdout.close()
output = p2.communicate()[0]`;
  }

  private getTypeScriptUtilities(): string {
    return `
// Check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Check if directory exists
async function dirExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// Run command and get output
async function getCommandOutput(cmd: string): Promise<string> {
  const result = await $\`\${cmd}\`;
  return result.text().trim();
}

// Color output helpers
const colors = {
  red: (text: string) => \`\\x1b[31m\${text}\\x1b[0m\`,
  green: (text: string) => \`\\x1b[32m\${text}\\x1b[0m\`,
  yellow: (text: string) => \`\\x1b[33m\${text}\\x1b[0m\`,
  blue: (text: string) => \`\\x1b[34m\${text}\\x1b[0m\`,
};`;
  }

  private getPythonUtilities(): string {
    return `
def file_exists(path: str) -> bool:
    """Check if file exists"""
    return Path(path).is_file()

def dir_exists(path: str) -> bool:
    """Check if directory exists"""
    return Path(path).is_dir()

def run_command(cmd: str, capture_output: bool = False) -> Optional[str]:
    """Run shell command and optionally capture output"""
    if capture_output:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    else:
        subprocess.run(cmd, shell=True)
        return None

def colored(text: str, color: str) -> str:
    """Add color to text output"""
    colors = {
        'red': '\\033[31m',
        'green': '\\033[32m',
        'yellow': '\\033[33m',
        'blue': '\\033[34m',
        'reset': '\\033[0m'
    }
    return f"{colors.get(color, '')}{text}{colors['reset']}"`;
  }

  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

// Migration executor
async function migrateMediumComplexityScripts() {
  const reportPath = '/home/ormastes/dev/aidev/gen/doc/shell-scripts-analysis.json';
  const report = JSON.parse(await readFile(reportPath, 'utf-8'));
  
  const migrator = new AdvancedShellMigrator();
  
  // Create directories for migrated scripts
  const tsMigrationDir = '/home/ormastes/dev/aidev/scripts/migrated/typescript/medium';
  const pyMigrationDir = '/home/ormastes/dev/aidev/scripts/migrated/python/medium';
  
  await mkdir(tsMigrationDir, { recursive: true });
  await mkdir(pyMigrationDir, { recursive: true });
  
  // Get medium complexity scripts
  const mediumScripts = report.migrationPlan.phase2_medium || [];
  
  console.log('🚀 Advanced Migration of Medium Complexity Scripts');
  console.log('='.repeat(50));
  
  for (const scriptInfo of mediumScripts.slice(0, 3)) { // Migrate first 3 for demo
    const scriptPath = join('/home/ormastes/dev/aidev', scriptInfo.path);
    
    if (!existsSync(scriptPath)) {
      console.log(`⚠️  Skipping ${basename(scriptPath)} - file not found`);
      continue;
    }
    
    console.log(`\n📝 Migrating: ${basename(scriptPath)}`);
    console.log(`   Complexity: ${scriptInfo.complexity}`);
    console.log(`   Lines: ${scriptInfo.lines}`);
    
    try {
      // Migrate to TypeScript
      const tsCode = await migrator.migrateComplexScript(scriptPath, 'typescript');
      const tsOutputPath = join(tsMigrationDir, basename(scriptPath).replace('.sh', '.ts'));
      await writeFile(tsOutputPath, tsCode);
      console.log(`   ✅ TypeScript: ${tsOutputPath}`);
      
      // Migrate to Python
      const pyCode = await migrator.migrateComplexScript(scriptPath, 'python');
      const pyOutputPath = join(pyMigrationDir, basename(scriptPath).replace('.sh', '.py'));
      await writeFile(pyOutputPath, pyCode);
      console.log(`   ✅ Python: ${pyOutputPath}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Advanced migration complete!');
}

// Execute if run directly
if (import.meta.main) {
  migrateMediumComplexityScripts().catch(console.error);
}