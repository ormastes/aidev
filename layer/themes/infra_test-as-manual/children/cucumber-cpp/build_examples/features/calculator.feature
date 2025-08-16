@unit @math
Feature: Calculator Operations
  As a user
  I want to perform mathematical operations
  So that I can calculate results quickly

  Background:
    Given the calculator is initialized
    And the display shows "0"

  @smoke @addition
  Scenario: Add two positive numbers
    Given I have entered 50 into the calculator
    When I press add
    And I have entered 70 into the calculator
    And I press equals
    Then the result should be 120 on the screen

  @subtraction
  Scenario: Subtract numbers
    Given I have entered 100 into the calculator
    When I press subtract
    And I have entered 25 into the calculator
    And I press equals
    Then the result should be 75 on the screen

  @multiplication
  Scenario: Multiply numbers
    Given I have entered 6 into the calculator
    When I press multiply
    And I have entered 7 into the calculator
    And I press equals
    Then the result should be 42 on the screen

  @division
  Scenario: Divide numbers
    Given I have entered 84 into the calculator
    When I press divide
    And I have entered 2 into the calculator
    And I press equals
    Then the result should be 42 on the screen

  @data-driven
  Scenario Outline: Perform various calculations
    Given I have entered <first> into the calculator
    When I press <operation>
    And I have entered <second> into the calculator
    And I press equals
    Then the result should be <result> on the screen

    Examples:
      | first | operation | second | result |
      | 10    | add       | 5      | 15     |
      | 20    | subtract  | 8      | 12     |
      | 4     | multiply  | 9      | 36     |
      | 100   | divide    | 4      | 25     |

  @error-handling
  Scenario: Division by zero
    Given I have entered 10 into the calculator
    When I press divide
    And I have entered 0 into the calculator
    And I press equals
    Then I should see an error message "Cannot divide by zero"