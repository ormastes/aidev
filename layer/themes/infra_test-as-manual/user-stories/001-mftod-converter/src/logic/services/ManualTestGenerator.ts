/**
 * Manual Test Generator with intelligent organization
 * Converts test scenarios to human-readable manual procedures
 */

import { TestScenario, TestSuite, TestStep } from '../entities/TestScenario';
import { ManualTest, ManualTestSuite, ManualTestStep } from '../entities/ManualTest';

export class ManualTestGenerator {
  /**
   * Generate manual test suite from parsed test scenarios
   */
  generateManualTestSuite(testSuite: TestSuite): ManualTestSuite {
    const manualSuite: ManualTestSuite = {
      id: testSuite.id,
      title: this.humanizeTitle(testSuite.name),
      description: testSuite.description,
      procedures: [],
      commonProcedures: [],
      sequences: [],
      metadata: {
        generatedAt: new Date(),
        totalScenarios: testSuite.scenarios.length,
        totalSequences: testSuite.sequences.length,
        commonScenarioCount: testSuite.commonScenarios.length
      }
    };

    // Generate manual procedures for each scenario
    for (const scenario of testSuite.scenarios) {
      const manualTest = this.generateManualTest(scenario, testSuite);
      
      if (testSuite.commonScenarios.includes(scenario.id)) {
        manualSuite.commonProcedures.push(manualTest);
      } else {
        manualSuite.procedures.push(manualTest);
      }
    }

    // Generate sequences
    for (const sequence of testSuite.sequences) {
      manualSuite.sequences.push({
        id: sequence.id,
        name: this.humanizeTitle(sequence.name),
        description: `Complete test sequence for ${sequence.name}`,
        procedures: sequence.scenarioIds
          .map(id => manualSuite.procedures.find(p => p.id === id) || 
                     manualSuite.commonProcedures.find(p => p.id === id))
          .filter(p => p !== undefined) as ManualTest[],
        isMainFlow: sequence.isMainFlow
      });
    }

    return manualSuite;
  }

  /**
   * Generate manual test from scenario
   */
  private generateManualTest(scenario: TestScenario, suite: TestSuite): ManualTest {
    const setupSteps: ManualTestStep[] = [];
    const testSteps: ManualTestStep[] = [];
    let stepCounter = 1;

    // Process steps and categorize them
    for (const step of scenario.steps) {
      const manualStep = this.convertToManualStep(step, stepCounter++);
      
      if (step.keyword === 'Given') {
        setupSteps.push(manualStep);
      } else {
        testSteps.push(manualStep);
      }
    }

    // Create the manual test
    const manualTest: ManualTest = {
      id: scenario.id,
      title: this.humanizeTitle(scenario.name),
      description: this.generateDescription(scenario),
      category: this.determineCategory(scenario),
      priority: this.determinePriority(scenario),
      estimatedTime: this.estimateTime(scenario),
      setupSteps,
      testSteps,
      prerequisites: this.generatePrerequisites(scenario, suite),
      testData: this.extractTestData(scenario),
      cleanupSteps: this.generateCleanupSteps(scenario),
      tags: scenario.tags,
      isCommon: suite.commonScenarios.includes(scenario.id),
      relatedScenarios: this.findRelatedScenarios(scenario, suite)
    };

    // Add external interaction notes
    if (scenario.externalInteractions.length > 0) {
      manualTest.notes = this.generateExternalInteractionNotes(scenario.externalInteractions);
    }

    return manualTest;
  }

  /**
   * Convert BDD step to manual test step
   */
  private convertToManualStep(step: TestStep, order: number): ManualTestStep {
    const instruction = this.humanizeStepText(step.text);
    const expectedResult = this.generateExpectedResult(step);

    const manualStep: ManualTestStep = {
      id: step.id,
      order,
      instruction,
      expectedResult,
      isValidation: step.keyword === 'Then',
      isOptional: step.isHidden || false
    };

    // Add data from step arguments
    if (step.argument) {
      if (step.argument.type === "docString") {
        manualStep.inputData = step.argument.content as string;
      } else if (step.argument.type === "dataTable") {
        manualStep.testDataTable = step.argument.content;
      }
    }

    // Add notes for special steps
    if (step.isCause) {
      manualStep.notes = 'This step triggers an external system action';
    }
    if (step.isHidden) {
      manualStep.notes = (manualStep.notes || '') + '\nThis step may be automated or hidden from manual execution';
    }

    return manualStep;
  }

  /**
   * Humanize text for better readability
   */
  private humanizeTitle(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private humanizeStepText(text: string): string {
    // Replace common patterns with human-friendly text
    return text
      .replace(/^I\s+/i, '')
      .replace(/\$\{([^}]+)\}/g, '<$1>')
      .replace(/"([^"]+)"/g, '"$1"')
      .replace(/click on/gi, 'Click')
      .replace(/enter/gi, 'Enter')
      .replace(/should see/gi, 'Verify that you see')
      .replace(/should be/gi, 'Verify that it is')
      .replace(/should have/gi, 'Verify that it has');
  }

  private generateExpectedResult(step: TestStep): string {
    if (step.keyword === 'Then') {
      return step.text
        .replace(/^I\s+should\s+/i, 'The system ')
        .replace(/^should\s+/i, 'The system should ')
        .replace(/^the\s+/i, 'The ');
    }
    
    // For Given/When steps
    return 'Step completed successfully';
  }

  private generateDescription(scenario: TestScenario): string {
    const baseDesc = scenario.description || `Test procedure for ${scenario.name}`;
    
    if (scenario.isStartup) {
      return `${baseDesc}\n\nThis is a startup scenario that initializes the system.`;
    }
    
    if (scenario.children.length > 0) {
      return `${baseDesc}\n\nThis scenario has ${scenario.children.length} child scenarios.`;
    }
    
    return baseDesc;
  }

  private determineCategory(scenario: TestScenario): string {
    // Determine category based on tags and name
    const tags = scenario.tags.map(t => t.toLowerCase());
    
    if (tags.includes('@auth') || scenario.name.toLowerCase().includes('login')) {
      return "Authentication";
    }
    if (tags.includes('@api')) {
      return 'API Testing';
    }
    if (tags.includes('@ui')) {
      return 'UI Testing';
    }
    if (tags.includes('@integration')) {
      return "Integration";
    }
    
    return "Functional";
  }

  private determinePriority(scenario: TestScenario): 'high' | 'medium' | 'low' {
    const tags = scenario.tags.map(t => t.toLowerCase());
    
    if (tags.includes('@critical') || tags.includes('@high')) {
      return 'high';
    }
    if (tags.includes('@low')) {
      return 'low';
    }
    if (scenario.isStartup || scenario.children.length > 2) {
      return 'high';
    }
    
    return 'medium';
  }

  private estimateTime(scenario: TestScenario): number {
    // Base time: 2 minutes
    let time = 2;
    
    // Add time for each step
    time += scenario.steps.length * 1;
    
    // Add extra time for complex steps
    for (const step of scenario.steps) {
      if (step.argument) {
        time += 2; // Extra time for data entry
      }
      if (step.isCause) {
        time += 3; // Extra time for external interactions
      }
    }
    
    // Add time for examples
    if (scenario.examples && scenario.examples.length > 0) {
      const totalRows = scenario.examples.reduce((sum, ex) => sum + ex.rows.length, 0);
      time += totalRows * 2;
    }
    
    return Math.ceil(time);
  }

  private generatePrerequisites(scenario: TestScenario, suite: TestSuite): string[] {
    const prerequisites: string[] = [];
    
    // Add parent scenario as prerequisite
    if (scenario.parent) {
      const parent = suite.scenarios.find(s => s.id === scenario.parent);
      if (parent) {
        prerequisites.push(`Complete "${this.humanizeTitle(parent.name)}" scenario first`);
      }
    }
    
    // Add common prerequisites based on tags
    if (scenario.tags.includes('@auth')) {
      prerequisites.push('Valid test user account');
      prerequisites.push('User logged out initially');
    }
    
    // Add setup requirements
    if (scenario.isStartup) {
      prerequisites.push('Clean test environment');
      prerequisites.push('All test data prepared');
    }
    
    return prerequisites;
  }

  private extractTestData(scenario: TestScenario): Array<{ name: string; value: string; description?: string }> {
    const testData: Array<{ name: string; value: string; description?: string }> = [];
    
    // Extract data from step text
    for (const step of scenario.steps) {
      const matches = step.text.matchAll(/"([^"]+)"/g);
      for (const match of matches) {
        const value = match[1];
        if (value && !testData.some(d => d.value === value)) {
          testData.push({
            name: this.inferDataName(value),
            value,
            description: `Used in step: ${step.text}`
          });
        }
      }
    }
    
    // Add data from examples
    if (scenario.examples) {
      for (const example of scenario.examples) {
        for (let i = 0; i < example.headers.length; i++) {
          const header = example.headers[i];
          for (const row of example.rows) {
            testData.push({
              name: header,
              value: row[i],
              description: 'Example data'
            });
          }
        }
      }
    }
    
    return testData;
  }

  private inferDataName(value: string): string {
    // Try to infer what kind of data this is
    if (value.includes('@')) return 'Email';
    if (value.match(/^\d+$/)) return 'Number';
    if (value.match(/^https?:\/\//)) return 'URL';
    if (value.length > 20) return 'Text';
    return 'Value';
  }

  private generateCleanupSteps(scenario: TestScenario): string[] {
    const cleanup: string[] = [];
    
    // Add cleanup based on scenario actions
    const stepTexts = scenario.steps.map(s => s.text.toLowerCase());
    
    if (stepTexts.some(t => t.includes('create') || t.includes('add'))) {
      cleanup.push('Delete any test data created during the test');
    }
    
    if (stepTexts.some(t => t.includes('login'))) {
      cleanup.push('Log out of the test account');
    }
    
    if (stepTexts.some(t => t.includes('upload') || t.includes('file'))) {
      cleanup.push('Remove any uploaded test files');
    }
    
    if (scenario.tags.includes('@database')) {
      cleanup.push('Reset database to initial state');
    }
    
    return cleanup;
  }

  private generateExternalInteractionNotes(interactions: any[]): string {
    const notes: string[] = ['External Interactions:'];
    
    for (const interaction of interactions) {
      if (interaction.type === 'cause') {
        notes.push(`- CAUSE: ${interaction.description} (This triggers an external system)`);
      } else if (interaction.type === 'hidden') {
        notes.push(`- HIDDEN: ${interaction.description} (May be automated)`);
      }
    }
    
    return notes.join('\n');
  }

  private findRelatedScenarios(scenario: TestScenario, suite: TestSuite): string[] {
    const related: string[] = [];
    
    // Add parent
    if (scenario.parent) {
      related.push(scenario.parent);
    }
    
    // Add children
    related.push(...scenario.children);
    
    // Add siblings (same parent)
    if (scenario.parent) {
      const siblings = suite.scenarios
        .filter(s => s.parent === scenario.parent && s.id !== scenario.id)
        .map(s => s.id);
      related.push(...siblings);
    }
    
    return [...new Set(related)]; // Remove duplicates
  }
}