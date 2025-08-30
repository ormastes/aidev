#!/usr/bin/env ts-node

/**
 * Enhanced manual generation with quality checks and proper output location
 * Generates comprehensive test manuals in doc/manual directory
 */

const fs = require('fs');
const path = require('path');

interface QualityMetrics {
  hasDescription: boolean;
  hasSteps: boolean;
  hasExpectedResults: boolean;
  hasPrerequisites: boolean;
  hasTroubleshooting: boolean;
  completenessScore: number;
  readabilityScore: number;
  issues: string[];
  improvements: string[];
}

interface TestManualSection {
  title: string;
  content: string;
  quality: QualityMetrics;
}

class QualityManualGenerator {
  private docManualDir: string;
  private themesDir: string;
  private qualityReport: Map<string, QualityMetrics>;

  constructor() {
    this.docManualDir = path.join(__dirname, '..', 'doc', 'manual');
    this.themesDir = path.join(__dirname, '..', 'layer', 'themes');
    this.qualityReport = new Map();
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const dirs = [
      path.join(this.docManualDir, 'system-tests'),
      path.join(this.docManualDir, 'unit-tests'),
      path.join(this.docManualDir, 'integration-tests'),
      path.join(this.docManualDir, 'themes'),
      path.join(this.docManualDir, 'quality-reports')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Analyze test file and extract comprehensive information
   */
  private analyzeTestFile(filePath: string): TestManualSection {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Extract test information
    const hasDescribe = content.includes('describe(');
    const hasIt = /\b(it|test)\s*\(/.test(content);
    const hasBeforeEach = content.includes('beforeEach');
    const hasAfterEach = content.includes('afterEach');
    const hasExpect = content.includes('expect(');
    const hasAsync = content.includes('async');
    const hasTimeout = /timeout|setTimeout/.test(content);
    
    // Extract BDD patterns
    const hasGiven = /Given:|given\s|\/\/\s*Given/.test(content);
    const hasWhen = /When:|when\s|\/\/\s*When/.test(content);
    const hasThen = /Then:|then\s|\/\/\s*Then/.test(content);
    const hasBDD = hasGiven && hasWhen && hasThen;
    
    // Extract test names and descriptions
    const testDescriptions: string[] = [];
    const describeMatches = content.matchAll(/describe\s*\(\s*['"`](.+?)['"`]/g);
    for (const match of describeMatches) {
      testDescriptions.push(match[1]);
    }
    
    const testCases: string[] = [];
    const testMatches = content.matchAll(/(?:it|test)\s*\(\s*['"`](.+?)['"`]/g);
    for (const match of testMatches) {
      testCases.push(match[1]);
    }
    
    // Generate quality metrics
    const quality = this.assessQuality({
      hasDescribe,
      hasIt,
      hasBeforeEach,
      hasAfterEach,
      hasExpect,
      hasAsync,
      hasTimeout,
      hasBDD,
      testDescriptions,
      testCases,
      fileName
    });
    
    // Generate manual content
    const manualContent = this.generateEnhancedManual({
      fileName,
      filePath,
      testDescriptions,
      testCases,
      hasBDD,
      hasAsync,
      hasTimeout,
      hasBeforeEach,
      hasAfterEach,
      quality
    });
    
    return {
      title: fileName,
      content: manualContent,
      quality
    };
  }

  /**
   * Assess quality of test documentation
   */
  private assessQuality(testInfo: any): QualityMetrics {
    const issues: string[] = [];
    const improvements: string[] = [];
    
    // Check for required elements
    const hasDescription = testInfo.testDescriptions.length > 0;
    const hasSteps = testInfo.testCases.length > 0;
    const hasExpectedResults = testInfo.hasExpect;
    const hasPrerequisites = testInfo.hasBeforeEach;
    const hasTroubleshooting = false; // Will be added in manual
    
    // Calculate completeness score
    let completenessScore = 0;
    if (hasDescription) completenessScore += 20;
    if (hasSteps) completenessScore += 20;
    if (hasExpectedResults) completenessScore += 20;
    if (hasPrerequisites) completenessScore += 20;
    if (testInfo.hasBDD) completenessScore += 20;
    
    // Calculate readability score based on naming
    let readabilityScore = 0;
    testInfo.testCases.forEach((testCase: string) => {
      if (testCase.length > 10 && testCase.length < 100) readabilityScore += 10;
      if (/should|must|will|can/.test(testCase.toLowerCase())) readabilityScore += 10;
    });
    readabilityScore = Math.min(100, readabilityScore);
    
    // Identify issues
    if (!hasDescription) issues.push('Missing test suite descriptions');
    if (!hasSteps) issues.push('No test cases found');
    if (!hasExpectedResults) issues.push('No assertions/expectations found');
    if (!hasPrerequisites) issues.push('No setup/prerequisites defined');
    if (!testInfo.hasBDD) issues.push('BDD patterns not used');
    if (testInfo.testCases.length < 3) issues.push('Low test coverage (< 3 test cases)');
    
    // Suggest improvements
    if (!testInfo.hasBDD) {
      improvements.push('Add Given-When-Then comments for better documentation');
    }
    if (!testInfo.hasTimeout) {
      improvements.push('Consider adding timeout configurations for long-running tests');
    }
    if (testInfo.testCases.some((tc: string) => tc.length > 100)) {
      improvements.push('Some test names are too long - consider making them more concise');
    }
    if (testInfo.testCases.some((tc: string) => tc.length < 10)) {
      improvements.push('Some test names are too short - add more descriptive names');
    }
    if (!testInfo.hasAsync && testInfo.fileName.includes('system')) {
      improvements.push('System tests should handle async operations');
    }
    
    return {
      hasDescription,
      hasSteps,
      hasExpectedResults,
      hasPrerequisites,
      hasTroubleshooting,
      completenessScore,
      readabilityScore,
      issues,
      improvements
    };
  }

  /**
   * Generate enhanced manual with quality considerations
   */
  private generateEnhancedManual(info: any): string {
    const quality = info.quality;
    let manual = `# Test Manual: ${info.fileName}\n\n`;
    
    // Add quality badge
    const qualityLevel = quality.completenessScore >= 80 ? '🟢 High' : 
                        quality.completenessScore >= 60 ? '🟡 Medium' : '🔴 Low';
    manual += `**Quality Level**: ${qualityLevel} (${quality.completenessScore}%)\n`;
    manual += `**Readability**: ${quality.readabilityScore}%\n\n`;
    
    // Add metadata
    manual += `## Metadata\n\n`;
    manual += `- **File**: \`${info.fileName}\`\n`;
    manual += `- **Path**: \`${info.filePath}\`\n`;
    manual += `- **Type**: ${info.fileName.includes('system') ? 'System' : 
                           info.fileName.includes('integration') ? 'Integration' : 'Unit'} Test\n`;
    manual += `- **BDD Format**: ${info.hasBDD ? '✅ Yes' : '❌ No'}\n`;
    manual += `- **Async Tests**: ${info.hasAsync ? '✅ Yes' : '❌ No'}\n`;
    manual += `- **Test Count**: ${info.testCases.length}\n\n`;
    
    // Add test overview
    manual += `## Test Overview\n\n`;
    if (info.testDescriptions.length > 0) {
      manual += `### Test Suites\n\n`;
      info.testDescriptions.forEach((desc: string) => {
        manual += `- ${desc}\n`;
      });
      manual += `\n`;
    }
    
    // Add detailed test cases
    manual += `## Test Cases\n\n`;
    info.testCases.forEach((testCase: string, index: number) => {
      manual += `### ${index + 1}. ${testCase}\n\n`;
      
      // Add structured test information
      manual += `#### Purpose\n`;
      manual += `This test verifies: ${testCase}\n\n`;
      
      manual += `#### Prerequisites\n`;
      if (info.hasBeforeEach) {
        manual += `- Test environment is initialized (beforeEach hook)\n`;
      }
      manual += `- Required test data is available\n`;
      manual += `- Dependencies are properly mocked/configured\n\n`;
      
      manual += `#### Test Steps\n`;
      manual += `1. **Setup**: Initialize test context\n`;
      manual += `2. **Arrange**: Prepare test data and conditions\n`;
      manual += `3. **Act**: Execute the operation being tested\n`;
      manual += `4. **Assert**: Verify the expected outcome\n`;
      if (info.hasAfterEach) {
        manual += `5. **Cleanup**: Reset state (afterEach hook)\n`;
      }
      manual += `\n`;
      
      manual += `#### Expected Results\n`;
      manual += `- The operation completes successfully\n`;
      manual += `- All assertions pass\n`;
      manual += `- No unexpected side effects occur\n\n`;
      
      manual += `#### Manual Execution\n`;
      manual += `When running manually:\n`;
      manual += `- [ ] Verify prerequisites are met\n`;
      manual += `- [ ] Execute test steps in order\n`;
      manual += `- [ ] Validate expected results\n`;
      manual += `- [ ] Document any deviations\n\n`;
    });
    
    // Add environment setup
    manual += `## Environment Setup\n\n`;
    manual += `### Dependencies\n`;
    manual += `\`\`\`bash\n`;
    manual += `npm install  # Install all dependencies\n`;
    manual += `npm run build  # Build the project\n`;
    manual += `\`\`\`\n\n`;
    
    manual += `### Configuration\n`;
    manual += `- Ensure test configuration is properly set\n`;
    manual += `- Environment variables are configured\n`;
    manual += `- Test database/storage is initialized\n\n`;
    
    // Add execution instructions
    manual += `## Execution Instructions\n\n`;
    manual += `### Automated Execution\n`;
    manual += `\`\`\`bash\n`;
    manual += `# Run this specific test file\n`;
    manual += `npm test -- ${info.fileName}\n\n`;
    manual += `# Run with coverage\n`;
    manual += `npm run test:coverage -- ${info.fileName}\n\n`;
    manual += `# Run in watch mode\n`;
    manual += `npm test -- --watch ${info.fileName}\n`;
    manual += `\`\`\`\n\n`;
    
    // Add troubleshooting
    manual += `## Troubleshooting\n\n`;
    manual += `### Common Issues\n\n`;
    manual += `| Issue | Possible Cause | Solution |\n`;
    manual += `|-------|---------------|----------|\n`;
    manual += `| Test timeout | Slow async operations | Increase timeout value |\n`;
    manual += `| Module not found | Missing dependencies | Run npm install |\n`;
    manual += `| Connection refused | Service not running | Start required services |\n`;
    manual += `| Assertion failed | Logic error or data issue | Debug test implementation |\n\n`;
    
    // Add quality improvement suggestions
    if (quality.improvements.length > 0) {
      manual += `## Suggested Improvements\n\n`;
      manual += `Based on quality analysis, consider:\n\n`;
      quality.improvements.forEach((improvement: string) => {
        manual += `- ${improvement}\n`;
      });
      manual += `\n`;
    }
    
    // Add footer
    manual += `---\n`;
    manual += `*Generated by Enhanced Test-as-Manual System*\n`;
    manual += `*Quality Score: ${quality.completenessScore}%*\n`;
    manual += `*Generated at: ${new Date().toISOString()}*\n`;
    
    return manual;
  }

  /**
   * Process all themes and generate manuals
   */
  public async generateAllManuals(): Promise<void> {
    console.log('🚀 Starting Quality Manual Generation...\n');
    
    const themes = fs.readdirSync(this.themesDir)
      .filter((item: string) => {
        const itemPath = path.join(this.themesDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
    
    let totalTests = 0;
    let totalQualityScore = 0;
    let themeCount = 0;
    
    for (const theme of themes) {
      const themePath = path.join(this.themesDir, theme);
      console.log(`\n📁 Processing theme: ${theme}`);
      
      // Find all test files
      const testFiles = this.findTestFiles(themePath);
      if (testFiles.length === 0) {
        console.log(`  ⏭️  No test files found`);
        continue;
      }
      
      console.log(`  📊 Found ${testFiles.length} test files`);
      
      // Create theme directory in doc/manual/themes
      const themeManualDir = path.join(this.docManualDir, 'themes', theme);
      if (!fs.existsSync(themeManualDir)) {
        fs.mkdirSync(themeManualDir, { recursive: true });
      }
      
      // Process each test file
      let themeQualityTotal = 0;
      const themeManuals: TestManualSection[] = [];
      
      for (const testFile of testFiles) {
        const manual = this.analyzeTestFile(testFile);
        themeManuals.push(manual);
        
        // Save individual manual
        const testType = this.getTestType(testFile);
        const outputDir = path.join(this.docManualDir, testType);
        const outputFile = path.join(outputDir, `${theme}_${manual.title}.md`);
        fs.writeFileSync(outputFile, manual.content);
        
        // Track quality
        themeQualityTotal += manual.quality.completenessScore;
        this.qualityReport.set(`${theme}/${manual.title}`, manual.quality);
        
        console.log(`    ✅ Generated: ${manual.title} (Quality: ${manual.quality.completenessScore}%)`);
      }
      
      // Generate theme index
      this.generateThemeIndex(theme, themeManuals, themeManualDir);
      
      // Update totals
      totalTests += testFiles.length;
      totalQualityScore += themeQualityTotal / testFiles.length;
      themeCount++;
    }
    
    // Generate master index and quality report
    this.generateMasterIndex();
    this.generateQualityReport();
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 Generation Complete!');
    console.log('='.repeat(50));
    console.log(`Total themes processed: ${themeCount}`);
    console.log(`Total test files: ${totalTests}`);
    console.log(`Average quality score: ${Math.round(totalQualityScore / themeCount)}%`);
    console.log(`Output location: ${this.docManualDir}`);
  }

  /**
   * Find all test files in a directory
   */
  private findTestFiles(dir: string): string[] {
    const testFiles: string[] = [];
    const visited = new Set<string>();
    
    const findFiles = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;
      
      // Resolve symlinks and check for circular references
      try {
        const realPath = fs.realpathSync(currentDir);
        if (visited.has(realPath)) return;
        visited.add(realPath);
      } catch (e) {
        return; // Skip if can't resolve
      }
      
      let items: string[];
      try {
        items = fs.readdirSync(currentDir);
      } catch (e) {
        return; // Skip if can't read directory
      }
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        
        try {
          const stat = fs.lstatSync(itemPath); // Use lstat to handle symlinks
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('public')) {
            findFiles(itemPath);
          } else if (stat.isFile() && item.match(/\.(test|spec|systest)\.(ts|js)$/)) {
            testFiles.push(itemPath);
          }
        } catch (e) {
          // Skip files/dirs we can't stat
          continue;
        }
      }
    };
    
    findFiles(dir);
    return testFiles;
  }

  /**
   * Determine test type from file path
   */
  private getTestType(filePath: string): string {
    if (filePath.includes('/system/') || filePath.includes('systest')) {
      return 'system-tests';
    } else if (filePath.includes('/integration/')) {
      return 'integration-tests';
    } else {
      return 'unit-tests';
    }
  }

  /**
   * Generate theme index
   */
  private generateThemeIndex(theme: string, manuals: TestManualSection[], outputDir: string) {
    let index = `# Test Manuals - ${theme}\n\n`;
    index += `**Theme**: ${theme}\n`;
    index += `**Total Tests**: ${manuals.length}\n`;
    index += `**Generated**: ${new Date().toISOString()}\n\n`;
    
    // Calculate average quality
    const avgQuality = manuals.reduce((sum, m) => sum + m.quality.completenessScore, 0) / manuals.length;
    index += `**Average Quality Score**: ${Math.round(avgQuality)}%\n\n`;
    
    index += `## Test Files\n\n`;
    index += `| File | Type | Quality | Issues |\n`;
    index += `|------|------|---------|--------|\n`;
    
    for (const manual of manuals) {
      const testType = manual.title.includes('system') ? 'System' :
                      manual.title.includes('integration') ? 'Integration' : 'Unit';
      const qualityBadge = manual.quality.completenessScore >= 80 ? '🟢' :
                          manual.quality.completenessScore >= 60 ? '🟡' : '🔴';
      index += `| ${manual.title} | ${testType} | ${qualityBadge} ${manual.quality.completenessScore}% | ${manual.quality.issues.length} |\n`;
    }
    
    index += `\n## Quality Summary\n\n`;
    
    // Group issues
    const allIssues = new Map<string, number>();
    manuals.forEach(m => {
      m.quality.issues.forEach(issue => {
        allIssues.set(issue, (allIssues.get(issue) || 0) + 1);
      });
    });
    
    if (allIssues.size > 0) {
      index += `### Common Issues\n\n`;
      Array.from(allIssues.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([issue, count]) => {
          index += `- ${issue} (${count} files)\n`;
        });
    }
    
    const outputFile = path.join(outputDir, 'INDEX.md');
    fs.writeFileSync(outputFile, index);
  }

  /**
   * Generate master index
   */
  private generateMasterIndex() {
    let index = `# Test Documentation Master Index\n\n`;
    index += `**Generated**: ${new Date().toISOString()}\n`;
    index += `**Location**: doc/manual/\n\n`;
    
    index += `## Directory Structure\n\n`;
    index += `\`\`\`\n`;
    index += `doc/manual/\n`;
    index += `├── system-tests/      # System test manuals\n`;
    index += `├── unit-tests/        # Unit test manuals\n`;
    index += `├── integration-tests/ # Integration test manuals\n`;
    index += `├── themes/           # Theme-specific manuals\n`;
    index += `└── quality-reports/  # Quality analysis reports\n`;
    index += `\`\`\`\n\n`;
    
    index += `## Quick Links\n\n`;
    index += `- [Quality Report](quality-reports/QUALITY_ANALYSIS.md)\n`;
    index += `- [System Tests](system-tests/)\n`;
    index += `- [Unit Tests](unit-tests/)\n`;
    index += `- [Integration Tests](integration-tests/)\n`;
    index += `- [Theme Documentation](themes/)\n\n`;
    
    index += `## Statistics\n\n`;
    
    const stats = {
      systemTests: fs.readdirSync(path.join(this.docManualDir, 'system-tests')).length,
      unitTests: fs.readdirSync(path.join(this.docManualDir, 'unit-tests')).length,
      integrationTests: fs.readdirSync(path.join(this.docManualDir, 'integration-tests')).length,
      themes: fs.readdirSync(path.join(this.docManualDir, 'themes')).length
    };
    
    index += `- **System Tests**: ${stats.systemTests} manuals\n`;
    index += `- **Unit Tests**: ${stats.unitTests} manuals\n`;
    index += `- **Integration Tests**: ${stats.integrationTests} manuals\n`;
    index += `- **Themes Documented**: ${stats.themes}\n\n`;
    
    const indexFile = path.join(this.docManualDir, 'INDEX.md');
    fs.writeFileSync(indexFile, index);
  }

  /**
   * Generate comprehensive quality report
   */
  private generateQualityReport() {
    let report = `# Test Documentation Quality Analysis\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n\n`;
    
    report += `## Executive Summary\n\n`;
    
    // Calculate overall metrics
    let totalScore = 0;
    let highQuality = 0;
    let mediumQuality = 0;
    let lowQuality = 0;
    const allIssues = new Map<string, number>();
    const allImprovements = new Map<string, number>();
    
    this.qualityReport.forEach((metrics, file) => {
      totalScore += metrics.completenessScore;
      if (metrics.completenessScore >= 80) highQuality++;
      else if (metrics.completenessScore >= 60) mediumQuality++;
      else lowQuality++;
      
      metrics.issues.forEach(issue => {
        allIssues.set(issue, (allIssues.get(issue) || 0) + 1);
      });
      
      metrics.improvements.forEach(imp => {
        allImprovements.set(imp, (allImprovements.get(imp) || 0) + 1);
      });
    });
    
    const avgScore = Math.round(totalScore / this.qualityReport.size);
    
    report += `- **Total Test Files Analyzed**: ${this.qualityReport.size}\n`;
    report += `- **Average Quality Score**: ${avgScore}%\n`;
    report += `- **High Quality Tests**: ${highQuality} (${Math.round(highQuality / this.qualityReport.size * 100)}%)\n`;
    report += `- **Medium Quality Tests**: ${mediumQuality} (${Math.round(mediumQuality / this.qualityReport.size * 100)}%)\n`;
    report += `- **Low Quality Tests**: ${lowQuality} (${Math.round(lowQuality / this.qualityReport.size * 100)}%)\n\n`;
    
    report += `## Most Common Issues\n\n`;
    Array.from(allIssues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([issue, count], index) => {
        report += `${index + 1}. **${issue}** - Found in ${count} files (${Math.round(count / this.qualityReport.size * 100)}%)\n`;
      });
    
    report += `\n## Top Improvement Recommendations\n\n`;
    Array.from(allImprovements.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([improvement, count], index) => {
        report += `${index + 1}. **${improvement}** - Applies to ${count} files\n`;
      });
    
    report += `\n## Files Needing Attention\n\n`;
    report += `### Low Quality Files (Score < 60%)\n\n`;
    report += `| File | Score | Main Issues |\n`;
    report += `|------|-------|-------------|\n`;
    
    Array.from(this.qualityReport.entries())
      .filter(([_, metrics]) => metrics.completenessScore < 60)
      .sort((a, b) => a[1].completenessScore - b[1].completenessScore)
      .slice(0, 20)
      .forEach(([file, metrics]) => {
        const mainIssue = metrics.issues[0] || 'N/A';
        report += `| ${file} | ${metrics.completenessScore}% | ${mainIssue} |\n`;
      });
    
    report += `\n## Quality Improvement Action Plan\n\n`;
    report += `### Immediate Actions\n\n`;
    report += `1. **Add BDD Patterns**: Implement Given-When-Then comments in test files\n`;
    report += `2. **Write Test Descriptions**: Add clear describe() blocks with meaningful descriptions\n`;
    report += `3. **Add Setup/Teardown**: Implement beforeEach/afterEach hooks where needed\n`;
    report += `4. **Improve Test Names**: Make test names more descriptive and meaningful\n\n`;
    
    report += `### Long-term Improvements\n\n`;
    report += `1. **Standardize Test Structure**: Create and enforce test templates\n`;
    report += `2. **Increase Test Coverage**: Add more test cases for comprehensive coverage\n`;
    report += `3. **Documentation Standards**: Establish documentation requirements for tests\n`;
    report += `4. **Automated Quality Checks**: Implement CI/CD quality gates\n\n`;
    
    report += `## Test-as-Manual Theme Improvements\n\n`;
    report += `Based on the analysis, the test-as-manual theme could be improved:\n\n`;
    report += `1. **Better BDD Extraction**: Enhance parsing of Given-When-Then patterns\n`;
    report += `2. **Code Coverage Integration**: Include coverage metrics in manuals\n`;
    report += `3. **Dependency Detection**: Automatically identify test dependencies\n`;
    report += `4. **Visual Diagrams**: Generate flow diagrams from test structure\n`;
    report += `5. **Interactive HTML Output**: Create browsable test documentation\n`;
    report += `6. **Test Execution History**: Track and display historical test results\n`;
    report += `7. **Automated Quality Scoring**: Real-time quality feedback during development\n\n`;
    
    const reportFile = path.join(this.docManualDir, 'quality-reports', 'QUALITY_ANALYSIS.md');
    fs.writeFileSync(reportFile, report);
    
    console.log(`\n📊 Quality report generated: ${reportFile}`);
  }
}

// Run the generator
if (require.main === module) {
  const generator = new QualityManualGenerator();
  generator.generateAllManuals().catch(console.error);
}

module.exports = { QualityManualGenerator };