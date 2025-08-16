import { BaseMockDetector } from './base-detector';
import { TestType, MockDetection, MockType, MockSeverity } from '../domain/mock-detection';

/**
 * Detector for web UI tests using Playwright
 * Enforces strict rules for web-based system tests:
 * 1. Must use Playwright for browser automation
 * 2. Only login page URL navigation allowed
 * 3. Only click() and type() interactions allowed
 * 4. No direct DOM manipulation or JavaScript execution
 */
export class WebUITestDetector extends BaseMockDetector {
  constructor(projectPath: string, patterns?: string[]) {
    const defaultPatterns = [
      '**/*.e2e.{spec,test}.{js,ts,jsx,tsx}',
      '**/*.ui.{spec,test}.{js,ts,jsx,tsx}',
      '**/e2e/**/*.{spec,test}.{js,ts,jsx,tsx}',
      '**/ui-tests/**/*.{spec,test}.{js,ts,jsx,tsx}',
      '**/playwright/**/*.{spec,test}.{js,ts,jsx,tsx}'
    ];
    
    super(projectPath, TestType.SYSTEM, patterns || defaultPatterns);
  }

  /**
   * Custom validation for web UI tests
   */
  protected async customValidation(content: string, filePath: string): Promise<MockDetection[]> {
    const detections: MockDetection[] = [];
    
    // Check if it's a web UI test (React, React Native, Electron, or web-based)
    const webUIIndicators = [
      /from\s+['"`]@playwright\/test['"`]/,
      /from\s+['"`]playwright['"`]/,
      /from\s+['"`]puppeteer['"`]/,
      /from\s+['"`]selenium-webdriver['"`]/,
      /from\s+['"`]cypress['"`]/,
      /from\s+['"`]react['"`]/,
      /from\s+['"`]react-native['"`]/,
      /from\s+['"`]electron['"`]/,
      /browser\./,
      /page\./,
      /\.click\(/,
      /\.type\(/,
      /\.fill\(/
    ];

    const isWebUITest = webUIIndicators.some(pattern => pattern.test(content));
    if (!isWebUITest) {
      return detections; // Not a web UI test, skip validation
    }

    // 1. Check for Playwright usage
    const hasPlaywright = /from\s+['"`]@?playwright(\/test)?['"`]/.test(content);
    if (!hasPlaywright && isWebUITest) {
      detections.push({
        id: `web_ui_no_playwright_${Date.now()}`,
        testFile: filePath,
        testType: TestType.SYSTEM,
        mockType: MockType.FUNCTION_MOCK,
        severity: MockSeverity.CRITICAL,
        location: {
          line: 1,
          column: 1,
          snippet: 'File header'
        },
        description: 'Web UI test must use Playwright for browser automation',
        pattern: 'missing_playwright',
        recommendation: 'Use Playwright for all web UI E2E tests. Install with: npm install -D @playwright/test',
        timestamp: new Date()
      });
    }

    // 2. Check for multiple URL navigations
    const urlNavigationPatterns = [
      /page\.goto\(/g,
      /browser\.url\(/g,
      /navigate\.to\(/g,
      /driver\.get\(/g,
      /cy\.visit\(/g
    ];

    let navigationCount = 0;
    let firstNonLoginNavigation: RegExpMatchArray | null = null;

    for (const pattern of urlNavigationPatterns) {
      const matches = [...content.matchAll(pattern)];
      navigationCount += matches.length;
      
      // Check if navigation is to login page
      for (const match of matches) {
        const lineStart = content.lastIndexOf('\n', match.index || 0) + 1;
        const lineEnd = content.indexOf('\n', match.index || 0);
        const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
        
        // Check if it's not a login page navigation
        if (!/(login|signin|sign-in|auth|authenticate)/i.test(line)) {
          firstNonLoginNavigation = match;
        }
      }
    }

    if (navigationCount > 1) {
      detections.push({
        id: `web_ui_multiple_navigations_${Date.now()}`,
        testFile: filePath,
        testType: TestType.SYSTEM,
        mockType: MockType.FUNCTION_MOCK,
        severity: MockSeverity.CRITICAL,
        location: {
          line: this.getLineAndColumn(content, firstNonLoginNavigation?.index || 0).line,
          column: this.getLineAndColumn(content, firstNonLoginNavigation?.index || 0).column,
          snippet: this.getCodeSnippet(content.split('\n'), this.getLineAndColumn(content, firstNonLoginNavigation?.index || 0).line)
        },
        description: `Multiple URL navigations detected (${navigationCount}). Only login page navigation is allowed`,
        pattern: 'multiple_navigations',
        recommendation: 'Navigate only to the login page. All other navigation should be through UI clicks',
        timestamp: new Date()
      });
    }

    if (firstNonLoginNavigation) {
      const position = this.getLineAndColumn(content, firstNonLoginNavigation.index || 0);
      detections.push({
        id: `web_ui_non_login_navigation_${Date.now()}`,
        testFile: filePath,
        testType: TestType.SYSTEM,
        mockType: MockType.FUNCTION_MOCK,
        severity: MockSeverity.CRITICAL,
        location: {
          line: position.line,
          column: position.column,
          snippet: this.getCodeSnippet(content.split('\n'), position.line)
        },
        description: 'Navigation to non-login page detected',
        pattern: 'non_login_navigation',
        recommendation: 'Only navigate to login page URL. Use clicks to navigate to other pages',
        timestamp: new Date()
      });
    }

    // 3. Check for forbidden interactions (only non-user interactions)
    const forbiddenInteractions = [
      {
        pattern: /page\.evaluate\(/g,
        description: 'Direct JavaScript execution in page context - test as a real user would'
      },
      {
        pattern: /page\.\$eval\(/g,
        description: 'Direct DOM evaluation - use user interactions instead'
      },
      {
        pattern: /page\.\$\$eval\(/g,
        description: 'Direct DOM evaluation on multiple elements - interact through UI'
      },
      {
        pattern: /page\.addScriptTag\(/g,
        description: 'Script injection detected - users cannot inject scripts'
      },
      {
        pattern: /page\.addStyleTag\(/g,
        description: 'Style injection detected - users cannot inject styles'
      },
      {
        pattern: /document\./g,
        description: 'Direct document access - use Playwright locators instead'
      },
      {
        pattern: /window\./g,
        description: 'Direct window access - interact through visible UI'
      },
      {
        pattern: /localStorage\./g,
        description: 'Direct localStorage access - users interact through UI not storage'
      },
      {
        pattern: /sessionStorage\./g,
        description: 'Direct sessionStorage access - test visible behavior not internals'
      },
      {
        pattern: /\.innerHTML/g,
        description: 'Direct innerHTML manipulation - users cannot modify HTML directly'
      },
      {
        pattern: /\.executeScript\(/g,
        description: 'Script execution detected - test user actions not code execution'
      },
      {
        pattern: /page\.setContent\(/g,
        description: 'Direct HTML content setting - navigate to real pages instead'
      },
      {
        pattern: /page\.setExtraHTTPHeaders\(/g,
        description: 'HTTP header manipulation - users cannot modify headers'
      },
      {
        pattern: /page\.route\(/g,
        description: 'Network interception - test against real endpoints'
      },
      {
        pattern: /page\.unroute\(/g,
        description: 'Network interception - test against real endpoints'
      }
    ];
    
    // These are ALLOWED user interactions:
    // - page.click() - clicking elements
    // - page.dblclick() - double clicking
    // - page.hover() - hovering over elements
    // - page.dragAndDrop() - dragging elements
    // - page.fill() / page.type() - typing text
    // - page.press() - keyboard shortcuts
    // - page.selectOption() - selecting from dropdowns
    // - page.check() / page.uncheck() - checkboxes
    // - page.focus() - focusing elements
    // - page.tap() - touch/tap on mobile

    for (const { pattern, description } of forbiddenInteractions) {
      const matches = [...content.matchAll(pattern)];
      
      for (const match of matches) {
        // Skip if it's in a comment
        const lineStart = content.lastIndexOf('\n', match.index || 0) + 1;
        const lineEnd = content.indexOf('\n', match.index || 0);
        const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }

        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line);
        
        detections.push({
          id: `web_ui_forbidden_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.SYSTEM,
          mockType: MockType.FUNCTION_MOCK,
          severity: MockSeverity.HIGH,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: `Forbidden interaction: ${description}`,
          pattern: 'forbidden_interaction',
          recommendation: 'Use only click() and type() methods for user interactions',
          timestamp: new Date()
        });
      }
    }

    // 4. Check for user interactions (optional - just for information)
    const userInteractions = {
      click: (content.match(/\.(click|dblclick)\(/g) || []).length,
      type: (content.match(/\.(type|fill)\(/g) || []).length,
      hover: (content.match(/\.hover\(/g) || []).length,
      drag: (content.match(/\.(dragAndDrop|drag)\(/g) || []).length,
      keyboard: (content.match(/\.press\(/g) || []).length,
      select: (content.match(/\.(selectOption|check|uncheck)\(/g) || []).length,
      focus: (content.match(/\.(focus|blur)\(/g) || []).length,
      tap: (content.match(/\.tap\(/g) || []).length
    };

    // Log interaction summary for debugging (not a violation)
    const totalInteractions = Object.values(userInteractions).reduce((a, b) => a + b, 0);
    if (totalInteractions > 0) {
      console.log(`✓ Found ${totalInteractions} user interactions in ${filePath}`);
    }

    return detections;
  }

  /**
   * Add web UI test specific recommendations
   */
  protected addTypeSpecificRecommendations(
    recommendations: string[],
    detections: MockDetection[]
  ): void {
    const hasNavigationIssues = detections.some(d => 
      d.pattern === 'multiple_navigations' || d.pattern === 'non_login_navigation'
    );
    
    const hasForbiddenInteractions = detections.some(d => 
      d.pattern === 'forbidden_interaction'
    );

    if (hasNavigationIssues) {
      recommendations.push(
        '🌐 Web UI Test Navigation Rules:',
        '   - Navigate only to the login page URL',
        '   - All other navigation must be through UI clicks',
        '   - Example: await page.goto("/login"); // Then use clicks'
      );
    }

    if (hasForbiddenInteractions) {
      recommendations.push(
        '🚫 Forbidden Non-User Actions:',
        '   - No page.evaluate() - users cannot execute JavaScript',
        '   - No direct DOM access (document.*, window.*)',
        '   - No localStorage/sessionStorage manipulation',
        '   - No network interception or mocking',
        '   - No script/style injection',
        '',
        '✅ Allowed User Interactions:',
        '   - click() / dblclick() - clicking elements',
        '   - hover() - hovering over elements',
        '   - dragAndDrop() - dragging elements',
        '   - type() / fill() - entering text',
        '   - press() - keyboard shortcuts (Tab, Enter, etc.)',
        '   - selectOption() - selecting from dropdowns',
        '   - check() / uncheck() - toggling checkboxes',
        '   - focus() / blur() - focusing elements',
        '   - tap() - touch interactions',
        '   - rightClick() - context menu interactions'
      );
    }

    // General web UI test guidance
    recommendations.push(
      '📋 Web UI E2E Test Best Practices:',
      '   1. Start at login page: await page.goto("/login")',
      '   2. Test like a real user would interact',
      '   3. Use all available user interactions (click, hover, drag, keyboard)',
      '   4. Navigate through UI interactions, not multiple URLs',
      '   5. Assert on visible UI state, not internal implementation',
      '',
      '🎯 Test Philosophy:',
      '   - If a user can do it, your test can do it',
      '   - If a user cannot do it, your test should not do it',
      '   - Test the application, not the implementation'
    );
  }
}