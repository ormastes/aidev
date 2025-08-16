import { WebUITestDetector } from '../../src/detectors/web-ui-test-detector';
import { MockSeverity } from '../../src/domain/mock-detection';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('WebUITestDetector', () => {
  let tempDir: string;
  let detector: WebUITestDetector;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-ui-test-'));
    detector = new WebUITestDetector(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Playwright validation', () => {
    it('should detect missing Playwright in web UI test', async () => {
      const testFile = path.join(tempDir, 'login.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        // This is a web UI test without Playwright
        import { test } from 'some-other-framework';
        
        test('login test', async ({ page }) => {
          await page.goto('/login');
          await page.click('#submit');
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      expect(report[0].mocksDetected).toHaveLength(1);
      expect(report[0].mocksDetected[0].description).toContain('Web UI test must use Playwright');
      expect(report[0].mocksDetected[0].severity).toBe(MockSeverity.CRITICAL);
    });

    it('should pass when Playwright is used', async () => {
      const testFile = path.join(tempDir, 'login.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test, expect } from '@playwright/test';
        
        test('login test', async ({ page }) => {
          await page.goto('/login');
          await page.fill('#username', 'user');
          await page.fill('#password', 'pass');
          await page.click('#submit');
        });
      `);

      const report = await detector.analyze();
      
      const playwrightIssues = report[0]?.mocksDetected?.filter(d => 
        d.description.includes('must use Playwright')
      ) || [];
      expect(playwrightIssues).toHaveLength(0);
    });
  });

  describe('URL navigation validation', () => {
    it('should detect multiple URL navigations', async () => {
      const testFile = path.join(tempDir, 'navigation.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('multiple navigation test', async ({ page }) => {
          await page.goto('/login');
          await page.goto('/dashboard');
          await page.goto('/profile');
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      const navIssues = report[0].mocksDetected.filter(d => 
        d.pattern === 'multiple_navigations'
      );
      expect(navIssues).toHaveLength(1);
      expect(navIssues[0].description).toContain('Multiple URL navigations detected (3)');
    });

    it('should detect non-login page navigation', async () => {
      const testFile = path.join(tempDir, 'dashboard.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('dashboard test', async ({ page }) => {
          await page.goto('/dashboard');
          await page.click('.menu-item');
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      const nonLoginNav = report[0].mocksDetected.filter(d => 
        d.pattern === 'non_login_navigation'
      );
      expect(nonLoginNav).toHaveLength(1);
      expect(nonLoginNav[0].description).toContain('Navigation to non-login page');
    });

    it('should allow single login page navigation', async () => {
      const testFile = path.join(tempDir, 'proper-login.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('proper login test', async ({ page }) => {
          await page.goto('/login');
          await page.fill('#username', 'user');
          await page.click('#submit');
        });
      `);

      const report = await detector.analyze();
      
      const navIssues = report[0]?.mocksDetected?.filter(d => 
        d.pattern === 'multiple_navigations' || d.pattern === 'non_login_navigation'
      ) || [];
      expect(navIssues).toHaveLength(0);
    });
  });

  describe('Forbidden interaction validation', () => {
    it('should detect page.evaluate usage', async () => {
      const testFile = path.join(tempDir, 'eval.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('eval test', async ({ page }) => {
          await page.goto('/login');
          await page.evaluate(() => {
            document.getElementById('username').value = 'admin';
          });
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      const evalIssues = report[0].mocksDetected.filter(d => 
        d.description.includes('Direct JavaScript execution')
      );
      expect(evalIssues).toHaveLength(1);
      expect(evalIssues[0].severity).toBe(MockSeverity.HIGH);
    });

    it('should detect DOM manipulation', async () => {
      const testFile = path.join(tempDir, 'dom.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('dom test', async ({ page }) => {
          await page.goto('/login');
          await page.$eval('#username', el => el.value = 'admin');
          document.querySelector('#submit').click();
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      const domIssues = report[0].mocksDetected.filter(d => 
        d.pattern === 'forbidden_interaction'
      );
      expect(domIssues.length).toBeGreaterThan(0);
    });

    it('should allow user interactions like hover, drag, right-click', async () => {
      const testFile = path.join(tempDir, 'user-interactions.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('allowed user interactions', async ({ page }) => {
          await page.goto('/login');
          await page.hover('#menu');
          await page.dragAndDrop('#item1', '#item2');
          await page.rightClick('#context-menu');
          await page.dblclick('#button');
          await page.press('Enter');
          await page.selectOption('#dropdown', 'value');
          await page.check('#checkbox');
          await page.focus('#input');
          await page.tap('#mobile-button');
        });
      `);

      const report = await detector.analyze();
      
      const forbiddenIssues = report[0]?.mocksDetected?.filter(d => 
        d.pattern === 'forbidden_interaction'
      ) || [];
      // These user interactions should NOT be flagged as violations
      expect(forbiddenIssues.length).toBe(0);
    });

    it('should allow only click and type/fill interactions', async () => {
      const testFile = path.join(tempDir, 'allowed.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('allowed interactions', async ({ page }) => {
          await page.goto('/login');
          await page.fill('#username', 'admin');
          await page.type('#password', 'password123');
          await page.click('#submit');
          await page.click('.nav-link');
        });
      `);

      const report = await detector.analyze();
      
      const forbiddenIssues = report[0]?.mocksDetected?.filter(d => 
        d.pattern === 'forbidden_interaction'
      ) || [];
      expect(forbiddenIssues).toHaveLength(0);
    });
  });

  describe('Network and script injection detection', () => {
    it('should detect network interception', async () => {
      const testFile = path.join(tempDir, 'network-mock.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test, expect } from '@playwright/test';
        
        test('network mock test', async ({ page }) => {
          await page.route('**/api/*', route => {
            route.fulfill({ body: '{"mocked": true}' });
          });
          await page.goto('/login');
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      const networkIssues = report[0].mocksDetected.filter(d => 
        d.description.includes('Network interception')
      );
      expect(networkIssues).toHaveLength(1);
      expect(networkIssues[0].severity).toBe(MockSeverity.HIGH);
    });

    it('should detect HTTP header manipulation', async () => {
      const testFile = path.join(tempDir, 'header-manip.e2e.spec.ts');
      fs.writeFileSync(testFile, `
        import { test } from '@playwright/test';
        
        test('header test', async ({ page }) => {
          await page.setExtraHTTPHeaders({
            'X-Custom-Header': 'value'
          });
          await page.goto('/login');
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(1);
      const headerIssues = report[0].mocksDetected.filter(d => 
        d.description.includes('HTTP header manipulation')
      );
      expect(headerIssues).toHaveLength(1);
    });
  });

  describe('Non-web UI test skip', () => {
    it('should skip validation for non-web UI tests', async () => {
      const testFile = path.join(tempDir, 'unit.test.ts');
      fs.writeFileSync(testFile, `
        import { describe, it, expect } from 'jest';
        
        describe('Unit test', () => {
          it('should add numbers', () => {
            expect(1 + 1).toBe(2);
          });
        });
      `);

      const report = await detector.analyze();
      
      expect(report).toHaveLength(0);
    });
  });
});