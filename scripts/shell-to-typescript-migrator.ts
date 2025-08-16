#!/usr/bin/env bun
/**
 * Shell Script to TypeScript Migrator
 * Converts shell scripts to TypeScript equivalents using Bun runtime
 */

import { readFile, writeFile, mkdir, chmod } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { existsSync } from 'fs';

interface ConversionRule {
  pattern: RegExp;
  convert: (match: RegExpMatchArray) => string;
  imports?: string[];
}

class ShellToTypeScriptMigrator {
  private imports = new Set<string>();
  private conversionRules: ConversionRule[] = [
    // Echo/Print
    {
      pattern: /^echo\s+(.*)/,
      convert: (match) => {
        const text = this.unquote(match[1]);
        return `console.log(${JSON.stringify(text)});`;
      }
    },
    // Change directory
    {
      pattern: /^cd\s+(.*)/,
      convert: (match) => {
        const path = this.unquote(match[1]);
        return `process.chdir(${JSON.stringify(path)});`;
      }
    },
    // Make directory
    {
      pattern: /^mkdir\s+(-p\s+)?(.*)/,
      convert: (match) => {
        const recursive = !!match[1];
        const path = this.unquote(match[2]);
        this.imports.add('fs/promises');
        if (recursive) {
          return `await mkdir(${JSON.stringify(path)}, { recursive: true });`;
        }
        return `await mkdir(${JSON.stringify(path)});`;
      },
      imports: ['mkdir from fs/promises']
    },
    // Remove files/directories
    {
      pattern: /^rm\s+(-rf?\s+)?(.*)/,
      convert: (match) => {
        const flags = match[1] || '';
        const path = this.unquote(match[2]);
        this.imports.add('fs/promises');
        if (flags.includes('r')) {
          return `await rm(${JSON.stringify(path)}, { recursive: true, force: flags.includes('f') });`;
        }
        return `await unlink(${JSON.stringify(path)});`;
      },
      imports: ['rm', 'unlink from fs/promises']
    },
    // Copy files
    {
      pattern: /^cp\s+(-r\s+)?([\S]+)\s+([\S]+)/,
      convert: (match) => {
        const recursive = !!match[1];
        const src = this.unquote(match[2]);
        const dest = this.unquote(match[3]);
        this.imports.add('fs/promises');
        if (recursive) {
          return `await cp(${JSON.stringify(src)}, ${JSON.stringify(dest)}, { recursive: true });`;
        }
        return `await copyFile(${JSON.stringify(src)}, ${JSON.stringify(dest)});`;
      },
      imports: ['cp', 'copyFile from fs/promises']
    },
    // Move/Rename files
    {
      pattern: /^mv\s+([\S]+)\s+([\S]+)/,
      convert: (match) => {
        const src = this.unquote(match[1]);
        const dest = this.unquote(match[2]);
        this.imports.add('fs/promises');
        return `await rename(${JSON.stringify(src)}, ${JSON.stringify(dest)});`;
      },
      imports: ['rename from fs/promises']
    },
    // Cat file
    {
      pattern: /^cat\s+(.*)/,
      convert: (match) => {
        const file = this.unquote(match[1]);
        this.imports.add('fs/promises');
        return `console.log(await readFile(${JSON.stringify(file)}, 'utf-8'));`;
      },
      imports: ['readFile from fs/promises']
    },
    // Export environment variable
    {
      pattern: /^export\s+([^=]+)=(.*)/,
      convert: (match) => {
        const varName = match[1];
        const value = this.unquote(match[2]);
        return `process.env.${varName} = ${JSON.stringify(value)};`;
      }
    },
    // Variable assignment
    {
      pattern: /^([A-Z_][A-Z0-9_]*)=(.*)/,
      convert: (match) => {
        const varName = match[1];
        const value = this.unquote(match[2]);
        
        // Handle command substitution
        if (value.startsWith('$(') && value.endsWith(')')) {
          const cmd = value.slice(2, -1);
          return `const ${this.toCamelCase(varName)} = await $\`${cmd}\`.text();`;
        }
        
        return `const ${this.toCamelCase(varName)} = ${JSON.stringify(value)};`;
      }
    },
    // If statement
    {
      pattern: /^if\s+\[\s*(.*)\s*\]/,
      convert: (match) => {
        const condition = this.convertCondition(match[1]);
        return `if (${condition}) {`;
      }
    },
    // Elif statement
    {
      pattern: /^elif\s+\[\s*(.*)\s*\]/,
      convert: (match) => {
        const condition = this.convertCondition(match[1]);
        return `} else if (${condition}) {`;
      }
    },
    // Else statement
    {
      pattern: /^else$/,
      convert: () => '} else {'
    },
    // Fi (end if)
    {
      pattern: /^fi$/,
      convert: () => '}'
    },
    // For loop
    {
      pattern: /^for\s+(\w+)\s+in\s+(.*)/,
      convert: (match) => {
        const varName = match[1];
        let items = match[2].replace(/;\s*do$/, '').trim();
        
        // Handle glob patterns
        if (items.includes('*')) {
          this.imports.add('glob');
          return `for (const ${varName} of await glob.glob(${JSON.stringify(items)})) {`;
        }
        
        // Handle space-separated items
        const itemList = items.split(/\s+/).map(i => JSON.stringify(this.unquote(i)));
        return `for (const ${varName} of [${itemList.join(', ')}]) {`;
      }
    },
    // While loop
    {
      pattern: /^while\s+(.*)/,
      convert: (match) => {
        const condition = match[1].replace(/;\s*do$/, '').trim();
        return `while (${this.convertCondition(condition)}) {`;
      }
    },
    // Done (end loop)
    {
      pattern: /^done$/,
      convert: () => '}'
    },
    // Function definition
    {
      pattern: /^(?:function\s+)?(\w+)\s*\(\)/,
      convert: (match) => {
        const funcName = match[1];
        return `async function ${funcName}() {`;
      }
    },
    // Curl command
    {
      pattern: /^curl\s+(.*)/,
      convert: (match) => {
        const args = match[1];
        const urlMatch = args.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const url = urlMatch[1];
          return `const response = await fetch(${JSON.stringify(url)});`;
        }
        return `// TODO: Complex curl command: ${match[0]}`;
      }
    },
    // NPM/Yarn/Bun commands
    {
      pattern: /^(npm|yarn|bun)\s+(.*)/,
      convert: (match) => {
        const cmd = match[1];
        const args = match[2];
        
        // Use Bun for all package manager commands
        if (cmd === 'npm' || cmd === 'yarn') {
          const bunCmd = args.replace(/^install/, 'install')
                            .replace(/^run\s+/, 'run ')
                            .replace(/^test/, 'test');
          return `await $\`bun ${bunCmd}\`;`;
        }
        
        return `await $\`bun ${args}\`;`;
      }
    }
  ];

  async migrateScript(shellScriptPath: string): Promise<string> {
    const content = await readFile(shellScriptPath, 'utf-8');
    const lines = content.split('\n');
    const outputLines: string[] = [];
    
    // Add header
    outputLines.push('#!/usr/bin/env bun');
    outputLines.push('/**');
    outputLines.push(` * Migrated from: ${basename(shellScriptPath)}`);
    outputLines.push(' * Auto-generated TypeScript script for Bun runtime');
    outputLines.push(' */');
    outputLines.push('');
    
    // Process lines
    let indentLevel = 0;
    const blockStack: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed) {
        outputLines.push('');
        continue;
      }
      
      if (trimmed.startsWith('#')) {
        outputLines.push('//' + trimmed.substring(1));
        continue;
      }
      
      // Handle block endings
      if (trimmed === 'fi' || trimmed === 'done' || trimmed === '}') {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Convert line
      const converted = this.convertLine(trimmed);
      if (converted) {
        outputLines.push('  '.repeat(indentLevel) + converted);
        
        // Handle block beginnings
        if (converted.endsWith('{')) {
          indentLevel++;
          blockStack.push(trimmed);
        }
      }
    }
    
    // Add imports at the top
    if (this.imports.size > 0) {
      const importLines: string[] = [];
      
      // Group imports
      if (this.imports.has('fs/promises')) {
        importLines.push("import { readFile, writeFile, mkdir, rm, unlink, copyFile, cp, rename } from 'fs/promises';");
      }
      if (this.imports.has('path')) {
        importLines.push("import { join, dirname, basename, resolve } from 'path';");
      }
      if (this.imports.has('glob')) {
        importLines.push("import { glob } from 'glob';");
      }
      if (this.imports.has('child_process')) {
        importLines.push("import { $ } from 'bun';");
      }
      
      importLines.push('');
      
      // Insert imports after header
      outputLines.splice(6, 0, ...importLines);
    }
    
    // Add main function wrapper if needed
    const hasMainLogic = outputLines.some(line => 
      !line.startsWith('//') && 
      !line.startsWith('import') && 
      !line.startsWith('function') &&
      !line.startsWith('async function') &&
      line.trim() !== '' &&
      line.trim() !== '}'
    );
    
    if (hasMainLogic) {
      // Wrap main logic in async function
      const mainStart = outputLines.findIndex(line => 
        !line.startsWith('//') && 
        !line.startsWith('import') && 
        !line.startsWith('/**') &&
        !line.startsWith(' *') &&
        line.trim() !== ''
      );
      
      if (mainStart > 0) {
        outputLines.splice(mainStart, 0, 'async function main() {');
        outputLines.push('}');
        outputLines.push('');
        outputLines.push('// Run main function');
        outputLines.push('if (import.meta.main) {');
        outputLines.push('  main().catch(console.error);');
        outputLines.push('}');
      }
    }
    
    return outputLines.join('\n');
  }

  private convertLine(line: string): string {
    // Try each conversion rule
    for (const rule of this.conversionRules) {
      const match = line.match(rule.pattern);
      if (match) {
        if (rule.imports) {
          rule.imports.forEach(imp => this.imports.add(imp));
        }
        return rule.convert(match);
      }
    }
    
    // Default: run as shell command using Bun's $ template
    if (line && !line.startsWith('then') && !line.startsWith('do')) {
      return `await $\`${line}\`;`;
    }
    
    return '';
  }

  private convertCondition(condition: string): string {
    // File test operators
    condition = condition.replace(/-f\s+"?([^"\s]+)"?/, 'await exists("$1")');
    condition = condition.replace(/-d\s+"?([^"\s]+)"?/, 'await isDirectory("$1")');
    condition = condition.replace(/-e\s+"?([^"\s]+)"?/, 'await exists("$1")');
    condition = condition.replace(/-z\s+"?([^"\s]+)"?/, '!"$1"');
    condition = condition.replace(/-n\s+"?([^"\s]+)"?/, '"$1"');
    
    // Comparison operators
    condition = condition.replace(/\s+-eq\s+/g, ' === ');
    condition = condition.replace(/\s+-ne\s+/g, ' !== ');
    condition = condition.replace(/\s+-lt\s+/g, ' < ');
    condition = condition.replace(/\s+-le\s+/g, ' <= ');
    condition = condition.replace(/\s+-gt\s+/g, ' > ');
    condition = condition.replace(/\s+-ge\s+/g, ' >= ');
    
    // String comparison
    condition = condition.replace(/\s*=\s*/g, ' === ');
    condition = condition.replace(/\s*!=\s*/g, ' !== ');
    
    // Boolean operators
    condition = condition.replace(/\s+-a\s+/g, ' && ');
    condition = condition.replace(/\s+-o\s+/g, ' || ');
    
    return condition;
  }

  private unquote(str: string): string {
    str = str.trim();
    if ((str.startsWith('"') && str.endsWith('"')) || 
        (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }
    return str;
  }

  private toCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

async function migrateSimpleScripts() {
  // Read the analysis report
  const reportPath = '/home/ormastes/dev/aidev/gen/doc/shell-scripts-analysis.json';
  const report = JSON.parse(await readFile(reportPath, 'utf-8'));
  
  const migrator = new ShellToTypeScriptMigrator();
  
  // Create migration directory
  const migrationDir = '/home/ormastes/dev/aidev/scripts/migrated/typescript';
  await mkdir(migrationDir, { recursive: true });
  
  // Migrate Phase 1 scripts
  const phase1Scripts = report.migrationPlan.phase1_simple;
  
  console.log('📘 Migrating simple shell scripts to TypeScript...');
  console.log('='.repeat(50));
  
  for (const scriptInfo of phase1Scripts) {
    const scriptPath = join('/home/ormastes/dev/aidev', scriptInfo.path);
    
    if (!existsSync(scriptPath)) {
      console.log(`⚠️  Skipping ${basename(scriptPath)} - file not found`);
      continue;
    }
    
    console.log(`\n📝 Migrating: ${basename(scriptPath)}`);
    
    try {
      // Migrate the script
      const tsCode = await migrator.migrateScript(scriptPath);
      
      // Save the migrated script
      const outputPath = join(migrationDir, basename(scriptPath).replace('.sh', '.ts'));
      await writeFile(outputPath, tsCode);
      
      // Make it executable
      await chmod(outputPath, 0o755);
      
      console.log(`   ✅ Saved to: scripts/migrated/typescript/${basename(outputPath)}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ Migration complete! Check scripts/migrated/typescript/');
}

// Helper functions for file checks (would be in a separate utils file in production)
async function exists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).exists();
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await Bun.file(path).stat();
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// Run the migration
if (import.meta.main) {
  migrateSimpleScripts().catch(console.error);
}