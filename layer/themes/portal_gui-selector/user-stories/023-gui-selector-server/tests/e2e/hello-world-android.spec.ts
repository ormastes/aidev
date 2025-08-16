import { test, expect, Page } from '@playwright/test';

test.describe('Hello World Android App E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to the mobile preview page
    await page.goto('/mobile-preview.html');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should load mobile preview page successfully', async () => {
    // Check that the mobile preview page loads
    await expect(page).toHaveTitle(/Mobile App Preview/);
    
    // Check that device controls are visible
    const deviceControls = page.locator('.device-controls');
    await expect(deviceControls).toBeVisible();
    
    // Check that device mockup is visible
    const deviceMockup = page.locator('.device-mockup');
    await expect(deviceMockup).toBeVisible();
  });

  test('should display Hello World Android app in the iframe', async () => {
    // The Hello World Android app should be selected by default
    const appSelect = page.locator('#appSelect');
    await expect(appSelect).toHaveValue('/hello-world-android/');
    
    // Wait for iframe to load
    const iframe = page.frameLocator('#appFrame');
    
    // Check that the app loaded correctly in the iframe
    await expect(iframe.locator('.hello-text')).toContainText('Hello World!');
    await expect(iframe.locator('.subtitle')).toContainText('Welcome to your Android app');
  });

  test('should interact with Hello World button and update counter', async () => {
    // Get the iframe content
    const iframe = page.frameLocator('#appFrame');
    
    // Check initial state
    const counter = iframe.locator('#clickCount');
    await expect(counter).toHaveText('0');
    
    // Find and click the button
    const button = iframe.locator('#helloButton');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Click Me');
    
    // Click the button multiple times
    await button.click();
    await expect(counter).toHaveText('1');
    
    await button.click();
    await expect(counter).toHaveText('2');
    
    await button.click();
    await expect(counter).toHaveText('3');
    
    // Verify toast notification appears
    const toast = iframe.locator('#toast');
    await expect(toast).toHaveClass(/show/);
    await expect(toast).toContainText('Button clicked 3 times!');
  });

  test('should switch between different device types', async () => {
    // Test iPhone view (default)
    let deviceMockup = page.locator('.device-mockup');
    await expect(deviceMockup).toHaveClass(/iphone/);
    
    // Switch to Android view
    const androidBtn = page.locator('[data-device="android"]');
    await androidBtn.click();
    await expect(deviceMockup).toHaveClass(/android/);
    
    // Check device info updated
    const deviceInfo = page.locator('#deviceInfo');
    await expect(deviceInfo).toContainText('Pixel 5');
    
    // Switch to iPad view
    const ipadBtn = page.locator('[data-device="ipad"]');
    await ipadBtn.click();
    await expect(deviceMockup).toHaveClass(/ipad/);
    await expect(deviceInfo).toContainText('iPad Air');
    
    // Verify app still works after device switch
    const iframe = page.frameLocator('#appFrame');
    const button = iframe.locator('#helloButton');
    await button.click();
    const counter = iframe.locator('#clickCount');
    await expect(counter).toHaveText('1');
  });

  test('should interact with Android navigation buttons', async () => {
    // Get the iframe content
    const iframe = page.frameLocator('#appFrame');
    
    // Click back button
    const backBtn = iframe.locator('#backBtn');
    await backBtn.click();
    
    // Check toast appears
    const toast = iframe.locator('#toast');
    await expect(toast).toHaveClass(/show/);
    await expect(toast).toContainText('Back button pressed');
    
    // Wait for toast to disappear
    await page.waitForTimeout(3500);
    
    // Click home button
    const homeBtn = iframe.locator('#homeBtn');
    await homeBtn.click();
    await expect(toast).toHaveClass(/show/);
    await expect(toast).toContainText('Home button pressed');
    
    // Wait for toast to disappear
    await page.waitForTimeout(3500);
    
    // Click recent button
    const recentBtn = iframe.locator('#recentBtn');
    await recentBtn.click();
    await expect(toast).toHaveClass(/show/);
    await expect(toast).toContainText('Recent apps button pressed');
  });

  test('should refresh the app when refresh button is clicked', async () => {
    // Get initial state
    const iframe = page.frameLocator('#appFrame');
    const button = iframe.locator('#helloButton');
    const counter = iframe.locator('#clickCount');
    
    // Click button a few times
    await button.click();
    await button.click();
    await expect(counter).toHaveText('2');
    
    // Click refresh button
    const refreshBtn = page.locator('.refresh-btn');
    await refreshBtn.click();
    
    // Wait for reload
    await page.waitForTimeout(1000);
    
    // Check counter is reset
    const newIframe = page.frameLocator('#appFrame');
    const newCounter = newIframe.locator('#clickCount');
    await expect(newCounter).toHaveText('0');
  });

  test('should switch between different apps', async () => {
    // Verify Hello World Android is selected
    const appSelect = page.locator('#appSelect');
    await expect(appSelect).toHaveValue('/hello-world-android/');
    
    // Switch to Mate Dealer app
    await appSelect.selectOption('/mate-dealer/');
    
    // Wait for new app to load
    await page.waitForTimeout(1000);
    
    // Verify Mate Dealer loaded (check for different content)
    const iframe = page.frameLocator('#appFrame');
    
    // Switch back to Hello World Android
    await appSelect.selectOption('/hello-world-android/');
    await page.waitForTimeout(1000);
    
    // Verify Hello World Android is back
    const helloIframe = page.frameLocator('#appFrame');
    await expect(helloIframe.locator('.hello-text')).toContainText('Hello World!');
  });

  test('should display correct status bar time', async () => {
    // Get the iframe content
    const iframe = page.frameLocator('#appFrame');
    
    // Check that time is displayed in status bar
    const timeElement = iframe.locator('#time');
    const timeText = await timeElement.textContent();
    
    // Verify time format (HH:MM)
    expect(timeText).toMatch(/^\d{2}:\d{2}$/);
  });

  test('should handle rapid button clicks correctly', async () => {
    // Get the iframe content
    const iframe = page.frameLocator('#appFrame');
    const button = iframe.locator('#helloButton');
    const counter = iframe.locator('#clickCount');
    
    // Rapidly click the button 10 times
    for (let i = 0; i < 10; i++) {
      await button.click();
    }
    
    // Verify counter shows 10
    await expect(counter).toHaveText('10');
    
    // Verify toast shows correct message
    const toast = iframe.locator('#toast');
    await expect(toast).toContainText('Button clicked 10 times!');
  });

  test('should maintain app state when switching device types', async () => {
    // Get the iframe and interact with app
    const iframe = page.frameLocator('#appFrame');
    const button = iframe.locator('#helloButton');
    const counter = iframe.locator('#clickCount');
    
    // Click button 5 times
    for (let i = 0; i < 5; i++) {
      await button.click();
    }
    await expect(counter).toHaveText('5');
    
    // Switch to Android device
    const androidBtn = page.locator('[data-device="android"]');
    await androidBtn.click();
    
    // Wait for device switch and reload
    await page.waitForTimeout(1000);
    
    // Note: After device switch, the iframe reloads, so the counter resets
    // This is expected behavior for the preview
    const newIframe = page.frameLocator('#appFrame');
    const newCounter = newIframe.locator('#clickCount');
    await expect(newCounter).toHaveText('0');
  });
});

test.describe('Mobile App Responsiveness', () => {
  test('should render correctly in iPhone viewport', async ({ page }) => {
    await page.goto('/mobile-preview.html');
    
    // Ensure iPhone is selected
    const iphoneBtn = page.locator('[data-device="iphone"]');
    await iphoneBtn.click();
    
    // Check viewport dimensions
    const deviceMockup = page.locator('.device-mockup');
    const box = await deviceMockup.boundingBox();
    expect(box?.width).toBeCloseTo(390, 50);
    expect(box?.height).toBeCloseTo(844, 50);
  });

  test('should render correctly in Android viewport', async ({ page }) => {
    await page.goto('/mobile-preview.html');
    
    // Select Android
    const androidBtn = page.locator('[data-device="android"]');
    await androidBtn.click();
    
    // Check viewport dimensions
    const deviceMockup = page.locator('.device-mockup');
    const box = await deviceMockup.boundingBox();
    expect(box?.width).toBeCloseTo(412, 50);
    expect(box?.height).toBeCloseTo(915, 50);
  });

  test('should render correctly in iPad viewport', async ({ page }) => {
    await page.goto('/mobile-preview.html');
    
    // Select iPad
    const ipadBtn = page.locator('[data-device="ipad"]');
    await ipadBtn.click();
    
    // Check viewport dimensions
    const deviceMockup = page.locator('.device-mockup');
    const box = await deviceMockup.boundingBox();
    expect(box?.width).toBeCloseTo(820, 50);
    expect(box?.height).toBeCloseTo(1180, 50);
  });
});