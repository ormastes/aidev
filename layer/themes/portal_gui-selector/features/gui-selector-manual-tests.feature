Feature: Gui-selector Portal Manual Tests
  As a portal user
  I want to manually test the gui-selector portal
  So that I can ensure proper user experience

  @manual @ui-navigation
  Scenario: Manual UI navigation testing
    Given the gui-selector portal is accessible
    When the tester navigates through:
      | UI Element               | Test Action                      |
      | Main navigation          | Click all menu items             |
      | Forms and inputs         | Enter various data types         |
      | Buttons and controls     | Test all interactive elements    |
      | Responsive design        | Test on different screen sizes   |
    Then all UI elements should function correctly
    And navigation should be intuitive

  @manual @functionality
  Scenario: Manual portal functionality testing
    Given the user is logged into the portal
    When the tester performs actions:
      | Function                 | Test Steps                       |
      | User authentication      | Login/logout scenarios           |
      | Data operations          | CRUD operations on entities      |
      | Search and filter        | Various search criteria          |
      | Export/Import            | File upload/download             |
    Then all functions should work as expected
    And data should be correctly processed

  @manual @accessibility
  Scenario: Manual accessibility testing
    Given accessibility tools are available
    When the tester verifies:
      | Accessibility Feature    | Test Method                      |
      | Keyboard navigation      | Navigate without mouse           |
      | Screen reader support    | Use screen reader software       |
      | Color contrast           | Check WCAG compliance            |
      | Focus indicators         | Verify visible focus states      |
    Then portal should be fully accessible
    And meet WCAG 2.1 AA standards
