#!/usr/bin/env bun

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CoverageResult {
  file: string;
  lines: { covered: number; total: number; percentage: number };
  functions: { covered: number; total: number; percentage: number };
  branches: { covered: number; total: number; percentage: number };
}

interface ThemeCoverage {
  name: string;
  path: string;
  coverage: CoverageResult[];
  summary: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

async function analyzeThemeCoverage(themePath: string, themeName: string): Promise<ThemeCoverage> {
  console.log(`\n📊 Analyzing coverage for ${themeName}...`);
  
  const coverage: CoverageResult[] = [];
  
  try {
    // Run tests with coverage
    const { stdout } = await execAsync(`cd ${themePath} && bun test --coverage --bail 100`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000 // 60 second timeout
    });
    
    // Parse coverage output (simplified for now)
    const lines = stdout.split('\n');
    let inCoverage = false;
    let totalLines = 0, coveredLines = 0;
    let totalFuncs = 0, coveredFuncs = 0;
    let totalBranches = 0, coveredBranches = 0;
    
    for (const line of lines) {
      if (line.includes('Coverage report')) {
        inCoverage = true;
      }
      if (inCoverage && line.includes('%')) {
        // Simple parsing - would need more sophisticated parsing for real coverage data
        const match = line.match(/(\d+\.?\d*)%/);
        if (match) {
          const percentage = parseFloat(match[1]);
          if (line.includes('Lines')) {
            totalLines = 100;
            coveredLines = percentage;
          } else if (line.includes('Functions')) {
            totalFuncs = 100;
            coveredFuncs = percentage;
          } else if (line.includes('Branches')) {
            totalBranches = 100;
            coveredBranches = percentage;
          }
        }
      }
    }
    
    return {
      name: themeName,
      path: themePath,
      coverage,
      summary: {
        lines: coveredLines || 0,
        functions: coveredFuncs || 0,
        branches: coveredBranches || 0,
        statements: coveredLines || 0
      }
    };
  } catch (error) {
    console.error(`Error analyzing ${themeName}:`, error);
    return {
      name: themeName,
      path: themePath,
      coverage,
      summary: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      }
    };
  }
}

async function findUncoveredFiles(themePath: string): Promise<string[]> {
  const sourceFiles: string[] = [];
  const testFiles: string[] = [];
  
  // Find all source files
  const findSourceFiles = async (dir: string): Promise<void> => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.includes('dist')) {
        await findSourceFiles(fullPath);
      } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
        if (item.name.includes('.test.') || item.name.includes('.spec.')) {
          testFiles.push(fullPath);
        } else {
          sourceFiles.push(fullPath);
        }
      }
    }
  };
  
  await findSourceFiles(themePath);
  
  // Find source files without corresponding tests
  const uncovered: string[] = [];
  for (const sourceFile of sourceFiles) {
    const baseName = path.basename(sourceFile, '.ts');
    const hasTest = testFiles.some(testFile => 
      testFile.includes(baseName + '.test.') || 
      testFile.includes(baseName + '.spec.')
    );
    
    if (!hasTest) {
      uncovered.push(sourceFile);
    }
  }
  
  return uncovered;
}

async function generateCoverageReport() {
  console.log('🔍 AI Development Platform - Coverage Analysis');
  console.log('=' .repeat(60));
  
  const themes = [
    { name: 'Story Reporter', path: 'layer/themes/infra_story-reporter' },
    { name: 'External Log Lib', path: 'layer/themes/infra_external-log-lib' },
    { name: 'Filesystem MCP', path: 'layer/themes/infra_filesystem-mcp' }
  ];
  
  const results: ThemeCoverage[] = [];
  
  for (const theme of themes) {
    const fullPath = path.join(process.cwd(), theme.path);
    if (await fs.access(fullPath).then(() => true).catch(() => false)) {
      const coverage = await analyzeThemeCoverage(fullPath, theme.name);
      results.push(coverage);
      
      // Find uncovered files
      const uncovered = await findUncoveredFiles(fullPath);
      if (uncovered.length > 0) {
        console.log(`\n⚠️  Files without tests in ${theme.name}:`);
        for (const file of uncovered.slice(0, 10)) {
          console.log(`   - ${path.relative(fullPath, file)}`);
        }
        if (uncovered.length > 10) {
          console.log(`   ... and ${uncovered.length - 10} more files`);
        }
      }
    }
  }
  
  // Generate summary report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Coverage Summary Report');
  console.log('=' .repeat(60));
  
  const table: string[][] = [
    ['Theme', 'Lines', 'Functions', 'Branches', 'Status']
  ];
  
  for (const result of results) {
    const status = result.summary.lines >= 80 ? '✅' : '❌';
    table.push([
      result.name,
      `${result.summary.lines.toFixed(1)}%`,
      `${result.summary.functions.toFixed(1)}%`,
      `${result.summary.branches.toFixed(1)}%`,
      status
    ]);
  }
  
  // Print table
  for (const row of table) {
    console.log(row.map(cell => cell.padEnd(15)).join(' | '));
    if (table.indexOf(row) === 0) {
      console.log('-'.repeat(80));
    }
  }
  
  // Coverage improvements needed
  console.log('\n📈 Coverage Improvement Recommendations:');
  for (const result of results) {
    if (result.summary.lines < 80) {
      console.log(`\n${result.name}:`);
      console.log(`  - Current coverage: ${result.summary.lines.toFixed(1)}%`);
      console.log(`  - Target coverage: 80%`);
      console.log(`  - Gap: ${(80 - result.summary.lines).toFixed(1)}%`);
    }
  }
  
  // Save report
  const reportPath = 'gen/doc/coverage-analysis-report.md';
  const reportContent = generateMarkdownReport(results);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, reportContent);
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

function generateMarkdownReport(results: ThemeCoverage[]): string {
  const timestamp = new Date().toISOString();
  
  return `# Coverage Analysis Report
Generated: ${timestamp}

## Summary

| Theme | Lines | Functions | Branches | Status |
|-------|-------|-----------|----------|--------|
${results.map(r => 
  `| ${r.name} | ${r.summary.lines.toFixed(1)}% | ${r.summary.functions.toFixed(1)}% | ${r.summary.branches.toFixed(1)}% | ${r.summary.lines >= 80 ? '✅ Pass' : '❌ Needs Improvement'} |`
).join('\n')}

## Coverage Targets
- **Minimum Required**: 80% line coverage
- **Recommended**: 85% overall coverage
- **Best Practice**: 90%+ with branch coverage

## Recommendations

${results.filter(r => r.summary.lines < 80).map(r => `
### ${r.name}
- **Current Coverage**: ${r.summary.lines.toFixed(1)}%
- **Gap to Target**: ${(80 - r.summary.lines).toFixed(1)}%
- **Action Required**: Add tests for uncovered source files
`).join('\n')}

## Next Steps
1. Identify uncovered source files
2. Create unit tests for critical paths
3. Add integration tests for complex workflows
4. Run coverage analysis regularly in CI/CD
`;
}

// Run the analysis
generateCoverageReport().catch(console.error);