
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
