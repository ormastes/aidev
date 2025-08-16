#!/usr/bin/env node

/**
 * Final Compliance Cleanup Script
 * Addresses remaining violations to achieve maximum compliance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FinalComplianceCleanup {
  constructor() {
    this.basePath = process.cwd();
    this.fixCount = 0;
    this.skipCount = 0;
    this.errorCount = 0;
  }

  async run() {
    console.log('🧹 Final File API Compliance Cleanup\n');
    console.log('=' .repeat(60) + '\n');
    
    // Get current violations
    const violations = await this.scanViolations();
    console.log(`Found ${violations.length} files with violations to review\n`);
    
    // Process each violation
    for (const file of violations) {
      await this.processFile(file);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log(`  ✅ Fixed: ${this.fixCount} files`);
    console.log(`  ⏭️  Skipped: ${this.skipCount} files (exempt or special)`);
    console.log(`  ❌ Errors: ${this.errorCount} files`);
    
    // Final compliance check
    console.log('\n🔍 Running final compliance check...\n');
    execSync('npm run file-api:scan:prod', { stdio: 'inherit' });
  }

  async scanViolations() {
    try {
      const output = execSync('npm run file-api:scan:prod 2>&1', { encoding: 'utf8' });
      
      // Extract file paths from output
      const files = [];
      const lines = output.split('\n');
      
      for (const line of lines) {
        // Look for file paths in the output
        if (line.includes('📄')) {
          const match = line.match(/📄\s+(.+)$/);
          if (match) {
            files.push(match[1].trim());
          }
        }
      }
      
      return [...new Set(files)]; // Remove duplicates
    } catch (error) {
      // Even if command fails, try to extract files from output
      const output = error.stdout || '';
      const files = [];
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes('📄')) {
          const match = line.match(/📄\s+(.+)$/);
          if (match) {
            files.push(match[1].trim());
          }
        }
      }
      
      return [...new Set(files)];
    }
  }

  async processFile(fileName) {
    console.log(`\n📝 Processing: ${fileName}`);
    
    // Determine full path
    let filePath = path.join(this.basePath, fileName);
    
    // Handle different path formats
    if (!fs.existsSync(filePath)) {
      // Try in scripts directory
      filePath = path.join(this.basePath, 'scripts', fileName);
    }
    if (!fs.existsSync(filePath)) {
      // Try in root
      filePath = path.join(this.basePath, fileName);
    }
    if (!fs.existsSync(filePath)) {
      // Try in layer/themes
      filePath = path.join(this.basePath, 'layer/themes', fileName);
    }
    
    if (!fs.existsSync(filePath)) {
      console.log('  ⚠️  File not found, skipping');
      this.skipCount++;
      return;
    }
    
    // Check if file is exempt
    if (this.isExempt(filePath)) {
      console.log('  ⏭️  File is exempt, skipping');
      this.skipCount++;
      return;
    }
    
    // Special handling for specific files
    if (fileName.includes('compliance') || 
        fileName.includes('file-api') || 
        fileName.includes('scan-') ||
        fileName.includes('fraud-check')) {
      console.log('  ⏭️  File is part of File API system, skipping');
      this.skipCount++;
      return;
    }
    
    try {
      // Read file content
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Determine file type
      const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
      const isJavaScript = filePath.endsWith('.js') || filePath.endsWith('.jsx');
      
      if (!isTypeScript && !isJavaScript) {
        console.log('  ⏭️  Not a JS/TS file, skipping');
        this.skipCount++;
        return;
      }
      
      // Add import if needed
      if (!content.includes('FileCreationAPI') && !content.includes('getFileAPI')) {
        const importPath = this.getImportPath(filePath);
        const importStatement = isTypeScript ?
          `import { getFileAPI, FileType } from '${importPath}';\nconst fileAPI = getFileAPI();\n\n` :
          `const { getFileAPI, FileType } = require('${importPath}');\nconst fileAPI = getFileAPI();\n\n`;
        
        // Add import after any existing imports
        const importMatch = content.match(/(import .+\n|const .+ = require.+\n)+/);
        if (importMatch) {
          const lastImportIndex = importMatch.index + importMatch[0].length;
          content = content.slice(0, lastImportIndex) + importStatement + content.slice(lastImportIndex);
        } else {
          content = importStatement + content;
        }
      }
      
      // Apply replacements
      const replacements = [
        // fs.writeFileSync
        {
          pattern: /fs\.writeFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          replacement: isTypeScript ? 
            'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })' :
            'fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        },
        // fs.mkdirSync
        {
          pattern: /fs\.mkdirSync\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
          replacement: isTypeScript ?
            'await fileAPI.createDirectory($1)' :
            'fileAPI.createDirectory($1)'
        },
        // fs.appendFileSync
        {
          pattern: /fs\.appendFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          replacement: isTypeScript ?
            'await fileAPI.appendToFile($1, $2, { type: FileType.LOG })' :
            'fileAPI.appendToFile($1, $2, { type: FileType.LOG })'
        },
        // fs.writeFile (callback style)
        {
          pattern: /fs\.writeFile\s*\(\s*([^,]+),\s*([^,]+),\s*(?:[^,]+,\s*)?\s*\([^)]*\)\s*=>\s*\{/g,
          replacement: 'fileAPI.createFile($1, $2, { type: FileType.TEMPORARY }).then(() => {'
        },
        // fs.promises.writeFile
        {
          pattern: /fs\.promises\.writeFile\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
          replacement: 'fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
        }
      ];
      
      let changesMade = false;
      for (const { pattern, replacement } of replacements) {
        const before = content;
        content = content.replace(pattern, replacement);
        if (before !== content) {
          changesMade = true;
        }
      }
      
      // Fix any double await issues
      content = content.replace(/await\s+await/g, 'await');
      
      // Save if changes were made
      if (changesMade && content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('  ✅ Fixed violations');
        this.fixCount++;
      } else if (!changesMade) {
        console.log('  ℹ️  No direct fs usage found or already fixed');
        this.skipCount++;
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      this.errorCount++;
    }
  }

  getImportPath(filePath) {
    // Calculate relative path to FileCreationAPI
    const apiPath = path.join(this.basePath, 'layer/themes/infra_external-log-lib/src/file-manager/FileCreationAPI');
    const relativePath = path.relative(path.dirname(filePath), apiPath);
    
    // Ensure path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      return './' + relativePath;
    }
    return relativePath;
  }

  isExempt(filePath) {
    const exemptPatterns = [
      /mate_dealer/,
      /sample_/,
      /demo_/,
      /example_/,
      /\/demo\//,
      /\/demos\//,
      /\/examples\//,
      /\/samples\//,
      /\/fixtures\//,
      /\/test\//,
      /\.test\./,
      /\.spec\./,
      /node_modules/
    ];
    
    return exemptPatterns.some(pattern => pattern.test(filePath));
  }
}

// Main execution
async function main() {
  const cleanup = new FinalComplianceCleanup();
  await cleanup.run();
}

main().catch(console.error);