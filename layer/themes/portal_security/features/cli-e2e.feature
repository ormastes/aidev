# Converted from: layer/themes/portal_security/layer/themes/setup-folder/tests/system/cli-e2e.stest.ts
# Generated on: 2025-08-16T04:16:21.673Z

Feature: Cli E2e
  As a system tester
  I want to validate cli e2e
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should display help information
    Then output should contain aidev-setup
    And output should contain Commands:
    And output should contain theme
    And output should contain story
    And output should contain demo

  @manual
  Scenario: Manual validation of should display help information
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | output should contain aidev-setup | Pass |
      | output should contain Commands: | Pass |
      | output should contain theme | Pass |
      | output should contain story | Pass |
      | output should contain demo | Pass |

  @automated @system
  Scenario: should display version information
    Then output should contain 1.0.0

  @manual
  Scenario: Manual validation of should display version information
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | output should contain 1.0.0 | Pass |

  @automated @system
  Scenario: should create a theme with all required files
    Then fs.existsSync(themePath) should be true
    And fs.existsSync(path.join(themePath, .env)) should be true
    And fs.existsSync(path.join(themePath, README.md)) should be true
    And fs.existsSync(path.join(themePath, package.json)) should be true
    And fs.existsSync(path.join(themePath, src/core/pipe/index.ts)) should be true
    And fs.existsSync(path.join(themePath, src/feature/pipe/index.ts)) should be true
    And envContent should contain AGILE_TYPE=theme
    And envContent should contain MODE=VF

  @manual
  Scenario: Manual validation of should create a theme with all required files
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fs.existsSync(themePath) should be true | Pass |
      | fs.existsSync(path.join(themePath, .env)) should be true | Pass |
      | fs.existsSync(path.join(themePath, README.md)) should be true | Pass |
      | fs.existsSync(path.join(themePath, package.json)) should be true | Pass |
      | fs.existsSync(path.join(themePath, src/core/pipe/index.ts)) should be true | Pass |
      | fs.existsSync(path.join(themePath, src/feature/pipe/index.ts)) should be true | Pass |
      | envContent should contain AGILE_TYPE=theme | Pass |
      | envContent should contain MODE=VF | Pass |

  @automated @system
  Scenario: should create a demo project with TypeScript
    Then fs.existsSync(demoPath) should be true
    And fs.existsSync(path.join(demoPath, tsconfig.json)) should be true
    And fs.existsSync(path.join(demoPath, package.json)) should be true

  @manual
  Scenario: Manual validation of should create a demo project with TypeScript
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fs.existsSync(demoPath) should be true | Pass |
      | fs.existsSync(path.join(demoPath, tsconfig.json)) should be true | Pass |
      | fs.existsSync(path.join(demoPath, package.json)) should be true | Pass |

  @automated @system
  Scenario: should list all deployments
    Then output should contain theme1
    And output should contain demo1
    And output should contain Theme
    And output should contain Demo

  @manual
  Scenario: Manual validation of should list all deployments
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |
      | output should contain theme1 | Pass |
      | output should contain demo1 | Pass |
      | output should contain Theme | Pass |
      | output should contain Demo | Pass |

  @automated @system
  Scenario: should handle invalid commands gracefully
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle invalid commands gracefully
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should validate required options
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should validate required options
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should run in interactive mode when no command provided
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should run in interactive mode when no command provided
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
    Then verify all assertions pass:
      | Assertion | Expected |

