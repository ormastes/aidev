/**
 * HEA Architecture Demo
 * Demonstrates the new Hierarchical Encapsulation Architecture
 */

import { TestAsManualConverter } from '../src/converter';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


async function createSampleFeatureFile(): Promise<string> {
  const featureContent = `
Feature: User Authentication with HEA Architecture
  As a user of the system
  I want to be able to authenticate securely
  So that I can access my personal data

  @auth @critical
  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message

  @auth @security
  Scenario: Failed login with invalid password
    Given I am on the login page
    When I enter a valid username
    And I enter an invalid password
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  @auth @security
  Scenario: Account lockout after multiple failures
    Given I am on the login page
    When I attempt to login 5 times with invalid credentials
    Then my account should be locked
    And I should see "Account locked. Please contact support."

  @auth @startup
  Scenario: Initialize authentication system
    Given the authentication service is not running
    When I start the authentication service
    Then the service should be available
    And all security certificates should be loaded

  Scenario Outline: Password validation rules
    Given I am on the password reset page
    When I enter a password "<password>"
    Then I should see validation result "<result>"

    Examples:
      | password     | result                                    |
      | abc         | Password must be at least 8 characters    |
      | abcdefgh    | Password must contain uppercase letter    |
      | Abcdefgh    | Password must contain a number           |
      | Abcdefgh1   | Valid password                           |
`;

  const dir = path.join(__dirname, 'temp-hea-demo');
  if (!fs.existsSync(dir)) {
    await fileAPI.createDirectory(dir);
  }
  
  const filePath = path.join(dir, 'auth.feature');
  await fileAPI.createFile(filePath, featureContent, { type: FileType.TEMPORARY });
  
  return dir;
}

async function createSampleJestFile(): Promise<void> {
  const jestContent = `
describe('User Dashboard', () => {
  describe('Dashboard Loading', () => {
    beforeEach(async () => {
      await login("testuser", "password123");
    });

    it('should display user profile information', async () => {
      const profileSection = await page.find('.profile-section');
      expect(profileSection).toBeVisible();
      expect(await profileSection.getText()).toContain('Test User');
    });

    it('should show recent activity', async () => {
      const activityList = await page.find('.activity-list');
      const items = await activityList.findAll('.activity-item');
      expect(items).toHaveLength(5);
      expect(await items[0].getText()).toMatch(/logged in/i);
    });
  });

  describe('Dashboard Actions', () => {
    it('should allow user to update profile', async () => {
      await page.click('.edit-profile-btn');
      await page.fill('#name', 'Updated Name');
      await page.click('.save-btn');
      
      const notification = await page.waitFor('.success-notification');
      expect(notification).toHaveText('Profile updated successfully');
    });

    it('@critical should handle API errors gracefully', async () => {
      // Simulate API failure
      await page.route('/api/profile', route => {
        route.fulfill({ status: 500 });
      });
      
      await page.click('.refresh-btn');
      const errorMsg = await page.waitFor('.error-message');
      expect(errorMsg).toHaveText('Failed to load data. Please try again.');
    });
  });
});
`;

  const dir = path.join(__dirname, 'temp-hea-demo');
  const filePath = path.join(dir, 'dashboard.test.ts');
  await fileAPI.createFile(filePath, jestContent, { type: FileType.TEMPORARY });
}

async function runDemo() {
  console.log('===========================================');
  console.log('Test As Manual - HEA Architecture Demo');
  console.log('===========================================\n');

  try {
    // Create sample files
    console.log('1. Creating sample test files...');
    const inputDir = await createSampleFeatureFile();
    await createSampleJestFile();
    
    const outputDir = path.join(__dirname, 'temp-hea-demo', 'output');
    
    // Create converter with capture enabled
    console.log('\n2. Initializing converter with HEA architecture...');
    const converter = new TestAsManualConverter({
      enableCaptures: false // Set to true if you have capture tools installed
    });

    // Run conversion
    console.log('\n3. Converting tests to manual documentation...');
    await converter.convert({
      inputPath: inputDir,
      outputPath: outputDir,
      format: "markdown",
      includeCommonScenarios: true,
      generateSequences: true,
      minSequenceLength: 2,
      commonScenarioThreshold: 0.3 // Lower threshold for demo
    });

    // Display results
    console.log('\n4. Conversion complete! Files generated:');
    
    // Read and display the main suite file
    const suiteFile = path.join(outputDir, 'manual-test-suite.md');
    if (fs.existsSync(suiteFile)) {
      console.log(`\n✓ Main suite: ${suiteFile}`);
      const content = fileAPI.readFileSync(suiteFile, 'utf-8');
      const lines = content.split('\n').slice(0, 30);
      console.log('\n--- Preview ---');
      console.log(lines.join('\n'));
      console.log('... (truncated)');
    }

    // Show structure
    console.log('\n5. Generated file structure:');
    showDirectoryTree(outputDir, '   ');

    // Demonstrate HEA benefits
    console.log('\n6. HEA Architecture Benefits Demonstrated:');
    console.log('   ✓ Layer separation (UI, Logic, External)');
    console.log('   ✓ Pipe pattern for cross-layer communication');
    console.log('   ✓ BDD parser with hierarchy detection');
    console.log('   ✓ Jest parser for traditional test files');
    console.log('   ✓ Intelligent test organization');
    console.log('   ✓ Common scenario detection');
    console.log('   ✓ Test sequence generation');
    console.log('   ✓ Professional documentation output');

    // Validate BDD files
    console.log('\n7. Validating BDD files...');
    await converter.validate(inputDir);

  } catch (error) {
    console.error('Demo failed:', error);
  } finally {
    // Cleanup
    const tempDir = path.join(__dirname, 'temp-hea-demo');
    if (fs.existsSync(tempDir)) {
      console.log('\n8. Cleaning up temporary files...');
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

async function showDirectoryTree(dir: string, prefix: string = '') {
  const items = fs.readdirSync(dir);
  
  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    
    console.log(prefix + connector + item);
    
    if (fs.statSync(fullPath).isDirectory()) {
      const extension = isLast ? '    ' : '│   ';
      showDirectoryTree(fullPath, prefix + extension);
    }
  });
}

// Run the demo
console.log('Starting HEA Architecture Demo...\n');
runDemo().catch(console.error);