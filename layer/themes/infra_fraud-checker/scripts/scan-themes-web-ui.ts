#!/usr/bin/env node

/**
 * TypeScript version of the scanner
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { WebUITestDetector } from '../src/detectors/web-ui-test-detector';
import * as glob from 'glob';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function scanThemesForWebUIViolations() {
  console.log(`${colors.bright}${colors.blue}🔍 Web UI Test Validation Scanner${colors.reset}`);
  console.log('='.repeat(50) + '\n');

  // Find all themes
  const themesDir = path.join(__dirname, '../../');
  const themePatterns = [
    'portal_*',
    'tool_*',
    'lib_*',
    'infra_*',
    'check_*',
    'init_*',
    'llm-agent_*',
    'mcp_*'
  ];

  const allThemes: string[] = [];
  for (const pattern of themePatterns) {
    const themes = glob.sync(path.join(themesDir, pattern));
    // Filter to only directories
    const themeDirs = [];
    for (const themePath of themes) {
      const stat = await fs.promises.stat(themePath);
      if (stat.isDirectory()) {
        themeDirs.push(themePath);
      }
    }
    allThemes.push(...themeDirs);
  }

  console.log(`Found ${allThemes.length} themes to scan\n`);

  const results = {
    scanned: 0,
    skipped: 0,
    clean: 0,
    violations: 0,
    themeResults: [] as any[]
  };

  // Process each theme
  for (const themePath of allThemes) {
    const themeName = path.basename(themePath);
    console.log(`\n${colors.cyan}Scanning: ${themeName}${colors.reset}`);

    // Check if theme has web UI tests
    const hasWebUITests = await checkForWebUITests(themePath);
    
    if (!hasWebUITests) {
      console.log(`  ${colors.yellow}⏭️  Skipped - No web UI tests found${colors.reset}`);
      results.skipped++;
      continue;
    }

    results.scanned++;

    // Run WebUITestDetector
    try {
      const detector = new WebUITestDetector(themePath);
      const analysisResults = await detector.analyze();

      // Collect all detections from all analyzed files
      const allDetections: any[] = [];
      analysisResults.forEach(fileAnalysis => {
        allDetections.push(...fileAnalysis.mocksDetected);
      });

      if (allDetections.length === 0) {
        console.log(`  ${colors.green}✅ Clean - No violations found${colors.reset}`);
        results.clean++;
      } else {
        console.log(`  ${colors.red}❌ Violations found: ${allDetections.length}${colors.reset}`);
        results.violations++;
        
        // Store detailed results
        results.themeResults.push({
          theme: themeName,
          path: themePath,
          violations: allDetections,
          fileAnalyses: analysisResults
        });

        // Print violations summary
        printViolationsSummary(allDetections);
      }
    } catch (error: any) {
      console.log(`  ${colors.red}⚠️  Error: ${error.message}${colors.reset}`);
    }
  }

  // Generate final report
  generateFinalReport(results);
}

async function checkForWebUITests(themePath: string): Promise<boolean> {
  // Patterns that indicate web UI tests
  const webUIPatterns = [
    '**/*.e2e.{spec,test}.{js,ts}',
    '**/e2e/**/*.{spec,test}.{js,ts}',
    '**/e2e/**/*.spec.{js,ts}',
    '**/playwright/**/*.{spec,test}.{js,ts}',
    '**/cypress/**/*.{spec,test}.{js,ts}',
    '**/tests/ui/**/*.{spec,test}.{js,ts}'
  ];
  
  // Debug logging
  const themeName = path.basename(themePath);
  if (themeName === 'portal_aidev') {
    console.log(`  [DEBUG] Checking ${themeName} for web UI tests...`);
  }

  // Check for web UI indicators in package.json
  try {
    const packageJsonPath = path.join(themePath, 'package.json');
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
    
    const webUIIndicators = [
      'playwright',
      'puppeteer',
      'cypress',
      'selenium',
      'react',
      'react-native',
      'electron',
      '@testing-library/react'
    ];

    const hasWebUIDep = Object.keys({
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    }).some(dep => webUIIndicators.some(indicator => dep.includes(indicator)));

    if (themeName === 'portal_aidev') {
      console.log(`  [DEBUG] Has web UI dependency: ${hasWebUIDep}`);
    }

    // Don't skip based on dependencies alone - check for actual test files
  } catch (error) {
    // No package.json or can't read it
  }

  // Check for actual test files
  for (const pattern of webUIPatterns) {
    const files = glob.sync(path.join(themePath, pattern));
    if (themeName === 'portal_aidev') {
      console.log(`  [DEBUG] Pattern ${pattern}: found ${files.length} files`);
    }
    if (files.length > 0) {
      return true;
    }
  }

  return false;
}

async function printViolationsSummary(detections: any[]) {
  const violationTypes: Record<string, any> = {};
  
  detections.forEach(detection => {
    const type = detection.pattern || 'unknown';
    if (!violationTypes[type]) {
      violationTypes[type] = {
        count: 0,
        severity: detection.severity,
        examples: []
      };
    }
    violationTypes[type].count++;
    if (violationTypes[type].examples.length < 2) {
      violationTypes[type].examples.push({
        file: path.basename(detection.testFile),
        line: detection.location.line,
        description: detection.description
      });
    }
  });

  Object.entries(violationTypes).forEach(([type, data]) => {
    console.log(`\n  ${colors.yellow}${type}${colors.reset} (${data.count} violations)`);
    data.examples.forEach((example: any) => {
      console.log(`    - ${example.file}:${example.line} - ${example.description}`);
    });
  });
}

async function generateFinalReport(results: any) {
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.bright}${colors.blue}📊 Final Report${colors.reset}`);
  console.log('='.repeat(50) + '\n');

  console.log(`Total themes found: ${results.scanned + results.skipped}`);
  console.log(`  ${colors.cyan}Scanned: ${results.scanned}${colors.reset}`);
  console.log(`  ${colors.yellow}Skipped (no web UI): ${results.skipped}${colors.reset}`);
  console.log(`  ${colors.green}Clean: ${results.clean}${colors.reset}`);
  console.log(`  ${colors.red}With violations: ${results.violations}${colors.reset}`);

  if (results.themeResults.length > 0) {
    console.log(`\n${colors.bright}${colors.red}Themes with violations:${colors.reset}`);
    
    results.themeResults.forEach((themeResult: any) => {
      console.log(`\n${colors.bright}${themeResult.theme}${colors.reset}`);
      console.log(`Path: ${themeResult.path}`);
      console.log(`Total violations: ${themeResult.violations.length}`);
      
      // Group violations by type
      const byType: Record<string, number> = {};
      themeResult.violations.forEach((v: any) => {
        const desc = v.description;
        byType[desc] = (byType[desc] || 0) + 1;
      });
      
      Object.entries(byType).forEach(([desc, count]) => {
        console.log(`  - ${desc}: ${count}`);
      });
    });

    // Save detailed report
    saveDetailedReport(results);
  }

  console.log('\n✨ Scan complete!\n');
}

async function saveDetailedReport(results: any) {
  const reportPath = path.join(__dirname, '../fraud-reports');
  await fileAPI.createDirectory(reportPath);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(reportPath, `web-ui-scan-${timestamp}.json`);
  
  await fileAPI.createFile(reportFile, JSON.stringify(results, { type: FileType.TEMPORARY }));
  console.log(`\n${colors.green}Detailed report saved to: ${reportFile}${colors.reset}`);
  
  // Also generate a markdown report
  const mdReport = generateMarkdownReport(results);
  const mdFile = path.join(reportPath, `web-ui-scan-${timestamp}.md`);
  await fileAPI.createFile(mdFile, mdReport, { type: FileType.TEMPORARY });
  console.log(`${colors.green}Markdown report saved to: ${mdFile}${colors.reset}`);
}

async function generateMarkdownReport(results: any): string {
  let md = '# Web UI Test Validation Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  
  md += '## Summary\n\n';
  md += `- **Total themes scanned**: ${results.scanned}\n`;
  md += `- **Themes skipped (no web UI)**: ${results.skipped}\n`;
  md += `- **Clean themes**: ${results.clean}\n`;
  md += `- **Themes with violations**: ${results.violations}\n\n`;
  
  if (results.themeResults.length > 0) {
    md += '## Themes with Violations\n\n';
    
    results.themeResults.forEach((themeResult: any) => {
      md += `### ${themeResult.theme}\n\n`;
      md += `**Path**: ${themeResult.path}\n`;
      md += `**Total violations**: ${themeResult.violations.length}\n\n`;
      
      md += '#### Violations by Type:\n\n';
      
      // Group by violation type
      const byType: Record<string, any[]> = {};
      themeResult.violations.forEach((v: any) => {
        if (!byType[v.pattern]) {
          byType[v.pattern] = [];
        }
        byType[v.pattern].push(v);
      });
      
      Object.entries(byType).forEach(([pattern, violations]) => {
        md += `**${pattern}** (${violations.length} occurrences)\n\n`;
        
        violations.slice(0, 3).forEach((v: any) => {
          md += `- **File**: ${path.basename(v.testFile)}:${v.location.line}\n`;
          md += `  - **Description**: ${v.description}\n`;
          md += `  - **Recommendation**: ${v.recommendation}\n`;
          md += `  - **Code**:\n`;
          md += '    ```typescript\n';
          md += `    ${v.location.snippet}\n`;
          md += '    ```\n\n';
        });
        
        if (violations.length > 3) {
          md += `  ... and ${violations.length - 3} more\n\n`;
        }
      });
    });
  }
  
  md += '## Validation Rules\n\n';
  md += '### ✅ Allowed (User Interactions)\n\n';
  md += '- All Playwright user interaction methods (click, hover, type, drag, etc.)\n';
  md += '- Navigation to login page only\n';
  md += '- Assertions on visible UI state\n\n';
  
  md += '### ❌ Forbidden (Non-User Actions)\n\n';
  md += '- `page.evaluate()` - Direct JavaScript execution\n';
  md += '- `page.route()` - Network interception\n';
  md += '- Direct DOM access (document.*, window.*)\n';
  md += '- localStorage/sessionStorage manipulation\n';
  md += '- Multiple page.goto() calls (only login page allowed)\n';
  
  return md;
}

// Run the scanner
if (require.main === module) {
  scanThemesForWebUIViolations().catch(console.error);
}

export { scanThemesForWebUIViolations };