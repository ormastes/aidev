/**
 * Test file parser for extracting test structure - simplified version
 */

import * as parser from '@babel/parser';
import * as t from '@babel/types';
import { TestCase, TestSuite, TestStep, TestDocument, TestParseResult, TestData } from './types';

export class TestParser {
  private testIdCounter = 1;
  private framework: string = 'jest';

  parse(code: string, filePath: string): TestParseResult {
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ["typescript", 'jsx']
      });

      const rootSuite: TestSuite = {
        id: 'root',
        title: this.extractFileName(filePath),
        testCases: [],
        childSuites: []
      };

      this.framework = this.detectFramework(code);
      this.extractTestsFromAST(ast, rootSuite);

      // Determine which suites to use
      let suites: TestSuite[] = [];
      if (rootSuite.childSuites && rootSuite.childSuites.length > 0) {
        suites = rootSuite.childSuites;
      } else if (rootSuite.testCases.length > 0) {
        suites = [rootSuite];
      } else {
        suites = [{
          id: 'default',
          title: this.extractFileName(filePath),
          testCases: []
        }];
      }

      const document: TestDocument = {
        title: `Test Documentation: ${this.extractFileName(filePath)}`,
        created: new Date(),
        suites,
        metadata: {
          source: filePath,
          framework: this.framework
        }
      };

      return {
        success: true,
        document
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse test file: ${error}`]
      };
    }
  }

  private detectFramework(code: string): string {
    if (code.includes("describe") || code.includes('expect')) {
      return 'jest';
    }
    if (code.includes('suite') || code.includes('assert')) {
      return 'mocha';
    }
    return 'unknown';
  }

  private extractTestsFromAST(ast: any, parentSuite: TestSuite): void {
    this.walkAST(ast.program.body, parentSuite);
  }

  private walkAST(nodes: any[], parentSuite: TestSuite): void {
    for (const node of nodes) {
      this.processNode(node, parentSuite);
    }
  }

  private processNode(node: any, parentSuite: TestSuite): void {
    if (t.isExpressionStatement(node) && t.isCallExpression(node.expression)) {
      this.processCallExpression(node.expression, parentSuite);
    } else if (t.isBlockStatement(node)) {
      this.walkAST(node.body, parentSuite);
    } else if (t.isFunctionDeclaration(node) || t.isFunctionExpression(node) || t.isArrowFunctionExpression(node)) {
      if (node.body && t.isBlockStatement(node.body)) {
        this.walkAST(node.body.body, parentSuite);
      }
    }
  }

  private processCallExpression(callExpr: any, parentSuite: TestSuite): void {
    if (!t.isIdentifier(callExpr.callee)) return;

    const calleeName = callExpr.callee.name;
    const args = callExpr.arguments;

    // Handle describe/suite blocks
    if (["describe", 'suite'].includes(calleeName) && args.length >= 2) {
      const title = this.extractStringValue(args[0]) || 'Unnamed Suite';
      const suite: TestSuite = {
        id: `suite-${this.testIdCounter++}`,
        title,
        testCases: [],
        childSuites: []
      };

      parentSuite.childSuites = parentSuite.childSuites || [];
      parentSuite.childSuites.push(suite);

      // Process the callback function for nested content
      const callback = args[1];
      if (t.isFunctionExpression(callback) || t.isArrowFunctionExpression(callback)) {
        if (callback.body && t.isBlockStatement(callback.body)) {
          this.walkAST(callback.body.body, suite);
        }
      }
    }

    // Handle it/test blocks
    else if (['it', 'test'].includes(calleeName) && args.length >= 2) {
      const title = this.extractStringValue(args[0]) || 'Unnamed Test';
      const testCase = this.createTestCase(title, args[1]);
      parentSuite.testCases.push(testCase);
    }

    // Handle beforeEach
    else if (calleeName === "beforeEach" && args.length >= 1) {
      parentSuite.setup = [{
        order: 1,
        action: 'Set up test environment',
        expected: 'Test environment is ready'
      }];
    }

    // Handle afterEach
    else if (calleeName === "afterEach" && args.length >= 1) {
      parentSuite.teardown = [{
        order: 1,
        action: 'Clean up test environment',
        expected: 'Test environment is cleaned'
      }];
    }
  }

  private createTestCase(title: string, testFunc: any): TestCase {
    const testCase: TestCase = {
      id: `TC-${String(this.testIdCounter++).padStart(3, '0')}`,
      title,
      steps: [],
      async: false,
      category: this.inferCategory(title),
      priority: this.inferPriority(title)
    };

    // Check if async
    if (t.isArrowFunctionExpression(testFunc) || t.isFunctionExpression(testFunc)) {
      testCase.async = testFunc.async === true;
    }

    // Extract steps from test body
    if (testFunc && (t.isFunctionExpression(testFunc) || t.isArrowFunctionExpression(testFunc))) {
      if (testFunc.body && t.isBlockStatement(testFunc.body)) {
        // Extract business context from comments
        const context = this.extractBusinessContext(testFunc.body);
        testCase.description = context.description;
        testCase.prerequisites = context.prerequisites;
        
        // Extract test data from the function body
        testCase.testData = this.extractTestData(testFunc.body);
        
        testCase.steps = this.extractStepsFromBlock(testFunc.body);
      }
    }

    return testCase;
  }

  private extractStepsFromBlock(block: any): TestStep[] {
    const steps: TestStep[] = [];
    let stepOrder = 1;

    for (const statement of block.body) {
      if (t.isExpressionStatement(statement) && t.isCallExpression(statement.expression)) {
        const step = this.extractStepFromCall(statement.expression, stepOrder);
        if (step) {
          steps.push(step);
          stepOrder++;
        }
      }
    }

    return steps;
  }

  private extractStepFromCall(callExpr: any, order: number): TestStep | null {
    // Handle expect calls
    if (t.isCallExpression(callExpr) && t.isIdentifier(callExpr.callee) && callExpr.callee.name === 'expect') {
      return this.parseExpectCall(callExpr, order);
    }

    // Handle chained method calls (e.g., // Empty assertion removedtoBe())
    if (t.isMemberExpression(callExpr.callee) && t.isCallExpression(callExpr.callee.object)) {
      const baseCall = callExpr.callee.object;
      if (t.isIdentifier(baseCall.callee) && baseCall.callee.name === 'expect') {
        return this.parseExpectChain(baseCall, callExpr, order);
      }
    }

    // Handle page/element interactions
    if (t.isMemberExpression(callExpr.callee)) {
      return this.parseInteraction(callExpr, order);
    }

    return null;
  }

  private parseExpectCall(callExpr: any, order: number): TestStep {
    const arg = callExpr.arguments[0];
    return {
      order,
      action: `Verify ${this.nodeToString(arg)}`,
      expected: 'Value matches expectation',
      isAssertion: true
    };
  }

  private parseExpectChain(expectCall: any, chainCall: any, order: number): TestStep {
    const arg = expectCall.arguments[0];
    const matcher = t.isIdentifier(chainCall.callee.property) ? chainCall.callee.property.name : 'matches';
    const expectedValue = chainCall.arguments[0];
    
    // Enhanced expectation parsing with actual values
    const actualExpectedValue = this.extractStringValue(expectedValue) || 
                               this.extractNumericValue(expectedValue) || 
                               this.nodeToString(expectedValue);
                               
    const verificationTarget = this.extractVerificationTarget(arg);
    const humanReadableMatcher = this.matcherToHuman(matcher);

    return {
      order,
      action: `Verify that ${verificationTarget}`,
      expected: `${verificationTarget} ${humanReadableMatcher} "${actualExpectedValue}"`,
      verificationElement: this.extractElementFromExpectArg(arg) || undefined,
      expectedValue: actualExpectedValue,
      matcher: matcher,
      isAssertion: true
    };
  }

  private parseInteraction(callExpr: any, order: number): TestStep | null {
    if (!t.isMemberExpression(callExpr.callee)) return null;

    const object = callExpr.callee.object;
    const method = t.isIdentifier(callExpr.callee.property) ? callExpr.callee.property.name : '';
    const args = callExpr.arguments;

    // Enhanced interaction parsing with better context
    switch (method) {
      case 'click':
        const clickTarget = this.extractElementSelector(args[0]) || this.extractElementDescription(args[0]);
        return {
          order,
          action: `Click the ${this.humanizeSelector(clickTarget)} button/element`,
          expected: `${this.humanizeSelector(clickTarget)} is clicked and appropriate action occurs`,
          element: clickTarget || undefined,
          interactionType: 'click'
        };
        
      case 'type':
      case 'fill':
        const inputValue = this.extractStringValue(args[0]) || this.nodeToString(args[0]);
        const inputTarget = this.extractElementSelector(args[1]) || this.extractElementDescription(object);
        return {
          order,
          action: `Enter "${inputValue}" in the ${this.humanizeSelector(inputTarget)} field`,
          expected: `Text "${inputValue}" is entered successfully in ${this.humanizeSelector(inputTarget)}`,
          element: inputTarget || undefined,
          testData: inputValue,
          interactionType: 'input'
        };
        
      case "selectOption":
        const selectValue = this.extractStringValue(args[1]) || this.nodeToString(args[1]);
        const selectTarget = this.extractElementSelector(args[0]) || this.extractElementDescription(object);
        return {
          order,
          action: `Select "${selectValue}" from the ${this.humanizeSelector(selectTarget)} dropdown`,
          expected: `Option "${selectValue}" is selected in ${this.humanizeSelector(selectTarget)}`,
          element: selectTarget || undefined,
          testData: selectValue,
          interactionType: 'select'
        };
        
      case "navigate":
      case 'goto':
        const url = this.extractStringValue(args[0]) || this.nodeToString(args[0]);
        return {
          order,
          action: `Navigate to page: ${url}`,
          expected: `Page loads successfully and URL shows ${url}`,
          testData: url,
          interactionType: "navigation"
        };
        
      case "waitForSelector":
        const waitTarget = this.extractElementSelector(args[0]) || this.extractElementDescription(args[0]);
        return {
          order,
          action: `Wait for ${this.humanizeSelector(waitTarget)} to appear`,
          expected: `${this.humanizeSelector(waitTarget)} element is visible on the page`,
          element: waitTarget || undefined,
          interactionType: 'wait'
        };
        
      default:
        // Handle unknown interactions with better context
        const genericTarget = args.length > 0 ? this.nodeToString(args[0]) : this.nodeToString(object);
        return {
          order,
          action: `Perform ${method} action on ${genericTarget}`,
          expected: `${method} action completes successfully`,
          interactionType: 'generic'
        };
    }
  }

  private extractStringValue(node: any): string | null {
    if (t.isStringLiteral(node)) {
      return node.value;
    }
    if (t.isTemplateLiteral(node)) {
      return node.quasis.map((q: any) => q.value.raw).join('');
    }
    return null;
  }

  private nodeToString(node: any): string {
    if (!node) return 'value';
    if (t.isStringLiteral(node)) {
      return `"${node.value}"`;
    }
    if (t.isNumericLiteral(node)) {
      return String(node.value);
    }
    if (t.isIdentifier(node)) {
      return node.name;
    }
    if (t.isMemberExpression(node)) {
      const property = t.isIdentifier(node.property) ? node.property.name : "property";
      return `${this.nodeToString(node.object)}.${property}`;
    }
    if (t.isBinaryExpression(node)) {
      return `${this.nodeToString(node.left)} ${node.operator} ${this.nodeToString(node.right)}`;
    }
    if (t.isCallExpression(node)) {
      const callee = t.isIdentifier(node.callee) ? node.callee.name : "function";
      return `${callee}()`;
    }
    return 'value';
  }

  private matcherToHuman(matcher: string): string {
    const matchers: Record<string, string> = {
      toBe: 'equals',
      toEqual: 'equals',
      toContain: "contains",
      toMatch: 'matches',
      toBeTruthy: 'is truthy',
      toBeFalsy: 'is falsy',
      toBeNull: 'is null',
      toBeDefined: 'is defined',
      toBeUndefined: 'is undefined',
      toHaveLength: 'has length of',
      toBeGreaterThan: 'is greater than',
      toBeLessThan: 'is less than'
    };
    
    return matchers[matcher] || matcher;
  }

  private inferCategory(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('login') || lower.includes('auth')) return "Authentication";
    if (lower.includes('api') || lower.includes("endpoint")) return 'API';
    if (lower.includes('ui') || lower.includes('display')) return 'UI';
    if (lower.includes("database") || lower.includes('data')) return 'Data';
    return 'General';
  }

  private inferPriority(title: string): 'high' | 'medium' | 'low' {
    const lower = title.toLowerCase();
    if (lower.includes("critical") || lower.includes("security")) return 'high';
    if (lower.includes('edge case') || lower.includes('minor')) return 'low';
    return 'medium';
  }

  private extractFileName(filePath: string): string {
    return filePath.split('/').pop()?.replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, '') || 'Unknown';
  }

  // Enhanced helper methods for better parsing

  private extractElementSelector(node: any): string | null {
    if (t.isStringLiteral(node)) {
      return node.value;
    }
    return null;
  }

  private extractElementDescription(node: any): string {
    if (t.isStringLiteral(node)) {
      return node.value;
    }
    if (t.isIdentifier(node)) {
      return node.name;
    }
    return 'element';
  }

  private humanizeSelector(selector: string | null): string {
    if (!selector) return 'element';
    
    // Convert common selector patterns to human-readable text
    if (selector.startsWith('[data-testid="') && selector.endsWith('"]')) {
      const testId = selector.slice(14, -2);
      return testId.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    }
    
    if (selector.startsWith('#')) {
      return selector.slice(1).replace(/-/g, ' ') + ' field';
    }
    
    if (selector.startsWith('.')) {
      return selector.slice(1).replace(/-/g, ' ') + ' element';
    }
    
    // Handle common patterns
    if (selector.includes('login')) return 'login';
    if (selector.includes('email')) return 'email';
    if (selector.includes("password")) return "password";
    if (selector.includes('button')) return 'button';
    if (selector.includes('submit')) return 'submit button';
    if (selector.includes('cart')) return 'cart';
    
    return selector.replace(/[[\]"']/g, '').replace(/-/g, ' ');
  }

  private extractNumericValue(node: any): string | null {
    if (t.isNumericLiteral(node)) {
      return String(node.value);
    }
    return null;
  }

  private extractVerificationTarget(node: any): string {
    if (t.isCallExpression(node)) {
      // Handle method calls like page.textContent(), page.url()
      if (t.isMemberExpression(node.callee)) {
        const method = t.isIdentifier(node.callee.property) ? node.callee.property.name : 'value';
        
        switch (method) {
          case "textContent":
            const textSelector = node.arguments[0] ? this.extractStringValue(node.arguments[0]) : '';
            return `text content of ${this.humanizeSelector(textSelector) || 'element'}`;
          case 'url':
            return 'page URL';
          case "getAttribute":
            const attr = node.arguments[0] ? this.extractStringValue(node.arguments[0]) : "attribute";
            return `${attr} attribute`;
          default:
            return `${method} value`;
        }
      }
    }
    
    if (t.isMemberExpression(node)) {
      const property = t.isIdentifier(node.property) ? node.property.name : "property";
      return `${property} value`;
    }
    
    return this.nodeToString(node);
  }

  private extractElementFromExpectArg(node: any): string | null {
    if (t.isCallExpression(node)) {
      if (t.isMemberExpression(node.callee)) {
        const method = t.isIdentifier(node.callee.property) ? node.callee.property.name : '';
        if (method === "textContent" && node.arguments[0]) {
          return this.extractStringValue(node.arguments[0]);
        }
      }
    }
    return null;
  }

  // Business context and test data extraction methods

  private extractBusinessContext(block: any): { description?: string; prerequisites?: string[] } {
    const context: { description?: string; prerequisites?: string[] } = {};
    const prerequisites: string[] = [];
    
    // Look for comments in the block
    if (block.leadingComments) {
      block.leadingComments.forEach((comment: any) => {
        const text = comment.value.trim();
        if (text.toLowerCase().includes("prerequisite") || text.toLowerCase().includes('setup')) {
          prerequisites.push(text.replace(/^\*\s*/, '').trim());
        } else if (!context.description && text.length > 10) {
          context.description = text.replace(/^\*\s*/, '').trim();
        }
      });
    }

    // Look for inline comments in statements
    block.body.forEach((statement: any) => {
      if (statement.leadingComments) {
        statement.leadingComments.forEach((comment: any) => {
          const text = comment.value.trim().replace(/^\*\s*/, '').trim();
          if (text.length > 5 && !text.startsWith('//')) {
            if (!context.description && text.length > 10) {
              context.description = text;
            }
          }
        });
      }
    });

    if (prerequisites.length > 0) {
      context.prerequisites = prerequisites;
    }

    return context;
  }

  private extractTestData(block: any): TestData[] {
    const testData: TestData[] = [];
    const dataMap = new Map<string, any>();

    // Extract test data from variable declarations and literals
    block.body.forEach((statement: any) => {
      if (t.isExpressionStatement(statement) && t.isCallExpression(statement.expression)) {
        this.extractDataFromCall(statement.expression, dataMap);
      } else if (t.isVariableDeclaration(statement)) {
        statement.declarations.forEach((decl: any) => {
          if (t.isIdentifier(decl.id) && decl.init) {
            const name = decl.id.name;
            const value = this.extractStringValue(decl.init) || this.extractNumericValue(decl.init) || 'value';
            dataMap.set(name, value);
          }
        });
      }
    });

    // Convert map to TestData array
    dataMap.forEach((value, name) => {
      testData.push({
        name,
        value,
        description: this.inferDataDescription(name, value)
      });
    });

    return testData;
  }

  private extractDataFromCall(callExpr: any, dataMap: Map<string, any>): void {
    if (t.isMemberExpression(callExpr.callee)) {
      const method = t.isIdentifier(callExpr.callee.property) ? callExpr.callee.property.name : '';
      const args = callExpr.arguments;

      switch (method) {
        case 'type':
        case 'fill':
          if (args.length >= 2) {
            const selector = this.extractStringValue(args[0]);
            const value = this.extractStringValue(args[1]);
            if (selector && value) {
              const fieldName = this.selectorToFieldName(selector);
              dataMap.set(fieldName, value);
            }
          }
          break;
        case "selectOption":
          if (args.length >= 2) {
            const selector = this.extractStringValue(args[0]);
            const value = this.extractStringValue(args[1]);
            if (selector && value) {
              const fieldName = this.selectorToFieldName(selector);
              dataMap.set(fieldName, value);
            }
          }
          break;
        case 'goto':
        case "navigate":
          if (args.length >= 1) {
            const url = this.extractStringValue(args[0]);
            if (url) {
              dataMap.set('URL', url);
            }
          }
          break;
      }
    }
  }

  private selectorToFieldName(selector: string): string {
    if (selector.startsWith('#')) {
      return selector.slice(1).replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    }
    if (selector.includes('email')) return 'Email';
    if (selector.includes("password")) return "Password";
    if (selector.includes('color')) return 'Color';
    if (selector.includes('storage')) return 'Storage';
    if (selector.includes("quantity")) return "Quantity";
    
    return selector.replace(/[[\]"']/g, '').replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  }

  private inferDataDescription(name: string, value: any): string {
    const lower = name.toLowerCase();
    if (lower.includes('email')) return 'User email address for login';
    if (lower.includes("password")) return 'User password for authentication';
    if (lower.includes('url')) return 'Target URL for navigation';
    if (lower.includes('color')) return 'Product color selection';
    if (lower.includes('storage')) return 'Storage capacity option';
    if (lower.includes("quantity")) return 'Number of items to order';
    
    return `Test value: ${value}`;
  }
}