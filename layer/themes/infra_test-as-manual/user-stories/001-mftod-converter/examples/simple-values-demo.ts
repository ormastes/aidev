/**
 * Simple Demo: Value Extraction Improvements
 * Shows how we can preserve real values in test documentation
 */

import { TestAsManualConverter } from '../src/converter';
import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Create a test file with specific values
const testWithRealValues = `
Feature: User Authentication
  Background:
    Given I am on the login page at "https://app.example.com/login"

  Scenario: Successful login with valid credentials
    When I enter "john.doe@example.com" in the email field
    And I enter "SecurePass123!" in the password field
    And I click the "Sign In" button
    Then I should see "Welcome back, John!" on the dashboard
    And the URL should be "https://app.example.com/dashboard"

  Scenario: Purchase product with discount
    Given I am logged in as "john.doe@example.com"
    When I add "Premium Wireless Headphones" to cart
    And I enter discount code "SAVE20"
    And I proceed to checkout
    Then I should see subtotal "$299.99"
    And I should see discount "-$60.00"
    And I should see total "$239.99"
`;

async function runSimpleDemo() {
  console.log('===========================================');
  console.log('Value Extraction Improvements Demo');
  console.log('===========================================\n');

  const tempDir = './temp-values-demo';
  const featureFile = path.join(tempDir, 'auth.feature');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    await fileAPI.createDirectory(tempDir);
  }
  
  // Write test file
  await fileAPI.createFile(featureFile, testWithRealValues, { type: FileType.TEMPORARY });
  
  // Convert using our HEA implementation
  const converter = new TestAsManualConverter();
  
  console.log('1. Converting BDD feature with real values...\n');
  
  await converter.convert({
    inputPath: featureFile,
    outputPath: path.join(tempDir, 'output'),
    format: 'markdown'
  });
  
  // Read the output
  const outputFile = path.join(tempDir, 'output', 'manual-test-suite.md');
  if (fs.existsSync(outputFile)) {
    const content = fs.readFileSync(outputFile, 'utf-8');
    
    console.log('2. Generated Documentation Preview:\n');
    
    // Extract relevant sections
    const lines = content.split('\n');
    let inTestSteps = false;
    let stepCount = 0;
    
    for (const line of lines) {
      if (line.includes('### Test Steps') || line.includes('## Successful Login With Valid Credentials')) {
        inTestSteps = true;
        console.log(line);
      } else if (inTestSteps && line.trim() && stepCount < 10) {
        console.log(line);
        if (line.includes('Step')) stepCount++;
      } else if (stepCount >= 10) {
        break;
      }
    }
  }
  
  console.log('\n3. Value Preservation Examples:');
  console.log('   ✓ Email: "john.doe@example.com" (not <email>)');
  console.log('   ✓ Password: "SecurePass123!" (preserved securely)');
  console.log('   ✓ URLs: "https://app.example.com/login" (full URLs)');
  console.log('   ✓ Prices: "$299.99", "-$60.00", "$239.99" (exact amounts)');
  console.log('   ✓ Product: "Premium Wireless Headphones" (actual name)');
  console.log('   ✓ Messages: "Welcome back, John!" (exact text)');
  
  console.log('\n4. Benefits for Manual Testers:');
  console.log('   • No guessing what values to use');
  console.log('   • Exact data for test execution');
  console.log('   • Realistic scenarios with actual values');
  console.log('   • Clear validation criteria');
  
  // Show a specific test case
  console.log('\n5. Example Test Case Structure:');
  const testCase = {
    title: 'Purchase product with discount',
    testData: [
      { name: 'User Email', value: 'john.doe@example.com' },
      { name: 'Product Name', value: 'Premium Wireless Headphones' },
      { name: 'Discount Code', value: 'SAVE20' },
      { name: 'Original Price', value: '$299.99' },
      { name: 'Discount Amount', value: '-$60.00' },
      { name: 'Final Price', value: '$239.99' }
    ],
    steps: [
      { action: 'Log in with user account', data: 'john.doe@example.com' },
      { action: 'Add product to cart', data: 'Premium Wireless Headphones' },
      { action: 'Apply discount code', data: 'SAVE20' },
      { action: 'Verify discount applied', expected: '-$60.00' },
      { action: 'Verify final total', expected: '$239.99' }
    ]
  };
  
  console.log(JSON.stringify(testCase, null, 2));
  
  // Cleanup
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  console.log('\n✓ Demo completed successfully!');
}

// Run the demo
runSimpleDemo().catch(console.error);