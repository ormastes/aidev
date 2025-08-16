/**
 * Cypress Parser Plugin
 * Parses Cypress test files and converts to test suite format
 */

import { BaseParserPlugin } from '../../logic/plugin/PluginSystem';
import { TestSuite, TestScenario, TestStep } from '../../logic/entities/TestScenario';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

export default class CypressParserPlugin extends BaseParserPlugin {
  name = 'cypress-parser';
  version = '1.0.0';
  description = 'Parse Cypress test files (.cy.js, .cy.ts)';
  supportedExtensions = ['.cy.js', '.cy.ts', '.cy.jsx', '.cy.tsx'];

  private scenarioCounter = 0;
  private stepCounter = 0;

  async parse(content: string, filePath: string): Promise<TestSuite> {
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });

    const scenarios: TestScenario[] = [];

    traverse(ast, {
      CallExpression: (path) => {
        const { node } = path;
        if (this.isCypressDescribe(node)) {
          this.parseDescribeBlock(node, scenarios);
        } else if (this.isCypressIt(node)) {
          const scenario = this.parseItBlock(node);
          if (scenario) {
            scenarios.push(scenario);
          }
        }
      }
    });

    return {
      id: `cypress-suite-${Date.now()}`,
      name: this.extractSuiteName(filePath),
      description: 'Cypress E2E Test Suite',
      scenarios,
      commonScenarios: [],
      sequences: []
    };
  }

  private isCypressDescribe(node: any): boolean {
    return node.callee?.name === 'describe' || 
           node.callee?.name === 'context';
  }

  private isCypressIt(node: any): boolean {
    return node.callee?.name === 'it' || 
           node.callee?.name === 'specify';
  }

  private parseDescribeBlock(node: any, scenarios: TestScenario[]): void {
    const title = this.extractStringValue(node.arguments[0]);
    const callback = node.arguments[1];
    
    if (callback?.body?.body) {
      callback.body.body.forEach((statement: any) => {
        if (statement.type === 'ExpressionStatement' && 
            this.isCypressIt(statement.expression)) {
          const scenario = this.parseItBlock(statement.expression);
          if (scenario) {
            scenario.description = `Part of: ${title}`;
            scenarios.push(scenario);
          }
        }
      });
    }
  }

  private parseItBlock(node: any): TestScenario | null {
    const title = this.extractStringValue(node.arguments[0]);
    if (!title) return null;

    const callback = node.arguments[1];
    const steps = this.extractCypressSteps(callback);

    return {
      id: `scenario-${++this.scenarioCounter}`,
      name: title,
      steps,
      tags: this.extractTags(title),
      isLeaf: true,
      isStartup: false,
      children: [],
      externalInteractions: []
    };
  }

  private extractCypressSteps(callback: any): TestStep[] {
    const steps: TestStep[] = [];
    let order = 1;

    if (!callback?.body?.body) return steps;

    callback.body.body.forEach((statement: any) => {
      if (statement.type === 'ExpressionStatement') {
        const step = this.parseCypressCommand(statement.expression, order);
        if (step) {
          steps.push(step);
          order++;
        }
      }
    });

    return steps;
  }

  private parseCypressCommand(expr: any, order: number): TestStep | null {
    // Handle cy.command() pattern
    if (expr.type === 'CallExpression' && 
        expr.callee?.type === 'MemberExpression' &&
        expr.callee?.object?.name === 'cy') {
      
      const command = expr.callee.property?.name;
      const args = expr.arguments;

      switch (command) {
        case 'visit':
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'Given',
            text: `I visit ${this.extractStringValue(args[0]) || 'the page'}`,
            isHidden: false,
            isCause: false,
            order
          };

        case 'get':
        case 'contains':
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'When',
            text: `I select element ${this.extractStringValue(args[0]) || 'on page'}`,
            isHidden: false,
            isCause: false,
            order
          };

        case 'click':
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'When',
            text: `I click the element`,
            isHidden: false,
            isCause: false,
            order
          };

        case 'type':
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'When',
            text: `I type "${this.extractStringValue(args[0]) || 'text'}"`,
            isHidden: false,
            isCause: false,
            order
          };

        case 'should':
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'Then',
            text: `Element should ${args[0]?.value || 'match expectation'}`,
            isHidden: false,
            isCause: false,
            order
          };

        default:
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'When',
            text: `Execute ${command} command`,
            isHidden: false,
            isCause: false,
            order
          };
      }
    }

    // Handle chained commands
    if (expr.type === 'CallExpression' && 
        expr.callee?.type === 'MemberExpression') {
      return this.parseCypressCommand(expr.callee.object, order);
    }

    return null;
  }

  private extractStringValue(node: any): string | null {
    if (node?.type === 'StringLiteral') {
      return node.value;
    }
    if (node?.type === 'TemplateLiteral') {
      return node.quasis.map((q: any) => q.value.cooked).join('');
    }
    return null;
  }

  private extractTags(title: string): string[] {
    const tags: string[] = [];
    
    if (title.includes('smoke')) tags.push('@smoke');
    if (title.includes('regression')) tags.push('@regression');
    if (title.includes('critical')) tags.push('@critical');
    if (title.includes('e2e')) tags.push('@e2e');
    
    return tags;
  }

  private extractSuiteName(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'cypress-tests';
    return fileName.replace(/\.cy\.(js|ts|jsx|tsx)$/, '');
  }
}