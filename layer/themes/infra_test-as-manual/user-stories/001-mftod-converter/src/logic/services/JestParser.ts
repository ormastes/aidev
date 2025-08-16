/**
 * Jest/Mocha Parser Service
 * Parses JavaScript/TypeScript test files using Jest or Mocha syntax
 */

import { TestScenario, TestStep, TestSuite } from '../entities/TestScenario';
import * as ts from 'typescript';

export class JestParser {
  private scenarioCounter = 0;
  private stepCounter = 0;

  /**
   * Parse a test file and extract scenarios
   */
  parseTestFile(filePath: string, content: string): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    try {
      // Parse as TypeScript (also handles JS)
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // Visit nodes to find test blocks
      this.visitNode(sourceFile, scenarios, filePath);
    } catch (error) {
      console.error(`Failed to parse ${filePath}:`, error);
    }

    return scenarios;
  }

  /**
   * Parse multiple test files into a test suite
   */
  parseTestSuite(files: Array<{ path: string; content: string }>): TestSuite {
    const allScenarios: TestScenario[] = [];
    
    for (const file of files) {
      const scenarios = this.parseTestFile(file.path, file.content);
      allScenarios.push(...scenarios);
    }

    // Analyze for common scenarios
    const commonScenarios = this.detectCommonScenarios(allScenarios);
    
    // Build sequences
    const sequences = this.buildSequences(allScenarios);

    return {
      id: 'jest-test-suite',
      name: 'Test Suite',
      description: 'Generated from Jest/Mocha test files',
      scenarios: allScenarios,
      commonScenarios: commonScenarios.map(s => s.id),
      sequences
    };
  }

  /**
   * Visit AST nodes to find test blocks
   */
  private visitNode(
    node: ts.Node,
    scenarios: TestScenario[],
    filePath: string,
    parentDescribe?: string
  ): void {
    // Check for describe blocks
    if (ts.isCallExpression(node)) {
      const callExpr = node as ts.CallExpression;
      const fnName = this.getCallExpressionName(callExpr);
      
      if (fnName === 'describe' || fnName === 'context' || fnName === 'suite') {
        const describeTitle = this.extractStringArgument(callExpr, 0);
        const fullDescribe = parentDescribe 
          ? `${parentDescribe} > ${describeTitle}`
          : describeTitle;
        
        // Visit children with updated context
        ts.forEachChild(node, child => 
          this.visitNode(child, scenarios, filePath, fullDescribe)
        );
        return;
      }
      
      // Check for test blocks
      if (fnName === 'it' || fnName === 'test' || fnName === 'specify') {
        const scenario = this.extractTestScenario(callExpr, filePath, parentDescribe);
        if (scenario) {
          scenarios.push(scenario);
        }
        return;
      }
    }

    // Continue visiting children
    ts.forEachChild(node, child => 
      this.visitNode(child, scenarios, filePath, parentDescribe)
    );
  }

  /**
   * Extract test scenario from test block
   */
  private extractTestScenario(
    node: ts.CallExpression,
    _filePath: string,
    parentDescribe?: string
  ): TestScenario | null {
    const title = this.extractStringArgument(node, 0);
    if (!title) return null;

    const testFunction = node.arguments[1];
    if (!testFunction || !ts.isFunctionLike(testFunction)) return null;

    // Extract steps from test body
    const steps = this.extractTestSteps(testFunction);
    
    // Extract tags from test title or comments
    const tags = this.extractTags(title, node);

    const scenario: TestScenario = {
      id: `scenario-${++this.scenarioCounter}`,
      name: title,
      description: parentDescribe ? `Part of: ${parentDescribe}` : undefined,
      steps,
      tags,
      isLeaf: true,
      isStartup: title.toLowerCase().includes('setup') || 
                 title.toLowerCase().includes('initialize'),
      parent: undefined,
      children: [],
      externalInteractions: []
    };

    return scenario;
  }

  /**
   * Extract test steps from test function body
   */
  private extractTestSteps(fn: ts.FunctionLikeDeclaration): TestStep[] {
    const steps: TestStep[] = [];
    let stepOrder = 0;
    
    if (!fn.body || !ts.isBlock(fn.body)) return steps;

    // Visit statements in the test body
    fn.body.statements.forEach(statement => {
      const step = this.extractStepFromStatement(statement, ++stepOrder);
      if (step) {
        steps.push(step);
      }
    });

    // If no explicit steps found, create basic ones
    if (steps.length === 0) {
      steps.push({
        id: `step-${++this.stepCounter}`,
        keyword: 'When',
        text: 'Execute test logic',
        isHidden: false,
        isCause: false,
        order: 1
      });
      steps.push({
        id: `step-${++this.stepCounter}`,
        keyword: 'Then',
        text: 'Verify expected results',
        isHidden: false,
        isCause: false,
        order: 2
      });
    }

    return steps;
  }

  /**
   * Extract step from a statement
   */
  private extractStepFromStatement(statement: ts.Statement, order: number): TestStep | null {
    // Handle expect() calls
    if (ts.isExpressionStatement(statement)) {
      const expr = statement.expression;
      
      // Check for expect() assertions
      if (ts.isCallExpression(expr)) {
        const callName = this.getCallExpressionName(expr);
        
        if (callName === 'expect') {
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'Then',
            text: this.extractExpectDescription(expr),
            isHidden: false,
            isCause: false,
            order
          };
        }
        
        // Check for action calls (click, type, etc.)
        if (this.isActionCall(callName)) {
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'When',
            text: this.extractActionDescription(expr),
            isHidden: false,
            isCause: this.isExternalAction(callName),
            order
          };
        }
      }
      
      // Handle await expressions
      if (ts.isAwaitExpression(expr) && ts.isCallExpression(expr.expression)) {
        const callName = this.getCallExpressionName(expr.expression);
        
        if (this.isActionCall(callName)) {
          return {
            id: `step-${++this.stepCounter}`,
            keyword: 'When',
            text: this.extractActionDescription(expr.expression),
            isHidden: false,
            isCause: this.isExternalAction(callName),
            order
          };
        }
      }
    }

    // Handle variable declarations (setup steps)
    if (ts.isVariableStatement(statement)) {
      const decl = statement.declarationList.declarations[0];
      if (decl && decl.initializer) {
        return {
          id: `step-${++this.stepCounter}`,
          keyword: 'Given',
          text: `Set up ${decl.name.getText()}`,
          isHidden: false,
          isCause: false,
          order
        };
      }
    }

    // Handle beforeEach/afterEach in test body
    if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
      const callName = this.getCallExpressionName(statement.expression);
      
      if (callName === 'beforeEach' || callName === 'beforeAll') {
        return {
          id: `step-${++this.stepCounter}`,
          keyword: 'Given',
          text: 'Execute setup',
          isHidden: true,
          isCause: false,
          order
        };
      }
    }

    return null;
  }

  /**
   * Extract description from expect() call
   */
  private extractExpectDescription(expr: ts.CallExpression): string {
    let description = 'Verify ';
    
    // Get what we're expecting
    if (expr.arguments.length > 0) {
      const arg = expr.arguments[0];
      description += this.simplifyExpression(arg);
    }
    
    // Get matcher
    let current: ts.Expression = expr;
    while (ts.isPropertyAccessExpression(current.parent) || 
           ts.isCallExpression(current.parent)) {
      const parent = current.parent;
      
      if (ts.isPropertyAccessExpression(parent)) {
        const matcher = parent.name.text;
        if (matcher.startsWith('to')) {
          description += ` ${this.humanizeMatcher(matcher)}`;
        }
      } else if (ts.isCallExpression(parent) && parent.arguments.length > 0) {
        description += ` ${this.simplifyExpression(parent.arguments[0])}`;
      }
      
      current = parent;
    }
    
    return description;
  }

  /**
   * Extract description from action call
   */
  private extractActionDescription(expr: ts.CallExpression): string {
    const fnName = this.getCallExpressionName(expr);
    
    // Map common actions to descriptions
    const actionMap: Record<string, string> = {
      'click': 'Click on',
      'type': 'Type',
      'fill': 'Fill',
      'select': 'Select',
      'check': 'Check',
      'uncheck': 'Uncheck',
      'hover': 'Hover over',
      'focus': 'Focus on',
      'blur': 'Blur',
      'submit': 'Submit',
      'navigate': 'Navigate to',
      'goto': 'Go to',
      'waitFor': 'Wait for',
      'find': 'Find',
      'get': 'Get'
    };
    
    let description = actionMap[fnName] || fnName;
    
    // Add arguments
    if (expr.arguments.length > 0) {
      const argTexts = expr.arguments
        .slice(0, 2) // Limit to first 2 args
        .map(arg => this.simplifyExpression(arg))
        .filter(text => text.length > 0);
      
      if (argTexts.length > 0) {
        description += ' ' + argTexts.join(' ');
      }
    }
    
    return description;
  }

  /**
   * Check if a function name is an action
   */
  private isActionCall(name: string): boolean {
    const actions = [
      'click', 'type', 'fill', 'select', 'check', 'uncheck',
      'hover', 'focus', 'blur', 'submit', 'navigate', 'goto',
      'waitFor', 'find', 'get', 'query', 'press', 'clear',
      'upload', 'download', 'scroll', 'drag', 'drop'
    ];
    
    return actions.includes(name.toLowerCase());
  }

  /**
   * Check if action is external
   */
  private isExternalAction(name: string): boolean {
    const externalActions = [
      'navigate', 'goto', 'fetch', 'request', 'post', 'put',
      'delete', 'upload', 'download', 'submit'
    ];
    
    return externalActions.includes(name.toLowerCase());
  }

  /**
   * Simplify an expression to readable text
   */
  private simplifyExpression(expr: ts.Expression): string {
    if (ts.isStringLiteral(expr)) {
      return `"${expr.text}"`;
    }
    
    if (ts.isNumericLiteral(expr)) {
      return expr.text;
    }
    
    if (ts.isIdentifier(expr)) {
      return expr.text;
    }
    
    if (ts.isPropertyAccessExpression(expr)) {
      return `${this.simplifyExpression(expr.expression)}.${expr.name.text}`;
    }
    
    if (ts.isCallExpression(expr)) {
      const fnName = this.getCallExpressionName(expr);
      return `${fnName}()`;
    }
    
    return expr.getText().substring(0, 30);
  }

  /**
   * Get function name from call expression
   */
  private getCallExpressionName(expr: ts.CallExpression): string {
    if (ts.isIdentifier(expr.expression)) {
      return expr.expression.text;
    }
    
    if (ts.isPropertyAccessExpression(expr.expression)) {
      return expr.expression.name.text;
    }
    
    return '';
  }

  /**
   * Extract string argument from call expression
   */
  private extractStringArgument(expr: ts.CallExpression, index: number): string {
    if (expr.arguments.length > index) {
      const arg = expr.arguments[index];
      if (ts.isStringLiteral(arg)) {
        return arg.text;
      }
      if (ts.isTemplateExpression(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        return arg.getText().slice(1, -1); // Remove backticks
      }
    }
    return '';
  }

  /**
   * Extract tags from title and comments
   */
  private extractTags(title: string, node: ts.Node): string[] {
    const tags: string[] = [];
    
    // Extract @tags from title
    const tagMatches = title.matchAll(/@(\w+)/g);
    for (const match of tagMatches) {
      tags.push(`@${match[1]}`);
    }
    
    // Check for skip/only modifiers
    const sourceText = node.getFullText();
    if (sourceText.includes('.skip')) {
      tags.push('@skip');
    }
    if (sourceText.includes('.only')) {
      tags.push('@only');
    }
    
    // Add category based on common patterns
    if (title.includes('API') || title.includes('endpoint')) {
      tags.push('@api');
    }
    if (title.includes('UI') || title.includes('component')) {
      tags.push('@ui');
    }
    if (title.includes('integration')) {
      tags.push('@integration');
    }
    
    return tags;
  }

  /**
   * Humanize matcher names
   */
  private humanizeMatcher(matcher: string): string {
    const matchers: Record<string, string> = {
      'toBe': 'is',
      'toEqual': 'equals',
      'toMatch': 'matches',
      'toBeTruthy': 'is truthy',
      'toBeFalsy': 'is falsy',
      'toBeNull': 'is null',
      'toBeUndefined': 'is undefined',
      'toBeDefined': 'is defined',
      'toContain': 'contains',
      'toHaveLength': 'has length',
      'toBeGreaterThan': 'is greater than',
      'toBeLessThan': 'is less than',
      'toHaveBeenCalled': 'was called',
      'toHaveBeenCalledWith': 'was called with',
      'toThrow': 'throws',
      'toBeVisible': 'is visible',
      'toBeDisabled': 'is disabled',
      'toBeEnabled': 'is enabled',
      'toHaveClass': 'has class',
      'toHaveText': 'has text',
      'toHaveValue': 'has value'
    };
    
    return matchers[matcher] || matcher.replace(/^to/, '').toLowerCase();
  }

  /**
   * Detect common scenarios (used frequently)
   */
  private detectCommonScenarios(scenarios: TestScenario[]): TestScenario[] {
    // Count step patterns
    const stepPatterns = new Map<string, Set<string>>();
    
    for (const scenario of scenarios) {
      const pattern = this.getStepPattern(scenario);
      if (!stepPatterns.has(pattern)) {
        stepPatterns.set(pattern, new Set());
      }
      stepPatterns.get(pattern)!.add(scenario.id);
    }
    
    // Find patterns used in >50% of scenarios
    const threshold = scenarios.length * 0.5;
    const commonIds = new Set<string>();
    
    for (const [_, ids] of stepPatterns) {
      if (ids.size >= threshold) {
        ids.forEach(id => commonIds.add(id));
      }
    }
    
    return scenarios.filter(s => commonIds.has(s.id));
  }

  /**
   * Get step pattern for comparison
   */
  private getStepPattern(scenario: TestScenario): string {
    return scenario.steps
      .map(s => `${s.keyword}:${this.normalizeStepText(s.text)}`)
      .join('|');
  }

  /**
   * Normalize step text for comparison
   */
  private normalizeStepText(text: string): string {
    return text
      .toLowerCase()
      .replace(/"[^"]+"/g, '""')  // Replace string literals
      .replace(/\d+/g, '#')        // Replace numbers
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();
  }

  /**
   * Build test sequences from scenarios
   */
  private buildSequences(scenarios: TestScenario[]): any[] {
    const sequences: any[] = [];
    
    // Group scenarios by their parent describe block
    const groups = new Map<string, TestScenario[]>();
    
    for (const scenario of scenarios) {
      const group = scenario.description?.replace('Part of: ', '') || 'default';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(scenario);
    }
    
    // Create sequences from groups
    let sequenceId = 0;
    for (const [groupName, groupScenarios] of groups) {
      if (groupScenarios.length >= 2) {
        sequences.push({
          id: `seq-${++sequenceId}`,
          name: groupName,
          scenarioIds: groupScenarios.map(s => s.id),
          isMainFlow: groupName.toLowerCase().includes('main') ||
                      groupName.toLowerCase().includes('primary')
        });
      }
    }
    
    return sequences;
  }
}