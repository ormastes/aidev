#!/usr/bin/env node

import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

interface ModuleCoverage {
  name: string;
  path: string;
  hasTests: boolean;
  sourceFiles: number;
  testFiles: number;
  coverage?: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  };
}

const ROOT_DIR = '/home/ormastes/dev/aidev';
const THEMES_DIR = path.join(ROOT_DIR, 'layer/themes');

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'coverage', 'build', '.git'].includes(entry.name)) {
          files.push(...findSourceFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts') && 
                 !entry.name.endsWith('.test.ts') && 
                 !entry.name.endsWith('.spec.ts') &&
                 !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return files;
}

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'coverage', 'build', '.git'].includes(entry.name)) {
          files.push(...findTestFiles(fullPath));
        }
      } else if (entry.isFile() && 
                 (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return files;
}

function readCoverageSummary(coverageFile: string): any {
  try {
    const content = fs.readFileSync(coverageFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function analyzeModule(modulePath: string): ModuleCoverage {
  const moduleName = path.basename(modulePath);
  const sourceFiles = findSourceFiles(path.join(modulePath, 'src'));
  const testFiles = findTestFiles(modulePath);
  
  // Look for coverage report
  const coverageSummaryPath = path.join(modulePath, 'coverage', 'coverage-summary.json');
  const coverageData = readCoverageSummary(coverageSummaryPath);
  
  let coverage;
  if (coverageData && coverageData.total) {
    coverage = {
      lines: coverageData.total.lines.pct || 0,
      statements: coverageData.total.statements.pct || 0,
      functions: coverageData.total.functions.pct || 0,
      branches: coverageData.total.branches.pct || 0
    };
  }
  
  return {
    name: moduleName,
    path: modulePath,
    hasTests: testFiles.length > 0,
    sourceFiles: sourceFiles.length,
    testFiles: testFiles.length,
    coverage
  };
}

function analyzeAllModules(): ModuleCoverage[] {
  const modules: ModuleCoverage[] = [];
  
  // Analyze themes
  const themes = fs.readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());
  
  for (const theme of themes) {
    const themePath = path.join(THEMES_DIR, theme.name);
    const userStoriesPath = path.join(themePath, 'user-stories');
    
    if (fs.existsSync(userStoriesPath)) {
      const stories = fs.readdirSync(userStoriesPath, { withFileTypes: true })
        .filter(d => d.isDirectory());
      
      for (const story of stories) {
        const storyPath = path.join(userStoriesPath, story.name);
        const module = analyzeModule(storyPath);
        if (module.sourceFiles > 0) {
          modules.push(module);
        }
      }
    }
  }
  
  // Also analyze demo projects
  const demoPath = path.join(ROOT_DIR, 'demo');
  if (fs.existsSync(demoPath)) {
    const demos = fs.readdirSync(demoPath, { withFileTypes: true })
      .filter(d => d.isDirectory());
    
    for (const demo of demos) {
      const module = analyzeModule(path.join(demoPath, demo.name));
      if (module.sourceFiles > 0) {
        modules.push(module);
      }
    }
  }
  
  return modules;
}

function generateReport(modules: ModuleCoverage[]): void {
  console.log('\n# Test Coverage Analysis Report\n');
  console.log(`Generated: ${new Date().toISOString()}\n`);
  
  // Sort modules by coverage (lowest first)
  const sortedModules = modules.sort((a, b) => {
    const aCoverage = a.coverage?.lines || 0;
    const bCoverage = b.coverage?.lines || 0;
    return aCoverage - bCoverage;
  });
  
  // Modules with 0% coverage
  const zeroCoverage = sortedModules.filter(m => !m.coverage || m.coverage.lines === 0);
  console.log('## Modules with 0% Coverage\n');
  if (zeroCoverage.length > 0) {
    for (const module of zeroCoverage) {
      console.log(`- **${module.name}** (${module.path})`);
      console.log(`  - Source files: ${module.sourceFiles}`);
      console.log(`  - Test files: ${module.testFiles}`);
      console.log(`  - Has tests: ${module.hasTests ? 'Yes' : 'No'}\n`);
    }
  } else {
    console.log('No modules with 0% coverage found.\n');
  }
  
  // Modules with low coverage (< 50%)
  const lowCoverage = sortedModules.filter(m => m.coverage && m.coverage.lines > 0 && m.coverage.lines < 50);
  console.log('## Modules with Low Coverage (< 50%)\n');
  if (lowCoverage.length > 0) {
    for (const module of lowCoverage) {
      console.log(`- **${module.name}** (${module.path})`);
      console.log(`  - Line coverage: ${module.coverage!.lines.toFixed(2)}%`);
      console.log(`  - Branch coverage: ${module.coverage!.branches.toFixed(2)}%`);
      console.log(`  - Function coverage: ${module.coverage!.functions.toFixed(2)}%`);
      console.log(`  - Source files: ${module.sourceFiles}`);
      console.log(`  - Test files: ${module.testFiles}\n`);
    }
  } else {
    console.log('No modules with low coverage found.\n');
  }
  
  // Modules without tests
  const noTests = sortedModules.filter(m => !m.hasTests && m.sourceFiles > 0);
  console.log('## Modules Without Tests\n');
  if (noTests.length > 0) {
    for (const module of noTests) {
      console.log(`- **${module.name}** (${module.path})`);
      console.log(`  - Source files: ${module.sourceFiles}\n`);
    }
  } else {
    console.log('All modules have tests.\n');
  }
  
  // Priority recommendations
  console.log('## Priority Recommendations\n');
  console.log('Based on the analysis, here are the modules that need immediate attention:\n');
  
  // Priority 1: Modules with source files but no tests
  const priority1 = noTests.slice(0, 5);
  if (priority1.length > 0) {
    console.log('### Priority 1: No Tests (Critical)\n');
    for (const module of priority1) {
      console.log(`1. **${module.name}** - ${module.sourceFiles} source files, no tests`);
    }
    console.log('');
  }
  
  // Priority 2: Modules with tests but 0% coverage
  const priority2 = zeroCoverage.filter(m => m.hasTests).slice(0, 5);
  if (priority2.length > 0) {
    console.log('### Priority 2: Tests Exist but 0% Coverage (High)\n');
    for (const module of priority2) {
      console.log(`1. **${module.name}** - ${module.testFiles} test files, but no coverage`);
    }
    console.log('');
  }
  
  // Priority 3: Low coverage modules
  const priority3 = lowCoverage.slice(0, 5);
  if (priority3.length > 0) {
    console.log('### Priority 3: Low Coverage (Medium)\n');
    for (const module of priority3) {
      console.log(`1. **${module.name}** - ${module.coverage!.lines.toFixed(2)}% line coverage`);
    }
  }
}

// Run analysis
const modules = analyzeAllModules();
generateReport(modules);