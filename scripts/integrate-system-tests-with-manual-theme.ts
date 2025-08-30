#!/usr/bin/env ts-node

/**
 * Integration script to enhance system tests with test-as-manual theme capabilities
 * Ensures all system tests generate proper manual documentation
 */

const fs = require('fs');
const path = require('path');

interface SystemTestInfo {
  themeName: string;
  filePath: string;
  fileName: string;
  testSuites: TestSuite[];
  story?: string;
  hasGivenWhenThen: boolean;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  given?: string;
  when?: string;
  then?: string;
  steps: string[];
}

class SystemTestManualGenerator {
  private outputDir: string;
  private themesDir: string;

  constructor() {
    this.themesDir = path.join(__dirname, '..', 'layer', 'themes');
    this.outputDir = path.join(__dirname, '..', 'gen', 'test-manuals', 'system-tests-enhanced');
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Parse a system test file and extract structured information
   */
  private parseSystemTest(filePath: string, themeName: string): SystemTestInfo | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Extract story if present
      const storyMatch = content.match(/Story:\s*(.+?)['"\`\)]/);
      const story = storyMatch ? storyMatch[1] : undefined;
      
      // Check for Given-When-Then pattern
      const hasGivenWhenThen = /Given:|When:|Then:/.test(content);
      
      // Extract test suites
      const testSuites: TestSuite[] = [];
      
      // Match describe blocks
      const describeRegex = /describe\s*\(\s*['"\`](.+?)['"\`]/g;
      let describeMatch;
      
      while ((describeMatch = describeRegex.exec(content)) !== null) {
        const suiteName = describeMatch[1];
        const tests: TestCase[] = [];
        
        // Find test cases within this describe block
        const testRegex = /(?:it|test)\s*\(\s*['"\`](.+?)['"\`]/g;
        let testMatch;
        
        while ((testMatch = testRegex.exec(content)) !== null) {
          const testName = testMatch[1];
          
          // Try to extract Given-When-Then from comments
          const testContent = content.substring(testMatch.index, testMatch.index + 500);
          const givenMatch = testContent.match(/\/\/\s*Given:\s*(.+)/);
          const whenMatch = testContent.match(/\/\/\s*When:\s*(.+)/);
          const thenMatch = testContent.match(/\/\/\s*Then:\s*(.+)/);
          
          tests.push({
            name: testName,
            given: givenMatch ? givenMatch[1] : undefined,
            when: whenMatch ? whenMatch[1] : undefined,
            then: thenMatch ? thenMatch[1] : undefined,
            steps: this.generateTestSteps(testName)
          });
        }
        
        testSuites.push({
          name: suiteName,
          tests
        });
      }
      
      return {
        themeName,
        filePath,
        fileName,
        testSuites,
        story,
        hasGivenWhenThen
      };
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Generate test steps based on test name
   */
  private generateTestSteps(testName: string): string[] {
    const steps: string[] = [];
    
    // Generic steps that apply to all system tests
    steps.push('Initialize test environment');
    steps.push('Load test configuration');
    steps.push('Set up test data');
    
    // Add specific steps based on test name patterns
    if (testName.includes('create') || testName.includes('add')) {
      steps.push('Prepare creation parameters');
      steps.push('Execute creation operation');
      steps.push('Verify resource was created');
    } else if (testName.includes('update') || testName.includes('modify')) {
      steps.push('Load existing resource');
      steps.push('Apply modifications');
      steps.push('Verify changes were applied');
    } else if (testName.includes('delete') || testName.includes('remove')) {
      steps.push('Identify resource to remove');
      steps.push('Execute deletion');
      steps.push('Verify resource was removed');
    } else if (testName.includes('validate') || testName.includes('verify')) {
      steps.push('Load validation rules');
      steps.push('Execute validation');
      steps.push('Check validation results');
    } else {
      steps.push('Execute test scenario');
      steps.push('Capture results');
      steps.push('Verify expectations');
    }
    
    // Common cleanup steps
    steps.push('Clean up test artifacts');
    steps.push('Reset environment state');
    
    return steps;
  }

  /**
   * Generate enhanced manual documentation for a system test
   */
  private generateManual(testInfo: SystemTestInfo): string {
    let manual = `# System Test Manual: ${testInfo.fileName}\n\n`;
    manual += `**Theme**: ${testInfo.themeName}\n`;
    manual += `**File**: \`${testInfo.fileName}\`\n`;
    manual += `**Type**: System Test\n`;
    
    if (testInfo.story) {
      manual += `\n## Story\n${testInfo.story}\n`;
    }
    
    manual += `\n## Test Structure\n\n`;
    manual += `- **Test Suites**: ${testInfo.testSuites.length}\n`;
    manual += `- **Total Tests**: ${testInfo.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0)}\n`;
    manual += `- **BDD Format**: ${testInfo.hasGivenWhenThen ? 'Yes' : 'No'}\n`;
    
    manual += `\n## Test Documentation\n\n`;
    
    for (const suite of testInfo.testSuites) {
      manual += `### Suite: ${suite.name}\n\n`;
      
      for (const test of suite.tests) {
        manual += `#### ${test.name}\n\n`;
        
        if (test.given || test.when || test.then) {
          manual += `**Behavior Specification**:\n`;
          if (test.given) manual += `- **Given**: ${test.given}\n`;
          if (test.when) manual += `- **When**: ${test.when}\n`;
          if (test.then) manual += `- **Then**: ${test.then}\n`;
          manual += `\n`;
        }
        
        manual += `**Execution Steps**:\n\n`;
        test.steps.forEach((step, index) => {
          manual += `${index + 1}. ${step}\n`;
        });
        
        manual += `\n**Verification Checklist**:\n`;
        manual += `- [ ] Test environment is properly configured\n`;
        manual += `- [ ] All preconditions are met\n`;
        manual += `- [ ] Test executes without errors\n`;
        manual += `- [ ] Expected outcomes are achieved\n`;
        manual += `- [ ] No side effects are observed\n`;
        manual += `- [ ] Test data is cleaned up\n`;
        
        manual += `\n**Manual Execution Notes**:\n`;
        manual += `\`\`\`\n`;
        manual += `When executing this test manually:\n`;
        manual += `1. Review the test implementation for specific details\n`;
        manual += `2. Follow the execution steps carefully\n`;
        manual += `3. Document any deviations or issues\n`;
        manual += `4. Capture screenshots if applicable\n`;
        manual += `\`\`\`\n\n`;
      }
    }
    
    manual += `## Environment Setup\n\n`;
    manual += `### Prerequisites\n`;
    manual += `- Node.js and npm installed\n`;
    manual += `- All dependencies installed (\`npm install\`)\n`;
    manual += `- Test database/storage initialized\n`;
    manual += `- Environment variables configured\n\n`;
    
    manual += `### Configuration\n`;
    manual += `\`\`\`bash\n`;
    manual += `# Set up test environment\n`;
    manual += `export NODE_ENV=test\n`;
    manual += `export TEST_THEME=${testInfo.themeName}\n`;
    manual += `\n`;
    manual += `# Initialize test data\n`;
    manual += `npm run test:setup\n`;
    manual += `\`\`\`\n\n`;
    
    manual += `## Running the Test\n\n`;
    manual += `### Automated Execution\n`;
    manual += `\`\`\`bash\n`;
    manual += `# Run this specific test\n`;
    manual += `npm test -- ${testInfo.fileName}\n`;
    manual += `\n`;
    manual += `# Run with debugging\n`;
    manual += `node --inspect-brk ./node_modules/.bin/jest ${testInfo.fileName}\n`;
    manual += `\`\`\`\n\n`;
    
    manual += `### Manual Execution\n`;
    manual += `1. Open the test file: \`${testInfo.filePath}\`\n`;
    manual += `2. Review the test implementation\n`;
    manual += `3. Execute each step manually\n`;
    manual += `4. Verify expected outcomes\n`;
    manual += `5. Document results\n\n`;
    
    manual += `## Troubleshooting\n\n`;
    manual += `### Common Issues\n`;
    manual += `| Issue | Solution |\n`;
    manual += `|-------|----------|\n`;
    manual += `| Test timeout | Increase timeout in jest config |\n`;
    manual += `| Connection error | Verify services are running |\n`;
    manual += `| Data conflicts | Clean test database |\n`;
    manual += `| Permission denied | Check file/service permissions |\n\n`;
    
    manual += `---\n`;
    manual += `*Generated by test-as-manual integration*\n`;
    manual += `*Generated at: ${new Date().toISOString()}*\n`;
    
    return manual;
  }

  /**
   * Process all system tests for a theme
   */
  public async processTheme(themeName: string): Promise<void> {
    const themePath = path.join(this.themesDir, themeName);
    const systemTestDir = path.join(themePath, 'tests', 'system');
    
    if (!fs.existsSync(systemTestDir)) {
      // Also check for system tests in user-stories
      const userStoriesDir = path.join(themePath, 'user-stories');
      if (!fs.existsSync(userStoriesDir)) {
        console.log(`  No system tests found for ${themeName}`);
        return;
      }
    }
    
    console.log(`\nProcessing theme: ${themeName}`);
    
    // Find all system test files
    const findSystemTests = (dir: string): string[] => {
      const tests: string[] = [];
      if (!fs.existsSync(dir)) return tests;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          if (!item.includes('node_modules')) {
            tests.push(...findSystemTests(itemPath));
          }
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
          if (itemPath.includes('/tests/system/') || item.includes('systest')) {
            tests.push(itemPath);
          }
        }
      }
      return tests;
    };
    
    const systemTests = findSystemTests(themePath);
    console.log(`  Found ${systemTests.length} system test files`);
    
    // Create theme output directory
    const themeOutputDir = path.join(this.outputDir, themeName);
    if (!fs.existsSync(themeOutputDir)) {
      fs.mkdirSync(themeOutputDir, { recursive: true });
    }
    
    // Process each test file
    for (const testFile of systemTests) {
      const testInfo = this.parseSystemTest(testFile, themeName);
      if (testInfo) {
        const manual = this.generateManual(testInfo);
        const outputFile = path.join(
          themeOutputDir,
          testInfo.fileName.replace(/\.(ts|js)$/, '.md')
        );
        fs.writeFileSync(outputFile, manual);
        console.log(`    ✓ Generated manual for ${testInfo.fileName}`);
      }
    }
    
    // Generate theme index
    const indexPath = path.join(themeOutputDir, 'INDEX.md');
    const indexContent = this.generateThemeIndex(themeName, systemTests);
    fs.writeFileSync(indexPath, indexContent);
    console.log(`    ✓ Generated theme index`);
  }

  /**
   * Generate index for a theme's system tests
   */
  private generateThemeIndex(themeName: string, testFiles: string[]): string {
    let index = `# System Tests Index - ${themeName}\n\n`;
    index += `**Generated**: ${new Date().toISOString()}\n`;
    index += `**Total System Tests**: ${testFiles.length}\n\n`;
    
    index += `## Test Files\n\n`;
    index += `| File | Manual | Description |\n`;
    index += `|------|--------|-------------|\n`;
    
    for (const testFile of testFiles) {
      const fileName = path.basename(testFile);
      const manualName = fileName.replace(/\.(ts|js)$/, '.md');
      const description = this.extractTestDescription(testFile);
      index += `| ${fileName} | [View](${manualName}) | ${description} |\n`;
    }
    
    index += `\n## Quick Commands\n\n`;
    index += `\`\`\`bash\n`;
    index += `# Run all system tests for this theme\n`;
    index += `npm test -- layer/themes/${themeName}/tests/system\n`;
    index += `\n`;
    index += `# Generate coverage report\n`;
    index += `npm run test:coverage -- layer/themes/${themeName}/tests/system\n`;
    index += `\`\`\`\n`;
    
    return index;
  }

  /**
   * Extract a brief description from a test file
   */
  private extractTestDescription(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 20);
      
      // Look for story or main describe
      for (const line of lines) {
        if (line.includes('Story:')) {
          const match = line.match(/Story:\s*(.+?)['"\`\)]/);
          if (match) return match[1];
        }
        if (line.includes('describe(')) {
          const match = line.match(/describe\s*\(\s*['"\`](.+?)['"\`]/);
          if (match) return match[1];
        }
      }
      
      return 'System test file';
    } catch {
      return 'System test file';
    }
  }

  /**
   * Run the generator for all themes with system tests
   */
  public async run(): Promise<void> {
    console.log('========================================');
    console.log('System Test Manual Integration');
    console.log('========================================');
    
    const themesWithSystemTests = [
      'infra_docker',
      'infra_external-log-lib',
      'infra_filesystem-mcp',
      'infra_python-env',
      'infra_realtime',
      'init_env-config',
      'llm-agent_coordinator-claude',
      'llm-agent_pocketflow',
      'portal_aidev',
      'portal_aiide',
      'portal_gui-selector'
    ];
    
    for (const theme of themesWithSystemTests) {
      await this.processTheme(theme);
    }
    
    // Generate master index
    this.generateMasterIndex(themesWithSystemTests);
    
    console.log('\n========================================');
    console.log('Integration Complete');
    console.log('========================================');
    console.log(`Output directory: ${this.outputDir}`);
  }

  /**
   * Generate master index for all system test manuals
   */
  private generateMasterIndex(themes: string[]): void {
    const indexPath = path.join(this.outputDir, 'INDEX.md');
    let index = `# System Test Manuals - Master Index\n\n`;
    index += `**Generated**: ${new Date().toISOString()}\n`;
    index += `**Total Themes**: ${themes.length}\n\n`;
    
    index += `## Theme System Test Documentation\n\n`;
    index += `| Theme | Type | Component | Documentation |\n`;
    index += `|-------|------|-----------|---------------|\n`;
    
    for (const theme of themes) {
      const [type, ...componentParts] = theme.split('_');
      const component = componentParts.join('-');
      index += `| ${theme} | ${type} | ${component} | [View](${theme}/INDEX.md) |\n`;
    }
    
    index += `\n## Usage Guide\n\n`;
    index += `1. **Navigate to theme**: Click on the View link\n`;
    index += `2. **Select test file**: Choose from the theme's test list\n`;
    index += `3. **Review documentation**: Follow the manual for test execution\n`;
    index += `4. **Execute tests**: Run automated or manual verification\n`;
    index += `5. **Document results**: Record findings and issues\n\n`;
    
    index += `## Benefits\n\n`;
    index += `- **Comprehensive Documentation**: Every system test is documented\n`;
    index += `- **Manual Fallback**: Tests can be executed manually when automation fails\n`;
    index += `- **Knowledge Transfer**: New team members can understand tests quickly\n`;
    index += `- **Quality Assurance**: Clear verification checklists for each test\n\n`;
    
    index += `---\n`;
    index += `*Powered by test-as-manual theme integration*\n`;
    
    fs.writeFileSync(indexPath, index);
    console.log('\n✓ Generated master index');
  }
}

// Run if executed directly
if (require.main === module) {
  const generator = new SystemTestManualGenerator();
  generator.run().catch(console.error);
}

module.exports = { SystemTestManualGenerator };