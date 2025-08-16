# Converted from: layer/themes/infra_external-log-lib/user-stories/002-python-process-logging/tests/system/python-log-capture-e2e.stest.ts
# Generated on: 2025-08-16T04:16:21.665Z

Feature: Python Log Capture E2e
  As a system tester
  I want to validate python log capture e2e
  So that I can ensure system reliability

  Background:
    Given the test environment is initialized
    And all required services are running

  @automated @system
  Scenario: should capture and parse logs from Python script with logging module - In Progress flow
    Given I perform startPythonLogCapture on platform
    When I perform waitForCompletion on session
    Then result.exitCode should be 0
    And infoLogs.some(log => log.message.includes(Application starting)) should be true
    And warnLogs.some(log => log.message.includes(Memory usage at 80%)) should be true
    And errorLogs.some(log => log.message.includes(Error occurred: Test error)) should be true
    And fs.existsSync(logFile) should be true
    And fileContent should contain Application starting
    And fileContent should contain [ERROR]

  @manual
  Scenario: Manual validation of should capture and parse logs from Python script with logging module - In Progress flow
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startPythonLogCapture on platform | Action completes successfully |
      | 2 | I perform waitForCompletion on session | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | result.exitCode should be 0 | Pass |
      | infoLogs.some(log => log.message.includes(Application starting)) should be true | Pass |
      | warnLogs.some(log => log.message.includes(Memory usage at 80%)) should be true | Pass |
      | errorLogs.some(log => log.message.includes(Error occurred: Test error)) should be true | Pass |
      | fs.existsSync(logFile) should be true | Pass |
      | fileContent should contain Application starting | Pass |
      | fileContent should contain [ERROR] | Pass |

  @automated @system
  Scenario: should handle mixed print and logging output from Python
    Given I perform startPythonLogCapture on platform
    Then printMessages.length should be 3
    And logMessages.length should be 2
    And stderrMessages.length should be 1
    And errorLog?.level should be error

  @manual
  Scenario: Manual validation of should handle mixed print and logging output from Python
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startPythonLogCapture on platform | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | printMessages.length should be 3 | Pass |
      | logMessages.length should be 2 | Pass |
      | stderrMessages.length should be 1 | Pass |
      | errorLog?.level should be error | Pass |

  @automated @system
  Scenario: should capture and parse Python tracebacks correctly
    Given I perform startPythonLogCapture on platform
    Then fullOutput should contain level_1
    And fullOutput should contain level_2
    And fullOutput should contain level_3

  @manual
  Scenario: Manual validation of should capture and parse Python tracebacks correctly
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startPythonLogCapture on platform | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | fullOutput should contain level_1 | Pass |
      | fullOutput should contain level_2 | Pass |
      | fullOutput should contain level_3 | Pass |

  @automated @system
  Scenario: should handle real-time streaming of Python logs
    Given I perform startPythonLogCapture on platform
    Then the operation should complete successfully

  @manual
  Scenario: Manual validation of should handle real-time streaming of Python logs
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startPythonLogCapture on platform | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |

  @automated @system
  Scenario: should parse JSON-formatted Python logs
    Given I perform startPythonLogCapture on platform
    Then infoLog?.level should be info
    And debugLog?.level should be debug
    And warnLog?.level should be warn
    And errorLog?.level should be error

  @manual
  Scenario: Manual validation of should parse JSON-formatted Python logs
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startPythonLogCapture on platform | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | infoLog?.level should be info | Pass |
      | debugLog?.level should be debug | Pass |
      | warnLog?.level should be warn | Pass |
      | errorLog?.level should be error | Pass |

  @automated @system
  Scenario: should handle Python subprocess that crashes
    Given I perform startPythonLogCapture on platform
    When I perform waitForCompletion on session
    Then logs.some(log => log.message.includes(Starting process)) should be true
    And result.exitCode should be 1

  @manual
  Scenario: Manual validation of should handle Python subprocess that crashes
    Given the tester has access to the system
    When the tester manually executes the test steps:
      | Step | Action | Expected Result |
      | 1 | I perform startPythonLogCapture on platform | Action completes successfully |
      | 2 | I perform waitForCompletion on session | Action completes successfully |
    Then verify all assertions pass:
      | Assertion | Expected |
      | logs.some(log => log.message.includes(Starting process)) should be true | Pass |
      | result.exitCode should be 1 | Pass |

