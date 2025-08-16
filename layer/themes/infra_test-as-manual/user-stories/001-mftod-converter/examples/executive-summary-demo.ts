/**
 * Executive Summary Demo
 * Shows business-focused test documentation generation
 */

import { ExecutiveSummaryGenerator } from '../src/53.logic/pipe';
import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


// Create comprehensive test suite
const comprehensiveTests = `
Feature: E-Commerce Platform Testing
  @critical @security
  Scenario: User Authentication Security
    Given I am on the login page
    When I enter invalid credentials 5 times
    Then my account should be locked for 15 minutes
    And I should see "Account temporarily locked"

  @critical @payment @pci
  Scenario: Secure Payment Processing
    Given I have items in my cart totaling "$1,234.56"
    When I enter credit card "4111-1111-1111-1111"
    And I complete the checkout process
    Then payment should be processed securely
    And I should receive order confirmation "ORD-2024-001"

  @performance
  Scenario: Search Performance Under Load
    Given 1000 concurrent users are searching
    When I search for "wireless headphones"
    Then results should load within 2 seconds
    And show at least 50 products

  @usability @accessibility
  Scenario: Screen Reader Navigation
    Given I am using a screen reader
    When I navigate through the product catalog
    Then all images should have descriptive alt text
    And form fields should have proper labels

  @api @integration
  Scenario: Third-party Shipping Integration
    Given I have a valid shipping address
    When I request shipping rates
    Then the system should retrieve rates from FedEx API
    And display options within 3 seconds

  @compliance @gdpr
  Scenario: User Data Privacy Controls
    Given I am logged into my account
    When I request my personal data export
    Then I should receive all my data within 24 hours
    And data should be in portable format

  @security @authentication
  Scenario: Two-Factor Authentication
    Given I have 2FA enabled on my account
    When I log in with correct credentials
    Then I should receive a verification code
    And must enter it to access my account

  @functional
  Scenario: Product Review Submission
    Given I purchased "Premium Laptop" last week
    When I submit a 5-star review with photos
    Then my review should appear after moderation
    And I should earn loyalty points

  @functional @critical
  Scenario: Inventory Management
    Given product "SKU-12345" has 5 items in stock
    When 3 customers order this product simultaneously
    Then stock should update correctly
    And prevent overselling

  @ui @responsive
  Scenario: Mobile Responsive Design
    Given I am using a mobile device
    When I browse the product catalog
    Then layout should adapt to screen size
    And all features should remain accessible
`;

async function runExecutiveSummaryDemo() {
  console.log('===========================================');
  console.log('Executive Summary Generation Demo');
  console.log('===========================================\n');

  const tempDir = './temp-executive-demo';
  const featureFile = path.join(tempDir, 'ecommerce.feature');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    await fileAPI.createDirectory(tempDir);
  }
  
  // Write test file
  await fileAPI.createFile(featureFile, comprehensiveTests, { type: FileType.TEMPORARY });
  
  console.log('1. Converting comprehensive test suite...\n');
  
  // Instead of calling the service directly, let's create mock data
  // to demonstrate the executive summary without full conversion
  const mockManualTestSuite = {
    id: 'suite-001',
    title: 'E-Commerce Platform Test Suite',
    description: 'Comprehensive testing for e-commerce platform',
    procedures: [
      {
        id: 'test-001',
        title: 'User Authentication Security',
        description: 'Verify account lockout after failed attempts',
        category: 'Security',
        priority: 'high' as const,
        estimatedTime: 15,
        testSteps: Array(8).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@critical', '@security'],
        isCommon: false,
        relatedScenarios: []
      },
      {
        id: 'test-002',
        title: 'Secure Payment Processing',
        description: 'Validate PCI-compliant payment flow',
        category: 'Payment',
        priority: 'high' as const,
        estimatedTime: 20,
        testSteps: Array(10).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@critical', '@payment', '@pci'],
        isCommon: false,
        relatedScenarios: []
      },
      {
        id: 'test-003',
        title: 'Search Performance Under Load',
        description: 'Test search response time with concurrent users',
        category: 'Performance',
        priority: 'medium' as const,
        estimatedTime: 30,
        testSteps: Array(6).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@performance'],
        isCommon: false,
        relatedScenarios: []
      },
      {
        id: 'test-004',
        title: 'Screen Reader Navigation',
        description: 'Ensure accessibility compliance',
        category: 'Usability',
        priority: 'medium' as const,
        estimatedTime: 25,
        testSteps: Array(12).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@usability', '@accessibility'],
        isCommon: false,
        relatedScenarios: []
      },
      {
        id: 'test-005',
        title: 'Third-party Shipping Integration',
        description: 'Validate FedEx API integration',
        category: 'API',
        priority: 'medium' as const,
        estimatedTime: 10,
        testSteps: Array(5).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@api', '@integration'],
        isCommon: false,
        relatedScenarios: []
      },
      {
        id: 'test-006',
        title: 'User Data Privacy Controls',
        description: 'GDPR compliance verification',
        category: 'Compliance',
        priority: 'high' as const,
        estimatedTime: 15,
        testSteps: Array(7).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@compliance', '@gdpr'],
        isCommon: false,
        relatedScenarios: []
      }
    ],
    commonProcedures: [
      {
        id: 'common-001',
        title: 'Login Procedure',
        description: 'Standard login steps',
        category: 'Authentication',
        priority: 'high' as const,
        estimatedTime: 5,
        testSteps: Array(4).fill({}),
        setupSteps: [],
        cleanupSteps: [],
        prerequisites: [],
        testData: [],
        tags: ['@auth'],
        isCommon: true,
        relatedScenarios: []
      }
    ],
    sequences: [],
    metadata: {
      generatedAt: new Date(),
      totalScenarios: 10,
      totalSequences: 0,
      commonScenarioCount: 1
    }
  };

  // Generate executive summary
  console.log('2. Generating executive summary...\n');
  const summaryGenerator = new ExecutiveSummaryGenerator();
  const summary = summaryGenerator.generateSummary(mockManualTestSuite);
  
  // Display summary
  console.log('=== EXECUTIVE SUMMARY ===\n');
  console.log('OVERVIEW:');
  console.log(summary.overview);
  
  console.log('\nKEY METRICS:');
  console.log(`• Total Test Cases: ${summary.keyMetrics.totalTestCases}`);
  console.log(`• Critical Tests: ${summary.keyMetrics.criticalTests}`);
  console.log(`• Estimated Effort: ${summary.keyMetrics.estimatedEffort.toFixed(1)} hours`);
  console.log(`• Overall Coverage: ${summary.keyMetrics.coverage.overall}%`);
  
  console.log('\nBUSINESS VALUE:');
  summary.businessValue.forEach(value => {
    console.log(`✓ ${value}`);
  });
  
  console.log('\nRISKS COVERED:');
  summary.risksCovered.forEach(risk => {
    console.log(`⚡ ${risk}`);
  });
  
  console.log('\nCOMPLIANCE ASPECTS:');
  summary.complianceAspects.forEach(aspect => {
    console.log(`📋 ${aspect}`);
  });
  
  console.log('\nTEST COVERAGE BREAKDOWN:');
  console.log(`• Functional: ${summary.keyMetrics.coverage.functional}%`);
  console.log(`• Security: ${summary.keyMetrics.coverage.security}%`);
  console.log(`• Performance: ${summary.keyMetrics.coverage.performance}%`);
  console.log(`• Usability: ${summary.keyMetrics.coverage.usability}%`);
  
  console.log('\nRECOMMENDATIONS:');
  summary.recommendations.forEach(rec => {
    console.log(`💡 ${rec}`);
  });
  
  // Generate HTML summary
  console.log('\n3. Generating HTML executive summary...');
  const htmlSummary = summaryGenerator.generateHTMLSummary(summary);
  const htmlFile = path.join(tempDir, 'executive-summary.html');
  await fileAPI.createFile(htmlFile, htmlSummary, { type: FileType.TEMPORARY });
  console.log(`✓ HTML summary saved to: ${htmlFile}`);
  
  // Show benefits
  console.log('\n4. Benefits of Executive Summary:');
  console.log('   • Provides business context for technical tests');
  console.log('   • Identifies risk coverage and compliance');
  console.log('   • Offers actionable recommendations');
  console.log('   • Quantifies testing effort and coverage');
  console.log('   • Suitable for management and stakeholders');
  
  // Cleanup
  if (fs.existsSync(tempDir)) {
    // Keep the HTML file for viewing
    console.log('\n✓ Demo completed! View the HTML summary to see the full report.');
  }
}

// Run the demo
runExecutiveSummaryDemo().catch(console.error);