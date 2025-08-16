#!/usr/bin/env node

/**
 * Fix the final remaining violations in non-exempt themes
 * This targets the last 31 violations to achieve 100% compliance
 */

const fs = require('fs');
const path = require('path');

class FinalViolationFixer {
  constructor() {
    this.basePath = process.cwd();
    this.fixCount = 0;
    
    // Target files with remaining violations (from latest scan)
    this.targetFiles = [
      'scripts/setup-compliance-alerts.js',
      'scripts/run-fraud-check.js',
      'scripts/run-compliance-dashboard.js',
      'scripts/rollback-violations.js',
      'scripts/final-compliance-cleanup.js',
      'run-project-fraud-check.ts',
      'security/audit-logger.ts',
      'fraud-checker/demo.ts',
      'layer/themes/shared/children/utils/file-generation.ts',
      'layer/themes/research/user-stories/circular-dependency-detection/src/cli/visualization-generator.ts',
      'layer/themes/portal_gui-selector/user-stories/023-gui-selector-server/src/services/ExternalLogService.ts',
      'layer/themes/init_setup-folder/src/services/cpp-report-setup.ts',
      'layer/themes/infra_test-as-manual/user-stories/002-enhanced-manual-generator/examples/demo2.ts',
      'layer/themes/infra_filesystem-mcp/user-stories/001-strict-mcp-server/audit-logger.ts',
      'monitoring/system-monitor.ts'
    ];
  }

  async fixFile(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      let changes = 0;
      
      // Check if it already has FileCreationAPI
      const hasFileAPI = content.includes('FileCreationAPI') || content.includes('fileAPI');
      
      // Replacements with proper type inference
      const replacements = [
        // fs.writeFile for scripts (use SCRIPT type)
        {
          pattern: /fs\.writeFile\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g,
          replacement: (match, pathArg, dataArg) => {
            if (filePath.includes('script') || filePath.includes('scripts/')) {
              return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.SCRIPT })`;
            } else if (filePath.includes('report')) {
              return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.REPORT })`;
            } else if (filePath.includes('cpp-')) {
              return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.CONFIG })`;
            } else if (filePath.includes('coverage')) {
              return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.COVERAGE })`;
            } else {
              return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.DATA })`;
            }
          }
        },
        // fs.writeFileSync
        {
          pattern: /fs\.writeFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          replacement: (match, pathArg, dataArg) => {
            const fileType = this.inferFileType(filePath, pathArg);
            return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.${fileType} })`;
          }
        },
        // fs.promises.writeFile
        {
          pattern: /fs\.promises\.writeFile\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          replacement: (match, pathArg, dataArg) => {
            const fileType = this.inferFileType(filePath, pathArg);
            return `await fileAPI.createFile(${pathArg}, ${dataArg}, { type: FileType.${fileType} })`;
          }
        },
        // fs.mkdirSync
        {
          pattern: /fs\.mkdirSync\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
          replacement: 'await fileAPI.createDirectory($1)'
        },
        // fs.mkdir with callback
        {
          pattern: /fs\.mkdir\s*\(\s*([^,]+),\s*(?:\{[^}]*\},\s*)?([^)]+)\s*\)/g,
          replacement: 'await fileAPI.createDirectory($1)'
        },
        // fs.appendFileSync
        {
          pattern: /fs\.appendFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          replacement: (match, pathArg, dataArg) => {
            if (filePath.includes('log')) {
              return `await fileAPI.appendFile(${pathArg}, ${dataArg}, { type: FileType.LOG })`;
            }
            return `await fileAPI.appendFile(${pathArg}, ${dataArg}, { type: FileType.DATA })`;
          }
        },
        // fs.createWriteStream
        {
          pattern: /fs\.createWriteStream\s*\(\s*([^)]+)\s*\)/g,
          replacement: 'fileAPI.createWriteStream($1, { type: FileType.LOG })'
        }
      ];
      
      // Apply replacements
      for (const { pattern, replacement } of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          if (typeof replacement === 'function') {
            content = content.replace(pattern, replacement);
          } else {
            content = content.replace(pattern, replacement);
          }
          changes += matches.length;
        }
      }
      
      // Add import if needed and changes were made
      if (changes > 0 && !hasFileAPI) {
        const importPath = this.getImportPath(fullPath);
        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        
        const importStatement = isTypeScript ?
          `import { getFileAPI, FileType } from '${importPath}';\n\nconst fileAPI = getFileAPI();\n` :
          `const { getFileAPI, FileType } = require('${importPath}');\n\nconst fileAPI = getFileAPI();\n`;
        
        // Add import after existing imports
        const lines = content.split('\n');
        let insertIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('import ') || lines[i].includes('require(')) {
            insertIndex = i + 1;
          } else if (insertIndex > 0 && !lines[i].trim().startsWith('import') && !lines[i].includes('require(')) {
            break;
          }
        }
        
        if (insertIndex === 0 && lines[0].startsWith('#!/')) {
          insertIndex = 1;
        }
        
        lines.splice(insertIndex, 0, '', importStatement);
        content = lines.join('\n');
      }
      
      // Make functions async if needed
      if (changes > 0 && content.includes('await fileAPI')) {
        content = this.makeAsync(content);
      }
      
      // Write the fixed file
      if (changes > 0) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Fixed ${filePath}: ${changes} changes`);
        this.fixCount += changes;
        return true;
      } else {
        console.log(`✅ ${filePath}: Already compliant or no violations found`);
        return false;
      }
      
    } catch (error) {
      console.log(`❌ Error fixing ${filePath}: ${error.message}`);
      return false;
    }
  }
  
  inferFileType(filePath, contentPath) {
    // Infer type based on file path and content
    if (contentPath && contentPath.includes('.json')) return 'CONFIG';
    if (contentPath && contentPath.includes('.log')) return 'LOG';
    if (contentPath && contentPath.includes('report')) return 'REPORT';
    if (contentPath && contentPath.includes('coverage')) return 'COVERAGE';
    
    if (filePath.includes('script')) return 'SCRIPT';
    if (filePath.includes('report')) return 'REPORT';
    if (filePath.includes('config')) return 'CONFIG';
    if (filePath.includes('coverage')) return 'COVERAGE';
    if (filePath.includes('test')) return 'TEST';
    if (filePath.includes('doc')) return 'DOCUMENT';
    if (filePath.includes('log')) return 'LOG';
    
    return 'DATA'; // Default fallback
  }
  
  getImportPath(fromPath) {
    const fromDir = path.dirname(fromPath);
    const toDir = path.join(this.basePath, 'layer/themes/infra_external-log-lib/pipe');
    let relativePath = path.relative(fromDir, toDir);
    
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath.replace(/\\/g, '/');
  }
  
  makeAsync(content) {
    // Make functions async
    content = content.replace(
      /^(\s*)(function\s+\w+\s*\([^)]*\))/gm,
      (match, space, func) => {
        if (match.includes('async')) return match;
        return `${space}async ${func}`;
      }
    );
    
    // Make arrow functions async
    content = content.replace(
      /^(\s*)(const\s+\w+\s*=\s*)\(([^)]*)\)\s*=>/gm,
      (match, space, decl, params) => {
        if (match.includes('async')) return match;
        return `${space}${decl}async (${params}) =>`;
      }
    );
    
    return content;
  }
  
  async fixAll() {
    console.log('🚀 Fixing Final Violations for 100% Compliance\n');
    console.log('=' .repeat(60) + '\n');
    
    let fixedFiles = 0;
    
    for (const file of this.targetFiles) {
      if (await this.fixFile(file)) {
        fixedFiles++;
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL FIX SUMMARY\n');
    console.log(`Files processed: ${this.targetFiles.length}`);
    console.log(`Files fixed: ${fixedFiles}`);
    console.log(`Total changes: ${this.fixCount}`);
    
    console.log('\n✅ Final violations fixed!');
    console.log('Run: npm run file-api:scan:prod to verify 100% compliance');
  }
}

// Main execution
async function main() {
  const fixer = new FinalViolationFixer();
  await fixer.fixAll();
}

main().catch(console.error);