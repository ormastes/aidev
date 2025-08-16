/**
 * Enhanced BDD Parser with scenario hierarchy detection
 * Inspired by _aidev implementation
 */

import { TestScenario, TestStep, TestSuite, ExternalInteraction } from '../entities/TestScenario';
import { crypto } from '../../../../../../infra_external-log-lib/src';

export class BddParser {
  private scenarioMap: Map<string, TestScenario> = new Map();
  
  /**
   * Parse a feature file and extract test scenarios with hierarchy
   */
  parseFeatureFile(filePath: string, content: string): TestSuite {
    // Reset state
    this.scenarioMap.clear();
    
    const lines = content.split('\n');
    const suite: TestSuite = {
      id: this.generateId(filePath),
      name: this.extractFeatureName(lines),
      description: this.extractFeatureDescription(lines),
      scenarios: [],
      commonScenarios: [],
      sequences: []
    };

    let currentScenario: TestScenario | null = null;
    let currentStep: TestStep | null = null;
    let backgroundSteps: TestStep[] = [];
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const line = lines[lineIndex].trim();
      
      if (line.startsWith('Feature:')) {
        // Already handled in extractFeatureName
      } else if (line.startsWith('Background:')) {
        backgroundSteps = this.parseBackgroundSteps(lines, lineIndex + 1);
        lineIndex = this.skipToNextSection(lines, lineIndex + 1);
        continue;
      } else if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
        if (currentScenario) {
          this.finalizeScenario(currentScenario);
          suite.scenarios.push(currentScenario);
        }
        
        currentScenario = this.parseScenario(line, lines, lineIndex);
        // Add background steps to each scenario
        if (backgroundSteps.length > 0) {
          currentScenario.steps = [...this.cloneSteps(backgroundSteps), ...currentScenario.steps];
        }
      } else if (this.isStepKeyword(line)) {
        if (currentScenario) {
          const step = this.parseStep(line, lineIndex);
          currentScenario.steps.push(step);
          currentStep = step;
        }
      } else if (line.startsWith('"""')) {
        // Doc string
        if (currentStep) {
          const docString = this.parseDocString(lines, lineIndex);
          currentStep.argument = {
            type: 'docString',
            content: docString.content
          };
          lineIndex = docString.endIndex;
          continue;
        }
      } else if (line.startsWith('|')) {
        // Data table
        if (currentStep) {
          const dataTable = this.parseDataTable(lines, lineIndex);
          currentStep.argument = {
            type: 'dataTable',
            content: dataTable.table
          };
          lineIndex = dataTable.endIndex;
          continue;
        }
      } else if (line.startsWith('@')) {
        // Tags for next scenario
        if (!currentScenario) {
          this.parseTags(line); // Process tags for next scenario
          const nextLineIndex = this.findNextNonEmptyLine(lines, lineIndex + 1);
          if (nextLineIndex < lines.length) {
            const nextLine = lines[nextLineIndex].trim();
            if (nextLine.startsWith('Scenario:') || nextLine.startsWith('Scenario Outline:')) {
              // These tags belong to the next scenario
              // We'll handle them when we parse the scenario
            }
          }
        }
      }
      
      lineIndex++;
    }

    // Add final scenario
    if (currentScenario) {
      this.finalizeScenario(currentScenario);
      suite.scenarios.push(currentScenario);
    }

    // Analyze scenarios for hierarchy and common patterns
    this.analyzeScenarioHierarchy(suite);
    this.detectCommonScenarios(suite);
    this.buildSequences(suite);

    return suite;
  }

  /**
   * Parse multiple feature files into a test suite
   */
  parseTestSuite(featureFiles: Array<{ path: string; content: string }>): TestSuite {
    const suites = featureFiles.map(file => this.parseFeatureFile(file.path, file.content));
    
    // Merge all suites
    const mergedSuite: TestSuite = {
      id: this.generateId('merged-suite'),
      name: 'Test Suite',
      description: 'Merged test suite from multiple feature files',
      scenarios: [],
      commonScenarios: [],
      sequences: []
    };

    for (const suite of suites) {
      mergedSuite.scenarios.push(...suite.scenarios);
    }

    // Re-analyze the merged suite
    this.analyzeScenarioHierarchy(mergedSuite);
    this.detectCommonScenarios(mergedSuite);
    this.buildSequences(mergedSuite);

    return mergedSuite;
  }

  private parseScenario(line: string, lines: string[], startIndex: number): TestScenario {
    const name = line.replace(/^Scenario( Outline)?:/, '').trim();
    const tags = this.extractTagsBeforeLine(lines, startIndex);
    
    const scenario: TestScenario = {
      id: this.generateId(name),
      name,
      tags,
      steps: [],
      children: [],
      isLeaf: true, // Will be updated during analysis
      isStartup: tags.includes('@startup'),
      externalInteractions: []
    };

    // Parse examples if it's a scenario outline
    if (line.startsWith('Scenario Outline:')) {
      let exampleIndex = startIndex + 1;
      while (exampleIndex < lines.length && !lines[exampleIndex].trim().startsWith('Examples:')) {
        exampleIndex++;
      }
      if (exampleIndex < lines.length) {
        scenario.examples = this.parseExamples(lines, exampleIndex);
      }
    }

    this.scenarioMap.set(scenario.id, scenario);
    return scenario;
  }

  private parseStep(line: string, lineIndex: number): TestStep {
    const match = line.match(/^\s*(Given|When|Then|And|But)\s+(.+)$/);
    if (!match) {
      throw new Error(`Invalid step at line ${lineIndex}: ${line}`);
    }

    const [, keyword, text] = match;
    const step: TestStep = {
      id: this.generateId(`step-${lineIndex}`),
      keyword: keyword as TestStep['keyword'],
      text: text.trim(),
      order: lineIndex
    };

    // Check for [hidden] marker
    if (text.includes('[hidden]')) {
      step.isHidden = true;
      step.text = text.replace('[hidden]', '').trim();
    }

    // Check for CAUSE: statement
    if (text.startsWith('CAUSE:')) {
      step.isCause = true;
      step.text = text.substring(6).trim();
    }

    return step;
  }

  private analyzeScenarioHierarchy(suite: TestSuite): void {
    // Detect parent-child relationships based on step overlap
    for (let i = 0; i < suite.scenarios.length; i++) {
      for (let j = 0; j < suite.scenarios.length; j++) {
        if (i === j) continue;
        
        const parent = suite.scenarios[i];
        const child = suite.scenarios[j];
        
        if (this.isParentChildRelationship(parent, child)) {
          parent.children.push(child.id);
          parent.isLeaf = false;
          child.parent = parent.id;
        }
      }
    }

    // Extract external interactions
    for (const scenario of suite.scenarios) {
      scenario.externalInteractions = this.extractExternalInteractions(scenario);
    }
  }

  private isParentChildRelationship(parent: TestScenario, child: TestScenario): boolean {
    // Check if child's steps are a subset of parent's steps
    const parentStepTexts = parent.steps.map(s => s.text.toLowerCase());
    const childStepTexts = child.steps.map(s => s.text.toLowerCase());
    
    // Child should have fewer steps
    if (childStepTexts.length >= parentStepTexts.length) {
      return false;
    }
    
    // All child steps should exist in parent
    return childStepTexts.every(childStep => 
      parentStepTexts.some(parentStep => parentStep.includes(childStep))
    );
  }

  private detectCommonScenarios(suite: TestSuite, threshold: number = 0.5): void {
    const scenarioUsage = new Map<string, number>();
    
    // Count how many times each scenario appears as a child
    for (const scenario of suite.scenarios) {
      for (const childId of scenario.children) {
        scenarioUsage.set(childId, (scenarioUsage.get(childId) || 0) + 1);
      }
    }
    
    // Find scenarios used in more than threshold of parent scenarios
    const parentCount = suite.scenarios.filter(s => s.children.length > 0).length;
    const minUsage = Math.ceil(parentCount * threshold);
    
    suite.commonScenarios = Array.from(scenarioUsage.entries())
      .filter(([, usage]) => usage >= minUsage)
      .map(([id]) => id);
  }

  private buildSequences(suite: TestSuite): void {
    // Group scenarios by their parent to form sequences
    const parentGroups = new Map<string, string[]>();
    
    for (const scenario of suite.scenarios) {
      if (scenario.parent) {
        const siblings = parentGroups.get(scenario.parent) || [];
        siblings.push(scenario.id);
        parentGroups.set(scenario.parent, siblings);
      }
    }
    
    // Create sequences from parent groups
    let sequenceIndex = 0;
    for (const [parentId, childIds] of parentGroups.entries()) {
      if (childIds.length >= 2) { // Minimum sequence length
        suite.sequences.push({
          id: `seq-${sequenceIndex++}`,
          name: `Sequence for ${this.scenarioMap.get(parentId)?.name || 'Unknown'}`,
          scenarioIds: [parentId, ...childIds],
          isMainFlow: this.scenarioMap.get(parentId)?.isStartup || false
        });
      }
    }
  }

  private extractExternalInteractions(scenario: TestScenario): ExternalInteraction[] {
    const interactions: ExternalInteraction[] = [];
    
    for (const step of scenario.steps) {
      if (step.isHidden) {
        interactions.push({
          type: 'hidden',
          description: step.text,
          stepId: step.id
        });
      }
      
      if (step.isCause) {
        interactions.push({
          type: 'cause',
          description: step.text,
          stepId: step.id
        });
      }
    }
    
    return interactions;
  }

  // Helper methods
  private generateId(input: string): string {
    return crypto.createHash('md5').update(input + Date.now()).digest('hex').substring(0, 8);
  }

  private isStepKeyword(line: string): boolean {
    return /^\s*(Given|When|Then|And|But)\s+/.test(line);
  }

  private extractFeatureName(lines: string[]): string {
    const featureLine = lines.find(l => l.trim().startsWith('Feature:'));
    return featureLine ? featureLine.replace('Feature:', '').trim() : 'Unnamed Feature';
  }

  private extractFeatureDescription(lines: string[]): string {
    const featureIndex = lines.findIndex(l => l.trim().startsWith('Feature:'));
    if (featureIndex === -1) return '';
    
    const descLines: string[] = [];
    for (let i = featureIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('@') || line.startsWith('Background:') || 
          line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
        break;
      }
      descLines.push(line);
    }
    
    return descLines.join(' ').trim();
  }

  private parseBackgroundSteps(lines: string[], startIndex: number): TestStep[] {
    const steps: TestStep[] = [];
    let index = startIndex;
    
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line || line.startsWith('@') || line.startsWith('Scenario:') || 
          line.startsWith('Scenario Outline:')) {
        break;
      }
      
      if (this.isStepKeyword(line)) {
        steps.push(this.parseStep(line, index));
      }
      index++;
    }
    
    return steps;
  }

  private cloneSteps(steps: TestStep[]): TestStep[] {
    return steps.map(step => ({ ...step, id: this.generateId(`clone-${step.id}`) }));
  }

  private parseTags(line: string): string[] {
    return line.split(/\s+/).filter(tag => tag.startsWith('@'));
  }

  private extractTagsBeforeLine(lines: string[], lineIndex: number): string[] {
    const tags: string[] = [];
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith('@')) {
        tags.push(...this.parseTags(line));
      } else {
        break;
      }
    }
    return tags.reverse();
  }

  private parseDocString(lines: string[], startIndex: number): { content: string; endIndex: number } {
    const contentLines: string[] = [];
    let index = startIndex + 1;
    
    while (index < lines.length && !lines[index].trim().startsWith('"""')) {
      contentLines.push(lines[index]);
      index++;
    }
    
    return {
      content: contentLines.join('\n'),
      endIndex: index
    };
  }

  private parseDataTable(lines: string[], startIndex: number): { table: any; endIndex: number } {
    const headers = this.parseTableRow(lines[startIndex]);
    const rows: string[][] = [];
    let index = startIndex + 1;
    
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      rows.push(this.parseTableRow(lines[index]));
      index++;
    }
    
    return {
      table: { headers, rows },
      endIndex: index - 1
    };
  }

  private parseTableRow(line: string): string[] {
    return line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
  }

  private parseExamples(lines: string[], startIndex: number): any[] {
    const examples: any[] = [];
    let index = startIndex + 1;
    
    while (index < lines.length && lines[index].trim().startsWith('|')) {
      const table = this.parseDataTable(lines, index);
      examples.push({
        headers: table.table.headers,
        rows: table.table.rows
      });
      index = table.endIndex + 1;
    }
    
    return examples;
  }

  private skipToNextSection(lines: string[], startIndex: number): number {
    let index = startIndex;
    while (index < lines.length) {
      const line = lines[index].trim();
      if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:') || 
          line.startsWith('Feature:')) {
        return index;
      }
      index++;
    }
    return index;
  }

  private findNextNonEmptyLine(lines: string[], startIndex: number): number {
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim()) return i;
    }
    return lines.length;
  }

  private finalizeScenario(scenario: TestScenario): void {
    // Any final processing for the scenario
    scenario.steps = scenario.steps.map((step, index) => ({
      ...step,
      order: index + 1
    }));
  }
}