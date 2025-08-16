/**
 * BDD/Gherkin-style parser for test scenarios
 * Parses feature files and BDD-style test code
 */

import { TestDocument, TestSuite, TestCase, TestStep, TestData } from './types';

export interface Feature {
  name: string;
  description?: string;
  scenarios: Scenario[];
  background?: Scenario;
  tags?: string[];
}

export interface Scenario {
  name: string;
  description?: string;
  steps: Step[];
  examples?: Example[];
  tags?: string[];
}

export interface Step {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  argument?: string | DataTable;
}

export interface DataTable {
  headers: string[];
  rows: string[][];
}

export interface Example {
  name?: string;
  headers: string[];
  rows: string[][];
}

export class BDDParser {
  /**
   * Parse BDD-style test code or feature file content
   */
  parse(content: string, filePath: string): { success: boolean; document?: TestDocument; errors?: string[] } {
    try {
      const document: TestDocument = {
        title: `Test Documentation: ${this.extractFileName(filePath)}`,
        created: new Date(),
        suites: [],
        metadata: {
          source: filePath,
          framework: 'bdd'
        }
      };

      // Check if it's a feature file or BDD-style code
      if (this.isFeatureFile(content)) {
        const features = this.parseFeatureFile(content);
        document.suites = this.convertFeaturesToSuites(features);
      } else {
        // Parse BDD-style JavaScript/TypeScript code
        document.suites = this.parseBDDCode(content);
      }

      return { success: true, document };
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to parse BDD content: ${error instanceof Error ? error.message : String(error)}`] 
      };
    }
  }

  private isFeatureFile(content: string): boolean {
    return content.trim().startsWith('Feature:') || content.includes('@feature') || content.includes('Scenario:');
  }

  /**
   * Parse Gherkin-style feature file
   */
  private parseFeatureFile(content: string): Feature[] {
    const features: Feature[] = [];
    const lines = content.split('\n').map(line => line.trim());
    
    let currentFeature: Feature | null = null;
    let currentScenario: Scenario | null = null;
    let currentStep: Step | null = null;
    let inExamples = false;
    let exampleHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.startsWith('#')) continue;

      // Feature
      if (line.startsWith('Feature:')) {
        if (currentFeature) features.push(currentFeature);
        currentFeature = {
          name: line.substring(8).trim(),
          scenarios: [],
          tags: this.extractTags(lines, i - 1)
        };
        currentScenario = null;
        inExamples = false;
      }
      // Scenario or Scenario Outline
      else if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
        if (currentScenario && currentFeature) {
          currentFeature.scenarios.push(currentScenario);
        }
        currentScenario = {
          name: line.replace(/^Scenario( Outline)?:/, '').trim(),
          steps: [],
          tags: this.extractTags(lines, i - 1)
        };
        inExamples = false;
      }
      // Background
      else if (line.startsWith('Background:')) {
        currentScenario = {
          name: 'Background',
          steps: []
        };
        if (currentFeature) {
          currentFeature.background = currentScenario;
        }
      }
      // Examples
      else if (line.startsWith('Examples:')) {
        inExamples = true;
        if (currentScenario) {
          currentScenario.examples = currentScenario.examples || [];
        }
      }
      // Steps
      else if (this.isStepKeyword(line)) {
        const { keyword, text } = this.parseStepLine(line);
        currentStep = { keyword, text };
        
        if (currentScenario && !inExamples) {
          currentScenario.steps.push(currentStep);
        }
      }
      // Data table or examples table
      else if (line.startsWith('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        if (inExamples && currentScenario) {
          if (!exampleHeaders.length) {
            exampleHeaders = cells;
          } else {
            if (!currentScenario.examples) currentScenario.examples = [];
            currentScenario.examples.push({
              headers: exampleHeaders,
              rows: [cells]
            });
          }
        } else if (currentStep) {
          // Data table for step
          if (!currentStep.argument || typeof currentStep.argument === 'string') {
            currentStep.argument = { headers: cells, rows: [] };
          } else if ('rows' in currentStep.argument) {
            currentStep.argument.rows.push(cells);
          }
        }
      }
      // Multi-line string
      else if (line === '"""') {
        if (currentStep) {
          const docString = this.extractDocString(lines, i);
          currentStep.argument = docString.content;
          i = docString.endIndex;
        }
      }
    }

    // Add final feature and scenario
    if (currentScenario && currentFeature) {
      currentFeature.scenarios.push(currentScenario);
    }
    if (currentFeature) {
      features.push(currentFeature);
    }

    return features;
  }

  /**
   * Parse BDD-style JavaScript/TypeScript code
   */
  private parseBDDCode(content: string): TestSuite[] {
    const suites: TestSuite[] = [];
    
    // Simple regex-based parsing for BDD-style code
    const featureMatches = content.matchAll(/(?:describe|feature)\s*\(\s*['"`](.+?)['"`]/g);
    
    for (const match of featureMatches) {
      const suite: TestSuite = {
        id: `suite-${Date.now()}-${Math.random()}`,
        title: match[1],
        testCases: []
      };

      // Find scenarios within this feature
      const scenarioPattern = new RegExp(
        `(?:it|scenario|test)\\s*\\(\\s*['"\`](.+?)['"\`]\\s*,\\s*(?:async\\s*)?\\(`,
        'g'
      );
      
      const scenarioMatches = content.matchAll(scenarioPattern);
      
      for (const scenarioMatch of scenarioMatches) {
        const testCase = this.createTestCaseFromBDDCode(scenarioMatch[1], content);
        suite.testCases.push(testCase);
      }

      suites.push(suite);
    }

    return suites;
  }

  /**
   * Convert Gherkin features to test suites
   */
  private convertFeaturesToSuites(features: Feature[]): TestSuite[] {
    return features.map(feature => ({
      id: `feature-${this.generateId(feature.name)}`,
      title: feature.name,
      description: feature.description,
      testCases: feature.scenarios.map(scenario => this.convertScenarioToTestCase(scenario, feature.background))
    }));
  }

  /**
   * Convert Gherkin scenario to test case
   */
  private convertScenarioToTestCase(scenario: Scenario, background?: Scenario): TestCase {
    const testCase: TestCase = {
      id: `scenario-${this.generateId(scenario.name)}`,
      title: scenario.name,
      description: scenario.description,
      steps: [],
      category: 'BDD',
      // tags: scenario.tags // TODO: Add tags support to TestCase type
    };

    // Add background steps if present
    if (background) {
      testCase.steps.push(...this.convertStepsToTestSteps(background.steps, 0));
    }

    // Add scenario steps
    const startOrder = background ? background.steps.length : 0;
    testCase.steps.push(...this.convertStepsToTestSteps(scenario.steps, startOrder));

    // Add test data from examples
    if (scenario.examples && scenario.examples.length > 0) {
      testCase.testData = this.convertExamplesToTestData(scenario.examples);
    }

    return testCase;
  }

  /**
   * Convert Gherkin steps to test steps
   */
  private convertStepsToTestSteps(steps: Step[], startOrder: number): TestStep[] {
    return steps.map((step, index) => {
      const testStep: TestStep = {
        order: startOrder + index + 1,
        action: `${step.keyword} ${step.text}`,
        expected: this.inferExpectedResult(step),
        isAssertion: step.keyword === 'Then'
      };

      // Add data table or doc string as test data
      if (step.argument) {
        if (typeof step.argument === 'string') {
          testStep.testData = step.argument;
        } else if ('headers' in step.argument) {
          testStep.testData = JSON.stringify(step.argument, null, 2);
        }
      }

      return testStep;
    });
  }

  /**
   * Convert examples to test data
   */
  private convertExamplesToTestData(examples: Example[]): TestData[] {
    const testData: TestData[] = [];
    
    for (const example of examples) {
      for (const row of example.rows) {
        example.headers.forEach((header, index) => {
          testData.push({
            name: header,
            value: row[index],
            description: example.name || 'Example data'
          });
        });
      }
    }

    return testData;
  }

  private createTestCaseFromBDDCode(title: string, content: string): TestCase {
    return {
      id: `tc-${Date.now()}-${Math.random()}`,
      title,
      steps: this.extractBDDStepsFromCode(content, title),
      category: 'BDD'
    };
  }

  private extractBDDStepsFromCode(content: string, scenarioTitle: string): TestStep[] {
    const steps: TestStep[] = [];
    
    // Look for Given/When/Then patterns in the code
    const stepPatterns = [
      /given\s*\(\s*['"`](.+?)['"`]/gi,
      /when\s*\(\s*['"`](.+?)['"`]/gi,
      /then\s*\(\s*['"`](.+?)['"`]/gi,
      /and\s*\(\s*['"`](.+?)['"`]/gi
    ];

    let order = 1;
    for (const pattern of stepPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        steps.push({
          order: order++,
          action: match[1],
          expected: 'Step completed successfully',
          isAssertion: pattern.source.includes('then')
        });
      }
    }

    // If no BDD steps found, create generic steps
    if (steps.length === 0) {
      steps.push({
        order: 1,
        action: `Execute scenario: ${scenarioTitle}`,
        expected: 'Scenario completed successfully'
      });
    }

    return steps;
  }

  private isStepKeyword(line: string): boolean {
    return /^(Given|When|Then|And|But)\s+/.test(line);
  }

  private parseStepLine(line: string): { keyword: 'Given' | 'When' | 'Then' | 'And' | 'But'; text: string } {
    const match = line.match(/^(Given|When|Then|And|But)\s+(.+)$/);
    if (!match) throw new Error(`Invalid step line: ${line}`);
    
    return {
      keyword: match[1] as 'Given' | 'When' | 'Then' | 'And' | 'But',
      text: match[2]
    };
  }

  private extractTags(lines: string[], currentIndex: number): string[] {
    const tags: string[] = [];
    let i = currentIndex;
    
    while (i >= 0 && lines[i]) {
      const line = lines[i].trim();
      if (line.startsWith('@')) {
        tags.push(...line.split(/\s+/).filter(tag => tag.startsWith('@')));
        i--;
      } else if (line === '' || line.startsWith('#')) {
        i--;
      } else {
        break;
      }
    }
    
    return tags.reverse();
  }

  private extractDocString(lines: string[], startIndex: number): { content: string; endIndex: number } {
    const contentLines: string[] = [];
    let i = startIndex + 1;
    
    while (i < lines.length && lines[i] !== '"""') {
      contentLines.push(lines[i]);
      i++;
    }
    
    return {
      content: contentLines.join('\n'),
      endIndex: i
    };
  }

  private inferExpectedResult(step: Step): string {
    if (step.keyword === 'Then') {
      return step.text.replace(/^(I\s+)?should\s+/, 'User ');
    }
    return `${step.keyword} step completed successfully`;
  }

  private extractFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    return fileName.replace(/\.(feature|spec|test)\.(js|ts|feature)$/, '');
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20);
  }
}