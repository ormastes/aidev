#!/usr/bin/env node

/**
 * Fix remaining violations in specific high-priority components
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class RemainingViolationsFixer {
  constructor() {
    this.basePath = process.cwd();
    this.stats = {
      fixed: [],
      failed: [],
      totalChanges: 0
    };
    
    // Components with remaining violations
    this.targetComponents = [
      {
        name: 'init_env-config',
        path: 'layer/themes/init_env-config',
        violations: 16
      },
      {
        name: 'init_docker', 
        path: 'layer/themes/init_docker',
        violations: 14
      },
      {
        name: 'init_build-environment',
        path: 'layer/themes/init_build-environment',
        violations: 14
      },
      {
        name: 'tool_web-scraper',
        path: 'layer/themes/tool_web-scraper',
        violations: 9
      },
      {
        name: 'shared',
        path: 'layer/themes/shared',
        violations: 9
      },
      {
        name: 'research',
        path: 'layer/themes/research',
        violations: 7
      },
      {
        name: 'mcp_lsp',
        path: 'layer/themes/mcp_lsp',
        violations: 7
      },
      {
        name: 'check_hea-architecture',
        path: 'layer/themes/check_hea-architecture',
        violations: 7
      },
      {
        name: 'llm-agent_chat-space',
        path: 'layer/themes/llm-agent_chat-space',
        violations: 6
      },
      {
        name: 'llm-agent_coordinator-claude',
        path: 'layer/themes/llm-agent_coordinator-claude',
        violations: 5
      }
    ];
  }

  async fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let changeCount = 0;
      
      // Skip if already using FileCreationAPI
      if (content.includes('FileCreationAPI') || content.includes('fileAPI')) {
        // Check if there are still violations despite having the import
        const hasViolations = this.checkForViolations(content);
        if (!hasViolations) {
          return { fixed: false, reason: 'Already migrated' };
        }
      }
      
      // Pattern replacements with proper async handling
      const replacements = [
        // fs.writeFileSync
        {
          from: /fs\.writeFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          to: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.writeFile with callback - extract path and data only
        {
          from: /fs\.writeFile\s*\(\s*([^,]+),\s*([^,]+),\s*[^)]+\)/g,
          to: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.promises.writeFile
        {
          from: /fs\.promises\.writeFile\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          to: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.mkdirSync with options
        {
          from: /fs\.mkdirSync\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
          to: 'await fileAPI.createDirectory($1)'
        },
        // fs.mkdir with callback
        {
          from: /fs\.mkdir\s*\(\s*([^,]+)(?:,\s*\{[^}]*\})?,\s*[^)]+\)/g,
          to: 'await fileAPI.createDirectory($1)'
        },
        // fs.promises.mkdir
        {
          from: /fs\.promises\.mkdir\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
          to: 'await fileAPI.createDirectory($1)'
        },
        // fs.appendFileSync
        {
          from: /fs\.appendFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          to: 'await fileAPI.appendFile($1, $2)'
        },
        // fs.appendFile with callback
        {
          from: /fs\.appendFile\s*\(\s*([^,]+),\s*([^,]+),\s*[^)]+\)/g,
          to: 'await fileAPI.appendFile($1, $2)'
        },
        // fs.createWriteStream
        {
          from: /fs\.createWriteStream\s*\(\s*([^)]+)\s*\)/g,
          to: 'fileAPI.createWriteStream($1)'
        }
      ];
      
      // Apply replacements
      for (const { from, to } of replacements) {
        const matches = content.match(from);
        if (matches) {
          content = content.replace(from, to);
          changeCount += matches.length;
        }
      }
      
      if (changeCount === 0) {
        return { fixed: false, reason: 'No violations found' };
      }
      
      // Add import if not present
      if (!content.includes('FileCreationAPI') && !content.includes('fileAPI')) {
        const importPath = this.getImportPath(filePath);
        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        
        const importStatement = isTypeScript ?
          `import { getFileAPI, FileType } from '${importPath}';\n\nconst fileAPI = getFileAPI();\n` :
          `const { getFileAPI, FileType } = require('${importPath}');\n\nconst fileAPI = getFileAPI();\n`;
        
        // Smart insertion after existing imports
        const lines = content.split('\n');
        let insertIndex = 0;
        let lastImportIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('import ') || lines[i].includes('require(')) {
            lastImportIndex = i;
          }
        }
        
        insertIndex = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
        
        // Add blank line if needed
        if (insertIndex > 0 && lines[insertIndex] && lines[insertIndex].trim() !== '') {
          lines.splice(insertIndex, 0, '');
          insertIndex++;
        }
        
        lines.splice(insertIndex, 0, importStatement);
        content = lines.join('\n');
      }
      
      // Make functions async if they use await
      if (content.includes('await fileAPI')) {
        content = this.makeAsync(content);
      }
      
      // Write the fixed file
      await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
      
      return { fixed: true, changes: changeCount };
      
    } catch (error) {
      return { fixed: false, reason: error.message };
    }
  }
  
  checkForViolations(content) {
    const patterns = [
      /fs\.writeFileSync/,
      /fs\.writeFile/,
      /fs\.promises\.writeFile/,
      /fs\.mkdirSync/,
      /fs\.mkdir/,
      /fs\.promises\.mkdir/,
      /fs\.appendFileSync/,
      /fs\.appendFile/,
      /fs\.createWriteStream/
    ];
    
    return patterns.some(pattern => pattern.test(content));
  }
  
  getImportPath(filePath) {
    const fromDir = path.dirname(filePath);
    const toDir = path.join(this.basePath, 'layer/themes/infra_external-log-lib/pipe');
    let relativePath = path.relative(fromDir, toDir);
    
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath.replace(/\\/g, '/');
  }
  
  makeAsync(content) {
    // Make function declarations async
    content = content.replace(
      /^(\s*)(export\s+)?(function\s+\w+\s*\([^)]*\))/gm,
      (match, space, exp, func) => {
        if (match.includes('async')) return match;
        return `${space}${exp || ''}async ${func}`;
      }
    );
    
    // Make arrow functions async
    content = content.replace(
      /^(\s*)(export\s+)?(const\s+\w+\s*=\s*)\(([^)]*)\)\s*=>/gm,
      (match, space, exp, decl, params) => {
        if (match.includes('async')) return match;
        return `${space}${exp || ''}${decl}async (${params}) =>`;
      }
    );
    
    // Make class methods async
    content = content.replace(
      /^(\s*)(async\s+)?((?:public|private|protected)\s+)?(\w+)\s*\(/gm,
      (match, space, asyncKeyword, visibility, methodName) => {
        // Skip if already async or if it's a constructor
        if (asyncKeyword || methodName === 'constructor') return match;
        
        // Check if this method contains await fileAPI
        const methodContent = content.substring(content.indexOf(match));
        const nextMethod = methodContent.search(/^\s*(async\s+)?((?:public|private|protected)\s+)?\w+\s*\(/m);
        const methodBody = nextMethod > 0 ? methodContent.substring(0, nextMethod) : methodContent;
        
        if (methodBody.includes('await fileAPI')) {
          return `${space}async ${visibility || ''}${methodName}(`;
        }
        
        return match;
      }
    );
    
    return content;
  }

  async fixComponent(component) {
    console.log(`\n📦 Fixing ${component.name} (${component.violations} violations)`);
    console.log('=' .repeat(50));
    
    const componentPath = path.join(this.basePath, component.path);
    
    if (!fs.existsSync(componentPath)) {
      console.log(`⚠️  Path not found: ${componentPath}`);
      return;
    }
    
    // Find all source files
    const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
      cwd: componentPath,
      ignore: [
        '**/node_modules/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test/**',
        '**/tests/**'
      ]
    });
    
    console.log(`Found ${files.length} files to check`);
    
    let componentChanges = 0;
    let filesFixed = 0;
    
    for (const file of files) {
      const filePath = path.join(componentPath, file);
      const result = await this.fixFile(filePath);
      
      if (result.fixed) {
        filesFixed++;
        componentChanges += result.changes;
        console.log(`  ✅ ${file}: ${result.changes} changes`);
        this.stats.fixed.push({ file: filePath, changes: result.changes });
      } else if (result.reason && result.reason !== 'No violations found' && result.reason !== 'Already migrated') {
        console.log(`  ❌ ${file}: ${result.reason}`);
        this.stats.failed.push({ file: filePath, reason: result.reason });
      }
    }
    
    this.stats.totalChanges += componentChanges;
    
    if (filesFixed > 0) {
      console.log(`\n✅ Fixed ${filesFixed} files with ${componentChanges} changes`);
    } else {
      console.log(`\n✅ No violations found or already migrated`);
    }
  }

  async fixAllComponents() {
    console.log('🚀 Fixing Remaining High-Priority Violations\n');
    console.log('Components to fix:', this.targetComponents.map(c => c.name).join(', '));
    console.log('=' .repeat(70) + '\n');
    
    for (const component of this.targetComponents) {
      await this.fixComponent(component);
    }
    
    this.generateSummary();
  }

  generateSummary() {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 FIX SUMMARY\n');
    
    console.log(`Total files fixed: ${this.stats.fixed.length}`);
    console.log(`Total changes made: ${this.stats.totalChanges}`);
    
    if (this.stats.failed.length > 0) {
      console.log(`\n⚠️  Failed fixes: ${this.stats.failed.length}`);
      for (const { file, reason } of this.stats.failed.slice(0, 5)) {
        console.log(`  - ${path.basename(file)}: ${reason}`);
      }
    }
    
    console.log('\n✅ Fix complete!');
    console.log('\n💡 Next steps:');
    console.log('  1. Run: npm run file-api:scan:prod to verify');
    console.log('  2. Test the modified files');
    console.log('  3. Install git hooks: npm run file-api:hooks:install');
  }
}

// Main execution
async function main() {
  const fixer = new RemainingViolationsFixer();
  await fixer.fixAllComponents();
}

if (require.main === module) {
  main().catch(console.error);
}