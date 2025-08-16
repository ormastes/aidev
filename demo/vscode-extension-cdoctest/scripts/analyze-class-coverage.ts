#!/usr/bin/env ts-node

import { fs } from '../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../layer/themes/infra_external-log-lib/dist';

/**
 * Analyze class coverage by examining source files and test files
 * This script verifies that all classes in src/ have corresponding E2E test coverage
 */

interface ClassInfo {
  className: string;
  filePath: string;
  relativePath: string;
}

interface TestInfo {
  testFile: string;
  testDescriptions: string[];
  targetClasses: string[];
}

// Extract class names from TypeScript files
function extractClassesFromFile(filePath: string): ClassInfo[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const classes: ClassInfo[] = [];
    
    // Match class declarations (exclude comments)
    const classRegex = /^(?!\s*\/\/).*?(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      classes.push({
        className: match[1],
        filePath: filePath,
        relativePath: path.relative(process.cwd(), filePath)
      });
    }
    
    // Also match interface declarations as they represent important types (exclude comments)
    const interfaceRegex = /^(?!\s*\/\/).*?(?:export\s+)?interface\s+(\w+)/gm;
    while ((match = interfaceRegex.exec(content)) !== null) {
      classes.push({
        className: match[1],
        filePath: filePath,
        relativePath: path.relative(process.cwd(), filePath)
      });
    }
    
    return classes;
  } catch (error: any) {
    console.warn(`Warning: Could not read file ${filePath}:`, error.message);
    return [];
  }
}

// Get all TypeScript files in src directory
function getAllSourceFiles(): string[] {
  const sourceFiles: string[] = [];
  
  function scanDirectory(dir: string) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        sourceFiles.push(fullPath);
      }
    }
  }
  
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    scanDirectory(srcDir);
  }
  
  return sourceFiles;
}

// Extract test information from E2E test files
function analyzeTestFile(filePath: string): TestInfo {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const testInfo: TestInfo = {
      testFile: path.relative(process.cwd(), filePath),
      testDescriptions: [],
      targetClasses: []
    };
    
    // Extract test descriptions
    const testRegex = /test\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      testInfo.testDescriptions.push(match[1]);
    }
    
    // Extract target classes from comments at top of file
    const targetCommentRegex = /\*\s+Targets.*coverage.*:\s*\n((?:\s*\*\s+-[^\n]+\n?)*)/;
    const targetMatch = targetCommentRegex.exec(content);
    if (targetMatch) {
      const targetLines = targetMatch[1];
      const classRegex = /src\/([^(]+)/g;
      let classMatch;
      while ((classMatch = classRegex.exec(targetLines)) !== null) {
        testInfo.targetClasses.push(classMatch[1].trim());
      }
    }
    
    return testInfo;
  } catch (error: any) {
    console.warn(`Warning: Could not analyze test file ${filePath}:`, error.message);
    return {
      testFile: path.relative(process.cwd(), filePath),
      testDescriptions: [],
      targetClasses: []
    };
  }
}

// Get all E2E test files
function getAllTestFiles(): string[] {
  const testFiles: string[] = [];
  const testDir = path.join(process.cwd(), 'test', 'e2e');
  
  if (fs.existsSync(testDir)) {
    const items = fs.readdirSync(testDir);
    for (const item of items) {
      if (item.endsWith('.test.ts')) {
        testFiles.push(path.join(testDir, item));
      }
    }
  }
  
  return testFiles;
}

async function main() {
  console.log('🔍 Analyzing Class Coverage in E2E Tests...\n');
  
  // Get all source classes
  const sourceFiles = getAllSourceFiles();
  const allClasses: ClassInfo[] = [];
  
  for (const file of sourceFiles) {
    const classes = extractClassesFromFile(file);
    allClasses.push(...classes);
  }
  
  console.log(`📁 Found ${allClasses.length} classes/interfaces in ${sourceFiles.length} source files\n`);
  
  // Get all test files
  const testFiles = getAllTestFiles();
  const testInfo: TestInfo[] = [];
  
  for (const file of testFiles) {
    const info = analyzeTestFile(file);
    testInfo.push(info);
  }
  
  console.log(`🧪 Found ${testInfo.length} E2E test files\n`);
  
  console.log('📋 ALL CLASSES FOUND:');
  allClasses.forEach((cls, index) => {
    console.log(`  ${index + 1}. ${cls.className} (${cls.relativePath})`);
  });
  console.log();
  
  // Analyze coverage
  console.log('📊 Class Coverage Analysis:\n');
  
  const coveredClasses = new Set<string>();
  const uncoveredClasses = new Set<string>();
  
  // Check each class for coverage
  for (const classInfo of allClasses) {
    let isCovered = false;
    
    // Check if any test file targets this class's file
    for (const test of testInfo) {
      const classFilePath = classInfo.relativePath.replace(/\\/g, '/');
      
      // Check if test explicitly targets this file
      if (test.targetClasses.some(target => classFilePath.includes(target))) {
        isCovered = true;
        break;
      }
      
      // Check if test descriptions mention this class
      if (test.testDescriptions.some(desc => 
        desc.toLowerCase().includes(classInfo.className.toLowerCase()) ||
        desc.toLowerCase().includes(classInfo.filePath.split('/').pop()?.replace('.ts', '') || '')
      )) {
        isCovered = true;
        break;
      }
    }
    
    if (isCovered) {
      coveredClasses.add(`${classInfo.className} (${classInfo.relativePath})`);
    } else {
      uncoveredClasses.add(`${classInfo.className} (${classInfo.relativePath})`);
    }
  }
  
  // Report results
  console.log(`✅ COVERED CLASSES (${coveredClasses.size}):`);
  Array.from(coveredClasses).sort().forEach(cls => console.log(`  ✓ ${cls}`));
  
  console.log(`\n❌ UNCOVERED CLASSES (${uncoveredClasses.size}):`);
  Array.from(uncoveredClasses).sort().forEach(cls => console.log(`  ✗ ${cls}`));
  
  if (uncoveredClasses.size > 0) {
    console.log(`\n🔍 DETAILED ANALYSIS OF UNCOVERED CLASSES:`);
    for (const classInfo of allClasses) {
      const classIdentifier = `${classInfo.className} (${classInfo.relativePath})`;
      if (uncoveredClasses.has(classIdentifier)) {
        console.log(`\n  📋 Class: ${classInfo.className}`);
        console.log(`     File: ${classInfo.relativePath}`);
        console.log(`     Tests checked against:`);
        
        for (const test of testInfo) {
          console.log(`       - ${test.testFile}:`);
          console.log(`         Targets: ${test.targetClasses.join(', ')}`);
          console.log(`         Tests: ${test.testDescriptions.slice(0, 2).join(', ')}${test.testDescriptions.length > 2 ? '...' : ''}`);
        }
      }
    }
  }
  
  // Calculate coverage percentage
  const totalClasses = allClasses.length;
  const coveredCount = coveredClasses.size;
  const uncoveredCount = uncoveredClasses.size;
  const coveragePercentage = totalClasses > 0 ? (coveredCount / totalClasses * 100).toFixed(1) : '0.0';
  
  console.log(`\n🔢 CALCULATION CHECK:`);
  console.log(`  All classes found: ${totalClasses}`);
  console.log(`  Covered set size: ${coveredCount}`);
  console.log(`  Uncovered set size: ${uncoveredCount}`);
  console.log(`  Total check: ${coveredCount + uncoveredCount} (should equal ${totalClasses})`);
  
  console.log(`\n📈 COVERAGE SUMMARY:`);
  console.log(`  Total Classes: ${totalClasses}`);
  console.log(`  Covered Classes: ${coveredCount}`);
  console.log(`  Uncovered Classes: ${uncoveredClasses.size}`);
  console.log(`  Coverage Percentage: ${coveragePercentage}%`);
  
  // List comprehensive test files created
  console.log(`\n🎯 COMPREHENSIVE E2E TEST FILES:`);
  const comprehensiveTests = testFiles.filter(f => f.includes('complete'));
  comprehensiveTests.forEach(test => {
    const testInfo = analyzeTestFile(test);
    console.log(`  📝 ${testInfo.testFile} (${testInfo.testDescriptions.length} tests)`);
    testInfo.targetClasses.forEach(target => console.log(`    → Targets: src/${target}`));
  });
  
  if (coveragePercentage === '100.0') {
    console.log('\n🎉 CONGRATULATIONS! 100% class coverage achieved!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  Coverage goal not yet achieved. Target: 100%, Current: ${coveragePercentage}%`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}