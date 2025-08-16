import { fileAPI } from '../utils/file-api';
/**
 * Test Parser for various test formats
 * Supports Jest, Mocha, Jasmine, BDD/Gherkin, and more
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { ParsedTest, TestSuite, TestCase, TestStep, TestHook } from './types';

export class TestParser {
  private parsers: Map<string, (content: string, filePath: string) => ParsedTest>;

  constructor() {
    this.parsers = new Map();
    this.registerDefaultParsers();
  }

  /**
   * Parse a test file
   */
  async parseFile(filePath: string): Promise<ParsedTest> {
    const content = await fileAPI.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    
    // Determine test type based on file extension and content
    const testType = this.detectTestType(fileName, content);
    
    // Select appropriate parser
    const parser = this.parsers.get(testType) || this.parseGenericTest.bind(this);
    
    return parser(content, filePath);
  }

  /**
   * Parse test content directly
   */
  parse(content: string, testType?: string): ParsedTest {
    const type = testType || this.detectTestType('test.js', content);
    const parser = this.parsers.get(type) || this.parseGenericTest.bind(this);
    return parser(content, 'inline');
  }

  /**
   * Validate test file
   */
  async validate(filePath: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const content = await fileAPI.readFile(filePath, 'utf-8');
      const errors: string[] = [];
      
      // Check for basic test structure
      if (!this.hasTestStructure(content)) {
        errors.push('No valid test structure found');
      }
      
      // Check for syntax errors (basic)
      try {
        if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
          // Basic syntax validation
          new Function(content);
        }
      } catch (e) {
        errors.push(`Syntax error: ${e}`);
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to read file: ${error}`]
      };
    }
  }

  /**
   * Register custom parser
   */
  registerParser(type: string, parser: (content: string, filePath: string) => ParsedTest): void {
    this.parsers.set(type, parser);
  }

  private registerDefaultParsers(): void {
    // Jest/Mocha parser
    this.parsers.set('jest', this.parseJestMocha.bind(this));
    this.parsers.set('mocha', this.parseJestMocha.bind(this));
    
    // BDD/Gherkin parser
    this.parsers.set('bdd', this.parseBDD.bind(this));
    this.parsers.set('gherkin', this.parseBDD.bind(this));
    
    // Jasmine parser
    this.parsers.set('jasmine', this.parseJasmine.bind(this));
  }

  private detectTestType(fileName: string, content: string): string {
    // Check for BDD/Gherkin
    if (fileName.endsWith('.feature') || content.includes('Feature:') || content.includes('Scenario:')) {
      return 'bdd';
    }
    
    // Check for Jest
    if (content.includes('describe(') && content.includes('expect(')) {
      return 'jest';
    }
    
    // Check for Mocha
    if (content.includes('describe(') && content.includes('assert')) {
      return 'mocha';
    }
    
    // Check for Jasmine
    if (content.includes('describe(') && content.includes('jasmine')) {
      return 'jasmine';
    }
    
    return 'generic';
  }

  private hasTestStructure(content: string): boolean {
    const testPatterns = [
      /describe\s*\(/,
      /it\s*\(/,
      /test\s*\(/,
      /Feature:/,
      /Scenario:/,
      /Given\s+/,
      /When\s+/,
      /Then\s+/
    ];
    
    return testPatterns.some(pattern => pattern.test(content));
  }

  private parseJestMocha(content: string, filePath: string): ParsedTest {
    const suites: TestSuite[] = [];
    const hooks: TestHook[] = [];
    
    // Extract test suites using regex - improved to handle multiple test cases
    const describeRegex = /describe\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?(?:function\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\)/g;
    const itRegex = /it\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
    const testRegex = /test\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
    const expectRegex = /expect\s*\(([^)]+)\)\.([^(]+)\(([^)]*)\)/g;
    
    let suiteMatch;
    let suiteId = 0;
    
    while ((suiteMatch = describeRegex.exec(content)) !== null) {
      const suiteName = suiteMatch[1];
      const suiteContent = suiteMatch[2];
      const testCases: TestCase[] = [];
      
      // Reset regex for each suite
      itRegex.lastIndex = 0;
      testRegex.lastIndex = 0;
      
      // Find all test cases (both 'it' and 'test' formats)
      const testMatches: Array<{name: string, index: number}> = [];
      
      let testMatch;
      while ((testMatch = itRegex.exec(suiteContent)) !== null) {
        testMatches.push({ name: testMatch[1], index: testMatch.index });
      }
      
      testRegex.lastIndex = 0;
      while ((testMatch = testRegex.exec(suiteContent)) !== null) {
        testMatches.push({ name: testMatch[1], index: testMatch.index });
      }
      
      // Sort by index to process in order
      testMatches.sort((a, b) => a.index - b.index);
      
      testMatches.forEach((match, testId) => {
        const testName = match.name;
        const steps: TestStep[] = [];
        
        // Extract assertions as steps
        let expectMatch;
        let stepOrder = 0;
        
        const testContent = this.extractTestContent(suiteContent, match.index);
        expectRegex.lastIndex = 0;
        
        while ((expectMatch = expectRegex.exec(testContent)) !== null) {
          steps.push({
            id: `step-${suiteId}-${testId}-${stepOrder}`,
            order: stepOrder++,
            type: "assertion",
            action: `Verify ${expectMatch[1]}`,
            expected: `${expectMatch[2]} ${expectMatch[3]}`.trim()
          });
        }
        
        // If no explicit steps found, create a generic one
        if (steps.length === 0) {
          steps.push({
            id: `step-${suiteId}-${testId}-0`,
            order: 0,
            type: 'action',
            action: testName,
            expected: 'Test passes successfully'
          });
        }
        
        testCases.push({
          id: `test-${suiteId}-${testId}`,
          name: testName,
          steps,
          priority: 'medium'
        });
      });
      
      if (testCases.length > 0) {
        suites.push({
          id: `suite-${suiteId}`,
          name: suiteName,
          testCases
        });
        
        suiteId++;
      }
    }
    
    // Extract hooks
    const beforeEachRegex = /beforeEach\s*\(\s*(?:async\s+)?(?:function\s*)?\(\s*\)\s*=>\s*{([^}]+)}/g;
    const afterEachRegex = /afterEach\s*\(\s*(?:async\s+)?(?:function\s*)?\(\s*\)\s*=>\s*{([^}]+)}/g;
    
    let hookMatch;
    while ((hookMatch = beforeEachRegex.exec(content)) !== null) {
      hooks.push({
        type: "beforeEach",
        description: 'Setup before each test',
        code: hookMatch[1].trim()
      });
    }
    
    while ((hookMatch = afterEachRegex.exec(content)) !== null) {
      hooks.push({
        type: "afterEach",
        description: 'Cleanup after each test',
        code: hookMatch[1].trim()
      });
    }
    
    return {
      id: `test-${Date.now()}`,
      name: path.basename(filePath, path.extname(filePath)),
      filePath,
      type: 'unit',
      suites,
      hooks
    };
  }

  private parseBDD(content: string, filePath: string): ParsedTest {
    const suites: TestSuite[] = [];
    
    // Parse Feature
    const featureMatch = content.match(/Feature:\s*(.+)/);
    const featureName = featureMatch ? featureMatch[1].trim() : 'Unnamed Feature';
    
    const scenarios = content.split(/Scenario(?:\s+Outline)?:/);
    scenarios.shift(); // Remove content before first scenario
    
    scenarios.forEach((scenarioContent, index) => {
      const lines = scenarioContent.split('\n');
      const scenarioName = lines[0].trim();
      const testCases: TestCase[] = [];
      const steps: TestStep[] = [];
      
      let stepOrder = 0;
      let currentStepType: 'action' | "assertion" = 'action';
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('Given ')) {
          currentStepType = 'action';
          steps.push({
            id: `step-${index}-${stepOrder}`,
            order: stepOrder++,
            type: 'setup',
            action: trimmedLine.replace('Given ', ''),
            expected: 'Precondition established'
          });
        } else if (trimmedLine.startsWith('When ')) {
          currentStepType = 'action';
          steps.push({
            id: `step-${index}-${stepOrder}`,
            order: stepOrder++,
            type: 'action',
            action: trimmedLine.replace('When ', ''),
            expected: 'Action performed successfully'
          });
        } else if (trimmedLine.startsWith('Then ')) {
          currentStepType = "assertion";
          steps.push({
            id: `step-${index}-${stepOrder}`,
            order: stepOrder++,
            type: "assertion",
            action: trimmedLine.replace('Then ', ''),
            expected: 'Assertion verified'
          });
        } else if (trimmedLine.startsWith('And ')) {
          steps.push({
            id: `step-${index}-${stepOrder}`,
            order: stepOrder++,
            type: currentStepType,
            action: trimmedLine.replace('And ', ''),
            expected: currentStepType === "assertion" ? 'Assertion verified' : 'Action performed'
          });
        }
      });
      
      if (steps.length > 0) {
        testCases.push({
          id: `scenario-${index}`,
          name: scenarioName,
          steps,
          priority: 'medium'
        });
      }
      
      if (testCases.length > 0) {
        suites.push({
          id: `suite-${index}`,
          name: scenarioName,
          testCases
        });
      }
    });
    
    return {
      id: `feature-${Date.now()}`,
      name: featureName,
      filePath,
      type: 'bdd',
      suites
    };
  }

  private parseJasmine(content: string, filePath: string): ParsedTest {
    // Similar to Jest/Mocha but with Jasmine-specific patterns
    return this.parseJestMocha(content, filePath);
  }

  private parseGenericTest(_content: string, filePath: string): ParsedTest {
    // Generic test parsing for unknown formats
    const testCase: TestCase = {
      id: 'generic-test',
      name: path.basename(filePath, path.extname(filePath)),
      steps: [{
        id: 'step-0',
        order: 0,
        type: 'action',
        action: 'Execute test',
        expected: 'Test completes successfully'
      }],
      priority: 'medium'
    };
    
    const suite: TestSuite = {
      id: 'generic-suite',
      name: 'Test Suite',
      testCases: [testCase]
    };
    
    return {
      id: `test-${Date.now()}`,
      name: path.basename(filePath, path.extname(filePath)),
      filePath,
      type: 'unit',
      suites: [suite]
    };
  }

  private extractTestContent(content: string, startIndex: number): string {
    // Extract the content of a single test
    let depth = 0;
    let inTest = false;
    let testContent = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        if (!inTest) inTest = true;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && inTest) {
          return testContent;
        }
      }
      
      if (inTest) {
        testContent += char;
      }
    }
    
    return testContent;
  }
}

export default TestParser;