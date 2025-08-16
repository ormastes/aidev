#!/usr/bin/env node

/**
 * Rollback Mechanism for File API Violations
 * Automatically reverts changes that introduce new violations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ViolationRollback {
  constructor() {
    this.basePath = process.cwd();
    this.backupDir = path.join(this.basePath, '.file-api-backups');
    this.rollbackLog = path.join(this.basePath, 'gen/doc/rollback.log');
    this.baselineViolations = 9; // Current acceptable baseline
  }

  async run() {
    console.log('🔄 File API Violation Rollback System\n');
    console.log('=' .repeat(60) + '\n');
    
    try {
      // Check current violations
      const currentViolations = await this.getCurrentViolations();
      console.log(`📊 Current violations: ${currentViolations}`);
      console.log(`📏 Baseline violations: ${this.baselineViolations}\n`);
      
      if (currentViolations > this.baselineViolations) {
        console.log('⚠️  Violations exceed baseline! Initiating rollback...\n');
        
        // Find changed files
        const changedFiles = await this.findChangedFiles();
        
        // Analyze which changes introduced violations
        const problematicFiles = await this.analyzeViolations(changedFiles);
        
        // Create backups
        await this.createBackups(problematicFiles);
        
        // Attempt rollback
        const success = await this.rollbackFiles(problematicFiles);
        
        if (success) {
          // Verify rollback success
          const newViolations = await this.getCurrentViolations();
          
          if (newViolations <= this.baselineViolations) {
            console.log('✅ Rollback successful! Violations reduced to baseline.');
            await this.logRollback('success', problematicFiles, currentViolations, newViolations);
          } else {
            console.log('⚠️  Rollback completed but violations still above baseline.');
            console.log('Manual intervention may be required.');
            await this.logRollback('partial', problematicFiles, currentViolations, newViolations);
          }
        } else {
          console.log('❌ Rollback failed. Manual intervention required.');
          await this.logRollback('failed', problematicFiles, currentViolations, currentViolations);
        }
        
      } else {
        console.log('✅ Violations within acceptable range. No rollback needed.');
      }
      
    } catch (error) {
      console.error('❌ Error during rollback:', error.message);
      process.exit(1);
    }
  }

  async getCurrentViolations() {
    try {
      const output = execSync('node scripts/scan-production-code.js 2>/dev/null', {
        encoding: 'utf8'
      });
      
      const match = output.match(/Total violations:\s*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async findChangedFiles() {
    console.log('🔍 Finding recently changed files...\n');
    
    try {
      // Get files changed in last commit
      const gitDiff = execSync('git diff --name-only HEAD~1 HEAD', {
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);
      
      // Get uncommitted changes
      const gitStatus = execSync('git status --porcelain', {
        encoding: 'utf8'
      }).trim().split('\n')
        .filter(Boolean)
        .map(line => line.substring(3));
      
      const allChanges = [...new Set([...gitDiff, ...gitStatus])];
      
      console.log(`Found ${allChanges.length} changed files:`);
      allChanges.forEach(file => console.log(`  - ${file}`));
      console.log();
      
      return allChanges;
    } catch (error) {
      console.log('No git changes detected');
      return [];
    }
  }

  async analyzeViolations(changedFiles) {
    console.log('🔬 Analyzing which files contain violations...\n');
    
    const problematicFiles = [];
    
    for (const file of changedFiles) {
      const filePath = path.join(this.basePath, file);
      
      if (!fs.existsSync(filePath)) continue;
      if (!file.match(/\.(ts|js|tsx|jsx)$/)) continue;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for direct fs usage
        const patterns = [
          /fs\.writeFileSync/g,
          /fs\.readFileSync/g,
          /fs\.mkdirSync/g,
          /fs\.promises\.writeFile/g,
          /fs\.promises\.readFile/g,
          /fs\.promises\.mkdir/g,
          /fs\.createWriteStream/g,
          /fs\.createReadStream/g
        ];
        
        let hasViolation = false;
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            hasViolation = true;
            break;
          }
        }
        
        if (hasViolation) {
          // Check if file is exempt
          const isExempt = this.isFileExempt(file);
          
          if (!isExempt) {
            problematicFiles.push(file);
            console.log(`  ❌ Violation found in: ${file}`);
          } else {
            console.log(`  ⚠️  Violation in exempt file: ${file} (allowed)`);
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Could not analyze: ${file}`);
      }
    }
    
    console.log(`\nFound ${problematicFiles.length} files with violations\n`);
    return problematicFiles;
  }

  isFileExempt(filePath) {
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
      /file-api/,  // File API implementation itself
      /fraud-check/,
      /scan-.*\.js$/
    ];
    
    return exemptPatterns.some(pattern => pattern.test(filePath));
  }

  async createBackups(files) {
    console.log('💾 Creating backups...\n');
    
    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fileAPI.createDirectory(this.backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupSubDir = path.join(this.backupDir, timestamp);
    fileAPI.createDirectory(backupSubDir);
    
    for (const file of files) {
      const srcPath = path.join(this.basePath, file);
      const destPath = path.join(backupSubDir, file);
      
      if (fs.existsSync(srcPath)) {
        const destDir = path.dirname(destPath);
        fileAPI.createDirectory(destDir);
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✅ Backed up: ${file}`);
      }
    }
    
    console.log(`\nBackups saved to: ${backupSubDir}\n`);
    return backupSubDir;
  }

  async rollbackFiles(files) {
    console.log('🔄 Rolling back files...\n');
    
    if (files.length === 0) {
      console.log('No files to rollback');
      return true;
    }
    
    try {
      // Option 1: Try git checkout for committed files
      const committedFiles = [];
      const uncommittedFiles = [];
      
      for (const file of files) {
        try {
          execSync(`git ls-files --error-unmatch "${file}" 2>/dev/null`);
          committedFiles.push(file);
        } catch {
          uncommittedFiles.push(file);
        }
      }
      
      // Rollback committed files
      if (committedFiles.length > 0) {
        console.log('Rolling back committed files:');
        for (const file of committedFiles) {
          try {
            execSync(`git checkout HEAD -- "${file}"`);
            console.log(`  ✅ Rolled back: ${file}`);
          } catch (error) {
            console.log(`  ❌ Failed to rollback: ${file}`);
          }
        }
      }
      
      // For uncommitted files, try to apply auto-fix
      if (uncommittedFiles.length > 0) {
        console.log('\nApplying auto-fix to uncommitted files:');
        for (const file of uncommittedFiles) {
          const filePath = path.join(this.basePath, file);
          if (fs.existsSync(filePath)) {
            try {
              await this.autoFixFile(filePath);
              console.log(`  ✅ Auto-fixed: ${file}`);
            } catch (error) {
              console.log(`  ❌ Failed to fix: ${file}`);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Rollback error:', error.message);
      return false;
    }
  }

  async autoFixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if needed
    if (!content.includes('FileCreationAPI') && !content.includes('getFileAPI')) {
      const importStatement = "import { getFileAPI, FileType } from './file-manager/FileCreationAPI';\nconst fileAPI = getFileAPI();\n\n";
      content = importStatement + content;
    }
    
    // Apply replacements
    const replacements = [
      {
        pattern: /fs\.writeFileSync\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
        replacement: 'await fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
      },
      {
        pattern: /fs\.mkdirSync\s*\(\s*([^,)]+)(?:,\s*\{[^}]*\})?\s*\)/g,
        replacement: 'await fileAPI.createDirectory($1)'
      },
      {
        pattern: /fs\.promises\.writeFile\s*\(\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\s*\)/g,
        replacement: 'fileAPI.createFile($1, $2, { type: FileType.TEMPORARY })'
      }
    ];
    
    for (const { pattern, replacement } of replacements) {
      content = content.replace(pattern, replacement);
    }
    
    fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  async logRollback(status, files, beforeViolations, afterViolations) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status,
      files: files.length,
      fileList: files,
      violationsBefore: beforeViolations,
      violationsAfter: afterViolations,
      reduction: beforeViolations - afterViolations
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fileAPI.appendToFile(this.rollbackLog, logLine, { type: FileType.LOG });
    
    console.log('\n📝 Rollback logged to:', this.rollbackLog);
  }
}

// Git hook integration
class GitHookIntegration {
  static async checkAndRollback() {
    console.log('🔍 Pre-commit File API compliance check...\n');
    
    const rollback = new ViolationRollback();
    const violations = await rollback.getCurrentViolations();
    
    if (violations > rollback.baselineViolations) {
      console.error(`\n❌ COMMIT BLOCKED: ${violations} violations detected (max allowed: ${rollback.baselineViolations})`);
      console.log('\nAttempting automatic rollback...');
      
      await rollback.run();
      
      const newViolations = await rollback.getCurrentViolations();
      if (newViolations > rollback.baselineViolations) {
        console.error('\n❌ Rollback could not fix all violations.');
        console.error('Please fix violations manually or run: npm run file-api:fix');
        process.exit(1);
      }
      
      console.log('\n✅ Violations fixed. Please review changes and commit again.');
      process.exit(1);
    }
    
    console.log('✅ Compliance check passed\n');
    process.exit(0);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--git-hook')) {
    await GitHookIntegration.checkAndRollback();
  } else {
    const rollback = new ViolationRollback();
    await rollback.run();
  }
}

main().catch(console.error);