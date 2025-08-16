import { test, expect, chromium, Browser, Page, BrowserContext, Locator } from '@playwright/test';
import { path } from '../../../../../infra_external-log-lib/src';
import { fsPromises as fs } from '../../../../../infra_external-log-lib/src';
import { getTestConfig, releaseTestPort, TestConfig } from '../helpers/test-port-manager';

/**
 * Feature Coverage Tests - NO HARDCODED PORTS
 * All ports managed through test-as-manual → portal_security theme chain
 */

interface ClickableElement {
  selector: string;
  text?: string;
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'other';
  clicked: boolean;
  feature: string;
  page: string;
}

interface FeatureTest {
  name: string;
  path: string;
  elements: ClickableElement[];
  coverage: number;
}

class ClickCoverageTracker {
  private elements: Map<string, ClickableElement> = new Map();
  private features: Map<string, FeatureTest> = new Map();
  
  registerElement(element: ClickableElement) {
    const key = `${element.page}:${element.selector}:${element.text || ''}`;
    this.elements.set(key, element);
    
    if (!this.features.has(element.feature)) {
      this.features.set(element.feature, {
        name: element.feature,
        path: element.page,
        elements: [],
        coverage: 0
      });
    }
    this.features.get(element.feature)!.elements.push(element);
  }
  
  markClicked(page: string, selector: string, text?: string) {
    const key = `${page}:${selector}:${text || ''}`;
    const element = this.elements.get(key);
    if (element) {
      element.clicked = true;
    }
  }
  
  calculateCoverage(): { total: number; clicked: number; percentage: number; byFeature: Map<string, number> } {
    const total = this.elements.size;
    const clicked = Array.from(this.elements.values()).filter(e => e.clicked).length;
    const percentage = total > 0 ? (clicked / total) * 100 : 0;
    
    const byFeature = new Map<string, number>();
    for (const [name, feature] of this.features) {
      const featureClicked = feature.elements.filter(e => e.clicked).length;
      const featureCoverage = feature.elements.length > 0 
        ? (featureClicked / feature.elements.length) * 100 
        : 0;
      byFeature.set(name, featureCoverage);
      feature.coverage = featureCoverage;
    }
    
    return { total, clicked, percentage, byFeature };
  }
  
  generateReport(): string {
    const coverage = this.calculateCoverage();
    let report = `# Click Coverage Report (No Hardcoded Ports)\n\n`;
    report += `## Test Configuration\n`;
    report += `- Port allocation: test-as-manual → portal_security theme\n`;
    report += `- No hardcoded ports or localhost references\n\n`;
    report += `## Overall Coverage: ${coverage.percentage.toFixed(2)}% (${coverage.clicked}/${coverage.total})\n\n`;
    
    report += `## Coverage by Feature\n\n`;
    for (const [feature, percentage] of coverage.byFeature) {
      const featureData = this.features.get(feature)!;
      report += `### ${feature}: ${percentage.toFixed(2)}%\n`;
      report += `- Total elements: ${featureData.elements.length}\n`;
      report += `- Clicked: ${featureData.elements.filter(e => e.clicked).length}\n`;
      report += `- Not clicked:\n`;
      featureData.elements
        .filter(e => !e.clicked)
        .forEach(e => {
          report += `  - ${e.type}: ${e.selector} ${e.text ? `(${e.text})` : ''}\n`;
        });
      report += `\n`;
    }
    
    return report;
  }
}

test.describe('AI Dev Portal - Feature Coverage (Via Test Theme)', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let testConfig: TestConfig;
  let baseUrl: string;
  const screenshotsDir = path.join(process.cwd(), 'tests', 'screenshots', 'feature-coverage-no-hardcode');
  const coverageTracker = new ClickCoverageTracker();
  
  test.beforeAll(async () => {
    await fs.mkdir(screenshotsDir, { recursive: true });
    
    // Get test configuration from test-as-manual theme
    console.log('🔒 Getting test configuration from test-as-manual theme...');
    testConfig = await getTestConfig({
      suiteName: 'gui-selector-feature-coverage',
      testType: 'e2e',
      deployType: 'release'
    });
    
    baseUrl = testConfig.baseUrl;
    console.log(`✅ Test URL allocated by security theme: ${baseUrl}`);
    console.log(`📋 Test App ID: ${testConfig.appId}`);
    
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });
  
  test.afterAll(async () => {
    if (browser) await browser.close();
    
    // Release test port back to pool
    if (testConfig) {
      await releaseTestPort(testConfig.appId);
      console.log(`✅ Released test port ${testConfig.port} back to security theme`);
    }
    
    // Generate and save coverage report
    const report = coverageTracker.generateReport();
    await fs.writeFile(
      path.join(screenshotsDir, 'click-coverage-report.md'),
      report
    );
    console.log('\n' + report);
  });
  
  test.beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();
    page.setDefaultTimeout(30000);
  });
  
  test.afterEach(async () => {
    if (page) await page.close();
    if (context) await context.close();
  });
  
  // Helper function to track and click elements
  async function trackAndClick(
    page: Page,
    selector: string,
    feature: string,
    pageName: string,
    options?: { text?: string; force?: boolean; wait?: number }
  ) {
    const element = await page.$(selector);
    if (element) {
      const text = await element.textContent();
      coverageTracker.registerElement({
        selector,
        text: options?.text || text?.trim(),
        type: await determineElementType(element),
        clicked: false,
        feature,
        page: pageName
      });
      
      try {
        await element.scrollIntoViewIfNeeded();
        await element.click({ force: options?.force || false });
        if (options?.wait) {
          await page.waitForTimeout(options.wait);
        }
        coverageTracker.markClicked(pageName, selector, options?.text || text?.trim());
        return true;
      } catch (e) {
        console.log(`Failed to click ${selector}: ${e.message}`);
        return false;
      }
    }
    return false;
  }
  
  async function determineElementType(element: Locator | any): Promise<'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'other'> {
    const tagName = await element.evaluate((el: HTMLElement) => el.tagName.toLowerCase());
    const type = await element.getAttribute('type');
    
    if (tagName === 'button') return 'button';
    if (tagName === 'a') return 'link';
    if (tagName === 'input') {
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      return 'input';
    }
    if (tagName === 'select') return 'select';
    return 'other';
  }
  
  async function discoverClickableElements(page: Page, feature: string, pageName: string) {
    const selectors = [
      'button',
      'a[href]',
      'input[type="button"]',
      'input[type="submit"]',
      '[onclick]',
      '[role="button"]',
      '.btn',
      '.button'
    ];
    
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await element.textContent();
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          coverageTracker.registerElement({
            selector,
            text: text?.trim(),
            type: await determineElementType(element),
            clicked: false,
            feature,
            page: pageName
          });
        }
      }
    }
  }
  
  test('Feature: Authentication (No Hardcoded Ports)', async () => {
    const feature = 'Authentication';
    
    // Navigate using allocated URL from test theme
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await discoverClickableElements(page, feature, 'login');
    
    // Test login
    await page.fill('input[name="username"], input#username', 'admin');
    await page.fill('input[name="password"], input#password', 'admin123');
    await trackAndClick(page, 'button[type="submit"]', feature, 'login', { wait: 2000 });
    
    if (page.url().includes('dashboard')) {
      console.log('✅ Login successful');
      await trackAndClick(page, 'button:has-text("Logout"), a:has-text("Logout")', feature, 'dashboard');
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'auth-test.png'),
      fullPage: true
    });
  });
  
  test('Feature: Dashboard (No Hardcoded Ports)', async () => {
    const feature = 'Dashboard';
    
    // Login using allocated URL
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.fill('input[name="username"], input#username', 'admin');
    await page.fill('input[name="password"], input#password', 'admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    
    // Navigate to dashboard using allocated base URL
    await page.goto(`${baseUrl}/dashboard.html`, { waitUntil: 'networkidle' });
    await discoverClickableElements(page, feature, 'dashboard');
    
    // Test dashboard elements
    const cards = ['.stat-card', '.quick-action-card'];
    for (const card of cards) {
      const elements = await page.$$(card);
      for (let i = 0; i < Math.min(elements.length, 2); i++) {
        await trackAndClick(page, `${card}:nth-child(${i + 1})`, feature, 'dashboard', { wait: 500 });
      }
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'dashboard-test.png'),
      fullPage: true
    });
  });
  
  test('Feature: GUI Selector (No Hardcoded Ports)', async () => {
    const feature = 'GUI Selector';
    
    // Login using allocated URL
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.fill('input[name="username"], input#username', 'admin');
    await page.fill('input[name="password"], input#password', 'admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    
    // Navigate using allocated URL
    await page.goto(`${baseUrl}/gui-selector.html`, { waitUntil: 'networkidle' });
    await discoverClickableElements(page, feature, 'gui-selector');
    
    // Test variants
    const variants = ['modern', 'professional', 'creative', 'accessible'];
    for (const variant of variants) {
      await trackAndClick(page, `[data-variant="${variant}"]`, feature, 'gui-selector', { wait: 1000 });
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'gui-selector-test.png'),
      fullPage: true
    });
  });
  
  test('Feature: Templates (No Hardcoded Ports)', async () => {
    const feature = 'Templates';
    
    // Login using allocated URL
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.fill('input[name="username"], input#username', 'admin');
    await page.fill('input[name="password"], input#password', 'admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    
    // Navigate using allocated URL
    await page.goto(`${baseUrl}/templates.html`, { waitUntil: 'networkidle' });
    await discoverClickableElements(page, feature, 'templates');
    
    // Test filters
    const filters = await page.$$('.filter-chip');
    for (let i = 0; i < Math.min(filters.length, 3); i++) {
      await trackAndClick(page, `.filter-chip:nth-child(${i + 1})`, feature, 'templates', { wait: 500 });
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'templates-test.png'),
      fullPage: true
    });
  });
  
  test('Feature: Themes (No Hardcoded Ports)', async () => {
    const feature = 'Themes';
    
    // Login using allocated URL
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.fill('input[name="username"], input#username', 'admin');
    await page.fill('input[name="password"], input#password', 'admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);
    
    // Navigate using allocated URL
    await page.goto(`${baseUrl}/themes.html`, { waitUntil: 'networkidle' });
    await discoverClickableElements(page, feature, 'themes');
    
    // Test theme buttons
    const applyButtons = await page.$$('button:has-text("Apply Theme")');
    for (let i = 0; i < Math.min(applyButtons.length, 3); i++) {
      await trackAndClick(page, `button:has-text("Apply Theme"):nth(${i})`, feature, 'themes', { wait: 1000 });
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'themes-test.png'),
      fullPage: true
    });
  });
  
  test('Coverage Report (Via Test Theme)', async () => {
    const coverage = coverageTracker.calculateCoverage();
    
    console.log('\n📊 Click Coverage Summary (No Hardcoded Ports):');
    console.log(`Total Coverage: ${coverage.percentage.toFixed(2)}%`);
    console.log(`Elements Clicked: ${coverage.clicked}/${coverage.total}`);
    console.log('✅ All ports allocated via test-as-manual → portal_security theme chain');
    
    // Assert minimum coverage
    expect(coverage.percentage).toBeGreaterThan(70);
    
    for (const [feature, percentage] of coverage.byFeature) {
      console.log(`  ${feature}: ${percentage.toFixed(2)}%`);
      expect(percentage).toBeGreaterThan(60);
    }
  });
});

export { ClickCoverageTracker };