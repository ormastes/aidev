Feature: Python Support Example
    As a developer
    I want to use Python in the AI Development Platform
    So that I can develop Python-based AI applications

    @python @testing
    Scenario: Python environment setup
        Given I have uv installed
        When I create a new Python project
        Then a virtual environment should be created
        And dependencies should be installed

    @python @coverage
    Scenario: Run Python tests with coverage
        Given I have Python test files
        When I run pytest with coverage
        Then I should see branch coverage report
        And I should see class-level coverage metrics

    @python @cucumber
    Scenario Outline: Execute BDD tests with Behave
        Given I have a feature file "<feature>"
        When I run behave for "<feature>"
        Then the test should "<result>"
        And manual documentation should be generated

        Examples:
            | feature      | result  |
            | login.feature | pass   |
            | api.feature   | pass   |
            | ui.feature    | fail   |