/**
 * System tests for 019_agentic_coding
 * End-to-end tests with real browser interactions using Playwright
 * NO MOCKS ALLOWED - Real user interactions only
 */

import { test, expect } from '@playwright/test';
import { path } from '../../../../../infra_external-log-lib/src';

test.describe('019_agentic_coding System Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start from login page or main entry point
    await page.goto('http://localhost:3000');
  });
  
  test('should generate code through UI workflow', async ({ page }) => {
    // Login if required
    // await page.fill('[data-testid="username"]', 'testuser');
    // await page.fill('[data-testid="password"]', 'testpass');
    // await page.click('[data-testid="login-button"]');
    
    // Navigate to code generation feature
    await page.click('text=Code Generation');
    await page.waitForSelector('[data-testid="code-gen-form"]');
    
    // Fill in requirements
    await page.fill('[data-testid="requirements-input"]', 
      'Create a function that validates email addresses');
    
    // Select options
    await page.selectOption('[data-testid="language-select"]', 'typescript');
    await page.selectOption('[data-testid="style-select"]', 'functional');
    
    // Click generate button
    await page.click('[data-testid="generate-button"]');
    
    // Wait for code to be generated
    await page.waitForSelector('[data-testid="generated-code"]', {
      timeout: 30000
    });
    
    // Verify generated code appears
    const generatedCode = await page.textContent('[data-testid="generated-code"]');
    expect(generatedCode).toContain('function');
    expect(generatedCode).toContain('email');
    
    // Generate tests
    await page.click('[data-testid="generate-tests-button"]');
    await page.waitForSelector('[data-testid="generated-tests"]');
    
    const generatedTests = await page.textContent('[data-testid="generated-tests"]');
    expect(generatedTests).toContain('describe');
    expect(generatedTests).toContain('expect');
    
    // Run the tests
    await page.click('[data-testid="run-tests-button"]');
    await page.waitForSelector('[data-testid="test-results"]');
    
    const testResults = await page.textContent('[data-testid="test-results"]');
    expect(testResults).toContain('In Progress');
  });
  
  test('should handle code generation errors gracefully', async ({ page }) => {
    await page.click('text=Code Generation');
    
    // Submit without requirements
    await page.click('[data-testid="generate-button"]');
    
    // Should show error message
    await page.waitForSelector('[data-testid="error-message"]');
    const error = await page.textContent('[data-testid="error-message"]');
    expect(error).toContain('Requirements are required');
  });
  
  test('should save and load code generation sessions', async ({ page }) => {
    // Generate code
    await page.click('text=Code Generation');
    await page.fill('[data-testid="requirements-input"]', 'Sort an array');
    await page.click('[data-testid="generate-button"]');
    await page.waitForSelector('[data-testid="generated-code"]');
    
    // Save session
    await page.click('[data-testid="save-session-button"]');
    await page.fill('[data-testid="session-name-input"]', 'test-session');
    await page.click('[data-testid="confirm-save-button"]');
    
    // Navigate away and back
    await page.click('text=Home');
    await page.click('text=Code Generation');
    
    // Load session
    await page.click('[data-testid="load-session-button"]');
    await page.click('text=test-session');
    
    // Verify loaded content
    const requirements = await page.inputValue('[data-testid="requirements-input"]');
    expect(requirements).toBe('Sort an array');
  });
});
