#!/usr/bin/env bun

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface FileCoverage {
  sourceFile: string;
  testFile: string | null;
  hasTest: boolean;
}

interface ThemeCoverageReport {
  theme: string;
  totalFiles: number;
  testedFiles: number;
  untestedFiles: number;
  coveragePercentage: number;
  files: FileCoverage[];
}

async function findTestFile(sourceFile: string, testFiles: string[]): Promise<string | null> {
  const baseName = path.basename(sourceFile, path.extname(sourceFile));
  const dirName = path.dirname(sourceFile);
  
  // Look for corresponding test files
  const possibleTestNames = [
    `${baseName}.test.ts`,
    `${baseName}.spec.ts`,
    `${baseName}.test.js`,
    `${baseName}.spec.js`
  ];
  
  for (const testFile of testFiles) {
    const testBaseName = path.basename(testFile);
    if (possibleTestNames.includes(testBaseName)) {
      // Check if it's in a reasonable location (same dir or tests dir)
      if (testFile.includes(dirName.replace('/src/', '/tests/')) ||
          testFile.includes(dirName.replace('/src/', '/test/')) ||
          path.dirname(testFile) === dirName) {
        return testFile;
      }
    }
  }
  
  return null;
}

async function analyzeThemeCoverage(themePath: string): Promise<ThemeCoverageReport> {
  const themeName = path.basename(themePath);
  
  // Find all TypeScript source files
  const sourceFiles = await glob('**/*.ts', {
    cwd: themePath,
    ignore: [
      '**/node_modules/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.steps.ts',
      '**/*.d.ts',
      '**/dist/**',
      '**/build/**',
      '**/gen/**'
    ]
  });
  
  // Find all test files
  const testFiles = await glob('**/*.{test,spec}.{ts,js}', {
    cwd: themePath,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  const coverage: FileCoverage[] = [];
  
  for (const sourceFile of sourceFiles) {
    const testFile = await findTestFile(sourceFile, testFiles);
    coverage.push({
      sourceFile,
      testFile,
      hasTest: !!testFile
    });
  }
  
  const testedFiles = coverage.filter(f => f.hasTest).length;
  
  return {
    theme: themeName,
    totalFiles: sourceFiles.length,
    testedFiles,
    untestedFiles: sourceFiles.length - testedFiles,
    coveragePercentage: sourceFiles.length > 0 ? (testedFiles / sourceFiles.length) * 100 : 0,
    files: coverage
  };
}

async function generateCoverageReport() {
  console.log('📊 Coverage Analysis for AI Development Platform');
  console.log('=' .repeat(60));
  
  const themes = [
    'layer/themes/infra_story-reporter',
    'layer/themes/infra_external-log-lib',
    'layer/themes/infra_filesystem-mcp'
  ];
  
  const reports: ThemeCoverageReport[] = [];
  
  for (const themePath of themes) {
    const fullPath = path.join(process.cwd(), themePath);
    try {
      await fs.access(fullPath);
      const report = await analyzeThemeCoverage(fullPath);
      reports.push(report);
    } catch (error) {
      console.error(`Failed to analyze ${themePath}:`, error);
    }
  }
  
  // Display summary
  console.log('\n📈 Coverage Summary:\n');
  console.log('Theme'.padEnd(30) + ' | Files | Tested | Coverage | Status');
  console.log('-'.repeat(70));
  
  for (const report of reports) {
    const status = report.coveragePercentage >= 80 ? '✅' : '❌';
    console.log(
      report.theme.padEnd(30) + ' | ' +
      report.totalFiles.toString().padEnd(5) + ' | ' +
      report.testedFiles.toString().padEnd(6) + ' | ' +
      report.coveragePercentage.toFixed(1).padEnd(8) + '% | ' +
      status
    );
  }
  
  // Show files without tests
  console.log('\n⚠️  Files Without Tests:\n');
  
  for (const report of reports) {
    const untestedFiles = report.files.filter(f => !f.hasTest);
    if (untestedFiles.length > 0) {
      console.log(`\n${report.theme}:`);
      for (const file of untestedFiles.slice(0, 10)) {
        console.log(`  - ${file.sourceFile}`);
      }
      if (untestedFiles.length > 10) {
        console.log(`  ... and ${untestedFiles.length - 10} more files`);
      }
    }
  }
  
  // Generate markdown report
  const mdReport = generateMarkdownReport(reports);
  const reportPath = 'gen/doc/coverage-status-report.md';
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, mdReport);
  
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  return reports;
}

function generateMarkdownReport(reports: ThemeCoverageReport[]): string {
  const timestamp = new Date().toISOString();
  
  let md = `# Test Coverage Status Report\n\n`;
  md += `Generated: ${timestamp}\n\n`;
  
  md += `## Summary\n\n`;
  md += `| Theme | Total Files | Tested | Untested | Coverage | Status |\n`;
  md += `|-------|-------------|---------|----------|----------|--------|\n`;
  
  for (const report of reports) {
    const status = report.coveragePercentage >= 80 ? '✅ Pass' : '❌ Needs Work';
    md += `| ${report.theme} | ${report.totalFiles} | ${report.testedFiles} | ${report.untestedFiles} | ${report.coveragePercentage.toFixed(1)}% | ${status} |\n`;
  }
  
  md += `\n## Files Requiring Test Coverage\n\n`;
  
  for (const report of reports) {
    const untestedFiles = report.files.filter(f => !f.hasTest);
    if (untestedFiles.length > 0) {
      md += `### ${report.theme}\n\n`;
      md += `Missing tests for ${untestedFiles.length} files:\n\n`;
      for (const file of untestedFiles) {
        md += `- [ ] ${file.sourceFile}\n`;
      }
      md += '\n';
    }
  }
  
  md += `## Recommendations\n\n`;
  md += `1. **Priority**: Focus on themes with coverage below 80%\n`;
  md += `2. **Critical Files**: Add tests for core functionality first\n`;
  md += `3. **Integration Tests**: Ensure cross-module interactions are tested\n`;
  md += `4. **CI/CD**: Run coverage checks in continuous integration\n`;
  
  return md;
}

// Run the analysis
generateCoverageReport()
  .then(reports => {
    // Check if any theme needs improvement
    const needsImprovement = reports.some(r => r.coveragePercentage < 80);
    if (needsImprovement) {
      console.log('\n⚡ Action Required: Some themes have coverage below 80%');
      process.exit(1);
    } else {
      console.log('\n✨ All themes meet coverage requirements!');
    }
  })
  .catch(console.error);